SELECT g.id, g.title, s.title as system_title, g.coverArt FROM games g
INNER JOIN systems s ON g.system_id = s.id
ORDER BY RANDOM()
LIMIT 1;