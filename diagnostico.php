<?php
// diagnostico.php - Script de diagnóstico para el Semáforo Hídrico Cusco
require_once __DIR__ . '/config/database.php';

try {
    $pdo = getDatabaseConnection();
} catch (Exception $e) {
    die("Error al conectar a la base de datos: " . $e->getMessage());
}

// 1. Obtener totales de la base de datos
$countViviendas = (int)$pdo->query("SELECT COUNT(*) FROM viviendas")->fetchColumn();
$countAnalisis = (int)$pdo->query("SELECT COUNT(*) FROM analisis")->fetchColumn();
$countAlertasActivas = (int)$pdo->query("SELECT COUNT(*) FROM alertas WHERE estado = 'ACTIVA'")->fetchColumn();

// 2. Desglose de estados en viviendas
$breakdownViviendas = [];
$stmt = $pdo->query("SELECT estado_actual, COUNT(*) as qty FROM viviendas GROUP BY estado_actual");
while ($row = $stmt->fetch()) {
    $breakdownViviendas[$row['estado_actual']] = (int)$row['qty'];
}
$vVerdes = $breakdownViviendas['APTA'] ?? 0;
$vAmarillas = $breakdownViviendas['OBSERVACION'] ?? 0;
$vRojas = $breakdownViviendas['CRITICA'] ?? 0;
$vGris = $breakdownViviendas['SIN_EVALUAR'] ?? 0;

// 3. Desglose de alertas activas
$breakdownAlertas = [];
$stmtAl = $pdo->query("SELECT tipo, COUNT(*) as qty FROM alertas WHERE estado = 'ACTIVA' GROUP BY tipo");
while ($row = $stmtAl->fetch()) {
    $breakdownAlertas[$row['tipo']] = (int)$row['qty'];
}
$aCriticas = $breakdownAlertas['CRITICA'] ?? 0;
$aPreventivas = $breakdownAlertas['PREVENTIVA'] ?? 0;
$aInformativas = $breakdownAlertas['INFORMATIVA'] ?? 0;

// 4. Verificación de consistencias / huérfanos
$orphanedAlerts = (int)$pdo->query("SELECT COUNT(*) FROM alertas WHERE analisis_id NOT IN (SELECT id FROM analisis)")->fetchColumn();
$orphanedAnalisis = (int)$pdo->query("SELECT COUNT(*) FROM analisis WHERE vivienda_id NOT IN (SELECT id FROM viviendas)")->fetchColumn();

$status = "OK";
$inconsistencias = [];
if ($orphanedAlerts > 0) {
    $status = "INCONSISTENTE";
    $inconsistencias[] = "Existen {$orphanedAlerts} alertas huérfanas (sin análisis asociado).";
}
if ($orphanedAnalisis > 0) {
    $status = "INCONSISTENTE";
    $inconsistencias[] = "Existen {$orphanedAnalisis} análisis huérfanos (sin vivienda asociada).";
}

$sumViviendas = $vVerdes + $vAmarillas + $vRojas + $vGris;
if ($sumViviendas !== $countViviendas) {
    $status = "INCONSISTENTE";
    $inconsistencias[] = "La suma de los estados de viviendas ({$sumViviendas}) no coincide con el total de viviendas ({$countViviendas}).";
}

// 4b. Leer index.php para buscar inconsistencias estáticas de template HTML (e.g. Dashboard/Mapa que muestren "24")
$htmlPath = __DIR__ . '/index.php';
if (file_exists($htmlPath)) {
    $htmlContent = file_get_contents($htmlPath);
    
    // Si el template contiene un número estático que descalza con MySQL, lo reportamos.
    // Ignoramos marcadores de carga dinámicos como "--".
    $mismatch = [];
    
    if (preg_match('/id="metric-total"[^>]*>([^<]+)/', $htmlContent, $matches)) {
        $val = trim($matches[1]);
        if (ctype_digit($val) && (int)$val !== $countViviendas) {
            $mismatch[] = "Dashboard ({$val})";
        }
    }
    if (preg_match('/id="map-kpi-total"[^>]*>([^<]+)/', $htmlContent, $matches)) {
        $val = trim($matches[1]);
        if (ctype_digit($val) && (int)$val !== $countViviendas) {
            $mismatch[] = "Mapa KPI ({$val})";
        }
    }
    if (preg_match('/id="map-premium-cnt-all"[^>]*>([^<]+)/', $htmlContent, $matches)) {
        $val = trim($matches[1]);
        if (ctype_digit($val) && (int)$val !== $countViviendas) {
            $mismatch[] = "Mapa Sidebar ({$val})";
        }
    }
    if (preg_match('/id="report-viviendas-count-label"[^>]*>Detalle de las ([^ ]+) Viviendas/', $htmlContent, $matches)) {
        $val = trim($matches[1]);
        if (ctype_digit($val) && (int)$val !== $countViviendas) {
            $mismatch[] = "Admin Header ({$val})";
        }
    }
    
    if (!empty($mismatch)) {
        $status = "INCONSISTENTE";
        $inconsistencias[] = "ERROR DE SINCRONIZACIÓN ENTRE MÓDULOS: El marcado estático en index.php difiere del conteo real de MySQL ({$countViviendas}) en: " . implode(', ', $mismatch) . ".";
    }
}

