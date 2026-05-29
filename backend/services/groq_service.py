"""
Groq LLM Service — ultra-fast inference via Groq Cloud
Compatible with OpenAI API format (httpx, no extra deps)
"""

import httpx
from config_manager import get_api_key

GROQ_BASE = "https://api.groq.com/openai/v1"

MODELS = {
    "llama-3.3-70b-versatile": "Llama 3.3 70B (mejor)",
    "llama-3.1-8b-instant":    "Llama 3.1 8B (rápido)",
    "llama3-70b-8192":         "Llama3 70B 8K",
    "mixtral-8x7b-32768":      "Mixtral 8x7B 32K",
    "gemma2-9b-it":            "Gemma 2 9B",
}

SYSTEM_PROMPT = (
    "Eres B-DEVOPS AI, un asistente experto en ciberseguridad, OSINT, DevOps y desarrollo. "
    "Respondes siempre en español. Eres directo, técnico y preciso. "
    "Cuando recibes datos de auditorías o escaneos, identificas riesgos, "
    "recomiendas pasos concretos y explicas hallazgos con claridad. "
    "Solo apoyas auditorías y análisis autorizados."
)


def _headers() -> dict:
    key = get_api_key("groq")
    if not key:
        return {}
    return {
        "Authorization": f"Bearer {key}",
        "Content-Type": "application/json",
    }


async def chat(messages: list, model: str = "llama-3.3-70b-versatile",
               max_tokens: int = 2048, temperature: float = 0.7) -> dict:
    """
    Send a chat request to Groq.
    messages: list of {"role": "user"|"assistant"|"system", "content": "..."}
    Returns {"content": str, "model": str, "tokens": int} or {"error": str}
    """
    key = get_api_key("groq")
    if not key:
        return {"error": "Groq API key not configured. Add it in Settings → APIs."}

    # Prepend system prompt if not already present
    if not messages or messages[0].get("role") != "system":
        messages = [{"role": "system", "content": SYSTEM_PROMPT}] + list(messages)

    payload = {
        "model": model,
        "messages": messages,
        "max_tokens": max_tokens,
        "temperature": temperature,
        "stream": False,
    }

    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            r = await client.post(
                f"{GROQ_BASE}/chat/completions",
                headers=_headers(),
                json=payload,
            )
            r.raise_for_status()
            data = r.json()
            choice = data["choices"][0]["message"]
            usage = data.get("usage", {})
            return {
                "content": choice["content"],
                "role": "assistant",
                "model": data.get("model", model),
                "tokens": {
                    "prompt": usage.get("prompt_tokens", 0),
                    "completion": usage.get("completion_tokens", 0),
                    "total": usage.get("total_tokens", 0),
                },
            }
    except httpx.HTTPStatusError as e:
        try:
            detail = e.response.json().get("error", {}).get("message", str(e))
        except Exception:
            detail = str(e)
        return {"error": f"Groq API error: {detail}"}
    except Exception as e:
        return {"error": f"Request failed: {e}"}


async def analyze(target: str, data: dict, analysis_type: str = "osint",
                  model: str = "llama-3.3-70b-versatile") -> dict:
    """Pre-built analysis prompts for security workflows."""
    prompts = {
        "osint": (
            f"Analiza este resultado OSINT para: **{target}**\n\n"
            f"Datos: {_summarize(data)}\n\n"
            "Proporciona:\n"
            "1. Nivel de riesgo (CRÍTICO/ALTO/MEDIO/BAJO)\n"
            "2. Top 5 hallazgos\n"
            "3. Vectores de ataque potenciales\n"
            "4. Próximos pasos recomendados\n"
            "5. Score de exposición (0-10)"
        ),
        "scan": (
            f"Analiza este escaneo de puertos para: **{target}**\n\n"
            f"Datos: {_summarize(data)}\n\n"
            "Analiza servicios expuestos, vulnerabilidades comunes, "
            "recomendaciones de hardening y prioridad de acción."
        ),
        "code": (
            f"Revisa este código en busca de vulnerabilidades de seguridad:\n\n"
            f"```\n{data.get('code', '')}\n```\n\n"
            "Identifica: SQL injection, XSS, CSRF, inyecciones, secretos hardcodeados, "
            "problemas de autenticación, y cualquier otro riesgo crítico. "
            "Proporciona línea exacta y corrección para cada problema."
        ),
        "report": (
            f"Genera un resumen ejecutivo profesional para auditoría de: **{target}**\n\n"
            f"Datos: {_summarize(data)}\n\n"
            "Incluye: descripción del objetivo, hallazgos principales, "
            "nivel de riesgo global, y recomendaciones prioritarias. Máximo 300 palabras."
        ),
    }

    prompt_text = prompts.get(analysis_type, prompts["osint"])
    messages = [{"role": "user", "content": prompt_text}]
    return await chat(messages, model=model, max_tokens=1500)


def get_models() -> dict:
    return MODELS


def _summarize(data: dict) -> str:
    lines = []
    for k, v in data.items():
        if isinstance(v, dict) and not v.get("error"):
            for kk, vv in v.items():
                if vv and not isinstance(vv, (dict, list)):
                    lines.append(f"{k}.{kk}: {vv}")
                elif isinstance(vv, list) and vv:
                    lines.append(f"{k}.{kk}: {str(vv)[:120]}")
        elif isinstance(v, str) and v:
            lines.append(f"{k}: {v[:200]}")
    return "\n".join(lines[:40]) if lines else str(data)[:500]
