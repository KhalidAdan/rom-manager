-- @param {String} $1:searchTerm The search term to find in game or system titles
SELECT
  g.id,
  g.title,
  g.coverArt,
  s.title as systemTitle
FROM
  (SELECT '%' || LOWER(?) || '%' AS pattern) term,
  games g
  INNER JOIN systems s ON g.system_id = s.id
WHERE
  LOWER(g.title) LIKE term.pattern
  OR LOWER(s.title) LIKE term.pattern;
