CREATE TABLE Machines (id serial, last_registered timestamp);
CREATE TABLE LogEntries (time timestamp, filters json, entry json);