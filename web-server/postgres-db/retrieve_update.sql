CREATE OR REPLACE FUNCTION retrieve_update_trigger() RETURNS trigger AS $$
DECLARE
BEGIN
IF EXISTS(SELECT mrs.id FROM MatchRetrievalStatuses mrs WHERE mrs.label='requested' AND mrs.id = NEW.retrieval_status)
THEN
  PERFORM pg_notify('retrieval_watchers', 'Retrieve,' || NEW.id );
END IF;
  RETURN new;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER retrieve_watchers_update_trigger AFTER UPDATE ON MatchRetrievalRequests FOR EACH ROW EXECUTE PROCEDURE retrieve_update_trigger();