<?php

header('Content-Type: text/plain');

echo "=== _ENV ===\n";
print_r($_ENV);

echo "\n=== _SERVER ===\n";
print_r(array_filter($_SERVER, function($k){
    return strpos($k,'MYSQL') !== false
        || strpos($k,'RAILWAY') !== false
        || strpos($k,'PRUEBA') !== false;
}, ARRAY_FILTER_USE_KEY));

echo "\n=== getenv(PRUEBA) ===\n";
var_dump(getenv('PRUEBA'));