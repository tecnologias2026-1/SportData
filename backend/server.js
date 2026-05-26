/**
 * ============================================
 * SportData — Backend Server (Node.js + Express)
 * ============================================
 * Ejecutar: npm run dev  (desarrollo)
 *           npm start    (producción)
 * Puerto: http://localhost:3000
 */

const express = require('express');
const cors    = require('cors');
const path    = require('path');

// Inicializar la base de datos antes de las rutas
require('./database/db');

const authRoutes = require('./routes/auth');

const app  = express();
const PORT = process.env.PORT || 3000;

// ─── Middleware ───────────────────────────────────────────────────────────────

app.use(cors({
  origin: '*',                          // En producción limitar al dominio real
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

// Servir los archivos estáticos del frontend desde la carpeta raíz del proyecto
// La carpeta backend/ está dentro del proyecto, así que subimos un nivel
app.use(express.static(path.join(__dirname, '..')));

// ─── Rutas API ────────────────────────────────────────────────────────────────

app.use('/api/auth', authRoutes);

// Ruta de salud — verifica que el servidor esté activo
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    message: 'SportData API funcionando correctamente',
    timestamp: new Date().toISOString()
  });
});

// ─── Fallback: cualquier ruta no reconocida sirve el index.html ───────────────
app.get('*', (req, res) => {
  // Solo para rutas que NO empiecen con /api
  if (!req.path.startsWith('/api')) {
    res.sendFile(path.join(__dirname, '..', 'index.html'));
  } else {
    res.status(404).json({ error: 'Ruta no encontrada' });
  }
});

// ─── Inicio del servidor ──────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log('');
  console.log('  ╔══════════════════════════════════════╗');
  console.log('  ║   SportData Backend — Node.js        ║');
  console.log('  ╠══════════════════════════════════════╣');
  console.log(`  ║   URL:  http://localhost:${PORT}         ║`);
  console.log('  ║   DB:   SQLite (sportdata.db)        ║');
  console.log('  ╚══════════════════════════════════════╝');
  console.log('');
});
