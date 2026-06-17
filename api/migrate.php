<?php
header('Content-Type: application/json; charset=utf-8');
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

require_once __DIR__ . '/../config/database.php';

validarAccesoAPI(['ADMINISTRADOR', 'OPERADOR']);

$pdo = getDatabaseConnection();

$input = json_decode(file_get_contents('php://input'), true);

if (!$input) {
    echo json_encode(['error' => 'No payload received'], JSON_UNESCAPED_UNICODE);
    exit;
}

try {
    $pdo->beginTransaction();

    $viviendasMigrated = 0;
    $analisisMigrated = 0;
    $alertasMigrated = 0;
    $actividadesMigrated = 0;

    // 1. Mapeo de viviendas en LocalStorage a DB
    // La clave en LocalStorage para cada vivienda es id, nombre (propietario), direccion, latitud, longitud, etc.
    $viviendasList = $input['viviendas'] ?? [];
    $viviendaCodeToIdMap = []; // Guardará el mapeo de "V-01" -> ID entero en DB

    foreach ($viviendasList as $viv) {
        $codigo = $viv['id'] ?? '';
        if (empty($codigo)) continue;

        $propietario = $viv['nombre'] ?? 'Sin Propietario';
        $direccion = $viv['direccion'] ?? 'Sin Dirección';
        $sector = $viv['sector'] ?? 'Sector Viva el Perú';
        $telefono = $viv['telefono'] ?? '';
        $lat = $viv['latitud'] ?? 0.0;
        $lng = $viv['longitud'] ?? 0.0;
        $estado = feToDbEstado($viv['estado'] ?? 'gris');

        // Verificar si la vivienda ya existe por su código
        $stmt = $pdo->prepare("SELECT id FROM viviendas WHERE codigo = ?");
        $stmt->execute([$codigo]);
        $row = $stmt->fetch();

        if ($row) {
            $viviendaDbId = $row['id'];
            // Actualizar si ya existe para asegurar consistencia
            $updateStmt = $pdo->prepare("UPDATE viviendas SET propietario = ?, direccion = ?, sector = ?, telefono = ?, latitud = ?, longitud = ?, estado_actual = ? WHERE id = ?");
            $updateStmt->execute([$propietario, $direccion, $sector, $telefono, $lat, $lng, $estado, $viviendaDbId]);
        } else {
            // Insertar vivienda
            $insertStmt = $pdo->prepare("INSERT INTO viviendas (codigo, propietario, direccion, sector, telefono, latitud, longitud, estado_actual) VALUES (?, ?, ?, ?, ?, ?, ?, ?)");
            $insertStmt->execute([$codigo, $propietario, $direccion, $sector, $telefono, $lat, $lng, $estado]);
            $viviendaDbId = $pdo->lastInsertId();
            $viviendasMigrated++;
        }

        $viviendaCodeToIdMap[$codigo] = $viviendaDbId;
    }

    // 2. Mapeo de Historial (Análisis) en LocalStorage a DB
    $historialList = $input['historial'] ?? [];
    $analysisKeyToDbIdMap = []; // Mapeo de clave (viviendaId + fecha) -> ID de análisis en DB

    foreach ($historialList as $hist) {
        $fecha = $hist['fecha'] ?? '';
        $viviendaCode = $hist['viviendaId'] ?? '';
        $ph = $hist['ph'] ?? 7.0;
        $cloro = $hist['cloro'] ?? 0.0;
        $estado = feToDbEstado($hist['estado'] ?? 'verde');
        $observaciones = $hist['observaciones'] ?? '';
        $responsable = $hist['responsable'] ?? 'Ninguno';

        if (empty($fecha) || empty($viviendaCode)) continue;

        // Obtener el ID de la vivienda
        $viviendaDbId = $viviendaCodeToIdMap[$viviendaCode] ?? null;
        if (!$viviendaDbId) {
            // Buscar en DB si no estaba en la carga actual
            $stmt = $pdo->prepare("SELECT id FROM viviendas WHERE codigo = ?");
            $stmt->execute([$viviendaCode]);
            $row = $stmt->fetch();
            if ($row) {
                $viviendaDbId = $row['id'];
                $viviendaCodeToIdMap[$viviendaCode] = $viviendaDbId;
            } else {
                continue; // No existe la vivienda asociada, ignorar
            }
        }

        // Obtener o crear el usuario brigadista por el nombre
        $stmtUser = $pdo->prepare("SELECT id FROM usuarios WHERE nombre = ?");
        $stmtUser->execute([$responsable]);
        $userRow = $stmtUser->fetch();
        if ($userRow) {
            $usuarioDbId = $userRow['id'];
        } else {
            // Crear usuario temporal
            $correoSimulado = strtolower(str_replace(' ', '.', $responsable)) . '@gmail.com';
            // Evitar colisión de correos
            $correoCheck = $pdo->prepare("SELECT id FROM usuarios WHERE correo = ?");
            $correoCheck->execute([$correoSimulado]);
            if ($correoCheck->fetch()) {
                $correoSimulado = strtolower(str_replace(' ', '.', $responsable)) . '_' . rand(100, 999) . '@gmail.com';
            }

            $insertUser = $pdo->prepare("INSERT INTO usuarios (nombre, correo, password, rol) VALUES (?, ?, ?, 'OPERADOR')");
            $insertUser->execute([$responsable, $correoSimulado, password_hash('brigadista123', PASSWORD_BCRYPT)]);
            $usuarioDbId = $pdo->lastInsertId();
        }

        // Verificar si el análisis ya existe (por vivienda y fecha exacta)
        $stmtCheckAnalisis = $pdo->prepare("SELECT id FROM analisis WHERE vivienda_id = ? AND fecha = ?");
        $stmtCheckAnalisis->execute([$viviendaDbId, $fecha]);
        $analisisRow = $stmtCheckAnalisis->fetch();

        if ($analisisRow) {
            $analisisDbId = $analisisRow['id'];
            // Actualizar
            $updateAnalisis = $pdo->prepare("UPDATE analisis SET usuario_id = ?, ph = ?, cloro = ?, estado = ?, observaciones = ? WHERE id = ?");
            $updateAnalisis->execute([$usuarioDbId, $ph, $cloro, $estado, $observaciones, $analisisDbId]);
        } else {
            // Insertar
            $insertAnalisis = $pdo->prepare("INSERT INTO analisis (vivienda_id, usuario_id, fecha, ph, cloro, estado, observaciones) VALUES (?, ?, ?, ?, ?, ?, ?)");
            $insertAnalisis->execute([$viviendaDbId, $usuarioDbId, $fecha, $ph, $cloro, $estado, $observaciones]);
            $analisisDbId = $pdo->lastInsertId();
            $analisisMigrated++;
        }

        // Guardar mapeo para asociar alertas posteriormente
        // Usamos como clave el código vivienda + fecha
        $analysisKeyToDbIdMap[$viviendaCode . '_' . $fecha] = $analisisDbId;
    }

    // 3. Mapeo de Alertas en LocalStorage a DB
    $alertasList = $input['alertas'] ?? [];
    foreach ($alertasList as $al) {
        $viviendaCode = $al['viviendaId'] ?? '';
        $fecha = $al['fecha'] ?? ''; // La fecha de la alerta
        $tipo = feToDbAlertaTipo($al['tipo'] ?? 'informativa');
        $mensaje = $al['descripcion'] ?? '';
        $activo = isset($al['activo']) ? $al['activo'] : true;
        $estadoAlerta = $activo ? 'ACTIVA' : 'RESUELTA';

        if (empty($viviendaCode)) continue;

        // Intentamos buscar el análisis asociado a esta vivienda
        // Si la alerta contiene una fecha de muestreo aproximada, la enlazamos.
        // Si no se encuentra un análisis específico, buscamos el último de esa vivienda.
        $analisisDbId = null;
        
        // Intentar enlazar con la fecha de la alerta (las fechas de alertas suelen coincidir con las del análisis)
        // en alertas la fecha a veces tiene segundos o la hora. Limpiamos la fecha.
        $fechaBase = substr($fecha, 0, 16); // YYYY-MM-DD HH:MM
        
        // Buscar coincidencia exacta de vivienda e ID de análisis
        $viviendaDbId = $viviendaCodeToIdMap[$viviendaCode] ?? null;
        if ($viviendaDbId) {
            $stmtAnalisis = $pdo->prepare("SELECT id FROM analisis WHERE vivienda_id = ? ORDER BY ABS(TIMESTAMPDIFF(MINUTE, fecha, ?)) ASC LIMIT 1");
            $stmtAnalisis->execute([$viviendaDbId, $fecha]);
            $rowAnalisis = $stmtAnalisis->fetch();
            if ($rowAnalisis) {
                $analisisDbId = $rowAnalisis['id'];
            }
        }

        if (!$analisisDbId) {
            // Si no hay análisis, no podemos insertar la alerta por restricción de integridad (FK)
            // Creamos un análisis ficticio por defecto si la vivienda existe
            if ($viviendaDbId) {
                $insertAnalisis = $pdo->prepare("INSERT INTO analisis (vivienda_id, usuario_id, fecha, ph, cloro, estado, observaciones) VALUES (?, 1, ?, 7.0, 1.0, 'APTA', 'Análisis autogenerado para soporte de alerta migrada.')");
                $insertAnalisis->execute([$viviendaDbId, empty($fecha) ? date('Y-m-d H:i:s') : $fecha]);
                $analisisDbId = $pdo->lastInsertId();
            } else {
                continue;
            }
        }

        // Verificar si la alerta ya existe por analisis_id y tipo
        $stmtAlertCheck = $pdo->prepare("SELECT id FROM alertas WHERE analisis_id = ? AND tipo = ?");
        $stmtAlertCheck->execute([$analisisDbId, $tipo]);
        $alertRow = $stmtAlertCheck->fetch();

        if ($alertRow) {
            // Actualizar
            $updateAlert = $pdo->prepare("UPDATE alertas SET mensaje = ?, estado = ?, fecha = ? WHERE id = ?");
            $updateAlert->execute([$mensaje, $estadoAlerta, $fecha, $alertRow['id']]);
        } else {
            // Insertar
            $insertAlert = $pdo->prepare("INSERT INTO alertas (analisis_id, tipo, mensaje, estado, fecha) VALUES (?, ?, ?, ?, ?)");
            $insertAlert->execute([$analisisDbId, $tipo, $mensaje, $estadoAlerta, $fecha]);
            $alertasMigrated++;
        }
    }

    // 4. Mapeo de Actividades (Bitácora)
    $actividadesList = $input['actividades'] ?? [];
    foreach ($actividadesList as $act) {
        $fecha = $act['fecha'] ?? date('Y-m-d H:i:s');
        $tipo = $act['tipo'] ?? 'sistema'; // ej. sistema, rojo, verde, amarillo
        $desc = $act['desc'] ?? '';
        $meta = $act['meta'] ?? '';
        $descripcionCompleta = $desc . ($meta ? ' | ' . $meta : '');

        // Evitar duplicados revisando fecha y descripción
        $stmtActCheck = $pdo->prepare("SELECT id FROM historial_cambios WHERE fecha = ? AND descripcion = ?");
        $stmtActCheck->execute([$fecha, $descripcionCompleta]);
        
        if (!$stmtActCheck->fetch()) {
            $insertAct = $pdo->prepare("INSERT INTO historial_cambios (usuario_id, accion, descripcion, fecha) VALUES (1, ?, ?, ?)");
            $insertAct->execute([$tipo, $descripcionCompleta, $fecha]);
            $actividadesMigrated++;
        }
    }

    $pdo->commit();

    echo json_encode([
        'success' => true,
        'message' => 'Migración completada con éxito',
        'details' => [
            'viviendas_migradas' => $viviendasMigrated,
            'analisis_migrados' => $analisisMigrated,
            'alertas_migradas' => $alertasMigrated,
            'actividades_migradas' => $actividadesMigrated
        ]
    ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);

} catch (Exception $e) {
    $pdo->rollBack();
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => 'Error durante la migración: ' . $e->getMessage()
    ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
}
