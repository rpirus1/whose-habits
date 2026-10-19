-- Success signals from the brief, computed from anonymous events in D1.
-- Local:  npm run metrics:local
-- Live:   npm run metrics          (after step 8 connects the real database)

-- 1. Games played, and how many had 5+ players (target: 3 sessions with 5+ players).
SELECT
  COUNT(DISTINCT game_id) AS games_started,
  COUNT(DISTINCT CASE WHEN json_extract(data, '$.players') >= 5 THEN game_id END) AS games_5plus
FROM events
WHERE type = 'game_started';

-- 2. Finish rate (target: at least 80% finish all rounds).
--    games_completed: reached the last round. player_retention: players still there at the end.
SELECT
  (SELECT COUNT(DISTINCT game_id) FROM events WHERE type = 'game_started') AS games_started,
  COUNT(DISTINCT game_id) AS games_completed,
  ROUND(100.0 * COUNT(DISTINCT game_id)
    / NULLIF((SELECT COUNT(DISTINCT game_id) FROM events WHERE type = 'game_started'), 0), 1)
    AS completion_pct,
  ROUND(100.0 * SUM(json_extract(data, '$.playersAtEnd'))
    / NULLIF(SUM(json_extract(data, '$.playersAtStart')), 0), 1) AS player_retention_pct
FROM events
WHERE type = 'game_finished' AND json_extract(data, '$.endedEarly') = 0;

-- 3. Would you play again? (the closing question from the brief)
SELECT
  json_extract(data, '$.vote') AS vote,
  json_extract(data, '$.role') AS role,
  COUNT(*) AS votes
FROM events
WHERE type = 'play_again_vote'
GROUP BY vote, role
ORDER BY vote, role;

-- 4. Growth loop: guests who tapped "Host your own game", and shares, per finished game.
SELECT
  (SELECT COUNT(DISTINCT game_id) FROM events WHERE type = 'game_finished') AS games_finished,
  (SELECT COUNT(*) FROM events WHERE type = 'host_cta_click') AS host_cta_clicks,
  (SELECT COUNT(*) FROM events WHERE type = 'share_click') AS share_clicks;

-- 5. Reported statements, most reported first (review these before each content update).
SELECT
  json_extract(data, '$.statementId') AS statement_id,
  COUNT(*) AS reports
FROM events
WHERE type = 'report'
GROUP BY statement_id
ORDER BY reports DESC;

-- 6. Games per day.
SELECT substr(created_at, 1, 10) AS day, COUNT(DISTINCT game_id) AS games
FROM events
WHERE type = 'game_started'
GROUP BY day
ORDER BY day DESC
LIMIT 30;
