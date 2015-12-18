CREATE TABLE IF NOT EXISTS MatchRetrievalStatuses(id smallserial PRIMARY KEY, label text);
INSERT INTO MatchRetrievalStatuses(label) VALUES ('requested'), ('retrieving'), ('retrieved'), ('unavailable'), ('failed');
CREATE TABLE IF NOT EXISTS MatchRetrievalRequests(id bigint PRIMARY KEY, retrieval_status smallint REFERENCES MatchRetrievalStatuses(id));
