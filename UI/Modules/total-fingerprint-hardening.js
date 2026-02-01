/* KrySearch Total Fingerprint Hardening Plugin
 * Silent, deterministic, privacy-first
 * Covers all high-entropy JS surfaces
 */
/* SPDX-License-Identifier: GPL-3.0-or-later
 * Copyright (C) 2026 Krynet, LLC
 * https://github.com/Bloodware-Inc/KrySearch
 */
(function () {
  const plugin = {
    id: "total-fingerprint-hardening",
    description: "Full-surface fingerprint normalization for KrySearch",

    run(ctx) {
      try {
        // =========================
        // Engine profile (deterministic)
        // =========================
        const engine = new URLSearchParams(location.search).get("engine") || "default";

        const ENGINE_PROFILES = {
          default: { vendor: "KrySearch", renderer: "KrySearch Renderer", audioNoise: 0, perfResolution: 100 },
          tor:     { vendor: "Mozilla", renderer: "Gecko", audioNoise: 0, perfResolution: 100 },
          chromium:{ vendor: "Google Inc.", renderer: "ANGLE", audioNoise: 0, perfResolution: 50 }
        };

        const profile = ENGINE_PROFILES[engine] || ENGINE_PROFILES.default;

        // =========================
        // Canvas
        // =========================
        if (HTMLCanvasElement.prototype.toDataURL) {
          HTMLCanvasElement.prototype.toDataURL = () =>
            "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAAB";
        }

        if (CanvasRenderingContext2D.prototype.getImageData) {
          CanvasRenderingContext2D.prototype.getImageData = function (x, y, w, h) {
            return new ImageData(w, h);
          };
        }

        // =========================
        // WebGL
        // =========================
        function lockWebGL(proto) {
          if (!proto) return;
          const original = proto.getParameter;
          proto.getParameter = function (p) {
            const map = {
              37445: profile.vendor,     // UNMASKED_VENDOR_WEBGL
              37446: profile.renderer,   // UNMASKED_RENDERER_WEBGL
              7936: "WebGL 1.0",         // VERSION
              7937: "WebGL GLSL ES 1.0"  // SHADING_LANGUAGE_VERSION
            };
            return p in map ? map[p] : original.call(this, p);
          };
        }

        lockWebGL(WebGLRenderingContext?.prototype);
        lockWebGL(WebGL2RenderingContext?.prototype);

        // =========================
        // Fonts
        // =========================
        if (document.fonts) {
          Object.defineProperty(document.fonts, "check", {
            value: () => true,
            configurable: true
          });
          Object.defineProperty(document.fonts, "values", {
            value: function* () {},
            configurable: true
          });
        }

        // =========================
        // Permissions API
        // =========================
        if (navigator.permissions?.query) {
          navigator.permissions.query = () => Promise.resolve({ state: "prompt", onchange: null });
        }

        // =========================
        // Battery API
        // =========================
        if (navigator.getBattery) {
          navigator.getBattery = () => Promise.resolve({
            charging: true,
            chargingTime: 0,
            dischargingTime: Infinity,
            level: 1,
            onchargingchange: null,
            onlevelchange: null
          });
        }

        // =========================
        // Network Information API
        // =========================
        if (navigator.connection) {
          Object.defineProperty(navigator, "connection", {
            get: () => ({
              effectiveType: "4g",
              rtt: 100,
              downlink: 10,
              saveData: false,
              onchange: null
            }),
            configurable: true
          });
        }

        // =========================
        // AudioContext
        // =========================
        function lockAudioContext(proto) {
          if (!proto) return;
          const originalCreateAnalyser = proto.createAnalyser;
          proto.createAnalyser = function () {
            const analyser = originalCreateAnalyser.call(this);
            analyser.getFloatFrequencyData = arr => arr.fill(profile.audioNoise);
            analyser.getByteFrequencyData = arr => arr.fill(0);
            return analyser;
          };
        }

        lockAudioContext(window.AudioContext?.prototype);
        lockAudioContext(window.webkitAudioContext?.prototype);

        // =========================
        // MediaDevices
        // =========================
        if (navigator.mediaDevices) {
          navigator.mediaDevices.enumerateDevices = () => Promise.resolve([]);
          navigator.mediaDevices.getUserMedia = () => Promise.reject(new Error("MediaDevices blocked"));
        }

        // =========================
        // Performance API
        // =========================
        if (window.performance) {
          const now = () => Math.floor(Date.now() / profile.perfResolution) * profile.perfResolution;
          performance.now = now;
          performance.timeOrigin = now();
        }

        // =========================
        // Internal state (no logs)
        // =========================
        ctx.fingerprint = {
          hardened: true,
          engineProfile: engine,
          surfaces: [
            "canvas", "webgl", "fonts", "permissions", "battery",
            "network", "audio", "mediaDevices", "performance"
          ],
          entropy: "minimized",
          storage: "none",
          logging: false
        };
      } catch {
        // fail silently
      }
    }
  };

  window.KRY_PLUGINS = window.KRY_PLUGINS || [];
  window.KRY_PLUGINS.push(plugin);
})();
