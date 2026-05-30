/**
 * B-DEVOPS Lead Intake — Psicología (devesan.vercel.app)
 * Añadir al formulario de contacto del proyecto de psicología
 *
 * Campos esperados del formulario (adaptar nombres/IDs a los reales del HTML):
 *   nombre   → input[name="nombre"]  o  input#nombre
 *   email    → input[name="email"]   o  input#email
 *   telefono → input[name="telefono"] (opcional)
 *   mensaje  → textarea              (opcional)
 */

const BDEV_API = "https://api.bdev.qzz.io/api/integrations/lead";
const BDEV_KEY = "bdev_int_key_2026";

async function enviarLeadPsicologia(e) {
  e.preventDefault();

  const form  = e.target;
  const btn   = form.querySelector('[type="submit"]');
  const msgEl = document.getElementById("form-message");

  const nombre   = (form.querySelector('[name="nombre"]')   || form.querySelector('#nombre'))?.value?.trim();
  const email    = (form.querySelector('[name="email"]')    || form.querySelector('#email'))?.value?.trim()    || "";
  const telefono = (form.querySelector('[name="telefono"]') || form.querySelector('#telefono'))?.value?.trim() || "";
  const mensaje  = (form.querySelector('[name="mensaje"]')  || form.querySelector('#mensaje') ||
                    form.querySelector('textarea'))?.value?.trim() || "";

  if (!nombre) { alert("Por favor, introduce tu nombre."); return; }

  btn.disabled = true;
  btn.textContent = "Enviando…";

  try {
    const res = await fetch(BDEV_API, {
      method: "POST",
      headers: {
        "Content-Type":      "application/json",
        "X-Integration-Key": BDEV_KEY,
      },
      body: JSON.stringify({ nombre, email, telefono, mensaje, fuente: "psicologia" }),
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    if (msgEl) {
      msgEl.textContent = "¡Mensaje enviado! Te contactaremos en breve.";
      msgEl.className = "text-green-600 mt-2";
    } else {
      alert("¡Mensaje enviado! Te contactaremos en breve.");
    }
    form.reset();
  } catch (err) {
    console.error("[psicologia] lead error:", err);
    if (msgEl) {
      msgEl.textContent = "Error al enviar. Inténtalo de nuevo o escríbenos directamente.";
      msgEl.className = "text-red-500 mt-2";
    } else {
      alert("Error al enviar. Inténtalo de nuevo.");
    }
  } finally {
    btn.disabled = false;
    btn.textContent = "Enviar";
  }
}

// USAR: añadir al formulario de contacto
// document.getElementById("contact-form").addEventListener("submit", enviarLeadPsicologia);
