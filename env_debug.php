<?php

header('Content-Type: text/plain');

echo "GETENV:\n";
var_dump(getenv('MYSQLHOST'));
var_dump(getenv('MYSQLPORT'));
var_dump(getenv('MYSQLDATABASE'));
var_dump(getenv('MYSQLUSER'));

echo "\n\n_ENV:\n";
var_dump($_ENV['MYSQLHOST'] ?? null);
var_dump($_ENV['MYSQLPORT'] ?? null);
var_dump($_ENV['MYSQLDATABASE'] ?? null);
var_dump($_ENV['MYSQLUSER'] ?? null);

echo "\n\n_SERVER:\n";
var_dump($_SERVER['MYSQLHOST'] ?? null);
var_dump($_SERVER['MYSQLPORT'] ?? null);
var_dump($_SERVER['MYSQLDATABASE'] ?? null);
var_dump($_SERVER['MYSQLUSER'] ?? null);