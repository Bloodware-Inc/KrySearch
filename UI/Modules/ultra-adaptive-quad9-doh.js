/* Ultra-Adaptive Quad9 DoH Resolver (CSP + CORS Safe, URL-Compatible) */
/* SPDX-License-Identifier: GPL-3.0-or-later
 * Copyright (C) 2026 Krynet, LLC
 * https://github.com/Bloodware-Inc/KrySearch
 */
(function () {
  const DOH_SERVERS = [
    "https://dns.quad9.net/dns-query",
    "https://dns.google/dns-query",
    "https://cloudflare-dns.com/dns-query"
  ];

  const domainCache = new Map();

  // Detect IPv6 support via WebRTC (best-effort)
  async function supportsIPv6() {
    return new Promise(function (resolve) {
      try {
        const rtc = new RTCPeerConnection({ iceServers: [] });
        rtc.createDataChannel("ipv6_test");
        rtc.createOffer().then(function (offer) {
          rtc.setLocalDescription(offer);
        });

        rtc.onicecandidate = function (event) {
          if (event && event.candidate && event.candidate.candidate.indexOf("ipv6") !== -1) {
            resolve(true);
          }
        };

        setTimeout(function () {
          resolve(false);
        }, 2000);
      } catch {
        resolve(false);
      }
    });
  }

  function isDomain(input) {
    return /^[a-z0-9.-]+\.[a-z]{2,}$/i.test(input);
  }

  // DoH resolver (NO TypeScript)
 async function resolveWithDoH(domain, type = 'A') {
  type = type.toUpperCase();
  const cacheKey = `${domain}_${type}`;
  if (domainCache.has(cacheKey)) return domainCache.get(cacheKey);

  let result = false;

  for (const server of DOH_SERVERS) {
    try {
      const url = `${server}?name=${encodeURIComponent(domain)}&type=${type}`;
      const res = await fetch(url, { cache: 'no-store', mode: 'cors' });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.Answer)) {
          result = [];
          for (const record of data.Answer) {
            if (type === 'A' || type === 'AAAA') result.push(record.data);
            else if (type === 'MX') result.push(record.data.split(' ')[1]);
          }
        }
        if (result && result.length) break;
      }
    } catch {}
  }

  domainCache.set(cacheKey, result);
  return result;
}

  const plugin = {
    id: "ultra-adaptive-quad9-doh",
    description: "Quad9 DoH resolver, CSP/CORS safe, IPv6-ready, URL compatible",

    run: async function (ctx) {
      ctx.dnsResolver = { resolve: resolveWithDoH };
      ctx.supportsIPv6 = await supportsIPv6();

      const params = new URLSearchParams(window.location.search);
      const inputRaw = (params.get("url") || params.get("q") || "").trim();
      if (!inputRaw) {
        ctx.output = null;
        return;
      }

      let domain = inputRaw;
      try {
        domain = new URL(inputRaw).hostname;
      } catch {}

      if (!isDomain(domain)) {
        ctx.output = null;
        return;
      }

      const A = await resolveWithDoH(domain, "A");
      const AAAA = await resolveWithDoH(domain, "AAAA");
      const MX = await resolveWithDoH(domain, "MX");

      ctx.output = {
        input: inputRaw,
        domain: domain,
        A: A || [],
        AAAA: AAAA || [],
        MX: MX || [],
        note:
          "Resolved via DoH (Quad9 primary, Google & Cloudflare fallback)"
      };
    }
  };

  window.KRY_PLUGINS = window.KRY_PLUGINS || [];
  window.KRY_PLUGINS.push(plugin);
})();
