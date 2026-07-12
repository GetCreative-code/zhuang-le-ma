import os
import json
import re
import httpx
from dotenv import load_dotenv
from install_scripts import WINDOWS_SCRIPT_RULES, get_install_hint, get_reliable_script

load_dotenv(os.path.join(os.path.dirname(__file__), ".env"))

AI_API_KEY = os.getenv("AI_API_KEY", "")
AI_BASE_URL = os.getenv("AI_BASE_URL", "https://api.deepseek.com/v1")
AI_MODEL = os.getenv("AI_MODEL", "deepseek-chat")


SYSTEM_PROMPT = """你是一个专业的软件安装助手，名字叫「装了吗」。你的唯一职责是帮助用户安装软件。

## 核心规则
1. 只关注软件安装本身，不要介绍软件功能、用途
2. 不要推荐学习资源、教程、书籍
3. 不要做任何多余的信息扩展
4. 专注于：下载、安装、环境配置、验证安装

## 输出格式要求
请严格按照以下 Markdown 格式输出安装方案：

### 对于有官方下载页的 GUI 软件（VS Code、IntelliJ IDEA、Chrome、Postman 等）：
直接给出官方下载链接，不要提供脚本安装方式。

格式：
# {软件名} 安装方案

## 📥 官方下载
- **{平台}**：[官方下载页面]({链接})
- 下载对应系统的安装包，双击运行即可完成安装

## ✅ 验证安装
（如何验证安装成功）

### 对于命令行工具/开发环境（Node.js、Python、Git、MySQL 等）：
提供完整的一键安装脚本。

格式：
# {软件名} {版本} 安装方案

## 🚀 一键安装脚本

```bash（或 powershell）
# ==================== {软件名} {版本} 安装脚本 ====================
# 适用于：{平台}
# 生成时间：{当前时间}

# 步骤1：{步骤描述}
{命令}

# 步骤2：{步骤描述}
{命令}

# 环境变量配置
{环境变量设置命令}

# 验证安装
{验证命令} --version
```

## 📋 脚本说明
1. 复制上方脚本，打开终端（macOS/Linux）或 PowerShell（Windows）
2. 粘贴并回车执行
3. 如遇到权限问题，macOS/Linux 用户请在命令前加 `sudo`，Windows 用户请右键「以管理员身份运行」PowerShell

## ⚠️ 常见问题
- **问题1**：{问题描述} → {解决方法}
- **问题2**：{问题描述} → {解决方法}

## ✅ 安装后验证
安装完成后，运行以下命令确认安装成功：
```bash
{验证命令}
```
预期输出类似：{预期结果}

---

> 装了吗？今天你装了吗！😎
"""


async def call_ai(messages: list, temperature: float = 0.7) -> str:
    if not AI_API_KEY:
        return "Error: AI_API_KEY 未配置，请在 server/.env 中设置"
    url = f"{AI_BASE_URL.rstrip('/')}/chat/completions"
    headers = {
        "Authorization": f"Bearer {AI_API_KEY}",
        "Content-Type": "application/json",
    }
    payload = {
        "model": AI_MODEL,
        "messages": messages,
        "temperature": temperature,
        "max_tokens": 4096,
    }
    async with httpx.AsyncClient(timeout=120.0) as client:
        resp = await client.post(url, headers=headers, json=payload)
        if resp.status_code != 200:
            return f"Error: AI 调用失败，状态码 {resp.status_code}，{resp.text}"
        data = resp.json()
        return data["choices"][0]["message"]["content"]


async def parse_software_name(user_query: str) -> dict:
    prompt = f"""用户说：「{user_query}」

请从用户的话中提取出他们想要安装的软件名称。只返回 JSON 格式：
{{"software_name": "标准软件名（英文小写，如 mysql, nodejs, python）", "display_name": "显示名称（如 MySQL, Node.js, Python）"}}

常见映射：
- "装 mysql" → mysql, MySQL
- "我想装 node" / "nodejs" → nodejs, Node.js
- "python" / "Python" → python, Python
- "java" / "jdk" → java, Java (JDK)
- "git" → git, Git
- "docker" → docker, Docker
- "vscode" / "vs code" → vscode, VS Code
- "idea" / "intellij" → intellij-idea, IntelliJ IDEA
- "maven" → maven, Maven
- "redis" → redis, Redis
- "nginx" → nginx, Nginx
- "go" / "golang" → go, Go
- "rust" → rust, Rust
- "mongodb" → mongodb, MongoDB
- "postgresql" / "postgres" → postgresql, PostgreSQL
- "homebrew" / "brew" → homebrew, Homebrew
- "nvm" → nvm, nvm

只返回 JSON，不要其他内容："""
    messages = [
        {"role": "system", "content": "你是一个软件名称解析器。只返回 JSON，不要其他内容。"},
        {"role": "user", "content": prompt},
    ]
    result = await call_ai(messages, temperature=0.1)
    try:
        result = result.strip()
        if result.startswith("```"):
            result = result.split("\n", 1)[1]
            if result.endswith("```"):
                result = result[:-3].strip()
            elif result.endswith("\n```"):
                result = result[:-4].strip()
        return json.loads(result)
    except Exception:
        query_lower = user_query.lower()
        name_map = {
            "mysql": ("mysql", "MySQL"),
            "node": ("nodejs", "Node.js"),
            "nodejs": ("nodejs", "Node.js"),
            "python": ("python", "Python"),
            "java": ("java", "Java (JDK)"),
            "jdk": ("java", "Java (JDK)"),
            "git": ("git", "Git"),
            "maven": ("maven", "Maven"),
            "redis": ("redis", "Redis"),
            "docker": ("docker", "Docker"),
            "nginx": ("nginx", "Nginx"),
            "go": ("go", "Go"),
            "golang": ("go", "Go"),
            "rust": ("rust", "Rust"),
            "mongodb": ("mongodb", "MongoDB"),
            "postgres": ("postgresql", "PostgreSQL"),
            "postgresql": ("postgresql", "PostgreSQL"),
            "vscode": ("vscode", "VS Code"),
            "vs code": ("vscode", "VS Code"),
            "idea": ("intellij-idea", "IntelliJ IDEA"),
            "intellij": ("intellij-idea", "IntelliJ IDEA"),
            "homebrew": ("homebrew", "Homebrew"),
            "brew": ("homebrew", "Homebrew"),
            "nvm": ("nvm", "nvm"),
        }
        for key, (sname, dname) in name_map.items():
            if key in query_lower:
                return {"software_name": sname, "display_name": dname}
        return {"software_name": query_lower.strip().lower().replace(" ", "-"), "display_name": user_query.strip()}


