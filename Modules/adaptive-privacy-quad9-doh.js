/* KrySearch Adaptive Privacy-First Quad9 DoH Resolver
 * - Default type: A
 * - Optional type: AAAA or MX
 * - Silent, one domain at a time, fully privacy-safe
 */  //adaptive-privacy-quad9-doh.js

(function () {
  const QUAD9_DOH_URL = 'https://dns.quad9.net/dns-query';
  const domainCache = new Map();

  function isDomain(input) {
    return /^[a-z0-9.-]+\.[a-z]{2,}$/i.test(input);
  }

  /**
   * Resolve a domain using Quad9 DoH
   * @param {string} domain - domain to resolve
   * @param {"A"|"AAAA"|"MX"} type - optional, defaults to A
   * @returns {Promise<Array|false>} - array of results or false if unresolved
   */
  async function quad9Resolve(domain, type = "A") {
    type = type.toUpperCase();
    const cacheKey = `${domain}_${type}`;
    if (domainCache.has(cacheKey)) return domainCache.get(cacheKey);

    try {
      const url = `${QUAD9_DOH_URL}?name=${encodeURIComponent(domain)}&type=${type}`;
      const res = await fetch(url, { cache: 'no-store' });
      if (!res.ok) {
        domainCache.set(cacheKey, false);
        return false;
      }

      const data = await res.json();
      let result = [];

      if (data.Answer && Array.isArray(data.Answer)) {
        for (const record of data.Answer) {
          if (type === "A" || type === "AAAA") result.push(record.data);
          else if (type === "MX") result.push(record.data.split(" ")[1]); // MX hostname
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
    id: "adaptive-privacy-quad9-doh",
    description: "Adaptive Quad9 DoH resolver: defaults to A, supports AAAA/MX, silent & privacy-safe",

    async run(ctx) {
      const params = Object.fromEntries(new URLSearchParams(window.location.search));
      const input = (params.url || params.q || "").trim();

      // Attach resolver to KrySearch context
      ctx.dnsResolver = { resolve: quad9Resolve };

      if (!input) {
        ctx.output = null; // silent, no logs
        return;
      }

      if (isDomain(input)) {
        // Default to A record if type not specified
        const A = await quad9Resolve(input, "A");
        const AAAA = await quad9Resolve(input, "AAAA");
        const MX = await quad9Resolve(input, "MX");

        ctx.output = {
          domain: input,
          A: A || [],
          AAAA: AAAA || [],
          MX: MX || [],
          note: "Lookups via Quad9 DoH, fully privacy-safe, adaptive"
        };
      } else {
        // Non-domain query: forward to KrySearch engine silently
        ctx.output = null;
      }
    }
  };

  window.KRY_PLUGINS = window.KRY_PLUGINS || [];
  window.KRY_PLUGINS.push(plugin);
})();
