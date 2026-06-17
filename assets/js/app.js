/**
 * Semáforo Hídrico Inteligente - Sistema de Monitoreo Comunitario
 * app.js - Lógica principal del sistema, base de datos local y renderizado.
 * Proyecto construido de forma modular con JavaScript Vanilla.
 */

// --- INTERCEPTOR DE FETCH GLOBAL PARA CONTROL DE SESIÓN (401 / 403) ---
const originalFetch = window.fetch;
window.fetch = async function(...args) {
    const response = await originalFetch(...args);
    if (response.status === 401 || response.status === 403) {
        window.location.href = 'login.php';
    }
    return response;
};

// --- BASE DE DATOS INICIAL (24 Viviendas en Viva el Perú - Cusco) ---
const VIVIENDAS_INICIALES = [
    // 12 Viviendas VERDES (Aptas: pH 6.5-8.5 y Cloro 0.5-1.5 mg/L)
    { id: "V-01", nombre: "Vivienda Quispe Condori", direccion: "Av. Viva el Perú Nro. 124", latitud: -13.5408, longitud: -71.9782, responsable: "Juan Quispe", ph: 7.2, cloro: 1.10, fecha: "2026-06-03", estado: "verde", observaciones: "Cloración óptima. Red sin fugas." },
    { id: "V-02", nombre: "Vivienda Mamani Tupa", direccion: "Calle Manco Cápac Nro. 450", latitud: -13.5415, longitud: -71.9791, responsable: "Rosa Mamani", ph: 7.5, cloro: 0.95, fecha: "2026-06-03", estado: "verde", observaciones: "Sin turbidez detectada." },
    { id: "V-03", nombre: "Vivienda Tupa Huamán", direccion: "Asoc. Inti Raymi Lote A-12", latitud: -13.5422, longitud: -71.9775, responsable: "Carlos Tupa", ph: 6.8, cloro: 0.75, fecha: "2026-06-03", estado: "verde", observaciones: "Muestra tomada de pileta principal." },
    { id: "V-04", nombre: "Vivienda Condori Apaza", direccion: "Pje. Cusco Nro. 15", latitud: -13.5398, longitud: -71.9789, responsable: "Elena Condori", ph: 7.0, cloro: 1.20, fecha: "2026-06-03", estado: "verde", observaciones: "Valores estables." },
    { id: "V-05", nombre: "Vivienda Huamán Sinka", direccion: "Av. Viva el Perú Nro. 310", latitud: -13.5411, longitud: -71.9803, responsable: "Walter Huamán", ph: 8.1, cloro: 0.80, fecha: "2026-06-03", estado: "verde", observaciones: "Ligero sabor mineral aceptable." },
    { id: "V-06", nombre: "Vivienda Cahuana Qquecca", direccion: "Calle Los Incas Nro. 88", latitud: -13.5427, longitud: -71.9798, responsable: "Sofía Cahuana", ph: 7.4, cloro: 1.05, fecha: "2026-06-03", estado: "verde", observaciones: "Presión adecuada." },
    { id: "V-07", nombre: "Vivienda Mendoza Ramos", direccion: "Asoc. San Martín Lote 5", latitud: -13.5435, longitud: -71.9785, responsable: "David Mendoza", ph: 6.9, cloro: 0.65, fecha: "2026-06-03", estado: "verde", observaciones: "Conexión nueva." },
    { id: "V-08", nombre: "Vivienda Yupanqui Puma", direccion: "Pje. Raymi Lote 14", latitud: -13.5402, longitud: -71.9812, responsable: "Julia Yupanqui", ph: 7.6, cloro: 1.30, fecha: "2026-06-03", estado: "verde", observaciones: "Tanque limpio." },
    { id: "V-09", nombre: "Vivienda Choque Cutipa", direccion: "Calle Sullpay Nro. 23", latitud: -13.5419, longitud: -71.9821, responsable: "Néstor Choque", ph: 7.3, cloro: 0.90, fecha: "2026-06-03", estado: "verde", observaciones: "Control de rutina." },
    { id: "V-10", nombre: "Vivienda Quispe Ccori", direccion: "Av. Viva el Perú Lote C-3", latitud: -13.5431, longitud: -71.9814, responsable: "Marina Quispe", ph: 7.0, cloro: 1.15, fecha: "2026-06-03", estado: "verde", observaciones: "Uso doméstico regular." },
    { id: "V-11", nombre: "Vivienda Huanca Ramos", direccion: "Calle Pampa Chica Nro. 12", latitud: -13.5442, longitud: -71.9802, responsable: "Pedro Huanca", ph: 7.8, cloro: 0.70, fecha: "2026-06-03", estado: "verde", observaciones: "Agua cristalina." },
    { id: "V-12", nombre: "Vivienda Clarita Loayza", direccion: "Pje. Ollantaytambo Nro. 4", latitud: -13.5391, longitud: -71.9801, responsable: "Luz Clarita", ph: 7.2, cloro: 1.00, fecha: "2026-06-03", estado: "verde", observaciones: "Dosificación correcta." },

    // 8 Viviendas AMARILLAS (En Observación: pH o Cloro cercanos al límite)
    { id: "V-13", nombre: "Vivienda Sinka Ccoyllor", direccion: "Calle Los Portales Nro. 11", latitud: -13.5405, longitud: -71.9771, responsable: "Faustino Sinka", ph: 6.3, cloro: 0.80, fecha: "2026-06-03", estado: "amarillo", observaciones: "pH ligeramente ácido. Programar mantenimiento." },
    { id: "V-14", nombre: "Vivienda Apaza Condori", direccion: "Av. Viva el Perú Nro. 502", latitud: -13.5417, longitud: -71.9765, responsable: "Martha Apaza", ph: 7.2, cloro: 0.40, fecha: "2026-06-03", estado: "amarillo", observaciones: "Cloro bajo el límite óptimo (0.40 mg/L). Hervir agua." },
    { id: "V-15", nombre: "Vivienda Ccori Ramos", direccion: "Asoc. Inti Lote B-8", latitud: -13.5429, longitud: -71.9772, responsable: "Gabino Ccori", ph: 8.7, cloro: 1.10, fecha: "2026-06-03", estado: "amarillo", observaciones: "pH alcalino elevado. Monitorear captación." },
    { id: "V-16", nombre: "Vivienda Qquecca Yupanqui", direccion: "Calle Sacsayhuamán 102", latitud: -13.5395, longitud: -71.9760, responsable: "Victoria Qquecca", ph: 7.0, cloro: 1.70, fecha: "2026-06-03", estado: "amarillo", observaciones: "Ligero olor a cloro. Concentración alta (1.70 mg/L)." },
    { id: "V-17", nombre: "Vivienda Cutipa Choque", direccion: "Pje. Carmen Alto Lote 7", latitud: -13.5448, longitud: -71.9789, responsable: "Andrés Cutipa", ph: 6.4, cloro: 0.45, fecha: "2026-06-03", estado: "amarillo", observaciones: "pH y cloro levemente bajos. Inspeccionar tramo." },
    { id: "V-18", nombre: "Vivienda Loayza Clarita", direccion: "Calle Los Alisos Nro. 5", latitud: -13.5439, longitud: -71.9825, responsable: "Teodora Loayza", ph: 8.8, cloro: 1.20, fecha: "2026-06-03", estado: "amarillo", observaciones: "Ligera turbidez y pH alto." },
    { id: "V-19", nombre: "Vivienda Centeno Mendoza", direccion: "Av. Los Chankas Nro. 24", latitud: -13.5409, longitud: -71.9832, responsable: "Julio Centeno", ph: 7.1, cloro: 1.80, fecha: "2026-06-03", estado: "amarillo", observaciones: "Exceso preventivo de cloro en acometida." },
    { id: "V-20", nombre: "Vivienda Puma Huanca", direccion: "Asoc. Viva el Perú Lote F-4", latitud: -13.5425, longitud: -71.9839, responsable: "René Puma", ph: 6.2, cloro: 1.00, fecha: "2026-06-03", estado: "amarillo", observaciones: "pH bajo. Monitorear corrosión de tubería." },

    // 4 Viviendas ROJAS (Críticas: pH o Cloro fuera de rango seguro)
    { id: "V-21", nombre: "Vivienda Ccoyllor Puma", direccion: "Calle Pampa del Castillo 340", latitud: -13.5401, longitud: -71.9796, responsable: "Hilario Ccoyllor", ph: 5.5, cloro: 0.10, fecha: "2026-06-03", estado: "rojo", observaciones: "CRÍTICO: Agua muy ácida y casi sin cloro. Alto riesgo biológico." },
    { id: "V-22", nombre: "Vivienda Ramos Mamani", direccion: "Av. Viva el Perú Nro. 780", latitud: -13.5418, longitud: -71.9808, responsable: "Domitila Ramos", ph: 9.4, cloro: 2.50, fecha: "2026-06-03", estado: "rojo", observaciones: "CRÍTICO: Fuerte olor químico. pH alcalino extremo y exceso de cloro." },
    { id: "V-23", nombre: "Vivienda Valer Cahuana", direccion: "Pje. Túpac Amaru Lote D-2", latitud: -13.5430, longitud: -71.9790, responsable: "Cipriano Valer", ph: 7.0, cloro: 0.00, fecha: "2026-06-03", estado: "rojo", observaciones: "CRÍTICO: Sin cloro residual libre detectable. Riesgo de contaminación." },
    { id: "V-24", nombre: "Vivienda Tintaya Quispe", direccion: "Calle Wiracocha Nro. 99", latitud: -13.5445, longitud: -71.9818, responsable: "Clotilde Tintaya", ph: 4.8, cloro: 1.20, fecha: "2026-06-03", estado: "rojo", observaciones: "CRÍTICO: pH extremadamente ácido. Posible infiltración química." }
];

// --- REGLAS DE NEGOCIO ---
/**
 * Evalúa los parámetros y devuelve la categoría de calidad de agua.
 * @param {number} ph - Potencial de Hidrógeno
 * @param {number} cloro - Cloro residual en mg/L
 */
function evaluarCalidadAgua(ph, cloro) {
    if (ph === undefined || ph === null || ph === "" || cloro === undefined || cloro === null || cloro === "") {
        return {
            estado: 'gris',
            resultado: 'Sin evaluación inicial',
            detalles: 'Aún no se ha realizado ninguna medición de calidad de agua en esta vivienda.',
            recomendaciones: [
                'Programar control rutinario.',
                'Registrar el primer análisis de pH y cloro.'
            ]
        };
    }
    // Rango verde: pH [6.5, 8.5] Y Cloro [0.5, 1.5]
    if (ph >= 6.5 && ph <= 8.5 && cloro >= 0.5 && cloro <= 1.5) {
        return {
            estado: 'verde',
            resultado: 'Agua apta para consumo',
            detalles: 'Los valores físico-químicos cumplen estrictamente con los rangos normativos (D.S. N° 031-2010-SA).',
            recomendaciones: [
                'Continuar con la dosificación y muestreo rutinarios.',
                'Mantener el monitoreo preventivo semanal.'
            ]
        };
    }
    // Rango rojo: pH < 6.0 o pH > 9.0 O Cloro < 0.2 o Cloro > 2.0
    else if (ph < 6.0 || ph > 9.0 || cloro < 0.2 || cloro > 2.0) {
        let motivos = [];
        if (ph < 6.0) motivos.push('pH ácido crítico (< 6.0)');
        if (ph > 9.0) motivos.push('pH alcalino crítico (> 9.0)');
        if (cloro < 0.2) motivos.push('Cloro insuficiente (< 0.2 mg/L - Riesgo patógeno)');
        if (cloro > 2.0) motivos.push('Exceso nocivo de Cloro (> 2.0 mg/L - Toxicidad)');

        return {
            estado: 'rojo',
            resultado: 'Agua no apta para consumo',
            detalles: 'ALERTA DE RIESGO SANITARIO debido a: ' + motivos.join(', ') + '.',
            recomendaciones: [
                '¡CRÍTICO! Suspender inmediatamente el consumo humano directo.',
                'Aplicar purga y desinfección del tramo de red.',
                'Verificar el dosificador del reservorio principal.',
                'Tomar contramuestra técnica de control en un máximo de 2 horas.'
            ]
        };
    }
    // Rango amarillo: Valores cercanos al límite (Revisión preventiva)
    else {
        let advertencias = [];
        if (ph >= 6.0 && ph < 6.5) advertencias.push('pH en umbral ácido bajo (6.0 - 6.4)');
        if (ph > 8.5 && ph <= 9.0) advertencias.push('pH en umbral alcalino alto (8.6 - 9.0)');
        if (cloro >= 0.2 && cloro < 0.5) advertencias.push('Cloro residual bajo (0.2 - 0.4 mg/L)');
        if (cloro > 1.5 && cloro <= 2.0) advertencias.push('Cloro residual alto (1.6 - 2.0 mg/L)');

        return {
            estado: 'amarillo',
            resultado: 'Revisión preventiva requerida',
            detalles: 'Se detectaron parámetros fuera de la zona óptima: ' + advertencias.join(', ') + '.',
            recomendaciones: [
                'Recomendar a la vivienda hervir el agua preventivamente para el consumo.',
                'Programar ajuste en los niveles de cloración en la cámara de contacto.',
                'Agendar una visita de inspección técnica en un plazo máximo de 24 horas.'
            ]
        };
    }
}

// --- VARIABLES GLOBALES DEL SISTEMA ---
let dbViviendas = [];
let dbHistorial = [];
let dbAlertas = [];
let dbActividades = [];
let dbUsuarios = [];
let viviendasMarkers = {};
let currentAdminView = 'table'; // 'table' o 'cards'
let bitacoraCurrentPage = 1;
let bitacoraRecordsPerPage = 10;

async function cargarDatosServidor() {
    try {
        const tStartFetch = performance.now();
        const [resViv, resHist, resAl, resAct] = await Promise.all([
            fetch('api/viviendas.php'),
            fetch('api/historial.php'),
            fetch('api/alertas.php'),
            fetch('api/actividades.php')
        ]);
        
        const [vivData, histData, alData, actData] = await Promise.all([
            resViv.json(),
            resHist.json(),
            resAl.json(),
            resAct.json()
        ]);
        
        window.fetchTime = performance.now() - tStartFetch;
        
        dbViviendas = vivData;
        dbHistorial = histData;
        dbAlertas = alData;
        dbActividades = actData;
        
        // Medir renderizado de Dashboard
        const tStartDash = performance.now();
        renderDashboardStats();
        renderDashboardRecentTables();
        renderCharts();
        window.tDashboard = performance.now() - tStartDash;
        
        // Medir renderizado de Mapa
        const tStartMap = performance.now();
        actualizarMarcadoresMapa();
        window.tMapa = performance.now() - tStartMap;
        
        // Medir renderizado de Historial
        renderHistorialTable();
        
        // Medir renderizado de Alertas
        const tStartAlerts = performance.now();
        renderAlertasCards();
        window.tAlertas = performance.now() - tStartAlerts;
        
        // Medir renderizado de Administración
        const tStartAdmin = performance.now();
        renderAdminViviendasTable();
        window.tAdmin = performance.now() - tStartAdmin;
        
        // Medir renderizado de Wizard
        const tStartWizard = performance.now();
        renderWizardViviendas();
        window.tWizard = performance.now() - tStartWizard;
        
        // Actualizar etiqueta de generación de reporte
        const reportLabel = document.getElementById('report-viviendas-count-label');
        if (reportLabel) {
            reportLabel.innerText = `Detalle de las ${dbViviendas.length} Viviendas Monitoreadas`;
        }
        
        // Validar la sincronización entre módulos en el DOM
        // Usamos un retraso de 1200ms para asegurar que las animaciones de contadores (800ms) hayan finalizado completamente
        setTimeout(validarSincronizacionModulos, 1200);
    } catch (err) {
        console.error("Error al cargar datos desde el servidor:", err);
    }
}

/**
 * Actualiza el progreso de la pantalla de carga.
 * @param {number} porcentaje - Progreso (0-100).
 * @param {string} subtitulo - Mensaje de carga actual.
 */
function actualizarProgresoCarga(porcentaje, subtitulo) {
    const progressBar = document.getElementById('loading-progress-bar');
    const subtitleEl = document.getElementById('loading-subtitle');
    if (progressBar) {
        progressBar.style.width = `${porcentaje}%`;
    }
    if (subtitleEl) {
        subtitleEl.innerText = subtitulo;
    }
}

async function inicializarSistema() {
    console.log("Paso 1");
    actualizarProgresoCarga(15, "Configurando entorno de la aplicación...");

    // 1. Mostrar fecha actual
    document.getElementById('date-display').innerText = obtenerFechaActualLegible();

    // 2. Configurar el menú móvil
    const mobileBtn = document.getElementById('mobile-menu-btn');
    const mobileCloseBtn = document.getElementById('mobile-close-sidebar');
    const sidebar = document.querySelector('.sidebar');
    
    if (sidebar) {
        if (mobileBtn) {
            mobileBtn.addEventListener('click', () => {
                sidebar.classList.toggle('open');
            });
        }

        if (mobileCloseBtn) {
            mobileCloseBtn.addEventListener('click', () => {
                sidebar.classList.remove('open');
            });
        }

        document.addEventListener('click', (e) => {
            if (!sidebar.contains(e.target) && 
                (!mobileBtn || !mobileBtn.contains(e.target)) && 
                (!mobileCloseBtn || !mobileCloseBtn.contains(e.target)) && 
                sidebar.classList.contains('open')) {
                sidebar.classList.remove('open');
            }
        });
    }

    actualizarProgresoCarga(35, "Inicializando módulos y eventos...");

    // 3. Configurar Modal
    document.getElementById('btn-close-modal').addEventListener('click', cerrarModal);
    document.getElementById('btn-modal-accept').addEventListener('click', cerrarModal);
    const notificationModal = document.getElementById('notification-modal');
    if (notificationModal) {
        notificationModal.addEventListener('click', (e) => {
            if (e.target.id === 'notification-modal') cerrarModal();
        });
    }

    // 4. Inicializar eventos
    inicializarPestanas();
    inicializarEventosHeader();
    inicializarFormularioWizard();
    inicializarEventosAlertas();
    inicializarEventosHistorial();
    inicializarEventosReportes();
    inicializarEventosAdministracion();
    inicializarEventosBitacora();
    inicializarEventosUsuarios();
    console.log("Paso 2");

    // 5. Atender evento de clic en la campana
    const bellBtn = document.getElementById('bell-dropdown-btn');
    if (bellBtn) {
        bellBtn.addEventListener('click', () => {
            cambiarPestana('alertas');
        });
    }

    actualizarProgresoCarga(55, "Sincronizando información local...");

    // 6. Migración desde LocalStorage si aplica
    const tieneViviendas = localStorage.getItem('semaforo_viviendas');
    const migrado = localStorage.getItem('migrado_a_mysql');
    
    if (tieneViviendas && !migrado) {
        console.log("Detectados datos locales. Iniciando migración a MySQL...");
        const payload = {
            viviendas: JSON.parse(localStorage.getItem('semaforo_viviendas') || '[]'),
            historial: JSON.parse(localStorage.getItem('semaforo_historial') || '[]'),
            alertas: JSON.parse(localStorage.getItem('semaforo_alertas') || '[]'),
            actividades: JSON.parse(localStorage.getItem('semaforo_actividades') || '[]')
        };
        
        try {
            const res = await fetch('api/migrate.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const data = await res.json();
            if (data.success) {
                console.log("Migración completada con éxito:", data.details);
                localStorage.setItem('migrado_a_mysql', 'true');
                localStorage.removeItem('semaforo_viviendas');
                localStorage.removeItem('semaforo_historial');
                localStorage.removeItem('semaforo_alertas');
                localStorage.removeItem('semaforo_actividades');
            } else {
                console.error("Error en migración:", data.error);
            }
        } catch (err) {
            console.error("Excepción en migración:", err);
        }
    }

    actualizarProgresoCarga(75, "Descargando datos desde el servidor MySQL...");

    // 7. Cargar datos del servidor
    console.log("Paso 3");
    await cargarDatosServidor();

    actualizarProgresoCarga(100, "¡Inicialización completa!");

    // Cerrar y destruir pantalla de carga
    setTimeout(() => {
        const loadingScreen = document.getElementById('loading-screen');
        if (loadingScreen) {
            loadingScreen.classList.add('fade-out');
            console.log("Loader ocultado");
            setTimeout(() => {
                loadingScreen.remove();
            }, 550);
        }
    }, 450);
}

// Instancias de Chart.js
let phChartInstance = null;
let cloroChartInstance = null;
let distributionChartInstance = null;

// Instancia de Leaflet Map
let map = null;
let mapMarkers = [];
let heatmapLayer = null;
let showHeatmap = true;
let currentMapFilter = 'todos';
let currentViewMode = 'combined'; // 'markers' | 'heatmap' | 'combined'

// Estado de ordenamiento para historial
let currentSortColumn = 'fecha';
let currentSortDirection = 'desc';

// Paginación historial
let historyCurrentPage = 1;
const historyRecordsPerPage = 10;

// --- FUNCIONES AUXILIARES DE RENDERIZADO ---

function registrarActividad(tipo, desc, meta) {
    console.log("Actividad registrada en bitácora:", tipo, desc, meta);
}

// Formatear Fecha legible
function obtenerFechaActualLegible() {
    const opciones = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    return new Date().toLocaleDateString('es-ES', opciones);
}

// Calcular tiempo transcurrido relativo en español
function calcularTiempoTranscurrido(fechaStr) {
    if (!fechaStr) return "Hace un momento";
    const ahora = new Date();
    
    // Soporta formatos "YYYY-MM-DD" y "YYYY-MM-DD HH:MM"
    const partes = fechaStr.split(' ');
    const fechaPartes = partes[0].split('-');
    if (fechaPartes.length < 3) return fechaStr;
    const yyyy = parseInt(fechaPartes[0]);
    const mm = parseInt(fechaPartes[1]) - 1;
    const dd = parseInt(fechaPartes[2]);
    let hh = 12; // fallback mediodía
    let min = 0;
    
    if (partes[1]) {
        const horaPartes = partes[1].split(':');
        hh = parseInt(horaPartes[0]);
        min = parseInt(horaPartes[1]);
    }
    
    const fechaAlert = new Date(yyyy, mm, dd, hh, min);
    const diffMs = ahora - fechaAlert;
    const diffMin = Math.floor(diffMs / (1000 * 60));
    const diffHrs = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDias = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffMin < 1) return "Hace un momento";
    if (diffMin < 60) return `Hace ${diffMin} ${diffMin === 1 ? 'minuto' : 'minutos'}`;
    if (diffHrs < 24) return `Hace ${diffHrs} ${diffHrs === 1 ? 'hora' : 'horas'}`;
    if (diffDias < 30) return `Hace ${diffDias} ${diffDias === 1 ? 'día' : 'días'}`;
    
    return fechaStr;
}

// --- 1. RENDERIZACIÓN DEL DASHBOARD ---

function animarContador(elementId, valorDestino, duracion = 800) {
    const el = document.getElementById(elementId);
    if (!el) return;
    
    // Si contiene '--', empezamos desde 0
    const text = el.innerText.trim();
    const valorInicial = (text === '--' || text === '') ? 0 : (parseInt(text.replace(/[^0-9]/g, '')) || 0);
    if (valorInicial === valorDestino) {
        el.innerText = valorDestino;
        return;
    }
    
    const startTime = performance.now();
    
    function actualizar(now) {
        const elapsed = now - startTime;
        const progress = Math.min(elapsed / duracion, 1);
        
        // Easing out quadratic
        const easeProgress = progress * (2 - progress);
        const valorActual = Math.round(valorInicial + (valorDestino - valorInicial) * easeProgress);
        
        el.innerText = valorActual;
        
        if (progress < 1) {
            requestAnimationFrame(actualizar);
        } else {
            el.innerText = valorDestino;
        }
    }
    
    requestAnimationFrame(actualizar);
}

function animarContadorDecimal(elementId, valorDestino, decimales = 2, duracion = 800) {
    const el = document.getElementById(elementId);
    if (!el) return;
    
    const text = el.innerText.trim();
    const valorInicial = (text === '--' || text === '') ? 0.0 : (parseFloat(text) || 0.0);
    if (valorInicial === valorDestino) {
        el.innerText = valorDestino.toFixed(decimales);
        return;
    }
    
    const startTime = performance.now();
    
    function actualizar(now) {
        const elapsed = now - startTime;
        const progress = Math.min(elapsed / duracion, 1);
        
        // Easing out quadratic
        const easeProgress = progress * (2 - progress);
        const valorActual = valorInicial + (valorDestino - valorInicial) * easeProgress;
        
        el.innerText = valorActual.toFixed(decimales);
        
        if (progress < 1) {
            requestAnimationFrame(actualizar);
        } else {
            el.innerText = valorDestino.toFixed(decimales);
        }
    }
    
    requestAnimationFrame(actualizar);
}

function renderDashboardStats() {
    const total = dbViviendas.length;
    const verdes = dbViviendas.filter(v => v.estado === 'verde').length;
    const amarillas = dbViviendas.filter(v => v.estado === 'amarillo').length;
    const rojas = dbViviendas.filter(v => v.estado === 'rojo').length;
    
    const alertasActivas = dbAlertas.filter(a => a.activo).length;
    const alertasCriticas = dbAlertas.filter(a => a.activo && a.tipo === 'critica').length;

    // Calcular promedios generales de pH y Cloro de forma robusta
    let sumaPh = 0;
    let sumaCloro = 0;
    let validPhCount = 0;
    let validCloroCount = 0;
    dbViviendas.forEach(v => {
        const phVal = parseFloat(v.ph);
        const cloroVal = parseFloat(v.cloro);
        if (!isNaN(phVal)) {
            sumaPh += phVal;
            validPhCount++;
        }
        if (!isNaN(cloroVal)) {
            sumaCloro += cloroVal;
            validCloroCount++;
        }
    });
    const promPh = validPhCount > 0 ? parseFloat((sumaPh / validPhCount).toFixed(2)) : 0.0;
    const promCloro = validCloroCount > 0 ? parseFloat((sumaCloro / validCloroCount).toFixed(2)) : 0.0;

    // Actualizar elementos HTML usando las animaciones de contador
    animarContador('metric-total', total);
    animarContador('metric-green', verdes);
    animarContador('metric-yellow', amarillas);
    animarContador('metric-red', rojas);
    animarContador('metric-alerts', alertasActivas);
    
    animarContadorDecimal('avg-ph', promPh, 2);
    animarContadorDecimal('avg-cloro', promCloro, 2);

    // Actualizar porcentajes y leyendas (los IDs se actualizan conservando las tendencias fijas del HTML)
    const pctGreen = document.getElementById('pct-green');
    const pctYellow = document.getElementById('pct-yellow');
    const pctRed = document.getElementById('pct-red');
    if (total > 0) {
        if (pctGreen) pctGreen.innerText = ((verdes / total) * 100).toFixed(0) + '% del total';
        if (pctYellow) pctYellow.innerText = ((amarillas / total) * 100).toFixed(0) + '% del total';
        if (pctRed) pctRed.innerText = ((rojas / total) * 100).toFixed(0) + '% del total';
    } else {
        if (pctGreen) pctGreen.innerText = '0% del total';
        if (pctYellow) pctYellow.innerText = '0% del total';
        if (pctRed) pctRed.innerText = '0% del total';
    }

    const critAlertsSub = document.getElementById('crit-alerts-sub');
    if (critAlertsSub) critAlertsSub.innerText = alertasCriticas + ' Críticas';

    // Badge contador del Sidebar y de la cabecera
    const sidebarCount = document.getElementById('sidebar-alert-count');
    const headerAlertIndicator = document.getElementById('header-alert-indicator');
    if (sidebarCount) {
        if (alertasActivas > 0) {
            sidebarCount.innerText = alertasActivas;
            sidebarCount.style.display = 'inline-block';
        } else {
            sidebarCount.style.display = 'none';
        }
    }
    if (headerAlertIndicator) {
        if (alertasActivas > 0) {
            headerAlertIndicator.style.display = 'block';
        } else {
            headerAlertIndicator.style.display = 'none';
        }
    }
}

