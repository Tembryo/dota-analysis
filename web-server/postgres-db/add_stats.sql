CREATE TABLE PlayerStats(match_id bigint, steam_identifier text, data json, PRIMARY KEY (match_id, steam_identifier));
CREATE TABLE MatchStats(id bigint PRIMARY KEY, data json);