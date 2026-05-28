// database/db.js
// Base de datos SQLite usando el módulo nativo de Node.js 22+
// Igual que ChipSail — sin MySQL, sin compilación, sin archivos JSON en /tmp

const path = require('path');

const DB_FILE = process.env.DB_FILE || path.join(__dirname, 'sportdata.db');

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
      id          INTEGER  PRIMARY KEY AUTOINCREMENT,
      full_name   TEXT     NOT NULL,
      email       TEXT     NOT NULL UNIQUE,
      password    TEXT     NOT NULL,
      created_at  DATETIME NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_users_email ON users (email);

    CREATE TABLE IF NOT EXISTS reset_codes (
      user_id  INTEGER PRIMARY KEY,
      code     TEXT    NOT NULL,
      expires  INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS reset_tokens (
      token    TEXT    PRIMARY KEY,
      user_id  INTEGER NOT NULL,
      expires  INTEGER NOT NULL
    );
  `);
  console.log('✅  Schema de usuarios creado/verificado.');
}

const db = {

  getUserByEmail(email) {
    const stmt = getDB().prepare('SELECT * FROM users WHERE email = ?');
    return stmt.get(email) || null;
  },

  getUserById(id) {
    const stmt = getDB().prepare('SELECT * FROM users WHERE id = ?');
    return stmt.get(id) || null;
  },

  insertUser({ full_name, email, password }) {
    const stmt = getDB().prepare(
      'INSERT INTO users (full_name, email, password) VALUES (?, ?, ?)'
    );
    const info = stmt.run(full_name, email, password);
    return Number(info.lastInsertRowid);
  },

  emailExists(email) {
    const stmt = getDB().prepare('SELECT id FROM users WHERE email = ?');
    return !!stmt.get(email);
  },

  updatePassword(userId, hashedPassword) {
    getDB().prepare('UPDATE users SET password = ? WHERE id = ?')
           .run(hashedPassword, userId);
  },

  saveResetCode(userId, code, expires) {
    getDB().prepare(`
      INSERT INTO reset_codes (user_id, code, expires) VALUES (?, ?, ?)
      ON CONFLICT(user_id) DO UPDATE SET code=excluded.code, expires=excluded.expires
    `).run(userId, code, expires);
  },

  getResetCode(userId) {
    return getDB().prepare('SELECT * FROM reset_codes WHERE user_id = ?').get(userId) || null;
  },

  saveResetToken(userId, token, expires) {
    getDB().prepare('DELETE FROM reset_tokens WHERE user_id = ?').run(userId);
    getDB().prepare(
      'INSERT INTO reset_tokens (token, user_id, expires) VALUES (?, ?, ?)'
    ).run(token, userId, expires);
  },

  getUserIdByResetToken(token) {
    const record = getDB().prepare('SELECT * FROM reset_tokens WHERE token = ?').get(token);
    if (!record || Date.now() > record.expires) return null;
    return record.user_id;
  },

  clearResetData(userId) {
    getDB().prepare('DELETE FROM reset_codes  WHERE user_id = ?').run(userId);
    getDB().prepare('DELETE FROM reset_tokens WHERE user_id = ?').run(userId);
  },
};

console.log('✅  Base de datos SQLite inicializada:', DB_FILE);

module.exports = db;
