<?php
header('Content-Type: application/json; charset=utf-8');
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, PUT, DELETE, OPTIONS");
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
} elseif ($method === 'DELETE') {
    validarAccesoAPI(['ADMINISTRADOR']);
}

switch ($method) {
    case 'GET':
        try {
            // Obtener todo el historial de análisis
            $sql = "SELECT a.id, a.fecha, a.ph, a.cloro, a.estado, a.observaciones, a.favorito,
                           v.codigo as viviendaId, v.propietario as viviendaNombre,
                           u.nombre as responsable
                    FROM analisis a
                    INNER JOIN viviendas v ON a.vivienda_id = v.id
                    INNER JOIN usuarios u ON a.usuario_id = u.id
                    ORDER BY a.fecha DESC, a.id DESC";
            
            $stmt = $pdo->query($sql);
            $historial = [];
            
            while ($row = $stmt->fetch()) {
                $historial[] = [
                    'id' => $row['id'], // ID entero del backend
                    'fecha' => $row['fecha'],
                    'viviendaId' => $row['viviendaId'],
                    'viviendaNombre' => $row['viviendaNombre'],
                    'responsable' => $row['responsable'] ?? 'Comité Universitario',
                    'ph' => (float)$row['ph'],
                    'cloro' => (float)$row['cloro'],
                    'estado' => dbToFeEstado($row['estado']),
                    'observaciones' => $row['observaciones'] ?? '',
                    'favorito' => (bool)$row['favorito']
                ];
            }
            
            echo json_encode($historial, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode(['error' => 'Error al obtener historial: ' . $e->getMessage()]);
        }
        break;

    case 'PUT':
        try {
            $data = json_decode(file_get_contents('php://input'), true);
            
            if (!$data || !isset($data['id'])) {
                http_response_code(400);
                echo json_encode(['error' => 'ID de análisis no especificado']);
                exit;
            }
            
            $analisisId = (int)$data['id'];
            
            // Buscar análisis
            $stmt = $pdo->prepare("SELECT favorito FROM analisis WHERE id = ?");
            $stmt->execute([$analisisId]);
            $analisis = $stmt->fetch();
            
            if (!$analisis) {
                http_response_code(404);
                echo json_encode(['error' => 'Registro de análisis no encontrado']);
                exit;
            }
            
            // Alternar favorito
            $nuevoFavorito = $analisis['favorito'] ? 0 : 1;
            
            $pdo->beginTransaction();
            
            $stmtUpdate = $pdo->prepare("UPDATE analisis SET favorito = ? WHERE id = ?");
            $stmtUpdate->execute([$nuevoFavorito, $analisisId]);
            
            $pdo->commit();
            
            echo json_encode([
                'success' => true,
                'message' => 'Favorito actualizado correctamente',
                'favorito' => (bool)$nuevoFavorito
            ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
        } catch (Exception $e) {
            if ($pdo->inTransaction()) {
                $pdo->rollBack();
            }
            http_response_code(500);
            echo json_encode(['error' => 'Error al actualizar favorito: ' . $e->getMessage()]);
        }
        break;

    case 'DELETE':
        try {
            $pdo->beginTransaction();
            
            // Borrar todos los análisis (los cascade deletes borrarán alertas)
            $pdo->exec("DELETE FROM analisis");
            
            // Resetear estados de todas las viviendas a SIN_EVALUAR
            $pdo->exec("UPDATE viviendas SET estado_actual = 'SIN_EVALUAR'");
            
            // Registrar actividad
            registrarBitacora($pdo, 'sistema', 'Historial de mediciones limpiado por completo.', 1);
            registrarActividadSistema($pdo, 'Historial', 'Eliminar historial', 'Se vació el historial completo de mediciones y se restableció el estado de todas las viviendas a Sin Evaluar.', 'Administrador');
            
            $pdo->commit();
            
            echo json_encode([
                'success' => true,
                'message' => 'Todo el historial de análisis ha sido eliminado correctamente'
            ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
        } catch (Exception $e) {
            if ($pdo->inTransaction()) {
                $pdo->rollBack();
            }
            http_response_code(500);
            echo json_encode(['error' => 'Error al limpiar historial: ' . $e->getMessage()]);
        }
        break;

    default:
        http_response_code(405);
        echo json_encode(['error' => 'Método no permitido']);
        break;
}
