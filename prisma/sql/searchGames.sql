-- @param {String} $1:searchTerm The search term to find in game or system titles
SELECT
  g.id,
  g.title,
  g.coverArt,
  s.title as systemTitle
FROM
  games g
  INNER JOIN systems s ON g.system_id = s.id
WHERE
  LOWER(g.title) LIKE ('%' || LOWER($1) || '%')
  OR LOWER(s.title) LIKE ('%' || LOWER($1) || '%');