function renderDashboardRecentTables() {
    // 1. Tabla de últimas mediciones (las últimas 5 ingresadas en el historial)
    const tbody = document.getElementById('latest-measurements-tbody');
    tbody.innerHTML = '';

    // Ordenamos historial por fecha y hora (para propósitos de demostración asumimos el orden inverso del array)
    const ultimasMediciones = dbHistorial.slice().reverse().slice(0, 5);

    if (ultimasMediciones.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" class="text-center">No hay registros cargados.</td></tr>`;
    } else {
        ultimasMediciones.forEach(m => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td data-label="Vivienda"><strong>${m.viviendaNombre}</strong><br><span style="font-size: 11px; color: var(--text-secondary);">${m.responsable}</span></td>
                <td data-label="pH"><span class="font-semibold">${(m.ph !== null && m.ph !== undefined) ? Number(m.ph).toFixed(1) : 'S/D'}</span></td>
                <td data-label="Cloro"><span class="font-semibold">${(m.cloro !== null && m.cloro !== undefined) ? `${Number(m.cloro).toFixed(2)} mg/L` : 'S/D'}</span></td>
                <td data-label="Fecha">${m.fecha}</td>
                <td data-label="Estado"><span class="status-badge ${m.estado}">${m.estado === 'verde' ? 'Apta' : m.estado === 'amarillo' ? 'Alerta' : 'Crítico'}</span></td>
            `;
            tbody.appendChild(tr);
        });
    }

    // 2. Línea de tiempo de actividad reciente
    const timeline = document.getElementById('recent-activity-list');
    timeline.innerHTML = '';

    const ultimasActividades = dbActividades.slice(0, 5);
    if (ultimasActividades.length === 0) {
        timeline.innerHTML = '<p class="text-center font-medium" style="color: var(--text-secondary); padding: 12px 0;">Sin actividades recientes.</p>';
    } else {
        ultimasActividades.forEach(act => {
            const item = document.createElement('div');
            item.className = 'activity-item';
            item.innerHTML = `
                <span class="activity-dot ${act.tipo}"></span>
                <div class="activity-item-content">
                    <span class="activity-time">${act.fecha}</span>
                    <span class="activity-desc">${act.desc}</span>
                    <span class="activity-meta">${act.meta}</span>
                </div>
            `;
            timeline.appendChild(item);
        });
    }
}

function renderCharts() {
    const total = dbViviendas.length;
    const verdes = dbViviendas.filter(v => v.estado === 'verde').length;
    const amarillas = dbViviendas.filter(v => v.estado === 'amarillo').length;
    const rojas = dbViviendas.filter(v => v.estado === 'rojo').length;

    // --- GRÁFICO 3: DISTRIBUCIÓN DE CALIDAD (DONUT) ---
    const distCanvas = document.getElementById('distributionChart');
    if (distributionChartInstance) {
        distributionChartInstance.destroy();
    }
    
    distributionChartInstance = new Chart(distCanvas, {
        type: 'doughnut',
        data: {
            labels: ['Apto (Verde)', 'Observación (Amarillo)', 'Crítico (Rojo)'],
            datasets: [{
                data: [verdes, amarillas, rojas],
                backgroundColor: ['#22C55E', '#F59E0B', '#EF4444'],
                borderWidth: 2,
                borderColor: '#FFFFFF',
                hoverOffset: 6
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        boxWidth: 12,
                        padding: 15,
                        font: { size: 11, weight: '600' },
                        color: '#1E293B'
                    }
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const val = context.raw;
                            const pct = ((val / total) * 100).toFixed(0);
                            return ` ${context.label}: ${val} viv. (${pct}%)`;
                        }
                    }
                }
            },
            cutout: '65%'
        }
    });

    // --- CÁLCULO DE DATOS HISTÓRICOS PARA GRÁFICOS DE EVOLUCIÓN ---
    // Agrupamos el historial por fecha
    const ultimas7Fechas = [
        "2026-05-28", "2026-05-29", "2026-05-30", "2026-05-31", "2026-06-01", "2026-06-02", "2026-06-03"
    ];
    
    // Nombres legibles en español
    const labelsFechas = ["Jue 28/05", "Vie 29/05", "Sáb 30/05", "Dom 31/05", "Lun 01/06", "Mar 02/06", "Mié 03/06"];

    const promPhPorDia = [];
    const promCloroPorDia = [];

    ultimas7Fechas.forEach(fecha => {
        const registrosDia = dbHistorial.filter(h => h.fecha === fecha);
        if (registrosDia.length > 0) {
            const sumaPh = registrosDia.reduce((sum, r) => sum + r.ph, 0);
            const sumaCloro = registrosDia.reduce((sum, r) => sum + r.cloro, 0);
            promPhPorDia.push(parseFloat((sumaPh / registrosDia.length).toFixed(2)));
            promCloroPorDia.push(parseFloat((sumaCloro / registrosDia.length).toFixed(2)));
        } else {
            promPhPorDia.push(7.0); // Valores fallback por si acaso
            promCloroPorDia.push(1.0);
        }
    });

    // --- GRÁFICO 1: EVOLUCIÓN pH (LÍNEA) ---
    const phCanvas = document.getElementById('phChart');
    if (phChartInstance) {
        phChartInstance.destroy();
    }

    const ctxPh = phCanvas.getContext('2d');
    const gradientPh = ctxPh.createLinearGradient(0, 0, 0, 180);
    gradientPh.addColorStop(0, 'rgba(37, 99, 235, 0.22)');
    gradientPh.addColorStop(1, 'rgba(37, 99, 235, 0.00)');

    phChartInstance = new Chart(phCanvas, {
        type: 'line',
        data: {
            labels: labelsFechas,
            datasets: [{
                label: 'Promedio pH Semanal',
                data: promPhPorDia,
                borderColor: '#2563EB',
                backgroundColor: gradientPh,
                borderWidth: 3,
                fill: true,
                tension: 0.4,
                pointBackgroundColor: '#2563EB',
                pointBorderColor: '#FFFFFF',
                pointBorderWidth: 2,
                pointRadius: 5,
                pointHoverRadius: 7
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    min: 5.5,
                    max: 9.0,
                    grid: { color: '#E2E8F0' },
                    ticks: { color: '#64748B', font: { size: 10 } }
                },
                x: {
                    grid: { display: false },
                    ticks: { color: '#64748B', font: { size: 10 } }
                }
            },
            plugins: {
                legend: { display: false },
                tooltip: {
                    backgroundColor: '#0F172A',
                    titleFont: { size: 11 },
                    bodyFont: { size: 12 },
                    callbacks: {
                        label: function(context) {
                            return ` pH Promedio: ${context.raw}`;
                        }
                    }
                }
            }
        }
    });

    // --- GRÁFICO 2: EVOLUCIÓN CLORO (BARRAS O LÍNEA) ---
    const cloroCanvas = document.getElementById('cloroChart');
    if (cloroChartInstance) {
        cloroChartInstance.destroy();
    }

    const ctxCloro = cloroCanvas.getContext('2d');
    const gradientCloro = ctxCloro.createLinearGradient(0, 0, 0, 180);
    gradientCloro.addColorStop(0, 'rgba(6, 182, 212, 0.22)');
    gradientCloro.addColorStop(1, 'rgba(6, 182, 212, 0.00)');

    cloroChartInstance = new Chart(cloroCanvas, {
        type: 'line',
        data: {
            labels: labelsFechas,
            datasets: [{
                label: 'Promedio Cloro (mg/L)',
                data: promCloroPorDia,
                borderColor: '#06B6D4',
                backgroundColor: gradientCloro,
                borderWidth: 3,
                fill: true,
                tension: 0.4,
                pointBackgroundColor: '#06B6D4',
                pointBorderColor: '#FFFFFF',
                pointBorderWidth: 2,
                pointRadius: 5,
                pointHoverRadius: 7
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    min: 0.0,
                    max: 2.0,
                    grid: { color: '#E2E8F0' },
                    ticks: { color: '#64748B', font: { size: 10 } }
                },
                x: {
                    grid: { display: false },
                    ticks: { color: '#64748B', font: { size: 10 } }
                }
            },
            plugins: {
                legend: { display: false },
                tooltip: {
                    backgroundColor: '#0F172A',
                    titleFont: { size: 11 },
                    bodyFont: { size: 12 },
                    callbacks: {
                        label: function(context) {
                            return ` Cloro Promedio: ${context.raw} mg/L`;
                        }
                    }
                }
            }
        }
    });
}

// --- 2. REGISTRAR ANÁLISIS (WIZARD CONVERSACIONAL DE 4 PASOS) ---

let wizardState = {
    viviendaId: null,
    responsable: "",
    fecha: "",
    ph: 7.0,
    cloro: 1.00,
    observaciones: "",
    currentStep: 1
};

let newViviendaMap = null;
let newViviendaMarker = null;

function switchWizardTab(tab) {
    const btnExisting = document.getElementById('tab-btn-existing');
    const btnNew = document.getElementById('tab-btn-new');
    const panelExisting = document.getElementById('wizard-existing-panel');
    const panelNew = document.getElementById('wizard-new-panel');

    if (tab === 'existing') {
        btnExisting.classList.add('active');
        btnNew.classList.remove('active');
        panelExisting.style.display = 'block';
        panelNew.style.display = 'none';
    } else {
        btnExisting.classList.remove('active');
        btnNew.classList.add('active');
        panelExisting.style.display = 'none';
        panelNew.style.display = 'block';

        // Autogenerar código secuencial
        const nextId = "V-" + String(dbViviendas.length + 1).padStart(2, '0');
        document.getElementById('new-vivienda-id').value = nextId;

        // Inicializar mapa de registro
        setTimeout(() => {
            inicializarMapaRegistro();
            if (newViviendaMap) newViviendaMap.invalidateSize();
        }, 50);
    }
}

function inicializarFormularioWizard() {
    if (!document.getElementById('registrar')) return;

    // 1. Pestañas de Paso 1 (Existente / Nueva)
    document.getElementById('tab-btn-existing').addEventListener('click', () => switchWizardTab('existing'));
    document.getElementById('tab-btn-new').addEventListener('click', () => switchWizardTab('new'));

    // 2. Buscador de Viviendas en Paso 1 (Existentes)
    const searchInput = document.getElementById('wizard-search-vivienda');
    searchInput.addEventListener('input', (e) => {
        renderWizardViviendas(e.target.value);
    });

    // 3. Eventos del formulario de nueva vivienda
    document.getElementById('new-vivienda-propietario').addEventListener('input', actualizarPreviewNuevaVivienda);
    document.getElementById('new-vivienda-direccion').addEventListener('input', actualizarPreviewNuevaVivienda);
    document.getElementById('new-vivienda-sector').addEventListener('change', actualizarPreviewNuevaVivienda);
    document.getElementById('btn-use-current-location').addEventListener('click', obtenerUbicacionActualRegistro);
    document.getElementById('btn-search-new-vivienda-address').addEventListener('click', buscarDireccionRegistro);
    document.getElementById('btn-save-new-vivienda').addEventListener('click', guardarNuevaVivienda);

    // 4. Botones de navegación
    document.querySelectorAll('.btn-wizard-back').forEach(btn => {
        btn.addEventListener('click', () => {
            if (wizardState.currentStep > 1) {
                irAPaso(wizardState.currentStep - 1);
            }
        });
    });

    document.getElementById('btn-to-step-3').addEventListener('click', () => {
        irAPaso(3);
    });

    document.getElementById('btn-to-step-4').addEventListener('click', () => {
        irAPaso(4);
    });

    document.getElementById('btn-back-to-step-3').addEventListener('click', () => {
        irAPaso(3);
    });

    document.getElementById('btn-wizard-save-analysis').addEventListener('click', guardarAnalisisWizard);

    // Permitir clics en la barra de progreso para ir hacia atrás a pasos ya completados
    document.querySelectorAll('.wizard-progress-bar .progress-step').forEach(stepEl => {
        stepEl.addEventListener('click', () => {
            const stepNum = parseInt(stepEl.dataset.step);
            if (stepNum < wizardState.currentStep) {
                irAPaso(stepNum);
            }
        });
    });

    // 5. Inicializar tiras reactivas de pH y Cloro
    inicializarTirasReactivas();

    // Resetear al estado inicial
    resetWizard();
}

function resetWizard() {
    wizardState = {
        viviendaId: null,
        responsable: "",
        fecha: "",
        ph: 7.0,
        cloro: 1.00,
        observaciones: "",
        currentStep: 1
    };

    // Reset inputs
    document.getElementById('wizard-search-vivienda').value = "";
    document.getElementById('wizard-responsable').value = "";
    document.getElementById('wizard-observaciones').value = "";

    // Reset new vivienda fields
    document.getElementById('new-vivienda-propietario').value = "";
    document.getElementById('new-vivienda-direccion').value = "";
    document.getElementById('new-vivienda-telefono').value = "";
    document.getElementById('new-vivienda-obs').value = "";
    document.getElementById('new-vivienda-map-search').value = "";
    actualizarPreviewNuevaVivienda();

    // Set automatic date text
    const hoy = new Date();
    const hoyStr = hoy.getFullYear() + '-' + 
                   String(hoy.getMonth() + 1).padStart(2, '0') + '-' + 
                   String(hoy.getDate()).padStart(2, '0');
    wizardState.fecha = hoyStr;
    
    const legibleDate = String(hoy.getDate()).padStart(2, '0') + '/' + 
                        String(hoy.getMonth() + 1).padStart(2, '0') + '/' + 
                        hoy.getFullYear();
    document.getElementById('wizard-automatic-date-text').innerText = legibleDate;

    // Reset active color states in strips
    const phDefault = document.querySelector('#ph-color-scale .color-scale-card[data-ph="7.0"]');
    if (phDefault) phDefault.click();

    const cloroDefault = document.querySelector('#cloro-color-scale .color-scale-card[data-cloro="1.00"]');
    if (cloroDefault) cloroDefault.click();

    // Reset tabs
    switchWizardTab('existing');

    // Render step 1 list
    renderWizardViviendas();

    // Visual reset to Step 1
    document.querySelectorAll('.wizard-step-content').forEach(el => el.classList.remove('active'));
    document.getElementById('wizard-step-1').classList.add('active');

    document.querySelectorAll('.wizard-progress-bar .progress-step').forEach(stepEl => {
        stepEl.className = 'progress-step';
        if (stepEl.dataset.step === '1') stepEl.classList.add('active');
    });

    document.querySelectorAll('.wizard-progress-bar .progress-line').forEach(lineEl => {
        lineEl.classList.remove('completed');
    });
}

function renderWizardViviendas(filtro = "") {
    const grid = document.getElementById('wizard-viviendas-grid');
    if (!grid) return;
    grid.innerHTML = '';
    
    const query = filtro.toLowerCase().trim();
    const filtered = dbViviendas.filter(v => {
        return v.nombre.toLowerCase().includes(query) || 
               v.id.toLowerCase().includes(query) || 
               v.direccion.toLowerCase().includes(query);
    });

    if (filtered.length === 0) {
        grid.innerHTML = '<div style="grid-column: 1/-1; text-align: center; padding: 32px; color: var(--text-secondary);">No se encontraron viviendas.</div>';
        return;
    }

    filtered.forEach(v => {
        const card = document.createElement('div');
        card.className = `vivienda-wizard-card ${wizardState.viviendaId === v.id ? 'selected' : ''}`;
        card.dataset.id = v.id;
        
        const phText = (v.ph !== null && v.ph !== undefined) ? v.ph.toFixed(1) : 'S/D';
        const cloroText = (v.cloro !== null && v.cloro !== undefined) ? `${v.cloro.toFixed(2)}` : 'S/D';
        const fechaText = v.fecha ? v.fecha : 'Nunca';
        
        const statusLabels = {
            verde: 'Apto',
            amarillo: 'Observación',
            rojo: 'Riesgo'
        };
        const statusLabel = statusLabels[v.estado] || 'Sin Datos';

        card.innerHTML = `
            <div class="vivienda-card-header">
                <h4>${v.nombre}</h4>
                <span class="vivienda-code">${v.id}</span>
            </div>
            <div class="vivienda-card-body">
                <span><strong>Último:</strong> pH ${phText} | Cloro ${cloroText} mg/L</span>
                <span><strong>Fecha:</strong> ${fechaText}</span>
            </div>
            <div class="vivienda-card-footer">
                <span class="vivienda-status-pill ${v.estado || 'gris'}">${statusLabel}</span>
                <div class="semaphore-dot-indicator ${v.estado || 'gris'}"></div>
            </div>
        `;
        
        card.addEventListener('click', () => {
            wizardState.viviendaId = v.id;
            wizardState.responsable = v.responsable || "";
            document.getElementById('wizard-responsable').value = wizardState.responsable;
            
            document.querySelectorAll('.vivienda-wizard-card').forEach(c => c.classList.remove('selected'));
            card.classList.add('selected');
            
            setTimeout(() => {
                irAPaso(2);
            }, 250);
        });

        grid.appendChild(card);
    });
}

function inicializarTirasReactivas() {
    // Escala de pH
    const phCards = document.querySelectorAll('#ph-color-scale .color-scale-card');
    phCards.forEach(card => {
        card.addEventListener('click', function() {
            phCards.forEach(c => {
                c.classList.remove('active');
                const badge = c.querySelector('.selected-badge');
                if (badge) badge.remove();
            });

            this.classList.add('active');
            const badge = document.createElement('span');
            badge.className = 'selected-badge';
            badge.innerText = '✓';
            this.appendChild(badge);

            const val = parseFloat(this.getAttribute('data-ph'));
            const name = this.getAttribute('data-color-name');
            wizardState.ph = val;

            document.getElementById('ph-selected-color-name').innerText = name;
            document.getElementById('ph-selected-val').innerText = val.toFixed(1);

            // Cambiar color del pad de pH en la tira ilustrativa
            const visualPadPh = document.getElementById('visual-pad-ph');
            if (visualPadPh) {
                visualPadPh.setAttribute('fill', this.style.getPropertyValue('--scale-color'));
            }

            // Evaluar interpretación rápida
            const eval = evaluarCalidadAgua(val, wizardState.cloro);
            const badgeInterp = document.getElementById('ph-interpretation-badge');
            
            badgeInterp.className = `interpretation-badge ${eval.estado}`;
            if (eval.estado === 'verde') {
                badgeInterp.innerText = '🟢 Óptimo';
            } else if (eval.estado === 'amarillo') {
                badgeInterp.innerText = '🟡 Preventivo';
            } else {
                badgeInterp.innerText = '🔴 Crítico';
            }
        });
    });

    // Escala de Cloro
    const cloroCards = document.querySelectorAll('#cloro-color-scale .color-scale-card');
    cloroCards.forEach(card => {
        card.addEventListener('click', function() {
            cloroCards.forEach(c => {
                c.classList.remove('active');
                const badge = c.querySelector('.selected-badge');
                if (badge) badge.remove();
            });

            this.classList.add('active');
            const badge = document.createElement('span');
            badge.className = 'selected-badge';
            badge.innerText = '✓';
            this.appendChild(badge);

            const val = parseFloat(this.getAttribute('data-cloro'));
            const name = this.getAttribute('data-color-name');
            wizardState.cloro = val;

            document.getElementById('cloro-selected-color-name').innerText = name;
            document.getElementById('cloro-selected-val').innerText = val.toFixed(2) + ' mg/L';

            // Cambiar color del pad de cloro en la tira ilustrativa
            const visualPadCloro = document.getElementById('visual-pad-cloro');
            if (visualPadCloro) {
                visualPadCloro.setAttribute('fill', this.style.getPropertyValue('--scale-color'));
            }

            // Evaluar interpretación rápida
            const eval = evaluarCalidadAgua(wizardState.ph, val);
            const badgeInterp = document.getElementById('cloro-interpretation-badge');
            
            badgeInterp.className = `interpretation-badge ${eval.estado}`;
            if (eval.estado === 'verde') {
                badgeInterp.innerText = '🟢 Óptimo';
            } else if (eval.estado === 'amarillo') {
                badgeInterp.innerText = '🟡 Preventivo';
            } else {
                badgeInterp.innerText = '🔴 Crítico';
            }
        });
    });
}

function inicializarMapaRegistro() {
    if (newViviendaMap) return;
    
    // Centrado en Viva el Perú, Santiago, Cusco
    const centerVivaElPeru = [-13.5414, -71.9794];
    newViviendaMap = L.map('new-vivienda-map', {
        zoomControl: true,
        scrollWheelZoom: true
    }).setView(centerVivaElPeru, 16);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap'
    }).addTo(newViviendaMap);

    // Colocar un marcador inicial arrastrable
    newViviendaMarker = L.marker(centerVivaElPeru, {
        draggable: true
    }).addTo(newViviendaMap);

    // Listener para actualizar inputs al arrastrar el marcador
    newViviendaMarker.on('dragend', function() {
        const position = newViviendaMarker.getLatLng();
        document.getElementById('new-vivienda-lat').value = position.lat.toFixed(6);
        document.getElementById('new-vivienda-lng').value = position.lng.toFixed(6);
        actualizarPreviewNuevaVivienda();
    });

    // Listener para colocar el marcador al hacer clic en el mapa
    newViviendaMap.on('click', function(e) {
        newViviendaMarker.setLatLng(e.latlng);
        document.getElementById('new-vivienda-lat').value = e.latlng.lat.toFixed(6);
        document.getElementById('new-vivienda-lng').value = e.latlng.lng.toFixed(6);
        actualizarPreviewNuevaVivienda();
    });

    // Establecer coordenadas iniciales
    document.getElementById('new-vivienda-lat').value = centerVivaElPeru[0].toFixed(6);
    document.getElementById('new-vivienda-lng').value = centerVivaElPeru[1].toFixed(6);
}

function obtenerUbicacionActualRegistro() {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            (position) => {
                const lat = position.coords.latitude;
                const lng = position.coords.longitude;
                document.getElementById('new-vivienda-lat').value = lat.toFixed(6);
                document.getElementById('new-vivienda-lng').value = lng.toFixed(6);
                
                if (newViviendaMap && newViviendaMarker) {
                    newViviendaMarker.setLatLng([lat, lng]);
                    newViviendaMap.setView([lat, lng], 17);
                }
                actualizarPreviewNuevaVivienda();
                showToast(`Coordenadas GPS obtenidas con éxito: <strong>${lat.toFixed(5)}, ${lng.toFixed(5)}</strong>`, 'success', 4000, 'Ubicación Encontrada');
            },
            (error) => {
                console.warn("Error de geolocalización, usando fallback.", error);
                // Fallback: usar el centro actual y simular un pequeño desvío
                const center = [-13.5414 + (Math.random() * 0.001 - 0.0005), -71.9794 + (Math.random() * 0.001 - 0.0005)];
                document.getElementById('new-vivienda-lat').value = center[0].toFixed(6);
                document.getElementById('new-vivienda-lng').value = center[1].toFixed(6);
                if (newViviendaMap && newViviendaMarker) {
                    newViviendaMarker.setLatLng(center);
                    newViviendaMap.setView(center, 16);
                }
                actualizarPreviewNuevaVivienda();
                showToast("No se pudo obtener la posición GPS exacta. Se ha colocado un marcador temporal en la zona central.", 'warning', 5000, 'Error de Ubicación');
            },
            { enableHighAccuracy: true, timeout: 5000 }
        );
    } else {
        showToast("La geolocalización no es compatible con este navegador.", 'error', 4000, 'No Compatible');
    }
}

function buscarDireccionRegistro() {
    const query = document.getElementById('new-vivienda-map-search').value.toLowerCase().trim();
    if (!query) return;

    // Coordenadas simuladas para sectores en Santiago, Cusco
    const mockCoordinates = {
        "viva el peru": [-13.5414, -71.9794],
        "manco capac": [-13.5415, -71.9791],
        "inti raymi": [-13.5422, -71.9775],
        "carmen alto": [-13.5448, -71.9789],
        "wiracocha": [-13.5445, -71.9818],
        "san martin": [-13.5435, -71.9785],
        "ollantaytambo": [-13.5391, -71.9801],
        "chankas": [-13.5409, -71.9832]
    };

    let foundCoords = null;
    for (const key in mockCoordinates) {
        if (query.includes(key)) {
            foundCoords = mockCoordinates[key];
            break;
        }
    }

    // Si no se encuentra, usar el centro de Viva el Perú con una pequeña desviación pseudo-aleatoria basada en el texto
    if (!foundCoords) {
        let hash = 0;
        for (let i = 0; i < query.length; i++) {
            hash = query.charCodeAt(i) + ((hash << 5) - hash);
        }
        const latOffset = ((hash % 100) / 10000) - 0.005;
        const lngOffset = (((hash >> 8) % 100) / 10000) - 0.005;
        foundCoords = [-13.5414 + latOffset, -71.9794 + lngOffset];
    }

    if (newViviendaMap && newViviendaMarker) {
        newViviendaMarker.setLatLng(foundCoords);
        newViviendaMap.setView(foundCoords, 17);
        document.getElementById('new-vivienda-lat').value = foundCoords[0].toFixed(6);
        document.getElementById('new-vivienda-lng').value = foundCoords[1].toFixed(6);
        actualizarPreviewNuevaVivienda();
    }
}

function actualizarPreviewNuevaVivienda() {
    const propietario = document.getElementById('new-vivienda-propietario').value.trim();
    const direccion = document.getElementById('new-vivienda-direccion').value.trim();
    const lat = document.getElementById('new-vivienda-lat').value;
    const lng = document.getElementById('new-vivienda-lng').value;
    const sector = document.getElementById('new-vivienda-sector').value;

    const previewText = document.getElementById('new-vivienda-preview-text');
    if (propietario && direccion && lat && lng) {
        previewText.innerHTML = `🏠 <strong>${sector}:</strong> ${direccion} | 👤 <strong>Propietario:</strong> ${propietario} | 📍 <strong>Coords:</strong> ${lat}, ${lng}`;
    } else {
        previewText.innerHTML = `Complete los campos requeridos (*)`;
    }
}

async function guardarNuevaVivienda() {
    const id = document.getElementById('new-vivienda-id').value;
    const propietario = document.getElementById('new-vivienda-propietario').value.trim();
    const direccion = document.getElementById('new-vivienda-direccion').value.trim();
    const sector = document.getElementById('new-vivienda-sector').value;
    const telefono = document.getElementById('new-vivienda-telefono').value.trim();
    const obs = document.getElementById('new-vivienda-obs').value.trim() || "Sin observaciones iniciales.";
    const lat = parseFloat(document.getElementById('new-vivienda-lat').value);
    const lng = parseFloat(document.getElementById('new-vivienda-lng').value);

    if (!propietario || !direccion || isNaN(lat) || isNaN(lng)) {
        showToast("Por favor, complete todos los campos marcados con asterisco (*) y verifique las coordenadas.", 'warning', 4000, "Campos Incompletos");
        return;
    }

    const nuevaViv = {
        id: id,
        nombre: propietario,
        direccion: direccion,
        latitud: lat,
        longitud: lng,
        estado: "gris",
        observaciones: obs,
        telefono: telefono,
        sector: sector
    };

    try {
        const res = await fetch('api/viviendas.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(nuevaViv)
        });
        const result = await res.json();
        if (result.success) {
            await cargarDatosServidor();
            
            // Mostrar toast de éxito
            showToast(`La vivienda de la familia <strong>${propietario}</strong> se añadió con éxito con código <strong>${id}</strong>.`, 'success', 5000, "Vivienda Registrada");

            // Seleccionar automáticamente la nueva vivienda en el asistente y pasar al paso 2
            wizardState.viviendaId = id;
            wizardState.responsable = propietario;
            document.getElementById('wizard-responsable').value = propietario;

            // Resetear formulario
            document.getElementById('new-vivienda-propietario').value = "";
            document.getElementById('new-vivienda-direccion').value = "";
            document.getElementById('new-vivienda-telefono').value = "";
            document.getElementById('new-vivienda-obs').value = "";
            actualizarPreviewNuevaVivienda();
            
            // Volver a la pestaña de Selección de vivienda para mantener la visual consistente
            switchWizardTab('existing');

            renderWizardViviendas();
            irAPaso(2);
        } else {
            showToast(result.error, 'error', 4000, "Error");
        }
    } catch (err) {
        console.error(err);
        showToast("Error de conexión con el servidor.", 'error', 4000, "Error");
    }
}

function irAPaso(paso) {
    if (paso > wizardState.currentStep) {
        if (wizardState.currentStep === 1 && !wizardState.viviendaId) {
            showToast("Por favor, selecciona una vivienda haciendo clic en su tarjeta antes de avanzar.", 'warning', 4000, "Selección Requerida");
            return;
        }
        if (wizardState.currentStep === 2) {
            const respVal = document.getElementById('wizard-responsable').value.trim();
            if (!respVal) {
                showToast("Por favor, ingresa el nombre de la persona responsable del análisis.", 'warning', 4000, "Campo Requerido");
                return;
            }
            wizardState.responsable = respVal;
            wizardState.observaciones = document.getElementById('wizard-observaciones').value;
        }
    }

    // Toggle step classes
    document.querySelectorAll('.wizard-step-content').forEach(el => el.classList.remove('active'));
    document.getElementById(`wizard-step-${paso}`).classList.add('active');

    // Update progress steps
    document.querySelectorAll('.wizard-progress-bar .progress-step').forEach(stepEl => {
        const stepNum = parseInt(stepEl.dataset.step);
        stepEl.className = 'progress-step';
        if (stepNum === paso) {
            stepEl.classList.add('active');
        } else if (stepNum < paso) {
            stepEl.classList.add('completed');
        }
    });
    
    // Update progress lines
    document.querySelectorAll('.wizard-progress-bar .progress-line').forEach((lineEl, idx) => {
        if (idx < paso - 1) {
            lineEl.classList.add('completed');
        } else {
            lineEl.classList.remove('completed');
        }
    });

    wizardState.currentStep = paso;

    if (paso === 4) {
        renderStep4Resultado();
    }
}

function renderStep4Resultado() {
    const ph = wizardState.ph;
    const cloro = wizardState.cloro;
    const eval = evaluarCalidadAgua(ph, cloro);

    const banner = document.getElementById('wizard-result-banner');
    const iconHolder = document.getElementById('wizard-result-icon');
    const title = document.getElementById('wizard-result-title');
    const desc = document.getElementById('wizard-result-desc');

    banner.className = `full-screen-result-banner ${eval.estado}`;
    title.innerText = eval.resultado.toUpperCase();
    desc.innerText = eval.detalles;

    if (eval.estado === 'verde') {
        iconHolder.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" width="24" height="24"><polyline points="20 6 9 17 4 12"/></svg>`;
    } else if (eval.estado === 'amarillo') {
        iconHolder.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" width="24" height="24"><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`;
    } else {
        iconHolder.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" width="24" height="24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`;
    }

    const recList = document.getElementById('wizard-recommendations-list');
    recList.innerHTML = '';
    eval.recomendaciones.forEach(r => {
        const li = document.createElement('li');
        li.innerText = r;
        recList.appendChild(li);
    });

    const viv = dbViviendas.find(v => v.id === wizardState.viviendaId);
    document.getElementById('summary-vivienda-name').innerText = viv ? `${viv.id} - ${viv.nombre}` : 'No seleccionada';
    document.getElementById('summary-responsable-name').innerText = wizardState.responsable;
    document.getElementById('summary-date-text').innerText = obtenerFechaActualLegible();
    document.getElementById('summary-ph-value').innerText = ph.toFixed(1);
    document.getElementById('summary-cloro-value').innerText = cloro.toFixed(2) + ' mg/L';
    document.getElementById('summary-observations-text').innerText = wizardState.observaciones || 'Sin anomalías reportadas.';
}

async function guardarAnalisisWizard() {
    const btn = document.getElementById('btn-wizard-save-analysis');
    if (btn.disabled) return;

    const viviendaId = wizardState.viviendaId;
    const responsable = wizardState.responsable;
    const fecha = wizardState.fecha;
    const ph = wizardState.ph;
    const cloro = wizardState.cloro;
    const observaciones = wizardState.observaciones || "Sin anomalías reportadas.";

    if (!viviendaId) {
        showToast("Debe seleccionar una vivienda para realizar el análisis.", 'warning', 4000, "Error de Selección");
        return;
    }

    const payload = {
        viviendaId: viviendaId,
        responsable: responsable,
        fecha: fecha,
        ph: ph,
        cloro: cloro,
        observaciones: observaciones
    };

    const originalHTML = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = `<span class="spinner-btn-loader"></span> Guardando...`;

    try {
        const res = await fetch('api/analisis.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const result = await res.json();
        if (result.success) {
            await cargarDatosServidor();
            
            const indexViv = dbViviendas.findIndex(v => v.id === viviendaId);
            const viviendaNombre = indexViv !== -1 ? dbViviendas[indexViv].nombre : viviendaId;
            
            showToast(`El análisis de calidad de agua para la vivienda de <strong>${viviendaNombre}</strong> ha sido guardado exitosamente.`, 'success', 5000, "Registro Completo");

            resetWizard();
            cambiarPestana('dashboard');
        } else {
            showToast(result.error, 'error', 4000, "Error");
        }
    } catch (err) {
        console.error(err);
        showToast("Error de conexión con el servidor.", 'error', 4000, "Error");
    } finally {
        btn.disabled = false;
        btn.innerHTML = originalHTML;
    }
}

function seleccionarViviendaEnWizard(viviendaId) {
    cambiarPestana('registrar');
    
    wizardState.viviendaId = viviendaId;
    const viv = dbViviendas.find(v => v.id === viviendaId);
    if (viv) {
        wizardState.responsable = viv.responsable || "";
        document.getElementById('wizard-responsable').value = wizardState.responsable;
    }
    
    renderWizardViviendas();
    irAPaso(2);
}

// --- 3. MAPA COMUNITARIO (SISTEMA DE INFORMACIÓN GEOGRÁFICA) ---

function inicializarMapa() {
    if (map) return; // Ya inicializado

    // Centrado en Viva el Perú, Santiago, Cusco
    const centerVivaElPeru = [-13.5414, -71.9794];
    
    // Crear el mapa
    map = L.map('map-view', {
        zoomControl: true,
        scrollWheelZoom: true
    }).setView(centerVivaElPeru, 16);

    // Capa de OpenStreetMap con estilo claro institucional
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors | Semáforo Hídrico Cusco'
    }).addTo(map);

    // Inicializar los marcadores en base a los datos
    actualizarMarcadoresMapa();
    actualizarHeatmap();

    // Eventos para filtros del mapa (Premium Cards)
    const filterCards = document.querySelectorAll('[data-map-filter]');
    filterCards.forEach(card => {
        card.addEventListener('click', function() {
            filterCards.forEach(c => c.classList.remove('active'));
            this.classList.add('active');
            
            currentMapFilter = this.getAttribute('data-map-filter');
            filtrarMarcadoresMapa(currentMapFilter);
        });
    });

    // Control de Toggle de Heatmap
    document.getElementById('btn-toggle-heatmap').addEventListener('click', function() {
        showHeatmap = !showHeatmap;
        if (showHeatmap) {
            this.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg> Ocultar Heatmap`;
            this.classList.add('active');
        } else {
            this.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg> Mostrar Heatmap`;
            this.classList.remove('active');
        }
        actualizarHeatmap();
    });

    // Modos de Visualización
    document.getElementById('btn-mode-markers').addEventListener('click', function() {
        cambiarModoVisualizacionMap('markers');
    });

    document.getElementById('btn-mode-heatmap').addEventListener('click', function() {
        cambiarModoVisualizacionMap('heatmap');
    });

    document.getElementById('btn-mode-combined').addEventListener('click', function() {
        cambiarModoVisualizacionMap('combined');
    });

    // Actualizar contadores y KPIs de filtros de mapa
    actualizarKPIsMapa();
}

function cambiarModoVisualizacionMap(modo) {
    currentViewMode = modo;
    
    // Actualizar botones activos
    document.getElementById('btn-mode-markers').classList.remove('active');
    document.getElementById('btn-mode-heatmap').classList.remove('active');
    document.getElementById('btn-mode-combined').classList.remove('active');
    
    document.getElementById(`btn-mode-${modo}`).classList.add('active');

    // Aplicar lógica de capas
    if (modo === 'markers') {
        // Mostrar marcadores filtrados, ocultar calor
        filtrarMarcadoresMapa(currentMapFilter);
        if (heatmapLayer && map.hasLayer(heatmapLayer)) {
            map.removeLayer(heatmapLayer);
        }
    } 
    else if (modo === 'heatmap') {
        // Ocultar todos los marcadores, mostrar calor
        mapMarkers.forEach(m => map.removeLayer(m));
        showHeatmap = true;
        
        // Sincronizar botón toggle heatmap
        const btnToggle = document.getElementById('btn-toggle-heatmap');
        btnToggle.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg> Ocultar Heatmap`;
        btnToggle.classList.add('active');

        actualizarHeatmap();
    } 
    else if (modo === 'combined') {
        // Mostrar marcadores filtrados y calor
        filtrarMarcadoresMapa(currentMapFilter);
        showHeatmap = true;

        const btnToggle = document.getElementById('btn-toggle-heatmap');
        btnToggle.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg> Ocultar Heatmap`;
        btnToggle.classList.add('active');

        actualizarHeatmap();
    }
}

function actualizarKPIsMapa() {
    const total = dbViviendas.length;
    const verdes = dbViviendas.filter(v => v.estado === 'verde').length;
    const amarillas = dbViviendas.filter(v => v.estado === 'amarillo').length;
    const rojas = dbViviendas.filter(v => v.estado === 'rojo').length;
    const alertas = dbAlertas.filter(a => a.activo).length;

    // Actualizar fila superior de KPIs
    document.getElementById('map-kpi-total').innerText = total;
    document.getElementById('map-kpi-green').innerText = verdes;
    document.getElementById('map-kpi-yellow').innerText = amarillas;
    document.getElementById('map-kpi-red').innerText = rojas;
    document.getElementById('map-kpi-alerts').innerText = alertas;

    // Calcular Índice de Calidad Hídrica General (Score de salud ponderado)
    // Verde = 100, Amarillo = 70, Rojo = 20
    const score = total > 0 ? Math.round(((verdes * 100 + amarillas * 70 + rojas * 20) / total)) : 0;

    document.getElementById('map-index-value').innerText = `${score}%`;
    const progressBar = document.getElementById('map-index-progress');
    progressBar.style.width = `${score}%`;

    const scoreBadge = document.getElementById('map-index-badge');
    const indexCard = document.getElementById('kpi-water-index-card');

    // Quitar clases previas
    indexCard.className = 'map-kpi-card kpi-highlight-card';
    scoreBadge.className = 'index-quality-badge';

    if (score >= 85) {
        scoreBadge.innerText = '🟢 Excelente';
        scoreBadge.classList.add('green');
        progressBar.style.backgroundColor = 'var(--color-green)';
    } else if (score >= 60) {
        scoreBadge.innerText = '🟡 Regular';
        scoreBadge.classList.add('yellow');
        indexCard.classList.add('yellow-score');
        progressBar.style.backgroundColor = 'var(--color-yellow)';
    } else {
        scoreBadge.innerText = '🔴 Crítico';
        scoreBadge.classList.add('red');
        indexCard.classList.add('red-score');
        progressBar.style.backgroundColor = 'var(--color-red)';
    }

    // Actualizar conteos en filtros premium laterales
    document.getElementById('map-premium-cnt-all').innerText = total;
    document.getElementById('map-premium-cnt-green').innerText = verdes;
    document.getElementById('map-premium-cnt-yellow').innerText = amarillas;
    document.getElementById('map-premium-cnt-red').innerText = rojas;
}

function actualizarMarcadoresMapa() {
    if (!map) return;

    // Limpiar marcadores antiguos
    mapMarkers.forEach(m => map.removeLayer(m));
    mapMarkers = [];
    viviendasMarkers = {};

    const centerVivaElPeru = [-13.5414, -71.9794];

    dbViviendas.forEach(viv => {
        const lat = parseFloat(viv.latitud);
        const lng = parseFloat(viv.longitud);
        const tieneCoords = !isNaN(lat) && !isNaN(lng) && lat !== 0 && lng !== 0;

        let markerCoords;
        let customIcon;
        let popupContent;

        if (tieneCoords) {
            markerCoords = [lat, lng];
            customIcon = L.divIcon({
                className: 'custom-leaflet-marker',
                html: `<div class="custom-marker-pin ${viv.estado}"></div>`,
                iconSize: [28, 28],
                iconAnchor: [14, 28],
                popupAnchor: [0, -26]
            });

            const eval = evaluarCalidadAgua(viv.ph, viv.cloro);
            popupContent = `
                <div class="map-popup-card">
                    <div class="map-popup-header ${viv.estado}">
                        <h4>${viv.nombre}</h4>
                        <span>📍 Dirección: ${viv.direccion}</span>
                    </div>
                    <div class="map-popup-body">
                        <div class="popup-grid-specs">
                            <div class="popup-spec-box">
                                <span class="label">pH</span>
                                <span class="value">${(viv.ph !== null && viv.ph !== undefined) ? viv.ph.toFixed(1) : 'S/D'}</span>
                            </div>
                            <div class="popup-spec-box">
                                <span class="label">Cloro Residual</span>
                                <span class="value">${(viv.cloro !== null && viv.cloro !== undefined) ? viv.cloro.toFixed(2) : 'S/D'} mg/L</span>
                            </div>
                        </div>
                        <div class="popup-info-list">
                            <div class="popup-info-row">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14">
                                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                                    <circle cx="12" cy="7" r="4"/>
                                </svg>
                                <span>Responsable: <strong>${viv.responsable || 'No asignado'}</strong></span>
                            </div>
                            <div class="popup-info-row">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14">
                                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                                    <line x1="16" y1="2" x2="16" y2="6"/>
                                    <line x1="8" y1="2" x2="8" y2="6"/>
                                    <line x1="3" y1="10" x2="21" y2="10"/>
                                </svg>
                                <span>Fecha Control: <strong>${viv.fecha || 'Nunca'}</strong></span>
                            </div>
                        </div>
                        <div class="popup-recommendation ${viv.estado}">
                            <strong>Medida:</strong> ${eval.recomendaciones[0]}
                        </div>
                    </div>
                </div>
            `;
        } else {
            // Vivienda sin ubicación geográfica: colocar marcador gris en el centro del mapa con advertencia
            const offsetLat = (Math.random() * 0.0006 - 0.0003);
            const offsetLng = (Math.random() * 0.0006 - 0.0003);
            markerCoords = [centerVivaElPeru[0] + offsetLat, centerVivaElPeru[1] + offsetLng];
            
            customIcon = L.divIcon({
                className: 'custom-leaflet-marker',
                html: `<div class="custom-marker-pin gris" style="box-shadow: 0 0 10px rgba(148, 163, 184, 0.8);"></div>`,
                iconSize: [28, 28],
                iconAnchor: [14, 28],
                popupAnchor: [0, -26]
            });

            popupContent = `
                <div class="map-popup-card">
                    <div class="map-popup-header gris" style="background: linear-gradient(135deg, #94a3b8 0%, #64748b 100%);">
                        <h4>${viv.nombre}</h4>
                        <span>⚠️ Sin Ubicación Geográfica</span>
                    </div>
                    <div class="map-popup-body">
                        <p style="font-size:12px; color:var(--color-red-hover); font-weight:700; margin:0;">
                            Vivienda sin coordenadas geográficas válidas en MySQL.
                        </p>
                        <p style="font-size:11px; color:var(--text-secondary); line-height: 1.35; margin: 4px 0 0 0;">
                            Se muestra temporalmente en el centro. Reubíquela desde la pestaña de <strong>Administrar Viviendas</strong>.
                        </p>
                        <div class="popup-info-list" style="margin-top: 8px;">
                            <div class="popup-info-row">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14">
                                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                                    <circle cx="12" cy="7" r="4"/>
                                </svg>
                                <span>Responsable: <strong>${viv.responsable || 'No asignado'}</strong></span>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        }

        const marker = L.marker(markerCoords, { icon: customIcon })
            .bindPopup(popupContent);
        
        // Guardamos metadatos en el marcador para el filtrado en caliente
        marker.estado = tieneCoords ? viv.estado : 'gris';
        
        // Si el modo de visualización actual no es "heatmap", lo añadimos al mapa
        if (currentViewMode !== 'heatmap') {
            marker.addTo(map);
        }
        mapMarkers.push(marker);
        viviendasMarkers[viv.id] = marker;
    });

    actualizarKPIsMapa();
    actualizarHeatmap();

    // Encuadrar el mapa dinámicamente según los marcadores para incluir viviendas nuevas/desplazadas
    if (mapMarkers.length > 0 && currentMapFilter === 'todos') {
        const group = new L.featureGroup(mapMarkers);
        map.fitBounds(group.getBounds().pad(0.1));
    }
}

