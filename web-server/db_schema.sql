--
-- PostgreSQL database dump
--

SET statement_timeout = 0;
SET lock_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SET check_function_bodies = false;
SET client_min_messages = warning;

--
-- Name: plpgsql; Type: EXTENSION; Schema: -; Owner: 
--

CREATE EXTENSION IF NOT EXISTS plpgsql WITH SCHEMA pg_catalog;


--
-- Name: EXTENSION plpgsql; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION plpgsql IS 'PL/pgSQL procedural language';


SET search_path = public, pg_catalog;

--
-- Name: analyse_trigger(); Type: FUNCTION; Schema: public; Owner: wisdota
--

CREATE FUNCTION analyse_trigger() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
BEGIN
  PERFORM pg_notify('replay_watchers', '{"message":"Analyse","id":' || NEW.id||'}');
  RETURN new;
END;
$$;


ALTER FUNCTION public.analyse_trigger() OWNER TO wisdota;

--
-- Name: analyse_update_trigger(); Type: FUNCTION; Schema: public; Owner: wisdota
--

CREATE FUNCTION analyse_update_trigger() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
BEGIN
IF EXISTS(SELECT ps.id FROM ProcessingStatuses ps WHERE ps.label='uploaded' AND ps.id = NEW.processing_status)
THEN
  PERFORM pg_notify('replay_watchers', '{"message":"Analyse","id":' || NEW.id||'}' );
END IF;
  RETURN new;
END;
$$;


ALTER FUNCTION public.analyse_update_trigger() OWNER TO wisdota;

--
-- Name: newuser_trigger(); Type: FUNCTION; Schema: public; Owner: wisdota
--

CREATE FUNCTION newuser_trigger() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
BEGIN
  PERFORM pg_notify('newuser_watchers', '{"message":"User","id":' || NEW.id||'}' );
  RETURN new;
END;
$$;


ALTER FUNCTION public.newuser_trigger() OWNER TO wisdota;

--
-- Name: request_download_trigger(); Type: FUNCTION; Schema: public; Owner: wisdota
--

CREATE FUNCTION request_download_trigger() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
BEGIN
IF EXISTS(SELECT mrs.id FROM Matchretrievalstatuses mrs WHERE mrs.label='download' AND mrs.id = NEW.retrieval_status)
THEN
  PERFORM pg_notify('download_watchers', '{"message":"Download","id":' || NEW.id||'}');
END IF;
  RETURN new;
END;
$$;


ALTER FUNCTION public.request_download_trigger() OWNER TO wisdota;

--
-- Name: retrieve_trigger(); Type: FUNCTION; Schema: public; Owner: wisdota
--

CREATE FUNCTION retrieve_trigger() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
BEGIN
  PERFORM pg_notify('retrieval_watchers', '{"message":"Retrieve","id":' || NEW.id||'}' );
  RETURN new;
END;
$$;


ALTER FUNCTION public.retrieve_trigger() OWNER TO wisdota;

--
-- Name: retrieve_update_trigger(); Type: FUNCTION; Schema: public; Owner: wisdota
--

CREATE FUNCTION retrieve_update_trigger() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
BEGIN
IF EXISTS(SELECT mrs.id FROM MatchRetrievalStatuses mrs WHERE mrs.label='requested' AND mrs.id = NEW.retrieval_status)
THEN
  PERFORM pg_notify('retrieval_watchers', '{"message":"Retrieve","id":' || NEW.id||'}' );
END IF;
  RETURN new;
END;
$$;


ALTER FUNCTION public.retrieve_update_trigger() OWNER TO wisdota;

--
-- Name: score_trigger(); Type: FUNCTION; Schema: public; Owner: wisdota
--

CREATE FUNCTION score_trigger() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
BEGIN
  PERFORM pg_notify('score_watchers', 'Score,' || NEW.id );
  RETURN new;
END;
$$;


ALTER FUNCTION public.score_trigger() OWNER TO wisdota;

SET default_tablespace = '';

SET default_with_oids = false;

--
-- Name: emails; Type: TABLE; Schema: public; Owner: wisdota; Tablespace: 
--

CREATE TABLE emails (
    id bigint NOT NULL,
    user_id bigint,
    email text,
    verified boolean
);


