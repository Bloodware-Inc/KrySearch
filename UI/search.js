'use strict';

/* ===============================
   ZERO STATE (scoped & safe)
================================ */
(function () {
  try {
    localStorage.clear();
    sessionStorage.clear();
  } catch {}

  try {
    document.cookie.split(";").forEach(function (c) {
      document.cookie = c
        .replace(/^ +/, "")
        .replace(/=.*/, "=;expires=Thu, 01 Jan 1970 00:00:00 UTC;path=/");
    });
  } catch {}
})();

/* ===============================
   PLUGIN REGISTRY & EXECUTOR
================================ */
if (!window.KRY_PLUGINS) {
  window.KRY_PLUGINS = [];
}

var KRY_CONTEXT = Object.freeze({
  ua: navigator.userAgent,
  lang: navigator.language,
  platform: navigator.platform,
  url: location.href
});

function runPlugins() {
  var plugins = window.KRY_PLUGINS.slice();
  plugins.sort(function (a, b) {
    return (a.order || 0) - (b.order || 0);
  });

  for (var i = 0; i < plugins.length; i++) {
    try {
      if (plugins[i] && typeof plugins[i].run === 'function') {
        plugins[i].run(KRY_CONTEXT);
      }
    } catch {
      // silent by design
    }
  }
}

/* ===============================
   PRIVACY-FOCUSED ENGINES
================================ */
var ENGINES = {
  startpage: function (q) {
    return 'https://www.startpage.com/sp/search?query=' + q;
  },
  duckduckgo: function (q) {
    return 'https://duckduckgo.com/?q=' + q + '&kl=wt-wt';
  },
  brave: function (q) {
    return 'https://search.brave.com/search?q=' + q;
  },
  mojeek: function (q) {
    return 'https://www.mojeek.com/search?q=' + q;
  },
  qwant: function (q) {
    return 'https://www.qwant.com/?q=' + q + '&t=web';
  }
};

function pickEngine(name) {
  return ENGINES[name] || ENGINES.startpage;
}

/* ===============================
   HARDENED NAVIGATION
================================ */
function navigate(url) {
  if (window.__KRY_HARD_NAV__) {
    window.__KRY_HARD_NAV__(url);
  } else {
    location.assign(url);
  }
}

/* ===============================
   QUERY HANDLER
================================ */
function handleQuery(value, engineName, isUrl) {
  if (!value) return;

  value = value.trim();

  // block insecure transport
  if (/^http:\/\//i.test(value)) return;

  var engine = pickEngine(engineName);

  if (!isUrl && /^https:\/\//i.test(value)) {
    navigate(value);
    return;
  }

  var q = encodeURIComponent(value);
  navigate(engine(q));
}

/* ===============================
   DOM READY
================================ */
document.addEventListener('DOMContentLoaded', function () {
  runPlugins();

  var status = document.getElementById('status');
  if (status) status.textContent = 'Private search mode';

  var params = new URLSearchParams(location.search);
  var engine = params.get('engine');

  var q = params.get('q');
  var url = params.get('url');

  if (url) {
    try { url = decodeURIComponent(url); } catch {}
    handleQuery(url, engine, true);
  } else if (q) {
    try { q = decodeURIComponent(q); } catch {}
    handleQuery(q, engine, false);
  }

  var goBtn = document.getElementById('go');
  if (goBtn) {
    goBtn.onclick = function () {
      var input = document.getElementById('q');
      if (input) handleQuery(input.value, engine, false);
    };
  }
});
