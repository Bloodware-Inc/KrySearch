window.KRY_PLUGINS = window.KRY_PLUGINS || [];
window.KRY_PLUGINS.push({
  id: "native-url-adaptive-max",
  order: 60,

  run(ctx) {
    try {
      const appMap = [
        // Gaming
        { test: /steam\.com/, app: url => 'steam://openurl/'+encodeURIComponent(url) },
        { test: /epicgames\.com/, app: url => 'com.epicgames.launcher://'+encodeURIComponent(url) },
        { test: /gog\.com/, app: url => 'goggalaxy://launch/'+encodeURIComponent(url) },
        { test: /battle\.net/, app: url => 'battlenet://'+encodeURIComponent(url) },

        // Social / Collaboration
        { test: /discord\.com/, app: url => 'discord://'+encodeURIComponent(url) },
        { test: /slack\.com/, app: url => 'slack://open' },
        { test: /teams\.microsoft\.com/, app: url => 'msteams://'+encodeURIComponent(url) },
        { test: /zoom\.us/, app: url => 'zoomus://'+encodeURIComponent(url) },

        // Music / media / creators
        { test: /spotify\.com/, app: url => 'spotify://'+encodeURIComponent(url) },

        // Krynet
        { test: /krynet\.ai/, app: url => 'krynet://'+encodeURIComponent(url) }
      ];

      const params = new URLSearchParams(location.search);
      let urlParam = params.get("url");
      if (!urlParam) return;

      try { urlParam = decodeURIComponent(urlParam); } catch {}

      // enforce HTTPS strictly
      if (!/^https:\/\//i.test(urlParam)) return;

      // Adaptive launcher: try app first, fallback to web
      let launched = false;
      for (const map of appMap) {
        if (map.test.test(urlParam)) {
          try {
            if (window.__KRY_HARD_NAV__) {
              window.__KRY_HARD_NAV__(map.app(urlParam));
            } else {
              window.location.assign(map.app(urlParam));
            }
            launched = true;
            break;
          } catch {
            // fail silently, fallback
          }
        }
      }

      // fallback to standard HTTPS
      if (!launched) {
        if (window.__KRY_HARD_NAV__) {
          window.__KRY_HARD_NAV__(urlParam);
        } else {
          window.location.assign(urlParam);
        }
      }

    } catch {
      // silent fail
    }
  }
});
