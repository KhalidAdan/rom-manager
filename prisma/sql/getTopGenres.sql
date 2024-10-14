SELECT 
  gn.id,
  count(gn.id) as count, 
  gn.name 
FROM 
  genres gn
INNER JOIN 
  game_genre gg ON gn.id = gg.genreId
INNER JOIN 
  games g ON g.id = gg.gameId
GROUP BY 
  gn.id
ORDER BY 
  count DESC
LIMIT $1;