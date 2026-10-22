"use strict";

/* Idioma de GananciaPro (español / inglés).
   - Se guarda en su propia clave (gananciapro_idioma); NO toca los datos.
   - Traduce el texto de la página y los mensajes que genera la app.
   - Lo que no esté en el diccionario se queda en español (nunca se rompe nada).
   - Los datos del usuario (nombres de productos, descripciones…) no se traducen. */
(function () {
    const CLAVE = "gananciapro_idioma";
    const raiz = document.documentElement;

    function leerGuardado() {
        try {
            const v = localStorage.getItem(CLAVE);
            if (v === "es" || v === "en") return v;
        } catch (e) { /* sin almacenamiento */ }
        const nav = (navigator.language || "es").toLowerCase();
        return nav.startsWith("es") ? "es" : "en";
    }

    let idioma = leerGuardado();
    raiz.setAttribute("lang", idioma);

    /* ---------- Diccionario exacto (español → inglés) ---------- */
    const D = {
        // Portada y cabecera
        "Control inteligente de tu negocio": "Smart control of your business",
        "Qué incluye": "What's included", "Cómo funciona": "How it works", "Precio": "Pricing", "Preguntas": "FAQ",
        "Iniciar sesión": "Log in", "Cerrar sesión": "Log out",
        "TU NEGOCIO, BAJO CONTROL": "YOUR BUSINESS, UNDER CONTROL",
        "+ Agregar talla": "+ Add size", "+ Agregar otro producto": "+ Add another product",
        "Mira tu ganancia": "See your profit",
        ", sin tarjeta.": ", no card required.",
        "Controla tus productos y su stock.": "Control your products and their stock.",
        "Organiza tus números y toma mejores decisiones para tu negocio.": "Organize your numbers and make better decisions for your business.",
        "Tus ingresos, gastos y almacén,": "Your income, expenses and warehouse,",
        "en un solo lugar.": "in one place.",
        "Registra cada venta y cada gasto, controla tu inventario y mira tu ganancia real. En tu moneda, desde cualquier dispositivo.": "Record every sale and expense, control your inventory and see your real profit. In your currency, from any device.",
        "Empezar gratis": "Start free", "Ver cómo funciona": "See how it works",
        "Prueba gratis 14 días · Sin tarjeta": "14-day free trial · No card needed",
        "Todo lo que tu negocio necesita.": "Everything your business needs.",
        "Finanzas claras": "Clear finances",
        "Anota ingresos y gastos en segundos y ve tu ganancia al instante. Filtra, busca y exporta a CSV cuando quieras.": "Log income and expenses in seconds and see your profit instantly. Filter, search and export to CSV whenever you want.",
        "Almacén con control": "Controlled warehouse",
        "Productos con categoría automática, entradas y salidas, y cuánto te queda. Cada venta se suma sola a tus finanzas.": "Products with automatic categories, stock in and out, and how much is left. Every sale is added to your finances automatically.",
        "Cada producto se maneja por tallas.": "Each product is managed by size.",
        "cada producto se maneja por tallas.": "each product is managed by size.",
        "Trabaja en soles, dólares, euros y más. Cada cliente elige la moneda de su negocio.": "Work in soles, dollars, euros and more. Each customer picks their business currency.",
        "Tus ingresos y gastos quedan guardados en tu cuenta, privados y disponibles en cualquier dispositivo.": "Your income and expenses are saved in your account, private and available on any device.",
        "Empieza en tres pasos.": "Get started in three steps.",
        "Crea tu cuenta": "Create your account",
        "Con tu correo o con Google. Tus 14 días de prueba empiezan solos.": "With your email or Google. Your 14-day trial starts automatically.",
        "Registra tu día": "Log your day",
        "Anota ventas y gastos, y mueve tu almacén con entradas y salidas.": "Record sales and expenses, and move your stock in and out.",
        "Resumen claro de lo que entra, lo que sale y lo que te queda.": "A clear summary of what comes in, what goes out and what's left.",
        "Un precio simple.": "One simple price.",
        "Pro": "Pro",
        "9 USD al mes": "9 USD per month", "USD 9 al mes": "USD 9 per month",
        "con todo incluido: finanzas, almacén, multimoneda y respaldos.": "everything included: finances, warehouse, multi-currency and backups.",
        "Finanzas y almacén incluidos": "Finance and warehouse included",
        "14 días de prueba gratis": "14-day free trial",
        "14 días de prueba gratis, sin tarjeta": "14-day free trial, no card required",
        "Cancela cuando quieras": "Cancel anytime",
        "Después, suscripción mensual": "Then, monthly subscription",
        "Tus datos son tuyos.": "Your data is yours.",
        "Exporta o borra tus datos en cualquier momento": "Export or delete your data at any time",
        "Cada cuenta ve solo su información. Puedes descargarla o eliminarla cuando quieras desde tu panel. Consulta la": "Each account only sees its own information. You can download or delete it whenever you want from your dashboard. See the",
        "política de privacidad": "privacy policy",
        "Preguntas frecuentes.": "Frequently asked questions.",
        "¿Necesito tarjeta para probar?": "Do I need a card to try it?",
        "No. Creas tu cuenta y tienes 14 días para usar todo.": "No. You create your account and have 14 days to use everything.",
        "¿Qué pasa cuando termina la prueba?": "What happens when the trial ends?",
        "Puedes seguir viendo y descargando tus datos. Para seguir registrando necesitas suscribirte.": "You can keep viewing and downloading your data. To keep recording you need to subscribe.",
        "¿Puedo cancelar?": "Can I cancel?",
        "Sí, cuando quieras desde tu cuenta. Conservas el acceso hasta el final del periodo pagado.": "Yes, anytime from your account. You keep access until the end of the paid period.",
        "¿Puedo usar otra moneda que no sea el sol?": "Can I use a currency other than the sol?",
        "Sí. Cada operación se guarda con la moneda que elijas.": "Yes. Each operation is saved in the currency you choose.",
        "¿Dónde se pagan las suscripciones?": "Where are subscriptions paid?",
        "Con Polar, un procesador de pagos seguro. GananciaPro no guarda los datos de tu tarjeta.": "With Polar, a secure payment processor. GananciaPro does not store your card details.",
        "Privacidad": "Privacy", "Términos": "Terms", "Planes de GananciaPro": "GananciaPro plans",
        "© 2026 GananciaPro ·": "© 2026 GananciaPro ·",
        // Acceso
        "Accede a tu cuenta": "Access your account", "Bienvenido a GananciaPro": "Welcome to GananciaPro",
        "Entrar": "Log in", "Crear cuenta": "Create account", "Crea tu cuenta.": "Create your account.",
        "Correo electrónico": "Email", "Contraseña": "Password", "Repite la contraseña": "Repeat password",
        "Mínimo 10 caracteres, con letras y números.": "At least 10 characters, with letters and numbers.",
        "¿Olvidaste tu contraseña?": "Forgot your password?",
        "Continuar con Google": "Continue with Google", "o con tu correo": "or with your email",
        "Correo de tu cuenta": "Your account email", "Enviar enlace": "Send link",
        "Nueva contraseña": "New password", "Repite la nueva contraseña": "Repeat the new password", "Guardar contraseña": "Save password",
        "Recuperar contraseña": "Reset password", "Crea tu nueva contraseña": "Create your new password",
        "He leído y acepto la": "I have read and accept the", "Política de privacidad": "Privacy Policy",
        "y los": "and the", "Términos de uso": "Terms of Use",
        ", y confirmo que soy mayor de edad.": ", and I confirm I am of legal age.",
        "Antes de continuar": "Before continuing",
        "Si es tu primera vez, te pediremos aceptar la Política de privacidad y los Términos de uso.": "If this is your first time, we will ask you to accept the Privacy Policy and the Terms of Use.",
        "Aceptar y continuar": "Accept and continue", "Ahora no": "Not now", "Volver": "Back",
        "Tu cuenta (": "Your account (", ") aún no tiene registrada la aceptación de nuestras políticas.": ") has not yet accepted our policies.",
        "Cargando…": "Loading…", "Abriendo Google…": "Opening Google…", "Creando tu cuenta…": "Creating your account…",
        "Tu cuenta y tus datos": "Your account and data",
        "Puedes descargar una copia de tus datos o eliminar tu cuenta de forma definitiva. Más información en la": "You can download a copy of your data or permanently delete your account. More information in the",
        "Descargar mis datos": "Download my data", "Eliminar mi cuenta y mis datos": "Delete my account and data",
        "Gestionar suscripción": "Manage subscription", "Suscribirme (próximamente)": "Subscribe (coming soon)", "Suscribirme": "Subscribe",
        "Si no te suscribes,": "If you don't subscribe,", "tus datos siguen siendo tuyos": "your data is still yours",
        ": puedes verlos, descargarlos o eliminar tu cuenta cuando quieras.": ": you can view them, download them or delete your account whenever you want.",
        "Datos de este navegador": "Data in this browser", "Subir a mi cuenta": "Upload to my account",
        // Navegación y comunes
        "Finanzas": "Finance", "Almacén": "Warehouse", "Panel": "Dashboard",
        "Cancelar": "Cancel", "Cerrar": "Close", "Guardar": "Save", "Editar": "Edit", "Eliminar": "Delete",
        "Desactivar": "Deactivate", "Reactivar": "Reactivate", "Registrar": "Record", "Buscar": "Search", "Estado": "Status",
        "Todas": "All", "Todos": "All", "Activos": "Active", "Inactivos": "Inactive", "Limpiar filtros": "Clear filters",
        "Historial": "History", "Mover stock": "Move stock", "Fecha": "Date", "Tipo": "Type", "Nota (opcional)": "Note (optional)",
        "Cantidad": "Quantity", "Importe": "Amount", "Moneda": "Currency", "Tu moneda": "Your currency", "Mes": "Month",
        "Desde": "From", "Hasta": "To", "Descripción": "Description", "Producto": "Product", "Nombre": "Name",
        "Talla": "Size", "Color": "Color", "Categoría": "Category", "Sin categoría": "No category",
        "Código (opcional)": "Code (optional)",        // Finanzas
        "Registra los ingresos y gastos de tu negocio.": "Record your business income and expenses.",
        "Registrar operación": "Record operation", "Tipo de operación": "Operation type",
        "Ingreso": "Income", "Gasto": "Expense", "Ingresos": "Income", "Gastos": "Expenses",
        "Fecha de operación": "Operation date", "Descripción...": "Description...", "Ej.: Venta de productos": "E.g.: Product sales",
        "Resumen financiero": "Financial summary", "Ganancia": "Profit", "Ganancia neta": "Net profit", "Ingresos menos gastos": "Income minus expenses",
        "Ingresos registrados": "Income recorded", "Gastos registrados": "Expenses recorded", "Operaciones": "Operations",
        "Historial de operaciones": "Operations history", "Filtrar historial": "Filter history",
        "Todavía no hay operaciones registradas.": "No operations recorded yet.",
        "Ninguna operación coincide con los filtros.": "No operations match the filters.",
        "Corrige el rango de fechas para ver resultados.": "Fix the date range to see results.",
        "Revisa las fechas: «Desde» es posterior a «Hasta».": "Check the dates: “From” is later than “To”.",
        "Exportar respaldo CSV": "Export CSV backup", "Recuperar respaldo CSV": "Restore CSV backup",
        "Importar y reemplazar operaciones": "Import and replace operations",
        "Selecciona un respaldo exportado por GananciaPro.": "Select a backup exported by GananciaPro.",
        "Operación eliminada correctamente.": "Operation deleted successfully.",
        "Operación registrada correctamente.": "Operation recorded successfully.",
        "Revisa los datos: tipo, descripción, importe positivo, moneda y fecha válida son obligatorios.": "Check the data: type, description, positive amount, currency and a valid date are required.",
        "Selecciona primero un archivo CSV.": "Select a CSV file first.", "Selecciona un archivo con extensión .csv.": "Select a file with a .csv extension.",
        "El archivo supera 1 MB. Divide el respaldo en partes más pequeñas.": "The file is over 1 MB. Split the backup into smaller parts.",
        "El archivo CSV está vacío.": "The CSV file is empty.", "El CSV contiene comillas sin cerrar.": "The CSV contains unclosed quotes.",
        "Los encabezados no coinciden con un respaldo CSV de GananciaPro.": "The headers don't match a GananciaPro CSV backup.",
        "Importación cancelada. Tus operaciones actuales no cambiaron.": "Import cancelled. Your current operations were not changed.",
        "No se pudo importar el archivo.": "The file could not be imported.",
        "IMPORTANTE: esta acción reemplazará todas las operaciones actuales.": "IMPORTANT: this will replace all current operations.",
        "¿Deseas continuar?": "Do you want to continue?",
        "Los datos guardados no tienen el formato esperado.": "The saved data does not have the expected format.",
        "Se cargó el respaldo, pero no se pudieron quitar las operaciones anteriores. Revisa el historial por posibles duplicados.": "The backup was loaded, but the previous operations could not be removed. Check the history for possible duplicates.",
        // Almacén
        "Nuevo producto": "New product", "Editar producto": "Edit product", "Resumen del almacén": "Warehouse summary",
        "Productos activos": "Active products", "Unidades en stock": "Units in stock", "Poco stock": "Low stock", "Agotados": "Out of stock", "Agotado": "Out of stock",
        "Filtrar productos": "Filter products", "Nombre, talla, color o código": "Name, size, color or code",
        "en stock": "in stock", "en total": "total", "quedan pocas": "running low",
        "Aún no tienes productos. Crea el primero con «Nuevo producto».": "You don't have any products yet. Create the first one with “New product”.",
        "Ningún producto coincide con los filtros.": "No products match the filters.",
        "Cargando almacén…": "Loading warehouse…", "Elige un producto": "Choose a product",
        "Tu prueba terminó o tu suscripción no está activa. Puedes ver y descargar tus datos.": "Your trial ended or your subscription is not active. You can view and download your data.",
        "Foto de referencia (opcional)": "Reference photo (optional)", "Quitar foto": "Remove photo",
        "JPG, PNG o WEBP. Se reduce sola y se quitan los datos ocultos de la foto (como la ubicación).": "JPG, PNG or WEBP. It is resized automatically and hidden photo data (such as location) is removed.",
        "Vista previa de la foto": "Photo preview", "Foto del producto": "Product photo",
        "Tallas y cantidades": "Sizes and quantities", "Tallas 2 a 16": "Sizes 2 to 16", "S · M · L · XL": "S · M · L · XL", "XS a XXXL": "XS to XXXL",
        "Talla única": "One size", "Bebé / infantil": "Baby / kids", "Sistema de tallas de calzado": "Footwear size system",
        "Cada talla se guarda como una variante de este producto y se despliega en la lista. El color es el mismo para todas.": "Each size is saved as a variant of this product and expands in the list. The color is the same for all.",
        "Toca una categoría o escribe una nueva: si no existe, se crea sola. En": "Tap a category or type a new one: if it doesn't exist, it is created automatically. In",
        "Cantidad inicial (stock)": "Initial quantity (stock)", "Cuántas unidades tienes ahora. Se registra como una entrada.": "How many units you have now. It is recorded as an entry.",
        "Ej.: Ropa": "E.g.: Clothing", "Elegir categoría": "Choose category",
        "Historial de movimientos": "Movement history", "Filtrar movimientos": "Filter movements", "Tipo de movimiento": "Movement type",
        "Entrada (suma stock)": "Entry (adds stock)", "Pérdida (resta)": "Loss (subtracts)", "Daño (resta)": "Damage (subtracts)",
        "Uso interno (resta)": "Internal use (subtracts)", "Ajuste + (suma)": "Adjustment + (adds)", "Ajuste − (resta)": "Adjustment − (subtracts)",
        "Venta (resta y suma a Finanzas)": "Sale (subtracts and adds to Finance)",
        "Entradas": "Entries", "Pérdidas": "Losses", "Daños": "Damages", "Uso interno": "Internal use", "Ajustes +": "Adjustments +", "Ajustes −": "Adjustments −", "Ventas": "Sales",
        "Cada entrada y salida queda registrada, con el stock antes y después.": "Every entry and exit is recorded, with the stock before and after.",
        "Todavía no hay movimientos con estos filtros.": "No movements with these filters yet.",
        "Registrar venta": "Record sale", "Importe total de la venta": "Total sale amount",
        "El importe se registra como un ingreso en Finanzas y el stock se descuenta a la vez.": "The amount is recorded as income in Finance and the stock is deducted at the same time.",
        "Continuar con la venta": "Continue with the sale", "Venta de almacén": "Warehouse sale",
        "Ver más": "See more", "Ver más movimientos": "See more movements", "Ver movimientos": "View movements",
        "Producto actualizado.": "Product updated.", "Producto reactivado.": "Product reactivated.", "Producto desactivado.": "Product deactivated.", "Producto eliminado.": "Product deleted.",
        "El nombre es obligatorio.": "The name is required.", "Agrega al menos una talla.": "Add at least one size.", "Hay una cantidad sin talla.": "There is a quantity without a size.",
        "La cantidad inicial debe ser un número entero, de 0 a 1,000,000.": "The initial quantity must be a whole number from 0 to 1,000,000.",
        "Indica una cantidad entera mayor que cero.": "Enter a whole quantity greater than zero.",
        "Cada cantidad debe ser un número entero mayor que cero.": "Each quantity must be a whole number greater than zero.",
        "Elige un producto en cada línea.": "Choose a product on each line.",
        "Elegiste el mismo producto dos veces. Suma las cantidades en una sola línea.": "You chose the same product twice. Add the quantities on a single line.",
        "Escribe el importe total de la venta (mayor que cero).": "Enter the total sale amount (greater than zero).",
        "La fecha es obligatoria.": "The date is required.",
        "No hay productos con stock para vender. Registra una entrada primero.": "There are no products in stock to sell. Record an entry first.",
        "Venta registrada. El stock se descontó y el ingreso ya está en Finanzas.": "Sale recorded. The stock was deducted and the income is now in Finance.",
        "No se pudo preparar la foto.": "The photo could not be prepared.", "La foto debe ser JPG, PNG o WEBP.": "The photo must be JPG, PNG or WEBP.",
        "La foto es muy pesada (máximo 15 MB).": "The photo is too large (maximum 15 MB).", "No se pudo leer esa imagen. Prueba con otra foto.": "That image could not be read. Try another photo.",
        "Stock inicial": "Initial stock", "Cantidad de esta talla": "Quantity for this size", "Quitar": "Remove",
        "Si solo quieres ocultarlo, usa «Desactivar».": "If you only want to hide it, use “Deactivate”.",
        // Panel
        "Cómo va tu negocio en el mes elegido.": "How your business is doing in the chosen month.",
        "Ingresos y gastos por día": "Income and expenses by day", "Gráfico de ingresos y gastos por día": "Chart of income and expenses by day",
        "Pasa el cursor por el gráfico para ver cada día.": "Hover over the chart to see each day.",
        "Mayores gastos": "Top expenses", "Mayores ingresos": "Top income", "Stock bajo en el almacén": "Low stock in the warehouse",
        "Sin datos este mes.": "No data this month.", "Sin descripción": "No description",
        "Sin mes anterior para comparar": "No previous month to compare",
        "Todo en orden: ningún producto con 5 unidades o menos.": "All good: no product with 5 units or fewer.",
        "Aún no hay operaciones. Registra la primera en Finanzas.": "No operations yet. Record the first one in Finance.",
        "No se pudo cargar el panel. Revisa tu conexión e inténtalo de nuevo.": "The dashboard could not be loaded. Check your connection and try again.",
        "Por día": "By day", "Acumulado": "Cumulative", "7 días": "7 days", "Periodo": "Period", "Vista": "View",
        "Ganancia acumulada": "Cumulative profit", "Gráfico de la ganancia acumulada": "Cumulative profit chart",
        "Ver tabla": "View table",
        "Unidades": "Units", "Margen": "Margin", "Resumen": "Summary",
        // Cuenta / suscripción / errores
        "Puedes ver y descargar tus datos, pero no registrar nada nuevo hasta que te suscribas.": "You can view and download your data, but not record anything new until you subscribe.",
        "Tu prueba terminó.": "Your trial has ended.", "Tu suscripción terminó.": "Your subscription has ended.",
        "Abriendo pago…": "Opening payment…",
        "No se pudo abrir el pago. Inténtalo de nuevo en unos minutos.": "The payment could not be opened. Try again in a few minutes.",
        "No se pudo abrir el portal. Inténtalo de nuevo en unos minutos.": "The portal could not be opened. Try again in a few minutes.",
        "Pago recibido. Estamos activando tu suscripción…": "Payment received. We are activating your subscription…",
        "¡Suscripción activa! Gracias por confiar en GananciaPro.": "Subscription active! Thank you for trusting GananciaPro.",
        "Recibimos tu pago, pero la activación está tardando. Recarga la página en un minuto; si sigue igual, escríbenos.": "We received your payment, but activation is taking a while. Reload the page in a minute; if it persists, contact us.",
        "El precio mensual se anunciará al activar los pagos.": "The monthly price will be announced when payments are enabled.",
        "Marca la casilla para continuar.": "Tick the box to continue.",
        "Debes aceptar la Política de privacidad y los Términos de uso.": "You must accept the Privacy Policy and the Terms of Use.",
        "La contraseña debe combinar letras y números.": "The password must combine letters and numbers.", "Las contraseñas no coinciden.": "The passwords do not match.",
        "Listo. Te enviamos un correo para confirmar tu cuenta.": "Done. We sent you an email to confirm your account.",
        "Revisa tu bandeja (y la carpeta de spam) y luego inicia sesión.": "Check your inbox (and the spam folder) and then log in.",
        "Si el correo está registrado, recibirás un enlace para crear una nueva contraseña.": "If the email is registered, you will receive a link to create a new password.",
        "¿Quieres subirlas a tu cuenta? Los datos de este navegador no se borran.": "Do you want to upload them to your account? The data in this browser is not deleted.",
        "Esto elimina tu cuenta y TODOS tus datos (operaciones, almacén y fotos) de forma permanente.": "This deletes your account and ALL your data (operations, warehouse and photos) permanently.",
        "No se puede deshacer.": "This cannot be undone.",
        "Tienes una suscripción activa. Cancélala primero en «Gestionar suscripción» y luego elimina tu cuenta.": "You have an active subscription. Cancel it first in “Manage subscription” and then delete your account.",
        "Si quieres conservar una copia, cancela y usa «Descargar mis datos» primero.": "If you want to keep a copy, cancel and use “Download my data” first.",
        "Para confirmar, escribe ELIMINAR:": "To confirm, type DELETE:",
        "Tu cuenta y tus datos fueron eliminados.": "Your account and data were deleted.",
        "No se pudo cargar el sistema de cuentas. Recarga la página.": "The account system could not be loaded. Reload the page.",
        "Ya existe un registro igual (mismo nombre, talla y color, o el mismo código).": "An identical record already exists (same name, size and color, or the same code).",
        "Algún dato no cumple los límites permitidos. Revísalo.": "Some data does not meet the allowed limits. Check it.",
        "El almacén aún no está activado en tu base de datos.": "The warehouse is not yet enabled in your database.",
        "Tu prueba terminó o tu suscripción no está activa. Suscríbete para seguir registrando.": "Your trial ended or your subscription is not active. Subscribe to keep recording.",
        "No tienes permiso para realizar esta acción.": "You don't have permission to do this.",
        "Debes confirmar tu correo antes de entrar. Revisa tu bandeja de entrada.": "You must confirm your email before logging in. Check your inbox.",
        "Correo o contraseña incorrectos.": "Incorrect email or password.",
        "Se alcanzó el límite de correos por ahora. Inténtalo más tarde.": "The email limit has been reached for now. Try again later.",
        "Demasiados intentos. Espera unos minutos e inténtalo de nuevo.": "Too many attempts. Wait a few minutes and try again.",
        "La contraseña es demasiado débil. Usa al menos 10 caracteres con letras y números.": "The password is too weak. Use at least 10 characters with letters and numbers.",
        "No se pudo verificar que eres una persona. Inténtalo de nuevo.": "We could not verify you are a person. Try again.",
        "No hay conexión con el servidor. Revisa tu internet.": "No connection to the server. Check your internet.",
        "Tu sesión venció. Inicia sesión de nuevo.": "Your session expired. Log in again.", "Tu sesión terminó. Vuelve a entrar.": "Your session ended. Log in again.",
        "Ocurrió un error. Inténtalo de nuevo.": "An error occurred. Try again.",
        "Entrar con Google solo funciona desde la página publicada, no desde un archivo local.": "Google login only works from the published page, not from a local file.",
        "No se pudo abrir el pago. Inténtalo de nuevo.": "The payment could not be opened. Try again.", "No se pudo abrir el portal. Inténtalo de nuevo.": "The portal could not be opened. Try again.",
        "No se encontró la operación o no tienes permiso para borrarla.": "The operation was not found or you don't have permission to delete it.",
        "No se pudo subir la foto. Revisa que el paso SQL de fotos esté instalado.": "The photo could not be uploaded. Check that the photos SQL step is installed.",
        "Este producto tiene ventas registradas y no se puede eliminar. Puedes desactivarlo.": "This product has recorded sales and cannot be deleted. You can deactivate it.",
        "Producto inexistente o sin acceso.": "Product does not exist or no access.",
        // Tema
        "Activar modo claro": "Switch to light mode", "Activar modo oscuro": "Switch to dark mode", "Modo claro": "Light mode", "Modo oscuro": "Dark mode",
        "Cambiar entre modo claro y oscuro": "Switch between light and dark mode",
        "Secciones": "Sections", "Secciones de la aplicación": "App sections",
        "El precio final, con los impuestos de tu país, se te muestra antes de pagar.": "The final price, including taxes for your country, is shown before you pay.",
        "Condiciones de la suscripción": "Subscription terms", "Libro de Reclamaciones": "Complaints Book",
        "Mostrando": "Showing"
    };

    /* ---------- Reglas con datos variables ---------- */
    const num = (s) => s;
    const R = [
        [/^([+-]?\d+(?:[.,]\d+)?)% frente al mes anterior$/, (m) => `${m[1]}% vs. previous month`],
        [/^Margen (.+)$/, (m) => `Margin ${m[1]}`],
        [/^(\d+) variantes?(?: · (\d+) agotadas?)?$/, (m) => `${m[1]} variant${m[1] === "1" ? "" : "s"}` + (m[2] ? ` · ${m[2]} out of stock` : "")],
        [/^Mostrando (\d+) de (\d+) productos?\.$/, (m) => `Showing ${m[1]} of ${m[2]} products.`],
        [/^Mostrando (\d+) (?:movimientos?)( \(hay más\))?\.$/, (m) => `Showing ${m[1]} movement${m[1] === "1" ? "" : "s"}${m[2] ? " (more available)" : ""}.`],
        [/^Ver más \((\d+) restantes\)$/, (m) => `See more (${m[1]} remaining)`],
        [/^(\d+) operaci(?:ón|ones)$/, (m) => `${m[1]} operation${m[1] === "1" ? "" : "s"}`],
        [/^(Desactivar|Reactivar|Editar|Eliminar|Mover stock de|Ver movimientos de|Foto de|Ver foto de) (.+)$/, (m) => ({ "Desactivar": "Deactivate", "Reactivar": "Reactivate", "Editar": "Edit", "Eliminar": "Delete", "Mover stock de": "Move stock of", "Ver movimientos de": "View movements of", "Foto de": "Photo of", "Ver foto de": "View photo of" })[m[1]] + " " + m[2]],
        [/^Talla (.+)$/, (m) => `Size ${m[1] === "única" ? "one size" : m[1]}`],
        [/^Prueba gratis: te quedan (\d+) (día|días)\.$/, (m) => `Free trial: ${m[1]} day${m[1] === "1" ? "" : "s"} left.`],
        [/^Tu suscripción termina el (.+)\.$/, (m) => `Your subscription ends on ${m[1]}.`],
        [/^Tu prueba terminó\. (.+)$/, (m, tr) => "Your trial has ended. " + (tr(m[1]) || m[1])],
        [/^Tu suscripción terminó\. (.+)$/, (m, tr) => "Your subscription has ended. " + (tr(m[1]) || m[1])],
        [/^Solo hay (.+) de «(.+)»\.$/, (m) => `Only ${m[1]} of “${m[2]}” available.`],
        [/^Solo hay (.+) en stock\.$/, (m) => `Only ${m[1]} in stock.`],
        [/^La talla (.+) está repetida\.$/, (m) => `Size ${m[1]} is repeated.`],
        [/^La cantidad de la talla (.+) debe ser un entero de 0 a 1,000,000\.$/, (m) => `The quantity for size ${m[1]} must be a whole number from 0 to 1,000,000.`],
        [/^Se crearon (\d+) tallas? de «(.+)»\.(.*)$/, (m, tr) => `${m[1]} size${m[1] === "1" ? "" : "s"} of “${m[2]}” created.` + (m[3] ? " " + (tr(m[3].trim()) || m[3].trim()) : "")],
        [/^Producto creado(?: con (.+) en stock)?\.(.*)$/, (m, tr) => "Product created" + (m[1] ? ` with ${m[1]} in stock` : "") + "." + (m[2].trim() ? " " + (tr(m[2].trim()) || m[2].trim()) : "")],
        [/^Pero no se pudo registrar el stock inicial \((.*)\)\. Regístralo con «Mover stock»\.$/, (m) => `But the initial stock could not be recorded (${m[1]}). Record it with “Move stock”.`],
        [/^(.+) registrada\. Stock actual: (.+)\.$/, (m) => `${(({ "Entrada": "Entry", "Pérdida": "Loss", "Daño": "Damage", "Uso interno": "Internal use", "Ajuste": "Adjustment", "Ajuste positivo": "Adjustment", "Ajuste negativo": "Adjustment", "Venta": "Sale" })[m[1]] || m[1])} recorded. Current stock: ${m[2]}.`],
        [/^La fila (\d+) tiene columnas incorrectas\.$/, (m) => `Row ${m[1]} has incorrect columns.`],
        [/^La fila (\d+) .*No se importó nada\.$/, (m) => `Row ${m[1]} has invalid data. Nothing was imported.`],
        [/^El archivo tiene demasiadas filas \(máximo (\d+)\)\.$/, (m) => `The file has too many rows (maximum ${m[1]}).`],
        [/^Importación completada\. Ahora tienes (.+)\.$/, (m, tr) => `Import complete. You now have ${tr(m[1]) || m[1]}.`],
        [/^Encontramos (\d+) operaci[oó]n(?:es)? guardadas? en este navegador, de antes de crear tu cuenta\.\s*(.*)$/s, (m, tr) => `We found ${m[1]} operation${m[1] === "1" ? "" : "s"} saved in this browser, from before you created your account. ` + (tr(m[2]) || m[2])],
        [/^La contraseña debe tener al menos (\d+) caracteres\.$/, (m) => `The password must be at least ${m[1]} characters long.`],
        [/^Usa al menos (\d+) caracteres, con letras y números\.$/, (m) => `Use at least ${m[1]} characters, with letters and numbers.`],
        [/^¿Deseas eliminar la operación "(.+)"\?$/, (m) => `Do you want to delete the operation "${m[1]}"?`],
        [/^¿Desactivar «(.+)»\? No se borra: su historial se conserva y puedes reactivarlo\.$/, (m) => `Deactivate “${m[1]}”? It is not deleted: its history is kept and you can reactivate it.`],
        [/^¿Eliminar «(.+)» para siempre\? Se borran también sus movimientos de stock\. Esto no se puede deshacer\.$/, (m) => `Delete “${m[1].replace(/ · Talla /g, " · Size ")}” forever? Its stock movements are also deleted. This cannot be undone.`],
        [/^No se pudo (eliminar|guardar la operación|importar|subir|eliminar la cuenta|leer la suscripción|crear ninguna talla): (.*)$/, (m, tr) => ({ "eliminar": "Could not delete", "guardar la operación": "Could not save the operation", "importar": "Could not import", "subir": "Could not upload", "eliminar la cuenta": "Could not delete the account", "leer la suscripción": "Could not read the subscription", "crear ninguna talla": "No size could be created" })[m[1]] + ": " + (tr(m[2]) || m[2])],
        [/^No se pudieron (cargar las operaciones|borrar las anteriores|subir): (.*)$/, (m, tr) => ({ "cargar las operaciones": "Could not load the operations", "borrar las anteriores": "Could not delete the previous ones", "subir": "Could not upload" })[m[1]] + ": " + (tr(m[2]) || m[2])],
        [/^Error al importar CSV: (.*)$/, (m, tr) => "Error importing CSV: " + (tr(m[1]) || m[1])],
        [/ · T\. /g, () => " · Size ", true],
        [/ · Talla /g, () => " · Size ", true],
        [/ — stock actual: /g, () => " — current stock: ", true],
        [/^([A-Z]{3}) - .+$/, (m) => { try { return `${m[1]} - ${new Intl.DisplayNames(["en"], { type: "currency" }).of(m[1])}`; } catch (e) { return null; } }]
    ];

    /* ---------- Motor de traducción ---------- */
    function normal(s) { return s.replace(/\s+/g, " ").trim(); }

    function traducir(texto) {
        const t = normal(texto);
        if (!t) return null;
        if (Object.prototype.hasOwnProperty.call(D, t)) return D[t];
        for (const regla of R) {
            const [re, fn, global] = regla;
            if (global) {
                if (re.test(t)) { re.lastIndex = 0; return t.replace(re, fn); }
                continue;
            }
            const m = t.match(re);
            if (m) {
                const r = fn(m, traducir);
                if (r) return r;
            }
        }
        // "Prefijo: resto"
        const i = t.indexOf(": ");
        if (i > 3) {
            const a = D[t.slice(0, i)];
            if (a) return a + ": " + (traducir(t.slice(i + 2)) || t.slice(i + 2));
        }
        // Varias frases o líneas
        const partes = t.split(/(?<=[.!?:…])\s+/);
        if (partes.length > 1) {
            const out = partes.map((p) => traducir(p));
            if (out.some(Boolean)) return partes.map((p, k) => out[k] || p).join(" ");
        }
        return null;
    }

    function traducirTextoLargo(texto) {
        // Para confirm(): conserva los saltos de línea
        return texto.split(/(\n+)/).map((p) => (/^\n+$/.test(p) ? p : (traducir(p) || p))).join("");
    }

    /* ---------- Aplicar al documento ---------- */
    const ATRIBUTOS = ["placeholder", "aria-label", "title", "alt", "data-precio"];
    const textos = new WeakMap();   // nodo de texto -> { es, en }
    const attrs = new WeakMap();    // elemento -> { atributo: { es, en } }
    let aplicando = false;

    function conEspacios(original, nuevo) {
        const ini = original.match(/^\s*/)[0];
        const fin = original.match(/\s*$/)[0];
        return ini + nuevo + fin;
    }

    function nodoTexto(nodo) {
        const p = nodo.parentElement;
        if (!p || p.closest("script,style,textarea,.marca h1,[data-no-traducir]")) return;
        const valor = nodo.nodeValue;
        const reg = textos.get(nodo);

        if (idioma === "es") {
            if (reg && valor === reg.en) nodo.nodeValue = reg.es;
            return;
        }
        if (reg && valor === reg.en) return;
        const en = traducir(valor);
        if (en && en !== normal(valor)) {
            const nuevo = conEspacios(valor, en);
            textos.set(nodo, { es: valor, en: nuevo });
            nodo.nodeValue = nuevo;
        }
    }

    function atributosElemento(el) {
        for (const a of ATRIBUTOS) {
            if (!el.hasAttribute || !el.hasAttribute(a)) continue;
            const valor = el.getAttribute(a);
            const mapa = attrs.get(el) || {};
            const reg = mapa[a];
            if (idioma === "es") {
                if (reg && valor === reg.en) el.setAttribute(a, reg.es);
                continue;
            }
            if (reg && valor === reg.en) continue;
            const en = traducir(valor);
            if (en && en !== valor) {
                mapa[a] = { es: valor, en };
                attrs.set(el, mapa);
                el.setAttribute(a, en);
            }
        }
    }

    function recorrer(raizNodo) {
        if (raizNodo.nodeType === 3) { nodoTexto(raizNodo); return; }
        if (raizNodo.nodeType !== 1) return;
        atributosElemento(raizNodo);
        const w = document.createTreeWalker(raizNodo, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT);
        let n;
        while ((n = w.nextNode())) {
            if (n.nodeType === 3) nodoTexto(n);
            else atributosElemento(n);
        }
    }

    let tituloEs = null;
    function titulo() {
        if (tituloEs === null) tituloEs = document.title;
        if (idioma === "en") {
            document.title = (tituloEs === "GananciaPro | Panel de control" ? "GananciaPro | Dashboard" : tituloEs);
        } else document.title = tituloEs;
        const meta = document.querySelector('meta[name="description"]');
        if (meta) {
            if (!meta.dataset.es) meta.dataset.es = meta.content;
            meta.content = idioma === "en"
                ? "GananciaPro: manage your income, expenses and warehouse in one place. 14-day free trial, no card needed."
                : meta.dataset.es;
        }
    }

    function aplicarTodo() {
        aplicando = true;
        try {
            raiz.setAttribute("lang", idioma);
            recorrer(document.body);
            titulo();
            actualizarBoton();
        } finally {
            aplicando = false;
        }
    }

    const observador = new MutationObserver((cambios) => {
        if (aplicando || idioma === "es") return;
        aplicando = true;
        try {
            for (const c of cambios) {
                if (c.type === "characterData") nodoTexto(c.target);
                else if (c.type === "attributes") atributosElemento(c.target);
                else c.addedNodes.forEach((n) => recorrer(n));
            }
        } finally {
            aplicando = false;
        }
    });

    /* ---------- Mensajes del navegador (confirm / alert) ---------- */
    const confirmarOriginal = window.confirm.bind(window);
    const promptOriginal = window.prompt.bind(window);
    const alertaOriginal = window.alert.bind(window);
    window.confirm = (m) => confirmarOriginal(idioma === "en" ? traducirTextoLargo(String(m)) : m);
    window.prompt = (m, d) => promptOriginal(idioma === "en" ? traducirTextoLargo(String(m)) : m, d);
    window.alert = (m) => alertaOriginal(idioma === "en" ? traducirTextoLargo(String(m)) : m);

    /* ---------- Botón de idioma ---------- */
    let botones = [];
    function actualizarBoton() {
        for (const b of botones) {
            b.textContent = idioma === "es" ? "EN" : "ES";
            b.setAttribute("aria-label", idioma === "es" ? "Change language to English" : "Cambiar idioma a español");
            b.title = idioma === "es" ? "English" : "Español";
        }
    }

    function cambiar(nuevo) {
        if (nuevo !== "es" && nuevo !== "en") return;
        idioma = nuevo;
        try { localStorage.setItem(CLAVE, nuevo); } catch (e) { /* sin almacenamiento */ }
        aplicarTodo();
        document.dispatchEvent(new CustomEvent("gp-idioma", { detail: nuevo }));
    }

    function iniciar() {
        botones = [...document.querySelectorAll("[data-idioma-boton]")];
        for (const b of botones) b.addEventListener("click", () => cambiar(idioma === "es" ? "en" : "es"));
        observador.observe(document.body, {
            childList: true, subtree: true, characterData: true,
            attributes: true, attributeFilter: ATRIBUTOS
        });
        aplicarTodo();
    }

    window.GP_IDIOMA = {
        actual: () => idioma,
        locale: () => (idioma === "en" ? "en-US" : "es-PE"),
        cambiar,
        traducir: (t) => (idioma === "en" ? (traducir(t) || t) : t)
    };

    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", iniciar);
    else iniciar();
})();