ALTER TABLE emails OWNER TO wisdota;

--
-- Name: emails_id_seq; Type: SEQUENCE; Schema: public; Owner: wisdota
--

CREATE SEQUENCE emails_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE emails_id_seq OWNER TO wisdota;

--
-- Name: emails_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: wisdota
--

ALTER SEQUENCE emails_id_seq OWNED BY emails.id;


--
-- Name: events; Type: TABLE; Schema: public; Owner: wisdota; Tablespace: 
--

CREATE TABLE events (
    id bigint NOT NULL,
    event_type smallint,
    "time" timestamp without time zone,
    data json
);


ALTER TABLE events OWNER TO wisdota;

--
-- Name: events_id_seq; Type: SEQUENCE; Schema: public; Owner: wisdota
--

CREATE SEQUENCE events_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE events_id_seq OWNER TO wisdota;

--
-- Name: events_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: wisdota
--

ALTER SEQUENCE events_id_seq OWNED BY events.id;


--
-- Name: eventtypes; Type: TABLE; Schema: public; Owner: wisdota; Tablespace: 
--

CREATE TABLE eventtypes (
    id smallint NOT NULL,
    label text
);


ALTER TABLE eventtypes OWNER TO wisdota;

--
-- Name: eventtypes_id_seq; Type: SEQUENCE; Schema: public; Owner: wisdota
--

CREATE SEQUENCE eventtypes_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE eventtypes_id_seq OWNER TO wisdota;

--
-- Name: eventtypes_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: wisdota
--

ALTER SEQUENCE eventtypes_id_seq OWNED BY eventtypes.id;


--
-- Name: jobs; Type: TABLE; Schema: public; Owner: wisdota; Tablespace: 
--

CREATE TABLE jobs (
    id bigint NOT NULL,
    started timestamp without time zone,
    finished timestamp without time zone,
    data json
);


ALTER TABLE jobs OWNER TO wisdota;

--
-- Name: jobs_id_seq; Type: SEQUENCE; Schema: public; Owner: wisdota
--

CREATE SEQUENCE jobs_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE jobs_id_seq OWNER TO wisdota;

--
-- Name: jobs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: wisdota
--

ALTER SEQUENCE jobs_id_seq OWNED BY jobs.id;


--
-- Name: matchdetails; Type: TABLE; Schema: public; Owner: wisdota; Tablespace: 
--

CREATE TABLE matchdetails (
    matchid bigint NOT NULL,
    data json
);


ALTER TABLE matchdetails OWNER TO wisdota;

--
-- Name: matches; Type: TABLE; Schema: public; Owner: wisdota; Tablespace: 
--

CREATE TABLE matches (
    id bigint NOT NULL,
    label text,
    file text,
    header_file text,
    replayfile_id bigint,
    stats_file text
);


ALTER TABLE matches OWNER TO wisdota;

--
-- Name: matches_id_seq; Type: SEQUENCE; Schema: public; Owner: wisdota
--

CREATE SEQUENCE matches_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE matches_id_seq OWNER TO wisdota;

--
-- Name: matches_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: wisdota
--

ALTER SEQUENCE matches_id_seq OWNED BY matches.id;


--
-- Name: matchretrievalrequests; Type: TABLE; Schema: public; Owner: wisdota; Tablespace: 
--

CREATE TABLE matchretrievalrequests (
    id bigint NOT NULL,
    retrieval_status smallint,
    requester_id bigint,
    data json
);


ALTER TABLE matchretrievalrequests OWNER TO wisdota;

--
-- Name: matchretrievalstatuses; Type: TABLE; Schema: public; Owner: wisdota; Tablespace: 
--

CREATE TABLE matchretrievalstatuses (
    id smallint NOT NULL,
    label text
);


ALTER TABLE matchretrievalstatuses OWNER TO wisdota;

--
-- Name: matchretrievalstatuses_id_seq; Type: SEQUENCE; Schema: public; Owner: wisdota
--

CREATE SEQUENCE matchretrievalstatuses_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE matchretrievalstatuses_id_seq OWNER TO wisdota;

--
-- Name: matchretrievalstatuses_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: wisdota
--

