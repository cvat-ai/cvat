
SELECT
    time,
    uniqExact(user_id) Users
FROM
(
    SELECT
      user_id,
      toStartOfInterval(timestamp, INTERVAL 5 minute) as time
    FROM cvat.events
    WHERE
      user_id IS NOT NULL AND
      time >= now() - INTERVAL 5 DAY
    GROUP BY
      user_id,
      time
    ORDER BY time ASC WITH FILL STEP toIntervalMinute(5)
)
GROUP BY time
ORDER BY time

SELECT
    uniqExact(user_id) as "Active users (now)"
FROM
    cvat.events
WHERE
    user_id IS NOT NULL AND
    timestamp >= now() - INTERVAL 5 DAY