window.KRY_PLUGINS = window.KRY_PLUGINS || [];
window.KRY_PLUGINS.push({
  id: "secure-transport-ultra",
  order: 95,

  run() {
    try {
      const enc = new TextEncoder();
      const dec = new TextDecoder();

      const hasCrypto =
        window.crypto &&
        crypto.subtle &&
        typeof crypto.subtle.encrypt === "function";

      const delay = (min = 25, max = 140) =>
        new Promise(r =>
          setTimeout(
            r,
            min +
              (hasCrypto
                ? crypto.getRandomValues(new Uint8Array(1))[0] / 255
                : Math.random()) *
                (max - min)
          )
        );

      /* ===============================
         Session key (CSP‑aware)
      =============================== */
      const sessionKeyPromise = hasCrypto
        ? crypto.subtle.generateKey(
            { name: "AES-GCM", length: 256 },
            false,
            ["encrypt", "decrypt"]
          )
        : null;

      async function seal(str) {
        if (!hasCrypto) return { plain: str };

        const iv = crypto.getRandomValues(new Uint8Array(12));
        const key = await sessionKeyPromise;
        const data = await crypto.subtle.encrypt(
          { name: "AES-GCM", iv },
          key,
          enc.encode(str)
        );
        return { iv, data };
      }

      async function unseal(pkg) {
        if (!hasCrypto || pkg.plain) return pkg.plain;
        const key = await sessionKeyPromise;
        const out = await crypto.subtle.decrypt(
          { name: "AES-GCM", iv: pkg.iv },
          key,
          pkg.data
        );
        return dec.decode(out);
      }

      function wipe(o) {
        if (!o) return;
        for (const k in o) if (o[k] instanceof Uint8Array) o[k].fill(0);
      }

      /* ===============================
         Engine detection
      =============================== */
      function isEngineURL(url) {
        try {
          return new URL(url, location.href).searchParams.has("engine");
        } catch {
          return false;
        }
      }

      async function hardNavigate(url) {
        try {
          const sealed = await seal(url);
          await delay();
          const finalURL = await unseal(sealed);
          wipe(sealed);
          location.assign(finalURL);
        } catch {
          location.assign(url);
        }
      }

      /* ===============================
         Shadow‑wrap location APIs
      =============================== */
      const realAssign = location.assign.bind(location);
      const realReplace = location.replace.bind(location);

      location.assign = url =>
        isEngineURL(url) ? hardNavigate(url) : realAssign(url);

      location.replace = url =>
        isEngineURL(url) ? hardNavigate(url) : realReplace(url);

      Object.defineProperty(location, "href", {
        set(url) {
          isEngineURL(url) ? hardNavigate(url) : realAssign(url);
        },
        get() {
          return realAssign.toString && document.URL;
        },
        configurable: false
      });

      /* ===============================
         Pre‑DOM sealing (click + submit)
      =============================== */
      document.addEventListener(
        "click",
        e => {
          const a = e.target.closest("a[href]");
          if (!a) return;
          if (isEngineURL(a.href)) {
            e.preventDefault();
            hardNavigate(a.href);
          }
        },
        true
      );

      document.addEventListener(
        "submit",
        e => {
          const form = e.target;
          if (form?.action && isEngineURL(form.action)) {
            e.preventDefault();
            hardNavigate(form.action);
          }
        },
        true
      );

      /* ===============================
         MutationObserver: kill injected anchors
      =============================== */
      const observer = new MutationObserver(mutations => {
        for (const m of mutations) {
          for (const n of m.addedNodes) {
            if (n.nodeType !== 1) continue;

            if (n.tagName === "A" && isEngineURL(n.href)) {
              n.remove();
              continue;
            }

            if (n.querySelectorAll) {
              n.querySelectorAll("a[href]").forEach(a => {
                if (isEngineURL(a.href)) a.remove();
              });
            }
          }
        }
      });

      observer.observe(document.documentElement, {
        childList: true,
        subtree: true
      });

      /* ===============================
         Expose hardened entry (locked)
      =============================== */
      Object.defineProperty(window, "__KRY_HARD_NAV__", {
        value: hardNavigate,
        writable: false,
        configurable: false,
        enumerable: false
      });

      Object.freeze(window.__KRY_HARD_NAV__);

    } catch {
      // silent by design
    }
  }
});