ALTER SEQUENCE matchretrievalstatuses_id_seq OWNED BY matchretrievalstatuses.id;


--
-- Name: matchstats; Type: TABLE; Schema: public; Owner: wisdota; Tablespace: 
--

CREATE TABLE matchstats (
    id bigint NOT NULL,
    data json
);


ALTER TABLE matchstats OWNER TO wisdota;

--
-- Name: mmrdata; Type: TABLE; Schema: public; Owner: wisdota; Tablespace: 
--

CREATE TABLE mmrdata (
    matchid bigint NOT NULL,
    player_steamid text NOT NULL,
    solo_mmr integer,
    group_mmr integer,
    slot smallint
);


ALTER TABLE mmrdata OWNER TO wisdota;

--
-- Name: playerstats; Type: TABLE; Schema: public; Owner: wisdota; Tablespace: 
--

CREATE TABLE playerstats (
    match_id bigint NOT NULL,
    steam_identifier text NOT NULL,
    data json
);


ALTER TABLE playerstats OWNER TO wisdota;

--
-- Name: processingstatuses; Type: TABLE; Schema: public; Owner: wisdota; Tablespace: 
--

CREATE TABLE processingstatuses (
    id smallint NOT NULL,
    label text
);


ALTER TABLE processingstatuses OWNER TO wisdota;

--
-- Name: processingstatuses_id_seq; Type: SEQUENCE; Schema: public; Owner: wisdota
--

CREATE SEQUENCE processingstatuses_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE processingstatuses_id_seq OWNER TO wisdota;

--
-- Name: processingstatuses_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: wisdota
--

ALTER SEQUENCE processingstatuses_id_seq OWNED BY processingstatuses.id;


--
-- Name: replayfiles; Type: TABLE; Schema: public; Owner: wisdota; Tablespace: 
--

CREATE TABLE replayfiles (
    id bigint NOT NULL,
    file text,
    upload_filename text,
    processing_status smallint,
    match_id bigint,
    uploader_id bigint
);


ALTER TABLE replayfiles OWNER TO wisdota;

--
-- Name: replayfiles_id_seq; Type: SEQUENCE; Schema: public; Owner: wisdota
--

CREATE SEQUENCE replayfiles_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE replayfiles_id_seq OWNER TO wisdota;

--
-- Name: replayfiles_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: wisdota
--

ALTER SEQUENCE replayfiles_id_seq OWNED BY replayfiles.id;


--
-- Name: results; Type: TABLE; Schema: public; Owner: wisdota; Tablespace: 
--

CREATE TABLE results (
    id bigint NOT NULL,
    match_id bigint NOT NULL,
    steam_identifier text,
    data json
);


ALTER TABLE results OWNER TO wisdota;

--
-- Name: result_id_seq; Type: SEQUENCE; Schema: public; Owner: wisdota
--

CREATE SEQUENCE result_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE result_id_seq OWNER TO wisdota;

--
-- Name: result_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: wisdota
--

ALTER SEQUENCE result_id_seq OWNED BY results.id;


--
-- Name: result_match_id_seq; Type: SEQUENCE; Schema: public; Owner: wisdota
--

CREATE SEQUENCE result_match_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE result_match_id_seq OWNER TO wisdota;

--
-- Name: result_match_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: wisdota
--

ALTER SEQUENCE result_match_id_seq OWNED BY results.match_id;


--
-- Name: steamaccounts; Type: TABLE; Schema: public; Owner: wisdota; Tablespace: 
--

CREATE TABLE steamaccounts (
    id integer NOT NULL,
    name text,
    password text
);


ALTER TABLE steamaccounts OWNER TO wisdota;

--
-- Name: steamaccounts_id_seq; Type: SEQUENCE; Schema: public; Owner: wisdota
--

CREATE SEQUENCE steamaccounts_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE steamaccounts_id_seq OWNER TO wisdota;

--
-- Name: steamaccounts_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: wisdota
--

ALTER SEQUENCE steamaccounts_id_seq OWNED BY steamaccounts.id;


--
-- Name: usermatchhistory; Type: TABLE; Schema: public; Owner: wisdota; Tablespace: 
--

