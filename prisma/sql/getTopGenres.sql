SELECT 
  gn.id,
  count(gn.id) as count, 
  gn.name,
  g.title,
  g.coverArt
FROM 
  genres gn
INNER JOIN 
  game_genre gg ON gn.id = gg.genreId
INNER JOIN 
  games g ON g.id = gg.gameId
GROUP BY 
  gn.id
HAVING 
  count > 4
ORDER BY 
  count DESC;