CREATE TABLE Machines (id serial, last_registered timestamp);
CREATE TABLE LogEntries (id bigserial, time timestamp, filters jsonb, entry jsonb);