function filtrarMarcadoresMapa(filtro) {
    if (!map) return;
    
    // Si estamos en modo "heatmap" puro, no alteramos capas de marcadores directamente
    if (currentViewMode === 'heatmap') return;

    mapMarkers.forEach(m => {
        if (filtro === 'todos' || m.estado === filtro) {
            if (!map.hasLayer(m)) {
                map.addLayer(m);
            }
        } else {
            if (map.hasLayer(m)) {
                map.removeLayer(m);
            }
        }
    });
}

function actualizarHeatmap() {
    if (!map) return;

    // Eliminar capa anterior si existe
    if (heatmapLayer) {
        map.removeLayer(heatmapLayer);
        heatmapLayer = null;
    }

    // Si el toggle del Heatmap está desactivado, no dibujar nada
    if (!showHeatmap) return;

    // Preparar puntos de calor basados en el riesgo sanitario de las viviendas
    // Puntos: [lat, lng, intensidad]
    // Verde (Calidad óptima = Sin riesgo) -> Baja intensidad de calor (0.15)
    // Amarillo (Prevención) -> Mediana intensidad (0.6)
    // Rojo (Crítico = Alto riesgo) -> Máxima intensidad (1.0)
    const puntosCalor = dbViviendas.map(viv => {
        let intensidad = 0.15;
        if (viv.estado === 'amarillo') intensidad = 0.6;
        else if (viv.estado === 'rojo') intensidad = 1.0;
        return [viv.latitud, viv.longitud, intensidad];
    });

    // Crear la capa de calor de Leaflet
    heatmapLayer = L.heatLayer(puntosCalor, {
        radius: 40,
        blur: 25,
        maxZoom: 17,
        gradient: {
            0.2: '#22C55E', // Influencia Verde (Riesgo Bajo)
            0.65: '#F59E0B', // Influencia Amarilla (Riesgo Medio)
            1.0: '#EF4444'  // Influencia Roja (Riesgo Alto)
        }
    });

    heatmapLayer.addTo(map);
}

// --- 4. PANEL DE ALERTAS ---

let alertFilterContador = null; // 'critica' | 'preventiva' | 'informativa' | null

function renderAlertasCards() {
    const listContainer = document.getElementById('alerts-cards-list');
    if (!listContainer) return;
    
    listContainer.innerHTML = '';

    const buscador = document.getElementById('alert-search').value.toLowerCase();
    const filtroActivo = document.querySelector('.btn-filter.active').getAttribute('data-alert-filter');

    // 1. Calcular y actualizar los contadores interactivos superiores (solo cuentan alertas activas)
    const cntCritica = dbAlertas.filter(a => a.activo && a.tipo === 'critica').length;
    const cntPreventiva = dbAlertas.filter(a => a.activo && a.tipo === 'preventiva').length;
    const cntInformativa = dbAlertas.filter(a => a.activo && a.tipo === 'informativa').length;

    const cntCriticaEl = document.getElementById('alert-cnt-critica');
    const cntPreventivaEl = document.getElementById('alert-cnt-preventiva');
    const cntInformativaEl = document.getElementById('alert-cnt-informativa');

    if (cntCriticaEl) cntCriticaEl.innerText = cntCritica;
    if (cntPreventivaEl) cntPreventivaEl.innerText = cntPreventiva;
    if (cntInformativaEl) cntInformativaEl.innerText = cntInformativa;

    // 2. Filtrar alertas
    let alertasFiltradas = dbAlertas.filter(a => {
        const coincideBuscador = a.viviendaNombre.toLowerCase().includes(buscador) || 
                                 a.responsable.toLowerCase().includes(buscador) || 
                                 a.viviendaId.toLowerCase().includes(buscador);
        
        // Filtro por botones textuales (Todas, Críticas, Preventivas, Informativas)
        let coincideFiltroTexto = false;
        if (filtroActivo === 'all') coincideFiltroTexto = true;
        else if (filtroActivo === 'critica' && a.tipo === 'critica') coincideFiltroTexto = true;
        else if (filtroActivo === 'preventiva' && a.tipo === 'preventiva') coincideFiltroTexto = true;
        else if (filtroActivo === 'informativa' && a.tipo === 'informativa') coincideFiltroTexto = true;

        // Filtro por tarjetas de contador superior (hacer clic en ellas)
        let coincideFiltroContador = true;
        if (alertFilterContador !== null) {
            coincideFiltroContador = (a.tipo === alertFilterContador);
        }

        return coincideBuscador && coincideFiltroTexto && coincideFiltroContador;
    });

    // 3. Ordenamiento por gravedad (Críticas 🔴 > Preventivas 🟡 > Informativas 🟢) y fecha descendente
    const prioridades = {
        'critica': 3,
        'preventiva': 2,
        'informativa': 1
    };

    alertasFiltradas.sort((a, b) => {
        const pA = prioridades[a.tipo] || 0;
        const pB = prioridades[b.tipo] || 0;

        if (pA !== pB) {
            return pB - pA; // Mayor gravedad arriba
        }

        // Si tienen la misma gravedad, ordenar por fecha descendente
        return b.fecha.localeCompare(a.fecha);
    });

    // Renderizar estado vacío
    if (alertasFiltradas.length === 0) {
        listContainer.innerHTML = `
            <div class="empty-state">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                    <circle cx="12" cy="12" r="10"/>
                    <path d="m9 12 2 2 4-4"/>
                </svg>
                <h4>Sin Alertas Coincidentes</h4>
                <p>No se encontraron registros de alerta que coincidan con la búsqueda o filtros seleccionados.</p>
            </div>
        `;
        return;
    }

    // 4. Renderizar tarjetas de alerta rediseñadas
    alertasFiltradas.forEach(al => {
        const card = document.createElement('div');
        card.className = `alert-card ${al.tipo} ${al.activo ? '' : 'resolved'}`;
        card.setAttribute('onclick', `abrirDrawerAlerta('${al.id}')`);

        // Generar icono SVG adecuado
        let iconSvg = "";
        let buttonText = "Ver Detalles";
        let buttonClass = "btn-informativa";
        
        if (al.tipo === 'critica') {
            buttonText = "Atender Urgente";
            buttonClass = "btn-critica";
            iconSvg = `
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="24" height="24">
                    <path d="M12 22a7 7 0 0 0 7-7c0-4.3-7-11-7-11S5 10.7 5 15a7 7 0 0 0 7 7z"/>
                    <line x1="12" y1="11" x2="12" y2="14" stroke-linecap="round"/>
                    <circle cx="12" cy="17" r="0.75" fill="currentColor"/>
                </svg>
            `;
        } else if (al.tipo === 'preventiva') {
            buttonText = "Programar Revisión";
            buttonClass = "btn-preventiva";
            iconSvg = `
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="24" height="24">
                    <path d="M12 22a7 7 0 0 0 7-7c0-4.3-7-11-7-11S5 10.7 5 15a7 7 0 0 0 7 7z"/>
                    <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" stroke-linecap="round"/>
                    <line x1="12" y1="17" x2="12.01" y2="17" stroke-linecap="round"/>
                </svg>
            `;
        } else {
            // Informativa
            buttonText = "Ver Detalles";
            buttonClass = "btn-informativa";
            iconSvg = `
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="24" height="24">
                    <path d="M12 22a7 7 0 0 0 7-7c0-4.3-7-11-7-11S5 10.7 5 15a7 7 0 0 0 7 7z"/>
                    <polyline points="9 15 11 17 15 13" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
            `;
        }

        const badgeLabels = {
            'critica': '🔴 CRÍTICA',
            'preventiva': '🟡 PREVENTIVA',
            'informativa': '🟢 INFORMATIVA'
        };
        const badgeLabel = al.activo ? badgeLabels[al.tipo] : '✓ RESUELTA';

        // Renderizado del HTML con la estructura moderna
        card.innerHTML = `
            <div class="alert-card-icon-wrapper">
                ${iconSvg}
            </div>
            <div class="alert-card-content-wrapper">
                <div class="alert-card-header">
                    <span class="alert-title">${al.viviendaNombre} (${al.viviendaId})</span>
                    <span class="alert-type-badge">${badgeLabel}</span>
                </div>
                <p class="alert-desc">${al.descripcion}</p>
                <div class="alert-card-footer">
                    <span class="alert-time-elapsed">${calcularTiempoTranscurrido(al.fecha)}</span>
                    <div class="alert-actions-group">
                        <button type="button" class="alert-btn ${al.activo ? 'btn-secondary-action' : 'btn-informativa'}" onclick="toggleEstadoAlerta('${al.id}', event)">
                            ${al.activo ? 'Resolver' : 'Reabrir'}
                        </button>
                        <button type="button" class="alert-btn ${buttonClass}">
                            ${buttonText}
                        </button>
                    </div>
                </div>
            </div>
        `;
        listContainer.appendChild(card);
    });
}

// Cambiar estado activo/inactivo de la alerta (Resolver / Reabrir) para sumarlo o restarlo del contador
window.toggleEstadoAlerta = async function(alertaId, event) {
    if (event) event.stopPropagation(); // Evitar que se abra el drawer al presionar el botón

    try {
        const res = await fetch('api/alertas.php', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: alertaId })
        });
        const result = await res.json();
        if (result.success) {
            await cargarDatosServidor();
            
            const drawer = document.getElementById('alert-detail-drawer');
            if (drawer && drawer.classList.contains('active') && drawer.dataset.alertaId === String(alertaId)) {
                renderDrawerContent(alertaId);
            }
            showToast("Estado de la alerta actualizado.", 'success', 3000);
        } else {
            showToast("Error al actualizar alerta: " + result.error, 'error', 5000);
        }
    } catch (err) {
        console.error(err);
        showToast("Error de conexión al actualizar alerta.", 'error', 4000);
    }
};

