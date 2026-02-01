/* SPDX-License-Identifier: GPL-3.0-or-later
 * Copyright (C) 2026 Krynet, LLC
 * https://github.com/Bloodware-Inc/KrySearch
 */
(function () {
  const plugin = {
    id: "privacy-hardening",
    description: "Disable high-risk browser APIs",

    run() {
      const deny = () => undefined; // silent, returns nothing instead of throwing

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

      targets.forEach(k => {
        if (navigator[k] !== undefined) {
          try {
            Object.defineProperty(navigator, k, {
              get: deny,
              configurable: false,
              enumerable: false
            });
          } catch {
            // fail silently
          }
        }
      });

      // freeze the navigator to prevent further tampering
      try { Object.freeze(navigator); } catch {}
    }
  };

  window.KRY_PLUGINS = window.KRY_PLUGINS || [];
  window.KRY_PLUGINS.push(plugin);
})();
