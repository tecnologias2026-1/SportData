<?php
$servername = "localhost:3306";
$username = "root";
$password = "Hola1234";
$dbname = "sportdata";



$dsn = "mysql:host=$servername;dbname=$dbname;charset=utf8mb4";
$options = [
    PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    PDO::ATTR_EMULATE_PREPARES => false,
];

try {
    $conn = new PDO($dsn, $username, $password, $options);
} catch (PDOException $e) {
    // Do not terminate the script here; return error information to the caller.
    $conn = null;
    $db_connect_error = 'Conexión fallida: ' . $e->getMessage();
}
?>