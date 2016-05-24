CREATE TABLE Settings (name text PRIMARY KEY, data json);
INSERT INTO Settings(name, data) VALUES ('crawler_candidates_batch_size', '{"value": 0}'),('add_samples_batch_size', '{"value": 0}');