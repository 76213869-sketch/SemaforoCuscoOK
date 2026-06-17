<?php
// login.php - Pantalla de Inicio de Sesión para Semáforo Hídrico Cusco
require_once __DIR__ . '/config/database.php';

if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

// Redirigir al panel si ya está autenticado
if (isset($_SESSION['usuario_id'])) {
    header("Location: index.php");
    exit;
}

$error = '';
$emailVal = '';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $email = trim($_POST['email'] ?? '');
    $password = $_POST['password'] ?? '';
    $emailVal = htmlspecialchars($email);

    if (empty($email) || empty($password)) {
        $error = 'Por favor, complete todos los campos.';
    } else {
        try {
            $pdo = getDatabaseConnection();
            
            // Buscar usuario
            $stmt = $pdo->prepare("SELECT * FROM usuarios WHERE correo = ? LIMIT 1");
            $stmt->execute([$email]);
            $user = $stmt->fetch();
            
            if ($user && password_verify($password, $user['password'])) {
                // Verificar si está activo
                if ((int)$user['activo'] !== 1) {
                    $error = 'Su cuenta se encuentra inactiva. Por favor, contacte al administrador.';
                } else {
                    // Iniciar sesión segura
                    session_regenerate_id(true);
                    $_SESSION['usuario_id'] = $user['id'];
                    $_SESSION['usuario_nombre'] = $user['nombre'];
                    $_SESSION['usuario_rol'] = $user['rol'];
                    
                    // Actualizar último acceso
                    $updateStmt = $pdo->prepare("UPDATE usuarios SET ultimo_acceso = NOW() WHERE id = ?");
                    $updateStmt->execute([$user['id']]);
                    
                    // Registrar en bitácora
                    registrarActividadSistema($pdo, 'Sistema', 'Iniciar sesión', "Inicio de sesión exitoso para el usuario {$user['nombre']} con rol {$user['rol']}.", $user['nombre']);
                    
                    // Redirigir
                    header("Location: index.php");
                    exit;
                }
            } else {
                $error = 'El correo electrónico o la contraseña son incorrectos.';
                
                // Registrar intento fallido
                registrarActividadSistema($pdo, 'Sistema', 'Iniciar sesión', "Intento fallido de inicio de sesión para el correo: {$email}.", 'Sistema');
            }
        } catch (Exception $e) {
            $error = 'Error de conexión con el servidor. Inténtelo más tarde.';
        }
    }
}
?>
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Iniciar Sesión - Semáforo Hídrico Cusco</title>
    <!-- Google Fonts Outfit & Inter -->
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=Outfit:wght@500;600;700;800&display=swap" rel="stylesheet">
    
    <style>
        :root {
            --bg-primary: #F8FAFC;
            --bg-card: #FFFFFF;
            --text-primary: #1E293B;
            --text-secondary: #64748B;
            --text-light: #94A3B8;
            --color-primary: #2563EB;
            --color-primary-hover: #1D4ED8;
            --color-primary-light: #DBEAFE;
            --color-red: #EF4444;
            --color-red-light: #FEE2E2;
            --border-color: #E2E8F0;
            --border-radius: 12px;
            --shadow-lg: 0 10px 25px -5px rgba(0, 0, 0, 0.05), 0 8px 10px -6px rgba(0, 0, 0, 0.05);
        }

        * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
        }

        body {
            font-family: 'Inter', sans-serif;
            background-color: var(--bg-primary);
            color: var(--text-primary);
            display: flex;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
            padding: 20px;
        }

        .login-wrapper {
            width: 100%;
            max-width: 440px;
            animation: slideUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards;
            opacity: 0;
        }

        @keyframes slideUp {
            from {
                transform: translateY(30px);
                opacity: 0;
            }
            to {
                transform: translateY(0);
                opacity: 1;
            }
        }

        .login-card {
            background-color: var(--bg-card);
            border-radius: var(--border-radius);
            padding: 40px;
            box-shadow: var(--shadow-lg);
            border: 1px solid var(--border-color);
        }

        .brand-header {
            text-align: center;
            margin-bottom: 32px;
        }

        .brand-logo {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            width: 56px;
            height: 56px;
            background: linear-gradient(135deg, var(--color-primary-light), #EFF6FF);
            color: var(--color-primary);
            border-radius: 14px;
            margin-bottom: 16px;
        }

        .brand-logo svg {
            width: 30px;
            height: 30px;
        }

        .brand-header h1 {
            font-family: 'Outfit', sans-serif;
            font-size: 24px;
            font-weight: 700;
            color: var(--text-primary);
            margin-bottom: 4px;
        }

        .brand-header p {
            font-size: 14px;
            color: var(--text-secondary);
        }

        .alert-error {
            background-color: var(--color-red-light);
            border: 1px solid rgba(239, 68, 68, 0.2);
            color: #B91C1C;
            padding: 12px 16px;
            border-radius: 8px;
            font-size: 13px;
            margin-bottom: 24px;
            display: flex;
            align-items: center;
            gap: 10px;
            line-height: 1.4;
            animation: shake 0.4s ease-in-out;
        }

        @keyframes shake {
            0%, 100% { transform: translateX(0); }
            25% { transform: translateX(-4px); }
            75% { transform: translateX(4px); }
        }

        .form-group {
            margin-bottom: 20px;
            position: relative;
        }

        .form-label {
            display: block;
            font-size: 13px;
            font-weight: 500;
            margin-bottom: 8px;
            color: var(--text-primary);
        }

        .input-wrapper {
            position: relative;
            display: flex;
            align-items: center;
        }

        .form-input {
            width: 100%;
            padding: 11px 16px;
            font-size: 14px;
            font-family: inherit;
            color: var(--text-primary);
            background-color: var(--bg-primary);
            border: 1px solid var(--border-color);
            border-radius: 8px;
            outline: none;
            transition: all 0.2s ease;
        }

        .form-input:focus {
            border-color: var(--color-primary);
            background-color: var(--bg-card);
            box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.12);
        }

        .form-input-password {
            padding-right: 44px;
        }

        .toggle-password-btn {
            position: absolute;
            right: 12px;
            background: none;
            border: none;
            cursor: pointer;
            color: var(--text-secondary);
            display: flex;
            align-items: center;
            justify-content: center;
            outline: none;
            padding: 4px;
            border-radius: 4px;
            transition: color 0.2s ease;
        }

        .toggle-password-btn:hover {
            color: var(--text-primary);
        }

        .toggle-password-btn svg {
            width: 20px;
            height: 20px;
        }

        .form-options {
            display: flex;
            align-items: center;
            justify-content: space-between;
            margin-bottom: 24px;
            font-size: 13px;
        }

        .remember-me {
            display: inline-flex;
            align-items: center;
            gap: 8px;
            cursor: pointer;
            color: var(--text-secondary);
            user-select: none;
        }

        .remember-me input {
            cursor: pointer;
            width: 16px;
            height: 16px;
            border-radius: 4px;
            border: 1px solid var(--border-color);
            accent-color: var(--color-primary);
        }

        .btn-submit {
            display: block;
            width: 100%;
            padding: 12px 24px;
            font-family: inherit;
            font-size: 14px;
            font-weight: 600;
            color: #FFFFFF;
            background-color: var(--color-primary);
            border: none;
            border-radius: 8px;
            cursor: pointer;
            transition: all 0.2s ease;
            box-shadow: 0 4px 6px -1px rgba(37, 99, 235, 0.1), 0 2px 4px -1px rgba(37, 99, 235, 0.06);
        }

        .btn-submit:hover {
            background-color: var(--color-primary-hover);
            transform: translateY(-1px);
            box-shadow: 0 4px 12px rgba(37, 99, 235, 0.2);
        }

        .btn-submit:active {
            transform: translateY(0);
        }

        .footer-text {
            text-align: center;
            font-size: 12px;
            color: var(--text-light);
            margin-top: 24px;
        }
    </style>
