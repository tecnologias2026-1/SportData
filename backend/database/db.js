// database/db.js
// Base de datos SQLite usando el módulo nativo de Node.js 22+
// Sin dependencias externas, sin compilación. Igual que ChipSail.

'use strict';

const path = require('path');
const fs   = require('fs');

// Render: filesystem read-only excepto /tmp
// Local: usar carpeta database/
const DB_FILE = process.env.DB_FILE || (() => {
  const local = path.join(__dirname, 'sportdata.db');
  try {
    fs.accessSync(__dirname, fs.constants.W_OK);
    return local;
  } catch {
    return '/tmp/sportdata.db';
  }
})();

let _db;

function getDB() {
  if (!_db) {
    const { DatabaseSync } = require('node:sqlite');
    _db = new DatabaseSync(DB_FILE);
    _db.exec('PRAGMA journal_mode = WAL');
    _db.exec('PRAGMA foreign_keys = ON');
    initSchema(_db);
  }
  return _db;
}

function initSchema(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id         INTEGER  PRIMARY KEY AUTOINCREMENT,
      full_name  TEXT     NOT NULL,
      email      TEXT     NOT NULL UNIQUE,
      password   TEXT     NOT NULL,
      created_at DATETIME NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_users_email ON users (email);

    CREATE TABLE IF NOT EXISTS reset_codes (
      user_id  INTEGER NOT NULL,
      code     TEXT    NOT NULL,
      expires  INTEGER NOT NULL,
      PRIMARY KEY (user_id)
    );

    CREATE TABLE IF NOT EXISTS reset_tokens (
      token    TEXT    NOT NULL PRIMARY KEY,
      user_id  INTEGER NOT NULL,
      expires  INTEGER NOT NULL
    );
  `);
  console.log(`✅  DB SportData inicializada: ${DB_FILE}`);
}

function query(sql, params = []) {
  const db      = getDB();
  const trimmed = sql.trim().toUpperCase();

  if (trimmed.startsWith('SELECT')) {
    return db.prepare(sql).all(...params);
  }
  if (trimmed.startsWith('INSERT')) {
    const info = db.prepare(sql).run(...params);
    return { insertId: info.lastInsertRowid, affectedRows: info.changes };
  }
  const info = db.prepare(sql).run(...params);
  return { affectedRows: info.changes };
}

// ── API pública (mismo contrato que el db.js original) ───────────────────────

const db = {
  getUserByEmail(email) {
    const rows = query('SELECT * FROM users WHERE email = ? LIMIT 1', [email]);
    return rows[0] || null;
  },

  getUserById(id) {
    const rows = query('SELECT * FROM users WHERE id = ? LIMIT 1', [id]);
    return rows[0] || null;
  },

  emailExists(email) {
    const rows = query('SELECT id FROM users WHERE email = ? LIMIT 1', [email]);
    return rows.length > 0;
  },

  insertUser({ full_name, email, password }) {
    const result = query(
      'INSERT INTO users (full_name, email, password) VALUES (?, ?, ?)',
      [full_name, email, password]
    );
    return result.insertId;
  },

  saveResetCode(userId, code, expires) {
    query(
      'INSERT OR REPLACE INTO reset_codes (user_id, code, expires) VALUES (?, ?, ?)',
      [userId, code, expires]
    );
  },

  getResetCode(userId) {
    const rows = query('SELECT * FROM reset_codes WHERE user_id = ? LIMIT 1', [userId]);
    return rows[0] || null;
  },

  saveResetToken(userId, token, expires) {
    query(
      'INSERT OR REPLACE INTO reset_tokens (token, user_id, expires) VALUES (?, ?, ?)',
      [token, userId, expires]
    );
  },

  getUserIdByResetToken(token) {
    const rows = query(
      'SELECT user_id, expires FROM reset_tokens WHERE token = ? LIMIT 1',
      [token]
    );
    if (!rows[0] || Date.now() > rows[0].expires) return null;
    return rows[0].user_id;
  },

  updatePassword(userId, hashedPassword) {
    query('UPDATE users SET password = ? WHERE id = ?', [hashedPassword, userId]);
  },

  clearResetData(userId) {
    query('DELETE FROM reset_codes  WHERE user_id = ?', [userId]);
    query('DELETE FROM reset_tokens WHERE user_id = ?', [userId]);
  },
};

// Inicializar al cargar el módulo
getDB();

module.exports = db;
