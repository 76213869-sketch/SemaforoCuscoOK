<?php
// Configuración de base de datos MySQL para Laragon
define('DB_HOST', getenv('MYSQLHOST') ?: 'localhost');
define('DB_USER', getenv('MYSQLUSER') ?: 'root');
define('DB_PASS', getenv('MYSQLPASSWORD') !== false ? getenv('MYSQLPASSWORD') : '');
define('DB_NAME', getenv('MYSQLDATABASE') ?: 'semaforo_hidrico');
define('DB_PORT', getenv('MYSQLPORT') ?: '3306');

/**
 * Retorna una conexión PDO a la base de datos MySQL.
 * Si la base de datos no existe, intenta crearla y ejecutar database.sql.
 */
function getDatabaseConnection() {
    try {
        // Intentar conexión normal
        $pdo = new PDO("mysql:host=" . DB_HOST . ";port=" . DB_PORT . ";dbname=" . DB_NAME . ";charset=utf8", DB_USER, DB_PASS);
        $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
        $pdo->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);

        // Verificar si la tabla 'usuarios' existe. Si no, inicializar la base de datos con database.sql
        $tablesExist = false;
        try {
            $stmt = $pdo->query("SELECT 1 FROM usuarios LIMIT 1");
            $tablesExist = true;
        } catch (PDOException $e) {
            $tablesExist = false;
        }

        if (!$tablesExist) {
            $sqlPath = __DIR__ . '/../database.sql';
            if (file_exists($sqlPath)) {
                $sqlContent = file_get_contents($sqlPath);
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
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8
            ");
        } catch (PDOException $exTable) {
            // Ignorar
        }
        
        // Asegurar la migración de usuarios al nuevo esquema de roles y columnas activo/ultimo_acceso
        try {
            // 1. Primero, expandir el ENUM temporalmente para permitir todos los roles (antiguos y nuevos)
            try {
                $pdo->exec("ALTER TABLE usuarios MODIFY COLUMN rol ENUM('ADMINISTRADOR', 'BRIGADA', 'VECINO', 'OPERADOR', 'INVITADO') NOT NULL DEFAULT 'INVITADO'");
            } catch (PDOException $e) {
                // Ignorar
            }

            // 2. Mapear roles antiguos a nuevos
            try {
                $pdo->exec("UPDATE usuarios SET rol = 'OPERADOR' WHERE rol = 'BRIGADA'");
                $pdo->exec("UPDATE usuarios SET rol = 'INVITADO' WHERE rol = 'VECINO'");
            } catch (PDOException $e) {
                // Ignorar
            }

            // 3. Restringir la columna de rol a los valores finales deseados
            try {
                $pdo->exec("ALTER TABLE usuarios MODIFY COLUMN rol ENUM('ADMINISTRADOR', 'OPERADOR', 'INVITADO') NOT NULL DEFAULT 'INVITADO'");
            } catch (PDOException $e) {
                // Ignorar
            }

            // 3. Agregar columna activo
            try {
                $pdo->exec("ALTER TABLE usuarios ADD COLUMN activo TINYINT DEFAULT 1");
            } catch (PDOException $e) {
                // Ignorar
            }

            // 4. Agregar columna ultimo_acceso
            try {
                $pdo->exec("ALTER TABLE usuarios ADD COLUMN ultimo_acceso DATETIME NULL");
            } catch (PDOException $e) {
                // Ignorar
            }

            // Agregar columna foto_perfil
            try {
                $pdo->exec("ALTER TABLE usuarios ADD COLUMN foto_perfil VARCHAR(255) NULL DEFAULT NULL");
            } catch (PDOException $e) {
                // Ignorar
            }

            // 5. Asegurar usuario admin semilla
            $stmtCheckAdmin = $pdo->prepare("SELECT COUNT(*) FROM usuarios WHERE correo = ?");
            $stmtCheckAdmin->execute(['admin@semaforo.pe']);
            $adminExists = (int)$stmtCheckAdmin->fetchColumn();
            if ($adminExists === 0) {
                $hashedPass = password_hash('admin123', PASSWORD_DEFAULT);
                $stmtInsertAdmin = $pdo->prepare("INSERT INTO usuarios (nombre, correo, password, rol, activo) VALUES (?, ?, ?, 'ADMINISTRADOR', 1)");
                $stmtInsertAdmin->execute(['Administrador', 'admin@semaforo.pe', $hashedPass]);
            }
            
            // Asegurar que el primer usuario (Comité) tenga rol ADMINISTRADOR si no lo tiene
            try {
                $pdo->exec("UPDATE usuarios SET rol = 'ADMINISTRADOR' WHERE id = 1 AND rol != 'ADMINISTRADOR'");
            } catch (PDOException $e) {
                // Ignorar
            }

        } catch (PDOException $exMigrate) {
            // Ignorar errores menores de migración
        }

        return $pdo;
    } catch (PDOException $e) {
        // Código 1049: Base de datos desconocida (Database doesn't exist)
        if ($e->getCode() == 1049 || strpos($e->getMessage(), 'Unknown database') !== false) {
            try {
                // Conectar sin especificar base de datos
                $tempPdo = new PDO("mysql:host=" . DB_HOST . ";port=" . DB_PORT . ";charset=utf8", DB_USER, DB_PASS);
                $tempPdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
                
                // Crear base de datos
                $tempPdo->exec("CREATE DATABASE IF NOT EXISTS " . DB_NAME . " CHARACTER SET utf8 COLLATE utf8_general_ci");
                
                // Conectar a la base de datos recién creada
                $pdo = new PDO("mysql:host=" . DB_HOST . ";port=" . DB_PORT . ";dbname=" . DB_NAME . ";charset=utf8", DB_USER, DB_PASS);
                $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
                $pdo->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);
                
                // Buscar y ejecutar el script database.sql
                $sqlPath = __DIR__ . '/../database.sql';
                if (file_exists($sqlPath)) {
                    $sqlContent = file_get_contents($sqlPath);
                    
                    // Quitar instrucciones de creación de base de datos si ya las ejecutamos
                    // pero para mayor seguridad, limpiamos los comandos USE y ejecutamos todo el script
                    $tempPdo = null; // Cerrar la conexión temporal
                    $sqlContent = preg_replace('/CREATE DATABASE IF NOT EXISTS.*?;/i', '', $sqlContent);
                    $sqlContent = preg_replace('/USE .*?;/i', '', $sqlContent);
                    
                    // Ejecutar el script SQL
                    $pdo->exec($sqlContent);
                }
                
                return $pdo;
            } catch (Exception $ex) {
                header('Content-Type: application/json; charset=utf-8');
                http_response_code(500);
                echo json_encode([
                    'error' => 'No se pudo crear e inicializar la base de datos: ' . $ex->getMessage()
                ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
                exit;
            }
        } else {
            header('Content-Type: application/json; charset=utf-8');
            http_response_code(500);
            echo json_encode([
                'error' => 'Error de conexión a la base de datos: ' . $e->getMessage()
            ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
            exit;
        }
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

