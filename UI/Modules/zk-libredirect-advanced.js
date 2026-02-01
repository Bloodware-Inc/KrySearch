/* SPDX-License-Identifier: GPL-3.0-or-later
 * Copyright (C) 2026 Krynet, LLC
 * https://github.com/Bloodware-Inc/KrySearch
 */
window.KRY_PLUGINS = window.KRY_PLUGINS || [];

window.KRY_PLUGINS.push({
  id: "zk-libredirect-advanced",
  description: "Zero-knowledge nocookie + dynamic mirrors + domain reputation + Tor/I2P hardening",

  async run(){
    "use strict";

    const CFG = window.KRY_CONFIG || {};
    const ENABLED = CFG.privacy?.nocookie !== false;
    if (!ENABLED) return;

    const CONFIG_URL = "https://raw.githubusercontent.com/libredirect/browser_extension/refs/heads/master/src/config.json";

    let MAP = null;

    /* ===================== HELPERS ===================== */

    async function loadConfig(){
      if (MAP) return MAP;
      const json = await fetch(CONFIG_URL, {
        cache: "force-cache",
        credentials: "omit",
        referrerPolicy: "no-referrer"
      }).then(r=>r.json());

      const {frontends={}, services={}} = json;
      const map = {};

      for(const [svc, def] of Object.entries(services)){
        if(!def.targets || !def.frontends) continue;
        for(const domain of def.targets){
          const mirrors = def.frontends
            .map(f=>frontends[f]?.url)
            .filter(Boolean)
            .map(u=>{ try{ return new URL(u).hostname; } catch{return null} })
            .filter(Boolean);

          if(mirrors.length) map[domain] = {mirrors, service: svc};
        }
      }

      MAP = map;
      return map;
    }

    function randomItem(arr){ return arr[Math.floor(Math.random()*arr.length)]; }

    function simpleReputation(domain){
      // crude reputation scoring: TLD / known bad / suspicious length
      let score = 100;
      if(domain.endsWith(".xyz")||domain.endsWith(".top")||domain.endsWith(".cf")) score -= 50;
      if(domain.length>30) score -= 10;
      if(/^[0-9.]+$/.test(domain)) score -= 20; // IP hosts
      return score; // higher is safer
    }

    function rewriteURL(raw, map, thresholds = {min: 50}){
      try{
        const u = new URL(raw, location.origin);
        const entry = map[u.hostname];
        if(!entry) return raw;

        // filter mirrors by reputation threshold
        const safeMirrors = entry.mirrors.filter(m=>simpleReputation(m)>=thresholds.min);
        if(!safeMirrors.length) return raw;

        const mirror = randomItem(safeMirrors);
        u.hostname = mirror;
        u.protocol = "https:";
        return u.href;
      }catch{return raw;}
    }

    function isTorOrI2P(){
      try{
        const ua = navigator.userAgent || "";
        return /TorBrowser|I2P/.test(ua);
      }catch{return false;}
    }

    /* ===================== INTERCEPT LINKS ===================== */

    async function intercept(e){
      const a = e.target.closest("a[href]");
      if(!a) return;
      const raw = a.getAttribute("href");
      if(!raw || raw.startsWith("#") || raw.startsWith("javascript:")) return;

      e.preventDefault();
      e.stopImmediatePropagation();

      const map = await loadConfig();
      let target = rewriteURL(raw, map, {min: 50});

      // Tor/I2P hardening: force HTTPS & skip low-reputation mirrors
      if(isTorOrI2P()){
        const urlObj = new URL(target, location.origin);
        if(urlObj.protocol !== "https:") urlObj.protocol = "https:";
        target = urlObj.href;
      }

      location.href = target;
    }

    document.addEventListener("click", intercept, true);

    /* ===================== HANDLE ?url= ===================== */

    const p = new URLSearchParams(location.search);
    if(p.has("url")){
      const map = await loadConfig();
      let t = rewriteURL(decodeURIComponent(p.get("url")), map, {min:50});

      // Tor/I2P hardening
      if(isTorOrI2P()){
        const uo = new URL(t, location.origin);
        uo.protocol = "https:";
        t = uo.href;
      }

      history.replaceState({}, "", location.pathname);
      location.replace(t);
    }

  }
});
