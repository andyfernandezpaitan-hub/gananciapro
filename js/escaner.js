/* Escáner de códigos de barras / QR con la cámara.
   La cámara solo se enciende al pulsar el botón, nunca guarda ni envía imágenes y se apaga al cerrar.
   Usa el detector del navegador si existe; si no, carga la librería local js/vendor/zxing.min.js. */
(function () {
    "use strict";

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) return;

    const OBJETIVOS = ["prodCodigo", "almBusqueda"];
    let dialogo = null;
    let video = null;
    let estado = null;
    let flujo = null;
    let temporizador = null;
    let lectorZX = null;
    let cargaZX = null;
    let destino = null;
    let abierto = false;

    function crearDialogo() {
        dialogo = document.createElement("dialog");
        dialogo.className = "escaner";
        dialogo.setAttribute("aria-labelledby", "escanerTitulo");

        const titulo = document.createElement("h2");
        titulo.id = "escanerTitulo";
        titulo.textContent = "Escanear código";

        video = document.createElement("video");
        video.setAttribute("playsinline", "");
        video.muted = true;
        video.setAttribute("aria-label", "Vista de la cámara");

        estado = document.createElement("p");
        estado.className = "nota";
        estado.setAttribute("role", "status");
        estado.setAttribute("aria-live", "polite");

        const cerrar = document.createElement("button");
        cerrar.type = "button";
        cerrar.className = "btn-secundario";
        cerrar.textContent = "Cancelar";
        cerrar.addEventListener("click", cerrarEscaner);

        dialogo.append(titulo, video, estado, cerrar);
        dialogo.addEventListener("close", detener);
        dialogo.addEventListener("cancel", detener);
        document.body.appendChild(dialogo);
    }

    function detener() {
        abierto = false;
        if (temporizador) { clearInterval(temporizador); temporizador = null; }
        if (lectorZX) { try { lectorZX.reset(); } catch (e) { /* nada */ } lectorZX = null; }
        if (flujo) { flujo.getTracks().forEach((t) => t.stop()); flujo = null; }
        if (video) video.srcObject = null;
    }

    function cerrarEscaner() {
        detener();
        if (dialogo && dialogo.open) dialogo.close();
    }

    function limpiar(texto, max) {
        return String(texto).replace(/[\u0000-\u001f\u007f]/g, "").trim().slice(0, max);
    }

    function alEncontrar(texto) {
        if (!abierto || !destino) return;
        const campo = document.getElementById(destino);
        const valor = limpiar(texto, campo && campo.maxLength > 0 ? campo.maxLength : 60);
        if (!campo || !valor) return;
        campo.value = valor;
        campo.dispatchEvent(new Event("input", { bubbles: true }));
        campo.dispatchEvent(new Event("change", { bubbles: true }));
        cerrarEscaner();
        campo.focus();
    }

    function cargarZXing() {
        if (window.ZXing) return Promise.resolve();
        if (!cargaZX) {
            cargaZX = new Promise((resolver, rechazar) => {
                const s = document.createElement("script");
                s.src = "js/vendor/zxing.min.js";
                s.onload = resolver;
                s.onerror = () => { cargaZX = null; rechazar(new Error("No se pudo cargar el lector.")); };
                document.head.appendChild(s);
            });
        }
        return cargaZX;
    }

    const RESTRICCIONES = { audio: false, video: { facingMode: { ideal: "environment" } } };

    async function iniciar() {
        estado.textContent = "Pidiendo permiso de cámara…";
        try {
            if ("BarcodeDetector" in window) {
                const soportados = await window.BarcodeDetector.getSupportedFormats();
                const detector = new window.BarcodeDetector({ formats: soportados });
                flujo = await navigator.mediaDevices.getUserMedia(RESTRICCIONES);
                if (!abierto) { detener(); return; }
                video.srcObject = flujo;
                await video.play();
                estado.textContent = "Apunta al código de barras o QR.";
                let leyendo = false;
                temporizador = setInterval(async () => {
                    if (leyendo || video.readyState < 2) return;
                    leyendo = true;
                    try {
                        const codigos = await detector.detect(video);
                        if (codigos.length) alEncontrar(codigos[0].rawValue);
                    } catch (e) { /* un cuadro fallido no importa */ }
                    leyendo = false;
                }, 250);
            } else {
                await cargarZXing();
                if (!abierto) return;
                lectorZX = new window.ZXing.BrowserMultiFormatReader();
                estado.textContent = "Apunta al código de barras o QR.";
                await lectorZX.decodeFromConstraints(RESTRICCIONES, video, (resultado) => {
                    if (resultado) alEncontrar(resultado.getText());
                });
            }
        } catch (e) {
            const negado = e && (e.name === "NotAllowedError" || e.name === "SecurityError");
            estado.textContent = negado
                ? "No diste permiso a la cámara. Actívalo en el candado de la barra de direcciones y vuelve a intentar."
                : "No se pudo usar la cámara en este dispositivo. Escribe el código a mano.";
            detener();
            abierto = false;
        }
    }

    function abrirEscaner(idCampo) {
        if (!dialogo) crearDialogo();
        destino = idCampo;
        abierto = true;
        if (!dialogo.open) dialogo.showModal();
        iniciar();
    }

    for (const id of OBJETIVOS) {
        const campo = document.getElementById(id);
        if (!campo || !campo.parentElement) continue;
        const boton = document.createElement("button");
        boton.type = "button";
        boton.className = "btn-secundario btn-chico btn-escanear";
        boton.textContent = "Escanear con cámara";
        boton.addEventListener("click", () => abrirEscaner(id));
        campo.insertAdjacentElement("afterend", boton);
    }

    document.addEventListener("visibilitychange", () => { if (document.hidden) cerrarEscaner(); });
})();
