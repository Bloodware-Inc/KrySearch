/* Ultra-Adaptive Quad9 DoH Resolver (CSP + CORS Safe, GitHub Pages Compatible) */
/* SPDX-License-Identifier: GPL-3.0-or-later
 * Copyright (C) 2026 Krynet, LLC
 * https://github.com/Bloodware-Inc/KrySearch
 */
(function () {
  "use strict";

  const DOH_SERVERS = [
    "https://dns.quad9.net/dns-query",
    "https://dns.google/dns-query",
    "https://cloudflare-dns.com/dns-query"
  ];

  const domainCache = new Map();

  // Best-effort IPv6 detection
  async function supportsIPv6() {
    try {
      return await new Promise((resolve) => {
        const rtc = new RTCPeerConnection({ iceServers: [] });
        rtc.createDataChannel("ipv6_test");
        rtc.createOffer().then(offer => rtc.setLocalDescription(offer));
        rtc.onicecandidate = e => {
          if (e.candidate && e.candidate.candidate.includes("ipv6")) resolve(true);
        };
        setTimeout(() => resolve(false), 1500);
      });
    } catch { return false; }
  }

  function isDomain(input) {
    return /^[a-z0-9.-]+\.[a-z]{2,}$/i.test(input);
  }

  async function resolveWithDoH(domain, type = 'A') {
    type = type.toUpperCase();
    const cacheKey = `${domain}_${type}`;
    if (domainCache.has(cacheKey)) return domainCache.get(cacheKey);

    let result = [];

    for (const server of DOH_SERVERS) {
      try {
        // Use application/dns-json format for GitHub Pages safe fetch
        const url = `${server}?name=${encodeURIComponent(domain)}&type=${type}`;
        const res = await fetch(url, { cache: 'no-store', mode: 'cors' });
        if (!res.ok) continue;
        const data = await res.json();

        // Most DoH services respond with 'Answer' array
        if (Array.isArray(data.Answer)) {
          for (const record of data.Answer) {
            if (type === 'A' || type === 'AAAA') result.push(record.data);
            else if (type === 'MX') result.push(record.data.split(' ')[1] || record.data);
          }
        }
        if (result.length) break;
      } catch {}
    }

    domainCache.set(cacheKey, result);
    return result;
  }

  const plugin = {
    id: "ultra-adaptive-quad9-doh",
    description: "Quad9 DoH resolver, CSP/CORS safe, IPv6-ready, GitHub Pages compatible",
    run: async function (ctx) {
      try {
        ctx.dnsResolver = { resolve: resolveWithDoH };
        ctx.supportsIPv6 = await supportsIPv6();

        const params = new URLSearchParams(window.location.search);
        const inputRaw = (params.get("url") || params.get("q") || "").trim();
        if (!inputRaw) { ctx.output = null; return; }

        let domain = inputRaw;
        try { domain = new URL(inputRaw).hostname; } catch {}

        if (!isDomain(domain)) { ctx.output = null; return; }

        const [A, AAAA, MX] = await Promise.all([
          resolveWithDoH(domain, "A"),
          resolveWithDoH(domain, "AAAA"),
          resolveWithDoH(domain, "MX")
        ]);

        ctx.output = {
          input: inputRaw,
          domain: domain,
          A: A || [],
          AAAA: AAAA || [],
          MX: MX || [],
          note: "Resolved via DoH (Quad9 primary, Google & Cloudflare fallback)"
        };
      } catch { ctx.output = null; }
    }
  };

  window.KRY_PLUGINS = window.KRY_PLUGINS || [];
  window.KRY_PLUGINS.push(plugin);
})();