window.toggleFiltroContador = function(tipo) {
    const cardCritica = document.getElementById('summary-card-critica');
    const cardPreventiva = document.getElementById('summary-card-preventiva');
    const cardInformativa = document.getElementById('summary-card-informativa');

    if (!cardCritica || !cardPreventiva || !cardInformativa) return;

    // Quitar clases activas previas
    cardCritica.classList.remove('active');
    cardPreventiva.classList.remove('active');
    cardInformativa.classList.remove('active');

    if (alertFilterContador === tipo) {
        // Desactivar filtro
        alertFilterContador = null;
    } else {
        // Activar el filtro
        alertFilterContador = tipo;
        document.getElementById(`summary-card-${tipo}`).classList.add('active');
    }

    renderAlertasCards();
};

// --- LOGICA DEL DRAWER LATERAL ---

window.abrirDrawerAlerta = function(alertaId) {
    const drawer = document.getElementById('alert-detail-drawer');
    if (!drawer) return;

    drawer.dataset.alertaId = alertaId;
    renderDrawerContent(alertaId);
    drawer.classList.add('active');
};

function renderDrawerContent(alertaId) {
    const al = dbAlertas.find(a => String(a.id) === String(alertaId));
    if (!al) return;

    const viv = dbViviendas.find(v => v.id === al.viviendaId);
    
    // Obtener mediciones e interpretación sanitarias
    const ph = viv ? (viv.ph !== null ? viv.ph : 7.0) : 7.0;
    const cloro = viv ? (viv.cloro !== null ? viv.cloro : 1.0) : 1.0;
    const eval = evaluarCalidadAgua(ph, cloro);

    // Obtener historial de mediciones de esta vivienda
    const historialVivienda = dbHistorial.filter(h => h.viviendaId === al.viviendaId).slice().reverse().slice(0, 3);
    
    let histHtml = "";
    if (historialVivienda.length === 0) {
        histHtml = `<p style="font-size:12px; color:var(--text-secondary); font-style: italic; margin-top: 8px;">Sin historial registrado.</p>`;
    } else {
        histHtml = historialVivienda.map(h => `
            <div class="drawer-history-item">
                <span class="date">${h.fecha}</span>
                <span class="values">pH ${(h.ph !== null && h.ph !== undefined) ? Number(h.ph).toFixed(1) : 'S/D'} | Cloro ${(h.cloro !== null && h.cloro !== undefined) ? `${Number(h.cloro).toFixed(2)} mg/L` : 'S/D'}</span>
                <span class="status-badge ${h.estado}" style="font-size:9px; padding: 2px 6px;">
                    ${h.estado === 'verde' ? 'Apto' : h.estado === 'amarillo' ? 'Alerta' : 'Crítico'}
                </span>
            </div>
        `).join('');
    }

    const bodyContent = document.getElementById('drawer-body-content');
    if (!bodyContent) return;

    bodyContent.innerHTML = `
        <div class="drawer-vivienda-header">
            <h4>${al.viviendaNombre}</h4>
            <span>Código: <strong>${al.viviendaId}</strong></span>
            <span>Dirección: ${viv ? viv.direccion : 'Viva el Perú, Cusco'}</span>
            <span>Sector: ${viv ? (viv.sector || 'Sector Viva el Perú') : 'Sector Viva el Perú'}</span>
        </div>

        <div>
            <div class="drawer-section-title">Valores del Análisis</div>
            <div class="drawer-specs-grid">
                <div class="drawer-spec-card">
                    <span class="lbl">pH</span>
                    <strong class="val">${ph.toFixed(1)}</strong>
                </div>
                <div class="drawer-spec-card">
                    <span class="lbl">Cloro Residual</span>
                    <strong class="val">${cloro.toFixed(2)} mg/L</strong>
                </div>
            </div>
        </div>

        <div>
            <div class="drawer-section-title">Detalles Técnicos</div>
            <div class="drawer-info-list">
                <div class="drawer-info-row">
                    <span class="lbl">Responsable:</span>
                    <span class="val">${al.responsable || 'Comité de Salud'}</span>
                </div>
                <div class="drawer-info-row">
                    <span class="lbl">Fecha de Registro:</span>
                    <span class="val">${al.fecha}</span>
                </div>
                <div class="drawer-info-row">
                    <span class="lbl">Estado Sanitario:</span>
                    <span class="val">
                        <span class="status-badge ${al.tipo === 'critica' ? 'rojo' : al.tipo === 'preventiva' ? 'amarillo' : 'verde'}">
                            ${al.tipo === 'critica' ? 'Crítico' : al.tipo === 'preventiva' ? 'Preventivo' : 'Informativo'}
                        </span>
                    </span>
                </div>
                <div class="drawer-info-row">
                    <span class="lbl">Tiempo transcurrido:</span>
                    <span class="val">${calcularTiempoTranscurrido(al.fecha)}</span>
                </div>
            </div>
        </div>

        <div class="drawer-recommendations ${al.tipo}">
            <h5>Recomendaciones de Salud</h5>
            <p>${eval.detalles}</p>
            <ul>
                ${eval.recomendaciones.map(r => `<li>${r}</li>`).join('')}
            </ul>
        </div>

        <div>
            <div class="drawer-section-title">Historial Reciente (Últimos 3)</div>
            <div class="drawer-history-list">
                ${histHtml}
            </div>
        </div>

        <div class="drawer-status-toggle">
            <span style="font-size:12.5px; font-weight:700; color:var(--text-primary);">Estado de la Alerta:</span>
            <button class="alert-btn ${al.activo ? 'btn-critica' : 'btn-informativa'}" onclick="toggleEstadoAlerta('${al.id}')" style="font-size:12px; padding: 8px 14px;">
                ${al.activo ? '🚨 Resolver Alerta' : '🟢 Reabrir Alerta'}
            </button>
        </div>
    `;
}

function inicializarDrawer() {
    const closeBtn = document.getElementById('btn-close-drawer');
    const overlay = document.getElementById('alert-detail-drawer');

    if (closeBtn) {
        closeBtn.addEventListener('click', () => {
            overlay.classList.remove('active');
        });
    }

    if (overlay) {
        overlay.addEventListener('click', (e) => {
            if (e.target.id === 'alert-detail-drawer') {
                overlay.classList.remove('active');
            }
        });
    }
}

// Redirecciona al formulario con la vivienda seleccionada para volver a evaluar
window.atenderAlertaVivienda = function(viviendaId) {
    seleccionarViviendaEnWizard(viviendaId);
};

// Configurar listeners del panel de alertas
function inicializarEventosAlertas() {
    const searchInput = document.getElementById('alert-search');
    if (searchInput) {
        searchInput.addEventListener('input', renderAlertasCards);
    }
    
    const filterBtns = document.querySelectorAll('[data-alert-filter]');
    filterBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            filterBtns.forEach(b => b.classList.remove('active'));
            this.classList.add('active');

            // Resetear filtro de los contadores rápidos al cambiar de botón de filtro
            alertFilterContador = null;
            const cards = ['critica', 'preventiva', 'informativa'];
            cards.forEach(c => {
                const cardEl = document.getElementById(`summary-card-${c}`);
                if (cardEl) cardEl.classList.remove('active');
            });

            renderAlertasCards();
        });
    });

    // Agregar eventos click a los contadores interactivos
    const cards = ['critica', 'preventiva', 'informativa'];
    cards.forEach(c => {
        const cardEl = document.getElementById(`summary-card-${c}`);
        if (cardEl) {
            cardEl.addEventListener('click', () => {
                window.toggleFiltroContador(c);
            });
        }
    });

    inicializarDrawer();
}

// --- 5. PANEL DE HISTORIAL AVANZADO ---

// --- 5. PANEL DE HISTORIAL AVANZADO ---

// Instancias de gráficos del historial
let historyPhChartInstance = null;
let historyCloroChartInstance = null;
let historyTrendChartInstance = null;
let detailMapInstance = null;
let pendingDeleteId = null;
let pendingDeleteUserId = null;
let clearAllStep = 1;

// dbHistorial se carga dinámicamente desde el servidor MySQL en cargarDatosServidor()

// Helper para determinar clases de color de pH
function obtenerPhClass(ph) {
    if (ph >= 6.5 && ph <= 8.5) return 'cell-ph-green';
    if ((ph >= 6.0 && ph < 6.5) || (ph > 8.5 && ph <= 9.0)) return 'cell-ph-yellow';
    return 'cell-ph-red';
}

// Helper para determinar clases de color de Cloro
function obtenerCloroClass(cloro) {
    if (cloro >= 0.5 && cloro <= 1.5) return 'cell-cloro-green';
    if ((cloro >= 0.3 && cloro < 0.5) || (cloro > 1.5 && cloro <= 2.0)) return 'cell-cloro-yellow';
    return 'cell-cloro-red';
}

// Obtener registros filtrados según los controles de la interfaz
function obtenerHistorialFiltrado() {
    const buscador = document.getElementById('history-search').value.toLowerCase();
    const filtroEstado = document.getElementById('history-filter-status').value;
    const dateFrom = document.getElementById('history-filter-date-from').value;
    const dateTo = document.getElementById('history-filter-date-to').value;
    const responsableVal = document.getElementById('history-filter-responsable').value.toLowerCase();
    const sectorVal = document.getElementById('history-filter-sector').value;

    return dbHistorial.filter(h => {
        const coincideBuscador = !buscador || 
                                 h.viviendaNombre.toLowerCase().includes(buscador) || 
                                 h.responsable.toLowerCase().includes(buscador) || 
                                 h.viviendaId.toLowerCase().includes(buscador) || 
                                 h.observaciones.toLowerCase().includes(buscador);
        
        const coincideEstado = (filtroEstado === 'todos') || (h.estado === filtroEstado);

        const coincideResponsable = !responsableVal || h.responsable.toLowerCase().includes(responsableVal);

        const vivInfo = dbViviendas.find(v => v.id === h.viviendaId);
        const coincideSector = (sectorVal === 'todos') || (vivInfo && vivInfo.sector === sectorVal);

        const regDateOnly = h.fecha.split(' ')[0];
        const coincideFechaDesde = !dateFrom || (regDateOnly >= dateFrom);
        const coincideFechaHasta = !dateTo || (regDateOnly <= dateTo);

        return coincideBuscador && coincideEstado && coincideResponsable && coincideSector && coincideFechaDesde && coincideFechaHasta;
    });
}

function renderHistorialTable() {
    const tbody = document.getElementById('history-table-tbody');
    if (!tbody) return;
    tbody.innerHTML = '';

    // 1. Obtener registros filtrados
    let registrosFiltrados = obtenerHistorialFiltrado();

    // Actualizar tarjetas de estadísticas rápidas (KPIs del Historial)
    const kpiTotal = registrosFiltrados.length;
    const kpiGreen = registrosFiltrados.filter(r => r.estado === 'verde').length;
    const kpiYellow = registrosFiltrados.filter(r => r.estado === 'amarillo').length;
    const kpiRed = registrosFiltrados.filter(r => r.estado === 'rojo').length;

    const kpiTotalEl = document.getElementById('hist-kpi-total');
    const kpiGreenEl = document.getElementById('hist-kpi-green');
    const kpiYellowEl = document.getElementById('hist-kpi-yellow');
    const kpiRedEl = document.getElementById('hist-kpi-red');

    if (kpiTotalEl) kpiTotalEl.innerText = kpiTotal;
    if (kpiGreenEl) kpiGreenEl.innerText = kpiGreen;
    if (kpiYellowEl) kpiYellowEl.innerText = kpiYellow;
    if (kpiRedEl) kpiRedEl.innerText = kpiRed;

    // 2. Ordenar registros
    registrosFiltrados.sort((a, b) => {
        // Favoritos primero
        const favA = a.favorito ? 1 : 0;
        const favB = b.favorito ? 1 : 0;
        if (favA !== favB) {
            return favB - favA;
        }

        let valA = a[currentSortColumn];
        let valB = b[currentSortColumn];

        if (typeof valA === 'string') {
            return currentSortDirection === 'asc' ? 
                valA.localeCompare(valB) : 
                valB.localeCompare(valA);
        } else {
            return currentSortDirection === 'asc' ? 
                valA - valB : 
                valB - valA;
        }
    });

    // 3. Paginación
    const totalRegistros = registrosFiltrados.length;
    const totalPages = Math.ceil(totalRegistros / historyRecordsPerPage) || 1;
    
    if (historyCurrentPage > totalPages) historyCurrentPage = totalPages;
    
    const startIndex = (historyCurrentPage - 1) * historyRecordsPerPage;
    const endIndex = Math.min(startIndex + historyRecordsPerPage, totalRegistros);
    
    const registrosPaginados = registrosFiltrados.slice(startIndex, endIndex);

    // 4. Mostrar información de paginación
    document.getElementById('pagination-info').innerText = totalRegistros > 0 ? 
        `Mostrando ${startIndex + 1}-${endIndex} de ${totalRegistros} muestreos` : 
        `Mostrando 0-0 de 0 muestreos`;

    // Renderizar filas
    if (registrosPaginados.length === 0) {
        tbody.innerHTML = `<tr><td colspan="9" class="text-center" style="color: var(--text-secondary); padding: 32px 0;">No se encontraron muestreos en el historial.</td></tr>`;
    } else {
        registrosPaginados.forEach(reg => {
            const tr = document.createElement('tr');
            if (reg.favorito) {
                tr.classList.add('row-favorito');
            }
            
            const phClass = obtenerPhClass(reg.ph);
            const cloroClass = obtenerCloroClass(reg.cloro);
            const statusLabels = {
                verde: 'Apta',
                amarillo: 'Observación',
                rojo: 'Crítica'
            };
            const statusText = statusLabels[reg.estado] || 'Desconocido';
            
            tr.innerHTML = `
                <td style="text-align: center;" data-label="Favorito">
                    <button class="btn-star-fav ${reg.favorito ? 'active' : ''}" onclick="toggleFavoritoHistorial('${reg.id}')">${reg.favorito ? '★' : '☆'}</button>
                </td>
                <td style="font-weight: 500;" data-label="Fecha">${reg.fecha}</td>
                <td data-label="Vivienda"><strong>${reg.viviendaNombre}</strong><br><span style="font-size: 11px; color: var(--text-secondary);">${reg.viviendaId}</span></td>
                <td data-label="Responsable">${reg.responsable}</td>
                <td class="${phClass}" data-label="pH"><strong>${(reg.ph !== null && reg.ph !== undefined) ? Number(reg.ph).toFixed(1) : 'S/D'}</strong></td>
                <td class="${cloroClass}" data-label="Cloro"><strong>${(reg.cloro !== null && reg.cloro !== undefined) ? `${Number(reg.cloro).toFixed(2)} mg/L` : 'S/D'}</strong></td>
                <td data-label="Estado"><span class="badge-estado ${reg.estado}"><span class="badge-dot"></span>${statusText}</span></td>
                <td style="max-width: 200px; font-size: 12px; color: var(--text-secondary); line-height: 1.3;" title="${reg.observaciones}" data-label="Observaciones">${reg.observaciones}</td>
                <td data-label="Acciones">
                    <div style="display: flex; gap: 6px; justify-content: flex-end;">
                        <button class="btn btn-secondary btn-small" onclick="abrirDetalleHistorial('${reg.id}')" style="min-width: 60px;">📄 Detalle</button>
                        <button class="btn btn-secondary btn-small" onclick="abrirEditarHistorial('${reg.id}')" style="min-width: 60px;">✏️ Editar</button>
                        <button class="btn btn-secondary btn-small text-red" onclick="confirmarEliminarHistorial('${reg.id}')" style="min-width: 60px; color: var(--color-red); border-color: rgba(239, 68, 68, 0.2); background-color: rgba(239, 68, 68, 0.05);">🗑️ Eliminar</button>
                    </div>
                </td>
            `;
            tbody.appendChild(tr);
        });
    }

    // 5. Renderizar botones de página y gráficos
    renderPaginationControls(totalPages);
    renderHistoryCharts(registrosFiltrados);
}

// Toggle favoritos
window.toggleFavoritoHistorial = async function(id) {
    try {
        const res = await fetch('api/historial.php', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: id })
        });
        const result = await res.json();
        if (result.success) {
            await cargarDatosServidor();
            showToast("Registro destacado en el historial.", 'success', 2500);
        } else {
            showToast("Error al actualizar favorito: " + result.error, 'error', 4000);
        }
    } catch (err) {
        console.error(err);
        showToast("Error de conexión al actualizar favorito.", 'error', 4000);
    }
};

window.abrirEditarHistorial = function(id) {
    const reg = dbHistorial.find(h => String(h.id) === String(id));
    if (!reg) return;

    document.getElementById('edit-hist-idx').value = id;
    document.getElementById('edit-hist-responsable').value = reg.responsable;
    document.getElementById('edit-hist-ph').value = reg.ph;
    document.getElementById('edit-hist-cloro').value = reg.cloro;
    document.getElementById('edit-hist-fecha').value = reg.fecha;
    document.getElementById('edit-hist-obs').value = reg.observaciones;

    document.getElementById('history-edit-modal').classList.add('active');
};

// Confirmar eliminación individual
window.confirmarEliminarHistorial = function(id) {
    pendingDeleteId = id;
    document.getElementById('history-delete-confirm-modal').classList.add('active');
};

// Abrir detalles
window.abrirDetalleHistorial = function(id) {
    const reg = dbHistorial.find(h => String(h.id) === String(id));
    if (!reg) return;

    const viv = dbViviendas.find(v => v.id === reg.viviendaId);
    if (!viv) return;

    document.getElementById('detail-hist-vivienda-name').innerText = reg.viviendaNombre;
    document.getElementById('detail-hist-vivienda-code').innerText = `Código: ${reg.viviendaId}`;
    document.getElementById('detail-hist-vivienda-address').innerText = `Dirección: ${viv.direccion}`;

    document.getElementById('detail-hist-ph').innerText = (reg.ph !== null && reg.ph !== undefined) ? Number(reg.ph).toFixed(1) : 'S/D';
    document.getElementById('detail-hist-cloro').innerText = (reg.cloro !== null && reg.cloro !== undefined) ? `${Number(reg.cloro).toFixed(2)} mg/L` : 'S/D';
    document.getElementById('detail-hist-responsable').innerText = reg.responsable;
    document.getElementById('detail-hist-fecha').innerText = reg.fecha;
    document.getElementById('detail-hist-coordenadas').innerText = `${viv.latitud.toFixed(6)}, ${viv.longitud.toFixed(6)}`;
    document.getElementById('detail-hist-observaciones').innerText = reg.observaciones || "Sin observaciones.";

    const badgeEstado = document.getElementById('detail-hist-estado');
    badgeEstado.innerHTML = `<span class="badge-estado ${reg.estado}">${reg.estado === 'verde' ? '🟢 APTA' : reg.estado === 'amarillo' ? '🟡 OBSERVACIÓN' : '🔴 CRÍTICA'}</span>`;

    const evalData = evaluarCalidadAgua(reg.ph, reg.cloro);
    const recsList = document.getElementById('detail-hist-recs-list');
    recsList.innerHTML = evalData.recomendaciones.map(r => `<li style="font-size: 12px; color: var(--text-secondary); margin-bottom: 2px;">${r}</li>`).join('');

    const recsBox = document.getElementById('detail-hist-recommendations');
    recsBox.style.borderLeftColor = reg.estado === 'verde' ? 'var(--color-green)' : reg.estado === 'amarillo' ? 'var(--color-yellow)' : 'var(--color-red)';

    const mapContainer = document.getElementById('history-detail-minimap');
    if (detailMapInstance) {
        detailMapInstance.remove();
        detailMapInstance = null;
    }

    detailMapInstance = L.map('history-detail-minimap', {
        center: [viv.latitud, viv.longitud],
        zoom: 16,
        zoomControl: false,
        attributionControl: false
    });

    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
        maxZoom: 20
    }).addTo(detailMapInstance);

    const customIcon = L.divIcon({
        className: 'custom-leaflet-marker',
        html: `<div class="custom-marker-pin ${reg.estado}"></div>`,
        iconSize: [28, 28],
        iconAnchor: [14, 28]
    });

    L.marker([viv.latitud, viv.longitud], { icon: customIcon }).addTo(detailMapInstance);

    setTimeout(() => {
        if (detailMapInstance) {
            detailMapInstance.invalidateSize();
        }
    }, 300);

    const timelineContainer = document.getElementById('detail-hist-timeline');
    timelineContainer.innerHTML = '';

    const historialVivienda = dbHistorial.filter(h => h.viviendaId === reg.viviendaId);
    historialVivienda.sort((a, b) => a.fecha.localeCompare(b.fecha));

    historialVivienda.forEach((h, index) => {
        const node = document.createElement('div');
        node.style.display = 'flex';
        node.style.alignItems = 'center';
        node.style.gap = '6px';
        
        const dateParts = h.fecha.split(' ')[0].split('-');
        const shortDate = dateParts.length === 3 ? `${dateParts[2]}/${dateParts[1]}` : h.fecha;
        const colorCircle = h.estado === 'verde' ? '🟢' : h.estado === 'amarillo' ? '🟡' : '🔴';

        node.innerHTML = `<span style="font-size: 11px; font-weight: 700; white-space: nowrap;">${shortDate} ${colorCircle}</span>`;
        timelineContainer.appendChild(node);

        if (index < historialVivienda.length - 1) {
            const arrow = document.createElement('span');
            arrow.innerHTML = `<span style="color: var(--text-light); font-weight: bold;">→</span>`;
            timelineContainer.appendChild(arrow);
        }
    });

    document.getElementById('history-detail-modal').classList.add('active');
};

