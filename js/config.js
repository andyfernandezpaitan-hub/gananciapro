"use strict";

/* Configuración pública de GananciaPro.
   La clave "publishable" es PÚBLICA por diseño: la seguridad real está en las
   reglas RLS de la base de datos (cada cliente solo accede a sus datos).
   NUNCA pongas aquí la "secret key" ni la "service_role". */
window.GANANCIAPRO_CONFIG = Object.freeze({
    SUPABASE_URL: "https://ckipjthrubmhvwphkhyf.supabase.co",
    SUPABASE_CLAVE_PUBLICA: "sb_publishable_fOVtl4aovGr8zg2TBAPiUA_swtuMq9z",
    VERSION_POLITICA: "2026-10",

    /* Pon true SOLO cuando Google esté configurado en Supabase y la página esté publicada */
    GOOGLE_ACTIVO: true
});