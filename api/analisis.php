<?php
header('Content-Type: application/json; charset=utf-8');
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

require_once __DIR__ . '/../config/database.php';
$pdo = getDatabaseConnection();

// Algoritmo de evaluación en PHP
function evaluarCalidadAgua($ph, $cloro) {
    if ($ph === null || $cloro === null) {
        return [
            'estado' => 'SIN_EVALUAR',
            'resultado' => 'Sin evaluación inicial',
            'detalles' => 'Aún no se ha realizado ninguna medición de calidad de agua en esta vivienda.',
            'recomendaciones' => [
                'Programar control rutinario.',
                'Registrar el primer análisis de pH y cloro.'
            ]
        ];
    }
    
    // Rango verde: pH [6.5, 8.5] Y Cloro [0.5, 1.5]
    if ($ph >= 6.5 && $ph <= 8.5 && $cloro >= 0.5 && $cloro <= 1.5) {
        return [
            'estado' => 'APTA',
            'resultado' => 'Agua apta para consumo',
            'detalles' => 'Los valores físico-químicos cumplen estrictamente con los rangos normativos (D.S. N° 031-2010-SA).',
            'recomendaciones' => [
                'Continuar con la dosificación y muestreo rutinarios.',
                'Mantener el monitoreo preventivo semanal.'
            ]
        ];
    }
    // Rango rojo: pH < 6.0 o pH > 9.0 O Cloro < 0.2 o Cloro > 2.0
    else if ($ph < 6.0 || $ph > 9.0 || $cloro < 0.2 || $cloro > 2.0) {
        $motivos = [];
        if ($ph < 6.0) $motivos[] = 'pH ácido crítico (< 6.0)';
        if ($ph > 9.0) $motivos[] = 'pH alcalino crítico (> 9.0)';
        if ($cloro < 0.2) $motivos[] = 'Cloro insuficiente (< 0.2 mg/L - Riesgo patógeno)';
        if ($cloro > 2.0) $motivos[] = 'Exceso nocivo de Cloro (> 2.0 mg/L - Toxicidad)';

        return [
            'estado' => 'CRITICA',
            'resultado' => 'Agua no apta para consumo',
            'detalles' => 'ALERTA DE RIESGO SANITARIO debido a: ' . implode(', ', $motivos) . '.',
            'recomendaciones' => [
                '¡CRÍTICO! Suspender inmediatamente el consumo humano directo.',
                'Aplicar purga y desinfección del tramo de red.',
                'Verificar el dosificador del reservorio principal.',
                'Tomar contramuestra técnica de control en un máximo de 2 horas.'
            ]
        ];
    }
    // Rango amarillo: Valores cercanos al límite (Revisión preventiva)
    else {
        $advertencias = [];
        if ($ph >= 6.0 && $ph < 6.5) $advertencias[] = 'pH en umbral ácido bajo (6.0 - 6.4)';
        if ($ph > 8.5 && $ph <= 9.0) $advertencias[] = 'pH en umbral alcalino alto (8.6 - 9.0)';
        if ($cloro >= 0.2 && $cloro < 0.5) $advertencias[] = 'Cloro residual bajo (0.2 - 0.4 mg/L)';
        if ($cloro > 1.5 && $cloro <= 2.0) $advertencias[] = 'Cloro residual alto (1.6 - 2.0 mg/L)';

        return [
            'estado' => 'OBSERVACION',
            'resultado' => 'Revisión preventiva requerida',
            'detalles' => 'Se detectaron parámetros fuera de la zona óptima: ' . implode(', ', $advertencias) . '.',
            'recomendaciones' => [
                'Recomendar a la vivienda hervir el agua preventivamente para el consumo.',
                'Programar ajuste en los niveles de cloración en la cámara de contacto.',
                'Agendar una visita de inspección técnica en un plazo máximo de 24 horas.'
            ]
        ];
    }
}

