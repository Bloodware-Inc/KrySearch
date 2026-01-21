/* Ultra-Adaptive Quad9 DoH Resolver (CSP + CORS Safe) */

(function () {
  const DOH_SERVERS = [
    'https://dns.quad9.net/dns-query', // Primary
    'https://dns.google/dns-query', // Secondary fallback
    'https://cloudflare-dns.com/dns-query', // Tertiary fallback
  ];

  const domainCache = new Map();

  // Use WebRTC to check for IPv6 support (fallback if IPify fails)
  async function supportsIPv6() {
    return new Promise((resolve) => {
      try {
        const rtc = new RTCPeerConnection({ iceServers: [] });
        rtc.createDataChannel('ipv6_test');
        rtc.createOffer().then((offer) => {
          rtc.setLocalDescription(offer);
        });

        rtc.onicecandidate = function (event) {
          if (event.candidate && event.candidate.candidate.includes('ipv6')) {
            resolve(true); // IPv6 supported
          } else {
            resolve(false); // IPv6 not supported
          }
        };

        setTimeout(() => resolve(false), 2000); // Timeout if no response
      } catch (err) {
        resolve(false); // If WebRTC is not available or fails
      }
    });
  }

  function isDomain(input) {
    return /^[a-z0-9.-]+\.[a-z]{2,}$/i.test(input);
  }

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
          if (result.length) break;
        }
      } catch (err) {
        // Silent fail on each server, move to the next server if one fails
        continue;
      }
    }

    domainCache.set(cacheKey, result);
    return result;
  }

  const plugin = {
    id: 'ultra-adaptive-quad9-doh',
    description: 'Quad9 DoH resolver, CSP/CORS safe, IPv6-ready',
    async run(ctx) {
      ctx.dnsResolver = { resolve: resolveWithDoH };
      ctx.supportsIPv6 = await supportsIPv6();  // Will now use local WebRTC detection

      const params = Object.fromEntries(new URLSearchParams(window.location.search));
      const input = (params.url || params.q || '').trim();
      if (!input) {
        ctx.output = null;
        return;
      }

      if (isDomain(input)) {
        const A = await resolveWithDoH(input, 'A');
        const AAAA = await resolveWithDoH(input, 'AAAA');
        const MX = await resolveWithDoH(input, 'MX');
        ctx.output = { domain: input, A: A || [], AAAA: AAAA || [], MX: MX || [], note: 'Resolved via DoH servers (Quad9, Google, Cloudflare), privacy-safe' };
      } else {
        ctx.output = null; // forward non-domain input silently
      }
    }
  };

  window.KRY_PLUGINS = window.KRY_PLUGINS || [];
  window.KRY_PLUGINS.push(plugin);
})();
