;(function () {
  try {
    var path = window.location.pathname
    if (path === '/auth/callback' || path.startsWith('/auth/callback/')) return
    var hash = window.location.hash
    if (!hash || hash.length < 8 || hash.charCodeAt(0) !== 35 /* # */) return
    var params = new URLSearchParams(hash.slice(1))
    if (!params.get('access_token') || !params.get('refresh_token')) return
    window.location.replace('/auth/callback' + window.location.search + hash)
  } catch {
    /* ignore */
  }
})()
