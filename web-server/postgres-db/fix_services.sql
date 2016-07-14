ALTER TABLE Jobs ADD COLUMN assigned timestamp, result json;
CREATE TABLE Services (identifier text primary key, type text, last_heartbeat timestamp, current_job bigint, status json);
