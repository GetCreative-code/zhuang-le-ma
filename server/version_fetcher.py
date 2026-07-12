"""
版本获取器：按优先级从不同源获取软件版本信息
策略：缓存 → npm/PyPI/GitHub → AI
"""
import httpx
import json
from typing import List, Optional


async def fetch_npm_versions(package_name: str) -> Optional[List[dict]]:
    """从 npm registry 获取版本"""
    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.get(f"https://registry.npmjs.org/{package_name}")
            if resp.status_code == 200:
                data = resp.json()
                versions = []
                dist_tags = data.get("dist-tags", {})
                latest = dist_tags.get("latest", "")
                for v in list(data.get("versions", {}).keys())[-10:]:
                    versions.append({
                        "version": v,
                        "is_stable": v == latest,
                        "platform": "all",
                        "source": "npm",
                    })
                return versions
    except Exception:
        pass
    return None


async def fetch_pypi_versions(package_name: str) -> Optional[List[dict]]:
    """从 PyPI 获取版本"""
    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.get(f"https://pypi.org/pypi/{package_name}/json")
            if resp.status_code == 200:
                data = resp.json()
                versions = []
                info = data.get("info", {})
                stable = info.get("version", "")
                for v in list(data.get("releases", {}).keys())[-10:]:
                    v_data = data["releases"][v]
                    is_stable = v == stable or (
                        v_data and not any(
                            x in v.lower() for x in ["a", "b", "rc", "dev", "alpha", "beta"]
                        )
                    )
                    versions.append({
                        "version": v,
                        "is_stable": is_stable,
                        "platform": "all",
                        "source": "pypi",
                    })
                return versions
    except Exception:
        pass
    return None


async def fetch_github_releases(repo: str) -> Optional[List[dict]]:
    """从 GitHub Releases 获取版本"""
    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.get(
                f"https://api.github.com/repos/{repo}/releases",
                headers={"Accept": "application/vnd.github.v3+json"},
            )
            if resp.status_code == 200:
                releases = resp.json()
                versions = []
                for r in releases[:10]:
                    tag = r.get("tag_name", "").lstrip("v")
                    prerelease = r.get("prerelease", False)
                    versions.append({
                        "version": tag,
                        "is_stable": not prerelease,
                        "platform": "all",
                        "source": "github",
                    })
                return versions
    except Exception:
        pass
    return None


async def fetch_maven_versions(package_name: str) -> Optional[List[dict]]:
    """从 Maven Central 获取版本"""
    try:
        group, artifact = package_name.split(":") if ":" in package_name else ("", package_name)
        if not group:
            return None
        async with httpx.AsyncClient(timeout=15.0) as client:
            url = f"https://search.maven.org/solrsearch/select?q=g:{group}+AND+a:{artifact}&rows=10&wt=json&core=gav"
            resp = await client.get(url)
            if resp.status_code == 200:
                data = resp.json()
                docs = data.get("response", {}).get("docs", [])
                versions = []
                for d in docs:
                    v = d.get("v", "")
                    versions.append({
                        "version": v,
                        "is_stable": True,
                        "platform": "all",
                        "source": "maven",
                    })
                return versions
    except Exception:
        pass
    return None


VERSION_FETCHERS = {
    "nodejs": lambda: fetch_npm_versions("node"),
    "npm": lambda: fetch_npm_versions("npm"),
    "nvm": lambda: None,
    "python": lambda: fetch_pypi_versions("python"),
    "go": lambda: fetch_github_releases("golang/go"),
    "rust": lambda: None,
    "docker": lambda: fetch_github_releases("docker/cli"),
    "git": lambda: None,
    "vscode": lambda: fetch_github_releases("microsoft/vscode"),
    "maven": lambda: fetch_maven_versions("org.apache.maven:maven"),
    "redis": lambda: fetch_github_releases("redis/redis"),
    "nginx": lambda: fetch_github_releases("nginx/nginx"),
    "mongodb": lambda: fetch_github_releases("mongodb/mongo"),
    "homebrew": lambda: fetch_github_releases("Homebrew/brew"),
    "intellij-idea": lambda: None,
    "java": lambda: None,
    "mysql": lambda: None,
    "postgresql": lambda: None,
}


async def fetch_versions(software_name: str) -> Optional[List[dict]]:
    fetcher = VERSION_FETCHERS.get(software_name.lower())
    if fetcher:
        try:
            result = await fetcher()
            if result:
                return result
        except Exception:
            pass
    return None
