(function () {
  const plugin = {
    id: "privacy-clean",
    description: "Clear storage and disable speculative APIs",

    run() {
      try {
        localStorage.clear()
        sessionStorage.clear()
      } catch {}

      try {
        document.cookie.split(";").forEach(c => {
          document.cookie = c.replace(/^ +/, "")
            .replace(/=.*/, "=;expires=Thu, 01 Jan 1970 00:00:00 UTC;path=/")
        })
      } catch {}

      // Kill prefetch
      document.querySelectorAll('link[rel="prefetch"],link[rel="dns-prefetch"]')
        .forEach(l => l.remove())
    }
  }

  window.KRY_PLUGINS.push(plugin)
})()
