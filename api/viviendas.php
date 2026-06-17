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
    case 'GET':
        try {
            // Obtener todas las viviendas con su último análisis
            $sql = "SELECT v.*, 
                           a.ph, a.cloro, a.fecha, a.observaciones, 
                           u.nombre as responsable
                    FROM viviendas v
                    LEFT JOIN (
                        SELECT a1.*
                        FROM analisis a1
                        INNER JOIN (
                            SELECT vivienda_id, MAX(id) as max_id
                            FROM analisis
                            GROUP BY vivienda_id
                        ) a2 ON a1.id = a2.max_id
                    ) a ON v.id = a.vivienda_id
                    LEFT JOIN usuarios u ON a.usuario_id = u.id
                    ORDER BY v.id ASC";
            
            $stmt = $pdo->query($sql);
            $viviendas = [];
            
            while ($row = $stmt->fetch()) {
                $viviendas[] = [
                    'id' => $row['codigo'],
                    'nombre' => $row['propietario'],
                    'direccion' => $row['direccion'],
                    'sector' => $row['sector'],
                    'telefono' => $row['telefono'] ?? '',
                    'latitud' => (float)$row['latitud'],
                    'longitud' => (float)$row['longitud'],
                    'estado' => dbToFeEstado($row['estado_actual']),
                    'ph' => $row['ph'] !== null ? (float)$row['ph'] : null,
                    'cloro' => $row['cloro'] !== null ? (float)$row['cloro'] : null,
                    'fecha' => $row['fecha'] ?? null,
                    'observaciones' => $row['observaciones'] ?? ($row['ph'] !== null ? '' : 'Sin análisis registrados.'),
                    'responsable' => $row['responsable'] ?? ''
                ];
            }
            
            echo json_encode($viviendas, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode(['error' => 'Error al obtener viviendas: ' . $e->getMessage()]);
        }
        break;

    case 'POST':
        try {
            $data = json_decode(file_get_contents('php://input'), true);
            
            if (!$data || empty($data['id']) || empty($data['nombre']) || empty($data['direccion'])) {
                http_response_code(400);
                echo json_encode(['error' => 'Datos insuficientes para registrar la vivienda']);
                exit;
            }
            
            $codigo = $data['id'];
            $propietario = $data['nombre'];
            $direccion = $data['direccion'];
            $sector = $data['sector'] ?? 'Sector Viva el Perú';
            $telefono = $data['telefono'] ?? '';
            $lat = (float)($data['latitud'] ?? 0.0);
            $lng = (float)($data['longitud'] ?? 0.0);
            $estado = feToDbEstado($data['estado'] ?? 'gris');
            $obs = $data['observaciones'] ?? 'Sin observaciones iniciales.';
            
            // Verificar si el código ya existe
            $stmtCheck = $pdo->prepare("SELECT id FROM viviendas WHERE codigo = ?");
            $stmtCheck->execute([$codigo]);
            if ($stmtCheck->fetch()) {
                http_response_code(400);
                echo json_encode(['error' => 'El código de vivienda ' . $codigo . ' ya está registrado']);
                exit;
            }
            
            $pdo->beginTransaction();
            
            $stmt = $pdo->prepare("INSERT INTO viviendas (codigo, propietario, direccion, sector, telefono, latitud, longitud, estado_actual) VALUES (?, ?, ?, ?, ?, ?, ?, ?)");
            $stmt->execute([$codigo, $propietario, $direccion, $sector, $telefono, $lat, $lng, $estado]);
            $newId = $pdo->lastInsertId();
            
            // Registrar actividad
            registrarBitacora($pdo, 'sistema', "Nueva Vivienda registrada: {$propietario} ({$codigo}) | Dirección: {$direccion} | Sector: {$sector}");
            registrarActividadSistema($pdo, 'Viviendas', 'Registrar vivienda', "Se registró una nueva vivienda {$codigo} para {$propietario} en Dirección: {$direccion}.", 'Administrador');
            
            $pdo->commit();
            
            echo json_encode([
                'success' => true,
                'message' => 'Vivienda registrada correctamente',
                'vivienda' => [
                    'id' => $codigo,
                    'nombre' => $propietario,
                    'direccion' => $direccion,
                    'sector' => $sector,
                    'telefono' => $telefono,
                    'latitud' => $lat,
                    'longitud' => $lng,
                    'estado' => dbToFeEstado($estado),
                    'ph' => null,
                    'cloro' => null,
                    'fecha' => null,
                    'observaciones' => $obs,
                    'responsable' => ''
                ]
            ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
        } catch (Exception $e) {
            if ($pdo->inTransaction()) {
                $pdo->rollBack();
            }
            http_response_code(500);
            echo json_encode(['error' => 'Error al registrar vivienda: ' . $e->getMessage()]);
        }
        break;

    case 'PUT':
        try {
            $data = json_decode(file_get_contents('php://input'), true);
            
            if (!$data || empty($data['id'])) {
                http_response_code(400);
                echo json_encode(['error' => 'Código de vivienda no especificado']);
                exit;
            }
            
            $codigo = $data['id'];
            
            // Buscar vivienda por código
            $stmt = $pdo->prepare("SELECT * FROM viviendas WHERE codigo = ?");
            $stmt->execute([$codigo]);
            $vivienda = $stmt->fetch();
            
            if (!$vivienda) {
                http_response_code(404);
                echo json_encode(['error' => 'Vivienda no encontrada']);
                exit;
            }
            
            $viviendaDbId = $vivienda['id'];
            $pdo->beginTransaction();
            
            // Si es una reubicación (cambio de coordenadas)
            if (isset($data['latitud']) && isset($data['longitud']) && count($data) <= 4) { // id, latitud, longitud + opcionales
                $lat = (float)$data['latitud'];
                $lng = (float)$data['longitud'];
                
                $stmtUpdate = $pdo->prepare("UPDATE viviendas SET latitud = ?, longitud = ? WHERE id = ?");
                $stmtUpdate->execute([$lat, $lng, $viviendaDbId]);
                
                registrarBitacora($pdo, 'sistema', "Reubicación vivienda: {$codigo} | Coords: " . number_format($lat, 6) . ", " . number_format($lng, 6));
                registrarActividadSistema($pdo, 'Viviendas', 'Editar vivienda', "Se reubicó la vivienda {$codigo} (Coordenadas: " . number_format($lat, 6) . ", " . number_format($lng, 6) . ").", 'Administrador');
            } else {
                // Edición general de datos
                $propietario = $data['nombre'] ?? $vivienda['propietario'];
                $direccion = $data['direccion'] ?? $vivienda['direccion'];
                $sector = $data['sector'] ?? $vivienda['sector'];
                $telefono = $data['telefono'] ?? $vivienda['telefono'];
                $observaciones = $data['observaciones'] ?? null;
                
                $stmtUpdate = $pdo->prepare("UPDATE viviendas SET propietario = ?, direccion = ?, sector = ?, telefono = ? WHERE id = ?");
                $stmtUpdate->execute([$propietario, $direccion, $sector, $telefono, $viviendaDbId]);
                
                // Si viene observaciones, actualizar el último análisis de esta vivienda
                if ($observaciones !== null) {
                    $stmtLatest = $pdo->prepare("SELECT id FROM analisis WHERE vivienda_id = ? ORDER BY fecha DESC, id DESC LIMIT 1");
                    $stmtLatest->execute([$viviendaDbId]);
                    $latestAnalisis = $stmtLatest->fetch();
                    if ($latestAnalisis) {
                        $stmtUpdateObs = $pdo->prepare("UPDATE analisis SET observaciones = ? WHERE id = ?");
                        $stmtUpdateObs->execute([$observaciones, $latestAnalisis['id']]);
                    }
                }
                
                registrarBitacora($pdo, 'sistema', "Edición de datos vivienda: {$codigo} | Propietario: {$propietario}");
                registrarActividadSistema($pdo, 'Viviendas', 'Editar vivienda', "Se editaron los datos generales de la vivienda {$codigo} (Propietario: {$propietario}).", 'Administrador');
            }
            
            $pdo->commit();
            
            echo json_encode([
                'success' => true,
                'message' => 'Vivienda actualizada correctamente'
            ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
        } catch (Exception $e) {
            if ($pdo->inTransaction()) {
                $pdo->rollBack();
            }
            http_response_code(500);
            echo json_encode(['error' => 'Error al actualizar vivienda: ' . $e->getMessage()]);
        }
        break;

    case 'DELETE':
        try {
            // Puede venir el código por query param (?id=V-01) o en el body
            $codigo = $_GET['id'] ?? null;
            if (!$codigo) {
                $data = json_decode(file_get_contents('php://input'), true);
                $codigo = $data['id'] ?? null;
            }
            
            if (!$codigo) {
                http_response_code(400);
                echo json_encode(['error' => 'Código de vivienda no especificado']);
                exit;
            }
            
            // Buscar vivienda para obtener el nombre
            $stmt = $pdo->prepare("SELECT id, propietario FROM viviendas WHERE codigo = ?");
            $stmt->execute([$codigo]);
            $row = $stmt->fetch();
            
            if (!$row) {
                http_response_code(404);
                echo json_encode(['error' => 'Vivienda no encontrada']);
                exit;
            }
            
            $viviendaDbId = $row['id'];
            $propietario = $row['propietario'];
            
            $pdo->beginTransaction();
            
            // Eliminar vivienda (las tablas analisis, alertas tienen ON DELETE CASCADE, se eliminan solas)
            $stmtDelete = $pdo->prepare("DELETE FROM viviendas WHERE id = ?");
            $stmtDelete->execute([$viviendaDbId]);
            
            registrarBitacora($pdo, 'rojo', "Vivienda eliminada: {$propietario} ({$codigo})", 1);
            registrarActividadSistema($pdo, 'Viviendas', 'Eliminar vivienda', "Se eliminó la vivienda {$codigo} de {$propietario}.", 'Administrador');
            
            $pdo->commit();
            
            echo json_encode([
                'success' => true,
                'message' => 'Vivienda eliminada con éxito'
            ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
        } catch (Exception $e) {
            if ($pdo->inTransaction()) {
                $pdo->rollBack();
            }
            http_response_code(500);
            echo json_encode(['error' => 'Error al eliminar vivienda: ' . $e->getMessage()]);
        }
        break;

    default:
        http_response_code(405);
        echo json_encode(['error' => 'Método no permitido']);
        break;
}
