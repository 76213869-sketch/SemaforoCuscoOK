<?php
header('Content-Type: application/json; charset=utf-8');
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, PUT, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

require_once __DIR__ . '/../config/database.php';
$pdo = getDatabaseConnection();

$method = $_SERVER['REQUEST_METHOD'];

// Validar acceso según el rol y método HTTP
if ($method === 'GET') {
    validarAccesoAPI(['ADMINISTRADOR', 'OPERADOR', 'INVITADO']);
} elseif ($method === 'PUT') {
    validarAccesoAPI(['ADMINISTRADOR', 'OPERADOR']);
}

switch ($method) {
    case 'GET':
        try {
            // Obtener todas las alertas con detalles de vivienda y responsable
            $sql = "SELECT al.id, al.fecha, al.tipo, al.mensaje as descripcion, al.estado,
                           v.codigo as viviendaId, v.propietario as viviendaNombre,
                           u.nombre as responsable
                    FROM alertas al
                    INNER JOIN analisis an ON al.analisis_id = an.id
                    INNER JOIN viviendas v ON an.vivienda_id = v.id
                    INNER JOIN usuarios u ON an.usuario_id = u.id
                    ORDER BY al.id DESC";
            
            $stmt = $pdo->query($sql);
            $alertas = [];
            
            while ($row = $stmt->fetch()) {
                $alertas[] = [
                    'id' => $row['id'], // ID entero del backend
                    'fecha' => $row['fecha'],
                    'viviendaId' => $row['viviendaId'],
                    'viviendaNombre' => $row['viviendaNombre'],
                    'responsable' => $row['responsable'] ?? 'Comité Universitario',
                    'tipo' => dbToFeAlertaTipo($row['tipo']),
                    'descripcion' => $row['descripcion'],
                    'activo' => ($row['estado'] === 'ACTIVA')
                ];
            }
            
            echo json_encode($alertas, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode(['error' => 'Error al obtener alertas: ' . $e->getMessage()]);
        }
        break;

    case 'PUT':
        try {
            $data = json_decode(file_get_contents('php://input'), true);
            
            if (!$data || !isset($data['id'])) {
                http_response_code(400);
                echo json_encode(['error' => 'ID de alerta no especificado']);
                exit;
            }
            
            $alertaId = (int)$data['id'];
            
            // Buscar alerta
            $stmt = $pdo->prepare("
                SELECT al.*, v.codigo as viviendaId, v.propietario as viviendaNombre
                FROM alertas al
                INNER JOIN analisis an ON al.analisis_id = an.id
                INNER JOIN viviendas v ON an.vivienda_id = v.id
                WHERE al.id = ?
            ");
            $stmt->execute([$alertaId]);
            $alerta = $stmt->fetch();
            
            if (!$alerta) {
                http_response_code(404);
                echo json_encode(['error' => 'Alerta no encontrada']);
                exit;
            }
            
            // Alternar estado
            $nuevoEstado = ($alerta['estado'] === 'ACTIVA') ? 'RESUELTA' : 'ACTIVA';
            
            $pdo->beginTransaction();
            
            $stmtUpdate = $pdo->prepare("UPDATE alertas SET estado = ? WHERE id = ?");
            $stmtUpdate->execute([$nuevoEstado, $alertaId]);
            
            // Registrar actividad
            if ($nuevoEstado === 'RESUELTA') {
                registrarBitacora($pdo, 'sistema', "Alerta resuelta: {$alerta['viviendaNombre']} ({$alerta['viviendaId']}) | Marcada como resuelta manualmente.");
                registrarActividadSistema($pdo, 'Alertas', 'Resolver alerta', "Se marcó la alerta ID {$alertaId} de la vivienda {$alerta['viviendaNombre']} ({$alerta['viviendaId']}) como RESUELTA.", 'Administrador');
            } else {
                registrarBitacora($pdo, 'sistema', "Alerta reabierta: {$alerta['viviendaNombre']} ({$alerta['viviendaId']}) | Marcada como activa manualmente.");
                registrarActividadSistema($pdo, 'Alertas', 'Crear alerta', "Se reabrió la alerta ID {$alertaId} de la vivienda {$alerta['viviendaNombre']} ({$alerta['viviendaId']}) a estado ACTIVA.", 'Administrador');
            }
            
            $pdo->commit();
            
            echo json_encode([
                'success' => true,
                'message' => 'Estado de alerta actualizado correctamente',
                'activo' => ($nuevoEstado === 'ACTIVA')
            ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
        } catch (Exception $e) {
            if ($pdo->inTransaction()) {
                $pdo->rollBack();
            }
            http_response_code(500);
            echo json_encode(['error' => 'Error al actualizar alerta: ' . $e->getMessage()]);
        }
        break;

    default:
        http_response_code(405);
        echo json_encode(['error' => 'Método no permitido']);
        break;
}
