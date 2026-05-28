// server.js — SportData Backend
// Endpoints:
//   POST  /api/auth/register
//   POST  /api/auth/login
//   GET   /api/auth/me
//   POST  /api/auth/logout
//   POST  /api/auth/forgot-password
//   POST  /api/auth/verify-reset-code
//   POST  /api/auth/reset-password
//   GET   /api/products  (y sub-rutas)
//   GET   /api/health

const express = require('express');
const cors    = require('cors');

// Inicializar DB antes de rutas
require('./database/db');

const authRoutes    = require('./routes/auth');
const productRoutes = require('./routes/products');
const productCache  = require('./services/productCache');

const app  = express();
const PORT = process.env.PORT || 3000;

// ─── CORS ─────────────────────────────────────────────────────────────────────
// En producción, pon la URL exacta de tu frontend en ALLOWED_ORIGIN
// Ej: https://mi-sportdata.netlify.app
const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || '*';

app.use(cors({
  origin: ALLOWED_ORIGIN === '*'
    ? true                         // permite cualquier origen
    : (origin, cb) => {
        if (!origin || origin === ALLOWED_ORIGIN) return cb(null, true);
        cb(new Error('CORS no permitido para: ' + origin));
      },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
}));

app.use(express.json());

// ─── Rutas API ────────────────────────────────────────────────────────────────
app.use('/api/auth',     authRoutes);
app.use('/api/products', productRoutes);

app.get('/api/health', (req, res) => {
  res.json({
    status:    'ok',
    message:   'SportData API funcionando',
    timestamp: new Date().toISOString(),
    products:  productCache.getStatus(),
  });
});

// Ruta raíz (health check simple)
app.get('/', (req, res) => {
  res.json({ message: 'SportData API v2.0 🚀', status: 'ok' });
});

// 404 para cualquier otra ruta
app.use((req, res) => {
  res.status(404).json({ error: `Ruta no encontrada: ${req.method} ${req.path}` });
});

// ─── Inicio del servidor ──────────────────────────────────────────────────────
app.listen(PORT, async () => {
  console.log('');
  console.log('  ╔══════════════════════════════════════╗');
  console.log('  ║   SportData API — Node.js + SQLite   ║');
  console.log(`  ║   URL:  http://localhost:${PORT}         ║`);
  console.log('  ╚══════════════════════════════════════╝');
  console.log('');
  try {
    await productCache.init();
  } catch (err) {
    console.error('  ❌  Error inicializando caché:', err.message);
  }
});
