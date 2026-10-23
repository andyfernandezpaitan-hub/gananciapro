"use strict";

/* Configuración pública de GananciaPro.
   La clave "publishable" es PÚBLICA por diseño: la seguridad real está en las
   reglas RLS de la base de datos (cada cliente solo accede a sus datos).
   NUNCA pongas aquí la "secret key" ni la "service_role". */
window.GANANCIAPRO_CONFIG = Object.freeze({
    SUPABASE_URL: "https://ckipjthrubmhvwphkhyf.supabase.co",
    SUPABASE_CLAVE_PUBLICA: "sb_publishable_fOVtl4aovGr8zg2TBAPiUA_swtuMq9z",
    VERSION_POLITICA: "2026-10-21",

    /* Cloudflare Turnstile: clave del SITIO (pública). La secreta va solo en Supabase. */
    TURNSTILE_CLAVE_SITIO: "0x4AAAAAAFhvT7pN9mnQ_U6d",

    /* Pon true SOLO cuando Google esté configurado en Supabase y la página esté publicada */
    GOOGLE_ACTIVO: true,

    /* Cobros: se completan cuando el proveedor de pagos esté configurado.
       Deja CHECKOUT_URL vacío y el botón "Suscribirme" aparece como "Próximamente". */
    PRECIO_TEXTO: "",
    CHECKOUT_URL: "",

    /* Pon true cuando la función crear-pago y Polar estén listos: el botón "Suscribirme" abre el pago */
    PAGOS_ACTIVOS: true,

    /* Precio que se muestra en la portada pública (el cobro real lo define Polar) */
    PRECIO_LANDING: "9 USD al mes"
});
