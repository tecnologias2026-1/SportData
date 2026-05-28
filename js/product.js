/**
 * ============================================
 * SportData — Product Detail Page (Dinámico)
 * ============================================
 * Carga el producto desde la API (o fallback),
 * renderiza precios por tienda, historial,
 * especificaciones y gestiona favoritos.
 */

(function () {
  'use strict';

  /* ── Estado ──────────────────────────────── */
  const productState = {
    currentProduct: null,
    selectedSize:   null,
    selectedColor:  null,
    quantity:       1,
    favorites:      [],
  };

  /* ── Init ────────────────────────────────── */
  document.addEventListener('DOMContentLoaded', async function () {
    loadFavorites();
    setupHamburger();
    setupQuantityControls();
    await loadProductFromURL();
  });

  /* ────────────────────────────────────────────
     CARGA DEL PRODUCTO
  ──────────────────────────────────────────── */
  async function loadProductFromURL() {
    const params    = new URLSearchParams(window.location.search);
    const productId = params.get('id') || 'NK-RNP-001';

    showPageSkeleton();

    let product = null;
    try {
      product = await window.SportDataProducts.getById(productId);
    } catch {
      product = window.SportDataProducts.getProductById(productId);
    }

    if (!product) {
      // Redirigir al catálogo si no existe
      window.location.href = 'catalog.html';
      return;
    }

    productState.currentProduct = product;
    renderPage(product);
    setupInteractions();
    trackProductView(product);
  }

  /* ────────────────────────────────────────────
     SKELETON MIENTRAS CARGA
  ──────────────────────────────────────────── */
  function showPageSkeleton() {
    // El HTML ya tiene contenido estático; solo mostramos
    // un overlay de carga sobre las secciones dinámicas
    const sections = ['#cheapest', '#all-stores', '#history-title'];
    sections.forEach(sel => {
      const el = document.querySelector(sel);
      if (el && el.parentElement) el.parentElement.style.opacity = '0.4';
    });
  }

  function hidePageSkeleton() {
    const sections = ['#cheapest', '#all-stores', '#history-title'];
    sections.forEach(sel => {
      const el = document.querySelector(sel);
      if (el && el.parentElement) {
        el.parentElement.style.opacity = '1';
        el.parentElement.style.transition = 'opacity .4s ease';
      }
    });
  }

  /* ────────────────────────────────────────────
     RENDER COMPLETO DE LA PÁGINA
  ──────────────────────────────────────────── */
  function renderPage(product) {
    // Meta
    document.title = `${product.name} — SportData`;
    const bcEl = document.getElementById('bc-product');
    if (bcEl) bcEl.textContent = product.name;

    // Imagen principal
    const mainImg = document.getElementById('main-img');
    if (mainImg) {
      mainImg.src = (product.image || '').replace(/^\.\.\//,'../') || '../assets/img/main_produc_zapatillas.jpg';
      mainImg.alt = product.name;
    }

    // Título, badges, rating
    renderHero(product);

    // Precios
    renderPriceHero(product);

    // Top 3 más baratos
    renderTop3Cheapest(product.storePrices || []);

    // Top 3 mayor tráfico
    renderTop3Traffic(product.storePrices || []);

    // Tabla completa de tiendas
    renderStoresTable(product.storePrices || []);

    // Historial de precios
    renderPriceChart(product.priceHistory);

    // Especificaciones
    renderSpecifications(product);

    // Estadísticas scraping
    renderScrapingStats(product);

    // Favorito
    syncFavoriteButton(product.id);

    hidePageSkeleton();
  }

  /* ── Hero info ─────────────────────────── */
  function renderHero(p) {
    // Badges
    const catBadge = document.querySelector('.badge--cat');
    if (catBadge) catBadge.textContent = p.category.charAt(0).toUpperCase() + p.category.slice(1);

    const brandBadge = document.querySelector('.badge--brand');
    if (brandBadge) brandBadge.textContent = p.brand;

    // Stock badge
    const stockBadge = document.querySelector('.badge--stock');
    if (stockBadge) {
      stockBadge.innerHTML = `
        <span style="width:7px;height:7px;border-radius:50%;background:var(--green);display:inline-block"></span>
        En Stock · ${p.storesInStock || 6} tiendas`;
    }

    // Título
    const titleEl = document.querySelector('.info-panel__title');
    if (titleEl) titleEl.textContent = p.name;

    // Rating
    const ratingRow = document.querySelector('.rating-row');
    if (ratingRow) {
      const scoreEl = ratingRow.querySelector('.rating-score');
      const countEl = ratingRow.querySelector('.rating-count');
      const storesEl= ratingRow.querySelector('.rating-stores');
      if (scoreEl) scoreEl.textContent = p.rating.toFixed(1);
      if (countEl) countEl.textContent  = `(${p.reviews} reseñas totales)`;
      if (storesEl) storesEl.textContent = `promedio entre ${p.storesTotal || 8} tiendas`;
      const stars = ratingRow.querySelector('.stars');
      if (stars) stars.innerHTML = buildStarsSVG(p.rating);
    }

    // Descripción (alert strip y otras secciones que la usen)
    const alertStrip = document.querySelector('.alert-strip span');
    if (alertStrip && p.bestPrice) {
      alertStrip.innerHTML = `Activa alertas de precio — te avisamos cuando baje por debajo de <strong>$${p.bestPrice.toFixed(2)}</strong>`;
    }

    // Thumbnails de galería
    renderGalleryThumbs(p);
  }

  function buildStarsSVG(rating) {
    let html = '';
    for (let i = 1; i <= 5; i++) {
      let cls = 'empty';
      if (i <= Math.floor(rating))              cls = '';
      else if (i - rating < 1 && rating % 1)   cls = 'half';
      else                                       cls = 'empty';
      html += `<svg class="star-svg ${cls}" viewBox="0 0 24 24">
        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
      </svg>`;
    }
    return html;
  }

  /* ── Thumbnails de galería ─────────────── */
  function renderGalleryThumbs(p) {
    const thumbsContainer = document.querySelector('.gallery__thumbs');
    if (!thumbsContainer) return;
    const baseImg = (p.image || '').replace(/^\.\.\//,'../');
    // Actualizar primer thumb con la imagen real
    const firstThumb = thumbsContainer.querySelector('.gallery__thumb');
    if (firstThumb) {
      const img = firstThumb.querySelector('img');
      if (img) { img.src = baseImg; img.alt = p.name; }
      firstThumb.setAttribute('onclick', `swapImg(this,'${baseImg}')`);
    }
  }

  /* ── Price hero ────────────────────────── */
  function renderPriceHero(p) {
    const priceVal = document.querySelector('.price-hero__value');
    if (priceVal) priceVal.textContent = `$${p.bestPrice.toFixed(2)}`;

    const savingsEl = document.querySelector('.price-hero__meta strong');
    if (savingsEl) savingsEl.textContent = `Ahorras $${p.savings.toFixed(2)}`;

    const rangeEl = document.querySelector('.price-hero__range');
    if (rangeEl) {
      rangeEl.innerHTML = `
        <span>Rango de precios:</span>
        <span class="min">$${p.bestPrice.toFixed(2)}</span>
        <span style="color:var(--ink-3)">—</span>
        <span class="max">$${p.worstPrice.toFixed(2)}</span>
        <span style="color:var(--ink-3);margin-left:auto">en ${p.storesTotal} tiendas</span>`;
    }
  }

  /* ────────────────────────────────────────────
     TOP 3 PRECIOS MÁS BAJOS
  ──────────────────────────────────────────── */
  function renderTop3Cheapest(storePrices) {
    const container = document.querySelector('#cheapest .highlight-grid');
    if (!container) return;

    const available = storePrices.filter(s => s.stockPill !== 'out').slice(0, 3);
    if (!available.length) return;

    const labels = ['#1 Más barato', '#2 Precio', '#3 Precio'];

    container.innerHTML = available.map((store, i) => `
      <div class="hcard hcard--${i+1}">
        <div class="hcard__rank">${labels[i]}</div>
        <div class="hcard__store">
          <div class="hcard__logo" style="background:${store.storeColor};color:#fff;font-size:9px">${store.storeBadge}</div>
          <div>
            <div class="hcard__name">${store.storeName}</div>
            <div class="hcard__meta">${store.storeRating}★ · ${store.stockQty || '?'} uds. disponibles</div>
          </div>
        </div>
        <div class="hcard__price-row">
          <span class="hcard__price">$${store.price.toFixed(2)}</span>
          <span class="hcard__shipping ${store.shipping !== 'Gratis' ? 'paid' : ''}">
            ${store.shipping === 'Gratis' ? '+ envío gratis' : `+ ${store.shipping} envío`}
          </span>
        </div>
        <div class="hcard__metric"><strong>Stock:</strong> ${store.stockQty || '?'} unidades disponibles</div>
        <div class="hcard__metric"><strong>Entrega:</strong> ${store.delivery}</div>
        <a href="${store.url || '#'}" class="hcard__link" target="_blank" rel="noopener">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
            <polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/>
          </svg>
          Ir a ${store.storeName}
        </a>
      </div>`).join('');
  }

  /* ────────────────────────────────────────────
     TOP 3 MAYOR TRÁFICO
  ──────────────────────────────────────────── */
  function renderTop3Traffic(storePrices) {
    const container = document.querySelector('#traffic-title')
      ? document.querySelector('#traffic-title').closest('section').querySelector('.highlight-grid')
      : null;
    if (!container) return;

    // Ordenar por tráfico (estimado por posición en la lista original)
    const trafficOrder = ['Nike Official','Amazon Sports','Decathlon','Reebok Store','SportZone','FitnessOutlet','MercadoSports','RunnerWorld'];
    const sorted = [...storePrices].sort((a, b) =>
      trafficOrder.indexOf(a.storeName) - trafficOrder.indexOf(b.storeName)
    ).slice(0, 3);

    const maxTraffic = [180, 240, 90];  // millones/mes por posición
    const labels = ['#1 Tráfico','#2 Tráfico','#3 Tráfico'];
    const widths = ['72%','100%','35%'];

    container.innerHTML = sorted.map((store, i) => `
      <div class="hcard hcard--traffic hcard--${i+1}">
        <div class="hcard__rank">${labels[i]}</div>
        <div class="hcard__store">
          <div class="hcard__logo" style="background:${store.storeColor};color:#fff;font-size:9px">${store.storeBadge}</div>
          <div>
            <div class="hcard__name">${store.storeName}</div>
            <div class="hcard__meta">Tienda deportiva online</div>
          </div>
        </div>
        <div class="hcard__metric"><strong>Visitas/mes:</strong> ${maxTraffic[i]}M</div>
        <div class="hcard__stat-bar">
          <div class="hcard__stat-fill" style="width:${widths[i]}"></div>
        </div>
        <div class="hcard__metric"><strong>Precio aquí:</strong>
          <span style="color:var(--teal);font-weight:700">$${store.price.toFixed(2)}</span>
        </div>
        <div class="hcard__metric"><strong>Confianza:</strong> ⭐ ${store.storeRating} / 5</div>
        <a href="${store.url || '#'}" class="hcard__link" target="_blank" rel="noopener">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
            <polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/>
          </svg>
          Ver en ${store.storeName}
        </a>
      </div>`).join('');
  }

  /* ────────────────────────────────────────────
     TABLA COMPLETA DE TIENDAS
  ──────────────────────────────────────────── */
  function renderStoresTable(storePrices) {
    const tbody = document.querySelector('.stores-table tbody');
    if (!tbody || !storePrices.length) return;

    tbody.innerHTML = storePrices.map((store, i) => {
      const isBest = i === 0;
      const stockCls = store.stockPill === 'ok' ? 'ok' : store.stockPill === 'low' ? 'low' : 'out';
      const stockLabel = store.stockPill === 'out' ? 'Sin stock' :
                         store.stockPill === 'low' ? `Pocas (${store.stockQty}u)` :
                                                     `En stock (${store.stockQty || '?'}u)`;
      const priceCls = isBest ? 'price-cell best td-right' : 'price-cell td-right';
      const rowCls   = isBest ? 'best-price' : '';

      // Estimar tráfico para barra
      const trafficMap = {
        'Amazon Sports':2400,'Nike Official':180,'Decathlon':90,
        'Reebok Store':35,'SportZone':45,'FitnessOutlet':28,
        'MercadoSports':20,'RunnerWorld':12,
      };
      const maxT  = 2400;
      const tVal  = trafficMap[store.storeName] || 20;
      const tPct  = Math.round((tVal / maxT) * 100);
      const tLabel= tVal >= 1000 ? `${(tVal/1000).toFixed(1)}B/mes` : `${tVal}M/mes`;

      const btnHtml = store.stockPill === 'out'
        ? `<button class="table-btn" style="background:var(--border);color:var(--ink-3);cursor:not-allowed" disabled>Sin stock</button>`
        : `<button class="table-btn" onclick="window.open('${store.url || '#'}','_blank')">Ver oferta</button>`;

      return `
        <tr class="${rowCls}">
          <td>
            <div class="store-cell">
              <div class="store-icon" style="background:${store.storeColor};color:#fff;font-size:9px">${store.storeBadge}</div>
              <span class="store-name">${store.storeName}${isBest ? ' <span class="store-verified">✓ Mejor precio</span>' : ''}</span>
            </div>
          </td>
          <td class="${priceCls}">$${store.price.toFixed(2)}</td>
          <td><span class="stock-pill ${stockCls}"><span class="stock-dot"></span>${stockLabel}</span></td>
          <td style="font-size:13px;${store.shipping==='Gratis'?'color:var(--green);font-weight:500':'color:var(--ink-3)'}">
            ${store.shipping}
          </td>
          <td>
            <div class="traffic-bar">
              <div class="traffic-bar__track">
                <div class="traffic-bar__fill" style="width:${tPct}%"></div>
              </div>
              <span class="traffic-bar__label">${tLabel}</span>
            </div>
          </td>
          <td>⭐ ${store.storeRating}</td>
          <td class="td-right">${btnHtml}</td>
        </tr>`;
    }).join('');

    // Actualizar contador "X tiendas monitoreadas"
    const lastUpdateEl = document.querySelector('.last-update');
    if (lastUpdateEl) {
      const sp = storePrices[0];
      lastUpdateEl.innerHTML = `
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
        </svg>
        ${sp ? sp.lastUpdate : 'Hace 5 min'}`;
    }
  }

  /* ────────────────────────────────────────────
     HISTORIAL DE PRECIOS (Chart.js)
  ──────────────────────────────────────────── */
  let _chart = null;

  function renderPriceChart(history) {
    if (!history) return;
    const canvas = document.getElementById('priceChart');
    if (!canvas) return;

    // Almacenar para cambio de período
    window._priceHistory = history;

    if (typeof Chart === 'undefined') {
      // Chart.js no cargado aún — esperar
      const script = document.querySelector('script[src*="chart"]');
      if (script) script.addEventListener('load', () => renderPriceChart(history));
      return;
    }

    buildChart(history.labels, history.amazon, history.decathlon, history.official);
  }

  function buildChart(labels, amazon, decathlon, official) {
    const canvas = document.getElementById('priceChart');
    if (!canvas) return;
    if (_chart) { _chart.destroy(); _chart = null; }

    _chart = new Chart(canvas, {
      type: 'line',
      data: {
        labels,
        datasets: [
          { label:'Amazon Sports', data:amazon,    borderColor:'#38a8c7', backgroundColor:'rgba(56,168,199,.08)', tension:.35, pointRadius:0, pointHoverRadius:5, borderWidth:2 },
          { label:'Decathlon',     data:decathlon,  borderColor:'#0082c8', backgroundColor:'rgba(0,130,200,.05)',  tension:.35, pointRadius:0, pointHoverRadius:5, borderWidth:1.5 },
          { label:'Nike Official', data:official,   borderColor:'#cc0000', backgroundColor:'rgba(204,0,0,.04)',    tension:.35, pointRadius:0, pointHoverRadius:5, borderWidth:1.5 },
        ],
      },
      options: {
        responsive:true, maintainAspectRatio:false, animation:false,
        interaction:{ mode:'index', intersect:false },
        plugins:{
          legend:{ display:false },
          tooltip:{ callbacks:{ label: ctx => ctx.dataset.label + ': $' + ctx.raw.toFixed(2) } },
        },
        scales:{
          x:{ grid:{display:false}, ticks:{font:{size:11}, color:'#8a8a8a', maxTicksLimit:8, maxRotation:0} },
          y:{ grid:{color:'rgba(0,0,0,.05)'}, ticks:{font:{size:11}, color:'#8a8a8a', callback: v => '$'+v} },
        },
      },
    });
  }

  // Exponer para los botones de período del HTML
  window.changePeriod = function (btn, period) {
    document.querySelectorAll('.chart-tab').forEach(t => t.classList.remove('active'));
    btn.classList.add('active');
    const history = window._priceHistory;
    if (!history) return;

    // Subconjunto de datos según período
    const slice = period === '7d' ? 7 : period === '90d' ? 90 : 30;
    const start = Math.max(0, history.labels.length - slice);
    buildChart(
      history.labels.slice(start),
      history.amazon.slice(start),
      history.decathlon.slice(start),
      history.official.slice(start),
    );
  };

  /* ────────────────────────────────────────────
     ESPECIFICACIONES DINÁMICAS
  ──────────────────────────────────────────── */
  function renderSpecifications(p) {
    const specsGrid = document.querySelector('.specs-grid');
    if (!specsGrid || !p.specs) return;

    // Separar specs en grupos de 2 para las 4 tarjetas
    const allSpecs = Object.entries(p.specs);
    const half     = Math.ceil(allSpecs.length / 2);
    const group1   = allSpecs.slice(0, half);
    const group2   = allSpecs.slice(half);

    const specCards = specsGrid.querySelectorAll('.spec-card');

    // Tarjeta 1: primera mitad de specs
    if (specCards[0]) {
      const body = specCards[0].querySelector('.spec-card__body');
      const head = specCards[0].querySelector('.spec-card__head-title');
      if (head) head.textContent = 'Materiales y Construcción';
      if (body) body.innerHTML = group1.map(([k, v]) => `
        <div class="spec-row">
          <span class="spec-label">${formatSpecLabel(k)}</span>
          <span class="spec-value">${v}</span>
        </div>`).join('');
    }

    // Tarjeta 2: segunda mitad de specs
    if (specCards[1]) {
      const body = specCards[1].querySelector('.spec-card__body');
      const head = specCards[1].querySelector('.spec-card__head-title');
      if (head) head.textContent = 'Rendimiento y Uso';
      if (body) body.innerHTML = group2.map(([k, v]) => `
        <div class="spec-row">
          <span class="spec-label">${formatSpecLabel(k)}</span>
          <span class="spec-value">${v}</span>
        </div>`).join('');
    }

    // Tarjeta 3: información general
    if (specCards[2]) {
      const body = specCards[2].querySelector('.spec-card__body');
      const head = specCards[2].querySelector('.spec-card__head-title');
      if (head) head.textContent = 'Información General';
      if (body) body.innerHTML = `
        <div class="spec-row"><span class="spec-label">Marca</span><span class="spec-value">${p.brand}</span></div>
        <div class="spec-row"><span class="spec-label">Categoría</span><span class="spec-value">${p.category.charAt(0).toUpperCase()+p.category.slice(1)}</span></div>
        <div class="spec-row"><span class="spec-label">SKU</span><span class="spec-value" style="font-size:12px;font-family:monospace">${p.id}</span></div>
        <div class="spec-row"><span class="spec-label">Reseñas</span><span class="spec-value">${p.reviews} valoraciones</span></div>
        <div class="spec-row"><span class="spec-label">Calificación</span><span class="spec-value">${p.rating} / 5 estrellas</span></div>`;
    }

    // Tarjeta 4: tallas y colores
    if (specCards[3]) {
      const body = specCards[3].querySelector('.spec-card__body');
      const head = specCards[3].querySelector('.spec-card__head-title');
      if (head) head.textContent = 'Tallas y Colores';
      if (body) {
        const sizeChips = (p.sizes || []).map(s => `<span class="size-chip">${s}</span>`).join('');
        const colorDots = (p.colors || []).map(c =>
          `<div class="color-dot" style="background:${c.hex}${c.hex==='#FFFFFF'?';border:1px solid #ccc':''}" title="${c.name}"></div>`
        ).join('');
        body.innerHTML = `
          <div class="spec-row">
            <span class="spec-label">Tallas</span>
            <div class="size-chips">${sizeChips}</div>
          </div>
          <div class="spec-row">
            <span class="spec-label">Colores</span>
            <div class="color-dots">${colorDots}</div>
          </div>
          <div class="spec-row">
            <span class="spec-label">Actualizado</span>
            <span class="spec-value" style="color:var(--teal)">${p.updatedAgo || 'Hace 5 min'}</span>
          </div>
          <div class="spec-row">
            <span class="spec-label">Scrapeado a las</span>
            <span class="spec-value" style="font-size:11px">${new Date(p.scrapedAt || Date.now()).toLocaleTimeString('es',{hour:'2-digit',minute:'2-digit'})}</span>
          </div>`;
      }
    }
  }

  function formatSpecLabel(key) {
    return key
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, s => s.toUpperCase())
      .replace(/([a-z])([A-Z])/g, '$1 $2')
      .trim();
  }

  /* ────────────────────────────────────────────
     ESTADÍSTICAS DE SCRAPING
  ──────────────────────────────────────────── */
  function renderScrapingStats(p) {
    const strip = document.querySelector('.scraping-strip');
    if (!strip) return;

    const stats = strip.querySelectorAll('.scraping-stat');
    const data = [
      { val: p.storesTotal    || 8, label:'Tiendas monitoreadas', change:`↑ ${p.storesInStock || 6} con stock`,   cls:'down' },
      { val: '30d',                 label:'Historial de precios',  change:`Min $${p.bestPrice.toFixed(0)} · Max $${p.worstPrice.toFixed(0)}`, cls:'' },
      { val: p.updatedAgo     || 'Hace 5 min', label:'Última actualización', change:'● En vivo', cls:'' },
      { val: `${p.storesInStock||6}/${p.storesTotal||8}`, label:'Con stock disponible', change:`${(p.storesTotal||8)-(p.storesInStock||6)} sin stock`, cls:'up' },
    ];

    stats.forEach((el, i) => {
      if (!data[i]) return;
      const valEl    = el.querySelector('.scraping-stat__val');
      const labelEl  = el.querySelector('.scraping-stat__label');
      const changeEl = el.querySelector('.scraping-stat__change');
      if (valEl)    valEl.textContent    = data[i].val;
      if (labelEl)  labelEl.textContent  = data[i].label;
      if (changeEl) { changeEl.textContent = data[i].change; changeEl.className = `scraping-stat__change ${data[i].cls}`; }
    });
  }

  /* ────────────────────────────────────────────
     INTERACCIONES
  ──────────────────────────────────────────── */
  function setupInteractions() {
    setupColorSelection();
    setupSizeSelection();
  }

  function setupColorSelection() {
    setTimeout(() => {
      const dots = document.querySelectorAll('.color-dot');
      dots.forEach(d => {
        d.addEventListener('click', function () {
          dots.forEach(x => x.style.transform = '');
          this.style.transform = 'scale(1.25)';
          this.style.boxShadow = '0 0 0 2px #fff, 0 0 0 4px #000';
          productState.selectedColor = this.style.backgroundColor;
        });
      });
    }, 100);
  }

  function setupSizeSelection() {
    setTimeout(() => {
      const chips = document.querySelectorAll('.size-chip');
      chips.forEach(chip => {
        chip.style.cursor = 'pointer';
        chip.addEventListener('click', function () {
          chips.forEach(c => { c.style.borderColor=''; c.style.color=''; c.style.background=''; });
          this.style.borderColor = 'var(--teal)';
          this.style.color       = 'var(--teal)';
          this.style.background  = 'var(--teal-10)';
          productState.selectedSize = this.textContent.trim();
        });
      });
      if (chips.length) {
        chips[0].click();
      }
    }, 150);
  }

  /* ── Cantidad ────────────────────────────── */
  function setupQuantityControls() {
    const dec  = document.getElementById('decreaseQty');
    const inc  = document.getElementById('increaseQty');
    const inp  = document.getElementById('quantity');
    if (!inp) return;
    if (dec) dec.addEventListener('click', () => { inp.value = Math.max(1, +inp.value - 1); productState.quantity = +inp.value; });
    if (inc) inc.addEventListener('click', () => { inp.value = Math.min(10,+inp.value + 1); productState.quantity = +inp.value; });
    inp.addEventListener('change', () => { inp.value = Math.max(1, Math.min(10, +inp.value || 1)); productState.quantity = +inp.value; });
  }

  /* ── Favorito ─────────────────────────────── */
  function syncFavoriteButton(productId) {
    const btn = document.querySelector('.product-favorite-btn, .btn-secondary[onclick*="toggleFav"]');
    if (!btn) return;
    if (isFavorited(productId)) btn.setAttribute('data-favorite', 'true');
    btn.addEventListener('click', () => {
      const isFav = btn.getAttribute('data-favorite') === 'true';
      btn.setAttribute('data-favorite', String(!isFav));
      if (isFav) removeFavorite(productId);
      else       addFavorite(productId);
      saveFavorites();
    });
  }

  // Sobreescribir función global toggleFav del HTML inline
  window.toggleFav = function (btn) {
    if (!productState.currentProduct) return;
    const id   = productState.currentProduct.id;
    const isFav= btn.getAttribute('data-fav') === '1';
    btn.setAttribute('data-fav', isFav ? '0' : '1');
    const path = btn.querySelector('svg path');
    if (path) { path.setAttribute('fill', isFav ? 'none' : '#ef4444'); path.setAttribute('stroke', isFav ? 'currentColor' : '#ef4444'); }
    if (isFav) removeFavorite(id); else addFavorite(id);
    saveFavorites();
  };

  function addFavorite(id)    { if (!productState.favorites.includes(id)) productState.favorites.push(id); }
  function removeFavorite(id) { productState.favorites = productState.favorites.filter(f => f !== id); }
  function isFavorited(id)    { return productState.favorites.includes(id); }

  function loadFavorites() {
    try { productState.favorites = JSON.parse(localStorage.getItem('sportdata_favorites') || '[]'); }
    catch { productState.favorites = []; }
  }
  function saveFavorites() {
    localStorage.setItem('sportdata_favorites', JSON.stringify(productState.favorites));
  }

  /* ── Hamburger ──────────────────────────── */
  function setupHamburger() {
    const btn  = document.getElementById('hamburgerBtn');
    const menu = document.getElementById('navMenu');
    if (!btn || !menu) return;
    btn.addEventListener('click', e => {
      e.stopPropagation();
      const exp = btn.getAttribute('aria-expanded') === 'true';
      btn.setAttribute('aria-expanded', String(!exp));
      menu.classList.toggle('active');
    });
  }

  /* ── Analytics ──────────────────────────── */
  function trackProductView(p) {
    try {
      let views = JSON.parse(localStorage.getItem('pageViews') || '[]');
      views.push({ productId:p.id, productName:p.name, viewedAt:new Date().toISOString() });
      if (views.length > 50) views = views.slice(-50);
      localStorage.setItem('pageViews', JSON.stringify(views));
    } catch { /* ignorar */ }
  }

})();
