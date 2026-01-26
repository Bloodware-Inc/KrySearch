/**
 * OpenInApp – Krynet Plugin
 * Fully cross-platform, production-ready
 * Tries native app first, naturally falls back to browser
 */

window.KRY_PLUGINS = window.KRY_PLUGINS || [];
window.KRY_PLUGINS.push({
  id: "open-in-app-clean",
  order: 60,

  run(ctx: any) {
    try {
      const urlParamRaw = new URLSearchParams(location.search).get("url");
      if (!urlParamRaw) return;

      let urlParam: string;
      try { urlParam = decodeURIComponent(urlParamRaw); } catch { urlParam = urlParamRaw; }
      if (!/^https:\/\//i.test(urlParam)) return;

      // Default apps & schemes
      const apps = [
        { test: /steam\.com/, scheme: (url: string) => `steam://openurl/${encodeURIComponent(url)}` },
        { test: /epicgames\.com/, scheme: (url: string) => `com.epicgames.launcher://${encodeURIComponent(url)}` },
        { test: /gog\.com/, scheme: (url: string) => `goggalaxy://launch/${encodeURIComponent(url)}` },
        { test: /battle\.net/, scheme: (url: string) => `battlenet://${encodeURIComponent(url)}` },

        { test: /discord\.com/, scheme: () => 'discord://' },
        { test: /slack\.com/, scheme: () => 'slack://open' },
        { test: /teams\.microsoft\.com/, scheme: (url: string) => `msteams://${encodeURIComponent(url)}` },
        { test: /zoom\.us/, scheme: (url: string) => `zoomus://${encodeURIComponent(url)}` },

        { test: /spotify\.com/, scheme: () => 'spotify://' },
        { test: /youtube\.com/, scheme: (url: string) => `youtube://${encodeURIComponent(url)}` },
        { test: /twitch\.tv/, scheme: (url: string) => `twitch://${encodeURIComponent(url)}` },

        { test: /krynet\.ai/, scheme: (url: string) => `krynet://${encodeURIComponent(url)}` }
      ];

      const tryOpenApp = (appUrl: string) => {
        try {
          const iframe = document.createElement('iframe');
          iframe.style.display = 'none';
          iframe.src = appUrl;
          document.body.appendChild(iframe);
          setTimeout(() => document.body.removeChild(iframe), 1000);
        } catch {}
      };

      for (const app of apps) {
        if (app.test.test(urlParam)) {
          const appUrl = app.scheme(urlParam);
          if (window.__KRY_HARD_NAV__) {
            window.__KRY_HARD_NAV__(appUrl);
          } else {
            tryOpenApp(appUrl);
          }
          break;
        }
      }
    } catch {}
  }
});