CREATE TABLE usermatchhistory (
    user_id bigint NOT NULL,
    match_id bigint NOT NULL,
    data json
);


ALTER TABLE usermatchhistory OWNER TO wisdota;

--
-- Name: users; Type: TABLE; Schema: public; Owner: wisdota; Tablespace: 
--

CREATE TABLE users (
    id bigint NOT NULL,
    name text,
    steam_object json,
    steam_identifier text,
    email text,
    last_match bigint DEFAULT 0
);


ALTER TABLE users OWNER TO wisdota;

--
-- Name: users_id_seq; Type: SEQUENCE; Schema: public; Owner: wisdota
--

CREATE SEQUENCE users_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE users_id_seq OWNER TO wisdota;

--
-- Name: users_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: wisdota
--

ALTER SEQUENCE users_id_seq OWNED BY users.id;


--
-- Name: userstatuses; Type: TABLE; Schema: public; Owner: wisdota; Tablespace: 
--

CREATE TABLE userstatuses (
    user_id bigint NOT NULL,
    statustype_id smallint NOT NULL,
    expiry_date timestamp without time zone
);


ALTER TABLE userstatuses OWNER TO wisdota;

--
-- Name: userstatustypes; Type: TABLE; Schema: public; Owner: wisdota; Tablespace: 
--

CREATE TABLE userstatustypes (
    id smallint NOT NULL,
    label text
);


ALTER TABLE userstatustypes OWNER TO wisdota;

--
-- Name: userstatustypes_id_seq; Type: SEQUENCE; Schema: public; Owner: wisdota
--

CREATE SEQUENCE userstatustypes_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE userstatustypes_id_seq OWNER TO wisdota;

--
-- Name: userstatustypes_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: wisdota
--

ALTER SEQUENCE userstatustypes_id_seq OWNED BY userstatustypes.id;


--
-- Name: verificationactions; Type: TABLE; Schema: public; Owner: wisdota; Tablespace: 
--

CREATE TABLE verificationactions (
    id bigint NOT NULL,
    actiontype_id integer,
    args json,
    code text
);


ALTER TABLE verificationactions OWNER TO wisdota;

--
-- Name: verificationactions_id_seq; Type: SEQUENCE; Schema: public; Owner: wisdota
--

CREATE SEQUENCE verificationactions_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE verificationactions_id_seq OWNER TO wisdota;

--
-- Name: verificationactions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: wisdota
--

ALTER SEQUENCE verificationactions_id_seq OWNED BY verificationactions.id;


--
-- Name: verificationactiontypes; Type: TABLE; Schema: public; Owner: wisdota; Tablespace: 
--

CREATE TABLE verificationactiontypes (
    id smallint NOT NULL,
    label text
);


ALTER TABLE verificationactiontypes OWNER TO wisdota;

--
-- Name: verificationactiontypes_id_seq; Type: SEQUENCE; Schema: public; Owner: wisdota
--

CREATE SEQUENCE verificationactiontypes_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE verificationactiontypes_id_seq OWNER TO wisdota;

--
-- Name: verificationactiontypes_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: wisdota
--

ALTER SEQUENCE verificationactiontypes_id_seq OWNED BY verificationactiontypes.id;


--
-- Name: id; Type: DEFAULT; Schema: public; Owner: wisdota
--

ALTER TABLE ONLY emails ALTER COLUMN id SET DEFAULT nextval('emails_id_seq'::regclass);


--
-- Name: id; Type: DEFAULT; Schema: public; Owner: wisdota
--

ALTER TABLE ONLY events ALTER COLUMN id SET DEFAULT nextval('events_id_seq'::regclass);


--
-- Name: id; Type: DEFAULT; Schema: public; Owner: wisdota
--

ALTER TABLE ONLY eventtypes ALTER COLUMN id SET DEFAULT nextval('eventtypes_id_seq'::regclass);


--
-- Name: id; Type: DEFAULT; Schema: public; Owner: wisdota
--

ALTER TABLE ONLY jobs ALTER COLUMN id SET DEFAULT nextval('jobs_id_seq'::regclass);


--
-- Name: id; Type: DEFAULT; Schema: public; Owner: wisdota
--

