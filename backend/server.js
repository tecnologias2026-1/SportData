/**
 * ============================================
 * SportData — Backend Server (Node.js + Express)
 * ============================================
 * Ejecutar: npm run dev  (desarrollo)
 *           npm start    (producción)
 * Puerto: http://localhost:3000
 *
 * API RapidAPI: configurar en Settings del panel
 * o en variable de entorno RAPIDAPI_KEY
 */

const express      = require('express');
const cors         = require('cors');
const path         = require('path');

require('./database/db');

const authRoutes     = require('./routes/auth');
const productRoutes  = require('./routes/products');
const settingsRoutes = require('./routes/settings');
const productCache   = require('./services/productCache');

const app  = express();
const PORT = process.env.PORT || 3000;

app.use(cors({ origin: '*', methods: ['GET','POST','PUT','DELETE'], allowedHeaders: ['Content-Type','Authorization'] }));
app.use(express.json());
app.use(express.static(path.join(__dirname, '..')));

app.use('/api/auth',     authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/settings', settingsRoutes);

app.get('/api/health', (req, res) => {
  const cacheStatus = productCache.getStatus();
  res.json({
    status:    'ok',
    message:   'SportData API funcionando correctamente',
    timestamp: new Date().toISOString(),
    products:  cacheStatus,
    rapidapi:  { configured: !!process.env.RAPIDAPI_KEY },
  });
});

app.get('/html/:page', (req, res) => {
  const filePath = path.join(__dirname, '..', 'html', req.params.page);
  res.sendFile(filePath, err => { if (err) res.status(404).send('Página no encontrada'); });
});

app.get('*', (req, res) => {
  if (!req.path.startsWith('/api')) {
    res.sendFile(path.join(__dirname, '..', 'index.html'));
  } else {
    res.status(404).json({ error: 'Ruta no encontrada' });
  }
});

app.listen(PORT, async () => {
  const hasKey = !!process.env.RAPIDAPI_KEY;
  console.log('');
  console.log('  ╔══════════════════════════════════════════════════╗');
  console.log('  ║   SportData Backend — Node.js + RapidAPI         ║');
  console.log('  ╠══════════════════════════════════════════════════╣');
  console.log(`  ║   URL:     http://localhost:${PORT}                  ║`);
  console.log(`  ║   API KEY: ${hasKey ? '✅ Configurada' : '❌ Sin configurar — ve a /html/settings.html'}  ║`);
  console.log('  ╚══════════════════════════════════════════════════╝');
  if (!hasKey) {
    console.log('');
    console.log('  ⚠  Sin RapidAPI key: se mostrarán productos de respaldo.');
    console.log('  → Abre http://localhost:3000/html/settings.html para configurar.');
  }
  console.log('');
  try { await productCache.init(); }
  catch (err) { console.error('  ❌  Error inicializando caché:', err.message); }
});