// Renderizar gráficos locales del historial
function renderHistoryCharts(datosFiltrados) {
    const phCanvas = document.getElementById('historyPhChart');
    const cloroCanvas = document.getElementById('historyCloroChart');
    const trendCanvas = document.getElementById('historyTrendChart');
    
    if (!phCanvas || !cloroCanvas || !trendCanvas) return;

    if (historyPhChartInstance) historyPhChartInstance.destroy();
    if (historyCloroChartInstance) historyCloroChartInstance.destroy();
    if (historyTrendChartInstance) historyTrendChartInstance.destroy();

    if (datosFiltrados.length === 0) return;

    const registrosPorFecha = {};
    datosFiltrados.forEach(r => {
        const fStr = r.fecha.split(' ')[0];
        if (!registrosPorFecha[fStr]) {
            registrosPorFecha[fStr] = [];
        }
        registrosPorFecha[fStr].push(r);
    });

    const fechasOrdenadas = Object.keys(registrosPorFecha).sort((a, b) => a.localeCompare(b));
    
    const labelsFechas = fechasOrdenadas.map(f => {
        const parts = f.split('-');
        if (parts.length === 3) {
            return `${parts[2]}/${parts[1]}`;
        }
        return f;
    });

    const promPh = fechasOrdenadas.map(f => {
        const regs = registrosPorFecha[f];
        const sum = regs.reduce((s, r) => s + r.ph, 0);
        return parseFloat((sum / regs.length).toFixed(2));
    });

    const promCloro = fechasOrdenadas.map(f => {
        const regs = registrosPorFecha[f];
        const sum = regs.reduce((s, r) => s + r.cloro, 0);
        return parseFloat((sum / regs.length).toFixed(2));
    });

    const ctxPh = phCanvas.getContext('2d');
    const gradientPh = ctxPh.createLinearGradient(0, 0, 0, 180);
    gradientPh.addColorStop(0, 'rgba(16, 185, 129, 0.22)');
    gradientPh.addColorStop(1, 'rgba(16, 185, 129, 0.00)');

    historyPhChartInstance = new Chart(phCanvas, {
        type: 'line',
        data: {
            labels: labelsFechas,
            datasets: [{
                label: 'pH Promedio',
                data: promPh,
                borderColor: '#10B981',
                backgroundColor: gradientPh,
                borderWidth: 2,
                fill: true,
                tension: 0.4,
                pointBackgroundColor: '#10B981',
                pointBorderColor: '#FFFFFF',
                pointRadius: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: { min: 2.0, max: 14.0, grid: { color: '#F1F5F9' }, ticks: { font: { size: 9 } } },
                x: { grid: { display: false }, ticks: { font: { size: 9 } } }
            },
            plugins: { legend: { display: false } }
        }
    });

    const ctxCloro = cloroCanvas.getContext('2d');
    const gradientCloro = ctxCloro.createLinearGradient(0, 0, 0, 180);
    gradientCloro.addColorStop(0, 'rgba(6, 182, 212, 0.22)');
    gradientCloro.addColorStop(1, 'rgba(6, 182, 212, 0.00)');

    historyCloroChartInstance = new Chart(cloroCanvas, {
        type: 'line',
        data: {
            labels: labelsFechas,
            datasets: [{
                label: 'Cloro Promedio (mg/L)',
                data: promCloro,
                borderColor: '#06B6D4',
                backgroundColor: gradientCloro,
                borderWidth: 2,
                fill: true,
                tension: 0.4,
                pointBackgroundColor: '#06B6D4',
                pointBorderColor: '#FFFFFF',
                pointRadius: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: { min: 0.0, max: 3.0, grid: { color: '#F1F5F9' }, ticks: { font: { size: 9 } } },
                x: { grid: { display: false }, ticks: { font: { size: 9 } } }
            },
            plugins: { legend: { display: false } }
        }
    });

    let aptas = 0;
    let observacion = 0;
    let criticas = 0;
    datosFiltrados.forEach(r => {
        if (r.estado === 'verde') aptas++;
        else if (r.estado === 'amarillo') observacion++;
        else if (r.estado === 'rojo') criticas++;
    });

    historyTrendChartInstance = new Chart(trendCanvas, {
        type: 'bar',
        data: {
            labels: ['🟢 Aptas', '🟡 Observación', '🔴 Críticas'],
            datasets: [{
                label: 'Viviendas',
                data: [aptas, observacion, criticas],
                backgroundColor: [
                    'rgba(34, 197, 94, 0.85)',
                    'rgba(245, 158, 11, 0.85)',
                    'rgba(239, 68, 68, 0.85)'
                ],
                borderColor: [
                    '#22C55E',
                    '#F59E0B',
                    '#EF4444'
                ],
                borderWidth: 1,
                borderRadius: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: { beginAtZero: true, ticks: { precision: 0, font: { size: 9 } }, grid: { color: '#F1F5F9' } },
                x: { grid: { display: false }, ticks: { font: { size: 9 } } }
            },
            plugins: { legend: { display: false } }
        }
    });
}

// Rollback/Update vivienda state based on its latest history record
function actualizarEstadoViviendaSegunHistorial(viviendaId) {
    const historialCasa = dbHistorial.filter(h => h.viviendaId === viviendaId);
    const indexViv = dbViviendas.findIndex(v => v.id === viviendaId);
    if (indexViv === -1) return;
    
    if (historialCasa.length > 0) {
        historialCasa.sort((a, b) => b.fecha.localeCompare(a.fecha));
        const ultimoAnalisis = historialCasa[0];
        dbViviendas[indexViv].ph = ultimoAnalisis.ph;
        dbViviendas[indexViv].cloro = ultimoAnalisis.cloro;
        dbViviendas[indexViv].responsable = ultimoAnalisis.responsable;
        dbViviendas[indexViv].fecha = ultimoAnalisis.fecha.split(' ')[0];
        dbViviendas[indexViv].estado = ultimoAnalisis.estado;
        dbViviendas[indexViv].observaciones = ultimoAnalisis.observaciones;
    } else {
        dbViviendas[indexViv].ph = 7.0;
        dbViviendas[indexViv].cloro = 0.0;
        dbViviendas[indexViv].responsable = "Ninguno";
        dbViviendas[indexViv].fecha = "--/--/----";
        dbViviendas[indexViv].estado = "gris";
        dbViviendas[indexViv].observaciones = "Sin análisis registrados.";
    }
    
    // Los datos se persisten en MySQL. No requiere localStorage.
}

// Sync Alerts state
function sincronizarAlertasDeVivienda(viviendaId) {
    const viv = dbViviendas.find(v => v.id === viviendaId);
    if (!viv) return;

    const eval = evaluarCalidadAgua(viv.ph, viv.cloro);
    const alIdx = dbAlertas.findIndex(a => a.viviendaId === viviendaId && a.activo && a.tipo !== 'informativa');

    if (eval.estado === 'verde') {
        if (alIdx !== -1) {
            dbAlertas[alIdx].activo = false;
            registrarActividad("verde", `Alerta resuelta en Vivienda ${viv.nombre} (${viviendaId})`, `Restablecido a valores óptimos por edición.`);
        }
        
        const ahora = new Date();
        const horaStr = String(ahora.getHours()).padStart(2, '0') + ':' + String(ahora.getMinutes()).padStart(2, '0');
        const fechaHoraStr = viv.fecha + ' ' + horaStr;
        dbAlertas.push({
            id: 'A-' + Math.random().toString(36).substr(2, 9).toUpperCase(),
            fecha: fechaHoraStr,
            viviendaId: viviendaId,
            viviendaNombre: viv.nombre,
            responsable: viv.responsable,
            tipo: 'informativa',
            descripcion: 'Monitoreo de control completado con éxito. Agua 100% apta para consumo humano.',
            activo: true
        });
    } else {
        const ahora = new Date();
        const horaStr = String(ahora.getHours()).padStart(2, '0') + ':' + String(ahora.getMinutes()).padStart(2, '0');
        const fechaHoraStr = viv.fecha + ' ' + horaStr;

        if (alIdx !== -1) {
            dbAlertas[alIdx].tipo = eval.estado === 'rojo' ? 'critica' : 'preventiva';
            dbAlertas[alIdx].descripcion = eval.detalles;
            dbAlertas[alIdx].fecha = fechaHoraStr;
            dbAlertas[alIdx].responsable = viv.responsable;
        } else {
            dbAlertas.push({
                id: 'A-' + Math.random().toString(36).substr(2, 9).toUpperCase(),
                fecha: fechaHoraStr,
                viviendaId: viviendaId,
                viviendaNombre: viv.nombre,
                responsable: viv.responsable,
                tipo: eval.estado === 'rojo' ? 'critica' : 'preventiva',
                descripcion: eval.detalles,
                activo: true
            });
        }
        registrarActividad(eval.estado, `Alerta ${eval.estado === 'rojo' ? 'CRÍTICA' : 'PREVENTIVA'} registrada en ${viv.nombre}`, `pH: ${viv.ph} | Cloro: ${viv.cloro} mg/L (Editado)`);
    }

    // Las alertas se persisten en MySQL. No requiere localStorage.
}

function renderPaginationControls(totalPages) {
    const pagesContainer = document.getElementById('page-numbers-container');
    pagesContainer.innerHTML = '';

    const maxButtons = 5;
    let startPage = Math.max(1, historyCurrentPage - 2);
    let endPage = Math.min(totalPages, startPage + maxButtons - 1);

    if (endPage - startPage < maxButtons - 1) {
        startPage = Math.max(1, endPage - maxButtons + 1);
    }

    for (let i = startPage; i <= endPage; i++) {
        const btn = document.createElement('button');
        btn.className = `page-num ${i === historyCurrentPage ? 'active' : ''}`;
        btn.innerText = i;
        btn.addEventListener('click', () => {
            historyCurrentPage = i;
            renderHistorialTable();
        });
        pagesContainer.appendChild(btn);
    }

    document.getElementById('btn-prev-page').disabled = (historyCurrentPage === 1);
    document.getElementById('btn-next-page').disabled = (historyCurrentPage === totalPages);
}

function inicializarEventosHistorial() {
    if (!document.getElementById('historial')) return;

    // Buscador y filtros avanzados
    document.getElementById('history-search').addEventListener('input', () => {
        historyCurrentPage = 1;
        renderHistorialTable();
    });
    
    document.getElementById('history-filter-date-from').addEventListener('change', () => {
        historyCurrentPage = 1;
        renderHistorialTable();
    });

    document.getElementById('history-filter-date-to').addEventListener('change', () => {
        historyCurrentPage = 1;
        renderHistorialTable();
    });

    document.getElementById('history-filter-status').addEventListener('change', () => {
        historyCurrentPage = 1;
        renderHistorialTable();
    });

    document.getElementById('history-filter-responsable').addEventListener('input', () => {
        historyCurrentPage = 1;
        renderHistorialTable();
    });

    document.getElementById('history-filter-sector').addEventListener('change', () => {
        historyCurrentPage = 1;
        renderHistorialTable();
    });

    // Botón para limpiar filtros
    const btnClearFilters = document.getElementById('btn-clear-history-filters');
    if (btnClearFilters) {
        btnClearFilters.addEventListener('click', () => {
            document.getElementById('history-search').value = '';
            document.getElementById('history-filter-date-from').value = '';
            document.getElementById('history-filter-date-to').value = '';
            document.getElementById('history-filter-status').value = 'todos';
            document.getElementById('history-filter-responsable').value = '';
            document.getElementById('history-filter-sector').value = 'todos';
            historyCurrentPage = 1;
            renderHistorialTable();
        });
    }

    // Paginación anterior/siguiente
    document.getElementById('btn-prev-page').addEventListener('click', () => {
        if (historyCurrentPage > 1) {
            historyCurrentPage--;
            renderHistorialTable();
        }
    });

    document.getElementById('btn-next-page').addEventListener('click', () => {
        historyCurrentPage++;
        renderHistorialTable();
    });

    // Ordenamiento por columnas
    const headersSortables = document.querySelectorAll('table th.sortable');
    headersSortables.forEach(th => {
        th.addEventListener('click', function() {
            const column = this.getAttribute('data-sort');
            
            if (currentSortColumn === column) {
                currentSortDirection = currentSortDirection === 'asc' ? 'desc' : 'asc';
            } else {
                currentSortColumn = column;
                currentSortDirection = 'desc';
            }

            headersSortables.forEach(h => {
                const icon = h.querySelector('.sort-icon');
                if (h === this) {
                    icon.innerText = currentSortDirection === 'asc' ? '▲' : '▼';
                } else {
                    icon.innerText = '⇅';
                }
            });

            renderHistorialTable();
        });
    });

        // Eliminar individual modal actions
    document.getElementById('btn-confirm-delete-action').addEventListener('click', async function() {
        if (!pendingDeleteId) return;

        try {
            const res = await fetch(`api/analisis.php?id=${pendingDeleteId}`, {
                method: 'DELETE'
            });
            const result = await res.json();
            if (result.success) {
                await cargarDatosServidor();
                showToast("El registro de análisis ha sido eliminado.", 'success', 4000, "Análisis Eliminado");
            } else {
                showToast("Error al eliminar análisis: " + result.error, 'error', 5000);
            }
        } catch (err) {
            console.error(err);
            showToast("Error de conexión al eliminar.", 'error', 4000);
        }

        document.getElementById('history-delete-confirm-modal').classList.remove('active');
        pendingDeleteId = null;
    });

    document.getElementById('btn-cancel-delete-confirm').addEventListener('click', () => {
        document.getElementById('history-delete-confirm-modal').classList.remove('active');
        pendingDeleteId = null;
    });
    document.getElementById('btn-close-delete-confirm-modal').addEventListener('click', () => {
        document.getElementById('history-delete-confirm-modal').classList.remove('active');
        pendingDeleteId = null;
    });

    // Eliminar historial completo modal actions
    document.getElementById('btn-clear-all-history').addEventListener('click', () => {
        clearAllStep = 1;
        document.getElementById('clear-all-title').innerText = "Eliminar Historial Completo";
        document.getElementById('clear-all-body').innerHTML = `<p style="font-size:13px; color: var(--text-primary); line-height: 1.4;">Se eliminarán todos los análisis registrados.</p>`;
        document.getElementById('btn-confirm-clear-all').innerText = "Siguiente";
        document.getElementById('history-clear-all-modal').classList.add('active');
    });

    document.getElementById('btn-confirm-clear-all').addEventListener('click', async function() {
        if (clearAllStep === 1) {
            clearAllStep = 2;
            document.getElementById('clear-all-title').innerText = "Advertencia Crítica";
            document.getElementById('clear-all-body').innerHTML = `<p style="font-size:13px; color: var(--color-red-hover); font-weight: 700; line-height: 1.4;">Esta acción es irreversible. ¿Desea continuar?</p>`;
            document.getElementById('btn-confirm-clear-all').innerText = "Eliminar Todo";
        } else if (clearAllStep === 2) {
            try {
                const res = await fetch('api/historial.php', {
                    method: 'DELETE'
                });
                const result = await res.json();
                if (result.success) {
                    await cargarDatosServidor();
                    showToast("Todo el historial de análisis ha sido vaciado.", 'success', 5000, "Historial Limpiado");
                } else {
                    showToast("Error al limpiar historial: " + result.error, 'error', 5000);
                }
            } catch (err) {
                console.error(err);
                showToast("Error de conexión al limpiar historial.", 'error', 4000);
            }
            document.getElementById('history-clear-all-modal').classList.remove('active');
        }
    });

    document.getElementById('btn-cancel-clear-all').addEventListener('click', () => {
        document.getElementById('history-clear-all-modal').classList.remove('active');
    });
    document.getElementById('btn-close-clear-all-modal').addEventListener('click', () => {
        document.getElementById('history-clear-all-modal').classList.remove('active');
    });

    // Cerrar modal de edición
    document.getElementById('btn-close-history-edit-modal').addEventListener('click', () => {
        document.getElementById('history-edit-modal').classList.remove('active');
    });
    document.getElementById('btn-cancel-history-edit').addEventListener('click', () => {
        document.getElementById('history-edit-modal').classList.remove('active');
    });

    // Cerrar modal de detalles
    document.getElementById('btn-close-history-detail-modal').addEventListener('click', () => {
        document.getElementById('history-detail-modal').classList.remove('active');
    });
    document.getElementById('btn-close-history-detail-accept').addEventListener('click', () => {
        document.getElementById('history-detail-modal').classList.remove('active');
    });

        // Guardar cambios de edición
    document.getElementById('btn-save-history-edit').addEventListener('click', async function() {
        const id = document.getElementById('edit-hist-idx').value;
        const responsable = document.getElementById('edit-hist-responsable').value.trim();
        const ph = parseFloat(document.getElementById('edit-hist-ph').value);
        const cloro = parseFloat(document.getElementById('edit-hist-cloro').value);
        const fecha = document.getElementById('edit-hist-fecha').value.trim();
        const observaciones = document.getElementById('edit-hist-obs').value.trim();

        if (!responsable || isNaN(ph) || isNaN(cloro) || !fecha) {
            showToast("Por favor, complete todos los campos obligatorios.", 'warning', 4000, "Campos Requeridos");
            return;
        }

        if (ph < 2 || ph > 14 || cloro < 0 || cloro > 5) {
            showToast("Los valores de pH o cloro están fuera de los límites permitidos (pH: 2-14, cloro: 0-5 mg/L).", 'warning', 4000, "Valores Fuera de Rango");
            return;
        }

        const payload = {
            id: id,
            responsable: responsable,
            ph: ph,
            cloro: cloro,
            fecha: fecha,
            observaciones: observaciones
        };

        try {
            const res = await fetch('api/analisis.php', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const result = await res.json();
            if (result.success) {
                await cargarDatosServidor();
                document.getElementById('history-edit-modal').classList.remove('active');
                showToast("Los cambios del análisis se guardaron correctamente.", 'success', 4000, "Análisis Actualizado");
            } else {
                showToast("Error al editar análisis: " + result.error, 'error', 5000);
            }
        } catch (err) {
            console.error(err);
            showToast("Error de conexión al guardar cambios.", 'error', 4000);
        }
    });
}

// --- 6. REPORTES Y EXPORTACIÓN ---

function inicializarEventosReportes() {
    document.getElementById('btn-generate-pdf').addEventListener('click', generarReportePDF);
    document.getElementById('btn-generate-csv').addEventListener('click', exportarHistorialCSV);

    // Eventos para actualizar la vista previa en tiempo real
    const titleInp = document.getElementById('report-title');
    const entityInp = document.getElementById('report-entity');
    const authorInp = document.getElementById('report-author');
    
    if (titleInp) titleInp.addEventListener('input', actualizarVistaPreviaReporte);
    if (entityInp) entityInp.addEventListener('input', actualizarVistaPreviaReporte);
    if (authorInp) authorInp.addEventListener('input', actualizarVistaPreviaReporte);

    const checkStats = document.getElementById('rep-inc-stats');
    const checkVivs = document.getElementById('rep-inc-viviendas');
    const checkAlerts = document.getElementById('rep-inc-alerts');
    const checkHistory = document.getElementById('rep-inc-history');

    if (checkStats) checkStats.addEventListener('change', actualizarVistaPreviaReporte);
    if (checkVivs) checkVivs.addEventListener('change', actualizarVistaPreviaReporte);
    if (checkAlerts) checkAlerts.addEventListener('change', actualizarVistaPreviaReporte);
    if (checkHistory) checkHistory.addEventListener('change', actualizarVistaPreviaReporte);
}

function actualizarVistaPreviaReporte() {
    const titleVal = document.getElementById('report-title').value;
    const entityVal = document.getElementById('report-entity').value;
    const authorVal = document.getElementById('report-author').value;
    
    // update label count of houses
    const labelViv = document.getElementById('report-viviendas-count-label');
    if (labelViv) {
        labelViv.innerText = `Detalle de las ${dbViviendas.length} Viviendas Monitoreadas`;
    }

    // update preview sheet elements
    const prevTitle = document.getElementById('prev-title');
    const prevEntity = document.getElementById('prev-entity');
    const prevAuthor = document.getElementById('prev-author');
    const prevDate = document.getElementById('prev-date');
    const prevTotalViv = document.getElementById('prev-total-viv');

    if (prevTitle) prevTitle.innerText = titleVal.toUpperCase();
    if (prevEntity) prevEntity.innerText = entityVal.toUpperCase();
    if (prevAuthor) prevAuthor.innerText = authorVal || '--';
    if (prevDate) prevDate.innerText = `Fecha: ${new Date().toLocaleDateString('es-PE')}`;
    if (prevTotalViv) prevTotalViv.innerText = `${dbViviendas.length} viviendas`;

    // update checkboxes visibility preview
    const showStats = document.getElementById('rep-inc-stats').checked;
    const showVivs = document.getElementById('rep-inc-viviendas').checked;
    const showAlerts = document.getElementById('rep-inc-alerts').checked;
    const showHistory = document.getElementById('rep-inc-history').checked;

    const secStats = document.getElementById('prev-sec-stats');
    const secVivs = document.getElementById('prev-sec-viviendas');
    const secAlerts = document.getElementById('prev-sec-alerts');
    const secHistory = document.getElementById('prev-sec-history');

    if (secStats) secStats.style.display = showStats ? 'block' : 'none';
    if (secVivs) secVivs.style.display = showVivs ? 'block' : 'none';
    if (secAlerts) secAlerts.style.display = showAlerts ? 'block' : 'none';
    if (secHistory) secHistory.style.display = showHistory ? 'block' : 'none';

    // Update Quick Summary Cards values
    const kpiMuestras = dbHistorial.length;
    const potables = dbViviendas.filter(v => v.estado === 'verde').length;
    const pctPotable = dbViviendas.length > 0 ? ((potables / dbViviendas.length) * 100).toFixed(0) : '0';
    const activas = dbAlertas.filter(a => a.activo).length;

    const repKpiMuestrasEl = document.getElementById('rep-kpi-muestras');
    const repKpiPotabilidadEl = document.getElementById('rep-kpi-potabilidad');
    const repKpiAlertasEl = document.getElementById('rep-kpi-alertas');

    if (repKpiMuestrasEl) repKpiMuestrasEl.innerText = kpiMuestras;
    if (repKpiPotabilidadEl) repKpiPotabilidadEl.innerText = `${pctPotable}%`;
    if (repKpiAlertasEl) repKpiAlertasEl.innerText = `${activas} activas`;
}

function generarReportePDF() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF('p', 'mm', 'a4'); // Retrato, Milímetros, A4

    const tituloReporte = document.getElementById('report-title').value;
    const entidadEvaluadora = document.getElementById('report-entity').value;
    const autorReporte = document.getElementById('report-author').value;
    const fechaActual = new Date().toLocaleDateString('es-PE');

    // Estado del Sistema
    const total = dbViviendas.length;
    const verdes = dbViviendas.filter(v => v.estado === 'verde').length;
    const amarillas = dbViviendas.filter(v => v.estado === 'amarillo').length;
    const rojas = dbViviendas.filter(v => v.estado === 'rojo').length;
    const alertasActivas = dbAlertas.filter(a => a.activo).length;

    // Promedios generales
    let sumaPh = 0;
    let validPhCount = 0;
    let sumaCloro = 0;
    let validCloroCount = 0;
    dbViviendas.forEach(v => {
        const phVal = parseFloat(v.ph);
        const cloroVal = parseFloat(v.cloro);
        if (!isNaN(phVal)) {
            sumaPh += phVal;
            validPhCount++;
        }
        if (!isNaN(cloroVal)) {
            sumaCloro += cloroVal;
            validCloroCount++;
        }
    });
    const promPh = validPhCount > 0 ? (sumaPh / validPhCount).toFixed(2) : 'S/D';
    const promCloro = validCloroCount > 0 ? (sumaCloro / validCloroCount).toFixed(2) : 'S/D';

    // --- DISEÑO ESTÉTICO DE HOJA MEMBRETADA (PÁGINA 1) ---
    
    // Encabezado institucional azul
    doc.setFillColor(37, 99, 235); // Azul Primario #2563EB
    doc.rect(0, 0, 210, 28, 'F');

    // Título en la cabecera
    doc.setFont("Helvetica", "bold");
    doc.setFontSize(14);
    doc.setTextColor(255, 255, 255);
    doc.text("SISTEMA DE MONITOREO DE CALIDAD DE AGUA", 15, 12);
    doc.setFontSize(10);
    doc.setFont("Helvetica", "normal");
    doc.text(`${entidadEvaluadora} - CUSCO, PERÚ`, 15, 18);
    doc.text(`Exposición Técnica y Control de Salud Pública`, 15, 23);

    // Subtítulo del Documento
    doc.setTextColor(15, 23, 42); // Navy oscuro #0F172A
    doc.setFontSize(16);
    doc.setFont("Helvetica", "bold");
    doc.text(tituloReporte, 15, 42);

    // Metadatos
    doc.setFontSize(9.5);
    doc.setFont("Helvetica", "normal");
    doc.setTextColor(100, 116, 139); // Gris
    doc.text(`Fecha de Emisión: ${fechaActual}`, 15, 48);
    doc.text(`Responsable del Informe: ${autorReporte}`, 15, 53);
    doc.text(`Sector Geográfico: Viva el Perú, Distrito de Santiago, Cusco`, 15, 58);

    // Línea divisora
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.5);
    doc.line(15, 62, 195, 62);

    let y = 70;

    // SECCIÓN 1: ESTADÍSTICAS GENERALES
    if (document.getElementById('rep-inc-stats').checked) {
        doc.setFont("Helvetica", "bold");
        doc.setFontSize(12);
        doc.setTextColor(37, 99, 235);
        doc.text("1. Resumen de Indicadores Clave", 15, y);
        y += 8;

        // Cuadrícula de estadísticas simulada con rectángulos
        doc.setFillColor(248, 250, 252);
        doc.rect(15, y, 55, 25, 'F');
        doc.setDrawColor(226, 232, 240);
        doc.rect(15, y, 55, 25);
        doc.setFont("Helvetica", "bold");
        doc.setFontSize(14);
        doc.setTextColor(30, 41, 59);
        doc.text(`${total}`, 42, y + 12, { align: 'center' });
        doc.setFont("Helvetica", "normal");
        doc.setFontSize(8.5);
        doc.setTextColor(100, 116, 139);
        doc.text("Total Viviendas", 42, y + 19, { align: 'center' });

        doc.setFillColor(248, 250, 252);
        doc.rect(75, y, 55, 25, 'F');
        doc.rect(75, y, 55, 25);
        doc.setFont("Helvetica", "bold");
        doc.setFontSize(14);
        doc.setTextColor(22, 163, 74); // Verde
        doc.text(`${verdes}`, 102, y + 12, { align: 'center' });
        doc.setFont("Helvetica", "normal");
        doc.setFontSize(8.5);
        doc.setTextColor(100, 116, 139);
        doc.text("Aptas (Verde)", 102, y + 19, { align: 'center' });

        doc.setFillColor(248, 250, 252);
        doc.rect(135, y, 60, 25, 'F');
        doc.rect(135, y, 60, 25);
        doc.setFont("Helvetica", "bold");
        doc.setFontSize(14);
        doc.setTextColor(220, 38, 38); // Rojo
        doc.text(`${rojas}`, 165, y + 12, { align: 'center' });
        doc.setFont("Helvetica", "normal");
        doc.setFontSize(8.5);
        doc.setTextColor(100, 116, 139);
        doc.text("Críticas (Rojo)", 165, y + 19, { align: 'center' });

        y += 28;

        // Fila 2 de indicadores: Promedios y Alertas
        doc.setFillColor(248, 250, 252);
        doc.rect(15, y, 55, 25, 'F');
        doc.rect(15, y, 55, 25);
        doc.setFont("Helvetica", "bold");
        doc.setFontSize(13);
        doc.setTextColor(30, 41, 59);
        doc.text(promPh, 42, y + 12, { align: 'center' });
        doc.setFont("Helvetica", "normal");
        doc.setFontSize(8.5);
        doc.setTextColor(100, 116, 139);
        doc.text("pH Promedio General", 42, y + 19, { align: 'center' });

        doc.setFillColor(248, 250, 252);
        doc.rect(75, y, 55, 25, 'F');
        doc.rect(75, y, 55, 25);
        doc.setFont("Helvetica", "bold");
        doc.setFontSize(13);
        doc.setTextColor(30, 41, 59);
        doc.text(promCloro === 'S/D' ? 'S/D' : `${promCloro} mg/L`, 102, y + 12, { align: 'center' });
        doc.setFont("Helvetica", "normal");
        doc.setFontSize(8.5);
        doc.setTextColor(100, 116, 139);
        doc.text("Cloro Promedio General", 102, y + 19, { align: 'center' });

        doc.setFillColor(248, 250, 252);
        doc.rect(135, y, 60, 25, 'F');
        doc.rect(135, y, 60, 25);
        doc.setFont("Helvetica", "bold");
        doc.setFontSize(13);
        doc.setTextColor(217, 119, 6); // Amarillo
        doc.text(`${amarillas} / ${alertasActivas}`, 165, y + 12, { align: 'center' });
        doc.setFont("Helvetica", "normal");
        doc.setFontSize(8.5);
        doc.setTextColor(100, 116, 139);
        doc.text("Obs. / Alertas Activas", 165, y + 19, { align: 'center' });

        y += 35;
    }

    // SECCIÓN 2: ALERTAS ACTIVAS Y RIESGOS
    if (document.getElementById('rep-inc-alerts').checked) {
        doc.setFont("Helvetica", "bold");
        doc.setFontSize(12);
        doc.setTextColor(37, 99, 235);
        doc.text("2. Reporte de Alertas Críticas y Preventivas Activas", 15, y);
        y += 8;

        const alertasPendientes = dbAlertas.filter(a => a.activo);
        if (alertasPendientes.length === 0) {
            doc.setFont("Helvetica", "italic");
            doc.setFontSize(9.5);
            doc.setTextColor(100, 116, 139);
            doc.text("No se registran alertas críticas activas en la red en este momento.", 15, y);
            y += 8;
        } else {
            doc.setFont("Helvetica", "normal");
            doc.setFontSize(9);
            doc.setTextColor(30, 41, 59);

            alertasPendientes.slice(0, 5).forEach((al, aIdx) => {
                // Dibujar viñeta según tipo
                doc.setFillColor(al.tipo === 'critica' ? 239 : 245, al.tipo === 'critica' ? 68 : 158, al.tipo === 'critica' ? 68 : 11);
                doc.circle(18, y - 1, 1.5, 'F');

                doc.setFont("Helvetica", "bold");
                doc.setTextColor(al.tipo === 'critica' ? 220 : 217, al.tipo === 'critica' ? 38 : 119, al.tipo === 'critica' ? 38 : 6);
                doc.text(`[${al.tipo.toUpperCase()}] ${al.viviendaNombre} (${al.viviendaId})`, 22, y);
                
                doc.setFont("Helvetica", "normal");
                doc.setTextColor(71, 85, 105);
                y += 5;
                doc.text(`Detalle: ${al.descripcion} | Responsable: ${al.responsable} | Fecha: ${al.fecha}`, 22, y);
                y += 8;
            });

            if (alertasPendientes.length > 5) {
                doc.setFont("Helvetica", "italic");
                doc.text(`... y otras ${alertasPendientes.length - 5} alertas menores en estado de observación preventiva.`, 22, y);
                y += 8;
            }
        }
    }

    // Pie de página oficial
    doc.setDrawColor(226, 232, 240);
    doc.line(15, 275, 195, 275);
    doc.setFont("Helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text("Semáforo Hídrico Inteligente - Prototipo Universitario Cusco 2026", 15, 282);
    doc.text("Página 1 de 2", 195, 282, { align: 'right' });

    // --- SEGUNDA PÁGINA: DETALLE DE VIVIENDAS ---
    if (document.getElementById('rep-inc-viviendas').checked) {
        doc.addPage();
        
        // Cabecera simplificada
        doc.setFillColor(15, 23, 42); // Navy
        doc.rect(0, 0, 210, 16, 'F');
        doc.setFont("Helvetica", "bold");
        doc.setFontSize(10);
        doc.setTextColor(255, 255, 255);
        doc.text("REPORTE DETALLADO DE VIVIENDAS MONITOREADAS - SECTOR VIVA EL PERÚ", 15, 10);

        let yPage2 = 26;
        doc.setFont("Helvetica", "bold");
        doc.setFontSize(11);
        doc.setTextColor(37, 99, 235);
        doc.text("3. Inventario del Estado Sanitario de las 24 Viviendas", 15, yPage2);
        yPage2 += 8;

        // Cabeceras de tabla
        doc.setFillColor(30, 41, 59); // Fondo cabecera tabla
        doc.rect(15, yPage2, 180, 8, 'F');
        doc.setFontSize(8.5);
        doc.setFont("Helvetica", "bold");
        doc.setTextColor(255, 255, 255);
        doc.text("ID", 17, yPage2 + 5.5);
        doc.text("Nombre Vivienda", 28, yPage2 + 5.5);
        doc.text("Responsable", 75, yPage2 + 5.5);
        doc.text("pH", 115, yPage2 + 5.5);
        doc.text("Cloro", 130, yPage2 + 5.5);
        doc.text("Estado", 148, yPage2 + 5.5);
        doc.text("Fecha", 175, yPage2 + 5.5);

        yPage2 += 8;
        doc.setFont("Helvetica", "normal");
        doc.setTextColor(30, 41, 59);

        // Renderizar viviendas en filas compactas
        dbViviendas.forEach((v, idx) => {
            // Fondo cebra
            if (idx % 2 === 0) {
                doc.setFillColor(248, 250, 252);
                doc.rect(15, yPage2, 180, 7.5, 'F');
            }

            doc.setFont("Helvetica", "bold");
            doc.text(v.id, 17, yPage2 + 5.5);
            doc.setFont("Helvetica", "normal");
            
            // Truncar nombre si es muy largo
            let nombreTrunc = v.nombre || 'S/D';
            if (nombreTrunc.length > 25) nombreTrunc = nombreTrunc.substring(0, 23) + '...';
            doc.text(nombreTrunc, 28, yPage2 + 5.5);

            let respTrunc = v.responsable || 'S/D';
            if (respTrunc.length > 20) respTrunc = respTrunc.substring(0, 18) + '...';
            doc.text(respTrunc, 75, yPage2 + 5.5);
            
            const phText = (v.ph !== null && v.ph !== undefined) ? Number(v.ph).toFixed(1) : 'S/D';
            const cloroText = (v.cloro !== null && v.cloro !== undefined) ? `${Number(v.cloro).toFixed(2)} mg/L` : 'S/D';
            doc.text(phText, 115, yPage2 + 5.5);
            doc.text(cloroText, 130, yPage2 + 5.5);
            
            // Escribir estado con color correspondiente
            if (v.estado === 'verde') {
                doc.setTextColor(22, 163, 74);
                doc.setFont("Helvetica", "bold");
                doc.text('APTA', 148, yPage2 + 5.5);
            } else if (v.estado === 'amarillo') {
                doc.setTextColor(217, 119, 6);
                doc.setFont("Helvetica", "bold");
                doc.text('ALERTA', 148, yPage2 + 5.5);
            } else if (v.estado === 'rojo') {
                doc.setTextColor(220, 38, 38);
                doc.setFont("Helvetica", "bold");
                doc.text('CRÍTICO', 148, yPage2 + 5.5);
            } else {
                doc.setTextColor(100, 116, 139); // Gris slate
                doc.setFont("Helvetica", "bold");
                doc.text('S/E', 148, yPage2 + 5.5);
            }
            
            doc.setFont("Helvetica", "normal");
            doc.setTextColor(30, 41, 59);
            
            const fechaText = v.fecha ? v.fecha.split(' ')[0] : 'S/D';
            doc.text(fechaText, 175, yPage2 + 5.5);

            yPage2 += 7.5;
        });

        // Protocolo institucional
        yPage2 += 12;
        doc.setFillColor(239, 246, 255);
        doc.rect(15, yPage2, 180, 20, 'F');
        doc.setDrawColor(191, 219, 254);
        doc.rect(15, yPage2, 180, 20);
        
        doc.setFont("Helvetica", "bold");
        doc.setFontSize(8.5);
        doc.setTextColor(30, 58, 138);
        doc.text("PROTOCOLO DE RESPUESTA SANITARIA COMUNITARIA:", 18, yPage2 + 6);
        doc.setFont("Helvetica", "normal");
        doc.setFontSize(7.5);
        doc.setTextColor(30, 58, 138);
        doc.text("- Todo reporte crítico (ROJO) requiere acción correctiva física de desinfección y muestreo obligatorio dentro de las 2 horas.", 18, yPage2 + 11);
        doc.text("- Los reportes en amarillo (Revisión preventiva) implican inspección física de las tuberías en búsqueda de fugas y reajuste del dosificador.", 18, yPage2 + 15);

        // Bloque de Firmas
        yPage2 += 32;
        doc.line(30, yPage2, 85, yPage2);
        doc.line(125, yPage2, 180, yPage2);
        
        doc.setFontSize(8);
        doc.setTextColor(71, 85, 105);
        doc.text("Ing. Sanitario Evaluador", 57, yPage2 + 4, { align: 'center' });
        doc.text("Comité de Salud Viva el Perú", 152, yPage2 + 4, { align: 'center' });

        // Pie de página oficial
        doc.setDrawColor(226, 232, 240);
        doc.line(15, 275, 195, 275);
        doc.setFontSize(8);
        doc.setTextColor(148, 163, 184);
        doc.text("Semáforo Hídrico Inteligente - Prototipo Universitario Cusco 2026", 15, 282);
        doc.text("Página 2 de 2", 195, 282, { align: 'right' });
    }

    // SECCIÓN 4: HISTORIAL DE MUESTREOS Y EVALUACIONES (FILTRADO)
    if (document.getElementById('rep-inc-history').checked) {
        doc.addPage();
        
        // Cabecera simplificada
        doc.setFillColor(15, 23, 42); // Navy
        doc.rect(0, 0, 210, 16, 'F');
        doc.setFont("Helvetica", "bold");
        doc.setFontSize(10);
        doc.setTextColor(255, 255, 255);
        doc.text("REPORTE HISTÓRICO FILTRADO - SECTOR VIVA EL PERÚ", 15, 10);

        let yPage3 = 26;
        doc.setFont("Helvetica", "bold");
        doc.setFontSize(11);
        doc.setTextColor(37, 99, 235);
        doc.text("4. Historial de Muestreos y Evaluaciones (Filtrado)", 15, yPage3);
        yPage3 += 8;

        const histFiltrado = obtenerHistorialFiltrado();

        if (histFiltrado.length === 0) {
            doc.setFont("Helvetica", "italic");
            doc.setFontSize(9.5);
            doc.setTextColor(100, 116, 139);
            doc.text("No se registran análisis en el historial para los filtros seleccionados.", 15, yPage3);
        } else {
            // Cabeceras de tabla
            doc.setFillColor(30, 41, 59); // Fondo cabecera tabla
            doc.rect(15, yPage3, 180, 8, 'F');
            doc.setFontSize(8.5);
            doc.setFont("Helvetica", "bold");
            doc.setTextColor(255, 255, 255);
            doc.text("Fecha", 17, yPage3 + 5.5);
            doc.text("ID", 47, yPage3 + 5.5);
            doc.text("Vivienda / Propietario", 60, yPage3 + 5.5);
            doc.text("Responsable", 110, yPage3 + 5.5);
            doc.text("pH", 145, yPage3 + 5.5);
            doc.text("Cloro", 157, yPage3 + 5.5);
            doc.text("Estado", 175, yPage3 + 5.5);

            yPage3 += 8;
            doc.setFont("Helvetica", "normal");
            doc.setTextColor(30, 41, 59);

            // Renderizar los primeros 25 registros en el PDF (para evitar rebosar la página)
            histFiltrado.slice(0, 25).forEach((h, idx) => {
                if (yPage3 > 265) {
                    doc.addPage();
                    doc.setFillColor(15, 23, 42);
                    doc.rect(0, 0, 210, 16, 'F');
                    doc.setFont("Helvetica", "bold");
                    doc.setFontSize(10);
                    doc.setTextColor(255, 255, 255);
                    doc.text("REPORTE HISTÓRICO FILTRADO - SECTOR VIVA EL PERÚ (CONT.)", 15, 10);
                    yPage3 = 26;
                    
                    doc.setFillColor(30, 41, 59);
                    doc.rect(15, yPage3, 180, 8, 'F');
                    doc.setFontSize(8.5);
                    doc.setFont("Helvetica", "bold");
                    doc.setTextColor(255, 255, 255);
                    doc.text("Fecha", 17, yPage3 + 5.5);
                    doc.text("ID", 47, yPage3 + 5.5);
                    doc.text("Vivienda / Propietario", 60, yPage3 + 5.5);
                    doc.text("Responsable", 110, yPage3 + 5.5);
                    doc.text("pH", 145, yPage3 + 5.5);
                    doc.text("Cloro", 157, yPage3 + 5.5);
                    doc.text("Estado", 175, yPage3 + 5.5);
                    yPage3 += 8;
                    doc.setFont("Helvetica", "normal");
                    doc.setTextColor(30, 41, 59);
                }

                // Fondo cebra
                if (idx % 2 === 0) {
                    doc.setFillColor(248, 250, 252);
                    doc.rect(15, yPage3, 180, 7.5, 'F');
                }

                doc.text(h.fecha, 17, yPage3 + 5.5);
                doc.text(h.viviendaId, 47, yPage3 + 5.5);
                
                let nombreTrunc = h.viviendaNombre;
                if (nombreTrunc.length > 25) nombreTrunc = nombreTrunc.substring(0, 23) + '...';
                doc.text(nombreTrunc, 60, yPage3 + 5.5);

                let respTrunc = h.responsable;
                if (respTrunc.length > 18) respTrunc = respTrunc.substring(0, 16) + '...';
                doc.text(respTrunc, 110, yPage3 + 5.5);
                
                const phText = (h.ph !== null && h.ph !== undefined) ? Number(h.ph).toFixed(1) : 'S/D';
                const cloroText = (h.cloro !== null && h.cloro !== undefined) ? Number(h.cloro).toFixed(2) : 'S/D';
                doc.text(phText, 145, yPage3 + 5.5);
                doc.text(cloroText, 157, yPage3 + 5.5);
                
                // Color por estado
                if (h.estado === 'verde') doc.setTextColor(22, 163, 74);
                else if (h.estado === 'amarillo') doc.setTextColor(217, 119, 6);
                else doc.setTextColor(220, 38, 38);
                doc.setFont("Helvetica", "bold");
                doc.text(h.estado === 'verde' ? 'APTA' : h.estado === 'amarillo' ? 'ALERTA' : 'CRÍTICO', 175, yPage3 + 5.5);
                
                doc.setFont("Helvetica", "normal");
                doc.setTextColor(30, 41, 59);

                yPage3 += 7.5;
            });

            if (histFiltrado.length > 25) {
                doc.setFont("Helvetica", "italic");
                doc.setFontSize(8);
                doc.setTextColor(100, 116, 139);
                doc.text(`* Mostrando los primeros 25 de ${histFiltrado.length} registros filtrados en el PDF. Para ver todos, exportar en CSV.`, 15, yPage3 + 5);
            }
        }

        // Pie de página oficial
        doc.setDrawColor(226, 232, 240);
        doc.line(15, 275, 195, 275);
        doc.setFontSize(8);
        doc.setTextColor(148, 163, 184);
        doc.text("Semáforo Hídrico Inteligente - Prototipo Universitario Cusco 2026", 15, 282);
        doc.text("Página de Historial", 195, 282, { align: 'right' });
    }

    // Guardar el PDF y gatillar la descarga
    doc.save('Reporte_Calidad_Agua_Viva_El_Peru.pdf');
    registrarActividad("sistema", "Reporte PDF Generado", `Descarga del informe ejecutivo oficial con filtros aplicados.`);
    registrarActividadEnServidor('Reportes', 'Generar PDF', `Se generó el reporte ejecutivo oficial en formato PDF.`);
}

function exportarHistorialCSV() {
    let csvContent = "data:text/csv;charset=utf-8,";
    
    // Cabeceras del CSV
    csvContent += "Fecha,ID Vivienda,Vivienda,Responsable,pH,Cloro (mg/L),Estado,Observaciones\n";
    
    // Obtener registros filtrados
    const registrosFiltrados = obtenerHistorialFiltrado();
    
    // Filas
    registrosFiltrados.forEach(h => {
        // Limpiamos comas u saltos de línea en observaciones para evitar romper el formato CSV
        const obsLimpia = h.observaciones.replace(/,/g, ";").replace(/\n/g, " ");
        const fila = `"${h.fecha}","${h.viviendaId}","${h.viviendaNombre}","${h.responsable}",${h.ph},${h.cloro},"${h.estado}","${obsLimpia}"`;
        csvContent += fila + "\n";
    });

    // Gatillar la descarga
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Historial_Filtrado_Calidad_Agua_Semáforo_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link); // Requerido para Firefox
    
    link.click();
    document.body.removeChild(link);

    registrarActividad("sistema", "Base de datos exportada", `Descarga de historial filtrado (${registrosFiltrados.length} registros) en formato CSV.`);
    registrarActividadEnServidor('Historial', 'Exportar historial', `Se exportó el historial de mediciones (${registrosFiltrados.length} registros) en formato CSV/Excel.`);
    registrarActividadEnServidor('Reportes', 'Exportar Excel', `Se exportó la base de datos de historial de muestreos a Excel/CSV.`);
}

// --- 7. MÓDULO DE NOTIFICACIONES / MODAL DE ÉXITO ---

/**
 * Muestra una notificación flotante tipo Toast.
 * @param {string} mensaje - Mensaje o contenido HTML básico.
 * @param {string} tipo - Tipo de notificación: 'success', 'warning', 'error'.
 * @param {number} duracion - Duración en ms antes de auto-cerrarse.
 * @param {string|null} tituloPersonalizado - Título del toast (opcional).
 */
window.showToast = function(mensaje, tipo = 'success', duracion = 4000, tituloPersonalizado = null) {
    const container = document.getElementById('toast-container');
    if (!container) return;

    // Crear el elemento del toast
    const toast = document.createElement('div');
    toast.className = `toast toast-${tipo}`;
    toast.style.setProperty('--toast-duration', `${duracion}ms`);

    // Iconos SVG responsivos y limpios
    let iconSvg = '';
    let tituloDefault = '';

    if (tipo === 'success') {
        tituloDefault = 'Éxito';
        iconSvg = `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>`;
    } else if (tipo === 'warning') {
        tituloDefault = 'Advertencia';
        iconSvg = `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>`;
    } else {
        tituloDefault = 'Error';
        iconSvg = `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>`;
    }

    const titulo = tituloPersonalizado || tituloDefault;

    toast.innerHTML = `
        <div class="toast-icon">${iconSvg}</div>
        <div class="toast-content">
            <div class="toast-title">${titulo}</div>
            <div class="toast-message">${mensaje}</div>
        </div>
        <button class="toast-close" aria-label="Cerrar">&times;</button>
        <div class="toast-progress-bar"></div>
    `;

    container.appendChild(toast);

    // Variables de temporizador
    let timeLeft = duracion;
    let startTimestamp = Date.now();
    let timeoutId = null;

    const startTimer = () => {
        startTimestamp = Date.now();
        timeoutId = setTimeout(() => {
            closeToast();
        }, timeLeft);
    };

    const pauseTimer = () => {
        clearTimeout(timeoutId);
        timeLeft -= (Date.now() - startTimestamp);
        if (timeLeft < 0) timeLeft = 0;
    };

    const closeToast = () => {
        if (toast.classList.contains('exit')) return;
        toast.classList.add('exit');

        const removeNode = () => {
            toast.removeEventListener('animationend', removeNode);
            toast.remove();
        };

        toast.addEventListener('animationend', removeNode);

        // Fallback en caso de que animationend no se dispare
        setTimeout(() => {
            if (toast.parentNode) {
                toast.remove();
            }
        }, 350);
    };

    // Eventos
    const closeBtn = toast.querySelector('.toast-close');
    closeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        closeToast();
    });

    toast.addEventListener('mouseenter', pauseTimer);
    toast.addEventListener('mouseleave', startTimer);

    // Iniciar
    startTimer();
};

