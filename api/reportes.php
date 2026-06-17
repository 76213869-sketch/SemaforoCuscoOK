<?php
header('Content-Type: application/json; charset=utf-8');
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

require_once __DIR__ . '/../config/database.php';
$pdo = getDatabaseConnection();

$method = $_SERVER['REQUEST_METHOD'];

// Validar que el usuario tenga sesión iniciada
validarAccesoAPI(['ADMINISTRADOR', 'OPERADOR', 'INVITADO']);

switch ($method) {
    case 'GET':
        try {
            // 1. Resumen de Viviendas por estado actual
            $stmtViv = $pdo->query("
                SELECT estado_actual, COUNT(*) as cantidad 
                FROM viviendas 
                GROUP BY estado_actual
            ");
            $viviendasResumen = [
                'verde' => 0,
                'amarillo' => 0,
                'rojo' => 0,
                'gris' => 0,
                'total' => 0
            ];
            while ($row = $stmtViv->fetch()) {
                $feEstado = dbToFeEstado($row['estado_actual']);
                $viviendasResumen[$feEstado] = (int)$row['cantidad'];
                $viviendasResumen['total'] += (int)$row['cantidad'];
            }

            // 2. Resumen de Alertas
            $stmtAlertas = $pdo->query("
                SELECT tipo, estado, COUNT(*) as cantidad 
                FROM alertas 
                GROUP BY tipo, estado
            ");
            $alertasResumen = [
                'activas' => [
                    'critica' => 0,
                    'preventiva' => 0,
                    'informativa' => 0,
                    'total' => 0
                ],
                'resueltas' => [
                    'total' => 0
                ],
                'total' => 0
            ];
            while ($row = $stmtAlertas->fetch()) {
                $tipo = dbToFeAlertaTipo($row['tipo']);
                $cantidad = (int)$row['cantidad'];
                
                if ($row['estado'] === 'ACTIVA') {
                    $alertasResumen['activas'][$tipo] = $cantidad;
                    $alertasResumen['activas']['total'] += $cantidad;
                } else {
                    $alertasResumen['resueltas']['total'] += $cantidad;
                }
                $alertasResumen['total'] += $cantidad;
            }

            // 3. Estadísticas Históricas de Análisis (Medias mensuales de pH y Cloro)
            $stmtHist = $pdo->query("
                SELECT DATE_FORMAT(fecha, '%Y-%m') as mes, 
                       AVG(ph) as promedio_ph, 
                       AVG(cloro) as promedio_cloro, 
                       COUNT(*) as total_analisis
                FROM analisis 
                GROUP BY DATE_FORMAT(fecha, '%Y-%m')
                ORDER BY mes ASC
            ");
            $historicoMensual = [];
            while ($row = $stmtHist->fetch()) {
                $historicoMensual[] = [
                    'mes' => $row['mes'],
                    'promedio_ph' => (float)number_format((float)$row['promedio_ph'], 2),
                    'promedio_cloro' => (float)number_format((float)$row['promedio_cloro'], 2),
                    'total_analisis' => (int)$row['total_analisis']
                ];
            }

            // 4. Conteo general
            $stmtTotals = $pdo->query("
                SELECT 
                    (SELECT COUNT(*) FROM viviendas) as total_viviendas,
                    (SELECT COUNT(*) FROM analisis) as total_analisis,
                    (SELECT COUNT(*) FROM usuarios) as total_usuarios
            ");
            $totals = $stmtTotals->fetch();

            echo json_encode([
                'success' => true,
                'totales' => [
                    'viviendas' => (int)$totals['total_viviendas'],
                    'analisis' => (int)$totals['total_analisis'],
                    'usuarios' => (int)$totals['total_usuarios']
                ],
                'viviendas_por_estado' => $viviendasResumen,
                'alertas_resumen' => $alertasResumen,
                'historico_mensual' => $historicoMensual
            ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode(['error' => 'Error al generar reportes: ' . $e->getMessage()]);
        }
        break;

    default:
        http_response_code(405);
        echo json_encode(['error' => 'Método no permitido']);
        break;
}
