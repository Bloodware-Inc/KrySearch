(function () {
  const plugin = {
    id: "feature-lockdown",
    description: "Disable drag/drop, context abuse",

    run() {
      document.addEventListener("dragstart", e => e.preventDefault())
      document.addEventListener("drop", e => e.preventDefault())
      document.addEventListener("contextmenu", e => e.preventDefault())
    }
  }

  window.KRY_PLUGINS.push(plugin)
})()
