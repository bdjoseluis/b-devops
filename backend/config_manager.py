import json
import os
from pathlib import Path

CONFIG_PATH = Path(__file__).parent / "config.json"
# .env vive en la raíz del repo (un nivel por encima de backend/)
DOTENV_PATH = Path(__file__).parent.parent / ".env"

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

# ── Variables de entorno que pueden SOBREESCRIBIR config.json ──────────────────
# Si la variable existe en el entorno (o en .env), gana sobre lo que haya en
# config.json. Así los secretos pueden vivir fuera del repo, en .env / el entorno
# del contenedor, manteniendo config.json como fallback para el arranque local.
# Mapa: (sección, clave) -> NOMBRE_VARIABLE_ENTORNO
ENV_OVERRIDES = {
    ("apis", "gemini"):        "GEMINI_API_KEY",
    ("apis", "groq"):          "GROQ_API_KEY",
    ("apis", "shodan"):        "SHODAN_API_KEY",
    ("apis", "virustotal"):    "VIRUSTOTAL_API_KEY",
    ("apis", "hunter"):        "HUNTER_API_KEY",
    ("apis", "securitytrails"): "SECURITYTRAILS_API_KEY",
    ("apis", "hibp"):          "HIBP_API_KEY",
    ("apis", "abuseipdb"):     "ABUSEIPDB_API_KEY",
    ("apis", "urlscan"):       "URLSCAN_API_KEY",
    ("apis", "google_places"): "GOOGLE_PLACES_API_KEY",
    ("apis", "vercel"):        "VERCEL_TOKEN",
    ("apis", "supabase"):      "SUPABASE_TOKEN",
    ("apis", "notion"):        "NOTION_TOKEN",
    ("kali_ssh", "password"):  "KALI_SSH_PASSWORD",
    ("auth", "password"):      "AUTH_PASSWORD",
    ("auth", "admin_pin"):     "ADMIN_PIN",
    ("smtp", "password"):      "SMTP_PASSWORD",
}


def _load_dotenv() -> None:
    """Carga repo-root .env en os.environ (sin pisar lo ya definido).

    Parser mínimo sin dependencias: KEY=VALUE por línea, ignora comentarios y
    líneas vacías, quita comillas envolventes. Es un no-op si .env no existe.
    """
    if not DOTENV_PATH.exists():
        return
    try:
        for raw in DOTENV_PATH.read_text(encoding="utf-8").splitlines():
            line = raw.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            key, _, value = line.partition("=")
            key = key.strip()
            value = value.strip().strip('"').strip("'")
            # No pisar variables ya presentes en el entorno real
            if key and key not in os.environ:
                os.environ[key] = value
    except Exception:
        # .env malformado no debe tumbar el arranque: seguimos con config.json
        pass


def _apply_env_overrides(config: dict) -> dict:
    """Sobreescribe valores de config con variables de entorno cuando existan."""
    for (section, key), env_name in ENV_OVERRIDES.items():
        env_value = os.environ.get(env_name)
        if env_value:  # solo si la variable está definida y no vacía
            config.setdefault(section, {})[key] = env_value
    return config


def load_config() -> dict:
    _load_dotenv()
    if not CONFIG_PATH.exists():
        save_config(DEFAULT_CONFIG)
        merged = DEFAULT_CONFIG.copy()
    else:
        with open(CONFIG_PATH, "r", encoding="utf-8") as f:
            data = json.load(f)
        # Merge missing keys from default
        merged = _deep_merge(DEFAULT_CONFIG, data)
    # Las variables de entorno tienen prioridad sobre config.json
    return _apply_env_overrides(merged)


def save_config(config: dict) -> None:
    # No persistir en config.json los valores que provienen de variables de
    # entorno: si una clave la sirve el entorno, en disco se guarda vacía para
    # que el secreto viva sólo en .env / el entorno, no en el repo de config.
    to_save = json.loads(json.dumps(config))  # copia profunda
    for (section, key), env_name in ENV_OVERRIDES.items():
        env_value = os.environ.get(env_name)
        if env_value and to_save.get(section, {}).get(key) == env_value:
            to_save[section][key] = ""
    with open(CONFIG_PATH, "w", encoding="utf-8") as f:
        json.dump(to_save, f, indent=2, ensure_ascii=False)


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
