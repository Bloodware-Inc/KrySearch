/**
 * OpenInApp – Krynet Plugin
 * Fully cross-platform, production-ready
 * Tries native app first, naturally falls back to browser
 */

window.KRY_PLUGINS = window.KRY_PLUGINS || [];
window.KRY_PLUGINS.push({
  id: "open-in-app-clean",
  order: 60,

  run: function (ctx) {
    try {
      const params = new URLSearchParams(location.search);
      const urlParamRaw = params.get("url");
      if (!urlParamRaw) return;

      let urlParam;
      try {
        urlParam = decodeURIComponent(urlParamRaw);
      } catch {
        urlParam = urlParamRaw;
      }

      if (!/^https:\/\//i.test(urlParam)) return;

      // Default apps & schemes
      const apps = [
        { test: /steam\.com/, scheme: function (url) { return "steam://openurl/" + encodeURIComponent(url); } },
        { test: /epicgames\.com/, scheme: function (url) { return "com.epicgames.launcher://" + encodeURIComponent(url); } },
        { test: /gog\.com/, scheme: function (url) { return "goggalaxy://launch/" + encodeURIComponent(url); } },
        { test: /battle\.net/, scheme: function () { return "battlenet://"; } },

        { test: /discord\.com/, scheme: function () { return "discord://"; } },
        { test: /slack\.com/, scheme: function () { return "slack://open"; } },
        { test: /teams\.microsoft\.com/, scheme: function (url) { return "msteams://" + encodeURIComponent(url); } },
        { test: /zoom\.us/, scheme: function (url) { return "zoomus://" + encodeURIComponent(url); } },

        { test: /spotify\.com/, scheme: function () { return "spotify://"; } },
        { test: /youtube\.com/, scheme: function (url) { return "youtube://" + encodeURIComponent(url); } },
        { test: /twitch\.tv/, scheme: function (url) { return "twitch://" + encodeURIComponent(url); } },

        { test: /krynet\.ai/, scheme: function (url) { return "krynet://" + encodeURIComponent(url); } }
      ];

      function tryOpenApp(appUrl) {
        try {
          const iframe = document.createElement("iframe");
          iframe.style.display = "none";
          iframe.src = appUrl;
          document.body.appendChild(iframe);
          setTimeout(function () {
            if (iframe.parentNode) iframe.parentNode.removeChild(iframe);
          }, 1000);
        } catch {}
      }

      for (let i = 0; i < apps.length; i++) {
        const app = apps[i];
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
