// Doc authority over real handbook hyperlinks (plan §4.4 f). Higher score = the page spreads facts further.
// No LIMIT (params are not allowed there); callers slice the top k.
CALL algo.pageRank('Doc', 'LINKS_TO') YIELD node, score
RETURN node.id AS id, node.title AS title, score
ORDER BY score DESC, id
