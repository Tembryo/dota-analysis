CREATE OR REPLACE FUNCTION retrieve_trigger() RETURNS trigger AS $$
DECLARE
BEGIN
  PERFORM pg_notify('retrieval_watchers', 'Retrieve,' || NEW.id );
  RETURN new;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION analyse_trigger() RETURNS trigger AS $$
DECLARE
BEGIN
  PERFORM pg_notify('replay_watchers', 'Analyse,' || NEW.id );
  RETURN new;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION analyse_update_trigger() RETURNS trigger AS $$
DECLARE
BEGIN
IF EXISTS(SELECT ps.id FROM ProcessingStatuses ps WHERE ps.label='uploaded' AND ps.id = NEW.processing_status)
THEN
  PERFORM pg_notify('replay_watchers', 'Analyse,' || NEW.id );
END IF;
  RETURN new;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION score_trigger() RETURNS trigger AS $$
DECLARE
BEGIN
  PERFORM pg_notify('score_watchers', 'Score,' || NEW.id );
  RETURN new;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER retrieve_watchers_trigger AFTER INSERT ON MatchRetrievalRequests FOR EACH ROW EXECUTE PROCEDURE retrieve_trigger();
CREATE TRIGGER analyse_watchers_trigger AFTER INSERT ON ReplayFiles FOR EACH ROW EXECUTE PROCEDURE analyse_trigger();
CREATE TRIGGER analyse_watchers_update_trigger AFTER UPDATE ON ReplayFiles FOR EACH ROW EXECUTE PROCEDURE analyse_update_trigger();
CREATE TRIGGER score_watchers_trigger AFTER INSERT ON ScoreRequests FOR EACH ROW EXECUTE PROCEDURE score_trigger();

