/**
 * ============================================
 * SportData — Backend Server (Node.js + Express)
 * ============================================
 * Ejecutar: npm run dev  (desarrollo)
 *           npm start    (producción)
 * Puerto: http://localhost:3000
 */

const express      = require('express');
const cors         = require('cors');
const path         = require('path');

// Inicializar la base de datos antes de las rutas
require('./database/db');
// Rutas
const authRoutes    = require('./routes/auth');
const productRoutes = require('./routes/products');
const productCache  = require('./services/productCache');

const app  = express();
const PORT = process.env.PORT || 3000;

// ─── Middleware ───────────────────────────────────────────────────────────────

const allowedOrigins = [
  process.env.FRONTEND_URL,          // URL de Netlify (ej: https://mi-app.netlify.app)
  'http://localhost:3000',
  'http://127.0.0.1:5500',
  'http://127.0.0.1:3000',
];

app.use(cors({
  origin: function(origin, callback) {
    // Permitir sin origin (Postman, curl, SSR)
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin) || !process.env.FRONTEND_URL) {
      return callback(null, true);
    }
    callback(new Error('CORS no permitido para: ' + origin));
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
}));

app.use(express.json());

// Servir los archivos estáticos del frontend
app.use(express.static(path.join(__dirname, '..')));

// ─── Rutas API ────────────────────────────────────────────────────────────────

app.use('/api/auth',     authRoutes);
app.use('/api/products', productRoutes);

// Ruta de salud
app.get('/api/health', (req, res) => {
  const cacheStatus = productCache.getStatus();
  res.json({
    status:    'ok',
    message:   'SportData API funcionando correctamente',
    timestamp: new Date().toISOString(),
    products:  cacheStatus,
  });
});
// Ruta explícita para html/catalog.html
app.get('/html/:page', (req, res) => {
  const filePath = path.join(__dirname, '..', 'html', req.params.page);
  res.sendFile(filePath, err => {
    if (err) res.status(404).send('Página no encontrada');
  });
});
// Fallback: cualquier ruta no API sirve el index.html
app.get('*', (req, res) => {
  if (!req.path.startsWith('/api')) {
    res.sendFile(path.join(__dirname, '..', 'index.html'));
  } else {
    res.status(404).json({ error: 'Ruta no encontrada' });
  }
});

// ─── Inicio del servidor ──────────────────────────────────────────────────────
app.listen(PORT, async () => {
  console.log('');
  console.log('  ╔══════════════════════════════════════════╗');
  console.log('  ║   SportData Backend — Node.js + Scraper  ║');
  console.log('  ╠══════════════════════════════════════════╣');
  console.log(`  ║   URL:  http://localhost:${PORT}             ║`);
  console.log('  ║   DB:   JSON (sportdata.json)            ║');
  console.log('  ║   API:  /api/products                    ║');
  console.log('  ╚══════════════════════════════════════════╝');
  console.log('');

  // Inicializar caché de productos al arrancar
  try {
    await productCache.init();
  } catch (err) {
    console.error('  ❌  Error inicializando caché:', err.message);
  }
});
