CREATE OR REPLACE FUNCTION analyse_trigger() RETURNS trigger AS $$
DECLARE
BEGIN
  PERFORM pg_notify('replay_watchers', '{"message":"Analyse","id":' || NEW.id||'}');
  RETURN new;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION analyse_update_trigger() RETURNS trigger AS $$
DECLARE
BEGIN
IF EXISTS(SELECT ps.id FROM ProcessingStatuses ps WHERE ps.label='uploaded' AND ps.id = NEW.processing_status)
THEN
  PERFORM pg_notify('replay_watchers', '{"message":"Analyse","id":' || NEW.id||'}' );
END IF;
  RETURN new;
END;
$$ LANGUAGE plpgsql;