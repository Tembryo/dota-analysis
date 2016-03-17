DROP TABLE scorerequests;

ALTER TABLE Results ADD CONSTRAINT player_match_key UNIQUE (match_id, steam_identifier);