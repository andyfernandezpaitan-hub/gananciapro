
"use strict";

const CLAVE_DATOS = "gananciapro_operaciones_v1";
const MONEDA_PREDETERMINADA = "PEN";

/* Límites (coinciden con la base de datos y evitan archivos que congelen la página) */
const MAX_BYTES_CSV = 1024 * 1024;
const MAX_FILAS_CSV = 5000;
const MAX_DESCRIPCION = 100;
const MAX_IMPORTE = 100000000;
const PASO_FILAS = 50;
let limiteFilas = PASO_FILAS;

function textoOperaciones(cantidad) {
    const singular = new Intl.PluralRules("es").select(cantidad) === "one";
    return `${cantidad} ${singular ? "operación" : "operaciones"}`;
}

function esMonedaValida(codigo) {
    if (typeof codigo !== "string" || !/^[A-Z]{3}$/.test(codigo)) {
        return false;
    }

    try {
        new Intl.NumberFormat("es-PE", { style: "currency", currency: codigo });
        return true;
    } catch (error) {
        return false;
    }
}

const botonComenzar = document.getElementById("btnComenzar");
const mensaje = document.getElementById("mensaje");
const formulario = document.getElementById("formOperacion");
const mensajeOperacion = document.getElementById("mensajeOperacion");
const campoFecha = document.getElementById("fechaOperacion");

const archivoCSV = document.getElementById("archivoCSV");
const botonImportarCSV = document.getElementById("btnImportarCSV");
const mensajeImportacion = document.getElementById("mensajeImportacion");

/* Las operaciones ahora viven en la cuenta de cada cliente (Supabase).
   Se cargan al iniciar sesión mediante window.GananciaApp.cargar(). */
let operaciones = [];

function fechaLocal() {
    const ahora = new Date();
    const desplazamiento = ahora.getTimezoneOffset() * 60000;
    return new Date(ahora.getTime() - desplazamiento)
        .toISOString()
        .slice(0, 10);
}

function formatoMoneda(importe, moneda = MONEDA_PREDETERMINADA) {
    const codigo = esMonedaValida(moneda) ? moneda : MONEDA_PREDETERMINADA;

    return new Intl.NumberFormat("es-PE", {
        style: "currency",
        currency: codigo
    }).format(importe);
}

function formatoFecha(fecha) {
    if (!fechaEsValida(fecha)) {
        return fecha || "";
    }

    const [anio, mes, dia] = fecha.split("-");
    return `${dia}/${mes}/${anio}`;
}

function fechaEsValida(fecha) {
    if (typeof fecha !== "string" ||
        !/^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
        return false;
    }

    const [anio, mes, dia] = fecha.split("-").map(Number);
    const comprobada = new Date(anio, mes - 1, dia);

    return comprobada.getFullYear() === anio &&
        comprobada.getMonth() === mes - 1 &&
        comprobada.getDate() === dia;
}

function normalizarMoneda(valor) {
    const codigo = String(valor ?? "").trim().toUpperCase();
    return esMonedaValida(codigo) ? codigo : MONEDA_PREDETERMINADA;
}

function cargarOperaciones() {
    try {
        const guardadas = localStorage.getItem(CLAVE_DATOS);

        if (!guardadas) {
            return [];
        }

        const datos = JSON.parse(guardadas);

        if (!Array.isArray(datos)) {
            console.error("Los datos guardados no tienen el formato esperado.");
            return [];
        }

        return datos.filter((operacion) =>
            operacion &&
            ["ingreso", "gasto"].includes(operacion.tipo) &&
            typeof operacion.descripcion === "string" &&
            Number.isFinite(Number(operacion.importe)) &&
            Number(operacion.importe) > 0 &&
            fechaEsValida(operacion.fecha)
        ).map((operacion) => ({
            tipo: operacion.tipo,
            descripcion: operacion.descripcion,
            importe: Number(operacion.importe),
            fecha: operacion.fecha,
            moneda: normalizarMoneda(operacion.moneda)
        }));
    } catch (error) {
        console.error("No se pudieron cargar las operaciones:", error);
        return [];
    }
}

