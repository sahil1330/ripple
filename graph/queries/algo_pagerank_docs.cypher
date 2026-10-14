// Doc authority over real handbook hyperlinks (plan §4.4 f). Higher score = the page spreads facts further.
CALL algo.pageRank('Doc', 'LINKS_TO') YIELD node, score
RETURN node.id AS id, node.title AS title, score
ORDER BY score DESC, id
LIMIT 10
