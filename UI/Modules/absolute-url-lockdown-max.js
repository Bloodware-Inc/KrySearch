/* ==============================
   Absolute URL Lockdown MAX
   Auto ?url= query block + Ultimate browser defense
   Patched for static local feeds (CORS-free)
   ============================== */
/* SPDX-License-Identifier: GPL-3.0-or-later
 * Copyright (C) 2026 Krynet, LLC
 * https://github.com/Bloodware-Inc/KrySearch
 */
(function () {
  "use strict";

  const plugin = {
    id: "absolute-url-lockdown-max",
    description: "Maximal browser-only URL defense + automatic ?url= blocking (local feeds)",

    async run() {
      try {
        const BLOCK_THRESHOLD = 60;
        const MAX_DEPTH = 6;
        const SILENT = false;

        const REDIRECT_PARAMS = ["url","u","redirect","target","dest","destination","next","continue","r"];
        const SUSPICIOUS_TLDS = /\.(zip|mov|xyz|top|gq|tk|ml|cf|work|click)$/i;
        const SHORTENERS = new Set(["bit.ly","t.co","tinyurl.com","goo.gl","is.gd","buff.ly","ow.ly","cutt.ly"]);
        const KEYWORDS = /(login|verify|secure|update|wallet|invoice|payment)/i;

        /* ================= LOCAL FEEDS ================= */
        let openPhish = new Set();
        let spamhaus = new Set();
        let malwareHosts = new Set();
        let feedsLoaded = false;

        async function loadFeeds() {
          if (feedsLoaded) return;
          feedsLoaded = true;
          const feeds = [
            { url: "/Feeds/openphish.txt", set: openPhish },
            { url: "/Feeds/spamhaus_drop.txt", set: spamhaus },
            { url: "/Feeds/spamhaus_edrop.txt", set: spamhaus },
            { url: "/Feeds/urlhaus.txt", set: malwareHosts },
            { url: "/Feeds/malc0de.txt", set: malwareHosts }
          ];
          for (const f of feeds) {
            try {
              const r = await fetch(f.url, { cache: "no-store" });
              const t = await r.text();
              t.split("\n").forEach(l => {
                const d = l.trim().split(/[ ;]/)[0];
                if (d && !d.startsWith("#")) f.set.add(d);
              });
              console.log(`[KrySearch] Loaded ${f.set.size} entries from ${f.url}`);
            } catch (err) {
              console.warn(`[KrySearch] Failed to load feed ${f.url}:`, err);
            }
          }
        }

        await loadFeeds();

        /* ================= CSP ================= */
        if (!document.querySelector('meta[http-equiv="Content-Security-Policy"]')) {
          const m = document.createElement("meta");
          m.httpEquiv = "Content-Security-Policy";
          m.content = [
            "default-src 'self'",
            "script-src 'self'",
            "object-src 'none'",
            "base-uri 'none'",
            "frame-ancestors 'none'",
            "form-action 'self'",
            "upgrade-insecure-requests"
          ].join("; ");
          document.head.appendChild(m);
        }

        /* ================= POPUP & DOWNLOAD KILL ================= */
        window.open = function () { return null; };
        document.addEventListener("click", e => {
          const a = e.target.closest("a");
          if (!a) return;
          if (a.hasAttribute("download") || /\.(exe|dll|bat|scr|js)$/i.test(a.href)) {
            e.preventDefault();
            e.stopImmediatePropagation();
            if (!SILENT) alert("🚫 Download blocked: potential malware");
          }
          a.removeAttribute("target");
        }, true);

        /* ================= URL SCORING ================= */
        function extractRedirect(url) {
          try {
            const u = new URL(url);
            for (const p of REDIRECT_PARAMS) {
              if (u.searchParams.has(p)) return decodeURIComponent(u.searchParams.get(p));
            }
          } catch {}
          return null;
        }

        function base64Url(s) {
          try {
            if (!/^[A-Za-z0-9+/=]+$/.test(s)) return null;
            const d = atob(s);
            return d.startsWith("http") ? d : null;
          } catch { return null; }
        }

        function scoreUrl(url) {
          let score = 0, reasons = [];
          try {
            const u = new URL(url);
            if (u.protocol !== "https:") { score += 15; reasons.push("non-https"); }
            if (/^\d+\.\d+\.\d+\.\d+$/.test(u.hostname)) { score += 20; reasons.push("ip-host"); }
            if (u.hostname.startsWith("xn--")) { score += 15; reasons.push("punycode"); }
            if (SHORTENERS.has(u.hostname)) { score += 15; reasons.push("shortener"); }
            if (SUSPICIOUS_TLDS.test(u.hostname)) { score += 10; reasons.push("tld"); }
            if (KEYWORDS.test(u.pathname + u.search)) { score += 10; reasons.push("keyword"); }
            if (openPhish.has(url)) { score += 40; reasons.push("openphish"); }
            if (spamhaus.has(u.hostname)) { score += 40; reasons.push("spamhaus"); }
            if (malwareHosts.has(u.hostname)) { score += 50; reasons.push("malware-feed"); }
            if (/^http:/.test(u.protocol)) score += 10;
            if (u.port && ![80,443].includes(Number(u.port))) score += 10;
            if (/(\.exe|\.dll|\.bat|\.scr|\.js)$/i.test(u.pathname)) score += 20;
          } catch { score += 30; reasons.push("parse-fail"); }
          return { score: Math.min(100, score), reasons };
        }

        async function scan(url, depth=0, chain=[]) {
          if (depth > MAX_DEPTH) return { block:true, chain };
          chain.push(url);
          const { score } = scoreUrl(url);
          if (score >= BLOCK_THRESHOLD) return { block:true, chain };
          const r = extractRedirect(url);
          if (r) return scan(r, depth+1, chain);
          const b64 = base64Url(url.split("=").pop());
          if (b64) return scan(b64, depth+1, chain);
          return { block:false, chain };
        }

        /* ================= AUTO ?URL BLOCK ================= */
        const params = Object.fromEntries(new URLSearchParams(window.location.search));
        const urlParam = params.url || null;
        if (urlParam) {
          const res = await scan(urlParam);
          if (res.block) {
            if(!SILENT) alert("🚫 Dangerous ?url= query blocked automatically.");
            history.replaceState({}, "", location.pathname);
          }
        }

        /* ================= INTERCEPT ================= */
        async function intercept(e) {
          const el = e.target.closest("a, form");
          if (!el) return;
          const url = el.href || el.action;
          if (!url) return;
          const res = await scan(url);
          if (res.block) { e.preventDefault(); e.stopImmediatePropagation(); if(!SILENT) alert("🚫 Unsafe URL blocked."); }
        }

        document.addEventListener("click", intercept, true);
        document.addEventListener("submit", intercept, true);

      } catch {}
    }
  };

  window.KRY_PLUGINS = window.KRY_PLUGINS || [];
  window.KRY_PLUGINS.push(plugin);

})();
