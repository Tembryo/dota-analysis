CREATE OR REPLACE FUNCTION newuser_trigger() RETURNS trigger AS $$
DECLARE
BEGIN
  PERFORM pg_notify('newuser_watchers', 'User,' || NEW.id );
  RETURN new;
END;
$$ LANGUAGE plpgsql;


CREATE TRIGGER newuser_watchers_trigger AFTER INSERT ON Users FOR EACH ROW EXECUTE PROCEDURE newuser_trigger();