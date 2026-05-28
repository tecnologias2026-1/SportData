// server.js — SportData Backend
// Node.js puro sin Express, SQLite nativo (Node 22+)
// Igual al patrón de ChipSail que funciona en Render.
'use strict';

const http    = require('http');
const crypto  = require('crypto');
const bcrypt  = require('bcryptjs');
const jwt     = require('jsonwebtoken');

const db    = require('./database/db');
const auth  = require('./middleware/auth');
const cache = require('./services/productCache');

const PORT       = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'sportdata_jwt_secret_CAMBIA_ESTO';
const JWT_EXPIRES = process.env.JWT_EXPIRES_IN || '7d';
const ALLOWED_ORIGIN = process.env.FRONTEND_URL || '*';

// ── Helpers HTTP ──────────────────────────────────────────────────────────────

function setCors(res, origin) {
  const allow = ALLOWED_ORIGIN === '*' ? (origin || '*') : ALLOWED_ORIGIN;
  res.setHeader('Access-Control-Allow-Origin',  allow);
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Max-Age', '86400');
}

function json(res, status, data) {
  const body = JSON.stringify(data);
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(body);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let raw = '';
    req.on('data', chunk => { raw += chunk; });
    req.on('end', () => {
      try { resolve(raw ? JSON.parse(raw) : {}); }
      catch { resolve({}); }
    });
    req.on('error', reject);
  });
}

function sortProducts(products, sortBy) {
  const arr = [...products];
  if (sortBy === 'price-asc')  arr.sort((a, b) => a.price - b.price);
  if (sortBy === 'price-desc') arr.sort((a, b) => b.price - a.price);
  if (sortBy === 'rating')     arr.sort((a, b) => (b.rating||0) - (a.rating||0));
  if (sortBy === 'newest')     arr.reverse();
  return arr;
}

function filterProducts(products, { category, brand, maxPrice }) {
  return products.filter(p => {
    if (category && category !== 'todos' &&
        p.category?.toLowerCase() !== category.toLowerCase()) return false;
    if (brand && brand !== 'todas' &&
        p.brand?.toLowerCase() !== brand.toLowerCase()) return false;
    if (maxPrice && p.price > parseFloat(maxPrice)) return false;
    return true;
  });
}

function parseQuery(url) {
  const idx = url.indexOf('?');
  if (idx === -1) return {};
  return Object.fromEntries(new URLSearchParams(url.slice(idx + 1)));
}

// ── Router ────────────────────────────────────────────────────────────────────

