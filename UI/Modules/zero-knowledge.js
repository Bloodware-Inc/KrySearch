/* SPDX-License-Identifier: GPL-3.0-or-later
 * Copyright (C) 2026 Krynet, LLC
 * https://github.com/Bloodware-Inc/KrySearch
 */
(function(){
  "use strict";

  const plugin = {
    id: "absolute-zero-knowledge-godmode",
    description: "Encrypted relay + hybrid crypto + full search isolation",

    async run() {
      try {
        /* ============ LOAD CONFIG ============ */
        let cfg = null;
        try {
          const res = await fetch("./Config/config.json", { cache: "no-store" });
          if (res.ok) cfg = await res.json();
        } catch {}
        if (!cfg) return;

        const params = new URLSearchParams(location.search);
        if (!params.has("size") && !params.has(cfg.routing?.queryParam || "q")) return;

        const QP = cfg.routing?.queryParam || "q";
        const UP = cfg.routing?.urlParam || "url";
        const RELAY = cfg.routing?.relay || "/search";
        const MAX_LEN = cfg.limits?.queryMax || 256;

        /* ============ HARD URL ISOLATION ============ */
        if (params.has(UP)) {
          try {
            const u = new URL(params.get(UP));
            if (u.protocol === "https:") location.replace(u.href);
          } catch {}
          history.replaceState(null, "", "/");
          return;
        }

        if (!params.has(QP)) return;

        /* ============ CLEAN QUERY ============ */
        let q = params.get(QP)?.normalize("NFKC").replace(/[^\x20-\x7E]/g, "").slice(0, MAX_LEN);
        if (!q) return;
        history.replaceState(null, "", "/");

        /* ============ CRYPTO ============ */
        const enc = new TextEncoder();
        const sha = buf => crypto.subtle.digest("SHA-512", buf);

        async function seal(msg) {
          try {
            const eph = await crypto.subtle.generateKey(
              { name: "ECDH", namedCurve: "X25519" },
              false,
              ["deriveBits"]
            );

            const bits = await crypto.subtle.deriveBits(
              { name: "ECDH", public: eph.publicKey },
              eph.privateKey,
              256
            );

            const key = await crypto.subtle.importKey(
              "raw",
              await sha(bits),
              { name: "AES-GCM" },
              false,
              ["encrypt"]
            );

            const iv = crypto.getRandomValues(new Uint8Array(12));
            const ct = await crypto.subtle.encrypt(
              { name: "AES-GCM", iv },
              key,
              enc.encode(msg)
            );

            // safer base64 for large arrays
            const payload = btoa(
              Array.from(new Uint8Array(ct))
                .map(c => String.fromCharCode(c))
                .join("")
            );

            return { iv: Array.from(iv), payload };
          } catch { return null; }
        }

        const real = await seal(q);
        q = null;
        if (!real) return;

        /* ============ ISOLATED POST ============ */
        const form = document.createElement("form");
        form.method = "POST";
        form.action = RELAY;
        form.style.display = "none";

        const input = document.createElement("input");
        input.name = "zk";
        input.value = JSON.stringify({ v: 1, real });

        form.appendChild(input);
        document.body.appendChild(form);
        form.submit();
        setTimeout(() => form.remove(), 1500);

      } catch {}
    }
  };

  window.KRY_PLUGINS = window.KRY_PLUGINS || [];
  window.KRY_PLUGINS.push(plugin);
})();
