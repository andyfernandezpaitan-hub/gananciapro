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
            return new Intl.NumberFormat(window.GP_IDIOMA ? window.GP_IDIOMA.locale() : "es-PE", { style: "currency", currency: codigo }).format(valor);
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

    /* ----- Gráfico por día: barras (ingresos/gastos) o ganancia acumulada ----- */
    const grafico = { datos: null, mes: "", codigo: "", modo: "dia", rango: "mes", extra: [], claveExtra: "" };

    const localeActual = () => (window.GP_IDIOMA ? window.GP_IDIOMA.locale() : "es-PE");

    function monedaCorta(valor, codigo) {
        try {
            return new Intl.NumberFormat(localeActual(), { style: "currency", currency: codigo, notation: "compact", maximumFractionDigits: 1 }).format(valor);
        } catch (e) {
            return compacto(valor);
        }
    }

    function escala(min, max) {
        const rango = Math.max(max - min, 1e-9);
        const bruto = rango / 4;
        const mag = Math.pow(10, Math.floor(Math.log10(bruto)));
        const n = bruto / mag;
        const paso = (n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10) * mag;
        let lo = Math.floor(min / paso) * paso;
        let hi = Math.ceil(max / paso) * paso;
        if (hi === lo) hi = lo + paso;
        return { lo, hi, paso };
    }

    function barraPath(x, arriba, w, base) {
        const h = base - arriba;
        if (h <= 0.5) return "";
        const r = Math.min(4, w / 2, h);
        return "M" + x + " " + base + "V" + (arriba + r) + "Q" + x + " " + arriba + " " + (x + r) + " " + arriba +
            "H" + (x + w - r) + "Q" + (x + w) + " " + arriba + " " + (x + w) + " " + (arriba + r) + "V" + base + "Z";
    }

    const pad = (n) => String(n).padStart(2, "0");
    const iso = (d) => d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate());

    /* Ventana de fechas del gráfico largo: termina en el mes elegido (o en hoy si es el actual) */
    function ventanaLarga() {
        const [a, m] = grafico.mes.split("-").map(Number);
        const meses = grafico.rango === "12m" ? 12 : 3;
        const desde = new Date(a, m - meses, 1);
        let hasta = new Date(a, m, 0);
        const hoy = new Date();
        if (hasta > hoy) hasta = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());
        return { desde, hasta };
    }

    function itemsLargos() {
        const { desde, hasta } = ventanaLarga();
        const porFecha = new Map();
        for (const f of grafico.extra || []) {
            porFecha.set(String(f.fecha).slice(0, 10), { ing: Number(f.ingresos || 0), gas: Number(f.gastos || 0) });
        }
        const items = [];
        const loc = localeActual();
        const mensual = grafico.rango === "12m";
        let ini = new Date(desde);
        while (ini <= hasta) {
            let fin;
            if (mensual) fin = new Date(ini.getFullYear(), ini.getMonth() + 1, 0);
            else { fin = new Date(ini); fin.setDate(fin.getDate() + 6); }
            if (fin > hasta) fin = new Date(hasta);
            let ing = 0, gas = 0;
            for (let d = new Date(ini); d <= fin; d.setDate(d.getDate() + 1)) {
                const f = porFecha.get(iso(d));
                if (f) { ing += f.ing; gas += f.gas; }
            }
            const etiqueta = mensual
                ? ini.toLocaleDateString(loc, { month: "short" })
                : ini.toLocaleDateString(loc, { day: "numeric", month: "short" });
            const titulo = mensual
                ? ini.toLocaleDateString(loc, { month: "long", year: "numeric" })
                : ini.toLocaleDateString(loc, { day: "numeric", month: "short" }) + " – " + fin.toLocaleDateString(loc, { day: "numeric", month: "short" });
            items.push({ fecha: new Date(ini), etiqueta, titulo, ing, gas, gan: ing - gas, acum: 0 });
            ini = mensual ? new Date(ini.getFullYear(), ini.getMonth() + 1, 1) : new Date(fin.getFullYear(), fin.getMonth(), fin.getDate() + 1);
        }
        let acum = 0;
        for (const it of items) { acum += it.gan; it.acum = acum; }
        return items;
    }

    /* Trae del servidor (o calcula aquí) los totales por día de un rango largo */
    async function cargarRangoLargo() {
        const { desde, hasta } = ventanaLarga();
        const clave = [grafico.mes, grafico.rango, grafico.codigo, usaServidor].join("|");
        if (grafico.claveExtra === clave) return;
        let filas = [];
        if (usaServidor) {
            try {
                filas = await window.Nube.resumenRango(iso(desde), iso(hasta), grafico.codigo);
            } catch (e) {
                filas = null;
            }
        }
        if (!usaServidor || filas === null) {
            if (!operaciones.length) operaciones = await window.Nube.listarOperaciones();
            const mapa = new Map();
            for (const o of operaciones) {
                if (o.moneda !== grafico.codigo) continue;
                const f = String(o.fecha).slice(0, 10);
                if (f < iso(desde) || f > iso(hasta)) continue;
                const x = mapa.get(f) || { fecha: f, ingresos: 0, gastos: 0 };
                x[o.tipo === "ingreso" ? "ingresos" : "gastos"] += Number(o.importe || 0);
                mapa.set(f, x);
            }
            filas = [...mapa.values()];
        }
        grafico.extra = filas;
        grafico.claveExtra = clave;
    }

    function itemsGrafico() {
        const [a, m] = grafico.mes.split("-").map(Number);
        const dias = new Date(a, m, 0).getDate();
        const ing = new Array(dias).fill(0);
        const gas = new Array(dias).fill(0);
        for (const f of grafico.datos || []) {
            const d = Number(f.dia) - 1;
            if (d >= 0 && d < dias) {
                ing[d] += Number(f.ingresos || 0);
                gas[d] += Number(f.gastos || 0);
            }
        }
        if (grafico.rango === "3m" || grafico.rango === "12m") return itemsLargos();
        let ini = 1, fin = dias;
        if (grafico.rango === "7") {
            fin = grafico.mes === mesActual() ? Math.min(dias, new Date().getDate()) : dias;
            ini = Math.max(1, fin - 6);
        }
        const items = [];
        let acum = 0;
        for (let d = ini; d <= fin; d++) {
            const g = ing[d - 1] - gas[d - 1];
            acum += g;
            items.push({ fecha: new Date(a, m - 1, d), ing: ing[d - 1], gas: gas[d - 1], gan: g, acum });
        }
        return items;
    }

    function leyendaGrafico() {
        const ley = $("grafLeyenda");
        ley.replaceChildren();
        const item = (clase, texto) => {
            const b = document.createElement("span");
            b.className = "ley-item";
            const punto = document.createElement("span");
            punto.className = "punto " + clase;
            b.append(punto, document.createTextNode(texto));
            ley.appendChild(b);
        };
        if (grafico.modo === "dia") {
            item("punto-ing", "Ingresos");
            item("punto-gas punto-rayas", "Gastos");
        } else {
            item("punto-gan", "Ganancia acumulada");
        }
    }

    function tablaGrafico(items) {
        const cuerpo = $("grafTablaCuerpo");
        cuerpo.replaceChildren();
        const f = (d) => d.toLocaleDateString(localeActual(), { day: "numeric", month: "short" });
        for (const it of items) {
            if (!it.ing && !it.gas) continue;
            const tr = document.createElement("tr");
            for (const t of [it.titulo || f(it.fecha), moneda(it.ing, grafico.codigo), moneda(it.gas, grafico.codigo), moneda(it.gan, grafico.codigo)]) {
                const td = document.createElement("td");
                td.textContent = t;
                tr.appendChild(td);
            }
            cuerpo.appendChild(tr);
        }
    }

    function dibujarGrafico() {
        if (!grafico.datos) return;
        const svg = $("grafLinea");
        const tip = $("grafTip");
        const ancho = Math.round(svg.parentElement.clientWidth);
        if (!ancho) return;

        svg.replaceChildren();
        tip.hidden = true;
        const items = itemsGrafico();
        const codigo = grafico.codigo;
        const acumulado = grafico.modo === "acum";
        $("grafTitulo").textContent = acumulado ? "Ganancia acumulada" : grafico.rango === "3m" ? "Ingresos y gastos por semana" : grafico.rango === "12m" ? "Ingresos y gastos por mes" : "Ingresos y gastos por día";
        // La ganancia acumulada se dibuja solo hasta hoy (no se inventan días futuros)
        const [ay, am] = grafico.mes.split("-").map(Number);
        const hoy = new Date();
        const ultimo = (hoy.getFullYear() === ay && hoy.getMonth() + 1 === am)
            ? items.reduce((k, it, i) => (it.fecha <= hoy ? i : k), 0)
            : items.length - 1;
        const W = Math.max(280, ancho), H = ancho < 420 ? 240 : 280;
        const der = 10, arr = 20, aba = 30;
        svg.setAttribute("viewBox", "0 0 " + W + " " + H);
        svg.setAttribute("aria-label", acumulado ? "Gráfico de la ganancia acumulada" : "Gráfico de ingresos y gastos por día");
        leyendaGrafico();
        tablaGrafico(items);

        const hayDatos = items.some((it) => it.ing || it.gas);
        const valores = acumulado ? items.map((it) => it.acum) : items.flatMap((it) => [it.ing, it.gas]);
        const { lo, hi, paso } = escala(Math.min(0, ...valores), Math.max(0, ...valores));
        const etiquetas = [];
        for (let v = lo; v <= hi + paso / 2; v += paso) etiquetas.push(monedaCorta(v, codigo));
        const izq = Math.ceil(Math.max(...etiquetas.map((t) => t.length)) * 6.4) + 16;
        const y = (v) => arr + ((hi - v) / (hi - lo)) * (H - arr - aba);
        const n = items.length;
        const banda = (W - izq - der) / n;
        const xc = (i) => izq + banda * (i + 0.5);

        const defs = el("defs", {});
        for (const [id, clase] of [["barIng", "ing"], ["barGas", "gas"], ["areaGan", "gan"]]) {
            const g = el("linearGradient", { id, x1: 0, y1: 0, x2: 0, y2: 1 });
            const arriba = id === "areaGan" ? "0.35" : "1";
            const abajo = id === "areaGan" ? "0" : "0.62";
            g.appendChild(el("stop", { offset: "0%", class: "parada-" + clase, "stop-opacity": arriba }));
            g.appendChild(el("stop", { offset: "100%", class: "parada-" + clase, "stop-opacity": abajo }));
            defs.appendChild(g);
        }
        const rayas = el("pattern", { id: "rayasGas", width: 6, height: 6, patternUnits: "userSpaceOnUse", patternTransform: "rotate(45)" });
        rayas.appendChild(el("rect", { width: 2.2, height: 6, class: "raya" }));
        defs.appendChild(rayas);
        svg.appendChild(defs);

        // Cuadrícula y eje Y
        for (let v = lo; v <= hi + paso / 2; v += paso) {
            svg.appendChild(el("line", { class: "eje" + (Math.abs(v) < paso / 1000 ? " eje-cero" : ""), x1: izq, x2: W - der, y1: y(v), y2: y(v) }));
            const t = el("text", { x: izq - 8, y: y(v) + 4, "text-anchor": "end" });
            t.textContent = monedaCorta(v, codigo);
            svg.appendChild(t);
        }

        // Eje X: fechas cortas, sin amontonarse
        const cada = Math.max(1, Math.ceil(54 / banda));
        const fechaCorta = (d) => d.toLocaleDateString(localeActual(), { day: "numeric", month: "short" });
        items.forEach((it, i) => {
            if (i % cada !== 0 && i !== n - 1) return;
            if (i !== 0 && i % cada !== 0 && (n - 1 - Math.floor((n - 1) / cada) * cada) < cada / 2) return;
            const t = el("text", { x: xc(i), y: H - 9, "text-anchor": "middle" });
            t.textContent = it.etiqueta || fechaCorta(it.fecha);
            svg.appendChild(t);
        });

        const banda_hover = el("rect", { class: "banda-hover", y: arr, height: H - arr - aba, width: banda, visibility: "hidden" });
        svg.appendChild(banda_hover);

        if (!hayDatos) {
            const t = el("text", { class: "grafico-vacio", x: (izq + W - der) / 2, y: (arr + H - aba) / 2, "text-anchor": "middle" });
            t.textContent = "Sin datos este mes.";
            svg.appendChild(t);
        } else if (!acumulado) {
            const bw = Math.max(3, Math.min(22, banda * 0.36));
            const base = y(0);
            let mayor = -1;
            items.forEach((it, i) => { if (it.ing > 0 && (mayor < 0 || it.ing > items[mayor].ing)) mayor = i; });
            items.forEach((it, i) => {
                const cx = xc(i);
                const grupo = el("g", { class: "barra-grupo" + (reducido ? "" : " crece"), style: "--i:" + Math.min(i, 30) });
                const dI = barraPath(cx - bw - 1, y(it.ing), bw, base);
                const dG = barraPath(cx + 1, y(it.gas), bw, base);
                if (dI) grupo.appendChild(el("path", { class: "barra barra-ing", fill: "url(#barIng)", d: dI }));
                if (dG) {
                    grupo.appendChild(el("path", { class: "barra barra-gas", fill: "url(#barGas)", d: dG }));
                    grupo.appendChild(el("path", { class: "barra-rayas", fill: "url(#rayasGas)", d: dG }));
                }
                svg.appendChild(grupo);
            });
            if (mayor >= 0 && n <= 31) {
                const t = el("text", { class: "etiqueta-max", x: xc(mayor) - bw / 2 - 1, y: y(items[mayor].ing) - 6, "text-anchor": "middle" });
                t.textContent = monedaCorta(items[mayor].ing, codigo);
                svg.appendChild(t);
            }
        } else {
            const pts = items.slice(0, ultimo + 1).map((it, i) => [xc(i), y(it.acum)]);
            const trazo = pts.map((q, i) => (i ? "L" : "M") + q[0].toFixed(1) + " " + q[1].toFixed(1)).join("");
            const cero = y(0);
            svg.appendChild(el("path", { class: "area-gan", fill: "url(#areaGan)", d: trazo + "L" + pts[pts.length - 1][0] + " " + cero + "L" + pts[0][0] + " " + cero + "Z" }));
            svg.appendChild(el("path", { class: "linea linea-gan" + (reducido ? "" : " dibuja"), d: trazo, pathLength: "1" }));
            const ult = pts[pts.length - 1];
            svg.appendChild(el("circle", { class: "punto-final", cx: ult[0], cy: ult[1], r: 5 }));
            const t = el("text", { class: "etiqueta-max", x: Math.min(ult[0], W - der - 24), y: ult[1] - 12, "text-anchor": "middle" });
            t.textContent = monedaCorta(items[pts.length - 1].acum, codigo);
            svg.appendChild(t);
        }

        // Detalle al pasar el cursor o tocar
        const lectura = $("grafLectura");
        const filaTip = (clase, etiqueta, valor) => {
            const f = document.createElement("div");
            f.className = "tip-fila";
            const e = document.createElement("span");
            if (clase) { const p = document.createElement("span"); p.className = "punto " + clase; e.appendChild(p); }
            e.appendChild(document.createTextNode(etiqueta));
            const v = document.createElement("strong");
            v.textContent = valor;
            f.append(e, v);
            return f;
        };

        function mostrar(clientX) {
            const r = svg.getBoundingClientRect();
            if (!r.width) return;
            const px = ((clientX - r.left) / r.width) * W;
            const i = Math.min(n - 1, Math.max(0, Math.floor((px - izq) / banda)));
            const it = items[i];
            banda_hover.setAttribute("x", izq + banda * i);
            banda_hover.setAttribute("visibility", "visible");

            tip.replaceChildren();
            const titulo = document.createElement("p");
            titulo.className = "tip-titulo";
            titulo.textContent = it.titulo || it.fecha.toLocaleDateString(localeActual(), { weekday: "short", day: "numeric", month: "short" });
            tip.append(titulo, filaTip("punto-ing", "Ingresos", moneda(it.ing, codigo)), filaTip("punto-gas punto-rayas", "Gastos", moneda(it.gas, codigo)), filaTip("", "Ganancia", moneda(it.gan, codigo)));
            if (acumulado) tip.appendChild(filaTip("punto-gan", "Ganancia acumulada", moneda(it.acum, codigo)));
            tip.hidden = false;

            const escalaPx = r.width / W;
            const ancho_tip = tip.offsetWidth;
            let izqPx = xc(i) * escalaPx - ancho_tip / 2;
            izqPx = Math.max(4, Math.min(r.width - ancho_tip - 4, izqPx));
            tip.style.left = izqPx + "px";
            tip.style.top = "6px";
            lectura.textContent = titulo.textContent + ": " + moneda(it.ing, codigo) + " / " + moneda(it.gas, codigo);
        }
        function ocultar() {
            banda_hover.setAttribute("visibility", "hidden");
            tip.hidden = true;
        }
        svg.onpointermove = (e) => mostrar(e.clientX);
        svg.onpointerdown = (e) => mostrar(e.clientX);
        svg.onpointerleave = ocultar;
    }

    function dibujarLinea(porDia, mes, codigo) {
        grafico.datos = porDia;
        grafico.mes = mes;
        grafico.codigo = codigo;
        if (grafico.rango === "3m" || grafico.rango === "12m") {
            cargarRangoLargo().then(dibujarGrafico).catch(() => { grafico.rango = "mes"; dibujarGrafico(); });
        } else {
            dibujarGrafico();
        }
    }

    function iniciarControlesGrafico() {
        for (const b of document.querySelectorAll("[data-graf-modo], [data-graf-rango]")) {
            b.addEventListener("click", () => {
                if (b.dataset.grafModo) grafico.modo = b.dataset.grafModo;
                if (b.dataset.grafRango) grafico.rango = b.dataset.grafRango;
                for (const o of document.querySelectorAll("[data-graf-modo], [data-graf-rango]")) {
                    const activo = o.dataset.grafModo ? o.dataset.grafModo === grafico.modo : o.dataset.grafRango === grafico.rango;
                    o.setAttribute("aria-pressed", String(activo));
                }
                if (grafico.rango === "3m" || grafico.rango === "12m") {
                    cargarRangoLargo().then(dibujarGrafico).catch(() => dibujarGrafico());
                } else {
                    dibujarGrafico();
                }
            });
        }
        if (window.ResizeObserver) {
            let anterior = 0;
            new ResizeObserver(() => {
                const w = $("grafLinea").parentElement.clientWidth;
                if (w && Math.abs(w - anterior) > 2) { anterior = w; dibujarGrafico(); }
            }).observe($("grafLinea").parentElement);
        }
        document.addEventListener("gp-idioma", dibujarGrafico);
    }
    iniciarControlesGrafico();

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

        const anillo = $("anilloMargen");
        if (anillo) {
            const pct = ingresos > 0 ? Math.max(0, Math.min(100, (ganancia / ingresos) * 100)) : 0;
            anillo.style.setProperty("--pct", pct.toFixed(1));
        }

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
