(function () {
  const plugin = {
    id: "privacy-clean-max",
    description: "Clear all storage and disable speculative APIs",

    run() {
      try {
        // ===============================
        // Storage
        // ===============================
        try { localStorage.clear(); } catch {}
        try { sessionStorage.clear(); } catch {}
        try {
          if (window.indexedDB) {
            indexedDB.databases?.().then(dbs => {
              dbs.forEach(db => indexedDB.deleteDatabase(db.name));
            }).catch(() => {});
          }
        } catch {}

        // ===============================
        // Cookies
        // ===============================
        try {
          document.cookie.split(";").forEach(c => {
            document.cookie = c.replace(/^ +/, "")
              .replace(/=.*/, "=;expires=Thu, 01 Jan 1970 00:00:00 UTC;path=/");
          });
        } catch {}

        // ===============================
        // Kill speculative fetches
        // ===============================
        const killLinks = () => {
          document.querySelectorAll(
            'link[rel="prefetch"],link[rel="dns-prefetch"],link[rel="prerender"],link[rel="preconnect"]'
          ).forEach(l => l.remove());
        };

        killLinks();

        // Observe future DOM insertions to kill speculative links
        const observer = new MutationObserver(muts => {
          muts.forEach(m => {
            m.addedNodes.forEach(n => {
              if (n.querySelectorAll) killLinks();
            });
          });
        });

        observer.observe(document.documentElement, { childList: true, subtree: true });

      } catch {
        // silent fail
      }
    }
  };

  window.KRY_PLUGINS = window.KRY_PLUGINS || [];
  window.KRY_PLUGINS.push(plugin);
})();
