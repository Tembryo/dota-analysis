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
-- Data for Name: eventpropertynames; Type: TABLE DATA; Schema: public; Owner: wisdota
--

COPY eventpropertynames (id, label) FROM stdin;
1	page
2	user
\.


--
-- Data for Name: eventtypes; Type: TABLE DATA; Schema: public; Owner: wisdota
--

COPY eventtypes (id, label) FROM stdin;
1	ViewPage
2	LogIn
\.


--
-- Data for Name: events; Type: TABLE DATA; Schema: public; Owner: wisdota
--

COPY events (id, event_type, "time") FROM stdin;
\.


--
-- Data for Name: eventproperties; Type: TABLE DATA; Schema: public; Owner: wisdota
--

COPY eventproperties (event_id, property_name, value) FROM stdin;
\.


--
-- Name: eventpropertynames_id_seq; Type: SEQUENCE SET; Schema: public; Owner: wisdota
--

SELECT pg_catalog.setval('eventpropertynames_id_seq', 33, true);


--
-- Name: events_id_seq; Type: SEQUENCE SET; Schema: public; Owner: wisdota
--

SELECT pg_catalog.setval('events_id_seq', 1, false);


--
-- Name: eventtypes_id_seq; Type: SEQUENCE SET; Schema: public; Owner: wisdota
--

SELECT pg_catalog.setval('eventtypes_id_seq', 33, true);


--
-- Data for Name: processingstatuses; Type: TABLE DATA; Schema: public; Owner: wisdota
--

COPY processingstatuses (id, label) FROM stdin;
1	uploaded
2	extracting
3	analysing
4	registered
5	failed
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: wisdota
--

COPY users (id, name, steam_object, steam_identifier, email, last_match) FROM stdin;
\.


--
-- Data for Name: replayfiles; Type: TABLE DATA; Schema: public; Owner: wisdota
--

COPY replayfiles (id, file, upload_filename, processing_status, match_id, uploader_id) FROM stdin;
\.


--
-- Data for Name: matches; Type: TABLE DATA; Schema: public; Owner: wisdota
--

COPY matches (id, label, file, header_file, replayfile_id, stats_file) FROM stdin;
\.


--
-- Name: matches_id_seq; Type: SEQUENCE SET; Schema: public; Owner: wisdota
--

SELECT pg_catalog.setval('matches_id_seq', 1, false);


--
-- Data for Name: matchretrievalstatuses; Type: TABLE DATA; Schema: public; Owner: wisdota
--

COPY matchretrievalstatuses (id, label) FROM stdin;
1	requested
2	retrieving
3	retrieved
4	unavailable
5	failed
\.


--
-- Data for Name: matchretrievalrequests; Type: TABLE DATA; Schema: public; Owner: wisdota
--

COPY matchretrievalrequests (id, retrieval_status, requester_id) FROM stdin;
\.


--
-- Name: matchretrievalstatuses_id_seq; Type: SEQUENCE SET; Schema: public; Owner: wisdota
--

SELECT pg_catalog.setval('matchretrievalstatuses_id_seq', 13, true);


--
-- Data for Name: matchstats; Type: TABLE DATA; Schema: public; Owner: wisdota
--

COPY matchstats (id, data) FROM stdin;
\.


--
-- Data for Name: playerstats; Type: TABLE DATA; Schema: public; Owner: wisdota
--

COPY playerstats (match_id, steam_identifier, data) FROM stdin;
\.


--
-- Name: processingstatuses_id_seq; Type: SEQUENCE SET; Schema: public; Owner: wisdota
--

SELECT pg_catalog.setval('processingstatuses_id_seq', 33, true);


--
-- Name: replayfiles_id_seq; Type: SEQUENCE SET; Schema: public; Owner: wisdota
--

SELECT pg_catalog.setval('replayfiles_id_seq', 521, true);


--
-- Name: result_id_seq; Type: SEQUENCE SET; Schema: public; Owner: wisdota
--

SELECT pg_catalog.setval('result_id_seq', 515, true);


--
-- Name: result_match_id_seq; Type: SEQUENCE SET; Schema: public; Owner: wisdota
--

SELECT pg_catalog.setval('result_match_id_seq', 1, false);


--
-- Data for Name: results; Type: TABLE DATA; Schema: public; Owner: wisdota
--

COPY results (id, match_id, steam_identifier, data) FROM stdin;
\.


--
-- Data for Name: scorerequests; Type: TABLE DATA; Schema: public; Owner: wisdota
--

COPY scorerequests (id, match_id) FROM stdin;
\.


--
-- Name: scorerequests_id_seq; Type: SEQUENCE SET; Schema: public; Owner: wisdota
--

SELECT pg_catalog.setval('scorerequests_id_seq', 725, true);


--
-- Data for Name: usermatchhistory; Type: TABLE DATA; Schema: public; Owner: wisdota
--

COPY usermatchhistory (user_id, match_id, data) FROM stdin;
\.

--
-- Data for Name: userstatustypes; Type: TABLE DATA; Schema: public; Owner: wisdota
--

COPY userstatustypes (id, label) FROM stdin;
1	admin
2	verified
3	plus
\.


--
-- Data for Name: userstatuses; Type: TABLE DATA; Schema: public; Owner: wisdota
--

COPY userstatuses (user_id, statustype_id, expiry_date) FROM stdin;
1	1	infinity
\.


--
-- Name: userstatustypes_id_seq; Type: SEQUENCE SET; Schema: public; Owner: wisdota
--

SELECT pg_catalog.setval('userstatustypes_id_seq', 33, true);


--
-- Data for Name: verificationactiontypes; Type: TABLE DATA; Schema: public; Owner: wisdota
--

COPY verificationactiontypes (id, label) FROM stdin;
1	SetEmail
2	ActivatePlus
\.


--
-- Data for Name: verificationactions; Type: TABLE DATA; Schema: public; Owner: wisdota
--

COPY verificationactions (id, actiontype_id, args, code) FROM stdin;
\.


--
-- Name: verificationactions_id_seq; Type: SEQUENCE SET; Schema: public; Owner: wisdota
--

SELECT pg_catalog.setval('verificationactions_id_seq', 436, true);


--
-- Name: verificationactiontypes_id_seq; Type: SEQUENCE SET; Schema: public; Owner: wisdota
--

SELECT pg_catalog.setval('verificationactiontypes_id_seq', 33, true);


--
-- PostgreSQL database dump complete
--

