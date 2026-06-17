<?php
// Configuración de base de datos MySQL con soporte de entorno Railway

if (!function_exists('getRailwayEnv')) {
    /**
     * Obtiene de forma robusta una variable de entorno, buscando en getenv(),
     * $_ENV, $_SERVER y leyendo directamente /proc/self/environ en entornos Linux.
     */
    function getRailwayEnv($key) {
        $val = getenv($key);
        if ($val !== false && $val !== '') {
            return $val;
        }
        if (isset($_ENV[$key]) && $_ENV[$key] !== '') {
            return $_ENV[$key];
        }
        if (isset($_SERVER[$key]) && $_SERVER[$key] !== '') {
            return $_SERVER[$key];
        }
        
        static $procEnv = null;
        if ($procEnv === null) {
            $procEnv = [];
            if (strtoupper(substr(PHP_OS, 0, 3)) !== 'WIN' && @file_exists('/proc/self/environ')) {
                $data = @file_get_contents('/proc/self/environ');
                if ($data) {
                    $parts = explode("\0", $data);
                    foreach ($parts as $part) {
                        if (strpos($part, '=') !== false) {
                            list($k, $v) = explode('=', $part, 2);
                            $procEnv[$k] = $v;
                        }
                    }
                }
            }
        }
        return $procEnv[$key] ?? null;
    }
}

// Resolver las variables del entorno de Railway de forma robusta
$host = getRailwayEnv('MYSQLHOST') ?: getRailwayEnv('MYSQL_HOST');
$port = getRailwayEnv('MYSQLPORT') ?: getRailwayEnv('MYSQL_PORT');
$dbname = getRailwayEnv('MYSQLDATABASE') ?: getRailwayEnv('MYSQL_DATABASE');
$user = getRailwayEnv('MYSQLUSER') ?: getRailwayEnv('MYSQL_USER');
$password = getRailwayEnv('MYSQLPASSWORD');
if ($password === null || $password === false || $password === '') {
    $password = getRailwayEnv('MYSQL_PASSWORD');
}

$using_url = false;
$url_var = 'NINGUNA';

// Si no existen variables individuales, intentar extraer desde MYSQL_URL o MYSQL_PUBLIC_URL
if (empty($host)) {
    $mysql_url = getRailwayEnv('MYSQL_URL');
    if (!empty($mysql_url)) {
        $using_url = true;
        $url_var = 'MYSQL_URL';
    } else {
        $mysql_url = getRailwayEnv('MYSQL_PUBLIC_URL');
        if (!empty($mysql_url)) {
            $using_url = true;
            $url_var = 'MYSQL_PUBLIC_URL';
        }
    }
    
    if ($using_url) {
        $parsed = parse_url($mysql_url);
        if ($parsed && isset($parsed['host'])) {
            $host = $parsed['host'];
            $port = $parsed['port'] ?? '3306';
            $user = $parsed['user'] ?? '';
            $password = $parsed['pass'] ?? '';
            $dbname = isset($parsed['path']) ? ltrim($parsed['path'], '/') : '';
            if ($dbname && strpos($dbname, '?') !== false) {
                $dbname = explode('?', $dbname)[0];
            }
        }
    }
}

// Si sigue vacío, lanzar excepción descriptiva indicando qué variable falta
if (empty($host)) {
    throw new Exception(
        "Error de configuración: Faltan las variables de entorno de conexión a la base de datos de Railway. " .
        "No se detectaron variables individuales (MYSQLHOST/MYSQL_HOST) ni URLs de conexión (MYSQL_URL/MYSQL_PUBLIC_URL) en el entorno."
    );
}

$is_railway = ($host !== null && $host !== '');

// Definición de constantes para compatibilidad con el resto del proyecto
if (!defined('DB_HOST')) define('DB_HOST', $host);
if (!defined('DB_USER')) define('DB_USER', $user);
if (!defined('DB_PASS')) define('DB_PASS', $password);
if (!defined('DB_NAME')) define('DB_NAME', $dbname);
if (!defined('DB_PORT')) define('DB_PORT', $port);
if (!defined('DB_USING_URL')) define('DB_USING_URL', $using_url);
if (!defined('DB_URL_VAR')) define('DB_URL_VAR', $url_var);
if (!defined('DB_IS_RAILWAY')) define('DB_IS_RAILWAY', $is_railway);

