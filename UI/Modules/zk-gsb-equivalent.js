/* SPDX-License-Identifier: GPL-3.0-or-later
 * Copyright (C) 2026 Krynet, LLC
 * https://github.com/Bloodware-Inc/KrySearch
 */
(function () {
  "use strict";

  // ================================
  // Threat feeds as Sets
  // ================================
  const openPhish = new Set();
  const spamhaus = new Set();
  const malwareHosts = new Set();

  async function loadFeeds() {
    const feeds = [
      { url: "Modules/Feeds/openPhish.txt", set: openPhish },
      { url: "Modules/Feeds/drop.txt", set: spamhaus }, // edrop merged into drop
      { url: "Modules/Feeds/urlhaus.txt", set: malwareHosts }
    ];

    await Promise.all(feeds.map(async f => {
      try {
        const res = await fetch(f.url, { cache: "no-store" });
        if (!res.ok) return;
        const txt = await res.text();
        txt.split("\n").forEach(line => {
          const d = line.trim().split(/[ ;]/)[0];
          if (d && !d.startsWith("#")) f.set.add(d);
        });
      } catch {}
    }));
  }

  // ================================
  // URL check utility
  // ================================
  function isThreat(domain) {
    return openPhish.has(domain) || spamhaus.has(domain) || malwareHosts.has(domain);
  }

  // ================================
  // Plugin definition
  // ================================
  const plugin = {
    id: "zk-gsb-equivalent",
    description: "GSB-equivalent threat feed scanner",
    run: async function (ctx) {
      try {
        // Freeze ctx to prevent "cannot add property" errors
        if (!Object.isExtensible(ctx)) ctx = Object.assign({}, ctx);
        Object.freeze(ctx);

        await loadFeeds();

        const params = new URLSearchParams(window.location.search);
        const inputRaw = (params.get("url") || params.get("q") || "").trim();
        if (!inputRaw) return;

        let domain;
        try { domain = new URL(inputRaw).hostname; } catch { domain = inputRaw; }

        ctx.output = {
          input: inputRaw,
          domain: domain,
          flagged: isThreat(domain),
          feeds: {
            openPhish: openPhish.has(domain),
            spamhaus: spamhaus.has(domain),
            malwareHosts: malwareHosts.has(domain)
          }
        };
      } catch (err) {
        // fail silently
      }
    }
  };

  window.KRY_PLUGINS = window.KRY_PLUGINS || [];
  window.KRY_PLUGINS.push(plugin);
})();
