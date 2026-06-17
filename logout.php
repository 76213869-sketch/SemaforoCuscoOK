<?php
// logout.php - Cerrar sesión segura para Semáforo Hídrico
require_once __DIR__ . '/config/database.php';

if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

if (isset($_SESSION['usuario_nombre'])) {
    $usuario = $_SESSION['usuario_nombre'];
    
    try {
        $pdo = getDatabaseConnection();
        // Registrar cierre de sesión en bitácora
        registrarActividadSistema($pdo, 'Sistema', 'Cerrar sesión', "Sesión cerrada para el usuario {$usuario}.", $usuario);
    } catch (Exception $e) {
        // Ignorar si hay problemas con la base de datos
    }
}

// Limpiar variables de sesión
$_SESSION = [];

// Destruir cookie de sesión
if (ini_get("session.use_cookies")) {
    $params = session_get_cookie_params();
    setcookie(session_name(), '', time() - 42000,
        $params["path"], $params["domain"],
        $params["secure"], $params["httponly"]
    );
}

// Destruir sesión
session_destroy();

// Redirigir a login
header("Location: login.php");
exit;