/* guardarOperaciones() ya no existe: guardar, borrar e importar se hacen en la
   cuenta mediante window.Nube. cargarOperaciones() se conserva solo para leer
   los datos antiguos de este navegador y ofrecer subirlos a la cuenta. */

function obtenerCampo(...selectores) {
    for (const selector of selectores) {
        const elemento = document.querySelector(selector);
        if (elemento) return elemento;
    }

    return null;
}

function totalesPorMoneda() {
    const totales = new Map();

    for (const operacion of operaciones) {
        if (!totales.has(operacion.moneda)) {
            totales.set(operacion.moneda, { ingresos: 0, gastos: 0 });
        }

        const total = totales.get(operacion.moneda);

        if (operacion.tipo === "ingreso") {
            total.ingresos += operacion.importe;
        } else {
            total.gastos += operacion.importe;
        }
    }

    if (totales.size === 0) {
        totales.set(MONEDA_PREDETERMINADA, { ingresos: 0, gastos: 0 });
    }

    return totales;
}

function pintarTotales(elemento, totales, extraer) {
    if (!elemento) return;

    const lineas = [];

    for (const [moneda, total] of totales) {
        const valor = extraer(total);
        const linea = document.createElement("div");
        linea.textContent = formatoMoneda(valor, moneda);
        if (valor < 0) linea.classList.add("negativo");
        lineas.push(linea);
    }

    elemento.replaceChildren(...lineas);
}

function actualizarResumen() {
    const totales = totalesPorMoneda();

    const elementoIngresos = obtenerCampo(
        "#totalIngresos",
        "#total-ingresos",
        "#ingresosTotales"
    );

    const elementoGastos = obtenerCampo(
        "#totalGastos",
        "#total-gastos",
        "#gastosTotales"
    );

    const elementoBalance = obtenerCampo(
        "#balanceTotal",
        "#balance",
        "#saldoTotal",
        "#totalBalance"
    );

    pintarTotales(elementoIngresos, totales, (total) => total.ingresos);
    pintarTotales(elementoGastos, totales, (total) => total.gastos);
    pintarTotales(
        elementoBalance,
        totales,
        (total) => total.ingresos - total.gastos
    );
}

const filtroBusqueda = document.getElementById("filtroBusqueda");
const filtroTipo = document.getElementById("filtroTipo");
const filtroMoneda = document.getElementById("filtroMoneda");
const filtroDesde = document.getElementById("filtroDesde");
const filtroHasta = document.getElementById("filtroHasta");
const botonLimpiarFiltros = document.getElementById("btnLimpiarFiltros");
const contadorHistorial = document.getElementById("contadorHistorial");

function sinTildes(texto) {
    return String(texto ?? "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase();
}

function actualizarOpcionesMoneda() {
    if (!filtroMoneda) return;

    const seleccionada = filtroMoneda.value;
    const usadas = [...new Set(operaciones.map((operacion) => operacion.moneda))].sort();

    const opciones = [new Option("Todas", "")];

    for (const codigo of usadas) {
        opciones.push(new Option(codigo, codigo));
    }

    filtroMoneda.replaceChildren(...opciones);
    filtroMoneda.value = usadas.includes(seleccionada) ? seleccionada : "";
}

function pasaFiltros(operacion) {
    const texto = sinTildes(filtroBusqueda?.value.trim());

    if (texto && !sinTildes(operacion.descripcion).includes(texto) && !sinTildes(operacion.categoria).includes(texto)) {
        return false;
    }

    if (filtroTipo?.value && operacion.tipo !== filtroTipo.value) {
        return false;
    }

    if (filtroMoneda?.value && operacion.moneda !== filtroMoneda.value) {
        return false;
    }

    if (filtroDesde?.value && operacion.fecha < filtroDesde.value) {
        return false;
    }

    if (filtroHasta?.value && operacion.fecha > filtroHasta.value) {
        return false;
    }

    return true;
}

const MAX_CATEGORIA = 30;

function limpiarCategoria(valor) {
    return String(valor ?? "")
        .replace(/[\u0000-\u001f\u007f]/g, " ")
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, MAX_CATEGORIA);
}

