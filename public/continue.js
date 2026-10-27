// Receives a room moved here from a social app's built-in browser (src/lib/handoff.ts): parks
// the payload for the room screen, which checks it, then opens the room. A static file outside
// the Worker (wrangler.toml run_worker_first), so the payload never reaches its request logs.
;(function () {
  var params = new URLSearchParams(location.search)
  var room = params.get('r') || ''
  var data = params.get('d')
  if (!/^[a-z0-9]{4}-[a-z0-9]{4}-[a-z0-9]{4}$/.test(room)) {
    location.replace('/')
    return
  }
  try {
    if (data) localStorage.setItem('cc:handoff', JSON.stringify(data))
  } catch {
    // No storage: the room still opens, as a new player.
  }
  location.replace('/r/' + room)
})()
