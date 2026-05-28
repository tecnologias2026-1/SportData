-- ============================================
-- SportData — Script de base de datos (SQLite)
-- ============================================
-- Este archivo es referencia documental.
-- La creación real ocurre automáticamente en db.js

-- Tabla de usuarios
CREATE TABLE IF NOT EXISTS users (
  id         INTEGER  PRIMARY KEY AUTOINCREMENT,
  full_name  TEXT     NOT NULL,
  email      TEXT     UNIQUE NOT NULL,
  password   TEXT     NOT NULL,                  -- bcrypt hash
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de tokens de refresco (sesiones)
CREATE TABLE IF NOT EXISTS refresh_tokens (
  id         INTEGER  PRIMARY KEY AUTOINCREMENT,
  user_id    INTEGER  NOT NULL,
  token      TEXT     NOT NULL,
  expires_at DATETIME NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Índice para búsqueda rápida por email
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- Índice para tokens por usuario
CREATE INDEX IF NOT EXISTS idx_tokens_user ON refresh_tokens(user_id);
