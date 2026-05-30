import json
import os
from pathlib import Path

CONFIG_PATH = Path(__file__).parent / "config.json"

DEFAULT_CONFIG = {
    "auditor": {
        "name": "",
        "company": "",
        "email": "",
        "jurisdiction": "COBERTURA GLOBAL"
    },
    "apis": {
        "gemini": "",
        "groq": "",
        "shodan": "",
        "virustotal": "",
        "hunter": "",
        "securitytrails": "",
        "hibp": "",
        "abuseipdb": "",
        "censys_id": "",
        "censys_secret": "",
        "urlscan": "",
        "dehashed_email": "",
        "dehashed": "",
        "c99": "",
        "leakradar": "",
        "google_places": "",
        "numverify": "",
        "fullcontact": "",
        "vercel": "",
        "supabase": "",
        "notion": ""
    },
    "nmap_path": "nmap",
    "kali_ssh": {
        "enabled": False,
        "host": "",
        "port": 22,
        "user": "",
        "password": "",
        "key_path": ""
    },
    "scan_defaults": {
        "timeout": 30,
        "max_subdomains": 200
    },
    "auth": {
        "password": "",
        "admin_pin": ""
    },
    "smtp": {
        "enabled": False,
        "email": "",
        "password": "",
        "host": "smtp.gmail.com",
        "port": 587,
        "to": ""
    }
}


def load_config() -> dict:
    if not CONFIG_PATH.exists():
        save_config(DEFAULT_CONFIG)
        return DEFAULT_CONFIG.copy()
    with open(CONFIG_PATH, "r", encoding="utf-8") as f:
        data = json.load(f)
    # Merge missing keys from default
    merged = _deep_merge(DEFAULT_CONFIG, data)
    return merged


def save_config(config: dict) -> None:
    with open(CONFIG_PATH, "w", encoding="utf-8") as f:
        json.dump(config, f, indent=2, ensure_ascii=False)


def get_api_key(name: str) -> str:
    cfg = load_config()
    return cfg.get("apis", {}).get(name, "")


def _deep_merge(base: dict, override: dict) -> dict:
    result = base.copy()
    for k, v in override.items():
        if k in result and isinstance(result[k], dict) and isinstance(v, dict):
            result[k] = _deep_merge(result[k], v)
        else:
            result[k] = v
    return result
