<?php

header('Content-Type: application/json; charset=UTF-8');
include 'connection.php'; // Asegúrate de que este archivo establece la conexión correctamente
global $conn;

// If connection failed in connection.php, return JSON error instead of raw text
if (!isset($conn) || $conn === null) {
    http_response_code(500);
    $detail = isset($db_connect_error) ? $db_connect_error : 'Error de conexión desconocido';
    echo json_encode(['success' => false, 'message' => 'Error de conexión a la base de datos', 'detail' => $detail]);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Método no permitido']);
    exit;
}

// Sanitizar las entradas
$fullName = trim(filter_input(INPUT_POST, 'fullName', FILTER_SANITIZE_STRING) ?? '');
$email = trim(filter_input(INPUT_POST, 'email', FILTER_SANITIZE_EMAIL) ?? '');
$password = $_POST['password'] ?? '';

// Validar que ningún campo esté vacío
if (empty($fullName) || empty($email) || empty($password)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Todos los campos deben ser completados.']);
    exit;
}

if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Ingresa un correo electrónico válido.']);
    exit;
}

// Encriptar la contraseña
$password_hashed = password_hash($password, PASSWORD_BCRYPT);

try {
    $stmt = $conn->prepare('INSERT INTO sportdata.usuarios (nombre, correo, password) VALUES (?, ?, ?)');
    $stmt->execute([$fullName, $email, $password_hashed]);

    $insertId = $conn->lastInsertId();
    echo json_encode(['success' => true, 'message' => 'Registro exitoso', 'id' => $insertId]);
} catch (PDOException $e) {
    http_response_code(500);
    // Return error detail for debugging (remove in production)
    echo json_encode([
        'success' => false,
        'message' => 'Error en el registro. Intenta de nuevo.',
        'detail' => $e->getMessage()
    ]);
}
