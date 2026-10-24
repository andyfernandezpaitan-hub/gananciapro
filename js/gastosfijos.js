"use strict";

/* Gastos fijos: se registran solos una vez al mes (la lógica está en la base de datos, SQL 13). */
(function () {
    const $ = (id) => document.getElementById(id);
    const seccion = $("gastosFijos");
    if (!seccion) return;

    let lista = [];

    function hoyLocal() {
        const d = new Date();
        const dos = (n) => String(n).padStart(2, "0");
        return `${d.getFullYear()}-${dos(d.getMonth() + 1)}-${dos(d.getDate())}`;
    }

    function formato(valor, codigo) {
        try {
            return new Intl.NumberFormat(window.GP_IDIOMA ? window.GP_IDIOMA.locale() : "es-PE", { style: "currency", currency: codigo }).format(valor);
        } catch (e) {
            return `${codigo} ${Number(valor).toFixed(2)}`;
        }
    }

    function dibujar() {
        const ul = $("listaFijos");
        ul.replaceChildren();

        if (!lista.length) {
            const li = document.createElement("li");
            li.className = "vacio";
            li.textContent = "Aún no tienes gastos fijos.";
            ul.appendChild(li);
            return;
        }

        for (const fijo of lista) {
            const li = document.createElement("li");
            if (!fijo.activo) li.className = "pausado";

            const texto = document.createElement("span");
            texto.className = "fijo-texto";
            texto.textContent = `${fijo.descripcion} · día ${fijo.dia}`;
            if (fijo.categoria) {
                const marca = document.createElement("span");
                marca.className = "etiqueta-categoria";
                marca.textContent = fijo.categoria;
                texto.append(" ", marca);
            }
            if (!fijo.activo) {
                const estado = document.createElement("span");
                estado.className = "etiqueta-categoria";
                estado.textContent = "En pausa";
                texto.append(" ", estado);
            }

            const importe = document.createElement("strong");
            importe.className = "importe-gasto";
            importe.textContent = "− " + formato(fijo.importe, fijo.moneda);

            const pausar = document.createElement("button");
            pausar.type = "button";
            pausar.className = "btn-editar";
            pausar.textContent = fijo.activo ? "Pausar" : "Activar";
            pausar.addEventListener("click", async () => {
                pausar.disabled = true;
                try {
                    await window.Nube.cambiarActivoGastoFijo(fijo.id, !fijo.activo);
                    fijo.activo = !fijo.activo;
                    dibujar();
                } catch (e) {
                    pausar.disabled = false;
                    $("mensajeFijo").textContent = `No se pudo cambiar: ${e.message}`;
                }
            });

            const borrar = document.createElement("button");
            borrar.type = "button";
            borrar.className = "btn-eliminar";
            borrar.textContent = "Eliminar";
            borrar.addEventListener("click", async () => {
                if (!window.confirm(`¿Eliminar el gasto fijo "${fijo.descripcion}"? Lo ya registrado en tu historial se conserva.`)) return;
                borrar.disabled = true;
                try {
                    await window.Nube.borrarGastoFijo(fijo.id);
                    lista = lista.filter((f) => f !== fijo);
                    dibujar();
                } catch (e) {
                    borrar.disabled = false;
                    $("mensajeFijo").textContent = `No se pudo eliminar: ${e.message}`;
                }
            });

            li.append(texto, importe, pausar, borrar);
            ul.appendChild(li);
        }
    }

    function llenarMonedas() {
        const origen = $("monedaOperacion");
        const destino = $("fijoMoneda");
        if (!origen || !destino || destino.options.length) return;
        destino.replaceChildren(...[...origen.children].map((n) => n.cloneNode(true)));
        destino.value = origen.value || "PEN";
    }

    $("formFijo").addEventListener("submit", async (evento) => {
        evento.preventDefault();
        const mensaje = $("mensajeFijo");
        const descripcion = $("fijoDescripcion").value.trim();
        const categoria = $("fijoCategoria").value.replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim().slice(0, 30);
        const importe = Number($("fijoImporte").value);
        const moneda = $("fijoMoneda").value;
        const dia = Number($("fijoDia").value);

        if (!descripcion || descripcion.length > 100 || !Number.isFinite(importe) || importe <= 0 || importe > 100000000 ||
            !/^[A-Z]{3}$/.test(moneda) || !Number.isInteger(dia) || dia < 1 || dia > 28) {
            mensaje.textContent = "Revisa los datos: descripción, importe positivo, moneda y un día del 1 al 28.";
            return;
        }

        /* Si el día de este mes ya pasó, empieza el mes que viene (no se crea un gasto con fecha pasada) */
        const hoy = hoyLocal();
        const ultimoMes = dia <= Number(hoy.slice(8, 10)) ? hoy.slice(0, 8) + "01" : null;

        const boton = $("formFijo").querySelector('button[type="submit"]');
        boton.disabled = true;
        try {
            const creado = await window.Nube.crearGastoFijo({ descripcion, categoria, importe: Math.round(importe * 100) / 100, moneda, dia, ultimo_mes: ultimoMes });
            lista = [...lista, creado].sort((a, b) => a.dia - b.dia);
            $("formFijo").reset();
            $("fijoDia").value = "1";
            llenarMonedas();
            dibujar();
            mensaje.textContent = ultimoMes
                ? "Gasto fijo guardado. Se registrará solo desde el mes que viene."
                : "Gasto fijo guardado. Se registrará solo ese día.";
        } catch (e) {
            mensaje.textContent = `No se pudo guardar: ${e.message}`;
        } finally {
            boton.disabled = false;
        }
    });

    window.GastosFijos = Object.freeze({
        /* Registra los gastos fijos que toquen hoy. Devuelve cuántos se crearon. */
        async generar() {
            try {
                return await window.Nube.generarGastosFijos(hoyLocal());
            } catch (e) {
                return 0;
            }
        },

        async cargar() {
            llenarMonedas();
            let datos = null;
            try {
                datos = await window.Nube.listarGastosFijos();
            } catch (e) {
                datos = null;
            }
            seccion.hidden = datos === null;   // sin el SQL 13 la sección no se muestra
            if (datos) {
                lista = datos;
                dibujar();
            }
        },

        limpiar() {
            lista = [];
            seccion.hidden = true;
            $("listaFijos").replaceChildren();
            $("mensajeFijo").textContent = "";
        }
    });
})();
