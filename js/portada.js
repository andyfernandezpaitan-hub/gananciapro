"use strict";

/* Portada pública de GananciaPro: calculadora, pasos, planes y aparición al desplazarse.
   Solo mueve transform y opacidad. Con "reducir movimiento" todo se muestra sin animación.
   Todo el texto dinámico se escribe con textContent (nunca innerHTML). */
(function () {
    const raiz = document.documentElement;
    const reducido = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const config = window.GANANCIAPRO_CONFIG || {};

    function $(id) { return document.getElementById(id); }
    const locale = () => (window.GP_IDIOMA ? window.GP_IDIOMA.locale() : "es-PE");

    /* ---------- Precio desde la configuración ---------- */
    const precio = typeof config.PRECIO_LANDING === "string" ? config.PRECIO_LANDING.trim() : "";
    if (precio) {
        const m = precio.match(/^(.+?)\s+(al mes|\/\s*mes|por mes)$/i);
        if ($("planCifra")) $("planCifra").textContent = m ? m[1] : precio;
        if ($("planPeriodo") && m) $("planPeriodo").textContent = "al mes";
    }

    /* ---------- Botones "Empezar gratis" / "Iniciar sesión" ---------- */
    document.querySelectorAll("[data-cta]").forEach((boton) => {
        boton.addEventListener("click", () => {
            const pestana = $(boton.getAttribute("data-cta") === "entrar" ? "tabEntrar" : "tabCrear");
            if (pestana) pestana.click();
            const acceso = $("acceso");
            if (!acceso) return;
            acceso.scrollIntoView({ behavior: reducido ? "auto" : "smooth", block: "start" });
            const campo = acceso.querySelector("form:not([hidden]) input");
            if (campo) campo.focus({ preventScroll: true });
        });
    });

    /* ---------- Calculadora de la portada ---------- */
    const calc = document.querySelector(".lp-calc");
    if (calc) {
        calc.addEventListener("submit", (e) => e.preventDefault());
        const entra = $("calcIngreso");
        const sale = $("calcGasto");
        const salida = $("calcGanancia");
        const etiqueta = $("calcEtiqueta");
        const numero = (txt) => {
            const limpio = String(txt).replace(/[^\d.,]/g, "").replace(/,/g, ".");
            const partes = limpio.split(".");
            const v = partes.length > 1 ? Number(partes.slice(0, -1).join("") + "." + partes[partes.length - 1]) : Number(limpio);
            return Number.isFinite(v) ? Math.min(Math.max(v, 0), 999999999) : 0;
        };
        const pintar = () => {
            const g = numero(entra.value) - numero(sale.value);
            const fmt = new Intl.NumberFormat(locale(), { maximumFractionDigits: 2 });
            salida.textContent = (g < 0 ? "−" : "") + "S/ " + fmt.format(Math.abs(g));
            etiqueta.textContent = g < 0 ? "Te falta" : "Te queda";
        };
        entra.addEventListener("input", pintar);
        sale.addEventListener("input", pintar);
        document.addEventListener("gp-idioma", pintar);
        pintar();
    }

    /* ---------- Cómo funciona: un control, tres pasos ---------- */
    const rango = $("comoRango");
    if (rango) {
        const frases = ["Primero, crea tu cuenta.", "Luego, registra tu día.", "Al final, mira tu ganancia."];
        const vistas = document.querySelectorAll("#comoVista [data-vp]");
        const nombres = document.querySelectorAll(".lp-pasos li");
        const cambiar = () => {
            const n = Math.min(Math.max(Number(rango.value) || 0, 0), 2);
            const clausula = $("comoClausula");
            clausula.textContent = frases[n];
            /* Reinicia la animación de cruce */
            clausula.style.animation = "none"; void clausula.offsetWidth; clausula.style.animation = "";
            vistas.forEach((v) => { v.hidden = Number(v.dataset.vp) !== n; });
            nombres.forEach((li) => li.setAttribute("aria-current", String(Number(li.dataset.n) === n)));
            rango.setAttribute("aria-valuetext", nombres[n] ? nombres[n].textContent : String(n + 1));
        };
        rango.addEventListener("input", cambiar);
        nombres.forEach((li) => li.addEventListener("click", () => { rango.value = li.dataset.n; cambiar(); }));
        cambiar();
    }

    /* ---------- Precio: dos planes, una sola cifra ---------- */
    const botonesPlan = document.querySelectorAll(".lp-plan");
    if (botonesPlan.length) {
        const datos = {
            prueba: { cifra: "0 USD", periodo: "14 días", texto: "Usa todo sin tarjeta. Al terminar puedes seguir viendo y descargando tus datos; para seguir registrando te suscribes.", boton: "Empezar gratis" },
            mensual: { cifra: null, periodo: "al mes", texto: "Finanzas y almacén completos. Cancela cuando quieras y conserva el acceso hasta el final del periodo pagado. Exporta o borra tus datos en cualquier momento.", boton: "Empezar gratis" }
        };
        const cifraMensual = $("planCifra").textContent;
        const escena = $("planEscena");
        const elegir = (id, animar) => {
            const d = datos[id];
            botonesPlan.forEach((b) => b.setAttribute("aria-selected", String(b.dataset.plan === id)));
            $("planCifra").textContent = d.cifra || cifraMensual;
            $("planPeriodo").textContent = d.periodo;
            $("planTexto").textContent = d.texto;
            $("planBoton").textContent = d.boton;
            escena.setAttribute("aria-labelledby", id === "prueba" ? "planPrueba" : "planMensual");
            if (animar && !reducido) {
                Array.from(escena.children).forEach((h) => { h.style.animation = "none"; void h.offsetWidth; h.style.animation = ""; });
            }
        };
        botonesPlan.forEach((b) => b.addEventListener("click", () => elegir(b.dataset.plan, true)));
    }

    if (reducido || !("IntersectionObserver" in window)) return;

    /* ---------- Aparición una sola vez ---------- */
    raiz.classList.add("js-portada");
    const observador = new IntersectionObserver((entradas) => {
        entradas.forEach((entrada) => {
            if (entrada.isIntersecting) {
                entrada.target.classList.add("visible");
                observador.unobserve(entrada.target);
            }
        });
    }, { threshold: 0.12, rootMargin: "0px 0px -6% 0px" });
    document.querySelectorAll("[data-aparece]").forEach((el) => observador.observe(el));
})();
