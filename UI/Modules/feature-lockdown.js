/* SPDX-License-Identifier: GPL-3.0-or-later
 * Copyright (C) 2026 Krynet, LLC
 * https://github.com/Bloodware-Inc/KrySearch
 */
(function () {
  var plugin = {
    id: "feature-lockdown-max",
    description: "Disable drag/drop, context abuse, future-proofed",

    run: function () {
      try {
        function blockEvent(e) {
          e.preventDefault();
        }

        // Core listeners
        var events = ["dragstart", "drop", "contextmenu"];
        for (var i = 0; i < events.length; i++) {
          document.addEventListener(events[i], blockEvent, { capture: true });
        }

        // Mutation observer to prevent new elements from bypassing
        var observer = new MutationObserver(function (muts) {
          for (var i = 0; i < muts.length; i++) {
            var m = muts[i];
            for (var j = 0; j < m.addedNodes.length; j++) {
              var n = m.addedNodes[j];
              if (n.addEventListener) {
                for (var k = 0; k < events.length; k++) {
                  n.addEventListener(events[k], blockEvent, { capture: true });
                }
              }
            }
          }
        });

        observer.observe(document.documentElement, { childList: true, subtree: true });

      } catch (e) {
        // silent fail
      }
    }
  };

  window.KRY_PLUGINS = window.KRY_PLUGINS || [];
  window.KRY_PLUGINS.push(plugin);
})();
