"use strict";

/* Protección contra bots (Cloudflare Turnstile) en entrar, crear cuenta y recuperar contraseña.
   La clave del sitio es PÚBLICA. La clave secreta vive solo en Supabase (Auth → Attack Protection).
   Si no hay clave en config.js, no hace nada. */
(function () {
    const cfg = window.GANANCIAPRO_CONFIG || {};
    const clave = cfg.TURNSTILE_CLAVE_SITIO;
    const widgets = new Map(); // id del formulario -> { id, token, espera }

    if (!clave) {
        window.GP_CAPTCHA = Object.freeze({ activo: false, token: async () => undefined, reiniciar() {} });
        return;
    }

    let falloCarga = false;

    function pintar() {
        for (const caja of document.querySelectorAll("[data-captcha]")) {
            const form = caja.closest("form");
            if (!form || widgets.has(form.id)) continue;
            const estado = { id: null, token: "", espera: [] };
            widgets.set(form.id, estado);
            estado.id = window.turnstile.render(caja, {
                sitekey: clave,
                theme: "auto",
                callback(token) {
                    estado.token = token;
                    estado.espera.splice(0).forEach((r) => r.ok(token));
                },
                "expired-callback"() { estado.token = ""; },
                "error-callback"() {
                    estado.token = "";
                    estado.espera.splice(0).forEach((r) => r.fallo(new Error("No se pudo verificar que eres una persona. Recarga la página e inténtalo de nuevo.")));
                }
            });
        }
    }

    const script = document.createElement("script");
    script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
    script.async = true;
    script.onload = () => { try { pintar(); } catch (e) { falloCarga = true; } };
    script.onerror = () => { falloCarga = true; };
    document.head.appendChild(script);

    window.GP_CAPTCHA = Object.freeze({
        activo: true,

        /* Devuelve el token de verificación del formulario (espera hasta 20 s) */
        token(idFormulario) {
            const estado = widgets.get(idFormulario);
            if (estado && estado.token) return Promise.resolve(estado.token);
            return new Promise((ok, fallo) => {
                if (falloCarga || !estado) {
                    fallo(new Error("No se pudo cargar la verificación anti-bots. Recarga la página e inténtalo de nuevo."));
                    return;
                }
                const pendiente = { ok, fallo };
                estado.espera.push(pendiente);
                setTimeout(() => {
                    const i = estado.espera.indexOf(pendiente);
                    if (i !== -1) {
                        estado.espera.splice(i, 1);
                        fallo(new Error("La verificación anti-bots tardó demasiado. Inténtalo de nuevo."));
                    }
                }, 20000);
            });
        },

        /* Cada token sirve una sola vez: se pide uno nuevo después de usarlo */
        reiniciar(idFormulario) {
            const estado = widgets.get(idFormulario);
            if (!estado || !window.turnstile) return;
            estado.token = "";
            try { window.turnstile.reset(estado.id); } catch (e) { /* sin widget */ }
        }
    });
})();