// 5. Determinar salida (CLI o Web)
$isCli = (php_sapi_name() === 'cli');

if ($isCli) {
    // Salida por consola
    echo "====================================================\n";
    echo " REPORTE DE DIAGNÓSTICO - SEMÁFORO HÍDRICO CUSCO\n";
    echo "====================================================\n";
    echo "Estado del Sistema: " . ($status === 'OK' ? "SINCRO OK (100% MySQL)" : "ERROR: INCONSISTENCIA DETECTADA") . "\n";
    echo "----------------------------------------------------\n";
    echo "Conexión a Base de Datos:\n";
    echo "  - Origen: " . (DB_USING_URL ? "Railway URL (" . DB_URL_VAR . ")" : "Local Fallback") . "\n";
    echo "  - Host: " . DB_HOST . "\n";
    echo "  - Puerto: " . DB_PORT . "\n";
    echo "  - Base de Datos: " . DB_NAME . "\n";
    echo "  - Usuario: " . DB_USER . "\n";
    echo "----------------------------------------------------\n";
    echo "Totales en MySQL:\n";
    echo "  - Total de Viviendas: {$countViviendas}\n";
    echo "  - Total de Mediciones: {$countAnalisis}\n";
    echo "  - Total de Alertas Activas: {$countAlertasActivas}\n";
    echo "----------------------------------------------------\n";
    echo "Desglose por Calidad de Agua (Viviendas):\n";
    echo "  - Apto (Verde): {$vVerdes}\n";
    echo "  - Observación (Amarillo): {$vAmarillas}\n";
    echo "  - Crítico (Rojo): {$vRojas}\n";
    echo "  - Sin evaluar (Gris): {$vGris}\n";
    echo "----------------------------------------------------\n";
    echo "Desglose de Alertas Activas:\n";
    echo "  - Críticas: {$aCriticas}\n";
    echo "  - Preventivas: {$aPreventivas}\n";
    echo "  - Informativas: {$aInformativas}\n";
    echo "----------------------------------------------------\n";
    if (!empty($inconsistencias)) {
        echo "Inconsistencias Reportadas:\n";
        foreach ($inconsistencias as $inc) {
            echo "  [ALERTA] {$inc}\n";
        }
    } else {
        echo "Verificación: Todo el sistema utiliza únicamente MySQL como fuente de verdad.\n";
    }
    echo "====================================================\n";
} else {
    // Salida por Navegador (HTML elegante con estilos)
    if (isset($_GET['json'])) {
        header('Content-Type: application/json; charset=utf-8');
        echo json_encode([
            'status' => $status,
            'db_connection' => [
                'using_url' => DB_USING_URL,
                'url_var' => DB_URL_VAR,
                'host' => DB_HOST,
                'port' => DB_PORT,
                'dbname' => DB_NAME,
                'user' => DB_USER
            ],
            'totales' => [
                'viviendas' => $countViviendas,
                'mediciones' => $countAnalisis,
                'alertas_activas' => $countAlertasActivas
            ],
            'desglose_viviendas' => [
                'verde' => $vVerdes,
                'amarillo' => $vAmarillas,
                'rojo' => $vRojas,
                'gris' => $vGris
            ],
            'desglose_alertas' => [
                'criticas' => $aCriticas,
                'preventivas' => $aPreventivas,
                'informativas' => $aInformativas
            ],
            'inconsistencias' => $inconsistencias
        ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
        exit;
    }
    
    // HTML
    ?>
    <!DOCTYPE html>
    <html lang="es">
    <head>
        <meta charset="UTF-8">
        <title>Diagnóstico - Semáforo Hídrico Cusco</title>
        <style>
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #F8FAFC; color: #1E293B; margin: 0; padding: 40px; }
            .container { max-width: 800px; margin: 0 auto; background: #FFFFFF; border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.08); padding: 30px; border: 1px solid #E2E8F0; }
            h1 { color: #2563EB; font-size: 24px; margin-bottom: 20px; border-bottom: 2px solid #F1F5F9; padding-bottom: 10px; }
            .status-badge { display: inline-block; padding: 6px 12px; border-radius: 20px; font-weight: 700; font-size: 14px; text-transform: uppercase; margin-bottom: 20px; }
            .status-badge.ok { background-color: #DCFCE7; color: #15803D; }
            .status-badge.error { background-color: #FEE2E2; color: #B91C1C; }
            .grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin-bottom: 30px; }
            .card { background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 8px; padding: 20px; text-align: center; }
            .card .number { font-size: 32px; font-weight: 800; color: #1E293B; }
            .card .label { font-size: 12px; color: #64748B; text-transform: uppercase; font-weight: 600; margin-top: 4px; }
            h2 { font-size: 18px; color: #475569; margin-top: 20px; margin-bottom: 12px; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
            th, td { text-align: left; padding: 10px 12px; border-bottom: 1px solid #E2E8F0; }
            th { background-color: #F8FAFC; color: #475569; }
            .inc-list { background-color: #FFF5F5; border-left: 4px solid #EF4444; padding: 15px; border-radius: 4px; margin-bottom: 20px; }
            .inc-list p { margin: 0 0 8px 0; color: #C53030; font-size: 14px; }
            .footer { font-size: 11px; color: #94A3B8; text-align: center; margin-top: 40px; border-top: 1px solid #F1F5F9; padding-top: 15px; }
        </style>
    </head>
    <body>
        <div class="container">
            <h1>Diagnóstico - Semáforo Hídrico Cusco</h1>
            
            <div class="status-badge <?php echo $status === 'OK' ? 'ok' : 'error'; ?>">
                <?php echo $status === 'OK' ? '✓ Sistema Sincronizado (100% MySQL)' : '✗ Inconsistencia Detectada'; ?>
            </div>
            
            <?php if (!empty($inconsistencias)): ?>
                <div class="inc-list">
                    <strong>Alertas de Inconsistencia:</strong>
                    <?php foreach ($inconsistencias as $inc): ?>
                        <p>• <?php echo htmlspecialchars($inc); ?></p>
                    <?php endforeach; ?>
                </div>
            <?php endif; ?>
            
            <div class="grid">
                <div class="card">
                    <div class="number"><?php echo $countViviendas; ?></div>
                    <div class="label">Viviendas en DB</div>
                </div>
                <div class="card">
                    <div class="number"><?php echo $countAnalisis; ?></div>
                    <div class="label">Mediciones</div>
                </div>
                <div class="card">
                    <div class="number"><?php echo $countAlertasActivas; ?></div>
                    <div class="label">Alertas Activas</div>
                </div>
            </div>

            <h2>Estado de Conexión a Base de Datos</h2>
            <table>
                <tr>
                    <th>Parámetro</th>
                    <th>Valor</th>
                </tr>
                <tr>
                    <td>Origen de Configuración</td>
                    <td><strong><?php echo DB_USING_URL ? 'Railway URL (' . htmlspecialchars(DB_URL_VAR) . ')' : 'Configuración Local (Fallback)'; ?></strong></td>
                </tr>
                <tr>
                    <td>Host de Base de Datos</td>
                    <td><?php echo htmlspecialchars(DB_HOST); ?></td>
                </tr>
                <tr>
                    <td>Puerto</td>
                    <td><?php echo htmlspecialchars(DB_PORT); ?></td>
                </tr>
                <tr>
                    <td>Nombre de Base de Datos</td>
                    <td><?php echo htmlspecialchars(DB_NAME); ?></td>
                </tr>
                <tr>
                    <td>Usuario</td>
                    <td><?php echo htmlspecialchars(DB_USER); ?></td>
                </tr>
            </table>
            
            <h2>Desglose de Calidad de Viviendas</h2>
            <table>
                <tr>
                    <th>Estado</th>
                    <th>Color</th>
                    <th>Cantidad</th>
                </tr>
                <tr>
                    <td>Apto</td>
                    <td style="color:#22C55E; font-weight:bold;">🟢 Verde</td>
                    <td><?php echo $vVerdes; ?></td>
                </tr>
                <tr>
                    <td>Observación</td>
                    <td style="color:#F59E0B; font-weight:bold;">🟡 Amarillo</td>
                    <td><?php echo $vAmarillas; ?></td>
                </tr>
                <tr>
                    <td>Riesgo Crítico</td>
                    <td style="color:#EF4444; font-weight:bold;">🔴 Rojo</td>
                    <td><?php echo $vRojas; ?></td>
                </tr>
                <tr>
                    <td>Sin Evaluar</td>
                    <td style="color:#64748B; font-weight:bold;">⚪ Gris</td>
                    <td><?php echo $vGris; ?></td>
                </tr>
            </table>

            <h2>Desglose de Alertas Activas</h2>
            <table>
                <tr>
                    <th>Severidad</th>
                    <th>Cantidad</th>
                </tr>
                <tr>
                    <td style="color:#EF4444; font-weight:bold;">Críticas</td>
                    <td><?php echo $aCriticas; ?></td>
                </tr>
                <tr>
                    <td style="color:#F59E0B; font-weight:bold;">Preventivas</td>
                    <td><?php echo $aPreventivas; ?></td>
                </tr>
                <tr>
                    <td style="color:#22C55E; font-weight:bold;">Informativas</td>
                    <td><?php echo $aInformativas; ?></td>
                </tr>
            </table>
            
            <div class="footer">
                Semáforo Hídrico Cusco © 2026 - Conexión de base de datos MySQL activa
            </div>
        </div>
    </body>
    </html>
    <?php
}
