'use strict';

let CONFIG = null;

// Load config.json externally
async function loadConfig() {
  try {
    const res = await fetch('Config/config.json', { cache: 'no-store' });
    CONFIG = await res.json();
  } catch {
    console.error('Failed to load config.json');
    CONFIG = null;
  }
}

// Run external plugins
function runPlugins() {
  if (!window.KRY_PLUGINS) return;
  window.KRY_PLUGINS.slice()
    .sort((a, b) => (a.order || 0) - (b.order || 0))
    .forEach(p => { try { if (p?.run) p.run(window.KRY_CONTEXT); } catch {} });
}

// Populate engine dropdown dynamically
function populateEngineDropdown() {
  if (!CONFIG) return;
  const select = document.getElementById('engine');
  if (!select) return;

  select.innerHTML = '';
  const engines = { ...CONFIG.engines.open_source, ...CONFIG.engines.closed_source };

  Object.keys(engines).forEach(key => {
    const eng = engines[key];
    const opt = document.createElement('option');
    opt.value = key;
    opt.textContent = eng.name;
    select.appendChild(opt);
  });

  // Default selection
  const params = new URLSearchParams(location.search);
  const engineParam = params.get('engine') || CONFIG.search.defaultEngine;
  if (engineParam && engines[engineParam]) select.value = engineParam;
}

// Safe navigation
function navigate(url) {
  if (!url) return;
  if (window.__KRY_HARD_NAV__) window.__KRY_HARD_NAV__(url);
  else location.assign(url);
}

// Main query handler
function handleQuery(value, engineKey, isUrl) {
  if (!CONFIG || !value) return;
  value = value.trim();
  if (/^http:\/\//i.test(value)) {
  console.warn('Blocked insecure HTTP URL');
  return;
  }
  const engines = { ...CONFIG.engines.open_source, ...CONFIG.engines.closed_source };
  const engine = engines[engineKey] || engines[CONFIG.search.defaultEngine];
  if (!engine) return;

  let target = '';

  if (isUrl) {
    // Direct URL mode
    target = value.startsWith('http') ? value : 'https://' + value;
  } else {
    // Query mode
    if (engine.mode === 'direct') {
      target = engine.base;
      if (engine.appendInput) {
        if (!target.endsWith('/') && !value.startsWith('/')) target += '/';
        target += value;
      }
    } else if (engine.mode === 'query') {
      if (!engine.url) return;
      const query = encodeURIComponent(value);
      // Support both {query} and %s placeholders
      target = engine.url.replace('{query}', query).replace('%s', query);
    } else {
      console.warn('Unknown engine mode:', engine.mode);
      return;
    }
  }

  // Enforce HTTPS for security and privacy
  if (!target.startsWith('https://')) {
    console.error('Only HTTPS URLs are allowed for security.');
    return;
  }

  navigate(target);
}

// DOM ready
document.addEventListener('DOMContentLoaded', async () => {
  window.KRY_CONTEXT = Object.freeze({
    ua: navigator.userAgent,
    lang: navigator.language,
    platform: navigator.platform,
    url: location.href
  });

  await loadConfig();
  runPlugins();
  populateEngineDropdown();

  const status = document.getElementById('status');
  if (status) status.textContent = 'Private search mode';

  const params = new URLSearchParams(location.search);
  const engine = params.get('engine') || (CONFIG?.search.defaultEngine || 'startpage');
  let q = params.get('q');
  let url = params.get('url');

  if (url) {
    try { url = decodeURIComponent(url); } catch {}
    handleQuery(url, engine, true);
  } else if (q) {
    try { q = decodeURIComponent(q); } catch {}
    const val = input.value.trim();
    const isUrl = /^(https?:\/\/|[a-z0-9-]+\.[a-z]{2,})/i.test(val);
    handleQuery(val, select?.value || engine, isUrl);
  }

  const goBtn = document.getElementById('go');
  if (goBtn) {
    goBtn.onclick = function() {
      const input = document.getElementById('q');
      const select = document.getElementById('engine');
      if (!input) return;
      handleQuery(input.value, select?.value || engine, false);
    };
  }
});
