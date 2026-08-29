-- @param {Int} $1:includeMissingBackground When 1, games without background art can be picked
SELECT g.id, g.title, g.summary, s.title as system, g.coverArt, g.backgroundImage
FROM games g
INNER JOIN systems s ON g.system_id = s.id
WHERE (g.backgroundImage IS NOT NULL OR ?)
ORDER BY RANDOM()
LIMIT 1;
