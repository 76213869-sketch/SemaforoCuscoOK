<?php
header('Content-Type: application/json; charset=utf-8');
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

require_once __DIR__ . '/../config/database.php';
$pdo = getDatabaseConnection();

// Fail-safe: Si la tabla actividad_sistema está vacía, migrar/copiar registros desde historial_cambios
try {
    $count = (int)$pdo->query("SELECT COUNT(*) FROM actividad_sistema")->fetchColumn();
    if ($count === 0) {
        $pdo->exec("
            INSERT INTO actividad_sistema (usuario, modulo, accion, descripcion, fecha)
            SELECT 
                COALESCE(u.nombre, 'Administrador') as usuario,
                CASE 
                    WHEN LOWER(h.descripcion) LIKE '%vivienda%' THEN 'Viviendas'
                    WHEN LOWER(h.descripcion) LIKE '%análisis%' OR LOWER(h.descripcion) LIKE '%analisis%' OR LOWER(h.descripcion) LIKE '%calidad%' THEN 'Análisis'
                    WHEN LOWER(h.descripcion) LIKE '%historial%' THEN 'Historial'
                    WHEN LOWER(h.descripcion) LIKE '%alerta%' THEN 'Alertas'
                    ELSE 'Sistema'
                END as modulo,
                CASE 
                    WHEN h.accion = 'rojo' THEN 'Alerta Crítica'
                    WHEN h.accion = 'amarillo' THEN 'Alerta Preventiva'
                    WHEN h.accion = 'verde' THEN 'Alerta Apta'
                    ELSE 'General'
                END as accion,
                h.descripcion,
                h.fecha
            FROM historial_cambios h
            LEFT JOIN usuarios u ON h.usuario_id = u.id
            ORDER BY h.id ASC
        ");
    }
} catch (Exception $e) {
    // Ignorar si hay problemas de migración inicial
}

$method = $_SERVER['REQUEST_METHOD'];

// Validar que el usuario tenga sesión iniciada
validarAccesoAPI(['ADMINISTRADOR', 'OPERADOR', 'INVITADO']);

switch ($method) {
    case 'GET':
        try {
            // Verificar si es una consulta de auditoría con filtros o paginación
            $isAuditQuery = isset($_GET['page']) || isset($_GET['modulo']) || isset($_GET['search']) || isset($_GET['fecha_inicio']) || isset($_GET['fecha_fin']);
            
            if ($isAuditQuery) {
                // Restringir el modo auditoría solo a administradores
                validarAccesoAPI(['ADMINISTRADOR']);
                
                // Modo Auditoría (Bitácora) con filtros
                $page = isset($_GET['page']) ? (int)$_GET['page'] : 1;
                $limit = isset($_GET['limit']) ? (int)$_GET['limit'] : 10;
                $offset = ($page - 1) * $limit;
                
                $conditions = [];
                $params = [];
                
                // Filtro por módulo
                if (!empty($_GET['modulo']) && $_GET['modulo'] !== 'todos') {
                    $conditions[] = "modulo = :modulo";
                    $params[':modulo'] = $_GET['modulo'];
                }
                
                // Filtro de búsqueda (usuario, modulo, accion, descripcion)
                if (!empty($_GET['search'])) {
                    $conditions[] = "(usuario LIKE :search OR modulo LIKE :search OR accion LIKE :search OR descripcion LIKE :search)";
                    $params[':search'] = '%' . $_GET['search'] . '%';
                }
                
                // Filtro de fecha inicio
                if (!empty($_GET['fecha_inicio'])) {
                    $conditions[] = "fecha >= :fecha_inicio";
                    $params[':fecha_inicio'] = $_GET['fecha_inicio'] . ' 00:00:00';
                }
                
                // Filtro de fecha fin
                if (!empty($_GET['fecha_fin'])) {
                    $conditions[] = "fecha <= :fecha_fin";
                    $params[':fecha_fin'] = $_GET['fecha_fin'] . ' 23:59:59';
                }
                
                $whereClause = "";
                if (count($conditions) > 0) {
                    $whereClause = "WHERE " . implode(" AND ", $conditions);
                }
                
                // Obtener el total para paginación
                $sqlCount = "SELECT COUNT(*) FROM actividad_sistema $whereClause";
                $stmtCount = $pdo->prepare($sqlCount);
                foreach ($params as $key => $val) {
                    $stmtCount->bindValue($key, $val);
                }
                $stmtCount->execute();
                $totalCount = (int)$stmtCount->fetchColumn();
                
                // Obtener registros paginados
                $sqlData = "SELECT id, fecha, usuario, modulo, accion, descripcion 
                            FROM actividad_sistema 
                            $whereClause 
                            ORDER BY fecha DESC, id DESC 
                            LIMIT :limit OFFSET :offset";
                            
                $stmtData = $pdo->prepare($sqlData);
                foreach ($params as $key => $val) {
                    $stmtData->bindValue($key, $val);
                }
                $stmtData->bindValue(':limit', $limit, PDO::PARAM_INT);
                $stmtData->bindValue(':offset', $offset, PDO::PARAM_INT);
                $stmtData->execute();
                
                $logs = [];
                while ($row = $stmtData->fetch()) {
                    $logs[] = [
                        'id' => $row['id'],
                        'fecha' => $row['fecha'],
                        'usuario' => $row['usuario'],
                        'modulo' => $row['modulo'],
                        'accion' => $row['accion'],
                        'descripcion' => $row['descripcion']
                    ];
                }
                
                $totalPages = ceil($totalCount / $limit) ?: 1;
                
                echo json_encode([
                    'success' => true,
                    'data' => $logs,
                    'total' => $totalCount,
                    'page' => $page,
                    'pages' => $totalPages
                ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
                
            } else {
                // Modo simple para Dashboard (Retorna las últimas 30 en formato compatible)
                $sql = "SELECT fecha, usuario, modulo, accion, descripcion 
                        FROM actividad_sistema 
                        ORDER BY fecha DESC, id DESC 
                        LIMIT 30";
                
                $stmt = $pdo->query($sql);
                $actividades = [];
                
                while ($row = $stmt->fetch()) {
                    // Mapear color para el dot del timeline según descripción o módulo
                    $descLower = strtolower($row['descripcion']);
                    $tipo = 'sistema';
                    if (strpos($descLower, 'elimin') !== false || strpos($descLower, 'crític') !== false || strpos($descLower, 'rojo') !== false) {
                        $tipo = 'rojo';
                    } else if (strpos($descLower, 'edit') !== false || strpos($descLower, 'alerta') !== false || strpos($descLower, 'amarill') !== false || strpos($descLower, 'reubic') !== false) {
                        $tipo = 'amarillo';
                    } else if (strpos($descLower, 'registr') !== false || strpos($descLower, 'apta') !== false || strpos($descLower, 'verd') !== false) {
                        $tipo = 'verde';
                    }
                    
                    $actividades[] = [
                        'fecha' => substr($row['fecha'], 0, 16), // YYYY-MM-DD HH:MM
                        'tipo' => $tipo,
                        'desc' => $row['descripcion'],
                        'meta' => "Usuario: " . $row['usuario'] . " | Módulo: " . $row['modulo']
                    ];
                }
                
                echo json_encode($actividades, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
            }
        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode(['error' => 'Error al obtener actividades: ' . $e->getMessage()]);
        }
        break;

    case 'POST':
        try {
            $data = json_decode(file_get_contents('php://input'), true);
            
            if (!$data || empty($data['modulo']) || empty($data['accion']) || empty($data['descripcion'])) {
                http_response_code(400);
                echo json_encode(['error' => 'Datos insuficientes para registrar la actividad']);
                exit;
            }
            
            $modulo = $data['modulo'];
            $accion = $data['accion'];
            $descripcion = $data['descripcion'];
            $usuario = $data['usuario'] ?? 'Administrador';
            
            registrarActividadSistema($pdo, $modulo, $accion, $descripcion, $usuario);
            
            echo json_encode([
                'success' => true,
                'message' => 'Actividad de auditoría registrada correctamente'
            ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode(['error' => 'Error al registrar actividad: ' . $e->getMessage()]);
        }
        break;

    default:
        http_response_code(405);
        echo json_encode(['error' => 'Método no permitido']);
        break;
}
