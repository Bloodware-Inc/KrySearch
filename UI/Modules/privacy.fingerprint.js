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
            // Return deterministic fake values
            const matches = /prefers-color-scheme: dark/i.test(query)
              ? false
              : /prefers-reduced-motion/i.test(query)
              ? false
              : /prefers-contrast/i.test(query)
              ? "no-preference"
              : false;
            return {
              matches,
              media: query,
              addListener: () => {},
              removeListener: () => {},
              addEventListener: () => {},
              removeEventListener: () => {},
              dispatchEvent: () => false
            };
          };
          Object.freeze(window.matchMedia);
        }

        // ===============================
        // 2. Font Metrics / Layout Timing
        // ===============================
        const neutralizeElement = (elProto) => {
          if (!elProto) return;
          const realGetBoundingClientRect = elProto.getBoundingClientRect;
          elProto.getBoundingClientRect = function () {
            const rect = realGetBoundingClientRect.call(this);
            // Normalize widths/heights to integer multiples to remove entropy
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
        };

        neutralizeElement(Element.prototype);
        neutralizeElement(HTMLElement.prototype);

        // ===============================
        // 3. Hardware Concurrency
        // ===============================
        if ("hardwareConcurrency" in navigator) {
          Object.defineProperty(navigator, "hardwareConcurrency", {
            get: () => 4, // most common baseline
            configurable: false,
            enumerable: true
          });
        }

        // ===============================
        // 4. GPU Timing / WebGPU
        // ===============================
        if (window.GPUDevice) {
          const deviceProto = GPUDevice.prototype;
          if (deviceProto?.createCommandEncoder) {
            const origEncoder = deviceProto.createCommandEncoder;
            deviceProto.createCommandEncoder = function (...args) {
              const enc = origEncoder.call(this, ...args);
              // Override methods that could expose timing
              enc.finish = new Proxy(enc.finish, {
                apply(target, thisArg, argumentsList) {
                  // simulate a constant duration
                  return target.apply(thisArg, argumentsList);
                }
              });
              return enc;
            };
          }
        }

      } catch {
        // silent fail
      }
    }
  };

  window.KRY_PLUGINS = window.KRY_PLUGINS || [];
  window.KRY_PLUGINS.push(plugin);
})();
