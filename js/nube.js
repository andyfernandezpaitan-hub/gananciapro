"use strict";

/* Capa de acceso a Supabase (cuentas y operaciones de cada cliente).
   El resto de la app solo habla con window.Nube; nunca con Supabase directamente. */
(function () {
    const cfg = window.GANANCIAPRO_CONFIG;

    if (!cfg || !window.supabase || typeof window.supabase.createClient !== "function") {
        console.error("No se pudo cargar el sistema de cuentas (falta supabase-js o config.js).");
        window.Nube = null;
        return;
    }

    const cliente = window.supabase.createClient(
        cfg.SUPABASE_URL,
        cfg.SUPABASE_CLAVE_PUBLICA,
        {
            auth: {
                persistSession: true,
                autoRefreshToken: true,
                detectSessionInUrl: true
            }
        }
    );

    const COLUMNAS = "id, fecha, tipo, descripcion, importe, moneda";
    const COLUMNAS_PRODUCTO = "id, nombre, talla, color, codigo, stock, activo, categoria_id";
    const TAMANO_PAGINA = 1000;
    const TAMANO_LOTE = 500;

    /* Mensajes claros para el cliente (sin revelar detalles técnicos) */
    function traducirError(error) {
        const texto = String(error?.message || error || "").toLowerCase();
        const codigo = String(error?.code || "").toLowerCase();

        /* Mensajes escritos por nuestras funciones del servidor (ya vienen en español) */
        if (codigo === "p0001" && error?.message) {
            return error.message;
        }
        if (codigo === "23505") {
            return "Ya existe un registro igual (mismo nombre, talla y color, o el mismo código).";
        }
        if (codigo === "23514" || codigo === "22001") {
            return "Algún dato no cumple los límites permitidos. Revísalo.";
        }
        if (codigo === "pgrst205" || codigo === "42p01") {
            return "El almacén aún no está activado en tu base de datos.";
        }
        if (codigo === "42501") {
            return "No tienes permiso para realizar esta acción.";
        }

        if (texto.includes("invalid login credentials")) {
            return "Correo o contraseña incorrectos.";
        }
        if (texto.includes("email not confirmed")) {
            return "Debes confirmar tu correo antes de entrar. Revisa tu bandeja de entrada.";
        }
        if (codigo === "over_email_send_rate_limit" || texto.includes("email rate limit")) {
            return "Se alcanzó el límite de correos por ahora. Inténtalo más tarde.";
        }
        if (codigo === "over_request_rate_limit" || texto.includes("rate limit") || error?.status === 429) {
            return "Demasiados intentos. Espera unos minutos e inténtalo de nuevo.";
        }
        if (codigo === "weak_password" || texto.includes("password should")) {
            return "La contraseña es demasiado débil. Usa al menos 10 caracteres con letras y números.";
        }
        if (texto.includes("captcha")) {
            return "No se pudo verificar que eres una persona. Inténtalo de nuevo.";
        }
        if (texto.includes("failed to fetch") || texto.includes("network")) {
            return "No hay conexión con el servidor. Revisa tu internet.";
        }
        if (texto.includes("jwt") || texto.includes("session")) {
            return "Tu sesión venció. Inicia sesión de nuevo.";
        }

        console.error("Error de Supabase:", error);
        return "Ocurrió un error. Inténtalo de nuevo.";
    }

    function comprobar(resultado) {
        if (resultado?.error) {
            throw new Error(traducirError(resultado.error));
        }
        return resultado;
    }

    function aOperacion(fila) {
        return {
            id: fila.id,
            fecha: fila.fecha,
            tipo: fila.tipo,
            descripcion: fila.descripcion,
            importe: Number(fila.importe),
            moneda: fila.moneda
        };
    }

    function aFila(operacion) {
        return {
            fecha: operacion.fecha,
            tipo: operacion.tipo,
            descripcion: operacion.descripcion,
            importe: operacion.importe,
            moneda: operacion.moneda
        };
    }

    const Nube = {
        /* ----- Sesión ----- */
        async obtenerSesion() {
            const { data } = comprobar(await cliente.auth.getSession());
            return data.session;
        },

        alCambiarSesion(callback) {
            return cliente.auth.onAuthStateChange((evento, sesion) => callback(evento, sesion));
        },

        async registrar(correo, clave, versionPolitica, captchaToken) {
            const opciones = {
                data: {
                    acepto_politica: versionPolitica,
                    acepto_en: new Date().toISOString()
                }
            };

            if (location.protocol === "https:") {
                opciones.emailRedirectTo = location.origin + location.pathname;
            }

            if (captchaToken) {
                opciones.captchaToken = captchaToken;
            }

            comprobar(await cliente.auth.signUp({ email: correo, password: clave, options: opciones }));
        },

        async iniciarSesion(correo, clave, captchaToken) {
            const credenciales = { email: correo, password: clave };

            if (captchaToken) {
                credenciales.options = { captchaToken };
            }

            comprobar(await cliente.auth.signInWithPassword(credenciales));
        },

        /* Entrar con Google (solo desde la página publicada con HTTPS, o localhost) */
        async iniciarConGoogle() {
            const permitido =
                location.protocol === "https:" ||
                location.hostname === "localhost" ||
                location.hostname === "127.0.0.1";

            if (!permitido) {
                throw new Error(
                    "Entrar con Google solo funciona desde la página publicada, no desde un archivo local."
                );
            }

            comprobar(
                await cliente.auth.signInWithOAuth({
                    provider: "google",
                    options: {
                        redirectTo: location.origin + location.pathname,
                        queryParams: { prompt: "select_account" }
                    }
                })
            );
        },

        async cerrarSesion() {
            await cliente.auth.signOut();
        },

        async recuperarClave(correo, captchaToken) {
            const opciones = {};

            if (location.protocol === "https:") {
                opciones.redirectTo = location.origin + location.pathname;
            }

            if (captchaToken) {
                opciones.captchaToken = captchaToken;
            }

            comprobar(await cliente.auth.resetPasswordForEmail(correo, opciones));
        },

        async cambiarClave(nuevaClave) {
            comprobar(await cliente.auth.updateUser({ password: nuevaClave }));
        },

        /* ----- Consentimiento ----- */
        async tieneConsentimiento() {
            const { data } = comprobar(
                await cliente.from("consentimientos").select("id").limit(1)
            );
            return Array.isArray(data) && data.length > 0;
        },

        async registrarConsentimiento(version) {
            comprobar(
                await cliente.from("consentimientos").insert([{ version_politica: String(version) }])
            );
        },

        /* ----- Operaciones (cada cliente solo ve las suyas: RLS) ----- */
        async listarOperaciones() {
            const todas = [];

            for (let desde = 0; ; desde += TAMANO_PAGINA) {
                const { data } = comprobar(
                    await cliente
                        .from("operaciones")
                        .select(COLUMNAS)
                        .order("fecha", { ascending: true })
                        .order("creado_en", { ascending: true })
                        .range(desde, desde + TAMANO_PAGINA - 1)
                );

                todas.push(...data.map(aOperacion));

                if (data.length < TAMANO_PAGINA) break;
            }

            return todas;
        },

        async crearOperacion(operacion) {
            const { data } = comprobar(
                await cliente.from("operaciones").insert([aFila(operacion)]).select(COLUMNAS).single()
            );
            return aOperacion(data);
        },

        /* Inserta por lotes; si un lote falla, deshace lo ya insertado (no deja datos a medias). */
        async crearOperaciones(lista) {
            const creadas = [];

            try {
                for (let i = 0; i < lista.length; i += TAMANO_LOTE) {
                    const lote = lista.slice(i, i + TAMANO_LOTE).map(aFila);
                    const { data } = comprobar(
                        await cliente.from("operaciones").insert(lote).select(COLUMNAS)
                    );
                    creadas.push(...data.map(aOperacion));
                }
            } catch (error) {
                if (creadas.length > 0) {
                    try {
                        await Nube.borrarOperaciones(creadas.map((operacion) => operacion.id));
                    } catch (errorDeshacer) {
                        console.error("No se pudo deshacer la carga parcial:", errorDeshacer);
                    }
                }
                throw error;
            }

            return creadas;
        },

        async borrarOperacion(id) {
            const { data } = comprobar(
                await cliente.from("operaciones").delete().eq("id", id).select("id")
            );

            if (!Array.isArray(data) || data.length === 0) {
                throw new Error("No se encontró la operación o no tienes permiso para borrarla.");
            }
        },

        async borrarOperaciones(ids) {
            for (let i = 0; i < ids.length; i += 100) {
                comprobar(
                    await cliente.from("operaciones").delete().in("id", ids.slice(i, i + 100))
                );
            }
        },

        /* ----- Almacén ----- */
        async listarCategorias() {
            const { data } = comprobar(
                await cliente.from("almacen_categorias").select("id, nombre, activa").order("nombre")
            );
            return data;
        },

        async crearCategoria(nombre) {
            const { data } = comprobar(
                await cliente.from("almacen_categorias").insert([{ nombre }]).select("id, nombre, activa").single()
            );
            return data;
        },

        async listarProductos() {
            const todos = [];

            for (let desde = 0; ; desde += TAMANO_PAGINA) {
                const { data } = comprobar(
                    await cliente
                        .from("almacen_productos")
                        .select(COLUMNAS_PRODUCTO)
                        .order("nombre", { ascending: true })
                        .range(desde, desde + TAMANO_PAGINA - 1)
                );

                todos.push(...data);

                if (data.length < TAMANO_PAGINA) break;
            }

            return todos;
        },

        async crearProducto(producto) {
            const { data } = comprobar(
                await cliente.from("almacen_productos").insert([producto]).select(COLUMNAS_PRODUCTO).single()
            );
            return data;
        },

        async actualizarProducto(id, cambios) {
            const { data } = comprobar(
                await cliente.from("almacen_productos").update(cambios).eq("id", id).select(COLUMNAS_PRODUCTO).single()
            );
            return data;
        },

        /* Entradas, pérdidas, daños, uso interno y ajustes (devuelve el stock nuevo) */
        async registrarMovimiento(productoId, tipo, cantidad, nota) {
            const { data } = comprobar(
                await cliente.rpc("almacen_registrar_movimiento", {
                    p_producto_id: productoId,
                    p_tipo: tipo,
                    p_cantidad: cantidad,
                    p_nota: nota || null
                })
            );
            return data;
        },

        /* Historial de movimientos (más recientes primero), por páginas */
        async listarMovimientos({ desde = 0, limite = 50, productoId = "", tipo = "" } = {}) {
            let consulta = cliente
                .from("almacen_movimientos")
                .select("id, producto_id, venta_id, tipo, cantidad, stock_anterior, stock_nuevo, nota, creado_en")
                .order("creado_en", { ascending: false })
                .range(desde, desde + limite - 1);

            if (productoId) consulta = consulta.eq("producto_id", productoId);
            if (tipo) consulta = consulta.eq("tipo", tipo);

            const { data } = comprobar(await consulta);
            return data;
        },

        /* ----- Derecho de eliminación ----- */
        async eliminarCuenta() {
            comprobar(await cliente.rpc("eliminar_mi_cuenta"));

            try {
                await cliente.auth.signOut();
            } catch (error) {
                /* La cuenta ya no existe; se ignora */
            }
        }
    };

    window.Nube = Object.freeze(Nube);
})();