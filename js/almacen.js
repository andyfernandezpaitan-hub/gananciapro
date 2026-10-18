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

    function pintar() {
        pintarFiltroCategorias();
        pintarFiltroProductos();
        pintarResumen();

        const lista = $("listaProductos");
        lista.replaceChildren();

        if (productos.length === 0) {
            const vacio = document.createElement("li");
            vacio.className = "vacio";
            vacio.textContent = "Aún no tienes productos. Crea el primero con «Nuevo producto».";
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

        for (const producto of mostrados) {
            const fila = document.createElement("li");
            const info = document.createElement("div");
            const titulo = document.createElement("strong");
            const detalle = document.createElement("span");
            const insignia = document.createElement("span");
            const acciones = document.createElement("div");
            const estado = estadoStock(producto);

            fila.className = producto.activo ? "" : "inactivo";

            info.className = "prod-info";
            titulo.textContent = producto.nombre;
            detalle.textContent = [
                producto.talla && `Talla ${producto.talla}`,
                producto.color,
                producto.codigo && `Cód. ${producto.codigo}`
            ].filter(Boolean).join(" · ");

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
            insignia.textContent =
                estado === "agotado" ? "Agotado" : `${entero.format(producto.stock)} en stock`;

            acciones.className = "prod-acciones";

            if (producto.activo) {
                acciones.append(
                    boton("Historial", "btn-secundario btn-chico", () => verHistorial(producto),
                        `Ver movimientos de ${producto.nombre}`),
                    boton("Mover stock", "btn-secundario btn-chico", () => abrirMovimiento(producto),
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

            fila.append(info, insignia, acciones);
            lista.appendChild(fila);
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
        $("dlgProducto").showModal();
        $("prodNombre").focus();
    }

    $("btnNuevoProducto").addEventListener("click", () => abrirProducto(null));
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

            if (productoEnEdicion) {
                const actualizado = await Nube.actualizarProducto(productoEnEdicion.id, datos);
                productos = productos.map((p) => (p.id === actualizado.id ? actualizado : p));
            } else {
                const creado = await Nube.crearProducto({ ...datos, activo: true });
                productos = [...productos, creado].sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));
            }

            $("dlgProducto").close();
            decir(productoEnEdicion ? "Producto actualizado." : "Producto creado. Registra su primera entrada con «Mover stock».", "ok");
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
        $("movCantidad").value = "";
        $("movNota").value = "";
        $("mensajeMovimiento").textContent = "";
        $("dlgMovimiento").showModal();
        $("movCantidad").focus();
    }

    $("btnCancelarMov").addEventListener("click", () => $("dlgMovimiento").close());

    $("formMovimiento").addEventListener("submit", async (evento) => {
        evento.preventDefault();

        const tipo = $("movTipo").value;
        const cantidad = Number($("movCantidad").value);

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