-- Success signals from the brief, computed from anonymous events in D1 (see docs/METRICS.md).
-- Local:  npm run metrics:local
-- Live:   npm run metrics, or the /stats page
--
-- Every query leaves out test events (test = 1: localhost or ?test=1).
-- Format rules, because the /stats page splits this file into queries:
-- each query starts with a "-- N. Title" line, and only the end of a query has a semicolon.

-- 1. Games played (target: 3 sessions with 5+ players)
SELECT
  COUNT(*) AS games_started,
  COUNT(CASE WHEN players >= 5 THEN 1 END) AS games_5plus,
  ROUND(AVG(players), 1) AS avg_players
FROM (
  SELECT game_id, MAX(json_extract(data, '$.players')) AS players
  FROM events
  WHERE type = 'game_started' AND test = 0
  GROUP BY game_id
);

-- 2. How games ended (completed = reached the last round, abandoned = no final screen)
WITH started AS (
  SELECT DISTINCT game_id FROM events WHERE type = 'game_started' AND test = 0
),
finished AS (
  SELECT game_id, MAX(json_extract(data, '$.endedEarly')) AS ended_early
  FROM events
  WHERE type = 'game_finished' AND test = 0
  GROUP BY game_id
)
SELECT
  COUNT(*) AS games_started,
  COUNT(CASE WHEN f.ended_early = 0 THEN 1 END) AS completed,
  COUNT(CASE WHEN f.ended_early = 1 THEN 1 END) AS ended_early,
  COUNT(CASE WHEN f.game_id IS NULL THEN 1 END) AS abandoned,
  ROUND(100.0 * COUNT(CASE WHEN f.ended_early = 0 THEN 1 END) / NULLIF(COUNT(*), 0), 1)
    AS completed_pct
FROM started s
LEFT JOIN finished f ON f.game_id = s.game_id;

-- 3. Player finish rate (target: at least 80% of players finish all rounds)
-- Per game: players still connected at the last round / players at the start (capped at 100%,
-- since late joiners count at the end). Games ended early or abandoned count as 0%.
WITH started AS (
  SELECT game_id, MAX(json_extract(data, '$.players')) AS players
  FROM events
  WHERE type = 'game_started' AND test = 0
  GROUP BY game_id
),
finished AS (
  SELECT game_id, MAX(json_extract(data, '$.playersAtEnd')) AS at_end
  FROM events
  WHERE type = 'game_finished' AND test = 0 AND json_extract(data, '$.endedEarly') = 0
  GROUP BY game_id
),
per_game AS (
  SELECT MIN(1.0, COALESCE(f.at_end, 0) * 1.0 / NULLIF(s.players, 0)) AS rate
  FROM started s
  LEFT JOIN finished f ON f.game_id = s.game_id
  WHERE s.players > 0
),
ranked AS (
  SELECT rate, ROW_NUMBER() OVER (ORDER BY rate) AS rn, COUNT(*) OVER () AS n FROM per_game
)
SELECT
  (SELECT COUNT(*) FROM per_game) AS games,
  ROUND(100 * (SELECT AVG(rate) FROM ranked WHERE rn IN ((n + 1) / 2, (n + 2) / 2)), 1)
    AS median_finish_pct,
  (SELECT COUNT(*) FROM per_game WHERE rate >= 0.8) AS games_80pct_plus;

-- 4. Would you play again? (stated: the vote on the final screen)
-- response_pct = votes / players on the final screen of completed games.
SELECT
  COUNT(*) AS votes,
  COUNT(CASE WHEN json_extract(data, '$.vote') = 'yes' THEN 1 END) AS yes,
  COUNT(CASE WHEN json_extract(data, '$.vote') = 'maybe' THEN 1 END) AS maybe,
  COUNT(CASE WHEN json_extract(data, '$.vote') = 'no' THEN 1 END) AS no,
  ROUND(100.0 * COUNT(CASE WHEN json_extract(data, '$.vote') = 'yes' THEN 1 END)
    / NULLIF(COUNT(*), 0), 1) AS yes_pct,
  ROUND(100.0 * COUNT(*) / NULLIF((
    SELECT SUM(at_end) FROM (
      SELECT MAX(json_extract(data, '$.playersAtEnd')) AS at_end
      FROM events
      WHERE type = 'game_finished' AND test = 0
      GROUP BY game_id
    )
  ), 0), 1) AS response_pct
FROM events
WHERE type = 'play_again_vote' AND test = 0;

-- 5. Did they actually play again? (replays started from "Play again in this room")
WITH finished AS (
  SELECT COUNT(DISTINCT game_id) AS n FROM events WHERE type = 'game_finished' AND test = 0
),
replays AS (
  SELECT COUNT(DISTINCT game_id) AS n
  FROM events
  WHERE type = 'game_started' AND test = 0 AND json_extract(data, '$.replay') = 1
)
SELECT
  finished.n AS games_finished,
  replays.n AS replays,
  ROUND(100.0 * replays.n / NULLIF(finished.n, 0), 1) AS replay_pct
FROM finished, replays;

-- 6. Guest to host (tapped "Host your own game", then started a game in their own room)
SELECT
  (SELECT COUNT(DISTINCT game_id) FROM events WHERE type = 'game_finished' AND test = 0)
    AS games_finished,
  (SELECT COUNT(*) FROM events WHERE type = 'host_cta_click' AND test = 0) AS cta_taps,
  (SELECT COUNT(DISTINCT game_id) FROM events
    WHERE type = 'game_started' AND test = 0
      AND json_extract(data, '$.source') = 'guest_cta' AND json_extract(data, '$.replay') = 0)
    AS rooms_from_cta,
  (SELECT COUNT(*) FROM events WHERE type = 'share_click' AND test = 0) AS shares;

-- 7. Reported statements (review these before each content update)
SELECT
  json_extract(data, '$.statementId') AS statement_id,
  COUNT(*) AS reports,
  SUM(json_extract(data, '$.reason') = 'incorrect') AS incorrect,
  SUM(json_extract(data, '$.reason') = 'outdated') AS outdated,
  SUM(json_extract(data, '$.reason') = 'not_unique') AS not_unique,
  SUM(json_extract(data, '$.reason') = 'offensive') AS offensive,
  -- Closed or timed out, or sent by a build from before reasons existed.
  SUM(COALESCE(json_extract(data, '$.reason'), 'none') = 'none') AS no_reason
FROM events
WHERE type = 'report' AND test = 0
GROUP BY statement_id
ORDER BY reports DESC
LIMIT 50;

-- 8. Games per day (last 30 days with games)
SELECT substr(created_at, 1, 10) AS day, COUNT(DISTINCT game_id) AS games
FROM events
WHERE type = 'game_started' AND test = 0
GROUP BY day
ORDER BY day DESC
LIMIT 30;
