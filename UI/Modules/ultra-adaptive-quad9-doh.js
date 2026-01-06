/* Ultra-Adaptive Quad9 DoH Resolver (CSP + CORS Safe) */

(function () {
  const QUAD9_DOH_URL = 'https://dns.quad9.net/dns-query';
  const domainCache = new Map();

  // Use ipify instead of test-ipv6.com for CSP-safe IPv6 check
  async function supportsIPv6() {
    try {
      const res = await fetch('https://api64.ipify.org?format=json', { cache: 'no-store' });
      if (!res.ok) return false;
      const data = await res.json();
      return Boolean(data.ip);
    } catch {
      return false;
    }
  }

  function isDomain(input) {
    return /^[a-z0-9.-]+\.[a-z]{2,}$/i.test(input);
  }

  async function quad9Resolve(domain, type = 'A') {
    type = type.toUpperCase();
    const cacheKey = `${domain}_${type}`;
    if (domainCache.has(cacheKey)) return domainCache.get(cacheKey);

    try {
      const url = `${QUAD9_DOH_URL}?name=${encodeURIComponent(domain)}&type=${type}`;
      const res = await fetch(url, { cache: 'no-store', mode: 'cors' });
      if (!res.ok) {
        domainCache.set(cacheKey, false);
        return false;
      }

      const data = await res.json();
      let result = [];

      if (Array.isArray(data.Answer)) {
        for (const record of data.Answer) {
          if (type === 'A' || type === 'AAAA') result.push(record.data);
          else if (type === 'MX') result.push(record.data.split(' ')[1]);
        }
      }

      if (!result.length) result = false;
      domainCache.set(cacheKey, result);
      return result;
    } catch {
      domainCache.set(cacheKey, false);
      return false;
    }
  }

  const plugin = {
    id: 'ultra-adaptive-quad9-doh',
    description: 'Quad9 DoH resolver, CSP/CORS safe, IPv6-ready',
    async run(ctx) {
      ctx.dnsResolver = { resolve: quad9Resolve };
      ctx.supportsIPv6 = await supportsIPv6();

      const params = Object.fromEntries(new URLSearchParams(window.location.search));
      const input = (params.url || params.q || '').trim();
      if (!input) {
        ctx.output = null;
        return;
      }

      if (isDomain(input)) {
        const A = await quad9Resolve(input, 'A');
        const AAAA = await quad9Resolve(input, 'AAAA');
        const MX = await quad9Resolve(input, 'MX');
        ctx.output = { domain: input, A: A || [], AAAA: AAAA || [], MX: MX || [], note: 'Resolved via Quad9 DoH, privacy-safe' };
      } else {
        ctx.output = null; // forward non-domain input silently
      }
    }
  };

  window.KRY_PLUGINS = window.KRY_PLUGINS || [];
  window.KRY_PLUGINS.push(plugin);
})();