function actualizarListaCategorias() {
    const lista = document.getElementById("listaCategorias");
    if (!lista) return;
    const conteo = new Map();
    for (const operacion of operaciones) {
        if (operacion.categoria) conteo.set(operacion.categoria, (conteo.get(operacion.categoria) || 0) + 1);
    }
    const nombres = [...conteo].sort((a, b) => b[1] - a[1]).slice(0, 30).map(([nombre]) => nombre);
    lista.replaceChildren(...nombres.map((nombre) => { const o = document.createElement("option"); o.value = nombre; return o; }));
}

function mostrarOperaciones() {
    const lista = obtenerCampo(
        "#listaOperaciones",
        "#lista-operaciones",
        "#listaRegistros",
        "#operacionesRegistradas",
        "#listaMovimientos"
    );

    if (!lista) {
        console.error(
            "No se encontró la lista de operaciones. " +
            "Comprueba el id del elemento en index.html."
        );
        actualizarResumen();
        return;
    }

    actualizarOpcionesMoneda();
    actualizarListaCategorias();
    lista.replaceChildren();

    if (operaciones.length === 0) {
        const elemento = document.createElement("li");
        elemento.className = "vacio";
        elemento.textContent = "Todavía no hay operaciones registradas.";
        lista.appendChild(elemento);

        if (contadorHistorial) contadorHistorial.textContent = "";

        actualizarResumen();
        return;
    }

    const fechasInvertidas = Boolean(
        filtroDesde?.value && filtroHasta?.value && filtroDesde.value > filtroHasta.value
    );
    const visibles = fechasInvertidas
        ? []
        : [...operaciones].reverse().filter(pasaFiltros);
    const mostradas = visibles.slice(0, limiteFilas);

    if (contadorHistorial) {
        contadorHistorial.textContent = fechasInvertidas
            ? "Revisa las fechas: «Desde» es posterior a «Hasta»."
            : `Mostrando ${mostradas.length} de ${textoOperaciones(visibles.length)}` +
              (visibles.length !== operaciones.length
                  ? ` (filtradas de ${operaciones.length}).`
                  : ".");
    }

    if (visibles.length === 0) {
        const elemento = document.createElement("li");
        elemento.className = "vacio";
        elemento.textContent = fechasInvertidas
            ? "Corrige el rango de fechas para ver resultados."
            : "Ninguna operación coincide con los filtros.";
        lista.appendChild(elemento);
        actualizarResumen();
        return;
    }

    for (const operacion of mostradas) {
        const elemento = document.createElement("li");
        const detalle = document.createElement("span");
        const etiqueta = document.createElement("span");
        const texto = document.createElement("span");
        const importe = document.createElement("strong");
        const botonEliminar = document.createElement("button");

        elemento.className = `op-${operacion.tipo}`;

        etiqueta.className = `etiqueta-tipo etiqueta-${operacion.tipo}`;
        etiqueta.textContent = operacion.tipo === "ingreso" ? "Ingreso" : "Gasto";

        texto.textContent =
            `${operacion.descripcion} — ${formatoFecha(operacion.fecha)}`;

        detalle.className = "detalle";
        detalle.append(etiqueta, texto);

        if (operacion.categoria) {
            const marca = document.createElement("span");
            marca.className = "etiqueta-categoria";
            marca.textContent = operacion.categoria;
            detalle.append(marca);
        }

        importe.className = `importe-${operacion.tipo}`;
        importe.textContent =
            (operacion.tipo === "ingreso" ? "+ " : "− ") +
            formatoMoneda(operacion.importe, operacion.moneda);

        botonEliminar.type = "button";
        botonEliminar.className = "btn-eliminar";
        botonEliminar.textContent = "Eliminar";
        botonEliminar.setAttribute(
            "aria-label",
            `Eliminar ${operacion.tipo}: ${operacion.descripcion}`
        );

        botonEliminar.addEventListener("click", async () => {
            const confirmado = window.confirm(
                `¿Deseas eliminar la operación "${operacion.descripcion}"?`
            );

            if (!confirmado) return;

            botonEliminar.disabled = true;

            try {
                await window.Nube.borrarOperacion(operacion.id);
                operaciones = operaciones.filter((existente) => existente !== operacion);
                mostrarOperaciones();

                if (mensajeOperacion) {
                    mensajeOperacion.textContent =
                        "Operación eliminada correctamente.";
                }
            } catch (error) {
                console.error(error);
                botonEliminar.disabled = false;

                if (mensajeOperacion) {
                    mensajeOperacion.textContent =
                        `No se pudo eliminar: ${error.message}`;
                }
            }
        });

        elemento.append(detalle, importe, botonEliminar);
        lista.appendChild(elemento);
    }

    if (visibles.length > mostradas.length) {
        const fila = document.createElement("li");
        const botonMas = document.createElement("button");

        fila.className = "ver-mas";
        botonMas.type = "button";
        botonMas.className = "btn-secundario";
        botonMas.textContent = `Ver más (${visibles.length - mostradas.length} restantes)`;
        botonMas.addEventListener("click", () => {
            limiteFilas += PASO_FILAS;
            mostrarOperaciones();
        });

        fila.appendChild(botonMas);
        lista.appendChild(fila);
    }

    actualizarResumen();
}

