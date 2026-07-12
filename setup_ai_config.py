"""
Config helper: reads AI API Key from Cursor settings and writes to server/.env
"""
import os
import sys
import json
from pathlib import Path


def find_cursor_settings():
    if sys.platform == "win32":
        base = Path(os.environ.get("APPDATA", ""))
        paths = [base / "Cursor" / "User" / "settings.json"]
    elif sys.platform == "darwin":
        home = Path.home()
        paths = [home / "Library" / "Application Support" / "Cursor" / "User" / "settings.json"]
    else:
        home = Path.home()
        paths = [home / ".config" / "Cursor" / "User" / "settings.json"]
    for p in paths:
        if p.exists():
            return p
    return None


def extract_api_config(settings_path: Path) -> dict:
    try:
        with open(settings_path, 'r', encoding='utf-8') as f:
            settings = json.load(f)
    except Exception as e:
        print(f"[ERR] cannot read settings.json: {e}")
        return {}

    config = {}
    openai_compat = settings.get("cursor.openaiCompatible", [])
    if not openai_compat:
        openai_compat = settings.get("openaiCompatible", [])

    for item in openai_compat:
        name = item.get("name", "").lower()
        if "deepseek" in name:
            config["api_key"] = item.get("apiKey", "")
            config["base_url"] = item.get("baseUrl", "https://api.deepseek.com/v1")
            config["model"] = item.get("model", "deepseek-chat")
            print("[OK] Found DeepSeek config in Cursor settings")
            return config

    openai_api_key = settings.get("openai.apiKey", "")
    if openai_api_key:
        config["api_key"] = openai_api_key
        config["base_url"] = "https://api.openai.com/v1"
        config["model"] = settings.get("openai.model", "gpt-4o")
        print("[OK] Found OpenAI API Key in Cursor settings")
        return config

    for item in openai_compat:
        api_key = item.get("apiKey", "")
        if api_key:
            config["api_key"] = api_key
            config["base_url"] = item.get("baseUrl", "https://api.openai.com/v1")
            config["model"] = item.get("model", "gpt-4o")
            print(f"[OK] Found OpenAI-compatible config: {item.get('name', 'unknown')}")
            return config
    return config


def write_env_file(config: dict, output_path: Path):
    admin_password = "admin123"
    content = f"""# zhuang-le-ma server config
# Auto-generated from Cursor settings.json

AI_API_KEY={config.get('api_key', '')}
AI_BASE_URL={config.get('base_url', 'https://api.deepseek.com/v1')}
AI_MODEL={config.get('model', 'deepseek-chat')}
ADMIN_PASSWORD={admin_password}
"""
    with open(output_path, 'w', encoding='utf-8') as f:
        f.write(content)
    print(f"[OK] .env file written: {output_path}")


def main():
    script_dir = Path(__file__).parent
    env_path = script_dir / "server" / ".env"
    print("=" * 50)
    print("  zhuang le ma - Auto Config Tool")
    print("=" * 50)
    settings_path = find_cursor_settings()
    if not settings_path:
        print("[WARN] Cursor settings.json not found")
        print(f"[TIP] Please manually configure server/.env")
        return
    print(f"[FILE] Found Cursor settings: {settings_path}")
    config = extract_api_config(settings_path)
    if not config or not config.get("api_key"):
        print("[WARN] No AI API Key found in Cursor settings")
        return
    write_env_file(config, env_path)
    print("\n[OK] Done! Start with: cd server && python main.py")


if __name__ == "__main__":
    main()
