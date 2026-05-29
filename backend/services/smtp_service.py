import smtplib
import ssl
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.mime.application import MIMEApplication
from pathlib import Path
from config_manager import load_config


def _get_smtp_cfg():
    return load_config().get("smtp", {})


async def send_report_email(to_email: str, subject: str, docx_path: str = "", body_text: str = "") -> dict:
    cfg = _get_smtp_cfg()
    if not cfg.get("enabled"):
        return {"status": "disabled", "message": "SMTP no habilitado"}

    smtp_email = cfg.get("email", "")
    smtp_password = cfg.get("password", "")
    smtp_host = cfg.get("host", "smtp.gmail.com")
    smtp_port = int(cfg.get("port", 587))

    if not smtp_email or not smtp_password:
        return {"status": "error", "message": "Credenciales SMTP no configuradas"}

    try:
        msg = MIMEMultipart()
        msg["From"] = smtp_email
        msg["To"] = to_email
        msg["Subject"] = subject

        body = body_text or "B-DEVOPS — Informe de auditoría adjunto.\n\nGenerado automáticamente por B-DEVOPS."
        msg.attach(MIMEText(body, "plain", "utf-8"))

        docx_file = Path(docx_path) if docx_path else None
        if docx_file and docx_file.exists():
            with open(docx_file, "rb") as f:
                part = MIMEApplication(f.read(), Name=docx_file.name)
                part["Content-Disposition"] = f'attachment; filename="{docx_file.name}"'
                msg.attach(part)

        context = ssl.create_default_context()
        with smtplib.SMTP(smtp_host, smtp_port) as server:
            server.ehlo()
            server.starttls(context=context)
            server.login(smtp_email, smtp_password)
            server.sendmail(smtp_email, to_email, msg.as_string())

        return {"status": "sent", "to": to_email, "subject": subject}
    except smtplib.SMTPAuthenticationError:
        return {"status": "error", "message": "Error de autenticación SMTP. Usa una contraseña de aplicación de Google."}
    except Exception as e:
        return {"status": "error", "message": str(e)}


async def test_connection() -> dict:
    cfg = _get_smtp_cfg()
    if not cfg.get("enabled"):
        return {"status": "disabled", "message": "SMTP no habilitado"}

    smtp_email = cfg.get("email", "")
    smtp_password = cfg.get("password", "")
    smtp_host = cfg.get("host", "smtp.gmail.com")
    smtp_port = int(cfg.get("port", 587))

    if not smtp_email or not smtp_password:
        return {"status": "error", "message": "Credenciales no configuradas"}

    try:
        context = ssl.create_default_context()
        with smtplib.SMTP(smtp_host, smtp_port) as server:
            server.ehlo()
            server.starttls(context=context)
            server.login(smtp_email, smtp_password)
        return {"status": "ok", "message": f"Conectado como {smtp_email}"}
    except smtplib.SMTPAuthenticationError:
        return {"status": "error", "message": "Autenticación fallida. Revisa email y contraseña de aplicación."}
    except Exception as e:
        return {"status": "error", "message": str(e)}
