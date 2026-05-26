/**
 * ============================================
 * SportData — Base de datos en archivo JSON
 * ============================================
 * Reemplaza better-sqlite3 (requería compilación).
 * Los datos se guardan en: database/sportdata.json
 *
 * Estructura del archivo:
 * {
 *   "users": [ { id, full_name, email, password, created_at } ],
 *   "next_id": 2
 * }
 */

const fs   = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, 'sportdata.json');

// ─── Leer todos los datos ─────────────────────────────────────────────────────
function read() {
  if (!fs.existsSync(DB_PATH)) {
    return { users: [], next_id: 1 };
  }
  try {
    return JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
  } catch {
    return { users: [], next_id: 1 };
  }
}

// ─── Guardar todos los datos ──────────────────────────────────────────────────
function write(data) {
  fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2), 'utf8');
}

// ─── API pública ──────────────────────────────────────────────────────────────

const db = {

  // Buscar un usuario por email
  getUserByEmail(email) {
    const { users } = read();
    return users.find(u => u.email === email) || null;
  },

  // Buscar un usuario por id
  getUserById(id) {
    const { users } = read();
    return users.find(u => u.id === id) || null;
  },

  // Insertar un nuevo usuario — devuelve el id generado
  insertUser({ full_name, email, password }) {
    const data = read();
    const newUser = {
      id:         data.next_id,
      full_name,
      email,
      password,
      created_at: new Date().toISOString()
    };
    data.users.push(newUser);
    data.next_id += 1;
    write(data);
    return newUser.id;
  },

  // Verificar si un email ya existe
  emailExists(email) {
    const { users } = read();
    return users.some(u => u.email === email);
  },
  /**
 * Agregar estos métodos al objeto db en backend/database/db.js
 * Pegar ANTES de la línea:  module.exports = db;
 */

  // ── Reset de contraseña ───────────────────────────────────────────────────

  saveResetCode(userId, code, expires) {
    const data = read();
    if (!data.reset_codes) data.reset_codes = {};
    data.reset_codes[userId] = { code, expires };
    write(data);
  },

  getResetCode(userId) {
    const data = read();
    return (data.reset_codes || {})[userId] || null;
  },

  saveResetToken(userId, token, expires) {
    const data = read();
    if (!data.reset_tokens) data.reset_tokens = {};
    data.reset_tokens[token] = { userId, expires };
    write(data);
  },

  getUserIdByResetToken(token) {
    const data = read();
    const record = (data.reset_tokens || {})[token];
    if (!record || Date.now() > record.expires) return null;
    return record.userId;
  },

  updatePassword(userId, hashedPassword) {
    const data = read();
    const user = data.users.find(u => u.id === userId);
    if (user) {
      user.password = hashedPassword;
      write(data);
    }
  },

  clearResetData(userId) {
    const data = read();
    if (data.reset_codes) delete data.reset_codes[userId];
    // Limpiar tokens de este usuario
    if (data.reset_tokens) {
      Object.keys(data.reset_tokens).forEach(t => {
        if (data.reset_tokens[t].userId === userId) delete data.reset_tokens[t];
      });
    }
    write(data);
  },

};

console.log('  ✔  Base de datos JSON inicializada: sportdata.json');



module.exports = db;