// Helper para sincronizar viviendas y alertas
function sincronizarViviendaYAlertas($pdo, $viviendaDbId, $responsableNombre) {
    // 1. Obtener el último análisis de la vivienda
    $stmt = $pdo->prepare("SELECT * FROM analisis WHERE vivienda_id = ? ORDER BY fecha DESC, id DESC LIMIT 1");
    $stmt->execute([$viviendaDbId]);
    $ultimo = $stmt->fetch();
    
    // Obtener código y nombre de la vivienda
    $stmtViv = $pdo->prepare("SELECT codigo, propietario FROM viviendas WHERE id = ?");
    $stmtViv->execute([$viviendaDbId]);
    $viv = $stmtViv->fetch();
    
    if (!$viv) return;
    
    $codigoVivienda = $viv['codigo'];
    $nombreVivienda = $viv['propietario'];
    
    if ($ultimo) {
        $ph = (float)$ultimo['ph'];
        $cloro = (float)$ultimo['cloro'];
        $estado = $ultimo['estado']; // APTA, OBSERVACION, CRITICA
        $analisisId = $ultimo['id'];
        $fecha = $ultimo['fecha'];
        
        // Actualizar estado_actual en la tabla viviendas
        $stmtUpdateViv = $pdo->prepare("UPDATE viviendas SET estado_actual = ? WHERE id = ?");
        $stmtUpdateViv->execute([$estado, $viviendaDbId]);
    } else {
        // No quedan análisis
        $stmtUpdateViv = $pdo->prepare("UPDATE viviendas SET estado_actual = 'SIN_EVALUAR' WHERE id = ?");
        $stmtUpdateViv->execute([$viviendaDbId]);
        
        // Resolver cualquier alerta activa de esta vivienda
        $stmtResolve = $pdo->prepare("
            UPDATE alertas al
            INNER JOIN analisis an ON al.analisis_id = an.id
            SET al.estado = 'RESUELTA'
            WHERE an.vivienda_id = ? AND al.estado = 'ACTIVA'
        ");
        $stmtResolve->execute([$viviendaDbId]);
        return;
    }
    
    $eval = evaluarCalidadAgua($ph, $cloro);
    
    // Buscar si hay alguna alerta activa (no informativa) vinculada a los análisis de esta vivienda
    $stmtAlert = $pdo->prepare("
        SELECT al.id 
        FROM alertas al
        INNER JOIN analisis an ON al.analisis_id = an.id
        WHERE an.vivienda_id = ? AND al.estado = 'ACTIVA' AND al.tipo != 'INFORMATIVA'
        LIMIT 1
    ");
    $stmtAlert->execute([$viviendaDbId]);
    $activeAlert = $stmtAlert->fetch();
    
    if ($estado === 'APTA') {
        // Si el estado es APTA, resolver alertas previas (no informativas)
        if ($activeAlert) {
            $stmtResolve = $pdo->prepare("UPDATE alertas SET estado = 'RESUELTA' WHERE id = ?");
            $stmtResolve->execute([$activeAlert['id']]);
            
            registrarBitacora($pdo, 'verde', "Alerta resuelta en Vivienda {$nombreVivienda} ({$codigoVivienda}) | Restablecido a valores óptimos.");
            registrarActividadSistema($pdo, 'Alertas', 'Resolver alerta', "Alerta resuelta en Vivienda {$nombreVivienda} ({$codigoVivienda}) | Restablecido a valores óptimos.", $responsableNombre);
        }
        
        // Insertar alerta informativa
        $stmtInsertInfo = $pdo->prepare("INSERT INTO alertas (analisis_id, tipo, mensaje, estado, fecha) VALUES (?, 'INFORMATIVA', ?, 'ACTIVA', ?)");
        $stmtInsertInfo->execute([
            $analisisId,
            'Monitoreo de control completado con éxito. Agua 100% apta para consumo humano.',
            $fecha
        ]);
        
        registrarBitacora($pdo, 'sistema', "Actualización de calidad en {$nombreVivienda} | Valores registrados: pH {$ph} | Cloro {$cloro} mg/L.");
        registrarActividadSistema($pdo, 'Análisis', 'Registrar análisis', "Actualización de calidad en {$nombreVivienda} | Valores registrados: pH {$ph} | Cloro {$cloro} mg/L.", $responsableNombre);
    } else {
        // Estado OBSERVACION o CRITICA
        $tipoAlerta = ($estado === 'CRITICA') ? 'CRITICA' : 'PREVENTIVA';
        $mensajeAlerta = $eval['detalles'];
        
        if ($activeAlert) {
            // Actualizar la alerta activa existente
            $stmtUpdateAlert = $pdo->prepare("UPDATE alertas SET analisis_id = ?, tipo = ?, mensaje = ?, fecha = ? WHERE id = ?");
            $stmtUpdateAlert->execute([
                $analisisId,
                $tipoAlerta,
                $mensajeAlerta,
                $fecha,
                $activeAlert['id']
            ]);
        } else {
            // Insertar nueva alerta activa
            $stmtInsertAlert = $pdo->prepare("INSERT INTO alertas (analisis_id, tipo, mensaje, estado, fecha) VALUES (?, ?, ?, 'ACTIVA', ?)");
            $stmtInsertAlert->execute([
                $analisisId,
                $tipoAlerta,
                $mensajeAlerta,
                $fecha
            ]);
        }
        
        $estadoLabel = ($estado === 'CRITICA') ? 'CRÍTICA' : 'PREVENTIVA';
        $feEstado = dbToFeEstado($estado);
        registrarBitacora($pdo, $feEstado, "Alerta {$estadoLabel} registrada en {$nombreVivienda} | pH: {$ph} | Cloro: {$cloro} mg/L");
        registrarActividadSistema($pdo, 'Alertas', ($estado === 'CRITICA' ? 'Crear alerta' : 'Crear alerta'), "Alerta {$estadoLabel} registrada en {$nombreVivienda} | pH: {$ph} | Cloro: {$cloro} mg/L.", $responsableNombre);
    }
}

$method = $_SERVER['REQUEST_METHOD'];

// Validar acceso según el rol y método HTTP
if ($method === 'GET') {
    validarAccesoAPI(['ADMINISTRADOR', 'OPERADOR', 'INVITADO']);
} elseif ($method === 'POST' || $method === 'PUT') {
    validarAccesoAPI(['ADMINISTRADOR', 'OPERADOR']);
} elseif ($method === 'DELETE') {
    validarAccesoAPI(['ADMINISTRADOR']);
}

switch ($method) {
    case 'POST':
        try {
            $data = json_decode(file_get_contents('php://input'), true);
            
            if (!$data || empty($data['viviendaId']) || !isset($data['ph']) || !isset($data['cloro'])) {
                http_response_code(400);
                echo json_encode(['error' => 'Datos de análisis insuficientes']);
                exit;
            }
            
            $viviendaCodigo = $data['viviendaId'];
            $responsable = $data['responsable'] ?? 'Comité Universitario';
            $fecha = $data['fecha'] ?? date('Y-m-d H:i:s');
            $ph = (float)$data['ph'];
            $cloro = (float)$data['cloro'];
            $observaciones = $data['observaciones'] ?? 'Sin anomalías reportadas.';
            
            // Si la fecha solo trae Y-m-d, agregar hora actual para que sea un datetime válido
            if (strlen($fecha) === 10) {
                $fecha .= ' ' . date('H:i:s');
            }
            
            // Buscar vivienda
            $stmtViv = $pdo->prepare("SELECT id, propietario FROM viviendas WHERE codigo = ?");
            $stmtViv->execute([$viviendaCodigo]);
            $vivRow = $stmtViv->fetch();
            
            if (!$vivRow) {
                http_response_code(404);
                echo json_encode(['error' => 'Vivienda no encontrada']);
                exit;
            }
            
            $viviendaDbId = $vivRow['id'];
            $viviendaNombre = $vivRow['propietario'];
            
            $pdo->beginTransaction();
            
            // Buscar o crear usuario responsable
            $stmtUser = $pdo->prepare("SELECT id FROM usuarios WHERE nombre = ?");
            $stmtUser->execute([$responsable]);
            $userRow = $stmtUser->fetch();
            if ($userRow) {
                $usuarioDbId = $userRow['id'];
            } else {
                $correoSimulado = strtolower(str_replace(' ', '.', $responsable)) . '_' . rand(100, 999) . '@gmail.com';
                $insertUser = $pdo->prepare("INSERT INTO usuarios (nombre, correo, password, rol) VALUES (?, ?, ?, 'OPERADOR')");
                $insertUser->execute([$responsable, $correoSimulado, password_hash('brigadista123', PASSWORD_BCRYPT)]);
                $usuarioDbId = $pdo->lastInsertId();
            }
            
            // Evaluar calidad
            $eval = evaluarCalidadAgua($ph, $cloro);
            $dbEstado = $eval['estado']; // APTA, OBSERVACION, CRITICA
            
            // Insertar análisis
            $stmtInsert = $pdo->prepare("INSERT INTO analisis (vivienda_id, usuario_id, fecha, ph, cloro, estado, observaciones) VALUES (?, ?, ?, ?, ?, ?, ?)");
            $stmtInsert->execute([$viviendaDbId, $usuarioDbId, $fecha, $ph, $cloro, $dbEstado, $observaciones]);
            
            // Sincronizar estado de vivienda y alertas asociadas
            sincronizarViviendaYAlertas($pdo, $viviendaDbId, $responsable);
            registrarActividadSistema($pdo, 'Análisis', 'Registrar análisis', "Se registró un nuevo análisis para la vivienda {$viviendaCodigo} (pH: {$ph}, Cloro: {$cloro} mg/L).", $responsable);
            
            $pdo->commit();
            
            echo json_encode([
                'success' => true,
                'message' => 'Análisis guardado con éxito'
            ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
        } catch (Exception $e) {
            if ($pdo->inTransaction()) {
                $pdo->rollBack();
            }
            http_response_code(500);
            echo json_encode(['error' => 'Error al guardar análisis: ' . $e->getMessage()]);
        }
        break;

    case 'PUT':
        try {
            $data = json_decode(file_get_contents('php://input'), true);
            
            if (!$data || empty($data['id']) || !isset($data['ph']) || !isset($data['cloro'])) {
                http_response_code(400);
                echo json_encode(['error' => 'Datos insuficientes para editar el análisis']);
                exit;
            }
            
            $analisisId = (int)$data['id'];
            $responsable = $data['responsable'] ?? 'Comité Universitario';
            $ph = (float)$data['ph'];
            $cloro = (float)$data['cloro'];
            $fecha = $data['fecha'] ?? date('Y-m-d H:i:s');
            $observaciones = $data['observaciones'] ?? '';
            
            if (strlen($fecha) === 10) {
                $fecha .= ' ' . date('H:i:s');
            }
            
            // Obtener el análisis existente para saber de qué vivienda es
            $stmtAnalisis = $pdo->prepare("SELECT vivienda_id FROM analisis WHERE id = ?");
            $stmtAnalisis->execute([$analisisId]);
            $analisisRow = $stmtAnalisis->fetch();
            
            if (!$analisisRow) {
                http_response_code(404);
                echo json_encode(['error' => 'Registro de análisis no encontrado']);
                exit;
            }
            
            $viviendaDbId = $analisisRow['vivienda_id'];
            
            $pdo->beginTransaction();
            
            // Buscar o crear usuario responsable
            $stmtUser = $pdo->prepare("SELECT id FROM usuarios WHERE nombre = ?");
            $stmtUser->execute([$responsable]);
            $userRow = $stmtUser->fetch();
            if ($userRow) {
                $usuarioDbId = $userRow['id'];
            } else {
                $correoSimulado = strtolower(str_replace(' ', '.', $responsable)) . '_' . rand(100, 999) . '@gmail.com';
                $insertUser = $pdo->prepare("INSERT INTO usuarios (nombre, correo, password, rol) VALUES (?, ?, ?, 'OPERADOR')");
                $insertUser->execute([$responsable, $correoSimulado, password_hash('brigadista123', PASSWORD_BCRYPT)]);
                $usuarioDbId = $pdo->lastInsertId();
            }
            
            // Evaluar calidad
            $eval = evaluarCalidadAgua($ph, $cloro);
            $dbEstado = $eval['estado']; // APTA, OBSERVACION, CRITICA
            
            // Actualizar análisis
            $stmtUpdate = $pdo->prepare("UPDATE analisis SET usuario_id = ?, ph = ?, cloro = ?, estado = ?, fecha = ?, observaciones = ? WHERE id = ?");
            $stmtUpdate->execute([$usuarioDbId, $ph, $cloro, $dbEstado, $fecha, $observaciones, $analisisId]);
            
            // Sincronizar estado de vivienda y alertas asociadas
            sincronizarViviendaYAlertas($pdo, $viviendaDbId, $responsable);
            registrarActividadSistema($pdo, 'Análisis', 'Editar análisis', "Se editó el análisis ID {$analisisId} de la vivienda {$viviendaDbId} (Nuevos valores - pH: {$ph}, Cloro: {$cloro} mg/L).", $responsable);
            
            $pdo->commit();
            
            echo json_encode([
                'success' => true,
                'message' => 'Análisis actualizado con éxito'
            ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
        } catch (Exception $e) {
            if ($pdo->inTransaction()) {
                $pdo->rollBack();
            }
            http_response_code(500);
            echo json_encode(['error' => 'Error al actualizar análisis: ' . $e->getMessage()]);
        }
        break;

    case 'DELETE':
        try {
            $analisisId = $_GET['id'] ?? null;
            if (!$analisisId) {
                $data = json_decode(file_get_contents('php://input'), true);
                $analisisId = $data['id'] ?? null;
            }
            
            if (!$analisisId) {
                http_response_code(400);
                echo json_encode(['error' => 'ID de análisis no especificado']);
                exit;
            }
            
            // Obtener datos del análisis antes de borrarlo
            $stmtAnalisis = $pdo->prepare("SELECT a.vivienda_id, v.codigo, v.propietario, a.ph, a.cloro FROM analisis a JOIN viviendas v ON a.vivienda_id = v.id WHERE a.id = ?");
            $stmtAnalisis->execute([$analisisId]);
            $analisisRow = $stmtAnalisis->fetch();
            
            if (!$analisisRow) {
                http_response_code(404);
                echo json_encode(['error' => 'Registro de análisis no encontrado']);
                exit;
            }
            
            $viviendaDbId = $analisisRow['vivienda_id'];
            $codigoVivienda = $analisisRow['codigo'];
            $nombreVivienda = $analisisRow['propietario'];
            $ph = $analisisRow['ph'];
            $cloro = $analisisRow['cloro'];
            
            $pdo->beginTransaction();
            
            // Eliminar análisis (las alertas en cascada se borrarán solas si están linkeadas a este análisis específico)
            $stmtDelete = $pdo->prepare("DELETE FROM analisis WHERE id = ?");
            $stmtDelete->execute([$analisisId]);
            
            // Registrar bitácora
            registrarBitacora($pdo, 'sistema', "Análisis eliminado para vivienda {$nombreVivienda} ({$codigoVivienda}) | Valores previos: pH {$ph} | Cloro {$cloro} mg/L");
            registrarActividadSistema($pdo, 'Análisis', 'Eliminar análisis', "Se eliminó el análisis ID {$analisisId} de la vivienda {$codigoVivienda} (Valores previos - pH: {$ph}, Cloro: {$cloro} mg/L).", 'Comité Universitario');
            
            // Sincronizar estado de vivienda y alertas asociadas (esto recalculará en base al nuevo último análisis)
            sincronizarViviendaYAlertas($pdo, $viviendaDbId, 'Comité Universitario');
            
            $pdo->commit();
            
            echo json_encode([
                'success' => true,
                'message' => 'Análisis eliminado correctamente'
            ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
        } catch (Exception $e) {
            if ($pdo->inTransaction()) {
                $pdo->rollBack();
            }
            http_response_code(500);
            echo json_encode(['error' => 'Error al eliminar análisis: ' . $e->getMessage()]);
        }
        break;

    default:
        http_response_code(405);
        echo json_encode(['error' => 'Método no permitido']);
        break;
}
