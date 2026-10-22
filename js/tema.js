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
        if (guardado === "dark" || guardado === "light") {
            raiz.setAttribute("data-theme", guardado);
        }
    } catch (error) {
        /* Sin almacenamiento: se sigue el tema del sistema */
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
            boton.textContent = oscuro ? "\u2600" : "\u263E";
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
