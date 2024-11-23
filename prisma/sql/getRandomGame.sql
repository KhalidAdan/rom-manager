SELECT g.id, g.title, g.summary, s.title as system, g.coverArt, g.backgroundImage 
FROM games g
INNER JOIN systems s ON g.system_id = s.id
WHERE (g.backgroundImage IS NOT NULL OR $1)
ORDER BY RANDOM()
LIMIT 1;