</head>
<body>

    <div class="login-wrapper">
        <div class="login-card">
            <div class="brand-header">
                <div class="brand-logo">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M12 22a7 7 0 0 0 7-7c0-4.3-7-11-7-11S5 10.7 5 15a7 7 0 0 0 7 7z"/>
                        <path d="M12 18.5a3.5 3.5 0 0 0 3.5-3.5" stroke-dasharray="3 3"/>
                    </svg>
                </div>
                <h1>Semáforo Hídrico</h1>
                <p>Monitoreo Comunitario - Cusco</p>
            </div>

            <?php if (!empty($error)): ?>
                <div class="alert-error">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink: 0;">
                        <circle cx="12" cy="12" r="10"></circle>
                        <line x1="12" y1="8" x2="12" y2="12"></line>
                        <line x1="12" y1="16" x2="12.01" y2="16"></line>
                    </svg>
                    <span><?php echo $error; ?></span>
                </div>
            <?php endif; ?>

            <form action="login.php" method="POST">
                <div class="form-group">
                    <label class="form-label" for="email">Correo electrónico</label>
                    <div class="input-wrapper">
                        <input class="form-input" type="email" id="email" name="email" value="<?php echo $emailVal; ?>" placeholder="ejemplo@semaforo.pe" required autocomplete="email" autofocus>
                    </div>
                </div>

                <div class="form-group">
                    <label class="form-label" for="password">Contraseña</label>
                    <div class="input-wrapper">
                        <input class="form-input form-input-password" type="password" id="password" name="password" placeholder="••••••••" required autocomplete="current-password">
                        <button type="button" class="toggle-password-btn" id="toggle-password-btn" aria-label="Mostrar contraseña">
                            <!-- SVG de Ojo Cerrado (por defecto) -->
                            <svg id="eye-closed-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                                <line x1="1" y1="1" x2="23" y2="23"></line>
                            </svg>
                            <!-- SVG de Ojo Abierto (oculto por defecto) -->
                            <svg id="eye-open-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display: none;">
                                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                                <circle cx="12" cy="12" r="3"></circle>
                            </svg>
                        </button>
                    </div>
                </div>

                <div class="form-options">
                    <label class="remember-me">
                        <input type="checkbox" name="remember" id="remember">
                        <span>Recordarme</span>
                    </label>
                </div>

                <button class="btn-submit" type="submit">Iniciar sesión</button>
            </form>

            <p class="footer-text">Semáforo Hídrico Cusco &copy; 2026</p>
        </div>
    </div>

    <script>
        const passwordInput = document.getElementById('password');
        const toggleBtn = document.getElementById('toggle-password-btn');
        const eyeClosedIcon = document.getElementById('eye-closed-icon');
        const eyeOpenIcon = document.getElementById('eye-open-icon');

        toggleBtn.addEventListener('click', () => {
            if (passwordInput.type === 'password') {
                passwordInput.type = 'text';
                eyeClosedIcon.style.display = 'none';
                eyeOpenIcon.style.display = 'block';
                toggleBtn.setAttribute('aria-label', 'Ocultar contraseña');
            } else {
                passwordInput.type = 'password';
                eyeClosedIcon.style.display = 'block';
                eyeOpenIcon.style.display = 'none';
                toggleBtn.setAttribute('aria-label', 'Mostrar contraseña');
            }
        });
    </script>
</body>
</html>
