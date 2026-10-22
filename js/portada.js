"use strict";

/* Portada pública de GananciaPro: movimiento al desplazarse.
   Solo cambia transform y opacidad. Si el visitante pidió menos movimiento,
   todo se muestra de inmediato y sin animación. */
(function () {
    const raiz = document.documentElement;
    const reducido = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const config = window.GANANCIAPRO_CONFIG || {};

    function $(id) { return document.getElementById(id); }

    /* Precio desde la configuración (si no hay, queda el texto de la página) */
    if (typeof config.PRECIO_LANDING === "string" && config.PRECIO_LANDING.trim()) {
        document.querySelectorAll("[data-precio]").forEach((el) => {
            el.textContent = config.PRECIO_LANDING.trim();
        });
    }

    /* Botones "Empezar gratis" / "Iniciar sesión": abren el formulario correspondiente */
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

    if (reducido || !("IntersectionObserver" in window)) return;

    /* Aparición una sola vez */
    raiz.classList.add("js-portada");
    const observador = new IntersectionObserver((entradas) => {
        entradas.forEach((entrada) => {
            if (entrada.isIntersecting) {
                entrada.target.classList.add("visible");
                observador.unobserve(entrada.target);
            }
        });
    }, { threshold: 0.15, rootMargin: "0px 0px -6% 0px" });
    document.querySelectorAll("[data-aparece]").forEach((el) => observador.observe(el));

    /* Escena de pasos y parallax leve, con un solo cálculo por fotograma */
    const escena = $("como");
    const numero = $("pasoNumero");
    const pasos = escena ? Array.from(escena.querySelectorAll("[data-paso]")) : [];
    const manchas = Array.from(document.querySelectorAll("[data-parallax]"));
    const pantallaAncha = window.matchMedia("(min-width: 860px)");
    let pendiente = false;
    let pasoActual = 0;

    function marcarPaso(n) {
        if (n === pasoActual) return;
        pasoActual = n;
        pasos.forEach((li) => li.setAttribute("data-activo", String(Number(li.dataset.paso) === n)));
        if (numero) numero.textContent = String(n);
    }

    function actualizar() {
        pendiente = false;
        const y = window.scrollY;

        if (y < 900) {
            manchas.forEach((el) => {
                el.style.transform = "translate3d(0," + (y * Number(el.dataset.parallax)).toFixed(1) + "px,0)";
            });
        }

        if (escena && pasos.length) {
            const activa = pantallaAncha.matches;
            escena.classList.toggle("escena-activa", activa);
            if (activa) {
                const caja = escena.getBoundingClientRect();
                const recorrido = caja.height - window.innerHeight;
                const avance = recorrido > 0 ? Math.min(Math.max(-caja.top / recorrido, 0), 0.999) : 0;
                marcarPaso(Math.floor(avance * pasos.length) + 1);
            } else {
                pasos.forEach((li) => li.removeAttribute("data-activo"));
                pasoActual = 0;
            }
        }
    }

    function pedir() {
        if (!pendiente) {
            pendiente = true;
            window.requestAnimationFrame(actualizar);
        }
    }

    window.addEventListener("scroll", pedir, { passive: true });
    window.addEventListener("resize", pedir);
    pantallaAncha.addEventListener("change", pedir);
    actualizar();
})();
