;(function () {
  try {
    function strip() {
      document.querySelectorAll('[bis_skin_checked]').forEach(function (el) {
        el.removeAttribute('bis_skin_checked')
      })
    }
    if (typeof document === 'undefined') return
    strip()
    new MutationObserver(function () {
      strip()
    }).observe(document.documentElement, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: ['bis_skin_checked'],
    })
    strip()
  } catch {}
})()
