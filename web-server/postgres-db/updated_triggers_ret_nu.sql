CREATE OR REPLACE FUNCTION newuser_trigger() RETURNS trigger AS $$
DECLARE
BEGIN
  PERFORM pg_notify('newuser_watchers', '{"message":"User","id":' || NEW.id||'}' );
  RETURN new;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION retrieve_update_trigger() RETURNS trigger AS $$
DECLARE
BEGIN
IF EXISTS(SELECT mrs.id FROM MatchRetrievalStatuses mrs WHERE mrs.label='requested' AND mrs.id = NEW.retrieval_status)
THEN
  PERFORM pg_notify('retrieval_watchers', '{"message":"Retrieve","id":' || NEW.id||'}' );
END IF;
  RETURN new;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION retrieve_trigger() RETURNS trigger AS $$
DECLARE
BEGIN
  PERFORM pg_notify('retrieval_watchers', '{"message":"Retrieve","id":' || NEW.id||'}' );
  RETURN new;
END;
$$ LANGUAGE plpgsql;