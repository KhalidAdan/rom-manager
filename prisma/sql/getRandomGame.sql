SELECT g.id, g.title, g.summary, s.title as system_title, g.coverArt, g.backgroundImage FROM games g
INNER JOIN systems s ON g.system_id = s.id
ORDER BY RANDOM()
LIMIT 1;