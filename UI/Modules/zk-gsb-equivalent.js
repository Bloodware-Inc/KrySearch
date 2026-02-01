/* SPDX-License-Identifier: GPL-3.0-or-later
 * Copyright (C) 2026 Krynet, LLC
 * https://github.com/Bloodware-Inc/KrySearch
 */
(function () {
  "use strict";

  const CORS_PROXY = "https://corsproxy.io/?";

  window.KRY_PLUGINS = window.KRY_PLUGINS || [];
  window.KRY_PLUGINS.push({
    id: "zk-gsb-equivalent",
    description: "Google Safe Browsing equivalent without API keys, GitHub Pages compatible",

    async run() {
      const FEEDS = {
        openphish: "https://openphish.com/feed.txt",
        urlhaus: "https://urlhaus.abuse.ch/downloads/text/",
        sinking: "https://phish.sinking.yachts/v2/all",
        malwaredomains: "https://mirror1.malwaredomains.com/files/domains.txt",
        easyprivacy: "https://easylist.to/easylist/easyprivacy.txt"
      };

      const BAD = new Set();

      await Promise.all(
        Object.values(FEEDS).map(feed =>
          fetch(CORS_PROXY + encodeURIComponent(feed), { cache: "no-store" })
            .then(r => r.text())
            .then(text =>
              text.split("\n").forEach(line => {
                line = line.trim();
                if (line && !line.startsWith("#") && line.length < 255) {
                  BAD.add(line.replace(/^0\.0\.0\.0\s+/, ""));
                }
              })
            )
            .catch(() => console.warn(`Failed to fetch feed: ${feed}`))
        )
      );

      const entropy = s => new Set(s).size / Math.max(1, s.length);

      function heuristicScore(host) {
        let score = 100;
        if (BAD.has(host)) score -= 80;
        if (entropy(host) > 0.75) score -= 25;
        if (/\d{5,}/.test(host)) score -= 20;
        if (host.split(".")[0].length > 15) score -= 15;
        return score;
      }

      function verdict(url) {
        try {
          const u = new URL(url);
          if (u.protocol !== "https:") throw "no https";
          const score = heuristicScore(u.hostname);
          if (score < 50) throw "unsafe";
          return url;
        } catch {
          throw "unsafe";
        }
      }

      // Override window.open
      const _open = window.open;
      window.open = function (url, ...args) {
        try {
          return _open(verdict(url), ...args);
        } catch {
          alert("🚫 Blocked by Safe‑Browsing equivalent layer");
        }
      };

      // Auto-check ?url= on page load
      const qp = new URLSearchParams(location.search);
      if (qp.has("url")) {
        try {
          location.replace(verdict(qp.get("url")));
        } catch {
          document.body.innerHTML =
            "<h2>🚫 Unsafe destination blocked</h2>";
        }
      }

      console.log("[KrySearch] zk-gsb-equivalent loaded:", BAD.size, "domains loaded");
    }
  });
})();