function mostrarNotificacionModal(titulo, htmlContenido, esError = false) {
    const modal = document.getElementById('notification-modal');
    const modalTitle = document.getElementById('modal-title');
    const modalBody = document.getElementById('modal-body-content');

    modalTitle.innerText = titulo;
    if (esError) {
        modalTitle.style.color = 'var(--color-red)';
    } else {
        modalTitle.style.color = 'var(--text-primary)';
    }
    
    modalBody.innerHTML = htmlContenido;
    modal.classList.add('active');
}

function cerrarModal() {
    document.getElementById('notification-modal').classList.remove('active');
}

// --- 8. NAVEGACIÓN Y CONTROL DE PESTAÑAS ---

function cambiarPestana(targetTab) {
    // Cerrar menú lateral en móviles al cambiar de pestaña
    const sidebar = document.querySelector('.sidebar');
    if (sidebar) {
        sidebar.classList.remove('open');
    }

    // 1. Ocultar todos los contenidos de pestaña
    const contents = document.querySelectorAll('.tab-content');
    contents.forEach(c => c.classList.remove('active'));

    // 2. Desactivar todos los items del menú
    const menuItems = document.querySelectorAll('.menu-item');
    menuItems.forEach(item => item.classList.remove('active'));

    // 3. Activar la pestaña solicitada
    const targetContent = document.getElementById(targetTab);
    if (targetContent) {
        targetContent.classList.add('active');
    }

    // 4. Activar el item del menú correspondiente
    const menuItem = document.querySelector(`.menu-item[data-tab="${targetTab}"]`);
    if (menuItem) {
        menuItem.classList.add('active');
    }

    // 5. Cambiar el título de la página
    const titulos = {
        'dashboard': 'Dashboard Principal',
        'registrar': 'Registrar Análisis',
        'mapa': 'Mapa Comunitario',
        'alertas': 'Panel de Alertas',
        'historial': 'Historial de Mediciones',
        'reportes': 'Generación de Reportes',
        'administrar': 'Administrar Viviendas',
        'bitacora': 'Bitácora y Auditoría del Sistema',
        'usuarios': 'Gestión de Usuarios'
    };
    document.getElementById('page-title').innerText = titulos[targetTab] || 'Semáforo Hídrico';

    // 6. Tareas especiales por pestaña al activarse
    if (targetTab === 'mapa') {
        // Inicializar o recalcular Leaflet
        setTimeout(async function() {
            inicializarMapa();
            await cargarDatosServidor();
            if (map) {
                map.invalidateSize();
            }
        }, 100);
    }
    if (targetTab === 'dashboard') {
        renderCharts();
    }
    if (targetTab === 'historial') {
        renderHistorialTable();
    }
    if (targetTab === 'alertas') {
        renderAlertasCards();
    }
    if (targetTab === 'administrar') {
        renderAdminViviendasTable();
    }
    if (targetTab === 'reportes') {
        actualizarVistaPreviaReporte();
    }
    if (targetTab === 'bitacora') {
        bitacoraCurrentPage = 1;
        renderBitacoraTable();
    }
    if (targetTab === 'usuarios') {
        renderUsuariosTable();
    }

    // Cerrar barra lateral móvil si está abierta
    document.querySelector('.sidebar').classList.remove('open');
}

function inicializarPestanas() {
    const menuItems = document.querySelectorAll('.menu-item');
    menuItems.forEach(item => {
        item.addEventListener('click', function(e) {
            e.preventDefault();
            const tabName = this.getAttribute('data-tab');
            if (tabName === 'registrar') {
                resetWizard();
            }
            cambiarPestana(tabName);
        });
    });

    // Enlaces "Ver todo" dentro del Dashboard que redirigen a otra pestaña
    const buttonsViewAll = document.querySelectorAll('.btn-view-all');
    buttonsViewAll.forEach(btn => {
        btn.addEventListener('click', function() {
            const targetTab = this.getAttribute('data-target-tab');
            cambiarPestana(targetTab);
        });
    });
}

// --- 9. INICIALIZACIÓN GENERAL ---

document.addEventListener('DOMContentLoaded', () => {
    inicializarSistema();
});

// --- 10. ADMINISTRACIÓN DE VIVIENDAS (CRUD) ---

let relocateMap = null;
let relocateMarker = null;

