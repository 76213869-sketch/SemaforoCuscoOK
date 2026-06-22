<?php
header('Content-Type: text/plain; charset=utf-8');

// Incluir config/database.php para cargar getRailwayEnv()
require_once __DIR__ . '/config/database.php';

echo "--- GETENV() DIRECTO ---\n";
echo "MYSQLHOST: " . (getenv('MYSQLHOST') !== false ? getenv('MYSQLHOST') : 'NO_DEFINIDA') . "\n";
echo "MYSQLPORT: " . (getenv('MYSQLPORT') !== false ? getenv('MYSQLPORT') : 'NO_DEFINIDA') . "\n";
echo "MYSQLDATABASE: " . (getenv('MYSQLDATABASE') !== false ? getenv('MYSQLDATABASE') : 'NO_DEFINIDA') . "\n";
echo "MYSQLUSER: " . (getenv('MYSQLUSER') !== false ? getenv('MYSQLUSER') : 'NO_DEFINIDA') . "\n";

echo "\n--- DETECCION ROBUSTA (getRailwayEnv) ---\n";
echo "MYSQLHOST: " . (getRailwayEnv('MYSQLHOST') !== null ? getRailwayEnv('MYSQLHOST') : 'NO_DEFINIDA') . "\n";
echo "MYSQLPORT: " . (getRailwayEnv('MYSQLPORT') !== null ? getRailwayEnv('MYSQLPORT') : 'NO_DEFINIDA') . "\n";
echo "MYSQLDATABASE: " . (getRailwayEnv('MYSQLDATABASE') !== null ? getRailwayEnv('MYSQLDATABASE') : 'NO_DEFINIDA') . "\n";
echo "MYSQLUSER: " . (getRailwayEnv('MYSQLUSER') !== null ? getRailwayEnv('MYSQLUSER') : 'NO_DEFINIDA') . "\n";
echo "MYSQL_URL: " . (getRailwayEnv('MYSQL_URL') !== null ? 'DEFINIDA (MASCARADA)' : 'NO_DEFINIDA') . "\n";
echo "MYSQL_PUBLIC_URL: " . (getRailwayEnv('MYSQL_PUBLIC_URL') !== null ? 'DEFINIDA (MASCARADA)' : 'NO_DEFINIDA') . "\n";