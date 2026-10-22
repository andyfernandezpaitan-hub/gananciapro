"use strict";

/* Libro de Reclamaciones virtual de GananciaPro.
   No guarda ni envía nada por sí solo: genera la constancia (con número y fecha) y
   prepara un correo para el proveedor, con copia al consumidor. Todo el texto se
   inserta con textContent, nunca como HTML. */
(function () {
    const CORREO_PROVEEDOR = "paitan-andy@hotmail.com";
    const $ = (id) => document.getElementById(id);
    const form = $("formReclamo");
    if (!form) return;

    const limpiar = (t) => String(t || "").replace(/[\u0000-\u001f\u007f]+/g, " ").replace(/\s+/g, " ").trim();
    const largo = (t) => String(t || "").replace(/\r/g, "").replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, "").trim();

    function numero() {
        const d = new Date();
        const f = d.getFullYear() + String(d.getMonth() + 1).padStart(2, "0") + String(d.getDate()).padStart(2, "0");
        const azar = Array.from(crypto.getRandomValues(new Uint8Array(3)), (b) => b.toString(16).padStart(2, "0")).join("").toUpperCase();
        return "R-" + f + "-" + azar;
    }

    function error(texto) {
        const m = $("recMensaje");
        m.textContent = texto;
        m.dataset.tipo = texto ? "error" : "";
    }

    form.addEventListener("submit", (e) => {
        e.preventDefault();
        error("");

        const v = {
            nombre: limpiar($("recNombre").value),
            doc: limpiar($("recDoc").value),
            tel: limpiar($("recTel").value),
            dom: limpiar($("recDom").value),
            correo: limpiar($("recCorreo").value),
            monto: limpiar($("recMonto").value),
            servicio: limpiar($("recServicio").value),
            tipo: form.elements.tipo.value === "Queja" ? "Queja" : "Reclamo",
            detalle: largo($("recDetalle").value),
            pedido: largo($("recPedido").value)
        };

        if (v.nombre.length < 3) return error("Escribe tu nombre completo.");
        if (!/^(\d{8}|[A-Za-z0-9]{9,12})$/.test(v.doc)) return error("Escribe un DNI de 8 dígitos o un carné de extranjería válido.");
        if (v.dom.length < 5) return error("Escribe tu domicilio.");
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.correo)) return error("Escribe un correo válido.");
        if (!v.servicio) return error("Indica el servicio.");
        if (v.detalle.length < 10) return error("Cuéntanos con más detalle lo ocurrido.");
        if (v.pedido.length < 5) return error("Indica qué pides.");

        const fecha = new Date().toLocaleDateString("es-PE", { day: "2-digit", month: "2-digit", year: "numeric" });
        const filas = [
            ["N.º de reclamación", numero()],
            ["Fecha", fecha],
            ["Proveedor", "Andy Fernandez Paitan · DNI 60379954 · Mariana Mendiguren 153, Carabayllo, Lima"],
            ["Consumidor", v.nombre],
            ["Documento", v.doc],
            ["Domicilio", v.dom],
            ["Teléfono", v.tel || "—"],
            ["Correo", v.correo],
            ["Servicio contratado", v.servicio],
            ["Monto reclamado", v.monto || "—"],
            ["Tipo", v.tipo],
            ["Detalle", v.detalle],
            ["Pedido del consumidor", v.pedido]
        ];

        const lista = $("recDatos");
        lista.replaceChildren();
        for (const [k, val] of filas) {
            const dt = document.createElement("dt");
            const dd = document.createElement("dd");
            dt.textContent = k;
            dd.textContent = val;
            lista.append(dt, dd);
        }

        const cuerpo = filas.map(([k, val]) => k + ": " + val).join("\n") + "\n\nSolicito la atención de este " + v.tipo.toLowerCase() + ".";
        $("recEnviar").href = "mailto:" + CORREO_PROVEEDOR +
            "?cc=" + encodeURIComponent(v.correo) +
            "&subject=" + encodeURIComponent("Libro de Reclamaciones GananciaPro " + filas[0][1]) +
            "&body=" + encodeURIComponent(cuerpo);

        form.hidden = true;
        $("recConstancia").hidden = false;
        $("recConstancia").scrollIntoView({ block: "start" });
    });

    $("recImprimir").addEventListener("click", () => window.print());
    $("recNuevo").addEventListener("click", () => {
        form.reset();
        $("recServicio").value = "Suscripción a GananciaPro";
        $("recConstancia").hidden = true;
        form.hidden = false;
        $("recNombre").focus();
    });
})();
