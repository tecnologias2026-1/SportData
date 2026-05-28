<?php
header('Content-Type: application/json; charset=UTF-8');
include 'connection.php';
global $conn;

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Método no permitido']);
    exit;
}

// Check if DB connection failed
if (!isset($conn) || $conn === null) {
    http_response_code(500);
    $detail = isset($db_connect_error) ? $db_connect_error : 'Error de conexión desconocido';
    echo json_encode(['success' => false, 'message' => 'Error de conexión a la base de datos', 'detail' => $detail]);
    exit;
}

// Get and sanitize input
$email = trim(filter_input(INPUT_POST, 'email', FILTER_SANITIZE_EMAIL) ?? '');
$password = $_POST['password'] ?? '';

if (empty($email) || empty($password)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Por favor ingresa correo y contraseña']);
    exit;
}

if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Correo electrónico inválido']);
    exit;
}

try {
    // Query user by email
    $stmt = $conn->prepare('SELECT id, nombre, password FROM sportdata.usuarios WHERE correo = ?');
    $stmt->execute([$email]);
    $user = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if (!$user || !password_verify($password, $user['password'])) {
        http_response_code(401);
        echo json_encode(['success' => false, 'message' => 'Correo o contraseña incorrectos']);
        exit;
    }
    
    // Login successful
    echo json_encode([
        'success' => true,
        'message' => 'Inicio de sesión exitoso',
        'user' => [
            'id' => $user['id'],
            'nombre' => $user['nombre'],
            'email' => $email
        ]
    ]);
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Error en el inicio de sesión',
        'detail' => $e->getMessage()
    ]);
}