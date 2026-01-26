/* ==============================
   Absolute Query Lockdown MAX
   Only ?url= & ?q= allowed, all else stripped
   ============================== */
(function() {
  "use strict";

  const plugin = {
    id: "query-param-lockdown",
    description: "Only ?url= and ?q= are allowed; all other params stripped, hijacks blocked, URL sanitized",

    run() {
      try {
        const ALLOWED_PARAMS = new Set(["url","q"]);

        function sanitizeURL() {
          const params = new URLSearchParams(window.location.search);
          let modified = false;

          // Remove disallowed params
          for (const key of Array.from(params.keys())) {
            if (!ALLOWED_PARAMS.has(key)) {
              params.delete(key);
              modified = true;
            }
          }

          // Strip tracking junk (utm, fbclid, gclid, _ga, etc)
          const TRACKING_PREFIXES = ["utm_","fbclid","gclid","_ga","_gl","_gid"];
          for (const key of Array.from(params.keys())) {
            for (const prefix of TRACKING_PREFIXES) {
              if (key.startsWith(prefix)) {
                params.delete(key);
                modified = true;
              }
            }
          }

          // Rebuild URL only with allowed params
          if (modified) {
            const newUrl = window.location.origin + window.location.pathname + (params.toString() ? "?" + params.toString() : "");
            history.replaceState({}, "", newUrl);
          }
        }

        // Initial sanitize on page load
        sanitizeURL();

        // Monitor URL changes (JS / pushState / replaceState)
        ["pushState","replaceState"].forEach(fn => {
          const original = history[fn];
          history[fn] = function(state, title, url) {
            if (url) {
              const u = new URL(url, window.location.origin);
              const params = new URLSearchParams(u.search);
              let allowed = false;
              for (const key of params.keys()) {
                if (ALLOWED_PARAMS.has(key)) {
                  allowed = true;
                }
              }
              if (!allowed) {
                console.warn("🚫 Attempted injection / hijack blocked:", url);
                return; // block illegal param changes
              }
              // Strip extra tracking
              for (const key of Array.from(params.keys())) {
                if (!ALLOWED_PARAMS.has(key) || ["utm_","fbclid","gclid","_ga","_gl","_gid"].some(p => key.startsWith(p))) {
                  params.delete(key);
                }
              }
              url = u.origin + u.pathname + (params.toString() ? "?" + params.toString() : "");
            }
            return original.apply(this, [state,title,url]);
          };
        });

        // Monitor hash changes for hijack attempts
        window.addEventListener("hashchange", () => sanitizeURL());

        // Monitor clicks on links that try to inject disallowed params
        document.addEventListener("click", e => {
          const a = e.target.closest("a");
          if (!a || !a.href) return;
          const u = new URL(a.href, window.location.origin);
          let hasIllegal = false;
          for (const key of u.searchParams.keys()) {
            if (!ALLOWED_PARAMS.has(key)) hasIllegal = true;
          }
          if (hasIllegal) {
            e.preventDefault();
            e.stopImmediatePropagation();
            console.warn("🚫 Link with illegal query params blocked:", a.href);
          }
        }, true);

      } catch (err) {
        console.error("Query Param Lockdown failed silently:", err);
      }
    }
  };

  window.KRY_PLUGINS = window.KRY_PLUGINS || [];
  window.KRY_PLUGINS.push(plugin);
})();