function renderAdminViviendasTable() {
    const viewContainer = document.getElementById('admin-view-container');
    if (!viewContainer) return;

    // 1. Calcular y actualizar estadísticas rápidas en la parte superior (KPIs globales)
    const totalCount = dbViviendas.length;
    const aptasCount = dbViviendas.filter(v => v.estado === 'verde').length;
    const observadasCount = dbViviendas.filter(v => v.estado === 'amarillo').length;
    const criticasCount = dbViviendas.filter(v => v.estado === 'rojo').length;
    const sinEvaluarCount = dbViviendas.filter(v => v.estado === 'gris').length;

    const statTotalEl = document.getElementById('admin-stat-total');
    const statAptasEl = document.getElementById('admin-stat-aptas');
    const statObservadasEl = document.getElementById('admin-stat-observadas');
    const statCriticasEl = document.getElementById('admin-stat-criticas');
    const statSinEvaluarEl = document.getElementById('admin-stat-sin-evaluar');

    if (statTotalEl) statTotalEl.innerText = totalCount;
    if (statAptasEl) statAptasEl.innerText = aptasCount;
    if (statObservadasEl) statObservadasEl.innerText = observadasCount;
    if (statCriticasEl) statCriticasEl.innerText = criticasCount;
    if (statSinEvaluarEl) statSinEvaluarEl.innerText = sinEvaluarCount;

    // 2. Obtener filtros
    const query = document.getElementById('admin-search').value.toLowerCase().trim();
    const filterSector = document.getElementById('admin-filter-sector').value;
    const filterEstado = document.getElementById('admin-filter-estado').value;
    const filterDate = document.getElementById('admin-filter-date').value;

    // 3. Filtrar viviendas
    const filtered = dbViviendas.filter(v => {
        const matchSearch = v.nombre.toLowerCase().includes(query) || 
                            v.id.toLowerCase().includes(query) || 
                            v.direccion.toLowerCase().includes(query) ||
                            (v.telefono && v.telefono.toLowerCase().includes(query));
                            
        const matchSector = (filterSector === 'todos') || (v.sector === filterSector);
        const matchEstado = (filterEstado === 'todos') || (v.estado === filterEstado);
        
        let matchDate = true;
        if (filterDate) {
            if (v.fecha) {
                const vDateStr = v.fecha.split(' ')[0];
                matchDate = vDateStr >= filterDate;
            } else {
                matchDate = false;
            }
        }
        
        return matchSearch && matchSector && matchEstado && matchDate;
    });

    const container = document.getElementById('admin-view-container');
    if (!container) return;

    if (filtered.length === 0) {
        container.innerHTML = `
            <div style="text-align: center; padding: 32px 20px; color: var(--text-secondary);">
                <div style="font-size: 32px; margin-bottom: 12px;">🔍</div>
                <h4 style="font-size: 15px; font-weight: 700; color: var(--text-primary); margin-bottom: 4px;">No se encontraron viviendas</h4>
                <p style="font-size: 12.5px;">Prueba ajustando los filtros de búsqueda o sector.</p>
            </div>
        `;
        return;
    }

    // 4. Renderizar tabla compacta con columnas optimizadas y limpias
    let tableHtml = `
        <div class="admin-table-wrapper" style="overflow-x: auto; padding: 0 20px;">
            <table class="table-premium" style="width: 100%; border-collapse: separate; border-spacing: 0;">
                <thead>
                    <tr>
                        <th style="text-align: left; width: 90px;">Código</th>
                        <th style="text-align: left;">Familia / Propietario</th>
                        <th style="text-align: left; width: 180px;">Sector</th>
                        <th style="text-align: center; width: 160px;">Último Análisis</th>
                        <th style="text-align: center; width: 130px;">Semáforo</th>
                        <th style="text-align: left; width: 330px;">Acciones</th>
                    </tr>
                </thead>
                <tbody id="admin-table-tbody">
    `;

    filtered.forEach(v => {
        const phText = (v.ph !== null && v.ph !== undefined) ? v.ph.toFixed(1) : 'S/D';
        const cloroText = (v.cloro !== null && v.cloro !== undefined) ? `${v.cloro.toFixed(2)}` : 'S/D';
        const sectorName = v.sector || "Sector Viva el Perú";
        
        const statusLabels = {
            verde: 'Apta',
            amarillo: 'Observación',
            rojo: 'Riesgo crítico',
            gris: 'Sin evaluar'
        };
        const statusLabel = statusLabels[v.estado] || 'Sin evaluar';

        tableHtml += `
            <tr>
                <td data-label="Código"><strong>${v.id}</strong></td>
                <td data-label="Familia/Propietario"><strong>${v.nombre}</strong></td>
                <td data-label="Sector">${sectorName}</td>
                <td style="text-align: center; font-weight: 600;" data-label="Último Análisis">
                    <span>pH: ${phText} | Cl: ${cloroText} mg/L</span>
                </td>
                <td style="text-align: center;" data-label="Semáforo">
                    <span class="status-badge ${v.estado || 'gris'}">${statusLabel}</span>
                </td>
                <td data-label="Acciones">
                    <div class="admin-actions-cell" style="display: flex; gap: 6px; justify-content: flex-start; align-items: center; white-space: nowrap;">
                        <button type="button" class="btn-outline-action btn-detail" onclick="abrirDetalleVivienda('${v.id}')" title="Ver perfil detallado e historial">
                            👁️ <span class="action-btn-text">Detalle</span>
                        </button>
                        <button type="button" class="btn-outline-action btn-edit" onclick="abrirModalEditarVivienda('${v.id}')" title="Editar datos del propietario">
                            ✏️ <span class="action-btn-text">Editar</span>
                        </button>
                        <button type="button" class="btn-outline-action btn-location" onclick="abrirModalReubicarVivienda('${v.id}')" title="Modificar coordenadas geográficas">
                            📍 <span class="action-btn-text">Ubicación</span>
                        </button>
                        <button type="button" class="btn-outline-action btn-delete" onclick="eliminarVivienda('${v.id}')" title="Eliminar vivienda del sistema">
                            🗑️ <span class="action-btn-text">Eliminar</span>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    });

    tableHtml += `
                </tbody>
            </table>
        </div>
    `;
    container.innerHTML = tableHtml;
}

window.abrirDetalleVivienda = function(id) {
    const viv = dbViviendas.find(v => v.id === id);
    if (!viv) return;

    // Poblar información general en el modal
    document.getElementById('detail-viv-code').innerText = viv.id;
    document.getElementById('detail-viv-owner').innerText = viv.nombre;
    document.getElementById('detail-viv-phone').innerText = viv.telefono || 'Sin Teléfono';
    document.getElementById('detail-viv-address').innerText = viv.direccion;
    document.getElementById('detail-viv-sector').innerText = viv.sector || 'Sector Viva el Perú';
    
    // Reemplazar coordenadas visibles por un botón interactivo "📍 Ver mapa"
    const coordsEl = document.getElementById('detail-viv-coords');
    if (coordsEl) {
        coordsEl.innerHTML = `
            <button type="button" class="btn-outline-action btn-location" onclick="centrarViviendaEnMapaPrincipal('${viv.id}', ${viv.latitud}, ${viv.longitud})" title="Centrar y visualizar en el Mapa Comunitario" style="padding: 4px 8px; font-weight: 600; font-size: 11px; width: auto;">
                📍 Ver mapa
            </button>
        `;
    }
    
    // Badge de estado de semáforo
    const statusLabels = {
        verde: 'Agua Apta',
        amarillo: 'Observación',
        rojo: 'Riesgo Crítico',
        gris: 'Sin evaluar'
    };
    const statusLabel = statusLabels[viv.estado] || 'Sin evaluar';
    const badgeEl = document.getElementById('detail-viv-status-badge');
    if (badgeEl) {
        badgeEl.innerHTML = `<span class="status-badge ${viv.estado || 'gris'}">${statusLabel}</span>`;
    }

    // Observaciones
    document.getElementById('detail-viv-obs').innerText = viv.observaciones || 'Sin observaciones registradas.';

    // Configurar atributos del botón de centrado en mapa en el footer del modal
    const btnShowOnMap = document.getElementById('btn-detail-viv-show-on-map');
    if (btnShowOnMap) {
        btnShowOnMap.setAttribute('data-vivienda-id', viv.id);
        btnShowOnMap.setAttribute('data-lat', viv.latitud);
        btnShowOnMap.setAttribute('data-lng', viv.longitud);
    }

    // Poblar tabla de historial de análisis completo
    const tbody = document.getElementById('detail-viv-history-tbody');
    if (tbody) {
        tbody.innerHTML = '';
        
        const history = dbHistorial.filter(h => h.viviendaId === viv.id);
        
        if (history.length === 0) {
            tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; padding: 20px; color: var(--text-secondary);">No hay análisis registrados para esta vivienda.</td></tr>`;
        } else {
            const sortedHistory = history.slice().sort((a, b) => b.fecha.localeCompare(a.fecha));
            
            sortedHistory.forEach(h => {
                const statusLabelsHist = {
                    verde: '🟢 Apta',
                    amarillo: '🟡 Observación',
                    rojo: '🔴 Crítica'
                };
                const statusText = statusLabelsHist[h.estado] || h.estado;
                const dateStr = h.fecha ? h.fecha.split(' ')[0] : '-';
                
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td style="padding: 8px 12px; font-weight: 500;">${dateStr}</td>
                    <td style="padding: 8px 12px; color: var(--text-secondary);">${h.responsable || 'Comité'}</td>
                    <td style="padding: 8px 12px; text-align: center; font-weight: 600;">${(h.ph !== null && h.ph !== undefined) ? Number(h.ph).toFixed(1) : 'S/D'}</td>
                    <td style="padding: 8px 12px; text-align: center; font-weight: 600;">${(h.cloro !== null && h.cloro !== undefined) ? `${Number(h.cloro).toFixed(2)} mg/L` : 'S/D'}</td>
                    <td style="padding: 8px 12px; text-align: center;">
                        <span class="status-badge ${h.estado}" style="padding: 2px 8px; font-size: 10px;">${statusText}</span>
                    </td>
                `;
                tbody.appendChild(tr);
            });
        }
    }

    // Mostrar el modal
    document.getElementById('admin-housing-detail-modal').classList.add('active');
};

window.centrarViviendaEnMapaPrincipal = function(id, lat, lng) {
    // 1. Cerrar modales abiertos
    const modalDetail = document.getElementById('admin-housing-detail-modal');
    if (modalDetail) modalDetail.classList.remove('active');
    
    const modalRelocate = document.getElementById('relocate-vivienda-modal');
    if (modalRelocate) modalRelocate.classList.remove('active');
    
    // 2. Cambiar de pestaña al Mapa Comunitario
    cambiarPestana('mapa');
    
    // 3. Centrar y abrir popup en el mapa principal
    setTimeout(() => {
        if (typeof currentViewMode !== 'undefined' && currentViewMode === 'heatmap') {
            cambiarModoVisualizacionMap('combined');
        }
        
        if (typeof currentMapFilter !== 'undefined' && currentMapFilter !== 'todos') {
            currentMapFilter = 'todos';
            const filterButtons = document.querySelectorAll('.map-filter-btn');
            filterButtons.forEach(btn => {
                if (btn.getAttribute('data-filter') === 'todos') {
                    btn.classList.add('active');
                } else {
                    btn.classList.remove('active');
                }
            });
            filtrarMarcadoresMapa('todos');
        }
        
        const marker = viviendasMarkers[id];
        if (marker) {
            map.setView([lat, lng], 18);
            marker.openPopup();
        } else {
            console.warn(`Marcador no encontrado para la vivienda ${id}`);
            if (map) {
                map.setView([lat, lng], 18);
            }
        }
    }, 300);
};

window.abrirModalEditarVivienda = function(id) {
    const viv = dbViviendas.find(v => v.id === id);
    if (!viv) return;

    document.getElementById('edit-viv-id').value = viv.id;
    document.getElementById('edit-viv-propietario').value = viv.nombre;
    document.getElementById('edit-viv-direccion').value = viv.direccion;
    document.getElementById('edit-viv-sector').value = viv.sector || "Sector Viva el Perú";
    document.getElementById('edit-viv-telefono').value = viv.telefono || "";
    document.getElementById('edit-viv-obs').value = viv.observaciones || "";

    document.getElementById('edit-vivienda-modal').classList.add('active');
};

async function guardarEdicionVivienda() {
    const id = document.getElementById('edit-viv-id').value;
    const propietario = document.getElementById('edit-viv-propietario').value.trim();
    const direccion = document.getElementById('edit-viv-direccion').value.trim();
    const sector = document.getElementById('edit-viv-sector').value;
    const telefono = document.getElementById('edit-viv-telefono').value.trim();
    const obs = document.getElementById('edit-viv-obs').value.trim();

    if (!propietario || !direccion) {
        showToast("Por favor completa el Propietario y la Dirección.", 'warning', 4000, "Campos Incompletos");
        return;
    }

    const payload = {
        id: id,
        nombre: propietario,
        direccion: direccion,
        sector: sector,
        telefono: telefono,
        observaciones: obs
    };

    try {
        const res = await fetch('api/viviendas.php', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const result = await res.json();
        if (result.success) {
            await cargarDatosServidor();
            document.getElementById('edit-vivienda-modal').classList.remove('active');
            showToast("Los cambios de la vivienda se guardaron con éxito.", 'success', 4000, "Vivienda Actualizada");
        } else {
            showToast(result.error, 'error', 5000, "Error al editar vivienda");
        }
    } catch (err) {
        console.error(err);
        showToast("Error de conexión al guardar cambios.", 'error', 4000, "Error");
    }
}

window.abrirModalReubicarVivienda = function(id) {
    const viv = dbViviendas.find(v => v.id === id);
    if (!viv) return;

    document.getElementById('relocate-viv-id').value = viv.id;
    document.getElementById('relocate-viv-lat').value = viv.latitud.toFixed(6);
    document.getElementById('relocate-viv-lng').value = viv.longitud.toFixed(6);

    document.getElementById('relocate-vivienda-modal').classList.add('active');

    // Inicializar mapa de reubicación
    setTimeout(() => {
        const coords = [viv.latitud, viv.longitud];
        
        if (relocateMap) {
            relocateMap.setView(coords, 17);
            relocateMarker.setLatLng(coords);
        } else {
            relocateMap = L.map('relocate-vivienda-map', {
                zoomControl: true,
                scrollWheelZoom: true
            }).setView(coords, 17);

            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '&copy; OpenStreetMap'
            }).addTo(relocateMap);

            relocateMarker = L.marker(coords, {
                draggable: true
            }).addTo(relocateMap);

            relocateMarker.on('dragend', function() {
                const pos = relocateMarker.getLatLng();
                document.getElementById('relocate-viv-lat').value = pos.lat.toFixed(6);
                document.getElementById('relocate-viv-lng').value = pos.lng.toFixed(6);
            });

            relocateMap.on('click', function(e) {
                relocateMarker.setLatLng(e.latlng);
                document.getElementById('relocate-viv-lat').value = e.latlng.lat.toFixed(6);
                document.getElementById('relocate-viv-lng').value = e.latlng.lng.toFixed(6);
            });
        }
        relocateMap.invalidateSize();
    }, 100);
};

async function guardarReubicacionVivienda() {
    const id = document.getElementById('relocate-viv-id').value;
    const lat = parseFloat(document.getElementById('relocate-viv-lat').value);
    const lng = parseFloat(document.getElementById('relocate-viv-lng').value);

    if (isNaN(lat) || isNaN(lng)) return;

    const payload = {
        id: id,
        latitud: lat,
        longitud: lng
    };

    try {
        const res = await fetch('api/viviendas.php', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const result = await res.json();
        if (result.success) {
            await cargarDatosServidor();
            document.getElementById('relocate-vivienda-modal').classList.remove('active');
            showToast("La vivienda ha sido reubicada con éxito en el mapa.", 'success', 4000, "Ubicación Actualizada");
        } else {
            showToast("Error al reubicar vivienda: " + result.error, 'error', 5000);
        }
    } catch (err) {
        console.error(err);
        showToast("Error de conexión al reubicar.", 'error', 4000);
    }
}

window.eliminarVivienda = function(id) {
    const viv = dbViviendas.find(v => v.id === id);
    if (!viv) return;

    const modalContent = `
        <div style="text-align: center; padding: 12px 0;">
            <p style="font-size:13.5px; margin-bottom: 12px;">¿Está seguro de que desea eliminar permanentemente la vivienda de la familia <strong>${viv.nombre}</strong> (${viv.id})?</p>
            <p style="font-size:11.5px; color:var(--color-red-hover); font-weight:700; background-color: var(--color-red-light); padding: 8px; border-radius:6px; margin-bottom: 20px;">Esta acción no se puede deshacer. Las mediciones históricas en los reportes se conservarán asociadas a la vivienda eliminada.</p>
            <div style="display:flex; justify-content:center; gap:16px;">
                <button type="button" class="btn btn-secondary" onclick="cerrarModal()">Cancelar</button>
                <button type="button" class="btn btn-primary" style="background-color: var(--color-red); color:#FFF; border: none; padding: 10px 20px; border-radius: 6px; cursor: pointer;" onclick="confirmarEliminacionVivienda('${id}')">Sí, Eliminar</button>
            </div>
        </div>
    `;
    mostrarNotificacionModal("Confirmar Eliminación", modalContent, true);
};

window.confirmarEliminacionVivienda = async function(id) {
    try {
        const res = await fetch(`api/viviendas.php?id=${id}`, {
            method: 'DELETE'
        });
        const result = await res.json();
        if (result.success) {
            await cargarDatosServidor();
            cerrarModal();
            showToast("La vivienda ha sido removida del sistema.", 'success', 4000, "Vivienda Eliminada");
        } else {
            showToast("Error al eliminar vivienda: " + result.error, 'error', 5000);
        }
    } catch (err) {
        console.error(err);
        showToast("Error de conexión al eliminar.", 'error', 4000);
    }
};

function inicializarEventosAdministracion() {
    if (!document.getElementById('administrar')) return;

    const searchInput = document.getElementById('admin-search');
    if (searchInput) {
        searchInput.addEventListener('input', renderAdminViviendasTable);
    }
    const filterSelect = document.getElementById('admin-filter-sector');
    if (filterSelect) {
        filterSelect.addEventListener('change', renderAdminViviendasTable);
    }
    const filterEstado = document.getElementById('admin-filter-estado');
    if (filterEstado) {
        filterEstado.addEventListener('change', renderAdminViviendasTable);
    }
    const filterDate = document.getElementById('admin-filter-date');
    if (filterDate) {
        filterDate.addEventListener('input', renderAdminViviendasTable);
    }

    // Alternar vistas (Tabla / Tarjetas)
    const btnTable = document.getElementById('btn-admin-view-table');
    const btnCards = document.getElementById('btn-admin-view-cards');
    if (btnTable && btnCards) {
        btnTable.addEventListener('click', () => {
            currentAdminView = 'table';
            btnTable.classList.add('active');
            btnCards.classList.remove('active');
            renderAdminViviendasTable();
        });
        btnCards.addEventListener('click', () => {
            currentAdminView = 'cards';
            btnCards.classList.add('active');
            btnTable.classList.remove('active');
            renderAdminViviendasTable();
        });
    }

    // Modal cerrar detalles
    const modalDetail = document.getElementById('admin-housing-detail-modal');
    const btnCloseDetail = document.getElementById('btn-close-detail-viv-modal');
    const btnCloseDetailAccept = document.getElementById('btn-close-detail-viv-accept');
    
    if (btnCloseDetail) {
        btnCloseDetail.addEventListener('click', () => {
            modalDetail.classList.remove('active');
        });
    }
    if (btnCloseDetailAccept) {
        btnCloseDetailAccept.addEventListener('click', () => {
            modalDetail.classList.remove('active');
        });
    }

    // Botón centrar en mapa principal desde modal detalles
    const btnShowOnMap = document.getElementById('btn-detail-viv-show-on-map');
    if (btnShowOnMap) {
        btnShowOnMap.addEventListener('click', () => {
            const vivId = btnShowOnMap.getAttribute('data-vivienda-id');
            const lat = parseFloat(btnShowOnMap.getAttribute('data-lat'));
            const lng = parseFloat(btnShowOnMap.getAttribute('data-lng'));
            if (vivId && !isNaN(lat) && !isNaN(lng)) {
                centrarViviendaEnMapaPrincipal(vivId, lat, lng);
            }
        });
    }

    // Botón centrar en mapa principal desde modal reubicación
    const btnRelocateShowOnMap = document.getElementById('btn-relocate-show-on-map');
    if (btnRelocateShowOnMap) {
        btnRelocateShowOnMap.addEventListener('click', () => {
            const id = document.getElementById('relocate-viv-id').value;
            const lat = parseFloat(document.getElementById('relocate-viv-lat').value);
            const lng = parseFloat(document.getElementById('relocate-viv-lng').value);
            if (id && !isNaN(lat) && !isNaN(lng)) {
                centrarViviendaEnMapaPrincipal(id, lat, lng);
            }
        });
    }

    // Modal cerrar edición
    document.getElementById('btn-close-edit-modal').addEventListener('click', () => {
        document.getElementById('edit-vivienda-modal').classList.remove('active');
    });
    document.getElementById('btn-cancel-edit').addEventListener('click', () => {
        document.getElementById('edit-vivienda-modal').classList.remove('active');
    });
    document.getElementById('btn-save-edit-vivienda').addEventListener('click', guardarEdicionVivienda);

    // Modal cerrar reubicación
    document.getElementById('btn-close-relocate-modal').addEventListener('click', () => {
        document.getElementById('relocate-vivienda-modal').classList.remove('active');
    });
    document.getElementById('btn-cancel-relocate').addEventListener('click', () => {
        document.getElementById('relocate-vivienda-modal').classList.remove('active');
    });
    document.getElementById('btn-save-relocate-vivienda').addEventListener('click', guardarReubicacionVivienda);
}

function validarSincronizacionModulos() {
    const totalDB = dbViviendas.length;
    
    // 1. Dashboard
    const dashboardCountEl = document.getElementById('metric-total');
    let countDashboard = NaN;
    if (dashboardCountEl) {
        const text = dashboardCountEl.innerText.trim();
        if (text === '--' || text === '' || text.toLowerCase() === 'cargando...') {
            // No hacer nada, sigue siendo NaN
        } else {
            countDashboard = parseInt(text);
        }
    }
    
    // 2. Mapa Comunitario
    const mapCountEl = document.getElementById('map-kpi-total');
    let countMapa = NaN;
    if (mapCountEl) {
        const text = mapCountEl.innerText.trim();
        if (text === '--' || text === '' || text.toLowerCase() === 'cargando...') {
            // No hacer nada, sigue siendo NaN
        } else {
            countMapa = parseInt(text);
        }
    }
    
    // 3. Administración (Admin)
    const adminCountEl = document.getElementById('report-viviendas-count-label');
    let countAdmin = NaN;
    if (adminCountEl) {
        const text = adminCountEl.innerText.trim();
        if (text.includes('--') || text === '' || text.toLowerCase().includes('cargando...')) {
            // No hacer nada, sigue siendo NaN
        } else {
            const match = text.match(/\d+/);
            if (match) {
                countAdmin = parseInt(match[0]);
            }
        }
    }
    
    // 4. Registrar Análisis (Wizard)
    const wizardGrid = document.getElementById('wizard-viviendas-grid');
    const wizardSearchInput = document.getElementById('wizard-search-vivienda');
    let countWizard = NaN;
    if (wizardGrid) {
        const hasCards = wizardGrid.querySelector('.vivienda-wizard-card') !== null;
        if (!hasCards) {
            countWizard = NaN;
        } else {
            const isFiltered = wizardSearchInput && wizardSearchInput.value.trim() !== "";
            if (isFiltered) {
                countWizard = dbViviendas.length;
            } else {
                countWizard = wizardGrid.querySelectorAll('.vivienda-wizard-card').length;
            }
        }
    }

    // Si algún módulo aún está cargando o animando (NaN), consideramos para la validación que está sincronizado
    // y solo reportamos descalce si hay un valor numérico diferente al de MySQL
    const checkDashboard = isNaN(countDashboard) ? totalDB : countDashboard;
    const checkMapa = isNaN(countMapa) ? totalDB : countMapa;
    const checkAdmin = isNaN(countAdmin) ? totalDB : countAdmin;
    const checkWizard = isNaN(countWizard) ? totalDB : countWizard;
    
    // Registrar internamente en la consola para desarrollo (sin mostrarlo al usuario final)
    console.log(`[Sincronización Interna]
- Total Dashboard: ${checkDashboard} (Leído: ${countDashboard})
- Total MySQL (dbViviendas): ${totalDB}
- Total Administración: ${checkAdmin} (Leído: ${countAdmin})
- Total Mapa: ${checkMapa} (Leído: ${countMapa})
- Total Wizard: ${checkWizard} (Leído: ${countWizard})
- Consulta SQL: SELECT v.*, a.ph, a.cloro, a.fecha, a.observaciones, u.nombre as responsable FROM viviendas v LEFT JOIN (SELECT a1.* FROM analisis a1 INNER JOIN (SELECT vivienda_id, MAX(id) as max_id FROM analisis GROUP BY vivienda_id) a2 ON a1.id = a2.max_id) a ON v.id = a.vivienda_id LEFT JOIN usuarios u ON a.usuario_id = u.id ORDER BY v.id ASC
- Tiempos de carga / renderizado:
  * Fetch de base de datos: ${(window.fetchTime || 0).toFixed(1)}ms
  * Dashboard: ${(window.tDashboard || 0).toFixed(1)}ms
  * Mapa Comunitario: ${(window.tMapa || 0).toFixed(1)}ms
  * Administración: ${(window.tAdmin || 0).toFixed(1)}ms
  * Alertas: ${(window.tAlertas || 0).toFixed(1)}ms
  * Wizard (Registrar Análisis): ${(window.tWizard || 0).toFixed(1)}ms
`);
    
    let descalces = [];
    if (checkDashboard !== totalDB) {
        descalces.push(`Dashboard (${checkDashboard} vs ${totalDB})`);
    }
    if (checkMapa !== totalDB) {
        descalces.push(`Mapa Comunitario (${checkMapa} vs ${totalDB})`);
    }
    if (checkAdmin !== totalDB) {
        descalces.push(`Administración (${checkAdmin} vs ${totalDB})`);
    }
    if (checkWizard !== totalDB) {
        descalces.push(`Registrar Análisis (${checkWizard} vs ${totalDB})`);
    }
    
    const existingBanner = document.getElementById('sync-error-banner');
    if (descalces.length > 0) {
        console.error("ERROR DE SINCRONIZACIÓN ENTRE MÓDULOS:", descalces.join(', '));
        
        // Inyectar banner de advertencia visual en color rojo
        if (!existingBanner) {
            const banner = document.createElement('div');
            banner.id = 'sync-error-banner';
            banner.style.cssText = 'background-color: #EF4444; color: #FFFFFF; padding: 12px 24px; text-align: center; font-size: 13.5px; font-weight: 800; position: sticky; top: 0; z-index: 9999; box-shadow: 0 4px 12px rgba(239, 68, 68, 0.2); width: 100%; border-bottom: 2px solid #DC2626; display: flex; align-items: center; justify-content: center; gap: 10px; animation: slideInUp 0.3s ease-out;';
            banner.innerHTML = `⚠️ ERROR DE SINCRONIZACIÓN ENTRE MÓDULOS: ${descalces.join(', ')}. Por favor, actualice la base de datos o recargue la página.`;
            document.body.prepend(banner);
        } else {
            existingBanner.innerHTML = `⚠️ ERROR DE SINCRONIZACIÓN ENTRE MÓDULOS: ${descalces.join(', ')}. Por favor, actualice la base de datos o recargue la página.`;
        }
    } else {
        if (existingBanner) {
            existingBanner.remove();
        }
    }
}

/**
 * --- 11. BITÁCORA Y AUDITORÍA DEL SISTEMA ---
 */

function inicializarEventosBitacora() {
    if (!document.getElementById('bitacora')) return;

    const searchInput = document.getElementById('bitacora-search');
    if (searchInput) {
        let debounceTimer;
        searchInput.addEventListener('input', () => {
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(() => {
                bitacoraCurrentPage = 1;
                renderBitacoraTable();
            }, 300);
        });
    }

    const filterModulo = document.getElementById('bitacora-filter-modulo');
    if (filterModulo) {
        filterModulo.addEventListener('change', () => {
            bitacoraCurrentPage = 1;
            renderBitacoraTable();
        });
    }

    const filterDateFrom = document.getElementById('bitacora-filter-date-from');
    if (filterDateFrom) {
        filterDateFrom.addEventListener('change', () => {
            bitacoraCurrentPage = 1;
            renderBitacoraTable();
        });
    }

    const filterDateTo = document.getElementById('bitacora-filter-date-to');
    if (filterDateTo) {
        filterDateTo.addEventListener('change', () => {
            bitacoraCurrentPage = 1;
            renderBitacoraTable();
        });
    }

    const btnClear = document.getElementById('btn-clear-bitacora-filters');
    if (btnClear) {
        btnClear.addEventListener('click', () => {
            if (searchInput) searchInput.value = '';
            if (filterModulo) filterModulo.value = 'todos';
            if (filterDateFrom) filterDateFrom.value = '';
            if (filterDateTo) filterDateTo.value = '';
            bitacoraCurrentPage = 1;
            renderBitacoraTable();
        });
    }

    const btnPrev = document.getElementById('bitacora-pagination-prev');
    if (btnPrev) {
        btnPrev.addEventListener('click', () => {
            if (bitacoraCurrentPage > 1) {
                bitacoraCurrentPage--;
                renderBitacoraTable();
            }
        });
    }

    const btnNext = document.getElementById('bitacora-pagination-next');
    if (btnNext) {
        btnNext.addEventListener('click', () => {
            bitacoraCurrentPage++;
            renderBitacoraTable();
        });
    }
}

async function renderBitacoraTable() {
    const tbody = document.getElementById('bitacora-table-tbody');
    if (!tbody) return;

    const searchVal = document.getElementById('bitacora-search').value.trim();
    const moduloVal = document.getElementById('bitacora-filter-modulo').value;
    const dateFrom = document.getElementById('bitacora-filter-date-from').value;
    const dateTo = document.getElementById('bitacora-filter-date-to').value;

    let url = `api/actividades.php?page=${bitacoraCurrentPage}&limit=${bitacoraRecordsPerPage}`;
    if (searchVal) url += `&search=${encodeURIComponent(searchVal)}`;
    if (moduloVal && moduloVal !== 'todos') url += `&modulo=${encodeURIComponent(moduloVal)}`;
    if (dateFrom) url += `&fecha_inicio=${dateFrom}`;
    if (dateTo) url += `&fecha_fin=${dateTo}`;

    try {
        const res = await fetch(url);
        const result = await res.json();
        
        if (result.success) {
            const tbody = document.getElementById('bitacora-table-tbody');
            tbody.innerHTML = '';
            
            const logs = result.data;
            if (logs.length === 0) {
                tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; padding: 24px; color: var(--text-secondary); font-style: italic;">No se encontraron registros en la bitácora.</td></tr>`;
            } else {
                logs.forEach(log => {
                    const tr = document.createElement('tr');
                    
                    // Modulo class mapping
                    const modClass = log.modulo.toLowerCase().replace('á', 'a').replace('í', 'i'); // analisis, viviendas, etc.
                    
                    // Action class mapping
                    const actClass = log.accion.toLowerCase().replace('á', 'a').replace('í', 'i');
                    let badgeAccionClass = 'general';
                    if (actClass.includes('crear') || actClass.includes('registrar')) {
                        badgeAccionClass = 'crear';
                    } else if (actClass.includes('editar') || actClass.includes('actualizar')) {
                        badgeAccionClass = 'editar';
                    } else if (actClass.includes('eliminar') || actClass.includes('vaciar')) {
                        badgeAccionClass = 'eliminar';
                    } else if (actClass.includes('exportar') || actClass.includes('generar')) {
                        badgeAccionClass = 'exportar';
                    } else if (actClass.includes('resolver')) {
                        badgeAccionClass = 'resolver';
                    }

                    tr.innerHTML = `
                        <td style="padding: 12px 16px; font-weight: 500;">${log.fecha}</td>
                        <td style="padding: 12px 16px; color: var(--text-primary); font-weight: 600;">${log.usuario}</td>
                        <td style="padding: 12px 16px; text-align: center;">
                            <span class="badge-modulo ${modClass}">${log.modulo}</span>
                        </td>
                        <td style="padding: 12px 16px; text-align: center;">
                            <span class="badge-accion ${badgeAccionClass}">${log.accion}</span>
                        </td>
                        <td style="padding: 12px 16px; color: var(--text-secondary); line-height: 1.4;">${log.descripcion}</td>
                    `;
                    tbody.appendChild(tr);
                });
            }

            // Update pagination text
            const total = result.total;
            const start = total === 0 ? 0 : (bitacoraCurrentPage - 1) * bitacoraRecordsPerPage + 1;
            const end = Math.min(bitacoraCurrentPage * bitacoraRecordsPerPage, total);
            document.getElementById('bitacora-pagination-info').innerText = `Mostrando ${start}-${end} de ${total} registros`;

            // Enable/disable pagination buttons
            const btnPrev = document.getElementById('bitacora-pagination-prev');
            const btnNext = document.getElementById('bitacora-pagination-next');
            
            btnPrev.disabled = (bitacoraCurrentPage <= 1);
            btnNext.disabled = (bitacoraCurrentPage >= result.pages);
        }
    } catch (err) {
        console.error("Error al renderizar la bitácora:", err);
    }
}

async function registrarActividadEnServidor(modulo, accion, descripcion, usuario = 'Administrador') {
    try {
        await fetch('api/actividades.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ modulo, accion, descripcion, usuario })
        });
        
        // Recargar actividades secundariamente para el timeline del Dashboard
        fetch('api/actividades.php')
            .then(res => res.json())
            .then(data => {
                dbActividades = data;
                if (document.getElementById('recent-activity-list')) {
                    renderDashboardRecentTables();
                }
            })
            .catch(err => console.error("Error al actualizar actividades del widget:", err));
    } catch (err) {
        console.error("Error al reportar actividad de auditoría:", err);
    }
}

/**
 * --- 12. GESTIÓN DE USUARIOS (CRUD) ---
 */

function escapeHTML(str) {
    if (!str) return '';
    return str.replace(/[&<>'"]/g, 
        tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[tag] || tag)
    );
}

