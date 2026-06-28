"""
DEVOPS — Lab Hunter · Vault de conocimiento
Persiste cada máquina resuelta como conocimiento reutilizable:
  - runbooks/<ip>_<fecha>.md  : runbook Obsidian (frontmatter + timeline + camino ganador)
  - flags.jsonl               : índice de flags (dedup por valor)
  - index.md                  : registro vivo de todos los runs (dashboard)

Esto es el "aprendizaje" real de Lab Hunter: NO se reentrena ningún modelo,
se acumula una biblioteca que el cerebro-IA podrá leer (RAG) y que alimenta
el futuro informe PDF. Todo best-effort: si guardar falla, NUNCA rompe el ataque.
"""
import json
import re
import time
from pathlib import Path

from config_manager import load_config

# Carpeta del vault: configurable (config.json > lab_vault_dir) para apuntarla
# a Obsidian más adelante. Por defecto, dentro del backend.
_DEFAULT_DIR = Path(__file__).resolve().parent.parent / "lab_hunter_vault"

# Fases cuyo paso forma parte del "camino ganador" (lo que de verdad resolvió la máquina).
_WIN_FASES = {"EXPLOIT", "ENUM", "LOOT"}


def _vault_dir() -> Path:
    cfg = load_config()
    d = cfg.get("lab_vault_dir")
    return Path(d) if d else _DEFAULT_DIR


def _slug(target: str) -> str:
    return re.sub(r"[^A-Za-z0-9._-]", "_", target.strip())


def _winning_path(steps: list) -> list:
    """Pasos que llevaron al éxito: los de fase de explotación o con flag/acceso."""
    win = []
    for s in steps:
        fase = s.get("fase", "")
        res = (s.get("resultado") or "").lower()
        tiene_flag = any("flag" in str(h).lower() for h in s.get("hallazgos", []))
        if fase in _WIN_FASES and (tiene_flag or "ok" in res or "acceso" in res
                                   or "root" in res or "flag" in res):
            win.append(s)
    return win


def _render_runbook(res: dict) -> str:
    target = res.get("target", "?")
    status = res.get("status", "?")
    services = res.get("services", [])
    flags = res.get("flags", [])
    steps = res.get("steps", [])
    fecha = time.strftime("%Y-%m-%d %H:%M")
    svc_list = [f"{s['port']}/{s['service']}" for s in services]

    L = []
    # Frontmatter (Obsidian)
    L.append("---")
    L.append(f"target: {target}")
    L.append(f"status: {status}")
    L.append(f"fecha: {fecha}")
    L.append(f"servicios: [{', '.join(svc_list)}]")
    L.append(f"flags: [{', '.join(flags)}]")
    L.append("tags: [lab-hunter, htb]")
    L.append("---")
    L.append("")
    L.append(f"# Lab Hunter — {target}")
    L.append("")
    L.append(f"**Estado:** {status} · **Servicios:** {len(services)} · "
             f"**Flags:** {len(flags)}")
    L.append("")

    # Servicios
    if services:
        L.append("## Servicios")
        L.append("")
        L.append("| Puerto | Servicio |")
        L.append("|--------|----------|")
        for s in services:
            L.append(f"| {s['port']} | {s['service']} |")
        L.append("")

    # Camino ganador
    win = _winning_path(steps)
    if win:
        L.append("## Camino ganador")
        L.append("")
        for s in win:
            L.append(f"- **{s['fase']}** · {s['accion']} → {s['resultado']}")
            for h in s.get("hallazgos", []):
                L.append(f"  - {h}")
        L.append("")

    # Flags
    if flags:
        L.append("## Flags")
        L.append("")
        for f in flags:
            L.append(f"- `{f}`")
        L.append("")

    # Timeline completa (evidencia)
    L.append("## Timeline")
    L.append("")
    for s in steps:
        L.append(f"### paso {s['paso']} · {s['ts']} · {s['fase']} — "
                 f"{s['accion']} → {s['resultado']}")
        for h in s.get("hallazgos", []):
            L.append(f"- {h}")
        salida = (s.get("salida") or "").strip()
        if salida:
            L.append("```")
            L.append(salida)
            L.append("```")
        L.append("")

    return "\n".join(L)


