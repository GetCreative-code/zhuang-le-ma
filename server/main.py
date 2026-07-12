import os
import sys
import json
from datetime import datetime
from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from dotenv import load_dotenv

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
load_dotenv(os.path.join(BASE_DIR, ".env"))

ADMIN_PASSWORD = os.getenv("ADMIN_PASSWORD", "admin123")

from database import (
    init_db, SessionLocal, Software, SoftwareVersion,
    InstallGuide, Feedback, SelectionStat,
)
from models import (
    SoftwareSearchRequest, SoftwareSearchResponse,
    GuideRequest, GuideResponse,
    FeedbackRequest, AdminLoginRequest, StatsResponse,
)
from ai_service import (
    parse_software_name, get_versions_from_ai,
    generate_install_guide, generate_install_script_only,
    check_ai_configured,
)
from version_fetcher import fetch_versions

app = FastAPI(title="装了吗 API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

init_db()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def detect_platform() -> str:
    p = sys.platform
    if p == "win32":
        return "windows"
    elif p == "darwin":
        return "macos"
    return "linux"


PRESET_SOFTWARE = [
    "MySQL", "Node.js", "Python", "Java (JDK)", "Git", "Maven",
    "Redis", "Docker", "Nginx", "Go", "Rust", "MongoDB",
    "PostgreSQL", "VS Code", "IntelliJ IDEA", "Homebrew", "nvm",
]

GUI_SOFTWARE = {"vscode", "intellij-idea"}


@app.get("/api/health")
def health():
    return {"status": "ok", "ai_configured": check_ai_configured()}


@app.get("/api/presets")
def get_presets():
    return {"software": PRESET_SOFTWARE}


@app.post("/api/software/search", response_model=SoftwareSearchResponse)
async def search_software(req: SoftwareSearchRequest, db=Depends(get_db)):
    parsed = await parse_software_name(req.query)
    software_name = parsed.get("software_name", req.query.lower().strip())
    display_name = parsed.get("display_name", req.query.strip())

    platform = req.platform if req.platform != "auto" else detect_platform()

    # Find or create software record
    sw = db.query(Software).filter(Software.name == software_name).first()
    if not sw:
        sw = Software(name=software_name, display_name=display_name)
        db.add(sw)
        db.commit()
        db.refresh(sw)

    # Get versions: cache -> registries -> AI
    cached_versions = db.query(SoftwareVersion).filter(
        SoftwareVersion.software_id == sw.id
    ).all()

    if cached_versions:
        versions = [
            {"version": v.version, "is_stable": v.is_stable, "platform": v.platform, "source": v.source}
            for v in cached_versions
        ]
    else:
        fetched = await fetch_versions(software_name)
        if fetched:
            versions = fetched
            for v in versions:
                sv = SoftwareVersion(
                    software_id=sw.id,
                    version=v["version"],
                    is_stable=v.get("is_stable", True),
                    platform=v.get("platform", "all"),
                    source=v.get("source", "registry"),
                )
                db.add(sv)
            db.commit()
        else:
            try:
                ai_versions = await get_versions_from_ai(software_name, display_name)
                versions = ai_versions if ai_versions else [{"version": "latest", "is_stable": True, "platform": "all"}]
                for v in versions:
                    sv = SoftwareVersion(
                        software_id=sw.id,
                        version=v["version"],
                        is_stable=v.get("is_stable", True),
                        platform=v.get("platform", "all"),
                        source="ai",
                    )
                    db.add(sv)
                db.commit()
            except Exception:
                versions = [{"version": "latest", "is_stable": True, "platform": "all"}]

    return SoftwareSearchResponse(
        software_name=software_name,
        display_name=display_name,
        versions=versions,
        platform=platform,
    )


@app.post("/api/software/{software_name}/guide", response_model=GuideResponse)
async def get_or_generate_guide(
    software_name: str, req: GuideRequest, db=Depends(get_db)
):
    version = req.version
    platform = req.platform

    # Check cache
    cached = db.query(InstallGuide).filter(
        InstallGuide.software.has(name=software_name),
        InstallGuide.version == version,
        InstallGuide.platform == platform,
    ).first()

    sw = db.query(Software).filter(Software.name == software_name).first()
    if not sw:
        sw = Software(name=software_name, display_name=software_name)
        db.add(sw)
        db.commit()
        db.refresh(sw)

    if cached:
        # Update stats
        stat = db.query(SelectionStat).filter(
            SelectionStat.software_name == software_name,
            SelectionStat.version == version,
            SelectionStat.platform == platform,
        ).first()
        if stat:
            stat.count += 1
            stat.last_selected = datetime.utcnow()
        else:
            db.add(SelectionStat(
                software_name=software_name,
                version=version,
                platform=platform,
                count=1,
            ))
        db.commit()
        return GuideResponse(
            id=cached.id,
            software_name=software_name,
            display_name=sw.display_name,
            version=version,
            platform=platform,
            markdown_content=cached.markdown_content,
            cached=True,
        )

    # Check AI configured
    if not check_ai_configured():
        raise HTTPException(status_code=503, detail="AI API Key 未配置，请先在 server/.env 中设置 AI_API_KEY")

    # Generate with AI
    try:
        markdown = await generate_install_guide(software_name, sw.display_name, version, platform)
        if markdown.startswith("Error:"):
            raise HTTPException(status_code=500, detail=markdown)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI 生成失败: {str(e)}")

    # Save to cache
    guide = InstallGuide(
        software_id=sw.id,
        version=version,
        platform=platform,
        markdown_content=markdown,
    )
    db.add(guide)
    db.commit()
    db.refresh(guide)

    # Update stats
    stat = db.query(SelectionStat).filter(
        SelectionStat.software_name == software_name,
        SelectionStat.version == version,
        SelectionStat.platform == platform,
    ).first()
    if stat:
        stat.count += 1
        stat.last_selected = datetime.utcnow()
    else:
        db.add(SelectionStat(
            software_name=software_name,
            version=version,
            platform=platform,
            count=1,
        ))
    db.commit()

    return GuideResponse(
        id=guide.id,
        software_name=software_name,
        display_name=sw.display_name,
        version=version,
        platform=platform,
        markdown_content=markdown,
        cached=False,
    )


@app.post("/api/software/{software_name}/install-script")
async def get_install_script(software_name: str, req: GuideRequest):
    sw_name = software_name
    sw = None
    db = next(get_db())
    try:
        sw = db.query(Software).filter(Software.name == software_name).first()
    finally:
        db.close()

    display_name = sw.display_name if sw else software_name

    if not check_ai_configured():
        raise HTTPException(status_code=503, detail="AI API Key 未配置")

    script = await generate_install_script_only(sw_name, display_name, req.version, req.platform)
    if script.startswith("Error:"):
        raise HTTPException(status_code=500, detail=script)
    return {"script": script}


@app.post("/api/feedback")
def submit_feedback(fb: FeedbackRequest, db=Depends(get_db)):
    feedback = Feedback(
        guide_id=fb.guide_id,
        software_name=fb.software_name,
        version=fb.version,
        platform=fb.platform,
        is_helpful=fb.is_helpful,
        comment=fb.comment,
    )
    db.add(feedback)
    db.commit()
    return {"status": "ok"}


@app.post("/api/admin/login")
def admin_login(req: AdminLoginRequest):
    if req.password == ADMIN_PASSWORD:
        return {"token": "admin-session-token", "status": "ok"}
    raise HTTPException(status_code=401, detail="密码错误")


def verify_admin(token: str) -> bool:
    return token == "admin-session-token"


@app.get("/api/admin/guides")
def admin_get_guides(token: str = "", db=Depends(get_db)):
    if not verify_admin(token):
        raise HTTPException(status_code=401)
    guides = db.query(InstallGuide).order_by(InstallGuide.created_at.desc()).all()
    return [
        {
            "id": g.id,
            "software_name": g.software.name if g.software else "",
            "display_name": g.software.display_name if g.software else "",
            "version": g.version,
            "platform": g.platform,
            "created_at": str(g.created_at),
            "markdown_preview": g.markdown_content[:200] + "...",
        }
        for g in guides
    ]


@app.get("/api/admin/guides/{guide_id}")
def admin_get_guide_detail(guide_id: int, token: str = "", db=Depends(get_db)):
    if not verify_admin(token):
        raise HTTPException(status_code=401)
    guide = db.query(InstallGuide).filter(InstallGuide.id == guide_id).first()
    if not guide:
        raise HTTPException(status_code=404)
    return {
        "id": guide.id,
        "software_name": guide.software.name if guide.software else "",
        "display_name": guide.software.display_name if guide.software else "",
        "version": guide.version,
        "platform": guide.platform,
        "markdown_content": guide.markdown_content,
        "created_at": str(guide.created_at),
        "updated_at": str(guide.updated_at),
    }


@app.put("/api/admin/guides/{guide_id}")
def admin_update_guide(guide_id: int, data: dict, token: str = "", db=Depends(get_db)):
    if not verify_admin(token):
        raise HTTPException(status_code=401)
    guide = db.query(InstallGuide).filter(InstallGuide.id == guide_id).first()
    if not guide:
        raise HTTPException(status_code=404)
    if "markdown_content" in data:
        guide.markdown_content = data["markdown_content"]
        guide.updated_at = datetime.utcnow()
    db.commit()
    return {"status": "ok"}


@app.delete("/api/admin/guides/{guide_id}")
def admin_delete_guide(guide_id: int, token: str = "", db=Depends(get_db)):
    if not verify_admin(token):
        raise HTTPException(status_code=401)
    guide = db.query(InstallGuide).filter(InstallGuide.id == guide_id).first()
    if not guide:
        raise HTTPException(status_code=404)
    db.delete(guide)
    db.commit()
    return {"status": "ok"}


@app.post("/api/admin/guides/{guide_id}/regenerate")
async def admin_regenerate_guide(guide_id: int, token: str = "", db=Depends(get_db)):
    if not verify_admin(token):
        raise HTTPException(status_code=401)
    if not check_ai_configured():
        raise HTTPException(status_code=503, detail="AI API Key 未配置")

    guide = db.query(InstallGuide).filter(InstallGuide.id == guide_id).first()
    if not guide:
        raise HTTPException(status_code=404)

    sw = guide.software
    display_name = sw.display_name if sw else guide.version
    sw_name = sw.name if sw else ""

    try:
        markdown = await generate_install_guide(sw_name, display_name, guide.version, guide.platform)
        if markdown.startswith("Error:"):
            raise HTTPException(status_code=500, detail=markdown)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI 生成失败: {str(e)}")

    guide.markdown_content = markdown
    guide.updated_at = datetime.utcnow()
    db.commit()
    return {"status": "ok", "markdown_content": markdown}


@app.get("/api/admin/feedback")
def admin_get_feedback(token: str = "", db=Depends(get_db)):
    if not verify_admin(token):
        raise HTTPException(status_code=401)
    feedbacks = db.query(Feedback).order_by(Feedback.created_at.desc()).all()
    return [
        {
            "id": f.id,
            "guide_id": f.guide_id,
            "software_name": f.software_name,
            "version": f.version,
            "platform": f.platform,
            "is_helpful": f.is_helpful,
            "comment": f.comment,
            "created_at": str(f.created_at),
            "processed": f.processed,
        }
        for f in feedbacks
    ]


@app.put("/api/admin/feedback/{feedback_id}")
def admin_process_feedback(feedback_id: int, token: str = "", db=Depends(get_db)):
    if not verify_admin(token):
        raise HTTPException(status_code=401)
    fb = db.query(Feedback).filter(Feedback.id == feedback_id).first()
    if not fb:
        raise HTTPException(status_code=404)
    fb.processed = True
    db.commit()
    return {"status": "ok"}


@app.get("/api/admin/stats")
def admin_get_stats(token: str = "", db=Depends(get_db)):
    if not verify_admin(token):
        raise HTTPException(status_code=401)

    total_guides = db.query(InstallGuide).count()
    total_feedback = db.query(Feedback).count()
    helpful_count = db.query(Feedback).filter(Feedback.is_helpful == True).count()
    unhelpful_count = db.query(Feedback).filter(Feedback.is_helpful == False).count()

    stats = db.query(SelectionStat).order_by(SelectionStat.count.desc()).all()
    selection_stats = [
        {"software_name": s.software_name, "version": s.version, "platform": s.platform, "count": s.count}
        for s in stats
    ]

    top_software = []
    software_counts = {}
    for s in stats:
        software_counts[s.software_name] = software_counts.get(s.software_name, 0) + s.count
    top_software = sorted(
        [{"name": k, "count": v} for k, v in software_counts.items()],
        key=lambda x: x["count"], reverse=True
    )[:10]

    return StatsResponse(
        total_guides=total_guides,
        total_feedback=total_feedback,
        helpful_count=helpful_count,
        unhelpful_count=unhelpful_count,
        top_software=top_software,
        selection_stats=selection_stats,
    )


# Serve admin static files
admin_path = os.path.join(BASE_DIR, "..", "admin", "dist")
if os.path.exists(admin_path):
    app.mount("/admin", StaticFiles(directory=admin_path, html=True), name="admin")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