function alCambiarFiltro() {
    limiteFilas = PASO_FILAS;
    mostrarOperaciones();
}

for (const filtro of [filtroBusqueda, filtroTipo, filtroMoneda, filtroDesde, filtroHasta]) {
    if (filtro) {
        filtro.addEventListener("input", alCambiarFiltro);
        filtro.addEventListener("change", alCambiarFiltro);
    }
}

if (botonLimpiarFiltros) {
    botonLimpiarFiltros.addEventListener("click", () => {
        if (filtroBusqueda) filtroBusqueda.value = "";
        if (filtroTipo) filtroTipo.value = "";
        if (filtroMoneda) filtroMoneda.value = "";
        if (filtroDesde) filtroDesde.value = "";
        if (filtroHasta) filtroHasta.value = "";
        limiteFilas = PASO_FILAS;
        mostrarOperaciones();
    });
}

const seccionOperaciones = document.querySelector(".operaciones");
const seccionBienvenida = document.querySelector(".bienvenida");
let iniciandoRegistro = false;

if (seccionOperaciones && seccionBienvenida) {
    seccionOperaciones.classList.add("plegada");
}

function mostrarRegistro() {
    seccionBienvenida.classList.remove("saliendo");
    seccionBienvenida.classList.add("oculta");

    seccionOperaciones.classList.remove("plegada");
    seccionOperaciones.classList.add("abriendo");

    setTimeout(() => {
        seccionOperaciones.classList.remove("abriendo");
    }, 900);

    window.scrollTo({ top: 0, behavior: "smooth" });
}

if (botonComenzar) {
    botonComenzar.addEventListener("click", () => {
        if (iniciandoRegistro) return;

        if (!seccionOperaciones || !seccionBienvenida) {
            if (formulario) {
                formulario.scrollIntoView({
                    behavior: "smooth",
                    block: "start"
                });
            }
            return;
        }

        iniciandoRegistro = true;

        const reducirMovimiento = window.matchMedia?.(
            "(prefers-reduced-motion: reduce)"
        ).matches;

        if (reducirMovimiento) {
            mostrarRegistro();
            return;
        }

        let terminado = false;
        const terminar = () => {
            if (terminado) return;
            terminado = true;
            mostrarRegistro();
        };

        seccionBienvenida.classList.add("saliendo");
        seccionBienvenida.addEventListener("animationend", (evento) => {
            if (evento.target === seccionBienvenida) terminar();
        });
        setTimeout(terminar, 700);
    });
}

