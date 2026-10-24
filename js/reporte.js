/* Reporte mensual: se arma en pantalla oculta y se guarda como PDF con la impresión del navegador.
   Todo el texto entra con textContent (nada de innerHTML). No usa librerías ni servicios externos. */
(function () {
    "use strict";

    const $ = (id) => document.getElementById(id);
    const contenedor = $("reporteImpresion");
    const entrada = $("reporteMes");
    const boton = $("btnReporte");
    const mensaje = $("mensajeReporte");
    if (!contenedor || !entrada || !boton) return;

    function mesActual() {
        const ahora = new Date();
        return `${ahora.getFullYear()}-${String(ahora.getMonth() + 1).padStart(2, "0")}`;
    }

    entrada.value = mesActual();
    entrada.max = mesActual();

    function dinero(importe, moneda) {
        try {
            return new Intl.NumberFormat("es-PE", { style: "currency", currency: moneda }).format(importe);
        } catch (e) {
            return `${moneda} ${importe.toFixed(2)}`;
        }
    }

    function el(etiqueta, texto, clase) {
        const nodo = document.createElement(etiqueta);
        if (texto !== undefined) nodo.textContent = texto;
        if (clase) nodo.className = clase;
        return nodo;
    }

    function fila(...celdas) {
        const tr = document.createElement("tr");
        for (const c of celdas) {
            const td = el(c.cabecera ? "th" : "td", c.texto, c.clase);
            if (c.cabecera) td.scope = "col";
            tr.appendChild(td);
        }
        return tr;
    }

    function tabla(titulo, cabecera, filas) {
        const t = el("table", undefined, "rep-tabla");
        t.appendChild(el("caption", titulo));
        const cab = document.createElement("thead");
        cab.appendChild(fila(...cabecera.map((texto, i) => ({ texto, cabecera: true, clase: i === cabecera.length - 1 ? "num" : "" }))));
        t.appendChild(cab);
        const cuerpo = document.createElement("tbody");
        for (const f of filas) cuerpo.appendChild(f);
        t.appendChild(cuerpo);
        return t;
    }

    function construir(mes) {
        const ops = window.GananciaApp.listar()
            .filter((o) => typeof o.fecha === "string" && o.fecha.startsWith(mes))
            .sort((a, b) => a.fecha.localeCompare(b.fecha));

        const [anio, nMes] = mes.split("-").map(Number);
        const nombreMes = new Intl.DateTimeFormat("es-PE", { month: "long", year: "numeric" })
            .format(new Date(anio, nMes - 1, 1));

        contenedor.replaceChildren();
        contenedor.appendChild(el("h1", `Reporte de ${nombreMes}`));
        contenedor.appendChild(el("p", `GananciaPro · generado el ${new Date().toLocaleDateString("es-PE")}`, "rep-nota"));

        if (!ops.length) {
            contenedor.appendChild(el("p", "No hay operaciones en este mes."));
            return 0;
        }

        const monedas = [...new Set(ops.map((o) => o.moneda))].sort();
        for (const moneda of monedas) {
            const delaMoneda = ops.filter((o) => o.moneda === moneda);
            const ingresos = delaMoneda.filter((o) => o.tipo === "ingreso").reduce((s, o) => s + o.importe, 0);
            const gastos = delaMoneda.filter((o) => o.tipo !== "ingreso").reduce((s, o) => s + o.importe, 0);

            contenedor.appendChild(tabla(`Resumen en ${moneda}`, ["Concepto", "Importe"], [
                fila({ texto: "Ingresos" }, { texto: dinero(ingresos, moneda), clase: "num" }),
                fila({ texto: "Gastos" }, { texto: dinero(gastos, moneda), clase: "num" }),
                fila({ texto: "Ganancia" }, { texto: dinero(ingresos - gastos, moneda), clase: "num rep-total" })
            ]));

            const porCategoria = new Map();
            for (const o of delaMoneda.filter((x) => x.tipo !== "ingreso")) {
                const cat = o.categoria || "Sin categoría";
                porCategoria.set(cat, (porCategoria.get(cat) || 0) + o.importe);
            }
            if (porCategoria.size) {
                const filas = [...porCategoria.entries()].sort((a, b) => b[1] - a[1])
                    .map(([cat, total]) => fila({ texto: cat }, { texto: dinero(total, moneda), clase: "num" }));
                contenedor.appendChild(tabla(`Gastos por categoría (${moneda})`, ["Categoría", "Total"], filas));
            }
        }

        const detalle = ops.map((o) => fila(
            { texto: o.fecha.split("-").reverse().join("/") },
            { texto: o.tipo === "ingreso" ? "Ingreso" : "Gasto" },
            { texto: o.descripcion + (o.categoria ? ` (${o.categoria})` : "") },
            { texto: (o.tipo === "ingreso" ? "" : "− ") + dinero(o.importe, o.moneda), clase: "num" }
        ));
        contenedor.appendChild(tabla("Detalle de operaciones", ["Fecha", "Tipo", "Descripción", "Importe"], detalle));
        return ops.length;
    }

    boton.addEventListener("click", () => {
        mensaje.textContent = "";
        if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(entrada.value)) {
            mensaje.textContent = "Elige un mes válido.";
            return;
        }
        const cantidad = construir(entrada.value);
        if (!cantidad) {
            mensaje.textContent = "No hay operaciones en ese mes.";
            return;
        }
        mensaje.textContent = "En la ventana de impresión elige «Guardar como PDF».";
        document.body.classList.add("imprimiendo-reporte");
        window.print();
    });

    window.addEventListener("afterprint", () => {
        document.body.classList.remove("imprimiendo-reporte");
        contenedor.replaceChildren();
    });
})();
