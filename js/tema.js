"use strict";

/* Modo claro/oscuro de GananciaPro.
   Se guarda en su propia clave; NO toca los datos (gananciapro_operaciones_v1). */
(function () {
    const CLAVE_TEMA = "gananciapro_tema";
    const raiz = document.documentElement;
    const consultaOscuro = window.matchMedia("(prefers-color-scheme: dark)");

    // Aplicar la elección guardada antes de pintar la página (evita parpadeos)
    try {
        const guardado = localStorage.getItem(CLAVE_TEMA);
        /* Sin elección guardada, la primera visita se ve en oscuro premium */
        raiz.setAttribute("data-theme", guardado === "light" ? "light" : "dark");
    } catch (error) {
        raiz.setAttribute("data-theme", "dark");
    }

    function temaActual() {
        return raiz.getAttribute("data-theme") ||
            (consultaOscuro.matches ? "dark" : "light");
    }

    function iniciar() {
        const boton = document.getElementById("btnTema");
        if (!boton) return;

        function actualizarBoton() {
            const oscuro = temaActual() === "dark";
            const NS = "http://www.w3.org/2000/svg";
            const svg = document.createElementNS(NS, "svg");
            svg.setAttribute("viewBox", "0 0 24 24");
            svg.setAttribute("width", "18");
            svg.setAttribute("height", "18");
            svg.setAttribute("aria-hidden", "true");
            svg.setAttribute("focusable", "false");
            const trazo = document.createElementNS(NS, "path");
            /* Sol (modo oscuro activo: ofrece claro) o luna (ofrece oscuro) */
            trazo.setAttribute("d", oscuro
                ? "M12 4V2M12 22v-2M4 12H2M22 12h-2M6.3 6.3 4.9 4.9M19.1 19.1l-1.4-1.4M6.3 17.7l-1.4 1.4M19.1 4.9l-1.4 1.4M12 7.5a4.5 4.5 0 1 0 0 9 4.5 4.5 0 0 0 0-9z"
                : "M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5z");
            trazo.setAttribute("fill", oscuro ? "none" : "currentColor");
            trazo.setAttribute("stroke", "currentColor");
            trazo.setAttribute("stroke-width", "2");
            trazo.setAttribute("stroke-linecap", "round");
            trazo.setAttribute("stroke-linejoin", "round");
            svg.appendChild(trazo);
            boton.replaceChildren(svg);
            boton.setAttribute(
                "aria-label",
                oscuro ? "Activar modo claro" : "Activar modo oscuro"
            );
            boton.title = oscuro ? "Modo claro" : "Modo oscuro";
        }

        boton.addEventListener("click", () => {
            const siguiente = temaActual() === "dark" ? "light" : "dark";
            raiz.setAttribute("data-theme", siguiente);

            try {
                localStorage.setItem(CLAVE_TEMA, siguiente);
            } catch (error) {
                /* Si no se puede guardar, el cambio vale solo para esta visita */
            }

            actualizarBoton();
        });

        consultaOscuro.addEventListener("change", actualizarBoton);
        actualizarBoton();
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", iniciar);
    } else {
        iniciar();
    }
})();
