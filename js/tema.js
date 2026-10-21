"use strict";

/* Modo claro / oscuro de GananciaPro.
   Se carga en <head> para aplicar el tema guardado antes de pintar (sin parpadeo).
   El CSS usa :root[data-theme="dark" | "light"]; sin atributo sigue al sistema. */
(function () {
    const CLAVE = "gananciapro_tema";
    const raiz = document.documentElement;
    const sistemaOscuro = window.matchMedia ? window.matchMedia("(prefers-color-scheme: dark)") : null;

    function leer() {
        try {
            const valor = localStorage.getItem(CLAVE);
            return valor === "dark" || valor === "light" ? valor : null;
        } catch (e) {
            return null; // modo privado o almacenamiento bloqueado
        }
    }

    function guardar(valor) {
        try { localStorage.setItem(CLAVE, valor); } catch (e) { /* sin almacenamiento: solo esta sesión */ }
    }

    function temaActual() {
        const elegido = raiz.getAttribute("data-theme");
        if (elegido === "dark" || elegido === "light") return elegido;
        return sistemaOscuro && sistemaOscuro.matches ? "dark" : "light";
    }

    function actualizarBoton() {
        const boton = document.getElementById("btnTema");
        const oscuro = temaActual() === "dark";
        if (boton) {
            boton.textContent = oscuro ? "☀" : "☾"; // sol en oscuro, luna en claro
            boton.setAttribute("aria-pressed", String(oscuro));
            boton.setAttribute("aria-label", oscuro ? "Cambiar a modo claro" : "Cambiar a modo oscuro");
        }
        const meta = document.querySelector('meta[name="theme-color"]');
        if (meta) meta.setAttribute("content", oscuro ? "#17110d" : "#fbf5ec");
    }

    // 1) Aplicar el tema guardado de inmediato
    const guardado = leer();
    if (guardado) raiz.setAttribute("data-theme", guardado);

    // 2) Conectar el botón cuando exista el DOM
    function iniciar() {
        const boton = document.getElementById("btnTema");
        if (boton) {
            boton.addEventListener("click", function () {
                const nuevo = temaActual() === "dark" ? "light" : "dark";
                raiz.setAttribute("data-theme", nuevo);
                guardar(nuevo);
                actualizarBoton();
            });
        }
        actualizarBoton();
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", iniciar);
    } else {
        iniciar();
    }

    // 3) Si no hay elección guardada, seguir los cambios del sistema
    if (sistemaOscuro && sistemaOscuro.addEventListener) {
        sistemaOscuro.addEventListener("change", function () {
            if (!leer()) actualizarBoton();
        });
    }
})();
