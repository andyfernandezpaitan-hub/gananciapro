"use strict";

/* Almacén: categorías, productos y movimientos de stock.
   Todo se guarda en la cuenta del cliente (window.Nube). Solo se usa textContent. */
(function () {
    const $ = (id) => document.getElementById(id);
    const Nube = window.Nube;

    if (!Nube || !$("almacen")) return;

    const STOCK_BAJO = 3;
    const PASO_FILAS = 50;

    const TIPOS = {
        entrada: { texto: "Entrada", suma: true },
        perdida: { texto: "Pérdida", suma: false },
        dano: { texto: "Daño", suma: false },
        uso_interno: { texto: "Uso interno", suma: false },
        ajuste_positivo: { texto: "Ajuste +", suma: true },
        ajuste_negativo: { texto: "Ajuste −", suma: false }
    };

    let categorias = [];
    let productos = [];
    let cargado = false;
    let limiteFilas = PASO_FILAS;
    let productoEnEdicion = null;
    let productoEnMovimiento = null;
    let movimientos = [];
    let hayMasMovimientos = false;
    const PASO_MOV = 50;
    const TIPOS_HIST = { ...TIPOS, venta: { texto: "Venta", suma: false } };

    const entero = new Intl.NumberFormat("es-PE");

    /* Cada categoría tiene siempre el mismo color (según su nombre) */
    function tonoCategoria(nombre) {
        let suma = 0;
        for (const letra of nombre.trim().toLowerCase()) suma = (suma * 31 + letra.charCodeAt(0)) % 360;
        return suma;
    }

    /* Ilustración decorativa (definida en index.html como <symbol>) */
    function ilustracion(id) {
        const NS = "http://www.w3.org/2000/svg";
        const svg = document.createElementNS(NS, "svg");
        const uso = document.createElementNS(NS, "use");

        svg.setAttribute("class", "ilustracion ilu-vacio");
        svg.setAttribute("aria-hidden", "true");
        svg.setAttribute("focusable", "false");
        uso.setAttribute("href", `#${id}`);
        svg.append(uso);
        return svg;
    }

    /* El servidor es quien manda; esto solo evita botones que fallarían */
    const puedeEscribir = () => window.GP_ACCESO?.acceso !== false;
    const AVISO_SIN_ACCESO = "Tu prueba terminó o tu suscripción no está activa. Puedes ver y descargar tus datos.";

    function nombreCategoria(id) {
        return categorias.find((categoria) => categoria.id === id)?.nombre || "Sin categoría";
    }

    function estadoStock(producto) {
        if (producto.stock === 0) return "agotado";
        if (producto.stock <= STOCK_BAJO) return "poco";
        return "ok";
    }

    function sinTildes(texto) {
        return String(texto ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
    }

    function decir(texto, tipo) {
        const mensaje = $("mensajeAlmacen");
        mensaje.textContent = texto;
        mensaje.dataset.tipo = tipo || "info";
    }

    /* ----- Navegación Finanzas / Almacén ----- */
    function irA(vista) {
        document.body.dataset.vista = vista;
        $("navFinanzas").setAttribute("aria-selected", String(vista === "finanzas"));
        $("navAlmacen").setAttribute("aria-selected", String(vista === "almacen"));

        if (vista === "almacen" && !cargado) cargar();
    }

    $("navFinanzas").addEventListener("click", () => irA("finanzas"));
    $("navAlmacen").addEventListener("click", () => irA("almacen"));

    /* ----- Carga ----- */
    async function cargar() {
        decir("Cargando almacén…", "info");

        try {
            [categorias, productos] = await Promise.all([
                Nube.listarCategorias(),
                Nube.listarProductos()
            ]);
            cargado = true;
            decir("", "info");
            pintar();
            cargarMovimientos(true);
        } catch (error) {
            cargado = false;
            decir(error.message, "error");
        }
    }

    /* ----- Dibujo ----- */
    function pintarFiltroCategorias() {
        const select = $("almCategoria");
        const actual = select.value;
        const opciones = [new Option("Todas", ""), new Option("Sin categoría", "__ninguna")];

        for (const categoria of categorias) {
            opciones.push(new Option(categoria.nombre + (categoria.activa ? "" : " (inactiva)"), categoria.id));
        }

        select.replaceChildren(...opciones);
        select.value = [...select.options].some((o) => o.value === actual) ? actual : "";

        $("listaCategorias").replaceChildren(
            ...categorias.map((categoria) => new Option(categoria.nombre))
        );
    }

    function pasaFiltros(producto) {
        const texto = sinTildes($("almBusqueda").value.trim());
        const categoria = $("almCategoria").value;
        const estado = $("almEstado").value;

        if (texto) {
            const pajar = sinTildes(
                `${producto.nombre} ${producto.talla} ${producto.color} ${producto.codigo || ""}`
            );
            if (!pajar.includes(texto)) return false;
        }

        if (categoria === "__ninguna" && producto.categoria_id) return false;
        if (categoria && categoria !== "__ninguna" && producto.categoria_id !== categoria) return false;

        if (estado === "inactivos") return !producto.activo;
        if (estado === "todos") return true;
        if (!producto.activo) return false;
        if (estado === "poco") return estadoStock(producto) === "poco";
        if (estado === "agotados") return estadoStock(producto) === "agotado";
        return true;
    }

    function pintarFiltroProductos() {
        const select = $("histProducto");
        const actual = select.value;
        const opciones = [new Option("Todos", "")];

        for (const producto of productos) {
            const etiqueta = [producto.nombre, producto.talla && `T. ${producto.talla}`, producto.color]
                .filter(Boolean).join(" · ");
            opciones.push(new Option(etiqueta + (producto.activo ? "" : " (inactivo)"), producto.id));
        }

        select.replaceChildren(...opciones);
        select.value = [...select.options].some((o) => o.value === actual) ? actual : "";
    }

    function pintarResumen() {
        const activos = productos.filter((producto) => producto.activo);

        $("almProductos").textContent = entero.format(activos.length);
        $("almUnidades").textContent = entero.format(activos.reduce((suma, p) => suma + p.stock, 0));
        $("almPoco").textContent = entero.format(activos.filter((p) => estadoStock(p) === "poco").length);
        $("almAgotados").textContent = entero.format(activos.filter((p) => estadoStock(p) === "agotado").length);
    }

    function boton(texto, clase, alHacerClic, etiquetaAria) {
        const elemento = document.createElement("button");
        elemento.type = "button";
        elemento.className = clase;
        elemento.textContent = texto;
        if (etiquetaAria) elemento.setAttribute("aria-label", etiquetaAria);
        elemento.addEventListener("click", alHacerClic);
        return elemento;
    }

    const gruposAbiertos = new Set();

    /* La ropa siempre se muestra por tallas (desplegable), aunque tenga una sola */
    function productoEsRopa(producto) {
        return Boolean(producto.categoria_id) &&
            /\bropa\b/.test(sinTildes(nombreCategoria(producto.categoria_id)));
    }

    const CATEGORIAS_SUGERIDAS = ["Ropa", "Zapatos", "Accesorios"];

    function pintarChipsCategoria() {
        const cont = $("chipsCategoria");
        const nombres = categorias.map((c) => c.nombre);
        for (const sugerida of CATEGORIAS_SUGERIDAS) {
            if (!nombres.some((n) => sinTildes(n).trim() === sinTildes(sugerida))) nombres.push(sugerida);
        }
        cont.replaceChildren(...nombres.map((nombre) => {
            const chip = document.createElement("button");
            chip.type = "button";
            chip.className = "chip-cat chip-elegir";
            chip.textContent = nombre;
            chip.style.setProperty("--h", String(tonoCategoria(nombre)));
            chip.addEventListener("click", () => {
                $("prodCategoria").value = nombre;
                actualizarModoTallas();
                $("prodCategoria").dispatchEvent(new Event("input"));
            });
            return chip;
        }));
    }

    /* Orden natural de tallas: números de menor a mayor (2, 4, 6… 16) y luego letras (XS, S, M, L, XL…) */
    const ORDEN_LETRAS = ["xxs", "xs", "s", "m", "l", "xl", "xxl", "xxxl"];

    function ordenTalla(talla) {
        const t = sinTildes(talla).trim();
        if (!t) return [3, 0, ""];
        const numero = parseFloat(t.replace(",", "."));
        if (!Number.isNaN(numero)) return [0, numero, t];
        const i = ORDEN_LETRAS.indexOf(t);
        return i >= 0 ? [1, i, t] : [2, 0, t];
    }

    function compararVariantes(a, b) {
        const colorA = sinTildes(a.color), colorB = sinTildes(b.color);
        if (colorA !== colorB) return colorA < colorB ? -1 : 1;
        const x = ordenTalla(a.talla), y = ordenTalla(b.talla);
        for (let k = 0; k < 3; k++) {
            if (x[k] !== y[k]) return x[k] < y[k] ? -1 : 1;
        }
        return 0;
    }

    function pintar() {
        $("btnNuevoProducto").disabled = !puedeEscribir();
        $("btnVenta").disabled = !puedeEscribir();
        pintarFiltroCategorias();
        pintarFiltroProductos();
        pintarResumen();

        const lista = $("listaProductos");
        lista.replaceChildren();

        if (productos.length === 0) {
            const vacio = document.createElement("li");
            vacio.className = "vacio";
            const mensaje = document.createElement("p");
            mensaje.textContent = "Aún no tienes productos. Crea el primero con «Nuevo producto».";
            vacio.append(ilustracion("ilu-cajas"), mensaje);
            lista.appendChild(vacio);
            $("contadorAlmacen").textContent = "";
            return;
        }

        const visibles = productos.filter(pasaFiltros);
        const mostrados = visibles.slice(0, limiteFilas);

        $("contadorAlmacen").textContent =
            `Mostrando ${mostrados.length} de ${visibles.length} ${visibles.length === 1 ? "producto" : "productos"}.`;

        if (visibles.length === 0) {
            const vacio = document.createElement("li");
            vacio.className = "vacio";
            vacio.textContent = "Ningún producto coincide con los filtros.";
            lista.appendChild(vacio);
            return;
        }

        function filaProducto(producto, enGrupo) {
            const fila = document.createElement("li");
            const info = document.createElement("div");
            const titulo = document.createElement("strong");
            const detalle = document.createElement("span");
            const insignia = document.createElement("span");
            const acciones = document.createElement("div");
            const estado = estadoStock(producto);

            fila.className = producto.activo ? "" : "inactivo";
            fila.dataset.estado = estado;

            info.className = "prod-info";
            if (enGrupo) {
                titulo.textContent = [producto.talla && `Talla ${producto.talla}`, producto.color]
                    .filter(Boolean).join(" · ") || "Única";
                detalle.textContent = producto.codigo ? `Cód. ${producto.codigo}` : "";
            } else {
                titulo.textContent = producto.nombre;
                detalle.textContent = [
                    producto.talla && `Talla ${producto.talla}`,
                    producto.color,
                    producto.codigo && `Cód. ${producto.codigo}`
                ].filter(Boolean).join(" · ");
            }

            if (producto.categoria_id) {
                const nombreCat = nombreCategoria(producto.categoria_id);
                const chip = document.createElement("span");
                chip.className = "chip-cat";
                chip.textContent = nombreCat;
                chip.style.setProperty("--h", String(tonoCategoria(nombreCat)));
                detalle.append(chip);
            }

            info.append(titulo, detalle);

            insignia.className = `estado-stock estado-${estado}`;
            if (estado === "agotado") {
                insignia.textContent = "Agotado";
            } else {
                const numero = document.createElement("b");
                const unidad = document.createElement("small");
                numero.textContent = entero.format(producto.stock);
                unidad.textContent = estado === "poco" ? "quedan pocas" : "en stock";
                insignia.append(numero, unidad);
            }

            acciones.className = "prod-acciones";

            if (producto.activo) {
                acciones.append(
                    boton("Historial", "btn-secundario btn-chico", () => verHistorial(producto),
                        `Ver movimientos de ${producto.nombre}`),
                    boton("Mover stock", "btn-secundario btn-chico btn-mover", () => abrirMovimiento(producto),
                        `Mover stock de ${producto.nombre}`),
                    boton("Editar", "btn-secundario btn-chico", () => abrirProducto(producto),
                        `Editar ${producto.nombre}`)
                );
            }

            acciones.append(
                boton(producto.activo ? "Desactivar" : "Reactivar", "btn-secundario btn-chico",
                    () => cambiarActivo(producto),
                    `${producto.activo ? "Desactivar" : "Reactivar"} ${producto.nombre}`)
            );

            if (!puedeEscribir()) {
                for (const accion of acciones.querySelectorAll("button")) {
                    if (!accion.getAttribute("aria-label").startsWith("Ver movimientos")) accion.disabled = true;
                }
            }

            fila.append(info, insignia, acciones);
            return fila;
        }

        /* Productos con el mismo nombre (tallas o colores distintos) se agrupan y se despliegan */
        const grupos = new Map();
        for (const producto of mostrados) {
            const clave = sinTildes(producto.nombre).trim();
            if (!grupos.has(clave)) grupos.set(clave, []);
            grupos.get(clave).push(producto);
        }

        for (const [clave, items] of grupos) {
            if (items.length === 1 && !productoEsRopa(items[0])) {
                lista.appendChild(filaProducto(items[0], false));
                continue;
            }

            const total = items.reduce((suma, p) => suma + p.stock, 0);
            const estados = items.map(estadoStock);
            const estadoGrupo = estados.every((e) => e === "agotado")
                ? "agotado"
                : estados.some((e) => e !== "ok") ? "poco" : "ok";
            const abierto = gruposAbiertos.has(clave);

            const grupo = document.createElement("li");
            grupo.className = "grupo-producto";
            grupo.dataset.estado = estadoGrupo;

            const cabecera = document.createElement("button");
            cabecera.type = "button";
            cabecera.className = "grupo-cabecera";
            cabecera.setAttribute("aria-expanded", String(abierto));

            const textos = document.createElement("span");
            textos.className = "grupo-textos";
            const nombre = document.createElement("strong");
            nombre.textContent = items[0].nombre;
            const resumen = document.createElement("span");
            const agotadas = estados.filter((e) => e === "agotado").length;
            resumen.textContent = `${items.length} ${items.length === 1 ? "variante" : "variantes"}` +
                (agotadas ? ` · ${agotadas} agotada${agotadas === 1 ? "" : "s"}` : "");
            textos.append(nombre, resumen);

            const cifra = document.createElement("span");
            cifra.className = `estado-stock estado-${estadoGrupo === "poco" ? "poco" : estadoGrupo}`;
            const numero = document.createElement("b");
            const unidad = document.createElement("small");
            numero.textContent = entero.format(total);
            unidad.textContent = "en total";
            cifra.append(numero, unidad);

            const flecha = document.createElement("span");
            flecha.className = "grupo-flecha";
            flecha.setAttribute("aria-hidden", "true");

            cabecera.append(textos, cifra, flecha);

            const variantes = document.createElement("ul");
            variantes.className = "variantes";
            variantes.hidden = !abierto;
            for (const p of [...items].sort(compararVariantes)) variantes.appendChild(filaProducto(p, true));

            cabecera.addEventListener("click", () => {
                const ahora = variantes.hidden;
                variantes.hidden = !ahora;
                cabecera.setAttribute("aria-expanded", String(ahora));
                if (ahora) gruposAbiertos.add(clave); else gruposAbiertos.delete(clave);
            });

            grupo.append(cabecera, variantes);
            lista.appendChild(grupo);
        }

        if (visibles.length > mostrados.length) {
            const mas = document.createElement("li");
            mas.className = "ver-mas";
            mas.appendChild(
                boton(`Ver más (${visibles.length - mostrados.length} restantes)`, "btn-secundario", () => {
                    limiteFilas += PASO_FILAS;
                    pintar();
                })
            );
            lista.appendChild(mas);
        }
    }

    for (const id of ["almBusqueda", "almCategoria", "almEstado"]) {
        const campo = $(id);
        const alCambiar = () => {
            limiteFilas = PASO_FILAS;
            pintar();
        };
        campo.addEventListener("input", alCambiar);
        campo.addEventListener("change", alCambiar);
    }

    /* ----- Historial de movimientos ----- */
    function nombreProducto(id) {
        const producto = productos.find((p) => p.id === id);
        if (!producto) return "Producto";
        return [producto.nombre, producto.talla && `Talla ${producto.talla}`, producto.color]
            .filter(Boolean).join(" · ");
    }

    function pintarMovimientos() {
        const lista = $("listaMovimientos");
        lista.replaceChildren();

        $("contadorHist").textContent = movimientos.length
            ? `Mostrando ${movimientos.length} ${movimientos.length === 1 ? "movimiento" : "movimientos"}${hayMasMovimientos ? " (hay más)" : ""}.`
            : "";

        if (movimientos.length === 0) {
            const vacio = document.createElement("li");
            vacio.className = "vacio";
            vacio.textContent = "Todavía no hay movimientos con estos filtros.";
            lista.appendChild(vacio);
            return;
        }

        for (const mov of movimientos) {
            const tipo = TIPOS_HIST[mov.tipo] || { texto: mov.tipo, suma: false };
            const fila = document.createElement("li");
            const info = document.createElement("div");
            const titulo = document.createElement("strong");
            const detalle = document.createElement("span");
            const etiquetaTipo = document.createElement("span");
            const cantidad = document.createElement("span");
            const saldo = document.createElement("span");

            info.className = "mov-info";
            titulo.textContent = nombreProducto(mov.producto_id);
            etiquetaTipo.className = `mov-tipo mov-tipo-${mov.tipo}`;
            etiquetaTipo.textContent = tipo.texto;

            detalle.className = "mov-detalle";
            detalle.append(
                etiquetaTipo,
                [
                    new Date(mov.creado_en).toLocaleString("es-PE", { dateStyle: "short", timeStyle: "short" }),
                    mov.nota
                ].filter(Boolean).join(" · ")
            );
            info.append(titulo, detalle);

            cantidad.className = `mov-cantidad ${tipo.suma ? "mov-suma" : "mov-resta"}`;
            cantidad.textContent = `${tipo.suma ? "+" : "−"}${entero.format(mov.cantidad)}`;

            saldo.className = "mov-saldo";
            saldo.textContent = `Stock: ${entero.format(mov.stock_anterior)} → ${entero.format(mov.stock_nuevo)}`;

            fila.append(info, cantidad, saldo);
            lista.appendChild(fila);
        }

        if (hayMasMovimientos) {
            const mas = document.createElement("li");
            mas.className = "ver-mas";
            mas.appendChild(boton("Ver más movimientos", "btn-secundario", () => cargarMovimientos(false)));
            lista.appendChild(mas);
        }
    }

    async function cargarMovimientos(reiniciar) {
        $("mensajeHist").textContent = "";

        try {
            const pagina = await Nube.listarMovimientos({
                desde: reiniciar ? 0 : movimientos.length,
                limite: PASO_MOV,
                productoId: $("histProducto").value,
                tipo: $("histTipo").value
            });
            movimientos = reiniciar ? pagina : [...movimientos, ...pagina];
            hayMasMovimientos = pagina.length === PASO_MOV;
            pintarMovimientos();
        } catch (error) {
            $("mensajeHist").textContent = error.message;
            $("mensajeHist").dataset.tipo = "error";
        }
    }

    for (const id of ["histProducto", "histTipo"]) {
        $(id).addEventListener("change", () => cargarMovimientos(true));
    }

    function verHistorial(producto) {
        $("histProducto").value = producto.id;
        $("histTipo").value = "";
        cargarMovimientos(true);
        $("tituloMov").scrollIntoView?.({ behavior: "smooth", block: "start" });
    }

    /* ----- Registrar venta ----- */
    function fechaHoy() {
        const ahora = new Date();
        return new Date(ahora.getTime() - ahora.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
    }

    function etiquetaProducto(producto) {
        return [producto.nombre, producto.talla && `Talla ${producto.talla}`, producto.color]
            .filter(Boolean).join(" · ") + ` (stock ${entero.format(producto.stock)})`;
    }

    function agregarLinea() {
        const vendibles = productos.filter((p) => p.activo && p.stock > 0);
        const fila = document.createElement("div");
        const select = document.createElement("select");
        const cantidad = document.createElement("input");
        const quitar = document.createElement("button");

        fila.className = "venta-linea";

        select.setAttribute("aria-label", "Producto");
        select.append(new Option("Elige un producto", ""), ...vendibles.map((p) => new Option(etiquetaProducto(p), p.id)));

        cantidad.type = "number";
        cantidad.min = "1";
        cantidad.step = "1";
        cantidad.inputMode = "numeric";
        cantidad.placeholder = "Cant.";
        cantidad.setAttribute("aria-label", "Cantidad");

        quitar.type = "button";
        quitar.className = "btn-secundario btn-chico";
        quitar.textContent = "Quitar";
        quitar.addEventListener("click", () => {
            if ($("ventaLineas").children.length > 1) fila.remove();
        });

        fila.append(select, cantidad, quitar);
        $("ventaLineas").appendChild(fila);
    }

    function abrirVenta() {
        if (!puedeEscribir()) {
            decir(AVISO_SIN_ACCESO, "error");
            return;
        }

        if (!productos.some((p) => p.activo && p.stock > 0)) {
            decir("No hay productos con stock para vender. Registra una entrada primero.", "error");
            return;
        }

        $("ventaMoneda").replaceChildren(
            ...[...$("monedaOperacion").children].map((nodo) => nodo.cloneNode(true))
        );
        $("ventaMoneda").value = "PEN";
        $("ventaImporte").value = "";
        $("ventaFecha").value = fechaHoy();
        $("ventaDescripcion").value = "Venta de almacén";
        $("mensajeVenta").textContent = "";
        $("ventaLineas").replaceChildren();
        agregarLinea();
        $("dlgVenta").showModal();
    }

    $("btnVenta").addEventListener("click", abrirVenta);
    $("btnAgregarLinea").addEventListener("click", agregarLinea);
    $("btnCancelarVenta").addEventListener("click", () => $("dlgVenta").close());

    function errorVenta(texto) {
        $("mensajeVenta").textContent = texto;
        $("mensajeVenta").dataset.tipo = "error";
    }

    $("formVenta").addEventListener("submit", async (evento) => {
        evento.preventDefault();

        const items = [...$("ventaLineas").children].map((fila) => ({
            producto_id: fila.querySelector("select").value,
            cantidad: Number(fila.querySelector("input").value)
        }));

        if (items.some((item) => !item.producto_id)) return errorVenta("Elige un producto en cada línea.");
        if (items.some((item) => !Number.isInteger(item.cantidad) || item.cantidad < 1)) {
            return errorVenta("Cada cantidad debe ser un número entero mayor que cero.");
        }
        if (new Set(items.map((item) => item.producto_id)).size !== items.length) {
            return errorVenta("Elegiste el mismo producto dos veces. Suma las cantidades en una sola línea.");
        }

        for (const item of items) {
            const producto = productos.find((p) => p.id === item.producto_id);
            if (producto && item.cantidad > producto.stock) {
                return errorVenta(`Solo hay ${entero.format(producto.stock)} de «${producto.nombre}».`);
            }
        }

        const importe = Number($("ventaImporte").value);

        if (!Number.isFinite(importe) || importe <= 0 || importe > 100000000) {
            return errorVenta("Escribe el importe total de la venta (mayor que cero).");
        }
        if (!$("ventaFecha").value) return errorVenta("La fecha es obligatoria.");

        const guardar = $("btnGuardarVenta");
        guardar.disabled = true;

        try {
            await Nube.registrarVenta(
                items,
                importe,
                $("ventaFecha").value,
                $("ventaMoneda").value,
                $("ventaDescripcion").value.trim() || "Venta de almacén"
            );

            productos = await Nube.listarProductos();
            $("dlgVenta").close();
            pintar();
            cargarMovimientos(true);
            window.GananciaApp?.cargar?.().catch(() => {});
            decir("Venta registrada. El stock se descontó y el ingreso ya está en Finanzas.", "ok");
        } catch (error) {
            errorVenta(error.message);
        } finally {
            guardar.disabled = false;
        }
    });

    /* ----- Producto nuevo / edición ----- */
    function abrirProducto(producto) {
        productoEnEdicion = producto || null;
        $("tituloDlgProducto").textContent = producto ? "Editar producto" : "Nuevo producto";
        $("prodNombre").value = producto?.nombre || "";
        $("prodTalla").value = producto?.talla || "";
        $("prodColor").value = producto?.color || "";
        $("prodCodigo").value = producto?.codigo || "";
        $("prodCategoria").value = producto?.categoria_id ? nombreCategoria(producto.categoria_id) : "";
        $("mensajeProducto").textContent = "";
        $("campoCantidadInicial").hidden = Boolean(producto);
        $("prodCantidad").value = "";
        $("filasTallas").replaceChildren();
        pintarChipsCategoria();
        actualizarModoTallas();
        $("dlgProducto").showModal();
        $("prodNombre").focus();
    }

    $("btnNuevoProducto").addEventListener("click", () => abrirProducto(null));

    /* ----- Ropa: varias tallas de una vez ----- */
    function esRopa() {
        return /\bropa\b/.test(sinTildes($("prodCategoria").value));
    }

    function agregarFilaTalla(talla = "", cantidad = "") {
        const fila = document.createElement("div");
        const t = document.createElement("input");
        const c = document.createElement("input");
        const quitar = document.createElement("button");

        fila.className = "fila-talla";
        t.type = "text";
        t.maxLength = 40;
        t.placeholder = "Talla";
        t.value = talla;
        t.dataset.t = "1";
        t.setAttribute("aria-label", "Talla");
        c.type = "number";
        c.min = "0";
        c.max = "1000000";
        c.step = "1";
        c.inputMode = "numeric";
        c.placeholder = "Cantidad";
        c.value = cantidad;
        c.dataset.c = "1";
        c.setAttribute("aria-label", "Cantidad de esta talla");
        quitar.type = "button";
        quitar.className = "btn-secundario btn-chico";
        quitar.textContent = "Quitar";
        quitar.addEventListener("click", () => {
            if ($("filasTallas").children.length > 1) fila.remove();
        });

        fila.append(t, c, quitar);
        $("filasTallas").appendChild(fila);
        return t;
    }

    function agregarTallas(lista) {
        const existentes = new Set(
            [...$("filasTallas").querySelectorAll("[data-t]")].map((i) => sinTildes(i.value).trim())
        );
        // Reutiliza las filas vacías antes de crear otras nuevas
        const vacias = [...$("filasTallas").children].filter((f) => !f.querySelector("[data-t]").value.trim() && !f.querySelector("[data-c]").value.trim());
        for (const talla of lista) {
            if (existentes.has(sinTildes(talla))) continue;
            const hueco = vacias.shift();
            if (hueco) hueco.querySelector("[data-t]").value = talla;
            else agregarFilaTalla(talla);
        }
    }

    function actualizarModoTallas() {
        const varias = !productoEnEdicion && esRopa();
        $("bloqueTallas").hidden = !varias;
        $("campoTalla").hidden = varias;
        $("campoCantidadInicial").hidden = Boolean(productoEnEdicion) || varias;
        if (varias && !$("filasTallas").children.length) agregarFilaTalla();
    }

    $("prodCategoria").addEventListener("input", actualizarModoTallas);
    $("btnMasTalla").addEventListener("click", () => agregarFilaTalla().focus());
    $("btnTallasNumeros").addEventListener("click", () => agregarTallas(["2", "4", "6", "8", "10", "12", "14", "16"]));
    $("btnTallasLetras").addEventListener("click", () => agregarTallas(["S", "M", "L", "XL"]));

    async function guardarVariasTallas(nombre) {
        const aviso = $("mensajeProducto");
        const error = (texto) => { aviso.textContent = texto; aviso.dataset.tipo = "error"; };

        const filas = [...$("filasTallas").children]
            .map((f) => ({
                talla: f.querySelector("[data-t]").value.trim(),
                texto: f.querySelector("[data-c]").value.trim()
            }))
            .filter((f) => f.talla || f.texto);

        if (!filas.length) return error("Agrega al menos una talla.");

        const vistas = new Set();
        for (const f of filas) {
            if (!f.talla) return error("Hay una cantidad sin talla.");
            f.cantidad = f.texto === "" ? 0 : Number(f.texto);
            if (!Number.isInteger(f.cantidad) || f.cantidad < 0 || f.cantidad > 1000000) {
                return error(`La cantidad de la talla ${f.talla} debe ser un entero de 0 a 1,000,000.`);
            }
            const clave = sinTildes(f.talla).trim();
            if (vistas.has(clave)) return error(`La talla ${f.talla} está repetida.`);
            vistas.add(clave);
        }

        const guardar = $("btnGuardarProducto");
        guardar.disabled = true;
        const fallos = [];
        let creadas = 0;

        try {
            const categoriaId = await categoriaPorNombre($("prodCategoria").value);
            const color = $("prodColor").value.trim();
            const codigoBase = $("prodCodigo").value.trim();

            for (const f of filas) {
                try {
                    const creado = await Nube.crearProducto({
                        categoria_id: categoriaId,
                        nombre,
                        talla: f.talla,
                        color,
                        codigo: codigoBase ? `${codigoBase}-${f.talla}` : null,
                        activo: true
                    });
                    creadas += 1;
                    let stock = 0;

                    if (f.cantidad > 0) {
                        try {
                            stock = Number(await Nube.registrarMovimiento(creado.id, "entrada", f.cantidad, "Stock inicial"));
                        } catch (e) {
                            fallos.push(`stock de la talla ${f.talla}`);
                        }
                    }
                    productos = [...productos, { ...creado, stock }];
                } catch (e) {
                    fallos.push(`talla ${f.talla} (${e.message})`);
                }
            }
        } catch (e) {
            error(e.message);
            guardar.disabled = false;
            return;
        }

        productos.sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));
        if (creadas > 0) {
            gruposAbiertos.add(sinTildes(nombre).trim());
            cargarMovimientos(true);
            $("dlgProducto").close();
            decir(
                `Se crearon ${creadas} ${creadas === 1 ? "talla" : "tallas"} de «${nombre}».` +
                    (fallos.length ? ` Con problemas: ${fallos.join("; ")}.` : ""),
                fallos.length ? "error" : "ok"
            );
            pintar();
        } else {
            error(`No se pudo crear ninguna talla: ${fallos.join("; ")}.`);
        }
        guardar.disabled = false;
    }

    document.addEventListener("gp-acceso", () => {
        if (cargado) pintar();
        else {
            $("btnNuevoProducto").disabled = !puedeEscribir();
            $("btnVenta").disabled = !puedeEscribir();
        }
    });
    $("btnCancelarProducto").addEventListener("click", () => $("dlgProducto").close());

    /* Busca la categoría por nombre; si no existe, la crea (categoría automática) */
    async function categoriaPorNombre(nombre) {
        const limpio = nombre.trim();
        if (!limpio) return null;

        const existente = categorias.find(
            (categoria) => categoria.nombre.trim().toLowerCase() === limpio.toLowerCase()
        );

        if (existente) return existente.id;

        const nueva = await Nube.crearCategoria(limpio);
        categorias = [...categorias, nueva].sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));
        return nueva.id;
    }

    $("formProducto").addEventListener("submit", async (evento) => {
        evento.preventDefault();

        const nombre = $("prodNombre").value.trim();

        if (!nombre) {
            $("mensajeProducto").textContent = "El nombre es obligatorio.";
            $("mensajeProducto").dataset.tipo = "error";
            return;
        }

        if (!productoEnEdicion && esRopa()) {
            await guardarVariasTallas(nombre);
            return;
        }

        const textoCantidad = $("prodCantidad").value.trim();
        const cantidadInicial = textoCantidad === "" ? 0 : Number(textoCantidad);

        if (!productoEnEdicion && (!Number.isInteger(cantidadInicial) || cantidadInicial < 0 || cantidadInicial > 1000000)) {
            $("mensajeProducto").textContent = "La cantidad inicial debe ser un número entero, de 0 a 1,000,000.";
            $("mensajeProducto").dataset.tipo = "error";
            return;
        }

        const guardar = $("btnGuardarProducto");
        guardar.disabled = true;

        try {
            const categoriaId = await categoriaPorNombre($("prodCategoria").value);
            const datos = {
                categoria_id: categoriaId,
                nombre,
                talla: $("prodTalla").value.trim(),
                color: $("prodColor").value.trim(),
                codigo: $("prodCodigo").value.trim() || null
            };

            let productoNuevo = null;

            if (productoEnEdicion) {
                const actualizado = await Nube.actualizarProducto(productoEnEdicion.id, datos);
                productos = productos.map((p) => (p.id === actualizado.id ? actualizado : p));
            } else {
                const creado = await Nube.crearProducto({ ...datos, activo: true });
                productos = [...productos, creado].sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));
                productoNuevo = creado;
            }

            /* Cantidad inicial: se guarda como una entrada (queda en el historial) */
            let avisoStock = "";

            if (productoNuevo && cantidadInicial > 0) {
                try {
                    const stockInicial = await Nube.registrarMovimiento(
                        productoNuevo.id, "entrada", cantidadInicial, "Stock inicial"
                    );
                    productos = productos.map((p) =>
                        p.id === productoNuevo.id ? { ...p, stock: Number(stockInicial) } : p
                    );
                    cargarMovimientos(true);
                } catch (errorStock) {
                    avisoStock = ` Pero no se pudo registrar el stock inicial (${errorStock.message}). Regístralo con «Mover stock».`;
                }
            }

            $("dlgProducto").close();
            decir(
                productoEnEdicion
                    ? "Producto actualizado."
                    : `Producto creado${cantidadInicial > 0 && !avisoStock ? ` con ${entero.format(cantidadInicial)} en stock` : ""}.${avisoStock}`,
                avisoStock ? "error" : "ok"
            );
            pintar();
        } catch (error) {
            $("mensajeProducto").textContent = error.message;
            $("mensajeProducto").dataset.tipo = "error";
        } finally {
            guardar.disabled = false;
        }
    });

    async function cambiarActivo(producto) {
        if (producto.activo && !window.confirm(
            `¿Desactivar «${producto.nombre}»? No se borra: su historial se conserva y puedes reactivarlo.`
        )) return;

        try {
            const actualizado = await Nube.actualizarProducto(producto.id, { activo: !producto.activo });
            productos = productos.map((p) => (p.id === actualizado.id ? actualizado : p));
            decir(actualizado.activo ? "Producto reactivado." : "Producto desactivado.", "ok");
            pintar();
        } catch (error) {
            decir(error.message, "error");
        }
    }

    /* ----- Movimientos de stock ----- */
    function abrirMovimiento(producto) {
        productoEnMovimiento = producto;
        $("movProducto").textContent =
            `${producto.nombre}${producto.talla ? " · Talla " + producto.talla : ""}${producto.color ? " · " + producto.color : ""} — stock actual: ${entero.format(producto.stock)}`;
        $("movTipo").value = "entrada";
        $("btnGuardarMov").textContent = "Registrar";
        $("movCantidad").value = "";
        $("movNota").value = "";
        $("mensajeMovimiento").textContent = "";
        $("dlgMovimiento").showModal();
        $("movCantidad").focus();
    }

    $("btnCancelarMov").addEventListener("click", () => $("dlgMovimiento").close());

    $("movTipo").addEventListener("change", () => {
        $("btnGuardarMov").textContent = $("movTipo").value === "venta" ? "Continuar con la venta" : "Registrar";
    });

    $("formMovimiento").addEventListener("submit", async (evento) => {
        evento.preventDefault();

        const tipo = $("movTipo").value;
        const cantidad = Number($("movCantidad").value);

        /* Venta: se continúa en la ventana de venta, que registra el ingreso en Finanzas */
        if (tipo === "venta") {
            const aviso = $("mensajeMovimiento");
            const elegido = productoEnMovimiento;

            if (!Number.isInteger(cantidad) || cantidad < 1) {
                aviso.textContent = "Indica una cantidad entera mayor que cero.";
                aviso.dataset.tipo = "error";
                return;
            }

            if (!elegido || cantidad > elegido.stock) {
                aviso.textContent = `Solo hay ${entero.format(elegido ? elegido.stock : 0)} en stock.`;
                aviso.dataset.tipo = "error";
                return;
            }

            $("dlgMovimiento").close();
            abrirVenta();

            const primera = $("ventaLineas").firstElementChild;
            if (primera) {
                primera.querySelector("select").value = elegido.id;
                primera.querySelector("input").value = String(cantidad);
            }
            return;
        }

        if (!TIPOS[tipo] || !Number.isInteger(cantidad) || cantidad < 1) {
            $("mensajeMovimiento").textContent = "Indica una cantidad entera mayor que cero.";
            $("mensajeMovimiento").dataset.tipo = "error";
            return;
        }

        const guardar = $("btnGuardarMov");
        guardar.disabled = true;

        try {
            const stockNuevo = await Nube.registrarMovimiento(
                productoEnMovimiento.id, tipo, cantidad, $("movNota").value.trim()
            );
            productos = productos.map((p) =>
                p.id === productoEnMovimiento.id ? { ...p, stock: Number(stockNuevo) } : p
            );
            $("dlgMovimiento").close();
            cargarMovimientos(true);
            decir(`${TIPOS[tipo].texto} registrada. Stock actual: ${entero.format(Number(stockNuevo))}.`, "ok");
            pintar();
        } catch (error) {
            $("mensajeMovimiento").textContent = error.message;
            $("mensajeMovimiento").dataset.tipo = "error";
        } finally {
            guardar.disabled = false;
        }
    });
})();
