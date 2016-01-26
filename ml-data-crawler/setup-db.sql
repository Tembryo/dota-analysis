CREATE TABLE Matches (matchid bigint PRIMARY KEY, downloaded boolean);
CREATE TABLE MMRSamples (matchid bigint REFERENCES Matches(matchid), steamid text, mmr int, slot int);