ALTER TABLE ONLY matches ALTER COLUMN id SET DEFAULT nextval('matches_id_seq'::regclass);


--
-- Name: id; Type: DEFAULT; Schema: public; Owner: wisdota
--

ALTER TABLE ONLY matchretrievalstatuses ALTER COLUMN id SET DEFAULT nextval('matchretrievalstatuses_id_seq'::regclass);


--
-- Name: id; Type: DEFAULT; Schema: public; Owner: wisdota
--

ALTER TABLE ONLY processingstatuses ALTER COLUMN id SET DEFAULT nextval('processingstatuses_id_seq'::regclass);


--
-- Name: id; Type: DEFAULT; Schema: public; Owner: wisdota
--

ALTER TABLE ONLY replayfiles ALTER COLUMN id SET DEFAULT nextval('replayfiles_id_seq'::regclass);


--
-- Name: id; Type: DEFAULT; Schema: public; Owner: wisdota
--

ALTER TABLE ONLY results ALTER COLUMN id SET DEFAULT nextval('result_id_seq'::regclass);


--
-- Name: match_id; Type: DEFAULT; Schema: public; Owner: wisdota
--

ALTER TABLE ONLY results ALTER COLUMN match_id SET DEFAULT nextval('result_match_id_seq'::regclass);


--
-- Name: id; Type: DEFAULT; Schema: public; Owner: wisdota
--

ALTER TABLE ONLY steamaccounts ALTER COLUMN id SET DEFAULT nextval('steamaccounts_id_seq'::regclass);


--
-- Name: id; Type: DEFAULT; Schema: public; Owner: wisdota
--

ALTER TABLE ONLY users ALTER COLUMN id SET DEFAULT nextval('users_id_seq'::regclass);


--
-- Name: id; Type: DEFAULT; Schema: public; Owner: wisdota
--

ALTER TABLE ONLY userstatustypes ALTER COLUMN id SET DEFAULT nextval('userstatustypes_id_seq'::regclass);


--
-- Name: id; Type: DEFAULT; Schema: public; Owner: wisdota
--

ALTER TABLE ONLY verificationactions ALTER COLUMN id SET DEFAULT nextval('verificationactions_id_seq'::regclass);


--
-- Name: id; Type: DEFAULT; Schema: public; Owner: wisdota
--

ALTER TABLE ONLY verificationactiontypes ALTER COLUMN id SET DEFAULT nextval('verificationactiontypes_id_seq'::regclass);


--
-- Name: emails_pkey; Type: CONSTRAINT; Schema: public; Owner: wisdota; Tablespace: 
--

ALTER TABLE ONLY emails
    ADD CONSTRAINT emails_pkey PRIMARY KEY (id);


--
-- Name: events_pkey; Type: CONSTRAINT; Schema: public; Owner: wisdota; Tablespace: 
--

ALTER TABLE ONLY events
    ADD CONSTRAINT events_pkey PRIMARY KEY (id);


--
-- Name: eventtypes_pkey; Type: CONSTRAINT; Schema: public; Owner: wisdota; Tablespace: 
--

ALTER TABLE ONLY eventtypes
    ADD CONSTRAINT eventtypes_pkey PRIMARY KEY (id);


--
-- Name: matchdetails_pkey; Type: CONSTRAINT; Schema: public; Owner: wisdota; Tablespace: 
--

ALTER TABLE ONLY matchdetails
    ADD CONSTRAINT matchdetails_pkey PRIMARY KEY (matchid);


--
-- Name: matches_pkey; Type: CONSTRAINT; Schema: public; Owner: wisdota; Tablespace: 
--

ALTER TABLE ONLY matches
    ADD CONSTRAINT matches_pkey PRIMARY KEY (id);


--
-- Name: matchretrievalrequests_pkey; Type: CONSTRAINT; Schema: public; Owner: wisdota; Tablespace: 
--

ALTER TABLE ONLY matchretrievalrequests
    ADD CONSTRAINT matchretrievalrequests_pkey PRIMARY KEY (id);


--
-- Name: matchretrievalstatuses_pkey; Type: CONSTRAINT; Schema: public; Owner: wisdota; Tablespace: 
--

