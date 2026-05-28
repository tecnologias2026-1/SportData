/**
 * ============================================
 * SportData — Settings API Route
 * ============================================
 * POST /api/settings/rapidapi-key  → guardar la clave
 * GET  /api/settings/status        → estado actual
 * POST /api/settings/refresh       → forzar refresco del catálogo
 */

'use strict';

const express = require('express');
const fs      = require('fs');
const path    = require('path');
const cache   = require('../services/productCache');

const router   = express.Router();
const ENV_FILE = path.join(__dirname, '..', '..', '.env');

/* ── Helper: leer y escribir .env ── */
function readEnvFile() {
  if (!fs.existsSync(ENV_FILE)) return '';
  return fs.readFileSync(ENV_FILE, 'utf8');
}

function writeEnvKey(key, value) {
  let content = readEnvFile();
  const regex = new RegExp(`^${key}=.*$`, 'm');
  if (regex.test(content)) {
    content = content.replace(regex, `${key}=${value}`);
  } else {
    content = content.trimEnd() + `\n${key}=${value}\n`;
  }
  fs.writeFileSync(ENV_FILE, content, 'utf8');
}

/* ─────────────────────────────────────────────
   POST /api/settings/rapidapi-key
   Body: { key: "YOUR_KEY_HERE" }
───────────────────────────────────────────── */
router.post('/rapidapi-key', async (req, res) => {
  const { key } = req.body;

  if (!key || typeof key !== 'string' || key.trim().length < 10) {
    return res.status(400).json({ ok: false, error: 'Clave inválida. Debe tener al menos 10 caracteres.' });
  }

  const trimmed = key.trim();

  // Guardar en proceso actual
  process.env.RAPIDAPI_KEY = trimmed;

  // Persistir en .env
  try {
    writeEnvKey('RAPIDAPI_KEY', trimmed);
  } catch (err) {
    console.warn('[Settings] No se pudo escribir .env:', err.message);
  }

  // Forzar refresco del catálogo con la nueva key
  try {
    console.log('[Settings] 🔑 Nueva RapidAPI key configurada. Iniciando scraping…');
    const status = await cache.forceRefresh(true);
    return res.json({ ok: true, message: 'Clave guardada y catálogo actualizado.', ...status });
  } catch (err) {
    return res.json({ ok: true, message: 'Clave guardada. El catálogo se actualizará pronto.', error: err.message });
  }
});

/* ─────────────────────────────────────────────
   GET /api/settings/status
───────────────────────────────────────────── */
router.get('/status', (req, res) => {
  const status = cache.getStatus();
  res.json({
    ok:        true,
    apiKeySet: !!process.env.RAPIDAPI_KEY,
    // Solo devolver si la key está configurada, sin revelarla completa
    apiKeyHint: process.env.RAPIDAPI_KEY
      ? process.env.RAPIDAPI_KEY.slice(0, 6) + '••••••••' + process.env.RAPIDAPI_KEY.slice(-4)
      : null,
    ...status,
  });
});

/* ─────────────────────────────────────────────
   POST /api/settings/refresh
───────────────────────────────────────────── */
router.post('/refresh', async (req, res) => {
  try {
    const status = await cache.forceRefresh(true);
    res.json({ ok: true, message: 'Catálogo actualizado.', ...status });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

module.exports = router;
