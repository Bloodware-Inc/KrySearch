/* zk-gsb-equivalent – KrySearch Plugin
 * GitHub Pages safe, async, feed-aware
 * SPDX-License-Identifier: GPL-3.0-or-later
 * Copyright (C) 2026 Krynet, LLC
 * https://github.com/Bloodware-Inc/KrySearch
 */
(function() {
  "use strict";

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
      } catch {}
    }));
  }

  const plugin = {
    id: "zk-gsb-equivalent",
    description: "Feed-aware URL scanner + CSP-safe GitHub Pages compatible",
    run: async function(ctx) {
      try {
        ctx.safeFeeds = { openPhish, spamhaus, malwareHosts };
        await loadFeeds();

        // Extract URL param
        const params = new URLSearchParams(window.location.search);
        const inputRaw = (params.get("url") || params.get("q") || "").trim();
        if (!inputRaw) {
          ctx.output = null;
          return;
        }

        // Extract domain
        let domain = inputRaw;
        try { domain = new URL(inputRaw).hostname; } catch {}

        // Scan feeds
        const inOpenPhish = openPhish.has(domain);
        const inSpamhaus = spamhaus.has(domain);
        const inMalwareHosts = malwareHosts.has(domain);

        ctx.output = {
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
        ctx.output = null;
      }
    }
  };

  window.KRY_PLUGINS = window.KRY_PLUGINS || [];
  window.KRY_PLUGINS.push(plugin);
})();
