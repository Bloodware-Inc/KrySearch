window.KRY_PLUGINS.push({
  name: "secure-transport",
  order: 95,
  run() {

    const enc = new TextEncoder()
    const dec = new TextDecoder()

    function rand(msMin = 25, msMax = 140) {
      return new Promise(r =>
        setTimeout(r, msMin + Math.random() * (msMax - msMin))
      )
    }

    async function seal(str) {
      const iv = crypto.getRandomValues(new Uint8Array(12))
      const keyRaw = crypto.getRandomValues(new Uint8Array(32))

      const key = await crypto.subtle.importKey(
        "raw",
        keyRaw,
        "AES-GCM",
        false,
        ["encrypt", "decrypt"]
      )

      const data = await crypto.subtle.encrypt(
        { name: "AES-GCM", iv },
        key,
        enc.encode(str)
      )

      // freeze everything so it cannot be tampered with
      return Object.freeze({
        iv,
        key,
        data
      })
    }

    async function unseal(pkg) {
      const out = await crypto.subtle.decrypt(
        { name: "AES-GCM", iv: pkg.iv },
        pkg.key,
        pkg.data
      )
      return dec.decode(out)
    }

    // hardened navigation entrypoint
    window.__KRY_HARD_NAV__ = async function (targetURL) {
      const sealed = await seal(targetURL)

      // timing obfuscation
      await rand()

      const finalURL = await unseal(sealed)

      // immediate wipe
      sealed.iv.fill(0)
      sealed.data.fill(0)

      location.assign(finalURL)
    }

    // lock global object to prevent mutation
    Object.freeze(window.__KRY_HARD_NAV__)
  }
})
