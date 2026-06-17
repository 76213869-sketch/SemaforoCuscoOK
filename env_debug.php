<?php
header('Content-Type: text/plain; charset=utf-8');

// Cargar config/database.php para asegurar que getRailwayEnv() esté disponible
require_once __DIR__ . '/config/database.php';

echo "=== DIAGNÓSTICO DE VARIABLES DE ENTORNO EN RAILWAY ===\n\n";

$variables = ['MYSQLHOST', 'MYSQLPORT', 'MYSQLDATABASE', 'MYSQLUSER'];

foreach ($variables as $var) {
    $val = getRailwayEnv($var);
    if ($val !== null && $val !== false && $val !== '') {
        echo "{$var}: DETECTADA (Valor: {$val})\n";
    } else {
        echo "{$var}: NO_DETECTADA\n";
    }
}

// También verificar MYSQLPASSWORD de forma segura sin revelar la contraseña
$pwd = getRailwayEnv('MYSQLPASSWORD');
if ($pwd !== null && $pwd !== false && $pwd !== '') {
    echo "MYSQLPASSWORD: DETECTADA (Mascarada)\n";
} else {
    echo "MYSQLPASSWORD: NO_DETECTADA\n";
}