if (campoFecha && !campoFecha.value) {
    campoFecha.value = fechaLocal();
}

if (formulario) {
    formulario.addEventListener("submit", async (evento) => {
        evento.preventDefault();

        const campoTipo = obtenerCampo(
            "#tipoOperacion",
            "#tipo",
            '[name="tipo"]'
        );

        const campoDescripcion = obtenerCampo(
            "#descripcion",
            "#descripcionOperacion",
            '[name="descripcion"]'
        );

        const campoImporte = obtenerCampo(
            "#importe",
            "#monto",
            "#importeOperacion",
            '[name="importe"]',
            '[name="monto"]'
        );

        const campoMoneda = obtenerCampo(
            "#monedaOperacion",
            '[name="moneda"]'
        );

        const campoCategoria = document.getElementById("categoriaOperacion");
        const categoria = limpiarCategoria(campoCategoria?.value);
        const tipo = campoTipo?.value;
        const descripcion = campoDescripcion?.value.trim() || "";
        const importe = Number(campoImporte?.value);
        const fecha = campoFecha?.value || "";
        const moneda = campoMoneda?.value || MONEDA_PREDETERMINADA;

        if (
            !["ingreso", "gasto"].includes(tipo) ||
            !descripcion ||
            !Number.isFinite(importe) ||
            importe <= 0 ||
            !fechaEsValida(fecha) ||
            !esMonedaValida(moneda)
        ) {
            if (mensajeOperacion) {
                mensajeOperacion.textContent =
                    "Revisa los datos: tipo, descripción, importe positivo, moneda y fecha válida son obligatorios.";
            }
            return;
        }

        const nuevaOperacion = {
            tipo,
            descripcion,
            importe,
            fecha,
            moneda,
            categoria
        };

        const botonRegistrar = formulario.querySelector('button[type="submit"]');

        if (botonRegistrar) botonRegistrar.disabled = true;

        try {
            const creada = await window.Nube.crearOperacion(nuevaOperacion);
            operaciones = [...operaciones, creada];

            formulario.reset();

            if (campoFecha) {
                campoFecha.value = fechaLocal();
            }

            mostrarOperaciones();

            if (mensajeOperacion) {
                mensajeOperacion.textContent =
                    "Operación registrada correctamente.";
            }
        } catch (error) {
            console.error("No se pudo guardar la operación:", error);

            if (mensajeOperacion) {
                mensajeOperacion.textContent =
                    `No se pudo guardar la operación: ${error.message}`;
            }
        } finally {
            if (botonRegistrar) botonRegistrar.disabled = false;
        }
    });
}

function protegerValorCSV(valor) {
    let texto = String(valor ?? "");

    if (/^[\s]*[=+\-@\t\r]/.test(texto)) {
        texto = "'" + texto;
    }

    return `"${texto.replace(/"/g, '""')}"`;
}

function exportarCSV() {
    const encabezados = ["Fecha", "Tipo", "Descripción", "Moneda", "Importe", "Categoría"];

    const filas = operaciones.map((operacion) => [
        operacion.fecha,
        operacion.tipo,
        operacion.descripcion,
        operacion.moneda,
        operacion.importe.toFixed(2),
        operacion.categoria || ""
    ]);

    const contenido = [encabezados, ...filas]
        .map((fila) => fila.map(protegerValorCSV).join(";"))
        .join("\r\n");

    const archivo = new Blob(["\uFEFF", contenido], {
        type: "text/csv;charset=utf-8;"
    });

    const url = URL.createObjectURL(archivo);
    const enlace = document.createElement("a");

    enlace.href = url;
    enlace.download = "GananciaPro-respaldo.csv";
    document.body.appendChild(enlace);
    enlace.click();
    enlace.remove();
    URL.revokeObjectURL(url);
}

let botonExportarCSV = document.getElementById("btnExportarCSV");

