"use strict";

/* Panel de GananciaPro: tarjetas y gráficos del mes.
   Solo lee datos de la cuenta (no escribe nada). Gráficos en SVG propio. */
(function () {
    const $ = (id) => document.getElementById(id);
    const NS = "http://www.w3.org/2000/svg";
    const navPanel = $("navPanel");
    if (!navPanel || !window.Nube) return;

    const reducido = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let operaciones = [];
    let productos = [];
    let monedas = [];
    let usaServidor = false;
    let cargando = false;
    let pedido = 0;

    function moneda(valor, codigo) {
        try {
            return new Intl.NumberFormat("es-PE", { style: "currency", currency: codigo }).format(valor);
        } catch (e) {
            return valor.toFixed(2) + " " + codigo;
        }
    }

    function compacto(valor) {
        return new Intl.NumberFormat("es-PE", { notation: "compact", maximumFractionDigits: 1 }).format(valor);
    }

    function mesActual() {
        const d = new Date();
        return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0");
    }

    function mesAnterior(mes) {
        const [a, m] = mes.split("-").map(Number);
        const d = new Date(a, m - 2, 1);
        return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0");
    }

    function del(mes, codigo) {
        return operaciones.filter((o) => o.moneda === codigo && String(o.fecha).slice(0, 7) === mes);
    }

    function sumar(lista, tipo) {
        return lista.filter((o) => o.tipo === tipo).reduce((t, o) => t + Number(o.importe || 0), 0);
    }

    function delta(el, actual, previo, invertir) {
        el.removeAttribute("data-signo");
        if (!previo) {
            el.textContent = actual ? "Sin mes anterior para comparar" : "";
            return;
        }
        const p = ((actual - previo) / previo) * 100;
        const signo = p > 0 ? "+" : "";
        el.textContent = signo + p.toFixed(0) + "% frente al mes anterior";
        if (Math.abs(p) >= 1) {
            const sube = p > 0;
            el.setAttribute("data-signo", (sube !== Boolean(invertir)) ? "bien" : "mal");
        }
    }

    function el(tag, attrs) {
        const nodo = document.createElementNS(NS, tag);
        for (const k in attrs) nodo.setAttribute(k, attrs[k]);
        return nodo;
    }

    /* ----- Gráfico de líneas por día ----- */
    function dibujarLinea(porDia, mes, codigo) {
        const svg = $("grafLinea");
        svg.replaceChildren();
        const [a, m] = mes.split("-").map(Number);
        const dias = new Date(a, m, 0).getDate();
        const ing = new Array(dias).fill(0);
        const gas = new Array(dias).fill(0);
        for (const f of porDia) {
            const dia = Number(f.dia) - 1;
            if (dia >= 0 && dia < dias) {
                ing[dia] += Number(f.ingresos || 0);
                gas[dia] += Number(f.gastos || 0);
            }
        }

        const W = 640, H = 240, izq = 46, der = 12, arr = 12, aba = 28;
        const maximo = Math.max(1, ...ing, ...gas);
        const x = (i) => izq + (dias === 1 ? 0 : (i / (dias - 1)) * (W - izq - der));
        const y = (v) => arr + (1 - v / maximo) * (H - arr - aba);

        for (let k = 0; k <= 4; k++) {
            const v = (maximo / 4) * k;
            svg.appendChild(el("line", { class: "eje", x1: izq, x2: W - der, y1: y(v), y2: y(v) }));
            const t = el("text", { x: izq - 6, y: y(v) + 4, "text-anchor": "end" });
            t.textContent = compacto(v);
            svg.appendChild(t);
        }
        for (const d of [1, Math.ceil(dias / 2), dias]) {
            const t = el("text", { x: x(d - 1), y: H - 8, "text-anchor": "middle" });
            t.textContent = String(d);
            svg.appendChild(t);
        }

        const trazo = (serie) => serie.map((v, i) => (i ? "L" : "M") + x(i).toFixed(1) + " " + y(v).toFixed(1)).join("");
        svg.appendChild(el("path", { class: "area-ing", d: trazo(ing) + "L" + x(dias - 1) + " " + y(0) + "L" + x(0) + " " + y(0) + "Z" }));
        for (const [clase, serie] of [["linea-gas", gas], ["linea-ing", ing]]) {
            const p = el("path", { class: "linea " + clase + (reducido ? "" : " dibuja"), d: trazo(serie), pathLength: "1" });
            svg.appendChild(p);
        }

        const guia = el("line", { class: "guia", y1: arr, y2: H - aba, visibility: "hidden" });
        svg.appendChild(guia);
        const lectura = $("grafLectura");

        function mostrar(clientX) {
            const r = svg.getBoundingClientRect();
            if (!r.width) return;
            const px = ((clientX - r.left) / r.width) * W;
            const i = Math.min(dias - 1, Math.max(0, Math.round(((px - izq) / (W - izq - der)) * (dias - 1))));
            guia.setAttribute("x1", x(i));
            guia.setAttribute("x2", x(i));
            guia.setAttribute("visibility", "visible");
            lectura.textContent = "Día " + (i + 1) + ": ingresos " + moneda(ing[i], codigo) + " · gastos " + moneda(gas[i], codigo);
        }
        svg.onpointermove = (e) => mostrar(e.clientX);
        svg.onpointerleave = () => {
            guia.setAttribute("visibility", "hidden");
            lectura.textContent = "Pasa el cursor por el gráfico para ver cada día.";
        };
    }

    /* ----- Barras horizontales ----- */
    function barras(ul, filas, formato) {
        ul.replaceChildren();
        if (!filas.length) {
            const li = document.createElement("li");
            li.className = "vacio";
            li.textContent = "Sin datos este mes.";
            ul.appendChild(li);
            return;
        }
        const max = Math.max(...filas.map((f) => f.valor), 1);
        const rellenos = [];
        for (const f of filas) {
            const li = document.createElement("li");
            const fila = document.createElement("div");
            fila.className = "fila";
            const a = document.createElement("span");
            a.textContent = f.nombre;
            const b = document.createElement("span");
            b.textContent = formato(f.valor);
            fila.append(a, b);
            const pista = document.createElement("div");
            pista.className = "pista";
            const relleno = document.createElement("div");
            relleno.className = "relleno";
            pista.appendChild(relleno);
            li.append(fila, pista);
            ul.appendChild(li);
            rellenos.push([relleno, f.valor / max]);
        }
        const aplicar = () => rellenos.forEach(([r, p]) => r.style.setProperty("--p", p.toFixed(3)));
        if (reducido) aplicar(); else requestAnimationFrame(() => requestAnimationFrame(aplicar));
    }

    function top(lista, tipo) {
        const mapa = new Map();
        for (const o of lista) {
            if (o.tipo !== tipo) continue;
            const nombre = String(o.descripcion || "").trim() || "Sin descripción";
            mapa.set(nombre, (mapa.get(nombre) || 0) + Number(o.importe || 0));
        }
        return [...mapa].map(([nombre, valor]) => ({ nombre, valor })).sort((p, q) => q.valor - p.valor).slice(0, 5);
    }

    /* ----- Resumen: lo calcula la base de datos; si aún no está instalada, se calcula aquí ----- */
    function resumenLocal(mes, codigo) {
        const lista = del(mes, codigo);
        const antes = del(mesAnterior(mes), codigo);
        const dias = new Map();
        for (const o of lista) {
            const d = Number(String(o.fecha).slice(8, 10));
            const f = dias.get(d) || { dia: d, ingresos: 0, gastos: 0 };
            f[o.tipo === "ingreso" ? "ingresos" : "gastos"] += Number(o.importe || 0);
            dias.set(d, f);
        }
        const resumir = (l) => ({ ingresos: sumar(l, "ingreso"), gastos: sumar(l, "gasto"), operaciones: l.length });
        return {
            actual: resumir(lista),
            previo: resumir(antes),
            dias: [...dias.values()],
            top_gastos: top(lista, "gasto"),
            top_ingresos: top(lista, "ingreso")
        };
    }

    async function obtenerResumen(mes, codigo) {
        if (usaServidor) {
            try {
                return await window.Nube.resumenPanel(mes, codigo);
            } catch (e) {
                usaServidor = false;
            }
        }
        if (!operaciones.length) {
            operaciones = await window.Nube.listarOperaciones();
        }
        return resumenLocal(mes, codigo);
    }

    /* ----- Pintar todo ----- */
    async function pintar() {
        const selMes = $("tabMes");
        const selMon = $("tabMoneda");
        const mes = selMes.value || mesActual();
        const usadas = monedas.length ? monedas : [...new Set(operaciones.map((o) => o.moneda))].sort();
        const previa = selMon.value;
        selMon.replaceChildren();
        for (const c of (usadas.length ? usadas : ["PEN"])) {
            const op = document.createElement("option");
            op.value = c;
            op.textContent = c;
            selMon.appendChild(op);
        }
        selMon.value = usadas.includes(previa) ? previa : selMon.options[0].value;
        const codigo = selMon.value;

        const mio = ++pedido;
        let datos;
        try {
            datos = await obtenerResumen(mes, codigo);
        } catch (e) {
            $("tabMensaje").textContent = "No se pudo cargar el panel. Revisa tu conexión e inténtalo de nuevo.";
            return;
        }
        if (mio !== pedido) return;

        const ingresos = Number(datos.actual.ingresos);
        const gastos = Number(datos.actual.gastos);
        const cuantas = Number(datos.actual.operaciones);
        const ganancia = ingresos - gastos;

        $("kpiIngresos").textContent = moneda(ingresos, codigo);
        $("kpiGastos").textContent = moneda(gastos, codigo);
        $("kpiGanancia").textContent = moneda(ganancia, codigo);
        $("kpiOps").textContent = String(cuantas);
        delta($("kpiIngresosD"), ingresos, Number(datos.previo.ingresos), false);
        delta($("kpiGastosD"), gastos, Number(datos.previo.gastos), true);
        delta($("kpiOpsD"), cuantas, Number(datos.previo.operaciones), false);
        const margen = $("kpiMargen");
        margen.removeAttribute("data-signo");
        margen.textContent = ingresos > 0 ? "Margen " + ((ganancia / ingresos) * 100).toFixed(0) + "%" : "";
        if (ingresos > 0) margen.setAttribute("data-signo", ganancia >= 0 ? "bien" : "mal");

        dibujarLinea(datos.dias, mes, codigo);
        barras($("topGastos"), datos.top_gastos.map((f) => ({ nombre: f.nombre || "Sin descripción", valor: Number(f.valor) })), (v) => moneda(v, codigo));
        barras($("topIngresos"), datos.top_ingresos.map((f) => ({ nombre: f.nombre || "Sin descripción", valor: Number(f.valor) })), (v) => moneda(v, codigo));
        $("topGastos").dataset.tipo = "gasto";
        $("topIngresos").dataset.tipo = "ingreso";

        const bajos = productos
            .filter((p) => p.activo !== false && Number(p.stock) <= 5)
            .sort((p, q) => Number(p.stock) - Number(q.stock))
            .slice(0, 6);
        const ul = $("stockBajo");
        ul.dataset.tipo = "stock";
        if (!bajos.length) {
            ul.replaceChildren();
            const li = document.createElement("li");
            li.className = "vacio";
            li.textContent = "Todo en orden: ningún producto con 5 unidades o menos.";
            ul.appendChild(li);
        } else {
            barras(ul, bajos.map((p) => ({
                nombre: [p.nombre, p.talla, p.color].filter(Boolean).join(" · "),
                valor: 6 - Math.min(5, Math.max(0, Math.round(Number(p.stock))))
            })), () => "");
            ul.querySelectorAll(".fila span:last-child").forEach((s, i) => {
                s.textContent = bajos[i] ? bajos[i].stock + " u." : "";
            });
        }
    }

    async function cargar() {
        if (cargando) return;
        cargando = true;
        const msg = $("tabMensaje");
        msg.textContent = "Cargando…";
        try {
            operaciones = [];
            monedas = [];
            usaServidor = false;

            const prods = window.Nube.listarProductos().catch(() => []);
            try {
                monedas = await window.Nube.monedasPanel();
                usaServidor = true;
            } catch (e) {
                /* La función de la base de datos aún no está instalada: se calcula aquí */
                operaciones = await window.Nube.listarOperaciones();
            }
            productos = await prods;
            if (!Array.isArray(productos)) productos = [];

            const hay = usaServidor ? monedas.length > 0 : operaciones.length > 0;
            msg.textContent = hay ? "" : "Aún no hay operaciones. Registra la primera en Finanzas.";
            await pintar();
        } catch (e) {
            msg.textContent = "No se pudo cargar el panel. Revisa tu conexión e inténtalo de nuevo.";
        } finally {
            cargando = false;
        }
    }

    function irAPanel() {
        document.body.dataset.vista = "panel";
        for (const id of ["navFinanzas", "navAlmacen", "navPanel"]) {
            $(id).setAttribute("aria-selected", String(id === "navPanel"));
        }
        if (!$("tabMes").value) $("tabMes").value = mesActual();
        cargar();
    }

    navPanel.addEventListener("click", irAPanel);
    for (const id of ["navFinanzas", "navAlmacen"]) {
        $(id).addEventListener("click", () => navPanel.setAttribute("aria-selected", "false"));
    }
    $("tabMes").addEventListener("change", pintar);
    $("tabMoneda").addEventListener("change", pintar);
})();
