ALTER TABLE Matchretrievalrequests ADD COLUMN data json;

INSERT INTO Matchretrievalstatuses(label) VALUES ('download');

CREATE OR REPLACE FUNCTION request_download_trigger() RETURNS trigger AS $$
DECLARE
BEGIN
IF EXISTS(SELECT mrs.id FROM Matchretrievalstatuses mrs WHERE mrs.label='download' AND mrs.id = NEW.retrieval_status)
THEN
  PERFORM pg_notify('download_watchers', 'Download,' || NEW.id );
END IF;
  RETURN new;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER download_trigger AFTER UPDATE ON Matchretrievalrequests FOR EACH ROW EXECUTE PROCEDURE request_download_trigger();