/**
 * Retorna una conexión PDO a la base de datos MySQL.
 * Si las tablas no existen, las inicializa automáticamente desde database.sql.
 */
function getDatabaseConnection() {
    try {
        // Log environment variables before connection attempt
        $rawHost = getRailwayEnv('MYSQLHOST') ?: getRailwayEnv('MYSQL_HOST');
        $rawPort = getRailwayEnv('MYSQLPORT') ?: getRailwayEnv('MYSQL_PORT');
        $rawDb = getRailwayEnv('MYSQLDATABASE') ?: getRailwayEnv('MYSQL_DATABASE');
        $rawUser = getRailwayEnv('MYSQLUSER') ?: getRailwayEnv('MYSQL_USER');
        $rawUrl = getRailwayEnv('MYSQL_URL') ?: getRailwayEnv('MYSQL_PUBLIC_URL');
        
        error_log("[PDO ATTEMPT] DSN: mysql:host=" . DB_HOST . ";port=" . DB_PORT . ";dbname=" . DB_NAME);
        error_log("[PDO ATTEMPT] DB_USER: " . DB_USER);
        error_log("[PDO ATTEMPT] Env State - MYSQLHOST: " . ($rawHost ?? 'NULL') . ", MYSQLPORT: " . ($rawPort ?? 'NULL') . ", MYSQLDATABASE: " . ($rawDb ?? 'NULL') . ", MYSQLUSER: " . ($rawUser ?? 'NULL') . ", MYSQL_URL: " . ($rawUrl !== null ? 'DEFINED' : 'NULL'));

        // Forzar conexión TCP especificando host y port en el DSN
        $dsn = "mysql:host=" . DB_HOST . ";port=" . DB_PORT . ";dbname=" . DB_NAME . ";charset=utf8mb4";
        $pdo = new PDO($dsn, DB_USER, DB_PASS, [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC
        ]);

        // Verificar si la tabla 'usuarios' existe en la base de datos
        $tablesExist = false;
        try {
            $stmt = $pdo->query("SELECT 1 FROM usuarios LIMIT 1");
            $tablesExist = true;
        } catch (PDOException $e) {
            $tablesExist = false;
        }

        // Si la tabla 'usuarios' no existe, inicializar el esquema completo
        if (!$tablesExist) {
            $sqlPath = __DIR__ . '/../database.sql';
            if (file_exists($sqlPath)) {
                $sqlContent = file_get_contents($sqlPath);
                // Sanitizar script SQL eliminando comandos CREATE DATABASE y USE
                $sqlContent = preg_replace('/CREATE DATABASE IF NOT EXISTS.*?;/i', '', $sqlContent);
                $sqlContent = preg_replace('/USE .*?;/i', '', $sqlContent);
                
                $pdo->exec($sqlContent);
            }
        }
        
        // Asegurar que la columna favorito existe
        try {
            $pdo->exec("ALTER TABLE analisis ADD COLUMN favorito BOOLEAN DEFAULT FALSE");
        } catch (PDOException $alterEx) {
            // Ignorar si la columna ya existe
        }

        // Asegurar que la tabla actividad_sistema existe
        try {
            $pdo->exec("
                CREATE TABLE IF NOT EXISTS actividad_sistema (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    usuario VARCHAR(100) NOT NULL,
                    modulo VARCHAR(100) NOT NULL,
                    accion VARCHAR(100) NOT NULL,
                    descripcion TEXT NOT NULL,
                    fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
            ");
        } catch (PDOException $exTable) {
            // Ignorar
        }
        
        // Asegurar la migración de usuarios al nuevo esquema de roles y columnas activo/ultimo_acceso
        try {
            try {
                $pdo->exec("ALTER TABLE usuarios MODIFY COLUMN rol ENUM('ADMINISTRADOR', 'BRIGADA', 'VECINO', 'OPERADOR', 'INVITADO') NOT NULL DEFAULT 'INVITADO'");
            } catch (PDOException $e) {
                // Ignorar
            }

            try {
                $pdo->exec("UPDATE usuarios SET rol = 'OPERADOR' WHERE rol = 'BRIGADA'");
                $pdo->exec("UPDATE usuarios SET rol = 'INVITADO' WHERE rol = 'VECINO'");
            } catch (PDOException $e) {
                // Ignorar
            }

            try {
                $pdo->exec("ALTER TABLE usuarios MODIFY COLUMN rol ENUM('ADMINISTRADOR', 'OPERADOR', 'INVITADO') NOT NULL DEFAULT 'INVITADO'");
            } catch (PDOException $e) {
                // Ignorar
            }

            try {
                $pdo->exec("ALTER TABLE usuarios ADD COLUMN activo TINYINT DEFAULT 1");
            } catch (PDOException $e) {
                // Ignorar
            }

            try {
                $pdo->exec("ALTER TABLE usuarios ADD COLUMN ultimo_acceso DATETIME NULL");
            } catch (PDOException $e) {
                // Ignorar
            }

            try {
                $pdo->exec("ALTER TABLE usuarios ADD COLUMN foto_perfil VARCHAR(255) NULL DEFAULT NULL");
            } catch (PDOException $e) {
                // Ignorar
            }

            // Asegurar usuario admin semilla
            $stmtCheckAdmin = $pdo->prepare("SELECT COUNT(*) FROM usuarios WHERE correo = ?");
            $stmtCheckAdmin->execute(['admin@semaforo.pe']);
            $adminExists = (int)$stmtCheckAdmin->fetchColumn();
            if ($adminExists === 0) {
                $hashedPass = password_hash('admin123', PASSWORD_DEFAULT);
                $stmtInsertAdmin = $pdo->prepare("INSERT INTO usuarios (nombre, correo, password, rol, activo) VALUES (?, ?, ?, 'ADMINISTRADOR', 1)");
                $stmtInsertAdmin->execute(['Administrador', 'admin@semaforo.pe', $hashedPass]);
            }
            
            try {
                $pdo->exec("UPDATE usuarios SET rol = 'ADMINISTRADOR' WHERE id = 1 AND rol != 'ADMINISTRADOR'");
            } catch (PDOException $e) {
                // Ignorar
            }

        } catch (PDOException $exMigrate) {
            // Ignorar
        }

        return $pdo;

     } catch (PDOException $e) {
        // Diagnóstico detallado si falla la conexión
        $envState = [
            'MYSQLHOST' => (getRailwayEnv('MYSQLHOST') !== null || getRailwayEnv('MYSQL_HOST') !== null) ? 'DETECTADA' : 'NO_DETECTADA',
            'MYSQLPORT' => (getRailwayEnv('MYSQLPORT') !== null || getRailwayEnv('MYSQL_PORT') !== null) ? 'DETECTADA' : 'NO_DETECTADA',
            'MYSQLDATABASE' => (getRailwayEnv('MYSQLDATABASE') !== null || getRailwayEnv('MYSQL_DATABASE') !== null) ? 'DETECTADA' : 'NO_DETECTADA',
            'MYSQLUSER' => (getRailwayEnv('MYSQLUSER') !== null || getRailwayEnv('MYSQL_USER') !== null) ? 'DETECTADA' : 'NO_DETECTADA',
            'MYSQL_URL' => (getRailwayEnv('MYSQL_URL') !== null) ? 'DETECTADA' : 'NO_DETECTADA',
            'MYSQL_PUBLIC_URL' => (getRailwayEnv('MYSQL_PUBLIC_URL') !== null) ? 'DETECTADA' : 'NO_DETECTADA'
        ];
        
        $diagMsg = "\n[DIAGNÓSTICO TEMPORAL DE CONEXIÓN]:\n";
        $diagMsg .= "- Evaluado Host (DB_HOST): " . (defined('DB_HOST') ? DB_HOST : 'NULL') . "\n";
        $diagMsg .= "- Evaluado Puerto (DB_PORT): " . (defined('DB_PORT') ? DB_PORT : 'NULL') . "\n";
        $diagMsg .= "- Evaluado DB Name (DB_NAME): " . (defined('DB_NAME') ? DB_NAME : 'NULL') . "\n";
        $diagMsg .= "- Evaluado Usuario (DB_USER): " . (defined('DB_USER') ? DB_USER : 'NULL') . "\n";
        $diagMsg .= "- Usando MYSQL_URL: " . (DB_USING_URL ? 'SI (' . DB_URL_VAR . ')' : 'NO') . "\n";
        $diagMsg .= "- Estado de variables de entorno:\n";
        foreach ($envState as $k => $v) {
            $diagMsg .= "  * {$k} = {$v}\n";
        }
        
        // Lanzar una excepción con el diagnóstico incorporado para el log del servidor y para el front
        throw new Exception($e->getMessage() . $diagMsg, (int)$e->getCode(), $e);
    }
}

/**
 * Helpers para mapear los estados entre MySQL y el frontend
 */
function dbToFeEstado($estado) {
    switch ($estado) {
        case 'APTA': return 'verde';
        case 'OBSERVACION': return 'amarillo';
        case 'CRITICA': return 'rojo';
        default: return 'gris';
    }
}

function feToDbEstado($estado) {
    switch ($estado) {
        case 'verde': return 'APTA';
        case 'amarillo': return 'OBSERVACION';
        case 'rojo': return 'CRITICA';
        default: return 'SIN_EVALUAR';
    }
}

// Helpers adicionales
function dbToFeAlertaTipo($tipo) {
    switch ($tipo) {
        case 'INFORMATIVA': return 'informativa';
        case 'PREVENTIVA': return 'preventiva';
        case 'CRITICA': return 'critica';
        default: return 'informativa';
    }
}

function feToDbAlertaTipo($tipo) {
    switch ($tipo) {
        case 'informativa': return 'INFORMATIVA';
        case 'preventiva': return 'PREVENTIVA';
        case 'critica': return 'CRITICA';
        default: return 'INFORMATIVA';
    }
}

/**
 * Helper para registrar una acción en la bitácora
 */
function registrarBitacora($pdo, $accion, $descripcion, $usuario_id = 1) {
    try {
        $stmt = $pdo->prepare("INSERT INTO historial_cambios (usuario_id, accion, descripcion) VALUES (?, ?, ?)");
        $stmt->execute([$usuario_id, $accion, $descripcion]);
    } catch (Exception $e) {
        // Ignorar
    }
}

/**
 * Helper para registrar actividades en la nueva tabla actividad_sistema
 */
function registrarActividadSistema($pdo, $modulo, $accion, $descripcion, $usuario = 'Administrador') {
    try {
        $stmt = $pdo->prepare("INSERT INTO actividad_sistema (usuario, modulo, accion, descripcion) VALUES (?, ?, ?, ?)");
        $stmt->execute([$usuario, $modulo, $accion, $descripcion]);
    } catch (Exception $e) {
        // Ignorar
    }
}

/**
 * Helper para validar el acceso a las APIs basado en sesión y roles.
 */
function validarAccesoAPI($rolesPermitidos) {
    if (session_status() === PHP_SESSION_NONE) {
        session_start();
    }
    
    if (!isset($_SESSION['usuario_id'])) {
        http_response_code(401);
        header('Content-Type: application/json; charset=utf-8');
        echo json_encode(['error' => 'No autorizado. Sesión no iniciada o expirada.']);
        exit;
    }
    
    if (!in_array($_SESSION['usuario_rol'], $rolesPermitidos)) {
        http_response_code(403);
        header('Content-Type: application/json; charset=utf-8');
        echo json_encode(['error' => 'Acceso denegado. No tiene los permisos necesarios para esta acción.']);
        exit;
    }
}
