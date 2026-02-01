/* ==============================
   zk-gsb-equivalent.js
   Google Safe Browsing equivalent – local feeds only
   ============================== */
/* SPDX-License-Identifier: GPL-3.0-or-later
 * Copyright (C) 2026 Krynet, LLC
 * https://github.com/Bloodware-Inc/KrySearch
 */
(function () {
  "use strict";

  window.KRY_PLUGINS = window.KRY_PLUGINS || [];
  window.KRY_PLUGINS.push({
    id: "zk-gsb-equivalent",
    description: "Safe Browsing equivalent using local feeds only",

    async run() {
          const FEEDS = [
            { url: "Modules/Feeds/openphish.txt", set: openPhish },
            { url: "Modules/Feeds/spamhaus_drop.txt", set: spamhaus },
            { url: "Modules/Feeds/urlhaus.txt", set: malwareHosts }
          ];

      const BAD = new Set();

      // Load local feeds
      await Promise.all(
        Object.entries(FEEDS).map(async ([name, path]) => {
          try {
            const r = await fetch(path, { cache: "force-cache" });
            const text = await r.text();
            text.split("\n").forEach(line => {
              const l = line.trim();
              if (l && !l.startsWith("#") && l.length < 255) {
                // Remove common prefixes like 0.0.0.0
                BAD.add(l.replace(/^0\.0\.0\.0\s+/, ""));
              }
            });
          } catch (err) {
            console.warn(`[KrySearch] Failed to load local feed: ${path}`, err);
          }
        })
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
        const u = new URL(url);
        if (u.protocol !== "https:") throw "no https";

        const score = heuristicScore(u.hostname);
        if (score < 50) throw "unsafe";
        return url;
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

      // Auto-block ?url= queries
      const qp = new URLSearchParams(location.search);
      if (qp.has("url")) {
        try {
          location.replace(verdict(qp.get("url")));
        } catch {
          document.body.innerHTML =
            "<h2>🚫 Unsafe destination blocked</h2>";
        }
      }

      console.log(`[KrySearch] zk-gsb-equivalent loaded: ${BAD.size} domains loaded`);
    }
  });
})();
