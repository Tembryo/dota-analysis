CREATE TABLE Results (id bigserial PRIMARY KEY, match_id bigserial REFERENCES Matches(id), steam_identifier text, data json);
ALTER TABLE UserMatchHistory ADD COLUMN result bigint DEFAULT -1;
ALTER TABLE matches ADD COLUMN stats_file text;
