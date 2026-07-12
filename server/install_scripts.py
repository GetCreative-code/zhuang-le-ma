"""
可靠的安装脚本与平台提示
Windows 优先 winget，避免 Oracle/CDN 直链下载失败
"""

WINDOWS_SCRIPT_RULES = """
## Windows PowerShell 硬性规则
1. 优先使用 winget 安装，其次 chocolatey (choco)，禁止 Invoke-WebRequest 下载 Oracle/MySQL/大型安装包直链
2. 若必须下载，先检查 Content-Type 不是 text/html，避免把错误页面当安装包
3. 不要添加 #Requires -RunAsAdministrator
4. 安装后输出默认安装路径
"""

INSTALL_HINTS = {
    ("mysql", "windows"): """
MySQL Windows 安装：
- 使用: winget install Oracle.MySQL --accept-package-agreements --accept-source-agreements
- 备选: winget install Oracle.MySQLServer --accept-package-agreements --accept-source-agreements
- 禁止从 dev.mysql.com 直链下载（国内常返回 Oracle 错误页）
- 默认路径: C:\\Program Files\\MySQL\\MySQL Server 8.4\\
- 验证: Get-Service MySQL* ; mysql --version
""",
    ("nodejs", "windows"): "使用 winget install OpenJS.NodeJS.LTS --accept-package-agreements --accept-source-agreements",
    ("python", "windows"): "使用 winget install Python.Python.3.12 --accept-package-agreements --accept-source-agreements",
    ("git", "windows"): "使用 winget install Git.Git --accept-package-agreements --accept-source-agreements",
    ("docker", "windows"): "使用 winget install Docker.DockerDesktop --accept-package-agreements --accept-source-agreements",
}

# 一键安装使用预置脚本（绕过 AI，避免不可靠下载）
RELIABLE_SCRIPTS = {
    ("mysql", "windows"): r"""# MySQL Windows 安装脚本 - 使用 winget（推荐）
Write-Host ">>> 装了吗：开始安装 MySQL"

if (-not (Get-Command winget -ErrorAction SilentlyContinue)) {
    throw "未找到 winget。请从 Microsoft Store 安装应用安装程序(App Installer)后重试。"
}

Write-Host ">>> 通过 winget 安装 MySQL..."
winget install Oracle.MySQL --accept-package-agreements --accept-source-agreements --disable-interactivity
if ($LASTEXITCODE -ne 0) {
    Write-Host ">>> 尝试备选包 Oracle.MySQLServer..."
    winget install Oracle.MySQLServer --accept-package-agreements --accept-source-agreements --disable-interactivity
    if ($LASTEXITCODE -ne 0) {
        throw "winget 安装失败。请手动访问 https://dev.mysql.com/downloads/installer/ 下载 MySQL Installer。"
    }
}

Write-Host ">>> 查找 MySQL 安装路径..."
$mysqlDirs = Get-ChildItem "C:\Program Files\MySQL" -ErrorAction SilentlyContinue
if ($mysqlDirs) {
    $mysqlDirs | ForEach-Object { Write-Host "  已安装: $($_.FullName)" }
} else {
    Write-Host "  提示: 若未找到目录，可能仍在安装中，请稍后检查 C:\Program Files\MySQL\"
}

Write-Host ">>> 检查 MySQL 服务..."
Get-Service -Name "MySQL*" -ErrorAction SilentlyContinue | Format-Table Name, Status, DisplayName -AutoSize

$bin = Get-ChildItem "C:\Program Files\MySQL\*\bin\mysql.exe" -ErrorAction SilentlyContinue | Select-Object -First 1
if ($bin) {
    $mysqlBin = $bin.Directory.FullName
    Write-Host ">>> 配置环境变量 PATH..."
    $userPath = [Environment]::GetEnvironmentVariable("Path", "User")
    if ($userPath -notlike "*$mysqlBin*") {
        $newPath = if ($userPath) { "$userPath;$mysqlBin" } else { $mysqlBin }
        [Environment]::SetEnvironmentVariable("Path", $newPath, "User")
        $env:Path = "$env:Path;$mysqlBin"
        Write-Host "  已添加用户 PATH: $mysqlBin"
        Write-Host "  提示: 请关闭并重新打开终端后，可直接运行 mysql --version"
    } else {
        Write-Host "  PATH 中已存在: $mysqlBin"
    }
    Write-Host ">>> 验证版本:"
    & $bin.FullName --version
}

Write-Host ">>> MySQL 安装流程完成"
""",
}


def get_install_hint(software_name: str, platform: str) -> str:
    return INSTALL_HINTS.get((software_name.lower(), platform.lower()), "")


def get_reliable_script(software_name: str, platform: str) -> str | None:
    return RELIABLE_SCRIPTS.get((software_name.lower(), platform.lower()))