if (!botonExportarCSV) {
    botonExportarCSV = document.createElement("button");
    botonExportarCSV.type = "button";
    botonExportarCSV.className = "btn-secundario";
    botonExportarCSV.type = "button";
    botonExportarCSV.textContent = "Exportar respaldo CSV";

    const destino = formulario?.parentElement || document.body;
    destino.appendChild(botonExportarCSV);
}

botonExportarCSV.addEventListener("click", exportarCSV);

const botonExportarCuenta = document.getElementById("btnExportarCuenta");

/* «Descargar mis datos» lo maneja acceso.js (incluye también el almacén) */

function analizarLineaCSV(linea, separador = ";") {
    const columnas = [];
    let valor = "";
    let dentroDeComillas = false;

    for (let i = 0; i < linea.length; i++) {
        const caracter = linea[i];

        if (caracter === '"') {
            if (dentroDeComillas && linea[i + 1] === '"') {
                valor += '"';
                i++;
            } else {
                dentroDeComillas = !dentroDeComillas;
            }
        } else if (caracter === separador && !dentroDeComillas) {
            columnas.push(valor);
            valor = "";
        } else {
            valor += caracter;
        }
    }

    if (dentroDeComillas) {
        throw new Error("El CSV contiene comillas sin cerrar.");
    }

    columnas.push(valor);
    return columnas;
}

