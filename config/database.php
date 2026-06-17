<?php
// Configuración de base de datos MySQL con soporte de entorno Railway y fallback local

if (!function_exists('getRailwayEnv')) {
    /**
     * Obtiene de forma robusta una variable de entorno, buscando en getenv(),
     * $_ENV, $_SERVER y leyendo directamente /proc/self/environ en entornos Linux.
     */
    function getRailwayEnv($key) {
        // 1. Intentar getenv()
        $val = getenv($key);
        if ($val !== false && $val !== '') {
            return $val;
        }
        // 2. Intentar $_ENV
        if (isset($_ENV[$key]) && $_ENV[$key] !== '') {
            return $_ENV[$key];
        }
        // 3. Intentar $_SERVER
        if (isset($_SERVER[$key]) && $_SERVER[$key] !== '') {
            return $_SERVER[$key];
        }
        
        // 4. Fallback extremo: Leer /proc/self/environ en Linux (para evadir clear_env = yes en PHP-FPM)
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

// Resolver las variables del entorno de Railway exclusivamente
$host = getRailwayEnv('MYSQLHOST');
$port = getRailwayEnv('MYSQLPORT');
$dbname = getRailwayEnv('MYSQLDATABASE');
$user = getRailwayEnv('MYSQLUSER');
$password = getRailwayEnv('MYSQLPASSWORD');

$is_railway = ($host !== null && $host !== '');

// Definición de constantes para compatibilidad con el resto del proyecto
if (!defined('DB_HOST')) define('DB_HOST', $host);
if (!defined('DB_USER')) define('DB_USER', $user);
if (!defined('DB_PASS')) define('DB_PASS', $password);
if (!defined('DB_NAME')) define('DB_NAME', $dbname);
if (!defined('DB_PORT')) define('DB_PORT', $port);
if (!defined('DB_USING_URL')) define('DB_USING_URL', false);
if (!defined('DB_URL_VAR')) define('DB_URL_VAR', 'NINGUNA');
if (!defined('DB_IS_RAILWAY')) define('DB_IS_RAILWAY', $is_railway);

/**
 * Retorna una conexión PDO a la base de datos MySQL.
 * Si las tablas no existen, las inicializa automáticamente desde database.sql.
 */
function getDatabaseConnection() {
    try {
        // Log environment variables before connection attempt
        $rawHost = getRailwayEnv('MYSQLHOST');
        $rawPort = getRailwayEnv('MYSQLPORT');
        $rawDb = getRailwayEnv('MYSQLDATABASE');
        $rawUser = getRailwayEnv('MYSQLUSER');
        $rawPass = getRailwayEnv('MYSQLPASSWORD');
        
        error_log("[PDO ATTEMPT] DSN: mysql:host=" . DB_HOST . ";port=" . DB_PORT . ";dbname=" . DB_NAME);
        error_log("[PDO ATTEMPT] DB_USER: " . DB_USER);
        error_log("[PDO ATTEMPT] Raw Env Values - MYSQLHOST: " . ($rawHost ?? 'NULL') . ", MYSQLPORT: " . ($rawPort ?? 'NULL') . ", MYSQLDATABASE: " . ($rawDb ?? 'NULL') . ", MYSQLUSER: " . ($rawUser ?? 'NULL') . ", MYSQLPASSWORD: " . ($rawPass !== null ? 'DEFINED' : 'NULL'));

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
            'MYSQLHOST' => (getRailwayEnv('MYSQLHOST') !== null) ? 'DETECTADA (' . getRailwayEnv('MYSQLHOST') . ')' : 'NO_DETECTADA',
            'MYSQLPORT' => (getRailwayEnv('MYSQLPORT') !== null) ? 'DETECTADA (' . getRailwayEnv('MYSQLPORT') . ')' : 'NO_DETECTADA',
            'MYSQLDATABASE' => (getRailwayEnv('MYSQLDATABASE') !== null) ? 'DETECTADA (' . getRailwayEnv('MYSQLDATABASE') . ')' : 'NO_DETECTADA',
            'MYSQLUSER' => (getRailwayEnv('MYSQLUSER') !== null) ? 'DETECTADA (' . getRailwayEnv('MYSQLUSER') . ')' : 'NO_DETECTADA',
            'MYSQLPASSWORD' => (getRailwayEnv('MYSQLPASSWORD') !== null) ? 'DETECTADA (MASCARADA)' : 'NO_DETECTADA'
        ];
        
        $diagMsg = "\n[DIAGNÓSTICO TEMPORAL DE CONEXIÓN]:\n";
        $diagMsg .= "- Evaluado Host (DB_HOST): " . (defined('DB_HOST') ? DB_HOST : 'NULL') . "\n";
        $diagMsg .= "- Evaluado Puerto (DB_PORT): " . (defined('DB_PORT') ? DB_PORT : 'NULL') . "\n";
        $diagMsg .= "- Evaluado DB Name (DB_NAME): " . (defined('DB_NAME') ? DB_NAME : 'NULL') . "\n";
        $diagMsg .= "- Evaluado Usuario (DB_USER): " . (defined('DB_USER') ? DB_USER : 'NULL') . "\n";
        $diagMsg .= "- Origen detectado de Railway: " . (DB_IS_RAILWAY ? 'SI' : 'NO') . "\n";
        $diagMsg .= "- Estado de variables de entorno individuales:\n";
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
        // Log to historial_cambios (tabla original)
        $stmt = $pdo->prepare("INSERT INTO historial_cambios (usuario_id, accion, descripcion) VALUES (?, ?, ?)");
        $stmt->execute([$usuario_id, $accion, $descripcion]);

        // Mapear y registrar en actividad_sistema
        // [DESACTIVADO]: Para evitar duplicaciones ya que todos los controladores llaman ahora directamente a registrarActividadSistema()
        // registrarActividadSistema($pdo, $modulo, $moduloAccion, $descripcion, $usuario);

    } catch (Exception $e) {
        // Ignorar silenciosamente
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
        // Ignorar o logear silenciosamente
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

