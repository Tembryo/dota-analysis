CREATE OR REPLACE FUNCTION request_download_trigger() RETURNS trigger AS $$
DECLARE
BEGIN
IF EXISTS(SELECT mrs.id FROM Matchretrievalstatuses mrs WHERE mrs.label='download' AND mrs.id = NEW.retrieval_status)
THEN
  PERFORM pg_notify('download_watchers', '{"message":"Download","id":' || NEW.id||'}');
END IF;
  RETURN new;
END;
$$ LANGUAGE plpgsql;