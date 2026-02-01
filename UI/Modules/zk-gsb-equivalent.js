/* zk-gsb-equivalent – KrySearch Plugin
 * GitHub Pages safe, async, feed-aware
 * SPDX-License-Identifier: GPL-3.0-or-later
 * Copyright (C) 2026 Krynet, LLC
 * https://github.com/Bloodware-Inc/KrySearch
 */
(function() {
  "use strict";

  // Feed sets
  const openPhish = new Set();
  const spamhaus = new Set();
  const malwareHosts = new Set();

  async function loadFeeds() {
    const feeds = [
      { url: "UI/Modules/Feeds/openPhish.txt", set: openPhish },
      { url: "UI/Modules/Feeds/drop.txt", set: spamhaus },
      { url: "UI/Modules/Feeds/urlhaus.txt", set: malwareHosts }
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
      } catch {} // silent fail
    }));
  }

  const plugin = {
    id: "zk-gsb-equivalent",
    description: "Feed-aware URL scanner + CSP-safe",
    run: async function(ctx) {
      try {
        // Ensure safe assignment to ctx (avoid extensibility errors)
        ctx.safeFeeds = ctx.safeFeeds || { openPhish, spamhaus, malwareHosts };

        // Load feeds before scanning
        await loadFeeds();

        // Get URL parameter
        const params = new URLSearchParams(window.location.search);
        const inputRaw = (params.get("url") || params.get("q") || "").trim();
        if (!inputRaw) {
          ctx.safeFeeds.output = null;
          return;
        }

        // Extract domain
        let domain = inputRaw;
        try { domain = new URL(inputRaw).hostname; } catch {}

        // Scan feeds
        const inOpenPhish = openPhish.has(domain);
        const inSpamhaus = spamhaus.has(domain);
        const inMalwareHosts = malwareHosts.has(domain);

        // Assign to nested object to avoid frozen ctx issues
        ctx.safeFeeds.output = {
          input: inputRaw,
          domain,
          flagged: {
            openPhish: inOpenPhish,
            spamhaus: inSpamhaus,
            malwareHosts: inMalwareHosts
          },
          note: "Feed scan complete (openPhish, drop/spamhaus, urlhaus)"
        };
      } catch {
        if(ctx.safeFeeds) ctx.safeFeeds.output = null;
      }
    }
  };

  // Push plugin safely
  window.KRY_PLUGINS = window.KRY_PLUGINS || [];
  window.KRY_PLUGINS.push(plugin);
})();