ALTER TABLE ONLY matchretrievalstatuses
    ADD CONSTRAINT matchretrievalstatuses_pkey PRIMARY KEY (id);


--
-- Name: matchstats_pkey; Type: CONSTRAINT; Schema: public; Owner: wisdota; Tablespace: 
--

ALTER TABLE ONLY matchstats
    ADD CONSTRAINT matchstats_pkey PRIMARY KEY (id);


--
-- Name: mmrdata_pkey; Type: CONSTRAINT; Schema: public; Owner: wisdota; Tablespace: 
--

ALTER TABLE ONLY mmrdata
    ADD CONSTRAINT mmrdata_pkey PRIMARY KEY (matchid, player_steamid);


--
-- Name: player_match_key; Type: CONSTRAINT; Schema: public; Owner: wisdota; Tablespace: 
--

ALTER TABLE ONLY results
    ADD CONSTRAINT player_match_key UNIQUE (match_id, steam_identifier);


--
-- Name: playerstats_pkey; Type: CONSTRAINT; Schema: public; Owner: wisdota; Tablespace: 
--

ALTER TABLE ONLY playerstats
    ADD CONSTRAINT playerstats_pkey PRIMARY KEY (match_id, steam_identifier);


--
-- Name: processingstatuses_pkey; Type: CONSTRAINT; Schema: public; Owner: wisdota; Tablespace: 
--

ALTER TABLE ONLY processingstatuses
    ADD CONSTRAINT processingstatuses_pkey PRIMARY KEY (id);


--
-- Name: replayfiles_pkey; Type: CONSTRAINT; Schema: public; Owner: wisdota; Tablespace: 
--

ALTER TABLE ONLY replayfiles
    ADD CONSTRAINT replayfiles_pkey PRIMARY KEY (id);


--
-- Name: result_pkey; Type: CONSTRAINT; Schema: public; Owner: wisdota; Tablespace: 
--

ALTER TABLE ONLY results
    ADD CONSTRAINT result_pkey PRIMARY KEY (id);


--
-- Name: usermatchhistory_pkey; Type: CONSTRAINT; Schema: public; Owner: wisdota; Tablespace: 
--

ALTER TABLE ONLY usermatchhistory
    ADD CONSTRAINT usermatchhistory_pkey PRIMARY KEY (user_id, match_id);


--
-- Name: users_pkey; Type: CONSTRAINT; Schema: public; Owner: wisdota; Tablespace: 
--

ALTER TABLE ONLY users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: userstatuses_pkey; Type: CONSTRAINT; Schema: public; Owner: wisdota; Tablespace: 
--

ALTER TABLE ONLY userstatuses
    ADD CONSTRAINT userstatuses_pkey PRIMARY KEY (user_id, statustype_id);


--
-- Name: userstatustypes_pkey; Type: CONSTRAINT; Schema: public; Owner: wisdota; Tablespace: 
--

ALTER TABLE ONLY userstatustypes
    ADD CONSTRAINT userstatustypes_pkey PRIMARY KEY (id);


--
-- Name: verificationactions_pkey; Type: CONSTRAINT; Schema: public; Owner: wisdota; Tablespace: 
--

ALTER TABLE ONLY verificationactions
    ADD CONSTRAINT verificationactions_pkey PRIMARY KEY (id);


--
-- Name: verificationactiontypes_pkey; Type: CONSTRAINT; Schema: public; Owner: wisdota; Tablespace: 
--

ALTER TABLE ONLY verificationactiontypes
    ADD CONSTRAINT verificationactiontypes_pkey PRIMARY KEY (id);


--
-- Name: analyse_watchers_trigger; Type: TRIGGER; Schema: public; Owner: wisdota
--

CREATE TRIGGER analyse_watchers_trigger AFTER INSERT ON replayfiles FOR EACH ROW EXECUTE PROCEDURE analyse_trigger();


--
-- Name: analyse_watchers_update_trigger; Type: TRIGGER; Schema: public; Owner: wisdota
--

CREATE TRIGGER analyse_watchers_update_trigger AFTER UPDATE ON replayfiles FOR EACH ROW EXECUTE PROCEDURE analyse_update_trigger();


