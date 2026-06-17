<?php
header('Content-Type: application/json; charset=utf-8');
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

require_once __DIR__ . '/../config/database.php';

// Restricted strictly to ADMINISTRADOR
validarAccesoAPI(['ADMINISTRADOR']);

$pdo = getDatabaseConnection();
$method = $_SERVER['REQUEST_METHOD'];
$usuario_actual = $_SESSION['usuario_nombre'] ?? 'Administrador';
$usuario_actual_id = $_SESSION['usuario_id'] ?? 1;

switch ($method) {
    case 'GET':
        try {
            $stmt = $pdo->query("SELECT id, nombre, correo, rol, activo, ultimo_acceso, fecha_registro FROM usuarios ORDER BY id ASC");
            $usuarios = [];
            while ($row = $stmt->fetch()) {
                $usuarios[] = [
                    'id' => (int)$row['id'],
                    'nombre' => $row['nombre'],
                    'correo' => $row['correo'],
                    'rol' => $row['rol'],
                    'activo' => (int)$row['activo'],
                    'ultimo_acceso' => $row['ultimo_acceso'],
                    'fecha_registro' => $row['fecha_registro']
                ];
            }
            echo json_encode($usuarios, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode(['error' => 'Error al obtener usuarios: ' . $e->getMessage()]);
        }
        break;

    case 'POST':
        try {
            $data = json_decode(file_get_contents('php://input'), true);
            if (!$data || empty($data['nombre']) || empty($data['correo']) || empty($data['password']) || empty($data['rol'])) {
                http_response_code(400);
                echo json_encode(['error' => 'Datos insuficientes para registrar el usuario']);
                exit;
            }

            $nombre = trim($data['nombre']);
            $correo = trim($data['correo']);
            $password = $data['password'];
            $rol = trim($data['rol']);
            $activo = isset($data['activo']) ? (int)$data['activo'] : 1;

            if (!in_array($rol, ['ADMINISTRADOR', 'OPERADOR', 'INVITADO'])) {
                http_response_code(400);
                echo json_encode(['error' => 'Rol inválido']);
                exit;
            }

            // Verificar si el correo ya existe
            $stmtCheck = $pdo->prepare("SELECT id FROM usuarios WHERE correo = ?");
            $stmtCheck->execute([$correo]);
            if ($stmtCheck->fetch()) {
                http_response_code(400);
                echo json_encode(['error' => 'El correo electrónico ' . $correo . ' ya está registrado']);
                exit;
            }

            $hashedPass = password_hash($password, PASSWORD_DEFAULT);

            $pdo->beginTransaction();
            $stmt = $pdo->prepare("INSERT INTO usuarios (nombre, correo, password, rol, activo) VALUES (?, ?, ?, ?, ?)");
            $stmt->execute([$nombre, $correo, $hashedPass, $rol, $activo]);
            $newId = $pdo->lastInsertId();

            // Auditoría
            registrarBitacora($pdo, 'sistema', "Nuevo Usuario creado: {$nombre} ({$correo}) | Rol: {$rol}", $usuario_actual_id);
            registrarActividadSistema($pdo, 'Usuarios', 'Crear usuario', "Usuario {$nombre} ({$correo}) registrado con rol {$rol}", $usuario_actual);

            $pdo->commit();

            echo json_encode([
                'success' => true,
                'message' => 'Usuario registrado correctamente',
                'usuario' => [
                    'id' => $newId,
                    'nombre' => $nombre,
                    'correo' => $correo,
                    'rol' => $rol,
                    'activo' => $activo,
                    'ultimo_acceso' => null,
                    'fecha_registro' => date('Y-m-d H:i:s')
                ]
            ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);

        } catch (Exception $e) {
            if ($pdo->inTransaction()) {
                $pdo->rollBack();
            }
            http_response_code(500);
            echo json_encode(['error' => 'Error al registrar usuario: ' . $e->getMessage()]);
        }
        break;

    case 'PUT':
        try {
            $data = json_decode(file_get_contents('php://input'), true);
            if (!$data || empty($data['id']) || empty($data['nombre']) || empty($data['correo']) || empty($data['rol'])) {
                http_response_code(400);
                echo json_encode(['error' => 'Datos insuficientes para actualizar el usuario']);
                exit;
            }

            $id = (int)$data['id'];
            $nombre = trim($data['nombre']);
            $correo = trim($data['correo']);
            $rol = trim($data['rol']);
            $activo = isset($data['activo']) ? (int)$data['activo'] : 1;
            $password = !empty($data['password']) ? $data['password'] : null;

            if (!in_array($rol, ['ADMINISTRADOR', 'OPERADOR', 'INVITADO'])) {
                http_response_code(400);
                echo json_encode(['error' => 'Rol inválido']);
                exit;
            }

            // Obtener el usuario actual antes de la edición
            $stmt = $pdo->prepare("SELECT * FROM usuarios WHERE id = ?");
            $stmt->execute([$id]);
            $userBefore = $stmt->fetch();

            if (!$userBefore) {
                http_response_code(404);
                echo json_encode(['error' => 'Usuario no encontrado']);
                exit;
            }

            // No permitir desactivarse a sí mismo
            if ($id === $usuario_actual_id && $activo === 0) {
                http_response_code(400);
                echo json_encode(['error' => 'No puedes desactivar tu propia cuenta de administrador']);
                exit;
            }

            // No permitir cambiarse el rol a sí mismo
            if ($id === $usuario_actual_id && $rol !== $userBefore['rol']) {
                http_response_code(400);
                echo json_encode(['error' => 'No puedes cambiar tu propio rol de administrador']);
                exit;
            }

            // Verificar si el correo pertenece a otro usuario
            $stmtCheck = $pdo->prepare("SELECT id FROM usuarios WHERE correo = ? AND id != ?");
            $stmtCheck->execute([$correo, $id]);
            if ($stmtCheck->fetch()) {
                http_response_code(400);
                echo json_encode(['error' => 'El correo electrónico ' . $correo . ' ya está en uso por otro usuario']);
                exit;
            }

            $pdo->beginTransaction();

            if ($password) {
                $hashedPass = password_hash($password, PASSWORD_DEFAULT);
                $stmtUpdate = $pdo->prepare("UPDATE usuarios SET nombre = ?, correo = ?, password = ?, rol = ?, activo = ? WHERE id = ?");
                $stmtUpdate->execute([$nombre, $correo, $hashedPass, $rol, $activo, $id]);
            } else {
                $stmtUpdate = $pdo->prepare("UPDATE usuarios SET nombre = ?, correo = ?, rol = ?, activo = ? WHERE id = ?");
                $stmtUpdate->execute([$nombre, $correo, $rol, $activo, $id]);
            }

            // Registrar auditorías específicas
            if ($rol !== $userBefore['rol']) {
                registrarActividadSistema($pdo, 'Usuarios', 'Editar usuario', "Rol del usuario {$nombre} modificado a {$rol}", $usuario_actual);
            }
            if ($activo !== (int)$userBefore['activo']) {
                $estadoStr = $activo ? 'ACTIVADA' : 'DESACTIVADA';
                registrarActividadSistema($pdo, 'Usuarios', 'Editar usuario', "Cuenta del usuario {$nombre} {$estadoStr}", $usuario_actual);
            }
            
            registrarActividadSistema($pdo, 'Usuarios', 'Editar usuario', "Se editaron los datos generales del usuario {$nombre}.", $usuario_actual);
            registrarBitacora($pdo, 'sistema', "Edición de datos de usuario: {$nombre} ({$correo})", $usuario_actual_id);

            $pdo->commit();

            echo json_encode([
                'success' => true,
                'message' => 'Usuario actualizado correctamente'
            ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);

        } catch (Exception $e) {
            if ($pdo->inTransaction()) {
                $pdo->rollBack();
            }
            http_response_code(500);
            echo json_encode(['error' => 'Error al actualizar usuario: ' . $e->getMessage()]);
        }
        break;

    case 'DELETE':
        try {
            // Obtener ID a eliminar
            $id = isset($_GET['id']) ? (int)$_GET['id'] : null;
            if (!$id) {
                // Alternativa: leer JSON
                $data = json_decode(file_get_contents('php://input'), true);
                $id = isset($data['id']) ? (int)$data['id'] : null;
            }

            if (!$id) {
                http_response_code(400);
                echo json_encode(['error' => 'ID de usuario no especificado']);
                exit;
            }

            // Buscar usuario a eliminar
            $stmtUser = $pdo->prepare("SELECT nombre, rol, activo FROM usuarios WHERE id = ?");
            $stmtUser->execute([$id]);
            $userToDelete = $stmtUser->fetch();

            if (!$userToDelete) {
                http_response_code(404);
                echo json_encode(['error' => 'Usuario no encontrado']);
                exit;
            }

            // Restricción: No puede eliminar su propia cuenta mientras está conectado
            if ($id === $usuario_actual_id) {
                http_response_code(400);
                echo json_encode(['error' => 'No puede eliminar su propia cuenta mientras está conectado.']);
                exit;
            }

            // Restricción: Debe existir al menos un administrador activo en el sistema
            if ($userToDelete['rol'] === 'ADMINISTRADOR' && (int)$userToDelete['activo'] === 1) {
                $stmtAdmins = $pdo->query("SELECT COUNT(*) FROM usuarios WHERE rol = 'ADMINISTRADOR' AND activo = 1");
                $activeAdminsCount = (int)$stmtAdmins->fetchColumn();
                if ($activeAdminsCount <= 1) {
                    http_response_code(400);
                    echo json_encode(['error' => 'Debe existir al menos un administrador activo en el sistema.']);
                    exit;
                }
            }

            $pdo->beginTransaction();

            // Eliminar el registro
            $stmtDel = $pdo->prepare("DELETE FROM usuarios WHERE id = ?");
            $stmtDel->execute([$id]);

            // Obtener IP
            $ip = '127.0.0.1';
            if (!empty($_SERVER['HTTP_CLIENT_IP'])) {
                $ip = $_SERVER['HTTP_CLIENT_IP'];
            } elseif (!empty($_SERVER['HTTP_X_FORWARDED_FOR'])) {
                $ip = $_SERVER['HTTP_X_FORWARDED_FOR'];
            } else {
                $ip = $_SERVER['REMOTE_ADDR'] ?? '127.0.0.1';
            }

            // Registrar en la bitácora
            $nombreEliminado = $userToDelete['nombre'];
            registrarBitacora($pdo, 'sistema', "Administrador eliminó permanentemente al usuario: {$nombreEliminado} | IP: {$ip}", $usuario_actual_id);
            registrarActividadSistema($pdo, 'Usuarios', 'Eliminar usuario', "Administrador eliminó permanentemente al usuario: {$nombreEliminado}. IP de origen: {$ip}.", $usuario_actual);

            $pdo->commit();

            echo json_encode([
                'success' => true,
                'message' => 'Usuario eliminado correctamente.'
            ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);

        } catch (Exception $e) {
            if ($pdo->inTransaction()) {
                $pdo->rollBack();
            }
            http_response_code(500);
            echo json_encode(['error' => 'Error al eliminar usuario: ' . $e->getMessage()]);
        }
        break;

    default:
        http_response_code(405);
        echo json_encode(['error' => 'Método no permitido']);
        break;
}
