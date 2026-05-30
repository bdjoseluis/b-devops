/**
 * B-DEVOPS Lead Intake — Carsimport
 * Añadir al formulario de contacto de carsimport.vercel.app
 *
 * Campos esperados del formulario (adaptar IDs a los reales del HTML):
 *   nombre   → input#nombre  (o input[name="nombre"])
 *   email    → input#email
 *   telefono → input#telefono  (opcional)
 *   mensaje  → textarea#mensaje (opcional)
 */

const BDEV_API = "https://api.bdev.qzz.io/api/integrations/lead";
const BDEV_KEY = "bdev_int_key_2026";

async function enviarLeadCarsimport(e) {
  e.preventDefault();

  const form = e.target;
  const btn  = form.querySelector('[type="submit"]');
  const msgEl = document.getElementById("form-message"); // elemento donde mostrar resultado

  const nombre   = (form.querySelector('[name="nombre"]')   || form.querySelector('#nombre'))?.value?.trim();
  const email    = (form.querySelector('[name="email"]')    || form.querySelector('#email'))?.value?.trim()   || "";
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
        "Content-Type":    "application/json",
        "X-Integration-Key": BDEV_KEY,
      },
      body: JSON.stringify({ nombre, email, telefono, mensaje, fuente: "carsimport" }),
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    if (msgEl) {
      msgEl.textContent = "¡Mensaje enviado! Nos pondremos en contacto pronto.";
      msgEl.className = "text-green-600 mt-2";
    } else {
      alert("¡Mensaje enviado! Nos pondremos en contacto pronto.");
    }
    form.reset();
  } catch (err) {
    console.error("[carsimport] lead error:", err);
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
// document.getElementById("contact-form").addEventListener("submit", enviarLeadCarsimport);