def _append_flags(vault: Path, res: dict, runbook_name: str) -> int:
    """Añade flags nuevas a flags.jsonl (dedup por valor). Devuelve cuántas nuevas."""
    flags = res.get("flags", [])
    if not flags:
        return 0
    fpath = vault / "flags.jsonl"
    existing = set()
    if fpath.exists():
        for line in fpath.read_text(encoding="utf-8").splitlines():
            try:
                existing.add(json.loads(line)["flag"])
            except Exception:
                continue
    # servicio "culpable": el primero con playbook (heurística simple para etiquetar)
    svc = next((f"{s['port']}/{s['service']}" for s in res.get("services", [])), "")
    nuevas = 0
    with fpath.open("a", encoding="utf-8") as fh:
        for fl in flags:
            if fl in existing:
                continue
            fh.write(json.dumps({
                "ts": time.strftime("%Y-%m-%d %H:%M:%S"),
                "target": res.get("target", ""),
                "flag": fl,
                "servicio": svc,
                "runbook": runbook_name,
            }, ensure_ascii=False) + "\n")
            existing.add(fl)
            nuevas += 1
    return nuevas


def _append_index(vault: Path, res: dict, runbook_name: str) -> None:
    """Añade una fila al registro de runs (index.md). Append-only = historial honesto."""
    idx = vault / "index.md"
    if not idx.exists():
        idx.write_text(
            "# Lab Hunter — Registro de máquinas\n\n"
            "| Fecha | Target | Estado | Servicios | Flags | Runbook |\n"
            "|-------|--------|--------|-----------|-------|---------|\n",
            encoding="utf-8")
    svc = ", ".join(f"{s['port']}/{s['service']}" for s in res.get("services", []))
    flags = ", ".join(res.get("flags", [])) or "—"
    fecha = time.strftime("%Y-%m-%d %H:%M")
    row = (f"| {fecha} | {res.get('target','')} | {res.get('status','')} | "
           f"{svc or '—'} | {flags} | [[{runbook_name}]] |\n")
    with idx.open("a", encoding="utf-8") as fh:
        fh.write(row)


def recall(services: list, target: str = "", max_chars: int = 3000) -> str:
    """
    RAG simple para el cerebro: recupera de los runbooks del vault los "caminos
    ganadores" de máquinas con servicios parecidos a los actuales. Devuelve texto
    plano listo para inyectar como contexto. Best-effort: si falla, cadena vacía.
    """
    try:
        rb_dir = _vault_dir() / "runbooks"
        if not rb_dir.exists():
            return ""
        wanted = set()
        for s in services:
            svc = re.sub(r"[?]", "", str(s.get("service", ""))).lower()
            if svc:
                wanted.add(svc)
            if s.get("port"):
                wanted.add(str(s["port"]))
        if not wanted:
            return ""

        hits = []
        for f in sorted(rb_dir.glob("*.md"), reverse=True):  # más recientes primero
            txt = f.read_text(encoding="utf-8", errors="replace")
            if target and f"target: {target}\n" in txt:
                continue  # no recordarse a sí misma
            m = re.search(r"servicios:\s*\[(.*?)\]", txt)
            svcs = m.group(1).lower() if m else ""
            if not any(w in svcs for w in wanted):
                continue
            cam = re.search(r"## Camino ganador\n(.*?)(?:\n## |\Z)", txt, re.S)
            head = re.search(r"# Lab Hunter — (.+)", txt)
            name = head.group(1).strip() if head else f.stem
            cuerpo = cam.group(1).strip() if cam else "(sin camino ganador registrado)"
            hits.append(f"### {name} (servicios: {svcs})\n{cuerpo}")
            if sum(len(h) for h in hits) > max_chars:
                break
        return "\n\n".join(hits)[:max_chars]
    except Exception:
        return ""


def save(res: dict) -> str:
    """
    Persiste un resultado de hunt en el vault. Best-effort: cualquier error se
    traga y se reporta como cadena vacía (la persistencia NUNCA rompe el ataque).
    Devuelve la ruta del runbook escrito, o "" si no se pudo.
    """
    try:
        vault = _vault_dir()
        (vault / "runbooks").mkdir(parents=True, exist_ok=True)

        target = res.get("target", "sin-ip")
        stamp = time.strftime("%Y%m%d-%H%M%S")
        runbook_name = f"{_slug(target)}_{stamp}.md"
        runbook_path = vault / "runbooks" / runbook_name

        runbook_path.write_text(_render_runbook(res), encoding="utf-8")
        _append_flags(vault, res, runbook_name)
        _append_index(vault, res, runbook_name)
        return str(runbook_path)
    except Exception:
        return ""
