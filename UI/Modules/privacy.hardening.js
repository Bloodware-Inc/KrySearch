/* SPDX-License-Identifier: GPL-3.0-or-later
 * Copyright (C) 2026 Krynet, LLC
 * https://github.com/Bloodware-Inc/KrySearch
 */
(function () {
  "use strict";

  const plugin = {
    id: "privacy-hardening",
    description: "Disable high-risk browser APIs (cross-browser safe)",

    run() {
      const deny = () => undefined;

      // List of high-risk navigator APIs
      const targets = [
        "geolocation",
        "mediaDevices",
        "clipboard",
        "bluetooth",
        "usb",
        "serial",
        "vibrate",
        "storage",
        "push"
      ];

      targets.forEach(api => {
        try {
          // Detect if the property exists on navigator
          if (api in navigator) {
            // Patch the property safely
            Object.defineProperty(navigator, api, {
              get: deny,
              configurable: true,
              enumerable: false
            });
          }

          // Also patch the prototype for better coverage (Safari/Firefox)
          const proto = Object.getPrototypeOf(navigator);
          if (proto && api in proto) {
            Object.defineProperty(proto, api, {
              get: deny,
              configurable: true,
              enumerable: false
            });
          }
        } catch {
          // Fail silently if the browser prevents patching
        }
      });

      // Freeze navigator to prevent further tampering
      try { Object.freeze(navigator); } catch {}
      try { Object.freeze(Object.getPrototypeOf(navigator)); } catch {}

      // Freeze window.navigator itself for extra safety
      try { Object.freeze(window.navigator); } catch {}
    }
  };

  window.KRY_PLUGINS = window.KRY_PLUGINS || [];
  window.KRY_PLUGINS.push(plugin);
})();
