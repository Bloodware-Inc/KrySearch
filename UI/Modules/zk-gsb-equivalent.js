/* SPDX-License-Identifier: GPL-3.0-or-later
 * Copyright (C) 2026 Krynet, LLC
 * Safe “GSB-equivalent” using local static feeds only
 */
(function () {
  "use strict";

  window.KRY_PLUGINS = window.KRY_PLUGINS || [];
  window.KRY_PLUGINS.push({
    id: "zk-gsb-static",
    description: "Safe browsing equivalent using local static feeds only",

    async run() {
      const FEEDS = {
        openphish: "/Feeds/openphish.txt",
        urlhaus: "/Feeds/urlhaus.txt",
        malwaredomains: "/Feeds/malwaredomains.txt",
        easyprivacy: "/Feeds/easyprivacy.txt"
      };

      const BAD = new Set();

      for (const [name, url] of Object.entries(FEEDS)) {
        try {
          const res = await fetch(url, { cache: "no-store" });
          const text = await res.text();
          text.split("\n").forEach(line => {
            line = line.trim();
            if (line && !line.startsWith("#") && line.length < 255) {
              BAD.add(line.replace(/^0\.0\.0\.0\s+/, ""));
            }
          });
          console.log(`[KrySearch] Loaded ${BAD.size} entries from ${name}`);
        } catch (err) {
          console.warn(`[KrySearch] Failed to load feed ${name}:`, err);
        }
      }

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

      const _open = window.open;
      window.open = function(url, ...args) {
        try { return _open(verdict(url), ...args); }
        catch { alert("🚫 Blocked by Safe‑Browsing layer"); }
      };

      const qp = new URLSearchParams(location.search);
      if (qp.has("url")) {
        try { location.replace(verdict(qp.get("url"))); }
        catch { document.body.innerHTML = "<h2>🚫 Unsafe destination blocked</h2>"; }
      }
    }
  });
})();
