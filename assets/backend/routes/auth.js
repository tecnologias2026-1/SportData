const express        = require('express');
const bcrypt         = require('bcryptjs');
const jwt            = require('jsonwebtoken');
const db             = require('../database/db');
const authMiddleware = require('../middleware/auth');

const router     = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'sportdata_jwt_secret_2024_cambiar_en_produccion';
const JWT_EXPIRES= process.env.JWT_EXPIRES_IN || '7d';

// REGISTRO — público
router.post('/register', async (req, res) => {
  try {
    const { fullName, email, password } = req.body;

    if (!fullName || !email || !password) {
      return res.status(400).json({ error: 'Todos los campos son requeridos.' });
    }

    if (db.emailExists(email.toLowerCase())) {
      return res.status(409).json({
        error: 'Este correo ya está registrado.',
        fields: { email: 'Este correo ya está en uso.' }
      });
    }

    const hashed = await bcrypt.hash(password, 10);
    const id = db.insertUser({
      full_name: fullName.trim(),
      email:     email.trim().toLowerCase(),
      password:  hashed
    });

    const token = jwt.sign({ id, email }, JWT_SECRET, { expiresIn: JWT_EXPIRES });

    return res.status(201).json({
      message: '¡Cuenta creada exitosamente!',
      token,
      user: { id, fullName: fullName.trim(), email: email.trim().toLowerCase() }
    });
  } catch (err) {
    console.error('Register error:', err);
    return res.status(500).json({ error: 'Error interno del servidor.' });
  }
});

// LOGIN — público
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Correo y contraseña requeridos.' });
    }

    const user = db.getUserByEmail(email.toLowerCase());
    if (!user) {
      return res.status(401).json({
        error: 'Credenciales incorrectas.',
        fields: { email: 'No existe una cuenta con este correo.' }
      });
    }

    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      return res.status(401).json({
        error: 'Credenciales incorrectas.',
        fields: { password: 'Contraseña incorrecta.' }
      });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES }
    );

    return res.json({
      message: '¡Sesión iniciada correctamente!',
      token,
      user: { id: user.id, fullName: user.full_name, email: user.email }
    });
  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({ error: 'Error interno del servidor.' });
  }
});

// ME — protegido
router.get('/me', authMiddleware, (req, res) => {
  const user = db.getUserById(req.user.id);
  if (!user) return res.status(404).json({ error: 'Usuario no encontrado.' });
  res.json({ id: user.id, fullName: user.full_name, email: user.email });
});

// LOGOUT — protegido
router.post('/logout', authMiddleware, (req, res) => {
  res.json({ message: 'Sesión cerrada.' });
});
/**
 * Agregar estas rutas al final de backend/routes/auth.js
 * ANTES de module.exports = router;
 */

// ── SOLICITAR RECUPERACIÓN (genera código) ────────────────────────────────
router.post('/forgot-password', (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'El correo es requerido.' });

    const user = db.getUserByEmail(email.trim().toLowerCase());

    // Siempre responder igual (seguridad — no revelar si existe)
    const genericMsg = 'Si ese correo está registrado, recibirás un código de recuperación.';

    if (!user) return res.json({ message: genericMsg });

    // Generar código de 6 dígitos + expiración 15 min
    const code    = Math.floor(100000 + Math.random() * 900000).toString();
    const expires = Date.now() + 15 * 60 * 1000;

    db.saveResetCode(user.id, code, expires);

    // En producción aquí enviarías el email.
    // En desarrollo devolvemos el código directamente.
    return res.json({
      message: genericMsg,
      dev_code: code,        // <-- solo en desarrollo
      dev_email: user.email  // <-- solo en desarrollo
    });
  } catch (err) {
    console.error('Forgot-password error:', err);
    return res.status(500).json({ error: 'Error interno del servidor.' });
  }
});

// ── VERIFICAR CÓDIGO ──────────────────────────────────────────────────────
router.post('/verify-reset-code', (req, res) => {
  try {
    const { email, code } = req.body;
    if (!email || !code) return res.status(400).json({ error: 'Datos incompletos.' });

    const user = db.getUserByEmail(email.trim().toLowerCase());
    if (!user) return res.status(400).json({ error: 'Código inválido o expirado.' });

    const record = db.getResetCode(user.id);
    if (!record || record.code !== code || Date.now() > record.expires) {
      return res.status(400).json({ error: 'Código inválido o expirado.' });
    }

    // Generar token temporal de reset (válido 10 min)
    const resetToken = require('crypto').randomBytes(32).toString('hex');
    db.saveResetToken(user.id, resetToken, Date.now() + 10 * 60 * 1000);

    return res.json({ message: 'Código correcto.', reset_token: resetToken });
  } catch (err) {
    console.error('Verify-code error:', err);
    return res.status(500).json({ error: 'Error interno del servidor.' });
  }
});

// ── CAMBIAR CONTRASEÑA ────────────────────────────────────────────────────
router.post('/reset-password', async (req, res) => {
  try {
    const { reset_token, new_password } = req.body;
    if (!reset_token || !new_password) {
      return res.status(400).json({ error: 'Datos incompletos.' });
    }

    if (new_password.length < 8 || !/[a-z]/.test(new_password) ||
        !/[A-Z]/.test(new_password) || !/[0-9]/.test(new_password)) {
      return res.status(400).json({
        error: 'La contraseña debe tener al menos 8 caracteres, mayúsculas, minúsculas y números.'
      });
    }

    const userId = db.getUserIdByResetToken(reset_token);
    if (!userId) return res.status(400).json({ error: 'Token inválido o expirado.' });

    const hashed = await bcrypt.hash(new_password, 10);
    db.updatePassword(userId, hashed);
    db.clearResetData(userId);

    return res.json({ message: '¡Contraseña actualizada correctamente!' });
  } catch (err) {
    console.error('Reset-password error:', err);
    return res.status(500).json({ error: 'Error interno del servidor.' });
  }
});
module.exports = router;