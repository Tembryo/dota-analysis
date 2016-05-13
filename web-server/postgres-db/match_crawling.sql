CREATE TABLE CrawlingMatchStatuses(id smallserial primary key, label text);
INSERT INTO CrawlingMatchStatuses(label) VALUES ('open'), ('skipped'), ('added');

CREATE TABLE CrawlingMatches (matchid bigint PRIMARY KEY, status int REFERENCES CrawlingMatchStatuses, data json);

CREATE TABLE CrawlingSamples (matchid bigint, hero smallint, solo_mmr int, party_mmr int, PRIMARY KEY(matchid, hero));