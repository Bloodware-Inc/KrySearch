window.KRY_PLUGINS = window.KRY_PLUGINS || [];
window.KRY_PLUGINS.push({
  id: "native-url-adaptive-max",
  order: 60,

  run(ctx: any) {
    try {
      const appMap = [
        // Gaming
        { test: /steam\.com/, app: (url: string) => `steam://openurl/${encodeURIComponent(url)}` },
        { test: /epicgames\.com/, app: (url: string) => `com.epicgames.launcher://${encodeURIComponent(url)}` },
        { test: /gog\.com/, app: (url: string) => `goggalaxy://launch/${encodeURIComponent(url)}` },
        { test: /battle\.net/, app: (url: string) => `battlenet://${encodeURIComponent(url)}` },

        // Social / Collaboration
        { test: /discord\.com/, app: (url: string) => `discord://${encodeURIComponent(url)}` },
        { test: /slack\.com/, app: () => 'slack://open' },
        { test: /teams\.microsoft\.com/, app: (url: string) => `msteams://${encodeURIComponent(url)}` },
        { test: /zoom\.us/, app: (url: string) => `zoomus://${encodeURIComponent(url)}` },

        // Music / media / creators
        { test: /spotify\.com/, app: (url: string) => `spotify://${encodeURIComponent(url)}` },

        // Krynet
        { test: /krynet\.ai/, app: (url: string) => `krynet://${encodeURIComponent(url)}` }
      ];

      const params = new URLSearchParams(location.search);
      let urlParam = params.get("url");
      if (!urlParam) return;

      try { 
        urlParam = decodeURIComponent(urlParam); 
      } catch {}

      // Enforce HTTPS strictly
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
            // Fail silently, fallback
          }
        }
      }

      // Fallback to standard HTTPS
      if (!launched) {
        if (window.__KRY_HARD_NAV__) {
          window.__KRY_HARD_NAV__(urlParam);
        } else {
          window.location.assign(urlParam);
        }
      }

    } catch {
      // Silent fail
    }
  }
});
