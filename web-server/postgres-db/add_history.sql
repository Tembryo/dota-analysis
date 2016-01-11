CREATE TABLE IF NOT EXISTS UserMatchHistory(user_id bigint, match_id bigint, data json, PRIMARY KEY(user_id, match_id));
ALTER TABLE Users ADD COLUMN last_match bigint DEFAULT -1; 
