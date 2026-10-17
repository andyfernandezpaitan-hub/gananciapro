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

    /* ----- Iniciar sesión ----- */
    formularios.entrar.addEventListener("submit", async (evento) => {
        evento.preventDefault();

        const boton = formularios.entrar.querySelector('button[type="submit"]');
        ocupado(boton, true);
        decir("Entrando…", "info");

        try {
            await Nube.iniciarSesion($("correoEntrar").value.trim(), $("claveEntrar").value);
            /* El resto ocurre en alCambiarSesion */
        } catch (error) {
            decir(error.message, "error");
        } finally {
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
            await Nube.registrar(correo, clave, cfg.VERSION_POLITICA);
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
            ocupado(boton, false);
        }
    });

    /* ----- Recuperar contraseña ----- */
    formularios.recuperar.addEventListener("submit", async (evento) => {
        evento.preventDefault();

        const boton = formularios.recuperar.querySelector('button[type="submit"]');
        ocupado(boton, true);

        try {
            await Nube.recuperarClave($("correoRecuperar").value.trim());
            mostrar("entrar");
            /* Mismo mensaje exista o no la cuenta (no revela quién está registrado) */
            decir("Si el correo está registrado, recibirás un enlace para crear una nueva contraseña.", "ok");
        } catch (error) {
            decir(error.message, "error");
        } finally {
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
            $("cuenta").hidden = false;
            estado("si");
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
            `Encontramos ${locales.length} operaciones guardadas en este navegador, de antes de crear tu cuenta. ` +
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

    /* ----- Eliminar cuenta (derecho de supresión) ----- */
    $("btnEliminarCuenta").addEventListener("click", async () => {
        const respuesta = window.prompt(
            "Esto elimina tu cuenta y TODAS tus operaciones de forma permanente. " +
            "No se puede deshacer.\n\nSi quieres conservar una copia, cancela y usa " +
            "«Descargar mis datos» primero.\n\nPara confirmar, escribe ELIMINAR:"
        );

        if (respuesta !== "ELIMINAR") return;

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