async def get_versions_from_ai(software_name: str, display_name: str) -> list:
    prompt = f"""请为 {display_name}（{software_name}）提供最新的可用版本列表。
返回一个 JSON 数组，每个元素包含：
- version: 版本号字符串
- is_stable: 是否为稳定版（true/false）
- platform: 支持的平台（"windows", "macos", "linux", "all"）

示例：
[
  {{"version": "8.0.33", "is_stable": true, "platform": "all"}},
  {{"version": "8.1.0", "is_stable": true, "platform": "all"}},
  {{"version": "5.7.42", "is_stable": true, "platform": "all"}}
]

只返回 JSON 数组，不要其他内容："""
    messages = [
        {"role": "system", "content": "你是一个软件版本信息提供器。只返回 JSON 数组，不要其他内容。"},
        {"role": "user", "content": prompt},
    ]
    result = await call_ai(messages, temperature=0.1)
    try:
        result = result.strip()
        if result.startswith("```"):
            result = result.split("\n", 1)[1]
            if result.endswith("```"):
                result = result[:-3].strip()
            elif result.endswith("\n```"):
                result = result[:-4].strip()
        versions = json.loads(result)
        if isinstance(versions, list):
            return versions
    except Exception:
        pass
    return [{"version": "latest", "is_stable": True, "platform": "all"}]


async def generate_install_guide(software_name: str, display_name: str, version: str, platform: str) -> str:
    from datetime import datetime
    now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    hint = get_install_hint(software_name, platform)
    hint_block = f"\n\n平台安装提示：\n{hint}" if hint else ""
    win_rules = WINDOWS_SCRIPT_RULES if platform == "windows" else ""

    user_prompt = f"""请为 {display_name}（{software_name}）生成 {platform} 平台上的安装方案。
软件版本：{version}
当前时间：{now}
{win_rules}{hint_block}

注意：
- 如果是 GUI 桌面软件（有官方下载页），直接给出官方下载链接即可
- 如果是命令行工具，给出完整的一键安装脚本
- {platform} 平台：Windows 用 PowerShell 脚本，macOS/Linux 用 Bash 脚本"""

    messages = [
        {"role": "system", "content": SYSTEM_PROMPT},
        {"role": "user", "content": user_prompt},
    ]
    return await call_ai(messages, temperature=0.7)


def strip_script_markdown(result: str) -> str:
    """清理 AI 返回脚本中的 Markdown 代码块"""
    result = (result or "").strip()
    fence = re.search(
        r"```(?:powershell|bash|sh|shell|ps1)?\s*\n(.*?)```",
        result,
        re.DOTALL | re.IGNORECASE,
    )
    if fence:
        return fence.group(1).strip()
    if result.startswith("```"):
        lines = result.split("\n")
        result = "\n".join(lines[1:])
        if result.rstrip().endswith("```"):
            result = result.rstrip()[:-3]
    return result.replace("```", "").strip()


def strip_requires_admin(result: str) -> str:
    """去掉 #Requires -RunAsAdministrator，由客户端负责提权"""
    return re.sub(r"^#requires\s+-RunAsAdministrator\s*$", "", result, flags=re.MULTILINE | re.IGNORECASE).strip()


async def generate_install_script_only(software_name: str, display_name: str, version: str, platform: str) -> str:
    # 已知软件使用预置可靠脚本，避免 AI 生成不稳定的下载链接
    reliable = get_reliable_script(software_name, platform)
    if reliable:
        return reliable

    from datetime import datetime
    now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    hint = get_install_hint(software_name, platform)
    hint_block = f"\n安装提示：{hint}" if hint else ""
    win_rules = WINDOWS_SCRIPT_RULES if platform == "windows" else ""

    user_prompt = f"""为 {display_name} {version} 生成 {platform} 平台的一键安装脚本。
只输出可执行的脚本代码（bash 或 powershell），不要 Markdown 包装，不要解释。
脚本必须包含：
1. 中文注释说明每个步骤
2. 环境变量配置
3. 安装验证命令
4. 错误处理

{win_rules}
{hint_block}
{platform} 平台：Windows 用 PowerShell，macOS/Linux 用 Bash
不要添加 #Requires -RunAsAdministrator（应用会自动请求管理员权限）
当前时间：{now}"""

    messages = [
        {"role": "system", "content": "你是一个安装脚本生成器。只输出可执行的脚本代码，不要 Markdown 代码块包装，不要额外解释。"},
        {"role": "user", "content": user_prompt},
    ]
    result = await call_ai(messages, temperature=0.3)
    return strip_requires_admin(strip_script_markdown(result))


def check_ai_configured() -> bool:
    return bool(AI_API_KEY)