async function router(req, res) {
  const origin = req.headers['origin'];
  setCors(res, origin);

  if (req.method === 'OPTIONS') {
    res.writeHead(204); res.end(); return;
  }

  const { method } = req;
  const rawPath = req.url.split('?')[0];
  const qs = parseQuery(req.url);

  // ── Health ────────────────────────────────────────────────────────────────
  if (rawPath === '/api/health' && method === 'GET') {
    return json(res, 200, { status: 'ok', message: 'SportData API funcionando', products: cache.getStatus() });
  }

  // ── Debug (temporal) ─────────────────────────────────────────────────────
  if (rawPath === '/api/debug' && method === 'GET') {
    try {
      const exists = db.emailExists('debug@test.com');
      return json(res, 200, { ok: true, sqlite: 'ok', emailCheck: exists });
    } catch (err) {
      return json(res, 500, { ok: false, error: err.message });
    }
  }

  // ── AUTH: Register ────────────────────────────────────────────────────────
  if (rawPath === '/api/auth/register' && method === 'POST') {
    const body = await readBody(req);
    const { fullName, email, password } = body;

    if (!fullName || !email || !password)
      return json(res, 400, { error: 'Todos los campos son requeridos.' });

    if (db.emailExists(email.toLowerCase()))
      return json(res, 409, { error: 'Este correo ya está registrado.', fields: { email: 'Este correo ya está en uso.' } });

    try {
      const hashed = await bcrypt.hash(password, 10);
      const id = db.insertUser({ full_name: fullName.trim(), email: email.trim().toLowerCase(), password: hashed });
      const token = jwt.sign({ id, email: email.toLowerCase() }, JWT_SECRET, { expiresIn: JWT_EXPIRES });
      return json(res, 201, { message: '¡Cuenta creada exitosamente!', token, user: { id, fullName: fullName.trim(), email: email.trim().toLowerCase() } });
    } catch (err) {
      console.error('Register error:', err);
      return json(res, 500, { error: 'Error interno del servidor.' });
    }
  }

  // ── AUTH: Login ───────────────────────────────────────────────────────────
  if (rawPath === '/api/auth/login' && method === 'POST') {
    const body = await readBody(req);
    const { email, password } = body;

    if (!email || !password)
      return json(res, 400, { error: 'Correo y contraseña requeridos.' });

    try {
      const user = db.getUserByEmail(email.toLowerCase());
      if (!user) return json(res, 401, { error: 'Credenciales incorrectas.', fields: { email: 'No existe una cuenta con este correo.' } });

      const match = await bcrypt.compare(password, user.password);
      if (!match) return json(res, 401, { error: 'Credenciales incorrectas.', fields: { password: 'Contraseña incorrecta.' } });

      const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: JWT_EXPIRES });
      return json(res, 200, { message: '¡Sesión iniciada correctamente!', token, user: { id: user.id, fullName: user.full_name, email: user.email } });
    } catch (err) {
      console.error('Login error:', err);
      return json(res, 500, { error: 'Error interno del servidor.' });
    }
  }

  // ── AUTH: Me ──────────────────────────────────────────────────────────────
  if (rawPath === '/api/auth/me' && method === 'GET') {
    const decoded = auth(req);
    if (!decoded) return json(res, 401, { error: 'Token inválido o no proporcionado.' });
    const user = db.getUserById(decoded.id);
    if (!user) return json(res, 404, { error: 'Usuario no encontrado.' });
    return json(res, 200, { id: user.id, fullName: user.full_name, email: user.email });
  }

  // ── AUTH: Logout ──────────────────────────────────────────────────────────
  if (rawPath === '/api/auth/logout' && method === 'POST') {
    return json(res, 200, { message: 'Sesión cerrada.' });
  }

  // ── AUTH: Forgot password ─────────────────────────────────────────────────
  if (rawPath === '/api/auth/forgot-password' && method === 'POST') {
    const body = await readBody(req);
    const { email } = body;
    if (!email) return json(res, 400, { error: 'El correo es requerido.' });

    const user = db.getUserByEmail(email.trim().toLowerCase());
    const genericMsg = 'Si ese correo está registrado, recibirás un código de recuperación.';
    if (!user) return json(res, 200, { message: genericMsg });

    const code    = Math.floor(100000 + Math.random() * 900000).toString();
    const expires = Date.now() + 15 * 60 * 1000;
    db.saveResetCode(user.id, code, expires);

    return json(res, 200, { message: genericMsg, dev_code: code, dev_email: user.email });
  }

  // ── AUTH: Verify reset code ───────────────────────────────────────────────
  if (rawPath === '/api/auth/verify-reset-code' && method === 'POST') {
    const body = await readBody(req);
    const { email, code } = body;
    if (!email || !code) return json(res, 400, { error: 'Datos incompletos.' });

    const user = db.getUserByEmail(email.trim().toLowerCase());
    if (!user) return json(res, 400, { error: 'Código inválido o expirado.' });

    const record = db.getResetCode(user.id);
    if (!record || record.code !== code || Date.now() > record.expires)
      return json(res, 400, { error: 'Código inválido o expirado.' });

    const resetToken = crypto.randomBytes(32).toString('hex');
    db.saveResetToken(user.id, resetToken, Date.now() + 10 * 60 * 1000);
    return json(res, 200, { message: 'Código correcto.', reset_token: resetToken });
  }

  // ── AUTH: Reset password ──────────────────────────────────────────────────
  if (rawPath === '/api/auth/reset-password' && method === 'POST') {
    const body = await readBody(req);
    const { reset_token, new_password } = body;
    if (!reset_token || !new_password) return json(res, 400, { error: 'Datos incompletos.' });

    if (new_password.length < 8 || !/[a-z]/.test(new_password) ||
        !/[A-Z]/.test(new_password) || !/[0-9]/.test(new_password))
      return json(res, 400, { error: 'La contraseña debe tener al menos 8 caracteres, mayúsculas, minúsculas y números.' });

    const userId = db.getUserIdByResetToken(reset_token);
    if (!userId) return json(res, 400, { error: 'Token inválido o expirado.' });

    const hashed = await bcrypt.hash(new_password, 10);
    db.updatePassword(userId, hashed);
    db.clearResetData(userId);
    return json(res, 200, { message: '¡Contraseña actualizada correctamente!' });
  }

  // ── PRODUCTS: Status ──────────────────────────────────────────────────────
  if (rawPath === '/api/products/status' && method === 'GET') {
    return json(res, 200, { ok: true, ...cache.getStatus() });
  }

  // ── PRODUCTS: Force refresh ───────────────────────────────────────────────
  if (rawPath === '/api/products/refresh' && method === 'POST') {
    const status = await cache.forceRefresh();
    return json(res, 200, { ok: true, message: 'Refresco iniciado.', ...status });
  }

  // ── PRODUCTS: Search ──────────────────────────────────────────────────────
  if (rawPath === '/api/products/search' && method === 'GET') {
    const { q = '', sort = 'relevance', maxPrice } = qs;
    let results = cache.search(q);
    if (maxPrice) results = results.filter(p => p.price <= parseFloat(maxPrice));
    results = sortProducts(results, sort);
    return json(res, 200, { ok: true, query: q, count: results.length, products: results });
  }

  // ── PRODUCTS: By category ─────────────────────────────────────────────────
  const catMatch = rawPath.match(/^\/api\/products\/category\/(.+)$/);
  if (catMatch && method === 'GET') {
    const cat = decodeURIComponent(catMatch[1]);
    let results = cache.getByCategory(cat);
    if (qs.maxPrice) results = results.filter(p => p.price <= parseFloat(qs.maxPrice));
    results = sortProducts(results, qs.sort || 'relevance');
    return json(res, 200, { ok: true, category: cat, count: results.length, products: results });
  }

  // ── PRODUCTS: By ID ───────────────────────────────────────────────────────
  const productMatch = rawPath.match(/^\/api\/products\/([^/]+)$/);
  if (productMatch && method === 'GET') {
    const id = decodeURIComponent(productMatch[1]);
    const product = cache.getById(id);
    if (!product) return json(res, 404, { ok: false, error: 'Producto no encontrado.' });
    return json(res, 200, { ok: true, product });
  }

  // ── PRODUCTS: All ─────────────────────────────────────────────────────────
  if (rawPath === '/api/products' && method === 'GET') {
    const { sort = 'relevance', category, brand, maxPrice, q } = qs;
    let products = q ? cache.search(q) : cache.getAll();
    products = filterProducts(products, { category, brand, maxPrice });
    products = sortProducts(products, sort);
    return json(res, 200, {
      ok: true, count: products.length, total: cache.getAll().length,
      filters: { sort, category, brand, maxPrice, q },
      products,
    });
  }

  // ── 404 ───────────────────────────────────────────────────────────────────
  json(res, 404, { error: `Ruta no encontrada: ${method} ${rawPath}` });
}

// ── Inicio ────────────────────────────────────────────────────────────────────
cache.init();

const server = http.createServer(async (req, res) => {
  try {
    await router(req, res);
  } catch (err) {
    console.error('Unhandled error:', err);
    try { json(res, 500, { error: 'Error interno.' }); } catch {}
  }
});

server.listen(PORT, () => {
  console.log('');
  console.log('  ╔══════════════════════════════════════════╗');
  console.log('  ║   SportData Backend v3 — Node.js puro    ║');
  console.log(`  ║   URL:  http://localhost:${PORT}             ║`);
  console.log('  ║   DB:   SQLite nativo (Node 22)          ║');
  console.log('  ╚══════════════════════════════════════════╝');
  console.log('');
});
