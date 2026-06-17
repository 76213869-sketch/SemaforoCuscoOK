<?php
header('Content-Type: application/json; charset=utf-8');
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

require_once __DIR__ . '/../config/database.php';

if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

// Validar que el usuario tenga sesión iniciada
if (!isset($_SESSION['usuario_id'])) {
    http_response_code(401);
    echo json_encode(['error' => 'No autorizado. Sesión no iniciada o expirada.']);
    exit;
}

$pdo = getDatabaseConnection();
$usuario_id = (int)$_SESSION['usuario_id'];
$method = $_SERVER['REQUEST_METHOD'];

// Helper para obtener la IP del cliente
function getClientIP() {
    if (!empty($_SERVER['HTTP_CLIENT_IP'])) {
        return $_SERVER['HTTP_CLIENT_IP'];
    } elseif (!empty($_SERVER['HTTP_X_FORWARDED_FOR'])) {
        return $_SERVER['HTTP_X_FORWARDED_FOR'];
    } else {
        return $_SERVER['REMOTE_ADDR'] ?? '127.0.0.1';
    }
}

switch ($method) {
    case 'GET':
        try {
            $stmt = $pdo->prepare("SELECT id, nombre, correo, rol, activo, ultimo_acceso, fecha_registro, foto_perfil FROM usuarios WHERE id = ? LIMIT 1");
            $stmt->execute([$usuario_id]);
            $user = $stmt->fetch();

            if (!$user) {
                http_response_code(404);
                echo json_encode(['error' => 'Usuario no encontrado.']);
                exit;
            }

            echo json_encode([
                'success' => true,
                'user' => [
                    'id' => (int)$user['id'],
                    'nombre' => $user['nombre'],
                    'correo' => $user['correo'],
                    'rol' => $user['rol'],
                    'activo' => (int)$user['activo'],
                    'ultimo_acceso' => $user['ultimo_acceso'],
                    'fecha_registro' => $user['fecha_registro'],
                    'foto_perfil' => $user['foto_perfil']
                ]
            ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);

        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode(['error' => 'Error de servidor: ' . $e->getMessage()]);
        }
        break;

    case 'POST':
        try {
            $action = $_GET['action'] ?? $_POST['action'] ?? '';

            // Obtener datos del usuario actual para auditorías
            $stmtCur = $pdo->prepare("SELECT nombre, correo, password, foto_perfil FROM usuarios WHERE id = ? LIMIT 1");
            $stmtCur->execute([$usuario_id]);
            $curUser = $stmtCur->fetch();
            
            if (!$curUser) {
                http_response_code(404);
                echo json_encode(['error' => 'Usuario actual no encontrado.']);
                exit;
            }

            $ip = getClientIP();

            if ($action === 'update_profile') {
                $nombre = trim($_POST['nombre'] ?? '');
                $correo = trim($_POST['correo'] ?? '');

                if (empty($nombre)) {
                    http_response_code(400);
                    echo json_encode(['error' => 'El nombre completo es obligatorio.']);
                    exit;
                }

                if (strlen($nombre) > 100) {
                    http_response_code(400);
                    echo json_encode(['error' => 'El nombre no puede exceder los 100 caracteres.']);
                    exit;
                }

                if (empty($correo) || !filter_var($correo, FILTER_VALIDATE_EMAIL)) {
                    http_response_code(400);
                    echo json_encode(['error' => 'El correo electrónico no es válido.']);
                    exit;
                }

                // Verificar que el correo no esté duplicado
                $stmtCheck = $pdo->prepare("SELECT id FROM usuarios WHERE correo = ? AND id != ? LIMIT 1");
                $stmtCheck->execute([$correo, $usuario_id]);
                if ($stmtCheck->fetch()) {
                    http_response_code(400);
                    echo json_encode(['error' => 'El correo electrónico ' . $correo . ' ya está registrado por otro usuario.']);
                    exit;
                }

                $foto_path = $curUser['foto_perfil'];
                $foto_cambiada = false;

                // Procesamiento de subida de foto de perfil
                if (isset($_FILES['foto_perfil']) && $_FILES['foto_perfil']['error'] !== UPLOAD_ERR_NO_FILE) {
                    $file = $_FILES['foto_perfil'];

                    if ($file['error'] !== UPLOAD_ERR_OK) {
                        http_response_code(400);
                        echo json_encode(['error' => 'Error al subir la imagen. Código: ' . $file['error']]);
                        exit;
                    }

                    // Validar tamaño (máximo 2 MB)
                    if ($file['size'] > 2 * 1024 * 1024) {
                        http_response_code(400);
                        echo json_encode(['error' => 'El archivo supera el tamaño máximo permitido de 2 MB.']);
                        exit;
                    }

                    // Validar tipo MIME
                    $allowedMimes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
                    $fileMime = mime_content_type($file['tmp_name']);
                    
                    if (!in_array($fileMime, $allowedMimes)) {
                        http_response_code(400);
                        echo json_encode(['error' => 'Formato de imagen no permitido. Solo se aceptan JPG, JPEG, PNG y WEBP.']);
                        exit;
                    }

                    // Sanitizar nombre de archivo y generar nombre único
                    $extension = pathinfo($file['name'], PATHINFO_EXTENSION);
                    if (empty($extension)) {
                        $extension = ($fileMime === 'image/png') ? 'png' : (($fileMime === 'image/webp') ? 'webp' : 'jpg');
                    }
                    $extension = strtolower($extension);
                    $newFilename = 'profile_' . $usuario_id . '_' . bin2hex(random_bytes(8)) . '.' . $extension;

                    // Crear carpeta si no existe
                    $uploadDir = __DIR__ . '/../uploads/perfiles/';
                    if (!file_exists($uploadDir)) {
                        mkdir($uploadDir, 0777, true);
                    }

                    $destPath = $uploadDir . $newFilename;

                    // Recortar en formato cuadrado y redimensionar a 300x300 px
                    $srcImg = null;
                    if ($fileMime === 'image/png') {
                        $srcImg = @imagecreatefrompng($file['tmp_name']);
                    } elseif ($fileMime === 'image/webp') {
                        $srcImg = @imagecreatefromwebp($file['tmp_name']);
                    } else {
                        $srcImg = @imagecreatefromjpeg($file['tmp_name']);
                    }

                    if (!$srcImg) {
                        http_response_code(400);
                        echo json_encode(['error' => 'No se pudo procesar el archivo como imagen válida.']);
                        exit;
                    }

                    // Dimensiones originales
                    $width = imagesx($srcImg);
                    $height = imagesy($srcImg);

                    // Dimensiones del recorte cuadrado
                    $cropSize = min($width, $height);
                    $x = (int)(($width - $cropSize) / 2);
                    $y = (int)(($height - $cropSize) / 2);

                    // Crear imagen de destino 300x300 px
                    $dstImg = imagecreatetruecolor(300, 300);

                    // Preservar transparencia para PNG/WEBP
                    if ($fileMime === 'image/png' || $fileMime === 'image/webp') {
                        imagealphablending($dstImg, false);
                        imagesavealpha($dstImg, true);
                    }

                    // Copiar y redimensionar
                    imagecopyresampled($dstImg, $srcImg, 0, 0, $x, $y, 300, 300, $cropSize, $cropSize);

                    // Guardar en disco
                    $saveResult = false;
                    if ($fileMime === 'image/png') {
                        $saveResult = imagepng($dstImg, $destPath, 8); // compresión 0-9
                    } elseif ($fileMime === 'image/webp') {
                        $saveResult = imagewebp($dstImg, $destPath, 80); // calidad 0-100
                    } else {
                        $saveResult = imagejpeg($dstImg, $destPath, 85); // calidad 0-100
                    }

                    // Liberar recursos
                    imagedestroy($srcImg);
                    imagedestroy($dstImg);

                    if (!$saveResult) {
                        http_response_code(500);
                        echo json_encode(['error' => 'No se pudo guardar la imagen procesada en el servidor.']);
                        exit;
                    }

                    // Eliminar foto anterior si existía
                    if (!empty($curUser['foto_perfil'])) {
                        $oldFilePath = __DIR__ . '/../' . $curUser['foto_perfil'];
                        if (file_exists($oldFilePath)) {
                            @unlink($oldFilePath);
                        }
                    }

                    $foto_path = 'uploads/perfiles/' . $newFilename;
                    $foto_cambiada = true;
                }

                $pdo->beginTransaction();

                // Actualizar en base de datos
                $stmtUpdate = $pdo->prepare("UPDATE usuarios SET nombre = ?, correo = ?, foto_perfil = ? WHERE id = ?");
                $stmtUpdate->execute([$nombre, $correo, $foto_path, $usuario_id]);

                // Actualizar sesión actual
                $_SESSION['usuario_nombre'] = $nombre;

                // Auditoría
                $nombre_actual = $curUser['nombre'];
                
                // Registro general de actualización
                registrarBitacora($pdo, 'Perfil', "Actualización de perfil del usuario: {$nombre_actual} | IP: {$ip}", $usuario_id);
                registrarActividadSistema($pdo, 'Perfil', 'Actualizar perfil', "El usuario {$nombre_actual} actualizó sus datos de perfil (nombre: {$nombre}). IP: {$ip}.", $nombre);

                if ($correo !== $curUser['correo']) {
                    registrarActividadSistema($pdo, 'Perfil', 'Cambio de correo', "El usuario {$nombre_actual} cambió su correo electrónico de {$curUser['correo']} a {$correo}. IP: {$ip}.", $nombre);
                }

                if ($foto_cambiada) {
                    registrarActividadSistema($pdo, 'Perfil', 'Cambio de foto', "El usuario {$nombre_actual} actualizó su foto de perfil. IP: {$ip}.", $nombre);
                }

                $pdo->commit();

                echo json_encode([
                    'success' => true,
                    'message' => 'Perfil actualizado correctamente.',
                    'nombre' => $nombre,
                    'correo' => $correo,
                    'foto_perfil' => $foto_path
                ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);

            } elseif ($action === 'delete_photo') {
                if (empty($curUser['foto_perfil'])) {
                    http_response_code(400);
                    echo json_encode(['error' => 'El usuario no tiene una foto de perfil registrada.']);
                    exit;
                }

                // Eliminar archivo físico
                $oldFilePath = __DIR__ . '/../' . $curUser['foto_perfil'];
                if (file_exists($oldFilePath)) {
                    @unlink($oldFilePath);
                }

                $pdo->beginTransaction();

                $stmtUpdate = $pdo->prepare("UPDATE usuarios SET foto_perfil = NULL WHERE id = ?");
                $stmtUpdate->execute([$usuario_id]);

                // Auditoría
                $nombre_actual = $curUser['nombre'];
                registrarBitacora($pdo, 'Perfil', "Foto de perfil eliminada por el usuario: {$nombre_actual} | IP: {$ip}", $usuario_id);
                registrarActividadSistema($pdo, 'Perfil', 'Eliminación de foto', "El usuario {$nombre_actual} eliminó su foto de perfil. IP: {$ip}.", $nombre_actual);

                $pdo->commit();

                echo json_encode([
                    'success' => true,
                    'message' => 'Foto de perfil eliminada correctamente.'
                ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);

            } elseif ($action === 'update_password') {
                // Obtener JSON del input body o formulario normal
                $data = json_decode(file_get_contents('php://input'), true);
                if (!$data) {
                    $data = $_POST;
                }

                $current_pass = $data['current_password'] ?? '';
                $new_pass = $data['new_password'] ?? '';
                $confirm_pass = $data['confirm_password'] ?? '';

                if (empty($current_pass) || empty($new_pass) || empty($confirm_pass)) {
                    http_response_code(400);
                    echo json_encode(['error' => 'Todos los campos de contraseña son obligatorios.']);
                    exit;
                }

                // Verificar contraseña actual
                if (!password_verify($current_pass, $curUser['password'])) {
                    http_response_code(400);
                    echo json_encode(['error' => 'La contraseña actual es incorrecta.']);
                    exit;
                }

                // Validaciones de complejidad de la nueva contraseña
                if (strlen($new_pass) < 8) {
                    http_response_code(400);
                    echo json_encode(['error' => 'La nueva contraseña debe tener al menos 8 caracteres.']);
                    exit;
                }

                if (!preg_match('/[A-Z]/', $new_pass)) {
                    http_response_code(400);
                    echo json_encode(['error' => 'La nueva contraseña debe contener al menos una letra mayúscula.']);
                    exit;
                }

                if (!preg_match('/[a-z]/', $new_pass)) {
                    http_response_code(400);
                    echo json_encode(['error' => 'La nueva contraseña debe contener al menos una letra minúscula.']);
                    exit;
                }

                if (!preg_match('/[0-9]/', $new_pass)) {
                    http_response_code(400);
                    echo json_encode(['error' => 'La nueva contraseña debe contener al menos un número.']);
                    exit;
                }

                if ($new_pass !== $confirm_pass) {
                    http_response_code(400);
                    echo json_encode(['error' => 'La confirmación de la nueva contraseña no coincide.']);
                    exit;
                }

                $newHash = password_hash($new_pass, PASSWORD_DEFAULT);

                $pdo->beginTransaction();

                $stmtUpdate = $pdo->prepare("UPDATE usuarios SET password = ? WHERE id = ?");
                $stmtUpdate->execute([$newHash, $usuario_id]);

                // Auditoría
                $nombre_actual = $curUser['nombre'];
                registrarBitacora($pdo, 'Perfil', "Contraseña cambiada por el usuario: {$nombre_actual} | IP: {$ip}", $usuario_id);
                registrarActividadSistema($pdo, 'Perfil', 'Cambio de contraseña', "El usuario {$nombre_actual} cambió su contraseña de acceso. IP: {$ip}.", $nombre_actual);

                $pdo->commit();

                echo json_encode([
                    'success' => true,
                    'message' => 'Contraseña actualizada correctamente.'
                ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);

            } else {
                http_response_code(400);
                echo json_encode(['error' => 'Acción de perfil no válida.']);
            }

        } catch (Exception $e) {
            if ($pdo->inTransaction()) {
                $pdo->rollBack();
            }
            http_response_code(500);
            echo json_encode(['error' => 'Error al actualizar el perfil: ' . $e->getMessage()]);
        }
        break;

    default:
        http_response_code(405);
        echo json_encode(['error' => 'Método no permitido.']);
        break;
}