function analizarCSV(texto) {
    const lineas = texto
        .replace(/^\uFEFF/, "")
        .split(/\r?\n/)
        .filter((linea) => linea.trim() !== "");

    if (lineas.length === 0) {
        throw new Error("El archivo CSV está vacío.");
    }

    if (lineas.length - 1 > MAX_FILAS_CSV) {
        throw new Error(`El archivo tiene demasiadas filas (máximo ${MAX_FILAS_CSV}).`);
    }

    const encabezados = analizarLineaCSV(lineas[0]).map((valor) =>
        valor.trim().toLocaleLowerCase("es-PE")
    );

    const indiceFecha = encabezados.indexOf("fecha");
    const indiceTipo = encabezados.indexOf("tipo");
    const indiceDescripcion = encabezados.indexOf("descripción") !== -1
        ? encabezados.indexOf("descripción")
        : encabezados.indexOf("descripcion");
    const indiceMoneda = encabezados.indexOf("moneda");
    const indiceCategoria = encabezados.indexOf("categoría") !== -1
        ? encabezados.indexOf("categoría")
        : encabezados.indexOf("categoria");

    let indiceImporte = encabezados.indexOf("importe (pen)");

    if (indiceImporte === -1) {
        indiceImporte = encabezados.indexOf("importe");
    }

    if (
        indiceFecha === -1 ||
        indiceTipo === -1 ||
        indiceDescripcion === -1 ||
        indiceImporte === -1
    ) {
        throw new Error(
            "Los encabezados no coinciden con un respaldo CSV de GananciaPro."
        );
    }

    const nuevasOperaciones = [];

    for (let i = 1; i < lineas.length; i++) {
        const columnas = analizarLineaCSV(lineas[i]);

        if (columnas.length !== encabezados.length) {
            throw new Error(`La fila ${i + 1} tiene columnas incorrectas.`);
        }

        const fecha = columnas[indiceFecha].trim();
        const tipo = columnas[indiceTipo].trim().toLowerCase();
        const descripcion = columnas[indiceDescripcion].trim();
        const textoImporte = columnas[indiceImporte]
            .trim()
            .replace(/^'/, "")
            .replace(",", ".");

        const importe = Number(textoImporte);

        let moneda = MONEDA_PREDETERMINADA;

        if (indiceMoneda !== -1) {
            moneda = columnas[indiceMoneda].trim().toUpperCase();

            if (!esMonedaValida(moneda)) {
                throw new Error(
                    `La fila ${i + 1} tiene una moneda no reconocida. No se importó nada.`
                );
            }
        }

        if (descripcion.length > MAX_DESCRIPCION) {
            throw new Error(
                `La fila ${i + 1} tiene una descripción de más de ${MAX_DESCRIPCION} caracteres. No se importó nada.`
            );
        }

        if (importe > MAX_IMPORTE) {
            throw new Error(
                `La fila ${i + 1} tiene un importe mayor al máximo permitido. No se importó nada.`
            );
        }

        if (
            !fechaEsValida(fecha) ||
            !["ingreso", "gasto"].includes(tipo) ||
            !descripcion ||
            !Number.isFinite(importe) ||
            importe <= 0
        ) {
            throw new Error(
                `La fila ${i + 1} contiene datos inválidos. No se importó nada.`
            );
        }

        nuevasOperaciones.push({
            fecha,
            tipo,
            descripcion,
            importe,
            moneda,
            categoria: indiceCategoria === -1
                ? ""
                : limpiarCategoria(columnas[indiceCategoria].replace(/^'/, ""))
        });
    }

    return nuevasOperaciones;
}

if (archivoCSV && botonImportarCSV && mensajeImportacion) {
    botonImportarCSV.addEventListener("click", async () => {
        mensajeImportacion.textContent = "";

        const archivo = archivoCSV.files?.[0];

        if (!archivo) {
            mensajeImportacion.textContent =
                "Selecciona primero un archivo CSV.";
            return;
        }

        if (!archivo.name.toLowerCase().endsWith(".csv")) {
            mensajeImportacion.textContent =
                "Selecciona un archivo con extensión .csv.";
            return;
        }

        if (archivo.size > MAX_BYTES_CSV) {
            mensajeImportacion.textContent =
                "El archivo supera 1 MB. Divide el respaldo en partes más pequeñas.";
            return;
        }

        try {
            const texto = await archivo.text();
            const nuevasOperaciones = analizarCSV(texto);

            const confirmado = window.confirm(
                `Se encontraron ${textoOperaciones(nuevasOperaciones.length)}.\n\n` +
                "IMPORTANTE: esta acción reemplazará todas las operaciones actuales.\n\n" +
                "¿Deseas continuar?"
            );

            if (!confirmado) {
                mensajeImportacion.textContent =
                    "Importación cancelada. Tus operaciones actuales no cambiaron.";
                return;
            }

            botonImportarCSV.disabled = true;

            const idsAnteriores = operaciones.map((operacion) => operacion.id);
            const creadas = await window.Nube.crearOperaciones(nuevasOperaciones);

            try {
                await window.Nube.borrarOperaciones(idsAnteriores);
                operaciones = creadas;
            } catch (errorBorrado) {
                console.error("No se pudieron borrar las anteriores:", errorBorrado);
                operaciones = [...operaciones, ...creadas];
                mensajeImportacion.textContent =
                    "Se cargó el respaldo, pero no se pudieron quitar las operaciones anteriores. " +
                    "Revisa el historial por posibles duplicados.";
                mostrarOperaciones();
                archivoCSV.value = "";
                return;
            }

            mostrarOperaciones();

            mensajeImportacion.textContent =
                `Importación completada. Ahora tienes ${textoOperaciones(operaciones.length)}.`;
            archivoCSV.value = "";
        } catch (error) {
            console.error("Error al importar CSV:", error);

            mensajeImportacion.textContent =
                error instanceof Error
                    ? `No se pudo importar: ${error.message}`
                    : "No se pudo importar el archivo.";
        } finally {
            botonImportarCSV.disabled = false;
        }
    });
}

mostrarOperaciones();

/* Puente con acceso.js (inicio y cierre de sesión) */
window.GananciaApp = Object.freeze({
    async cargar() {
        operaciones = await window.Nube.listarOperaciones();
        limiteFilas = PASO_FILAS;
        mostrarOperaciones();
    },

    limpiar() {
        operaciones = [];
        limiteFilas = PASO_FILAS;

        for (const filtro of [filtroBusqueda, filtroTipo, filtroMoneda, filtroDesde, filtroHasta]) {
            if (filtro) filtro.value = "";
        }

        mostrarOperaciones();
    },

    operacionesLocales: cargarOperaciones
});