function inicializarEventosHeader() {
    // Dropdown user menu toggling
    const topbarUserBtn = document.getElementById('topbar-user-btn');
    const userDropdownMenu = document.getElementById('user-dropdown-menu');
    if (topbarUserBtn && userDropdownMenu) {
        topbarUserBtn.addEventListener('click', function(e) {
            e.stopPropagation();
            const isVisible = userDropdownMenu.style.display === 'block';
            userDropdownMenu.style.display = isVisible ? 'none' : 'block';
        });

        document.addEventListener('click', function() {
            userDropdownMenu.style.display = 'none';
        });

        userDropdownMenu.addEventListener('click', function(e) {
            e.stopPropagation();
        });
    }

    // Modal Mi Perfil
    const btnDropdownProfile = document.getElementById('btn-dropdown-profile');
    const profileModal = document.getElementById('profile-modal');
    if (btnDropdownProfile && profileModal) {
        btnDropdownProfile.addEventListener('click', function() {
            if (userDropdownMenu) userDropdownMenu.style.display = 'none';
            cargarDatosPerfil();
            profileModal.classList.add('active');
        });
    }

    const btnCloseProfileModal = document.getElementById('btn-close-profile-modal');
    const btnCancelProfileEdit = document.getElementById('btn-cancel-profile-edit');
    if (profileModal) {
        if (btnCloseProfileModal) {
            btnCloseProfileModal.addEventListener('click', () => profileModal.classList.remove('active'));
        }
        if (btnCancelProfileEdit) {
            btnCancelProfileEdit.addEventListener('click', () => profileModal.classList.remove('active'));
        }
    }

    // Modal Cerrar Sesión
    const btnDropdownLogout = document.getElementById('btn-dropdown-logout');
    const logoutConfirmModal = document.getElementById('logout-confirm-modal');
    if (btnDropdownLogout && logoutConfirmModal) {
        btnDropdownLogout.addEventListener('click', function() {
            if (userDropdownMenu) userDropdownMenu.style.display = 'none';
            logoutConfirmModal.classList.add('active');
        });
    }

    const btnCloseLogoutConfirm = document.getElementById('btn-close-logout-confirm-modal');
    const btnCancelLogout = document.getElementById('btn-cancel-logout');
    if (logoutConfirmModal) {
        if (btnCloseLogoutConfirm) {
            btnCloseLogoutConfirm.addEventListener('click', () => logoutConfirmModal.classList.remove('active'));
        }
        if (btnCancelLogout) {
            btnCancelLogout.addEventListener('click', () => logoutConfirmModal.classList.remove('active'));
        }
    }
}

function inicializarEventosUsuarios() {
    if (!document.getElementById('usuarios')) return;

    // CRUD Event Listeners
    const btnNuevoUsuario = document.getElementById('btn-nuevo-usuario');
    if (btnNuevoUsuario) {
        btnNuevoUsuario.addEventListener('click', abrirCrearUsuario);
    }

    const btnCancelUserForm = document.getElementById('btn-cancel-user-form');
    if (btnCancelUserForm) {
        btnCancelUserForm.addEventListener('click', cerrarUserFormModal);
    }

    const btnCloseUserFormModal = document.getElementById('btn-close-user-form-modal');
    if (btnCloseUserFormModal) {
        btnCloseUserFormModal.addEventListener('click', cerrarUserFormModal);
    }

    const btnSaveUser = document.getElementById('btn-save-user');
    if (btnSaveUser) {
        btnSaveUser.addEventListener('click', guardarUsuario);
    }

    const searchInput = document.getElementById('user-search');
    if (searchInput) {
        let debounceTimer;
        searchInput.addEventListener('input', () => {
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(() => {
                filtrarYRenderizarUsuarios();
            }, 300);
        });
    }

    const filterRol = document.getElementById('user-filter-rol');
    if (filterRol) {
        filterRol.addEventListener('change', filtrarYRenderizarUsuarios);
    }

    const filterEstado = document.getElementById('user-filter-estado');
    if (filterEstado) {
        filterEstado.addEventListener('change', filtrarYRenderizarUsuarios);
    }

    const btnCloseUserDeleteModal = document.getElementById('btn-close-user-delete-modal');
    if (btnCloseUserDeleteModal) {
        btnCloseUserDeleteModal.addEventListener('click', cerrarUserDeleteModal);
    }

    const btnCancelUserDelete = document.getElementById('btn-cancel-user-delete');
    if (btnCancelUserDelete) {
        btnCancelUserDelete.addEventListener('click', cerrarUserDeleteModal);
    }

    const btnConfirmUserDelete = document.getElementById('btn-confirm-user-delete');
    if (btnConfirmUserDelete) {
        btnConfirmUserDelete.addEventListener('click', ejecutarEliminarUsuario);
    }
}

async function renderUsuariosTable() {
    const tbody = document.getElementById('usuarios-table-tbody');
    if (!tbody) return;
    
    try {
        const res = await fetch('api/usuarios.php');
        const data = await res.json();
        if (Array.isArray(data)) {
            dbUsuarios = data;
            filtrarYRenderizarUsuarios();
        } else {
            console.error("Error al obtener usuarios:", data.error);
        }
    } catch (err) {
        console.error("Error en fetch usuarios:", err);
    }
}

function filtrarYRenderizarUsuarios() {
    const tbody = document.getElementById('usuarios-table-tbody');
    if (!tbody) return;

    const searchVal = document.getElementById('user-search').value.toLowerCase();
    const filterRol = document.getElementById('user-filter-rol').value;
    const filterEstado = document.getElementById('user-filter-estado').value;

    tbody.innerHTML = '';

    const filtered = dbUsuarios.filter(u => {
        const matchesSearch = u.nombre.toLowerCase().includes(searchVal) || u.correo.toLowerCase().includes(searchVal);
        const matchesRol = filterRol === 'todos' || u.rol === filterRol;
        const matchesEstado = filterEstado === 'todos' || u.activo.toString() === filterEstado;
        return matchesSearch && matchesRol && matchesEstado;
    });

    if (filtered.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; padding: 24px; color: var(--text-secondary); font-style: italic;">No se encontraron usuarios.</td></tr>`;
        return;
    }

    filtered.forEach(u => {
        const tr = document.createElement('tr');
        
        const rolClass = u.rol.toLowerCase(); // administrador, operador, invitado
        const estadoBadge = u.activo === 1 
            ? `<span style="display:inline-flex; align-items:center; gap:4px; padding:2px 8px; border-radius:12px; font-size:11px; font-weight:700; background-color:#DEF7EC; color:#03543F;">🟢 Activo</span>`
            : `<span style="display:inline-flex; align-items:center; gap:4px; padding:2px 8px; border-radius:12px; font-size:11px; font-weight:700; background-color:#FDE8E8; color:#9B1C1C;">🔴 Inactivo</span>`;

        const ultimoAcceso = u.ultimo_acceso ? u.ultimo_acceso : 'Nunca';

        // Action buttons
        const editBtn = `<button class="btn btn-secondary btn-small btn-edit-user" data-id="${u.id}" style="padding: 4px 8px; font-size: 12px; display: inline-flex; align-items: center; gap: 4px;">✏️ Editar</button>`;
        const toggleBtnText = u.activo === 1 ? '🔒 Desactivar' : '🔓 Activar';
        const toggleBtnStyle = u.activo === 1 ? 'color: var(--color-red); border-color: var(--color-red-light);' : 'color: var(--color-green-hover); border-color: var(--color-green-light);';
        const toggleBtn = `<button class="btn btn-secondary btn-small btn-toggle-user" data-id="${u.id}" data-active="${u.activo}" style="padding: 4px 8px; font-size: 12px; display: inline-flex; align-items: center; gap: 4px; ${toggleBtnStyle}">${toggleBtnText}</button>`;
        const deleteBtn = `<button class="btn btn-secondary btn-small btn-delete-user" data-id="${u.id}" style="padding: 4px 8px; font-size: 12px; display: inline-flex; align-items: center; gap: 4px; color: var(--color-red); border-color: var(--color-red-light);">🗑️ Eliminar</button>`;

        tr.innerHTML = `
            <td style="padding: 12px 24px; font-weight: 600; color: var(--text-primary);">${escapeHTML(u.nombre)}</td>
            <td style="padding: 12px 16px; color: var(--text-secondary);">${escapeHTML(u.correo)}</td>
            <td style="padding: 12px 16px; text-align: center;">
                <span class="badge-modulo ${rolClass}">${u.rol}</span>
            </td>
            <td style="padding: 12px 16px; text-align: center;">${estadoBadge}</td>
            <td style="padding: 12px 16px; color: var(--text-secondary);">${ultimoAcceso}</td>
            <td style="padding: 12px 24px; text-align: center; display: flex; gap: 8px; justify-content: center;">
                ${editBtn}
                ${toggleBtn}
                ${deleteBtn}
            </td>
        `;
        tbody.appendChild(tr);
    });

    // Wire up events for buttons in the rendered table
    document.querySelectorAll('.btn-edit-user').forEach(btn => {
        btn.addEventListener('click', function() {
            const userId = parseInt(this.getAttribute('data-id'));
            abrirEditarUsuario(userId);
        });
    });

    document.querySelectorAll('.btn-toggle-user').forEach(btn => {
        btn.addEventListener('click', function() {
            const userId = parseInt(this.getAttribute('data-id'));
            const currentActive = parseInt(this.getAttribute('data-active'));
            const newActive = currentActive === 1 ? 0 : 1;
            toggleEstadoUsuario(userId, newActive);
        });
    });

    document.querySelectorAll('.btn-delete-user').forEach(btn => {
        btn.addEventListener('click', function() {
            const userId = parseInt(this.getAttribute('data-id'));
            iniciarEliminarUsuario(userId);
        });
    });
}

function abrirCrearUsuario() {
    document.getElementById('user-form-title').innerText = 'Crear Nuevo Usuario';
    document.getElementById('form-user-id').value = '';
    document.getElementById('form-user-name').value = '';
    document.getElementById('form-user-email').value = '';
    document.getElementById('form-user-password').value = '';
    document.getElementById('label-user-password').innerText = 'Contraseña *';
    document.getElementById('help-user-password').style.display = 'none';
    document.getElementById('form-user-rol').value = 'INVITADO';
    document.getElementById('form-user-active').value = '1';

    // Show modal
    document.getElementById('user-form-modal').classList.add('active');
}

function abrirEditarUsuario(userId) {
    const user = dbUsuarios.find(u => u.id === userId);
    if (!user) return;

    document.getElementById('user-form-title').innerText = 'Editar Usuario';
    document.getElementById('form-user-id').value = user.id;
    document.getElementById('form-user-name').value = user.nombre;
    document.getElementById('form-user-email').value = user.correo;
    document.getElementById('form-user-password').value = '';
    document.getElementById('label-user-password').innerText = 'Contraseña (Opcional)';
    document.getElementById('help-user-password').style.display = 'block';
    document.getElementById('form-user-rol').value = user.rol;
    document.getElementById('form-user-active').value = user.activo;

    // Show modal
    document.getElementById('user-form-modal').classList.add('active');
}

function cerrarUserFormModal() {
    const modal = document.getElementById('user-form-modal');
    if (modal) modal.classList.remove('active');
}

async function guardarUsuario() {
    const id = document.getElementById('form-user-id').value;
    const nombre = document.getElementById('form-user-name').value.trim();
    const correo = document.getElementById('form-user-email').value.trim();
    const password = document.getElementById('form-user-password').value;
    const rol = document.getElementById('form-user-rol').value;
    const activo = parseInt(document.getElementById('form-user-active').value);

    // Validations
    if (!nombre || !correo || !rol) {
        showToast('Por favor, complete todos los campos obligatorios.', 'warning', 4000, "Campos Incompletos");
        return;
    }

    if (!id && !password) {
        showToast('La contraseña es obligatoria para nuevos usuarios.', 'warning', 4000, "Contraseña Requerida");
        return;
    }

    const payload = {
        nombre,
        correo,
        rol,
        activo
    };

    if (id) {
        payload.id = id;
    }
    if (password) {
        payload.password = password;
    }

    const method = id ? 'PUT' : 'POST';

    try {
        const res = await fetch('api/usuarios.php', {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const result = await res.json();
        if (result.success || res.ok) {
            showToast(result.message || 'Operación realizada con éxito.', 'success', 4000, "Guardado");
            cerrarUserFormModal();
            renderUsuariosTable();
        } else {
            showToast(result.error || 'Error al guardar el usuario.', 'error', 5000, "Error");
        }
    } catch (err) {
        console.error("Error al guardar usuario:", err);
        showToast('Error de red al guardar el usuario.', 'error', 4000, "Error de Red");
    }
}

async function toggleEstadoUsuario(userId, newActive) {
    try {
        const user = dbUsuarios.find(u => u.id === userId);
        if (!user) return;

        const payload = {
            id: userId,
            nombre: user.nombre,
            correo: user.correo,
            rol: user.rol,
            activo: newActive
        };

        const res = await fetch('api/usuarios.php', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const result = await res.json();
        if (result.success || res.ok) {
            showToast(`Usuario ${newActive ? 'activado' : 'desactivado'} correctamente.`, 'success', 4000, "Estado Actualizado");
            renderUsuariosTable();
        } else {
            showToast(result.error || 'Error al actualizar el estado del usuario.', 'error', 5000, "Error");
        }
    } catch (err) {
        console.error("Error al actualizar estado de usuario:", err);
        showToast('Error de red al actualizar el estado.', 'error', 4000, "Error de Red");
    }
}

window.iniciarEliminarUsuario = function(userId) {
    const currentUserId = parseInt(document.body.getAttribute('data-user-id'));
    if (userId === currentUserId) {
        showToast("No puede eliminar su propia cuenta mientras está conectado.", "error", 4000);
        return;
    }

    const userToDelete = dbUsuarios.find(u => u.id === userId);
    if (userToDelete && userToDelete.rol === 'ADMINISTRADOR' && userToDelete.activo === 1) {
        const activeAdmins = dbUsuarios.filter(u => u.rol === 'ADMINISTRADOR' && u.activo === 1);
        if (activeAdmins.length <= 1) {
            showToast("Debe existir al menos un administrador activo en el sistema.", "error", 4000);
            return;
        }
    }

    pendingDeleteUserId = userId;
    const deleteConfirmModal = document.getElementById('user-delete-confirm-modal');
    if (deleteConfirmModal) {
        deleteConfirmModal.classList.add('active');
    }
};

function cerrarUserDeleteModal() {
    const deleteConfirmModal = document.getElementById('user-delete-confirm-modal');
    if (deleteConfirmModal) {
        deleteConfirmModal.classList.remove('active');
    }
    pendingDeleteUserId = null;
}

async function ejecutarEliminarUsuario() {
    if (!pendingDeleteUserId) return;

    try {
        const res = await fetch(`api/usuarios.php?id=${pendingDeleteUserId}`, {
            method: 'DELETE'
        });
        const result = await res.json();
        if (result.success || res.ok) {
            showToast(result.message || "Usuario eliminado correctamente.", 'success', 4000);
            renderUsuariosTable();
        } else {
            showToast(result.error || 'Error al eliminar el usuario.', 'error', 5000, "Error");
        }
    } catch (err) {
        console.error("Error al eliminar usuario:", err);
        showToast('Error de red al eliminar the usuario.', 'error', 4000, "Error de Red");
    }

    cerrarUserDeleteModal();
}

// --- 13. MÓDULO MI PERFIL (INTERACTIVO) ---

async function cargarDatosPerfil() {
    try {
        const res = await fetch('api/perfil.php');
        const result = await res.json();
        if (result.success) {
            const user = result.user;
            document.getElementById('profile-name').value = user.nombre;
            document.getElementById('profile-email').value = user.correo;
            
            const rolSpan = document.getElementById('profile-meta-rol');
            rolSpan.innerText = user.rol;
            rolSpan.className = 'badge-modulo ' + user.rol.toLowerCase();
            
            const statusSpan = document.getElementById('profile-meta-status');
            statusSpan.innerText = user.activo === 1 ? '🟢 Activa' : '🔴 Inactiva';
            statusSpan.style.color = user.activo === 1 ? 'var(--color-green)' : 'var(--color-red)';
            
            document.getElementById('profile-meta-fecha-registro').innerText = user.fecha_registro;
            document.getElementById('profile-meta-ultimo-acceso').innerText = user.ultimo_acceso || 'Nunca';

            const img = document.getElementById('profile-avatar-img');
            const initials = document.getElementById('profile-avatar-initials');
            const deleteBtn = document.getElementById('btn-profile-delete-photo');

            if (user.foto_perfil) {
                img.src = user.foto_perfil;
                img.style.display = 'block';
                initials.style.display = 'none';
                if (deleteBtn) deleteBtn.style.display = 'inline-block';
            } else {
                img.src = '';
                img.style.display = 'none';
                initials.style.display = 'flex';
                
                // Calcular iniciales
                const words = user.nombre.split(" ");
                let inits = "";
                words.forEach(w => {
                    if (w[0]) inits += w[0].toUpperCase();
                });
                initials.innerText = inits.substring(0, 2) || 'U';
                if (deleteBtn) deleteBtn.style.display = 'none';
            }

            // Limpiar formulario de clave
            document.getElementById('profile-pass-current').value = '';
            document.getElementById('profile-pass-new').value = '';
            document.getElementById('profile-pass-confirm').value = '';
            
            // Restablecer indicador de fortaleza
            document.getElementById('profile-pass-strength-label').innerText = 'No ingresada';
            document.getElementById('profile-pass-strength-label').style.color = 'var(--text-light)';
            document.getElementById('strength-bar-1').style.backgroundColor = '';
            document.getElementById('strength-bar-2').style.backgroundColor = '';
            document.getElementById('strength-bar-3').style.backgroundColor = '';

            // Limpiar file input
            document.getElementById('profile-file-input').value = '';
        } else {
            showToast("Error al cargar perfil: " + result.error, 'error', 4000);
        }
    } catch (err) {
        console.error(err);
        showToast("Error de red al cargar el perfil.", 'error', 4000);
    }
}

// Inicializar eventos de Perfil cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    inicializarEventosMiPerfil();
});

function inicializarEventosMiPerfil() {
    const avatarContainer = document.getElementById('profile-avatar-container');
    const avatarOverlay = document.getElementById('profile-avatar-overlay');
    const fileInput = document.getElementById('profile-file-input');
    const uploadTrigger = document.getElementById('btn-profile-upload-trigger');
    const deletePhotoBtn = document.getElementById('btn-profile-delete-photo');
    const passNewInput = document.getElementById('profile-pass-new');
    const btnSaveProfile = document.getElementById('btn-save-profile');

    // Hover sobre el avatar
    if (avatarContainer && avatarOverlay) {
        avatarContainer.addEventListener('mouseenter', () => avatarOverlay.style.opacity = '1');
        avatarContainer.addEventListener('mouseleave', () => avatarOverlay.style.opacity = '0');
        avatarContainer.addEventListener('click', () => fileInput.click());
    }

    if (uploadTrigger && fileInput) {
        uploadTrigger.addEventListener('click', () => fileInput.click());
    }

    // Previsualización de imagen elegida
    if (fileInput) {
        fileInput.addEventListener('change', function() {
            if (this.files && this.files[0]) {
                const file = this.files[0];
                
                // Validar tamaño (máximo 2 MB)
                if (file.size > 2 * 1024 * 1024) {
                    showToast("La imagen supera el límite de 2 MB.", "error", 4000);
                    this.value = '';
                    return;
                }

                // Validar tipo MIME
                const allowedMimes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
                if (!allowedMimes.includes(file.type)) {
                    showToast("Formato no permitido. Solo se aceptan JPG, JPEG, PNG y WEBP.", "error", 4000);
                    this.value = '';
                    return;
                }

                const reader = new FileReader();
                reader.onload = function(e) {
                    const img = document.getElementById('profile-avatar-img');
                    const initials = document.getElementById('profile-avatar-initials');
                    const deleteBtn = document.getElementById('btn-profile-delete-photo');

                    img.src = e.target.result;
                    img.style.display = 'block';
                    initials.style.display = 'none';
                    if (deleteBtn) deleteBtn.style.display = 'inline-block';
                };
                reader.readAsDataURL(file);
            }
        });
    }

    // Eliminar foto de perfil
    if (deletePhotoBtn) {
        deletePhotoBtn.addEventListener('click', async function() {
            if (!confirm("⚠ ¿Está seguro de eliminar permanentemente su foto de perfil?")) return;

            try {
                const res = await fetch('api/perfil.php?action=delete_photo', {
                    method: 'POST'
                });
                const result = await res.json();
                if (result.success) {
                    showToast("Foto de perfil eliminada.", "success", 4000);
                    cargarDatosPerfil();

                    // Actualizar avatares en cabecera/sidebar
                    actualizarAvataresEnPagina(null);
                } else {
                    showToast("Error al eliminar foto: " + result.error, "error", 4000);
                }
            } catch (err) {
                console.error(err);
                showToast("Error de red al eliminar foto.", "error", 4000);
            }
        });
    }

    // Mostrar/ocultar contraseñas
    document.querySelectorAll('.toggle-password-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const inputId = this.getAttribute('data-input-id');
            const input = document.getElementById(inputId);
            if (input) {
                if (input.type === 'password') {
                    input.type = 'text';
                    this.innerText = '🙈';
                } else {
                    input.type = 'password';
                    this.innerText = '👁️';
                }
            }
        });
    });

    // Indicador de fortaleza en tiempo real
    if (passNewInput) {
        passNewInput.addEventListener('input', function() {
            const pass = this.value;
            const label = document.getElementById('profile-pass-strength-label');
            const bar1 = document.getElementById('strength-bar-1');
            const bar2 = document.getElementById('strength-bar-2');
            const bar3 = document.getElementById('strength-bar-3');

            if (pass.length === 0) {
                label.innerText = 'No ingresada';
                label.style.color = 'var(--text-light)';
                bar1.style.backgroundColor = '';
                bar2.style.backgroundColor = '';
                bar3.style.backgroundColor = '';
                return;
            }

            // Criterio de validación
            const hasUpper = /[A-Z]/.test(pass);
            const hasLower = /[a-z]/.test(pass);
            const hasNum = /[0-9]/.test(pass);
            const meetsBasic = pass.length >= 8 && hasUpper && hasLower && hasNum;

            if (!meetsBasic) {
                label.innerText = 'Débil';
                label.style.color = 'var(--color-red)';
                bar1.style.backgroundColor = 'var(--color-red)';
                bar2.style.backgroundColor = '';
                bar3.style.backgroundColor = '';
            } else {
                const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(pass);
                const isStrong = pass.length >= 10 && hasSpecial;

                if (isStrong) {
                    label.innerText = 'Fuerte';
                    label.style.color = 'var(--color-green)';
                    bar1.style.backgroundColor = 'var(--color-green)';
                    bar2.style.backgroundColor = 'var(--color-green)';
                    bar3.style.backgroundColor = 'var(--color-green)';
                } else {
                    label.innerText = 'Media';
                    label.style.color = 'var(--color-yellow)';
                    bar1.style.backgroundColor = 'var(--color-yellow)';
                    bar2.style.backgroundColor = 'var(--color-yellow)';
                    bar3.style.backgroundColor = '';
                }
            }
        });
    }

    // Guardar cambios generales e/o contraseña
    if (btnSaveProfile) {
        btnSaveProfile.addEventListener('click', async function() {
            const nombre = document.getElementById('profile-name').value.trim();
            const correo = document.getElementById('profile-email').value.trim();
            const fileInput = document.getElementById('profile-file-input');

            // Validar perfil general
            if (!nombre) {
                showToast("El nombre completo es obligatorio.", "error", 4000);
                return;
            }
            if (nombre.length > 100) {
                showToast("El nombre no puede exceder los 100 caracteres.", "error", 4000);
                return;
            }
            if (!correo || !correo.includes('@')) {
                showToast("El correo electrónico no es válido.", "error", 4000);
                return;
            }

            // Cambiar contraseña?
            const curPass = document.getElementById('profile-pass-current').value;
            const newPass = document.getElementById('profile-pass-new').value;
            const confPass = document.getElementById('profile-pass-confirm').value;
            const cambiarClave = curPass.length > 0 || newPass.length > 0 || confPass.length > 0;

            if (cambiarClave) {
                if (!curPass) {
                    showToast("Debe ingresar su contraseña actual.", "error", 4000);
                    return;
                }
                if (newPass.length < 8) {
                    showToast("La nueva contraseña debe tener al menos 8 caracteres.", "error", 4000);
                    return;
                }
                const hasUpper = /[A-Z]/.test(newPass);
                const hasLower = /[a-z]/.test(newPass);
                const hasNum = /[0-9]/.test(newPass);
                if (!hasUpper || !hasLower || !hasNum) {
                    showToast("La nueva contraseña debe contener: 1 mayúscula, 1 minúscula y 1 número.", "error", 4000);
                    return;
                }
                if (newPass !== confPass) {
                    showToast("La confirmación de contraseña no coincide.", "error", 4000);
                    return;
                }
            }

            // Deshabilitar botón temporalmente para prevenir doble clic
            const origHtml = btnSaveProfile.innerHTML;
            btnSaveProfile.disabled = true;
            btnSaveProfile.innerHTML = '⚡ Guardando...';

            try {
                // 1. Guardar Datos Generales y Foto
                const formData = new FormData();
                formData.append('nombre', nombre);
                formData.append('correo', correo);
                if (fileInput.files && fileInput.files[0]) {
                    formData.append('foto_perfil', fileInput.files[0]);
                }

                const resProfile = await fetch('api/perfil.php?action=update_profile', {
                    method: 'POST',
                    body: formData
                });
                const resultProfile = await resProfile.json();

                if (!resultProfile.success) {
                    showToast("Error al guardar datos: " + resultProfile.error, "error", 5000);
                    btnSaveProfile.disabled = false;
                    btnSaveProfile.innerHTML = origHtml;
                    return;
                }

                // 2. Si se solicitó, guardar contraseña
                if (cambiarClave) {
                    const resPass = await fetch('api/perfil.php?action=update_password', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            current_password: curPass,
                            new_password: newPass,
                            confirm_password: confPass
                        })
                    });
                    const resultPass = await resPass.json();
                    if (!resultPass.success) {
                        showToast("Datos de perfil guardados, pero falló el cambio de clave: " + resultPass.error, "warning", 6000);
                        btnSaveProfile.disabled = false;
                        btnSaveProfile.innerHTML = origHtml;
                        
                        // Actualizar avatares igualmente
                        actualizarAvataresEnPagina(resultProfile.foto_perfil, nombre);
                        return;
                    }
                    showToast("✓ Contraseña actualizada correctamente.", "success", 4000);
                }

                showToast("✓ Perfil actualizado correctamente.", "success", 4000);
                
                // Actualizar avatares y nombre en cabecera/sidebar
                actualizarAvataresEnPagina(resultProfile.foto_perfil, nombre);

                // Cerrar modal
                document.getElementById('profile-modal').classList.remove('active');

            } catch (err) {
                console.error(err);
                showToast("Error de red al guardar los cambios.", "error", 4000);
            } finally {
                btnSaveProfile.disabled = false;
                btnSaveProfile.innerHTML = origHtml;
            }
        });
    }
}

function actualizarAvataresEnPagina(fotoPath, nuevoNombre = null) {
    const sidebarAvatar = document.getElementById('sidebar-user-avatar');
    const topbarAvatar = document.getElementById('topbar-user-avatar');
    const sidebarName = document.querySelector('.sidebar-footer .user-name');
    const topbarName = document.querySelector('.topbar-user-btn .user-name-top');
    const profileTopName = document.querySelector('.profile-top-name'); // si hubiera

    if (nuevoNombre) {
        if (sidebarName) sidebarName.innerText = nuevoNombre;
        if (topbarName) topbarName.innerText = nuevoNombre;
        if (profileTopName) profileTopName.innerText = nuevoNombre;
    }

    // Calcular nuevas iniciales
    const nameToUse = nuevoNombre || (sidebarName ? sidebarName.innerText : 'Invitado');
    const words = nameToUse.split(" ");
    let inits = "";
    words.forEach(w => {
        if (w[0]) inits += w[0].toUpperCase();
    });
    const iniciales = inits.substring(0, 2) || 'U';

    const renderAvatar = (avatarEl) => {
        if (!avatarEl) return;
        if (fotoPath) {
            avatarEl.innerHTML = `<img src="${fotoPath}" alt="Avatar" style="width:100%; height:100%; object-fit:cover; border-radius:50%;">`;
        } else {
            avatarEl.innerHTML = iniciales;
        }
    };

    renderAvatar(sidebarAvatar);
    renderAvatar(topbarAvatar);
}