--
-- Name: download_trigger; Type: TRIGGER; Schema: public; Owner: wisdota
--

CREATE TRIGGER download_trigger AFTER UPDATE ON matchretrievalrequests FOR EACH ROW EXECUTE PROCEDURE request_download_trigger();


--
-- Name: newuser_watchers_trigger; Type: TRIGGER; Schema: public; Owner: wisdota
--

CREATE TRIGGER newuser_watchers_trigger AFTER INSERT ON users FOR EACH ROW EXECUTE PROCEDURE newuser_trigger();


--
-- Name: retrieve_watchers_trigger; Type: TRIGGER; Schema: public; Owner: wisdota
--

CREATE TRIGGER retrieve_watchers_trigger AFTER INSERT ON matchretrievalrequests FOR EACH ROW EXECUTE PROCEDURE retrieve_trigger();


--
-- Name: retrieve_watchers_update_trigger; Type: TRIGGER; Schema: public; Owner: wisdota
--

CREATE TRIGGER retrieve_watchers_update_trigger AFTER UPDATE ON matchretrievalrequests FOR EACH ROW EXECUTE PROCEDURE retrieve_update_trigger();


--
-- Name: events_event_type_fkey; Type: FK CONSTRAINT; Schema: public; Owner: wisdota
--

ALTER TABLE ONLY events
    ADD CONSTRAINT events_event_type_fkey FOREIGN KEY (event_type) REFERENCES eventtypes(id);


--
-- Name: matches_replayfile_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: wisdota
--

ALTER TABLE ONLY matches
    ADD CONSTRAINT matches_replayfile_id_fkey FOREIGN KEY (replayfile_id) REFERENCES replayfiles(id);


--
-- Name: matchretrievalrequests_requester_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: wisdota
--

ALTER TABLE ONLY matchretrievalrequests
    ADD CONSTRAINT matchretrievalrequests_requester_id_fkey FOREIGN KEY (requester_id) REFERENCES users(id);


--
-- Name: matchretrievalrequests_retrieval_status_fkey; Type: FK CONSTRAINT; Schema: public; Owner: wisdota
--

ALTER TABLE ONLY matchretrievalrequests
    ADD CONSTRAINT matchretrievalrequests_retrieval_status_fkey FOREIGN KEY (retrieval_status) REFERENCES matchretrievalstatuses(id);


--
-- Name: replayfiles_processing_status_fkey; Type: FK CONSTRAINT; Schema: public; Owner: wisdota
--

ALTER TABLE ONLY replayfiles
    ADD CONSTRAINT replayfiles_processing_status_fkey FOREIGN KEY (processing_status) REFERENCES processingstatuses(id);


--
-- Name: replayfiles_uploader_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: wisdota
--

ALTER TABLE ONLY replayfiles
    ADD CONSTRAINT replayfiles_uploader_id_fkey FOREIGN KEY (uploader_id) REFERENCES users(id);


--
-- Name: result_match_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: wisdota
--

ALTER TABLE ONLY results
    ADD CONSTRAINT result_match_id_fkey FOREIGN KEY (match_id) REFERENCES matches(id);


--
-- Name: userstatuses_statustype_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: wisdota
--

ALTER TABLE ONLY userstatuses
    ADD CONSTRAINT userstatuses_statustype_id_fkey FOREIGN KEY (statustype_id) REFERENCES userstatustypes(id);


--
-- Name: userstatuses_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: wisdota
--

ALTER TABLE ONLY userstatuses
    ADD CONSTRAINT userstatuses_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id);


--
-- Name: verificationactions_actiontype_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: wisdota
--

ALTER TABLE ONLY verificationactions
    ADD CONSTRAINT verificationactions_actiontype_id_fkey FOREIGN KEY (actiontype_id) REFERENCES verificationactiontypes(id);


--
-- Name: public; Type: ACL; Schema: -; Owner: postgres
--

REVOKE ALL ON SCHEMA public FROM PUBLIC;
REVOKE ALL ON SCHEMA public FROM postgres;
GRANT ALL ON SCHEMA public TO postgres;
GRANT ALL ON SCHEMA public TO PUBLIC;


--
-- PostgreSQL database dump complete
--

