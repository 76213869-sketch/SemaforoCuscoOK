-- Script de inicialización para Semáforo Hídrico Inteligente
-- Base de datos: semaforo_hidrico

CREATE DATABASE IF NOT EXISTS semaforo_hidrico CHARACTER SET utf8 COLLATE utf8_general_ci;
USE semaforo_hidrico;

-- 1. Tabla de Viviendas
CREATE TABLE IF NOT EXISTS viviendas (
    id INT AUTO_INCREMENT PRIMARY KEY,
    codigo VARCHAR(20) UNIQUE NOT NULL,
    propietario VARCHAR(100) NOT NULL,
    direccion VARCHAR(200) NOT NULL,
    sector VARCHAR(100) NOT NULL,
    telefono VARCHAR(20) NULL,
    latitud DECIMAL(10,7) NOT NULL,
    longitud DECIMAL(10,7) NOT NULL,
    estado_actual ENUM('APTA', 'OBSERVACION', 'CRITICA', 'SIN_EVALUAR') DEFAULT 'SIN_EVALUAR',
    fecha_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

-- 2. Tabla de Usuarios (Brigadistas / Administradores)
CREATE TABLE IF NOT EXISTS usuarios (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    correo VARCHAR(100) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    rol ENUM('ADMINISTRADOR', 'OPERADOR', 'INVITADO') NOT NULL DEFAULT 'INVITADO',
    activo TINYINT DEFAULT 1,
    fecha_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ultimo_acceso DATETIME NULL,
    foto_perfil VARCHAR(255) NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

-- 3. Tabla de Análisis (Mediciones de Calidad)
CREATE TABLE IF NOT EXISTS analisis (
    id INT AUTO_INCREMENT PRIMARY KEY,
    vivienda_id INT NOT NULL,
    usuario_id INT NOT NULL,
    fecha DATETIME NOT NULL,
    ph DECIMAL(4,2) NOT NULL,
    cloro DECIMAL(4,2) NOT NULL,
    estado ENUM('APTA', 'OBSERVACION', 'CRITICA') NOT NULL,
    observaciones TEXT NULL,
    favorito BOOLEAN DEFAULT FALSE,
    FOREIGN KEY (vivienda_id) REFERENCES viviendas(id) ON DELETE CASCADE,
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

-- 4. Tabla de Alertas Sanitarias
CREATE TABLE IF NOT EXISTS alertas (
    id INT AUTO_INCREMENT PRIMARY KEY,
    analisis_id INT NOT NULL,
    tipo ENUM('INFORMATIVA', 'PREVENTIVA', 'CRITICA') NOT NULL,
    mensaje TEXT NOT NULL,
    estado ENUM('ACTIVA', 'RESUELTA') DEFAULT 'ACTIVA',
    fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (analisis_id) REFERENCES analisis(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

-- 5. Tabla de Historial de Cambios (Actividad Reciente)
CREATE TABLE IF NOT EXISTS historial_cambios (
    id INT AUTO_INCREMENT PRIMARY KEY,
    usuario_id INT NULL,
    accion VARCHAR(100) NOT NULL,
    descripcion TEXT NOT NULL,
    fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

-- 6. Tabla de Auditoría y Bitácora del Sistema
CREATE TABLE IF NOT EXISTS actividad_sistema (
    id INT AUTO_INCREMENT PRIMARY KEY,
    usuario VARCHAR(100) NOT NULL,
    modulo VARCHAR(100) NOT NULL,
    accion VARCHAR(100) NOT NULL,
    descripcion TEXT NOT NULL,
    fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

-- --- DATOS DE SEMILLA (SEED DATA) ---

-- 1. Insertar usuarios administradores por defecto (password: admin123)
INSERT INTO usuarios (id, nombre, correo, password, rol, activo) VALUES 
(1, 'Comité Universitario', 'comite@cusco.edu.pe', '$2y$10$t35hSj25P0q1V2fD3g.5XOBb86D0XhKkZk.8Vn4m1B04w2F3e1C7G', 'ADMINISTRADOR', 1),
(2, 'Administrador', 'admin@semaforo.pe', '$2y$10$t35hSj25P0q1V2fD3g.5XOBb86D0XhKkZk.8Vn4m1B04w2F3e1C7G', 'ADMINISTRADOR', 1)
ON DUPLICATE KEY UPDATE id=id;

-- 2. Insertar las 24 viviendas iniciales
INSERT INTO viviendas (id, codigo, propietario, direccion, sector, telefono, latitud, longitud, estado_actual) VALUES
(1, 'V-01', 'Vivienda Quispe Condori', 'Av. Viva el Perú Nro. 124', 'Sector Viva el Perú', '984111222', -13.5408, -71.9782, 'APTA'),
(2, 'V-02', 'Vivienda Mamani Tupa', 'Calle Manco Cápac Nro. 450', 'Sector Viva el Perú', '984222333', -13.5415, -71.9791, 'APTA'),
(3, 'V-03', 'Vivienda Tupa Huamán', 'Asoc. Inti Raymi Lote A-12', 'Asoc. Inti Raymi', '984333444', -13.5422, -71.9775, 'APTA'),
(4, 'V-04', 'Vivienda Condori Apaza', 'Pje. Cusco Nro. 15', 'Sector Viva el Perú', '984444555', -13.5398, -71.9789, 'APTA'),
(5, 'V-05', 'Vivienda Huamán Sinka', 'Av. Viva el Perú Nro. 310', 'Sector Viva el Perú', '984555666', -13.5411, -71.9803, 'APTA'),
(6, 'V-06', 'Vivienda Cahuana Qquecca', 'Calle Los Incas Nro. 88', 'Sector Viva el Perú', '984666777', -13.5427, -71.9798, 'APTA'),
(7, 'V-07', 'Vivienda Mendoza Ramos', 'Asoc. San Martín Lote 5', 'Asoc. San Martín', '984777888', -13.5435, -71.9785, 'APTA'),
(8, 'V-08', 'Vivienda Yupanqui Puma', 'Pje. Raymi Lote 14', 'Asoc. Inti Raymi', '984888999', -13.5402, -71.9812, 'APTA'),
(9, 'V-09', 'Vivienda Choque Cutipa', 'Calle Sullpay Nro. 23', 'Sector Viva el Perú', '984999000', -13.5419, -71.9821, 'APTA'),
(10, 'V-10', 'Vivienda Quispe Ccori', 'Av. Viva el Perú Lote C-3', 'Sector Viva el Perú', '984000111', -13.5431, -71.9814, 'APTA'),
(11, 'V-11', 'Vivienda Huanca Ramos', 'Calle Pampa Chica Nro. 12', 'Sector Viva el Perú', '984111333', -13.5442, -71.9802, 'APTA'),
(12, 'V-12', 'Vivienda Clarita Loayza', 'Pje. Ollantaytambo Nro. 4', 'Sector Viva el Perú', '984222444', -13.5391, -71.9801, 'APTA'),
(13, 'V-13', 'Vivienda Sinka Ccoyllor', 'Calle Los Portales Nro. 11', 'Sector Carmen Alto', '984333555', -13.5405, -71.9771, 'OBSERVACION'),
(14, 'V-14', 'Vivienda Apaza Condori', 'Av. Viva el Perú Nro. 502', 'Sector Viva el Perú', '984444666', -13.5417, -71.9765, 'OBSERVACION'),
(15, 'V-15', 'Vivienda Ccori Ramos', 'Asoc. Inti Lote B-8', 'Asoc. Inti Raymi', '984555777', -13.5429, -71.9772, 'OBSERVACION'),
(16, 'V-16', 'Vivienda Qquecca Yupanqui', 'Calle Sacsayhuamán 102', 'Sector Sacsayhuamán', '984666888', -13.5395, -71.9760, 'OBSERVACION'),
(17, 'V-17', 'Vivienda Cutipa Choque', 'Pje. Carmen Alto Lote 7', 'Sector Carmen Alto', '984777999', -13.5448, -71.9789, 'OBSERVACION'),
(18, 'V-18', 'Vivienda Loayza Clarita', 'Calle Los Alisos Nro. 5', 'Sector Viva el Perú', '984888000', -13.5439, -71.9825, 'OBSERVACION'),
(19, 'V-19', 'Vivienda Centeno Mendoza', 'Av. Los Chankas Nro. 24', 'Sector Viva el Perú', '984999111', -13.5409, -71.9832, 'OBSERVACION'),
(20, 'V-20', 'Vivienda Puma Huanca', 'Asoc. Viva el Perú Lote F-4', 'Sector Viva el Perú', '984000222', -13.5425, -71.9839, 'OBSERVACION'),
(21, 'V-21', 'Vivienda Ccoyllor Puma', 'Calle Pampa del Castillo 340', 'Sector Viva el Perú', '984111444', -13.5401, -71.9796, 'CRITICA'),
(22, 'V-22', 'Vivienda Ramos Mamani', 'Av. Viva el Perú Nro. 780', 'Sector Viva el Perú', '984222555', -13.5418, -71.9808, 'CRITICA'),
(23, 'V-23', 'Vivienda Valer Cahuana', 'Pje. Túpac Amaru Lote D-2', 'Sector Viva el Perú', '984333666', -13.5430, -71.9790, 'CRITICA'),
(24, 'V-24', 'Vivienda Tintaya Quispe', 'Calle Wiracocha Nro. 99', 'Sector Viva el Perú', '984444777', -13.5445, -71.9818, 'CRITICA')
ON DUPLICATE KEY UPDATE id=id;

-- 3. Insertar análisis históricos (Semilla correspondiente al 2026-06-03)
INSERT INTO analisis (id, vivienda_id, usuario_id, fecha, ph, cloro, estado, observaciones) VALUES
(1, 1, 1, '2026-06-03 10:15:00', 7.2, 1.10, 'APTA', 'Cloración óptima. Red sin fugas.'),
(2, 2, 1, '2026-06-03 10:15:00', 7.5, 0.95, 'APTA', 'Sin turbidez detectada.'),
(3, 3, 1, '2026-06-03 10:15:00', 6.8, 0.75, 'APTA', 'Muestra tomada de pileta principal.'),
(4, 4, 1, '2026-06-03 10:15:00', 7.0, 1.20, 'APTA', 'Valores estables.'),
(5, 5, 1, '2026-06-03 10:15:00', 8.1, 0.80, 'APTA', 'Ligero sabor mineral aceptable.'),
(6, 6, 1, '2026-06-03 10:15:00', 7.4, 1.05, 'APTA', 'Presión adecuada.'),
(7, 7, 1, '2026-06-03 10:15:00', 6.9, 0.65, 'APTA', 'Conexión nueva.'),
(8, 8, 1, '2026-06-03 10:15:00', 7.6, 1.30, 'APTA', 'Tanque limpio.'),
(9, 9, 1, '2026-06-03 10:15:00', 7.3, 0.90, 'APTA', 'Control de rutina.'),
(10, 10, 1, '2026-06-03 10:15:00', 7.0, 1.15, 'APTA', 'Uso doméstico regular.'),
(11, 11, 1, '2026-06-03 10:15:00', 7.8, 0.70, 'APTA', 'Agua cristalina.'),
(12, 12, 1, '2026-06-03 10:15:00', 7.2, 1.00, 'APTA', 'Dosificación correcta.'),
(13, 13, 1, '2026-06-03 10:15:00', 6.3, 0.80, 'OBSERVACION', 'pH ligeramente ácido. Programar mantenimiento.'),
(14, 14, 1, '2026-06-03 10:15:00', 7.2, 0.40, 'OBSERVACION', 'Cloro bajo el límite óptimo (0.40 mg/L). Hervir agua.'),
(15, 15, 1, '2026-06-03 10:15:00', 8.7, 1.10, 'OBSERVACION', 'pH alcalino elevado. Monitorear captación.'),
(16, 16, 1, '2026-06-03 10:15:00', 7.0, 1.70, 'OBSERVACION', 'Ligero olor a cloro. Concentración alta (1.70 mg/L).'),
(17, 17, 1, '2026-06-03 10:15:00', 6.4, 0.45, 'OBSERVACION', 'pH y cloro levemente bajos. Inspeccionar tramo.'),
(18, 18, 1, '2026-06-03 10:15:00', 8.8, 1.20, 'OBSERVACION', 'Ligera turbidez y pH alto.'),
(19, 19, 1, '2026-06-03 10:15:00', 7.1, 1.80, 'OBSERVACION', 'Exceso preventivo de cloro en acometida.'),
(20, 20, 1, '2026-06-03 10:15:00', 6.2, 1.00, 'OBSERVACION', 'pH bajo. Monitorear corrosión de tubería.'),
(21, 21, 1, '2026-06-03 10:15:00', 5.5, 0.10, 'CRITICA', 'CRÍTICO: Agua muy ácida y casi sin cloro. Alto riesgo biológico.'),
(22, 22, 1, '2026-06-03 10:15:00', 9.4, 2.50, 'CRITICA', 'CRÍTICO: Fuerte olor químico. pH alcalino extremo y exceso de cloro.'),
(23, 23, 1, '2026-06-03 10:15:00', 7.0, 0.00, 'CRITICA', 'CRÍTICO: Sin cloro residual libre detectable. Riesgo de contaminación.'),
(24, 24, 1, '2026-06-03 10:15:00', 4.8, 1.20, 'CRITICA', 'CRÍTICO: pH extremadamente ácido. Posible infiltración química.')
ON DUPLICATE KEY UPDATE id=id;

-- 4. Insertar alertas sanitarias asociadas a la semilla
INSERT INTO alertas (id, analisis_id, tipo, mensaje, estado) VALUES
(1, 1, 'INFORMATIVA', 'Monitoreo de control completado con éxito en Vivienda Quispe Condori (V-01). Agua 100% apta para consumo humano.', 'RESUELTA'),
(2, 13, 'PREVENTIVA', 'Advertencia preventiva por pH en umbral ácido bajo (6.3) en Vivienda Sinka Ccoyllor (V-13). Requiere inspección.', 'ACTIVA'),
(3, 14, 'PREVENTIVA', 'Cloro residual bajo (0.40 mg/L) en Vivienda Apaza Condori (V-14). Hervir agua preventivamente.', 'ACTIVA'),
(4, 15, 'PREVENTIVA', 'pH alcalino elevado (8.7) en Vivienda Ccori Ramos (V-15). Monitorear reservorio.', 'ACTIVA'),
(5, 16, 'PREVENTIVA', 'Concentración preventiva de cloro elevada (1.70 mg/L) en Vivienda Qquecca Yupanqui (V-16).', 'ACTIVA'),
(6, 17, 'PREVENTIVA', 'pH y cloro levemente bajos (pH 6.4, Cloro 0.45 mg/L) en Vivienda Cutipa Choque (V-17).', 'ACTIVA'),
(7, 18, 'PREVENTIVA', 'pH en umbral alcalino alto (8.8) con turbidez en Vivienda Loayza Clarita (V-18).', 'ACTIVA'),
(8, 19, 'PREVENTIVA', 'Cloro residual alto (1.80 mg/L) en Vivienda Centeno Mendoza (V-19).', 'ACTIVA'),
(9, 20, 'PREVENTIVA', 'pH bajo (6.2) en Vivienda Puma Huanca (V-20). Monitorear corrosión de metales.', 'ACTIVA'),
(10, 21, 'CRITICA', '¡CRÍTICO! Suspensión de consumo en Vivienda Ccoyllor Puma (V-21). pH ácido crítico (5.5) y cloro insuficiente (0.10 mg/L).', 'ACTIVA'),
(11, 22, 'CRITICA', '¡CRÍTICO! Exceso de cloro nocivo (2.50 mg/L) y pH alcalino crítico (9.4) en Vivienda Ramos Mamani (V-22).', 'ACTIVA'),
(12, 23, 'CRITICA', '¡CRÍTICO! Sin cloro residual libre detectable (0.00 mg/L) en Vivienda Valer Cahuana (V-23). Alto riesgo patógeno.', 'ACTIVA'),
(13, 24, 'CRITICA', '¡CRÍTICO! pH extremadamente ácido (4.8) en Vivienda Tintaya Quispe (V-24). Posible infiltración.', 'ACTIVA')
ON DUPLICATE KEY UPDATE id=id;

-- 5. Insertar bitácora de actividad reciente
INSERT INTO historial_cambios (id, usuario_id, accion, descripcion, fecha) VALUES
(1, 1, 'sistema', 'Inicialización del sistema de monitoreo vecinal en Laragon.', '2026-06-03 08:30:00'),
(2, 1, 'rojo', 'Alerta crítica detectada en Vivienda Ccoyllor Puma (V-21) | pH 5.5 | Cloro 0.10 mg/L', '2026-06-03 09:15:00'),
(3, 1, 'amarillo', 'Señal preventiva en Vivienda Apaza Condori (V-14) | Cloro bajo (0.40 mg/L)', '2026-06-03 10:00:00'),
(4, 1, 'verde', 'Muestreo exitoso en Vivienda Quispe Condori (V-01) | Valores óptimos registrados', '2026-06-03 11:20:00')
ON DUPLICATE KEY UPDATE id=id;
