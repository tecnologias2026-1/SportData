<?php
$dsn = "mysql:host=localhost:1900;dbname=sportdata;charset=utf8mb4";
try {
    $pdo = new PDO($dsn, 'root', 'Ad2556229', [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]);
    echo 'DB OK';
} catch (PDOException $e) {
    echo 'ERROR: ' . $e->getMessage();
}
