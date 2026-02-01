/* SPDX-License-Identifier: GPL-3.0-or-later
 * Copyright (C) 2026 Krynet, LLC
 * https://github.com/Bloodware-Inc/KrySearch
 */
(function () {
  const plugin = {
    id: "privacy-max-hardening",
    description: "Flatten CSS, fonts, hardware, and GPU surfaces",

    run() {
      try {
        // ===============================
        // 1. CSS Media Queries
        // ===============================
        if (window.matchMedia) {
          const realMatchMedia = window.matchMedia.bind(window);
          window.matchMedia = function (query) {
            let matches = false;
            if (/prefers-color-scheme: dark/i.test(query)) matches = false;
            else if (/prefers-reduced-motion/i.test(query)) matches = false;
            else if (/prefers-contrast/i.test(query)) matches = "no-preference";

            return {
              matches: matches,
              media: query,
              addListener: () => {},
              removeListener: () => {},
              addEventListener: () => {},
              removeEventListener: () => {},
              dispatchEvent: () => false
            };
          };
          try { Object.freeze(window.matchMedia); } catch {}
        }

        // ===============================
        // 2. Font Metrics / Layout Timing
        // ===============================
        function neutralizeElement(elProto) {
          if (!elProto || !elProto.getBoundingClientRect) return;
          const realGetBoundingClientRect = elProto.getBoundingClientRect;
          elProto.getBoundingClientRect = function () {
            const rect = realGetBoundingClientRect.call(this);
            return {
              x: Math.round(rect.x),
              y: Math.round(rect.y),
              width: Math.round(rect.width),
              height: Math.round(rect.height),
              top: Math.round(rect.top),
              left: Math.round(rect.left),
              right: Math.round(rect.right),
              bottom: Math.round(rect.bottom)
            };
          };
        }

        neutralizeElement(Element.prototype);
        neutralizeElement(HTMLElement.prototype);

        // ===============================
        // 3. Hardware Concurrency
        // ===============================
        if ("hardwareConcurrency" in navigator) {
          try {
            Object.defineProperty(navigator, "hardwareConcurrency", {
              get: function () { return 4; },
              configurable: false,
              enumerable: true
            });
          } catch {}
        }

        // ===============================
        // 4. GPU Timing / WebGPU
        // ===============================
        if (window.GPUDevice) {
          try {
            const deviceProto = window.GPUDevice.prototype;
            if (deviceProto && deviceProto.createCommandEncoder) {
              const origEncoder = deviceProto.createCommandEncoder;
              deviceProto.createCommandEncoder = function () {
                const enc = origEncoder.apply(this, arguments);
                if (enc && enc.finish) {
                  try {
                    enc.finish = new Proxy(enc.finish, {
                      apply(target, thisArg, argumentsList) {
                        return target.apply(thisArg, argumentsList);
                      }
                    });
                  } catch {}
                }
                return enc;
              };
            }
          } catch {}
        }

      } catch {
        // silent fail
      }
    }
  };

  window.KRY_PLUGINS = window.KRY_PLUGINS || [];
  window.KRY_PLUGINS.push(plugin);
})();
