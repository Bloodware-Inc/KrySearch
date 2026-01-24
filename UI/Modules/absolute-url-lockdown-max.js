(function () {
  "use strict";

  const plugin = {
    id: "absolute-url-lockdown-max",
    description: "Maximal browser-only URL defense: sandbox, diffs, scoring, CSP, popup & download kill",

    async run() {
      try {
        /* ================= CONFIG ================= */
        const BLOCK_THRESHOLD = 60; // risk score to block
        const MAX_DEPTH = 6;
        const SILENT = false;

        const REDIRECT_PARAMS = [
          "url","u","redirect","target","dest","destination","next","continue","r"
        ];

        const SUSPICIOUS_TLDS = /\.(zip|mov|xyz|top|gq|tk|ml|cf|work|click)$/i;
        const SHORTENERS = new Set([
          "bit.ly","t.co","tinyurl.com","goo.gl","is.gd","buff.ly","ow.ly","cutt.ly"
        ]);
        const KEYWORDS = /(login|verify|secure|update|wallet|invoice|payment)/i;

        /* ================= FEEDS ================= */
        let openPhish = new Set();
        let spamhaus = new Set();
        let feedsLoaded = false;

        async function loadFeeds() {
          if (feedsLoaded) return;
          feedsLoaded = true;
          const feeds = [
            { url: "https://raw.githubusercontent.com/openphish/public_feed/master/feed.txt", set: openPhish },
            { url: "https://www.spamhaus.org/drop/drop.txt", set: spamhaus },
            { url: "https://www.spamhaus.org/drop/edrop.txt", set: spamhaus }
          ];
          await Promise.all(feeds.map(async f => {
            try {
              const r = await fetch(f.url, { cache: "force-cache" });
              const t = await r.text();
              t.split("\n").forEach(l => {
                const d = l.trim().split(/[ ;]/)[0];
                if (d && !d.startsWith("#")) f.set.add(d);
              });
            } catch {}
          }));
        }

        /* ================= CLOUD ================= */
        async function checkURLhaus(url) {
          try {
            const r = await fetch("https://urlhaus-api.abuse.ch/v1/url/", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ url })
            });
            const j = await r.json();
            return j?.query_status === "ok";
          } catch { return false; }
        }

        async function dohBlocked(host) {
          try {
            const r = await fetch(
              "https://cloudflare-dns.com/dns-query?name=" + host,
              { headers: { accept: "application/dns-json" } }
            );
            const j = await r.json();
            return j?.Status !== 0;
          } catch { return false; }
        }

        /* ================= CSP ================= */
        function injectCSP() {
          if (document.querySelector('meta[http-equiv="Content-Security-Policy"]')) return;
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
        injectCSP();

        /* ================= POPUP / DOWNLOAD KILL ================= */
        const _open = window.open;
        window.open = function () { return null; }; // kill popups

        document.addEventListener("click", e => {
          const a = e.target.closest("a");
          if (!a) return;
          if (a.hasAttribute("download")) {
            e.preventDefault();
            e.stopImmediatePropagation();
          }
          a.removeAttribute("target"); // no _blank popunders
        }, true);

        /* ================= UTIL ================= */
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

        /* ================= RISK SCORING ================= */
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
          } catch {
            score += 30; reasons.push("parse-fail");
          }
          return { score: Math.min(100, score), reasons };
        }

        /* ================= SANDBOX PRE-NAV ================= */
        async function sandboxProbe(url) {
          return new Promise(resolve => {
            const iframe = document.createElement("iframe");
            iframe.style.display = "none";
            iframe.sandbox = "allow-same-origin"; // no scripts/forms/popups
            let chain = [];
            let last = null;

            const timer = setTimeout(() => {
              cleanup();
              resolve({ chain, risky: false });
            }, 2500);

            function cleanup() {
              clearTimeout(timer);
              iframe.remove();
            }

            iframe.onload = () => {
              try {
                const loc = iframe.contentWindow.location.href;
                if (loc && loc !== last) {
                  chain.push(loc);
                  last = loc;
                }
              } catch {}
            };

            iframe.src = url;
            document.body.appendChild(iframe);

            setTimeout(() => {
              cleanup();
              resolve({ chain, risky: chain.length > 1 });
            }, 1800);
          });
        }

        /* ================= SCAN ================= */
        async function scan(url, depth = 0, chain = []) {
          if (depth > MAX_DEPTH) return { block: true, chain };

          chain.push(url);

          const { score } = scoreUrl(url);
          if (score >= BLOCK_THRESHOLD) return { block: true, chain };

          try {
            const u = new URL(url);
            if (await dohBlocked(u.hostname)) return { block: true, chain };
            if (await checkURLhaus(url)) return { block: true, chain };
          } catch { return { block: true, chain }; }

          const r = extractRedirect(url);
          if (r) return scan(r, depth + 1, chain);

          const b64 = base64Url(url.split("=").pop());
          if (b64) return scan(b64, depth + 1, chain);

          return { block: false, chain };
        }

        /* ================= DIFF VIEWER ================= */
        function diffChain(chain) {
          if (chain.length < 2) return;
          console.group("🔎 Redirect chain diff");
          for (let i = 1; i < chain.length; i++) {
            try {
              const a = new URL(chain[i - 1]);
              const b = new URL(chain[i]);
              console.log(`Hop ${i}:`, {
                from: a.href,
                to: b.href,
                host: a.hostname !== b.hostname,
                protocol: a.protocol !== b.protocol,
                path: a.pathname !== b.pathname,
                query: a.search !== b.search
              });
            } catch {}
          }
          console.groupEnd();
        }

        /* ================= INTERCEPT ================= */
        async function intercept(e) {
          const el = e.target.closest("a, form");
          if (!el) return;

          const url = el.href || el.action;
          if (!url) return;

          await loadFeeds();

          // sandbox probe first
          const probe = await sandboxProbe(url);
          if (probe.chain.length) diffChain(probe.chain);

          const res = await scan(url);
          if (res.chain.length) diffChain(res.chain);

          if (probe.risky || res.block) {
            e.preventDefault();
            e.stopImmediatePropagation();
            if (!SILENT) alert("🚫 Unsafe URL blocked (multi-layer).");
          }
        }

        document.addEventListener("click", intercept, true);
        document.addEventListener("submit", intercept, true);

        // lock history JS redirects
        ["pushState","replaceState"].forEach(fn => {
          const o = history[fn];
          history[fn] = function (s,t,u) {
            if (u) intercept({ target: { closest: () => ({ href: u }) }, preventDefault(){}, stopImmediatePropagation(){} });
            return o.apply(this, arguments);
          };
        });

      } catch {
        // silent fail
      }
    }
  };

  window.KRY_PLUGINS = window.KRY_PLUGINS || [];
  window.KRY_PLUGINS.push(plugin);
})();
