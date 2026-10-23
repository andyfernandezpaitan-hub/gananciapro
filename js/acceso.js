"use strict";

/* Pantallas de acceso: iniciar sesión, crear cuenta, recuperar contraseña,
   consentimiento, migración de datos antiguos y eliminación de cuenta. */
(function () {
    const $ = (id) => document.getElementById(id);
    const cfg = window.GANANCIAPRO_CONFIG;
    const Nube = window.Nube;
    const App = window.GananciaApp;

    const mensaje = $("mensajeAcceso");
    const LARGO_MINIMO_CLAVE = 10;

    let usuarioCargado = null;
    let recuperandoClave = false;

    function estado(valor) {
        document.body.dataset.sesion = valor;
    }

    function decir(texto, tipo) {
        mensaje.textContent = texto;
        mensaje.dataset.tipo = tipo || "info";
    }

    function ocupado(boton, valor) {
        if (boton) boton.disabled = valor;
    }

    /* ----- Pestañas / formularios ----- */
    const formularios = {
        entrar: $("formEntrar"),
        crear: $("formCrear"),
        recuperar: $("formRecuperar"),
        nueva: $("formNuevaClave")
    };

    function mostrar(nombre) {
        for (const [clave, formulario] of Object.entries(formularios)) {
            formulario.hidden = clave !== nombre;
        }

        const conPestanas = nombre === "entrar" || nombre === "crear";
        $("pestanasAcceso").hidden = !conPestanas;
        $("bloqueGoogle").hidden = !(conPestanas && cfg.GOOGLE_ACTIVO === true);
        $("tabEntrar").setAttribute("aria-selected", String(nombre === "entrar"));
        $("tabCrear").setAttribute("aria-selected", String(nombre === "crear"));

        $("tituloAcceso").textContent =
            nombre === "recuperar" ? "Recuperar contraseña" :
            nombre === "nueva" ? "Crea tu nueva contraseña" :
            "Accede a tu cuenta";

        decir("", "info");
    }

    $("tabEntrar").addEventListener("click", () => mostrar("entrar"));
    $("tabCrear").addEventListener("click", () => mostrar("crear"));
    $("btnOlvide").addEventListener("click", () => mostrar("recuperar"));
    $("btnVolverEntrar").addEventListener("click", () => mostrar("entrar"));

    /* ----- Entrar con Google ----- */
    $("btnGoogle").addEventListener("click", async () => {
        const boton = $("btnGoogle");
        ocupado(boton, true);
        decir("Abriendo Google…", "info");

        try {
            await Nube.iniciarConGoogle();
            /* El navegador se redirige a Google; al volver, alCambiarSesion hace el resto */
        } catch (error) {
            decir(error.message, "error");
            ocupado(boton, false);
        }
    });

    /* ----- Iniciar sesión ----- */
    formularios.entrar.addEventListener("submit", async (evento) => {
        evento.preventDefault();

        const boton = formularios.entrar.querySelector('button[type="submit"]');
        ocupado(boton, true);
        decir("Entrando…", "info");

        try {
            const token = await window.GP_CAPTCHA.token("formEntrar");
            await Nube.iniciarSesion($("correoEntrar").value.trim(), $("claveEntrar").value, token);
            /* El resto ocurre en alCambiarSesion */
        } catch (error) {
            decir(error.message, "error");
        } finally {
            window.GP_CAPTCHA.reiniciar("formEntrar");
            ocupado(boton, false);
        }
    });

    /* ----- Crear cuenta ----- */
    formularios.crear.addEventListener("submit", async (evento) => {
        evento.preventDefault();

        const correo = $("correoCrear").value.trim();
        const clave = $("claveCrear").value;

        if (clave.length < LARGO_MINIMO_CLAVE) {
            decir(`La contraseña debe tener al menos ${LARGO_MINIMO_CLAVE} caracteres.`, "error");
            return;
        }

        if (!/[A-Za-z]/.test(clave) || !/[0-9]/.test(clave)) {
            decir("La contraseña debe combinar letras y números.", "error");
            return;
        }

        if (clave !== $("claveCrear2").value) {
            decir("Las contraseñas no coinciden.", "error");
            return;
        }

        if (!$("aceptoPolitica").checked) {
            decir("Debes aceptar la Política de privacidad y los Términos de uso.", "error");
            return;
        }

        const boton = formularios.crear.querySelector('button[type="submit"]');
        ocupado(boton, true);
        decir("Creando tu cuenta…", "info");

        try {
            const token = await window.GP_CAPTCHA.token("formCrear");
            await Nube.registrar(correo, clave, cfg.VERSION_POLITICA, token);
            formularios.crear.reset();
            mostrar("entrar");
            decir(
                "Listo. Te enviamos un correo para confirmar tu cuenta. " +
                "Revisa tu bandeja (y la carpeta de spam) y luego inicia sesión.",
                "ok"
            );
        } catch (error) {
            decir(error.message, "error");
        } finally {
            window.GP_CAPTCHA.reiniciar("formCrear");
            ocupado(boton, false);
        }
    });

    /* ----- Recuperar contraseña ----- */
    formularios.recuperar.addEventListener("submit", async (evento) => {
        evento.preventDefault();

        const boton = formularios.recuperar.querySelector('button[type="submit"]');
        ocupado(boton, true);

        try {
            const token = await window.GP_CAPTCHA.token("formRecuperar");
            await Nube.recuperarClave($("correoRecuperar").value.trim(), token);
            mostrar("entrar");
            /* Mismo mensaje exista o no la cuenta (no revela quién está registrado) */
            decir("Si el correo está registrado, recibirás un enlace para crear una nueva contraseña.", "ok");
        } catch (error) {
            decir(error.message, "error");
        } finally {
            window.GP_CAPTCHA.reiniciar("formRecuperar");
            ocupado(boton, false);
        }
    });

    formularios.nueva.addEventListener("submit", async (evento) => {
        evento.preventDefault();

        const clave = $("claveNueva").value;

        if (clave.length < LARGO_MINIMO_CLAVE || !/[A-Za-z]/.test(clave) || !/[0-9]/.test(clave)) {
            decir(`Usa al menos ${LARGO_MINIMO_CLAVE} caracteres, con letras y números.`, "error");
            return;
        }

        if (clave !== $("claveNueva2").value) {
            decir("Las contraseñas no coinciden.", "error");
            return;
        }

        const boton = formularios.nueva.querySelector('button[type="submit"]');
        ocupado(boton, true);

        try {
            await Nube.cambiarClave(clave);
            recuperandoClave = false;
            formularios.nueva.reset();
            await entrar(await Nube.obtenerSesion());
        } catch (error) {
            decir(error.message, "error");
        } finally {
            ocupado(boton, false);
        }
    });

    /* ----- Suscripción: prueba, planes y modo solo lectura ----- */
    const DIA_MS = 86400000;

    /* Solo para mostrar avisos; quien manda es el servidor (reglas de la base de datos) */
    function calcularAcceso(fila, ahora = new Date()) {
        if (!fila) return { acceso: true, estado: "desconocido", dias: null };

        const hasta = (valor) => (valor ? new Date(valor) : null);

        if (fila.estado === "cortesia") return { acceso: true, estado: "cortesia", dias: null };

        if (fila.estado === "prueba" && hasta(fila.prueba_hasta) > ahora) {
            return { acceso: true, estado: "prueba", dias: Math.ceil((hasta(fila.prueba_hasta) - ahora) / DIA_MS) };
        }

        if (["activa", "cancelada"].includes(fila.estado) && hasta(fila.acceso_hasta) > ahora) {
            return { acceso: true, estado: fila.estado, dias: null, fin: hasta(fila.acceso_hasta) };
        }

        return { acceso: false, estado: fila.estado === "prueba" ? "prueba_vencida" : "sin_suscripcion", dias: null };
    }

    const TEXTO_SOLO_LECTURA =
        "Puedes ver y descargar tus datos, pero no registrar nada nuevo hasta que te suscribas.";

    /* Mensaje que no debe borrarse mientras se espera la confirmación de un pago */
    let mensajeFijo = null;

    function aplicarAcceso(info) {
        const aviso = $("avisoSuscripcion");
        let texto = "";
        let nivel = "info";

        if (info.estado === "prueba") {
            texto = `Prueba gratis: te quedan ${info.dias} ${info.dias === 1 ? "día" : "días"}.`;
            nivel = info.dias <= 3 ? "aviso" : "info";
        } else if (info.estado === "cancelada") {
            texto = `Tu suscripción termina el ${info.fin.toLocaleDateString((window.GP_IDIOMA ? window.GP_IDIOMA.locale() : "es-PE"))}.`;
            nivel = "aviso";
        } else if (!info.acceso) {
            texto = `${info.estado === "prueba_vencida" ? "Tu prueba terminó." : "Tu suscripción terminó."} ${TEXTO_SOLO_LECTURA}`;
            nivel = "error";
        }

        window.GP_ACCESO = Object.freeze({ acceso: info.acceso, estado: info.estado, dias: info.dias });
        document.body.dataset.acceso = info.acceso ? "si" : "no";

        if (mensajeFijo) {
            texto = mensajeFijo;
            nivel = "info";
        }

        $("textoSuscripcion").textContent = texto;
        aviso.dataset.nivel = nivel;
        aviso.hidden = texto === "";

        /* Formulario de Finanzas: bloquear registrar e importar (descargar y borrar siguen activos) */
        if ($("btnImportarCSV")) $("btnImportarCSV").disabled = !info.acceso;
        const registrar = $("formOperacion")?.querySelector('button[type="submit"]');
        if (registrar) registrar.disabled = !info.acceso;
        if ($("mensajeOperacion") && !info.acceso) $("mensajeOperacion").textContent = TEXTO_SOLO_LECTURA;

        /* "Gestionar suscripción": solo para quien ya pagó alguna vez (no en prueba ni cortesía) */
        $("btnGestionar").hidden = !["activa", "cancelada", "sin_suscripcion"].includes(info.estado);

        document.dispatchEvent(new CustomEvent("gp-acceso"));
    }

    async function cargarAcceso() {
        try {
            aplicarAcceso(calcularAcceso(await Nube.miAcceso()));
        } catch (error) {
            /* Si no se puede leer, no se bloquea nada en pantalla: el servidor decide */
            console.error("No se pudo leer la suscripción:", error);
        }
    }

    const dlgPlanes = $("dlgPlanes");

    /* Pide al servidor el pago de ESTE cliente y lo abre (solo direcciones https de Polar) */
    async function abrirPago() {
        const boton = $("btnSuscribirme");
        boton.disabled = true;
        boton.textContent = "Abriendo pago…";
        $("textoEstadoPlan").textContent = "";

        try {
            const url = await Nube.crearPago();
            const destino = new URL(url);

            if (destino.protocol !== "https:" || !/(^|\.)polar\.sh$/.test(destino.hostname)) {
                throw new Error("No se pudo abrir el pago. Inténtalo de nuevo en unos minutos.");
            }

            window.location.assign(destino.href);
        } catch (error) {
            $("textoEstadoPlan").textContent = error.message;
            boton.disabled = false;
            boton.textContent = "Suscribirme";
        }
    }

    /* Portal de Polar: cancelar, cambiar tarjeta, facturas (solo direcciones https de Polar) */
    $("btnGestionar").addEventListener("click", async () => {
        const boton = $("btnGestionar");
        boton.disabled = true;
        $("mensajeCuenta").textContent = "";

        try {
            const destino = new URL(await Nube.abrirPortal());

            if (destino.protocol !== "https:" || !/(^|\.)polar\.sh$/.test(destino.hostname)) {
                throw new Error("No se pudo abrir el portal. Inténtalo de nuevo en unos minutos.");
            }

            window.location.assign(destino.href);
        } catch (error) {
            $("mensajeCuenta").textContent = error.message;
            boton.disabled = false;
        }
    });

    /* Al volver del pago: el aviso de Polar puede tardar unos segundos en llegar */
    async function esperarActivacion() {
        const parametros = new URLSearchParams(window.location.search);

        if (parametros.get("pago") !== "ok") return;

        parametros.delete("pago");
        const resto = parametros.toString();
        window.history.replaceState(null, "", window.location.pathname + (resto ? `?${resto}` : "") + window.location.hash);

        const aviso = $("avisoSuscripcion");
        mensajeFijo = "Pago recibido. Estamos activando tu suscripción…";
        $("textoSuscripcion").textContent = mensajeFijo;
        aviso.dataset.nivel = "info";
        aviso.hidden = false;

        for (let intento = 0; intento < 10; intento++) {
            await new Promise((resolver) => setTimeout(resolver, 3000));
            await cargarAcceso();

            if (window.GP_ACCESO?.estado === "activa") {
                mensajeFijo = "¡Suscripción activa! Gracias por confiar en GananciaPro.";
                $("textoSuscripcion").textContent = mensajeFijo;
                aviso.hidden = false;
                return;
            }
        }

        mensajeFijo =
            "Recibimos tu pago, pero la activación está tardando. Recarga la página en un minuto; si sigue igual, escríbenos.";
        $("textoSuscripcion").textContent = mensajeFijo;
        aviso.hidden = false;
    }

    $("btnVerPlanes").addEventListener("click", () => {
        $("textoPrecio").textContent = cfg.PRECIO_TEXTO || "El precio mensual se anunciará al activar los pagos.";
        $("textoEstadoPlan").textContent = $("textoSuscripcion").textContent;

        const url = String(cfg.CHECKOUT_URL || "");
        const listo = /^https:\/\//.test(url);
        const boton = $("btnSuscribirme");

        if (cfg.PAGOS_ACTIVOS === true) {
            boton.disabled = false;
            boton.textContent = "Suscribirme";
            boton.onclick = abrirPago;
        } else {
            boton.disabled = !listo;
            boton.textContent = listo ? "Suscribirme" : "Suscribirme (próximamente)";
            boton.onclick = listo ? () => window.open(url, "_blank", "noopener,noreferrer") : null;
        }

        dlgPlanes.showModal();
    });

    $("btnCerrarPlanes").addEventListener("click", () => dlgPlanes.close());

    /* ----- Entrar a la app ----- */
    async function entrar(sesion) {
        if (!sesion || recuperandoClave) return;
        if (usuarioCargado === sesion.user.id) return;

        usuarioCargado = sesion.user.id;

        try {
            const aceptada = sesion.user.user_metadata?.acepto_politica;

            if (!(await Nube.tieneConsentimiento())) {
                if (aceptada) {
                    await Nube.registrarConsentimiento(aceptada);
                } else {
                    $("correoConsentimiento").textContent = sesion.user.email || "";
                    estado("consentimiento");
                    return;
                }
            }

            await App.cargar();

            $("correoUsuario").textContent = sesion.user.email || "";
            $("correoUsuario").title = sesion.user.email || "";
            $("cuenta").hidden = false;
            await cargarAcceso();
            estado("si");
            esperarActivacion();
            revisarMigracion(sesion.user.id);
        } catch (error) {
            usuarioCargado = null;
            estado("no");
            mostrar("entrar");
            decir(error.message, "error");
        }
    }

    /* ----- Consentimiento para cuentas sin constancia ----- */
    $("btnAceptarConsentimiento").addEventListener("click", async () => {
        if (!$("aceptoConsentimiento").checked) {
            $("mensajeConsentimiento").textContent =
                "Marca la casilla para continuar.";
            return;
        }

        try {
            await Nube.registrarConsentimiento(cfg.VERSION_POLITICA);
            usuarioCargado = null;
            await entrar(await Nube.obtenerSesion());
        } catch (error) {
            $("mensajeConsentimiento").textContent = error.message;
        }
    });

    /* ----- Cerrar sesión ----- */
    async function salir() {
        try {
            await Nube.cerrarSesion();
        } finally {
            window.location.reload();
        }
    }

    $("btnSalir").addEventListener("click", salir);
    $("btnSalirConsentimiento").addEventListener("click", salir);

    /* ----- Datos antiguos de este navegador ----- */
    function leerFlag(clave) {
        try {
            return localStorage.getItem(clave);
        } catch (error) {
            return null;
        }
    }

    function revisarMigracion(idUsuario) {
        const flag = `gananciapro_migrado_${idUsuario}`;

        if (leerFlag(flag)) return;

        const locales = App.operacionesLocales();

        if (locales.length === 0) return;

        $("textoMigracion").textContent =
            `Encontramos ${locales.length} ${locales.length === 1 ? "operación guardada" : "operaciones guardadas"} en este navegador, de antes de crear tu cuenta. ` +
            "¿Quieres subirlas a tu cuenta? Los datos de este navegador no se borran.";
        $("migracion").hidden = false;

        $("btnSubirLocales").onclick = async () => {
            const boton = $("btnSubirLocales");
            ocupado(boton, true);

            try {
                await Nube.crearOperaciones(locales);

                try {
                    localStorage.setItem(flag, "1");
                } catch (error) {
                    /* Sin almacenamiento: volverá a preguntar */
                }

                await App.cargar();
                $("migracion").hidden = true;
            } catch (error) {
                $("textoMigracion").textContent = `No se pudieron subir: ${error.message}`;
                ocupado(boton, false);
            }
        };

        $("btnOmitirMigracion").onclick = () => {
            $("migracion").hidden = true;
        };
    }

    /* ----- Descargar todos mis datos (derecho de portabilidad): operaciones, almacén, fotos no incluidas ----- */
    $("btnExportarCuenta").addEventListener("click", async () => {
        const boton = $("btnExportarCuenta");
        ocupado(boton, true);

        try {
            const datos = await Nube.exportarTodo();
            const archivo = new Blob([JSON.stringify(datos, null, 2)], { type: "application/json" });
            const url = URL.createObjectURL(archivo);
            const enlace = document.createElement("a");
            enlace.href = url;
            enlace.download = "GananciaPro-mis-datos.json";
            document.body.appendChild(enlace);
            enlace.click();
            enlace.remove();
            URL.revokeObjectURL(url);
        } catch (error) {
            $("mensajeCuenta").textContent = `No se pudo descargar: ${error.message}`;
        } finally {
            ocupado(boton, false);
        }
    });

    /* ----- Restaurar operaciones desde el respaldo JSON (sin duplicar las que ya existen) ----- */
    const MAX_RESTAURAR = 5000;
    const clave = (o) => [o.fecha, o.tipo, o.descripcion, Number(o.importe), o.moneda].join("|");
    const limpia = (t) => String(t || "").replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim().slice(0, 30);

    $("btnRestaurarCuenta").addEventListener("click", () => $("archivoRestaurar").click());

    $("archivoRestaurar").addEventListener("change", async (evento) => {
        const archivo = evento.target.files[0];
        const boton = $("btnRestaurarCuenta");
        const salida = $("mensajeCuenta");
        evento.target.value = "";
        if (!archivo) return;

        ocupado(boton, true);
        try {
            if (archivo.size > 5 * 1024 * 1024) throw new Error("El archivo es demasiado grande.");
            const datos = JSON.parse(await archivo.text());
            if (!datos || !Array.isArray(datos.operaciones)) throw new Error("Este archivo no es un respaldo de GananciaPro.");
            if (datos.operaciones.length > MAX_RESTAURAR) throw new Error(`Máximo ${MAX_RESTAURAR} operaciones por restauración.`);

            const validas = datos.operaciones.map((o, i) => {
                const importe = Number(o && o.importe);
                const descripcion = String((o && o.descripcion) || "").trim();
                if (
                    !o || !/^\d{4}-\d{2}-\d{2}$/.test(String(o.fecha)) ||
                    !["ingreso", "gasto"].includes(o.tipo) ||
                    !/^[A-Z]{3}$/.test(String(o.moneda)) ||
                    !Number.isFinite(importe) || importe <= 0 || importe > 100000000 ||
                    !descripcion || descripcion.length > 100
                ) throw new Error(`La operación ${i + 1} del respaldo no es válida. No se restauró nada.`);
                return { fecha: o.fecha, tipo: o.tipo, descripcion, importe, moneda: o.moneda, categoria: limpia(o.categoria) };
            });

            const existentes = new Set((await Nube.listarOperaciones()).map(clave));
            const nuevas = validas.filter((o) => !existentes.has(clave(o)));
            if (nuevas.length === 0) {
                salida.textContent = "Tu respaldo no trae nada nuevo: todo ya estaba en tu cuenta.";
                return;
            }

            await Nube.crearOperaciones(nuevas);
            salida.textContent = `Se restauraron ${nuevas.length} operaciones. Recargando…`;
            setTimeout(() => window.location.reload(), 900);
        } catch (error) {
            salida.textContent = error instanceof SyntaxError ? "El archivo no se puede leer." : `No se pudo restaurar: ${error.message}`;
        } finally {
            ocupado(boton, false);
        }
    });

    /* ----- Eliminar cuenta (derecho de supresión) ----- */
    $("btnEliminarCuenta").addEventListener("click", async () => {
        const respuesta = window.prompt(
            "Esto elimina tu cuenta y TODOS tus datos (operaciones, almacén y fotos) de forma permanente. " +
            "No se puede deshacer.\n\nSi quieres conservar una copia, cancela y usa " +
            "«Descargar mis datos» primero.\n\nPara confirmar, escribe ELIMINAR:"
        );

        if (!["ELIMINAR", "DELETE"].includes(String(respuesta || "").trim().toUpperCase())) return;

        const boton = $("btnEliminarCuenta");
        ocupado(boton, true);

        try {
            await Nube.eliminarCuenta();
            window.alert("Tu cuenta y tus datos fueron eliminados.");
            window.location.reload();
        } catch (error) {
            $("mensajeCuenta").textContent = `No se pudo eliminar la cuenta: ${error.message}`;
            ocupado(boton, false);
        }
    });

    /* ----- Arranque ----- */
    if (!Nube || !App || !cfg) {
        estado("no");
        decir("No se pudo cargar el sistema de cuentas. Recarga la página.", "error");
        return;
    }

    mostrar("entrar");

    Nube.alCambiarSesion((evento, sesion) => {
        /* setTimeout evita bloqueos al llamar a Supabase dentro de este callback */
        setTimeout(() => {
            if (evento === "PASSWORD_RECOVERY") {
                recuperandoClave = true;
                estado("no");
                mostrar("nueva");
                return;
            }

            if (evento === "SIGNED_OUT") {
                if (usuarioCargado) window.location.reload();
                return;
            }

            if (sesion) {
                entrar(sesion);
            } else if (evento === "INITIAL_SESSION") {
                estado("no");
            }
        }, 0);
    });
})();
