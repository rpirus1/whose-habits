-- Anonymous product events. No names, player ids or IP addresses are stored.
CREATE TABLE events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  type TEXT NOT NULL,
  game_id TEXT NOT NULL,
  -- The validated event as JSON (see src/lib/events.ts).
  data TEXT NOT NULL
);

CREATE INDEX events_type_game ON events (type, game_id);
CREATE INDEX events_created_at ON events (created_at);
