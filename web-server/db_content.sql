--
-- PostgreSQL database dump
--

SET statement_timeout = 0;
SET lock_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SET check_function_bodies = false;
SET client_min_messages = warning;

SET search_path = public, pg_catalog;

--
-- Data for Name: eventtypes; Type: TABLE DATA; Schema: public; Owner: wisdota
--

INSERT INTO eventtypes VALUES (1, 'ViewPage');
INSERT INTO eventtypes VALUES (2, 'LogIn');


--
-- Name: eventtypes_id_seq; Type: SEQUENCE SET; Schema: public; Owner: wisdota
--

SELECT pg_catalog.setval('eventtypes_id_seq', 33, true);


--
-- Data for Name: matchretrievalstatuses; Type: TABLE DATA; Schema: public; Owner: wisdota
--

INSERT INTO matchretrievalstatuses VALUES (9, 'requested');
INSERT INTO matchretrievalstatuses VALUES (10, 'retrieving');
INSERT INTO matchretrievalstatuses VALUES (11, 'retrieved');
INSERT INTO matchretrievalstatuses VALUES (12, 'unavailable');
INSERT INTO matchretrievalstatuses VALUES (13, 'failed');
INSERT INTO matchretrievalstatuses VALUES (14, 'download');


--
-- Name: matchretrievalstatuses_id_seq; Type: SEQUENCE SET; Schema: public; Owner: wisdota
--

SELECT pg_catalog.setval('matchretrievalstatuses_id_seq', 46, true);


--
-- Data for Name: processingstatuses; Type: TABLE DATA; Schema: public; Owner: wisdota
--

INSERT INTO processingstatuses VALUES (1, 'uploaded');
INSERT INTO processingstatuses VALUES (2, 'extracting');
INSERT INTO processingstatuses VALUES (3, 'analysing');
INSERT INTO processingstatuses VALUES (4, 'registered');
INSERT INTO processingstatuses VALUES (5, 'failed');


--
-- Name: processingstatuses_id_seq; Type: SEQUENCE SET; Schema: public; Owner: wisdota
--

SELECT pg_catalog.setval('processingstatuses_id_seq', 33, true);


--
-- Data for Name: steamaccounts; Type: TABLE DATA; Schema: public; Owner: wisdota
--

INSERT INTO steamaccounts VALUES (1, 'wisdota_dev', 'devserver-steam-it-up');
INSERT INTO steamaccounts VALUES (2, 'wisdota_devbot_1', 'crawley-the-devbot-1');
INSERT INTO steamaccounts VALUES (3, 'wisdota_devbot_2', 'crawley-the-devbot-2');
INSERT INTO steamaccounts VALUES (4, 'wisdota_devbot_3', 'crawley-the-devbot-3');
INSERT INTO steamaccounts VALUES (5, 'wisdota_devbot_4', 'crawley-the-devbot-4');
INSERT INTO steamaccounts VALUES (6, 'wisdota_devbot_5', 'crawley-the-devbot-5');
INSERT INTO steamaccounts VALUES (7, 'wisdota_devbot_6', 'crawley-the-devbot-6');
INSERT INTO steamaccounts VALUES (8, 'wisdota_devbot_7', 'crawley-the-devbot-7');
INSERT INTO steamaccounts VALUES (9, 'wisdota_devbot_8', 'crawley-the-devbot-8');
INSERT INTO steamaccounts VALUES (10, 'wisdota_devbot_9', 'crawley-the-devbot-9');
INSERT INTO steamaccounts VALUES (11, 'wisdota_devbot_10', 'crawley-the-devbot-10');
INSERT INTO steamaccounts VALUES (12, 'wisdota_devbot_11', 'crawley-the-devbot-11');


--
-- Name: steamaccounts_id_seq; Type: SEQUENCE SET; Schema: public; Owner: wisdota
--

SELECT pg_catalog.setval('steamaccounts_id_seq', 12, true);


--
-- Data for Name: userstatustypes; Type: TABLE DATA; Schema: public; Owner: wisdota
--

INSERT INTO userstatustypes VALUES (1, 'admin');
INSERT INTO userstatustypes VALUES (2, 'verified');
INSERT INTO userstatustypes VALUES (3, 'plus');


--
-- Name: userstatustypes_id_seq; Type: SEQUENCE SET; Schema: public; Owner: wisdota
--

SELECT pg_catalog.setval('userstatustypes_id_seq', 33, true);


--
-- Data for Name: verificationactiontypes; Type: TABLE DATA; Schema: public; Owner: wisdota
--

INSERT INTO verificationactiontypes VALUES (1, 'SetEmail');
INSERT INTO verificationactiontypes VALUES (2, 'ActivatePlus');
INSERT INTO verificationactiontypes VALUES (34, 'ConfirmNewsletter');


--
-- Name: verificationactiontypes_id_seq; Type: SEQUENCE SET; Schema: public; Owner: wisdota
--

SELECT pg_catalog.setval('verificationactiontypes_id_seq', 34, true);


--
-- PostgreSQL database dump complete
--

