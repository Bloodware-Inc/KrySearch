/* ==============================
   URL Param Sanitizer – GitHub Pages Friendly
   Only ?url= & ?q= allowed, tracking stripped before navigation
   ============================== */
/* SPDX-License-Identifier: GPL-3.0-or-later
 * Copyright (C) 2026 Krynet, LLC
 * https://github.com/Bloodware-Inc/KrySearch
 */
(function () {
  "use strict";

  const plugin = {
    id: "url-param-sanitizer-ghp",
    description:
      "Sanitize all URLs: only ?url= & ?q= allowed, strip tracking before navigating (GitHub Pages safe)",

    run() {
      try {
        const ALLOWED_PARAMS = new Set(["url", "q"]);
        const TRACKING_PREFIXES = ["utm_", "fbclid", "gclid", "_ga", "_gl", "_gid"];

        function sanitizeUrl(rawUrl) {
          try {
            const u = new URL(rawUrl, window.location.href);
            const params = new URLSearchParams(u.search);

            for (const key of Array.from(params.keys())) {
              if (
                !ALLOWED_PARAMS.has(key) ||
                TRACKING_PREFIXES.some(p => key.startsWith(p))
              ) {
                params.delete(key);
              }
            }

            return (
              u.origin +
              u.pathname +
              (params.toString() ? "?" + params.toString() : "") +
              u.hash
            );
          } catch {
            return rawUrl;
          }
        }

        /* ===== initial ?url= / ?q= handling ===== */

        const urlParams = new URLSearchParams(window.location.search);
        let finalUrl = null;

        if (urlParams.has("url")) {
          finalUrl = sanitizeUrl(urlParams.get("url"));
        } else if (urlParams.has("q")) {
          finalUrl = sanitizeUrl(urlParams.get("q"));
        }

        if (finalUrl) {
          history.replaceState({}, "", window.location.pathname);
          setTimeout(() => {
            window.location.href = finalUrl;
          }, 50);
        }

        /* ===== link interception ===== */

        document.addEventListener(
          "click",
          e => {
            const a = e.target.closest("a");
            if (!a || !a.href) return;

            const cleanHref = sanitizeUrl(a.href);
            if (a.href !== cleanHref) {
              e.preventDefault();
              e.stopImmediatePropagation();
              setTimeout(() => {
                window.location.href = cleanHref;
              }, 50);
            }
          },
          true
        );

        /* ===== form interception ===== */

        document.addEventListener(
          "submit",
          e => {
            const f = e.target;
            if (!f || !f.action) return;

            const cleanAction = sanitizeUrl(f.action);
            if (f.action !== cleanAction) {
              e.preventDefault();
              e.stopImmediatePropagation();
              f.action = cleanAction;
              setTimeout(() => f.submit(), 50);
            }
          },
          true
        );
      } catch (err) {
        console.error("URL Param Sanitizer (GHP) failed:", err);
      }
    }
  };

  window.KRY_PLUGINS = window.KRY_PLUGINS || [];
  window.KRY_PLUGINS.push(plugin);
})();
