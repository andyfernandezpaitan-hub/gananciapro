"use strict";

/* «Instalar en tu celular»: botón para Chrome/Edge/Android y pista para iPhone.
   No usa service worker (no guarda copias de tus datos en el dispositivo). */
(function () {
    const boton = document.getElementById("btnInstalar");
    const pista = document.getElementById("pistaInstalar");
    if (!boton || !pista) return;

    const yaInstalada =
        window.matchMedia?.("(display-mode: standalone)").matches || window.navigator.standalone === true;
    if (yaInstalada) return;

    let evento = null;

    window.addEventListener("beforeinstallprompt", (e) => {
        e.preventDefault();
        evento = e;
        boton.hidden = false;
    });

    window.addEventListener("appinstalled", () => {
        evento = null;
        boton.hidden = true;
    });

    boton.addEventListener("click", async () => {
        if (!evento) return;
        const guardado = evento;
        evento = null;
        boton.hidden = true;
        try {
            await guardado.prompt();
        } catch (e) { /* el navegador no permitió mostrar el aviso */ }
    });

    /* iPhone/iPad no ofrece botón: se instala desde el menú Compartir */
    if (/iphone|ipad|ipod/i.test(window.navigator.userAgent)) pista.hidden = false;
})();
