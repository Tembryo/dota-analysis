WITH SampleBins AS 
(SELECT -LOG(COUNT(*)::float/(SELECT COUNT(*) FROM mmrdata WHERE solo_mmr IS NOT NULL)) as entropy, 
floor(AVG(d.solo_mmr)/$1)*$1 as mmr_bin, 
sh.hero as hero
FROM mmrdata d,
(select matchid, (player->>'player_slot')::smallint as slot ,(player->>'hero_id')::smallint as hero from 
    (select json_array_elements(data->'players') as player, matchid  from matchdetails) players)
     sh
 WHERE d.matchid=sh.matchid AND d.slot=sh.slot AND d.solo_mmr IS NOT NULL GROUP BY floor(d.solo_mmr/$1)*$1, sh.hero) 
SELECT m.matchid, SUM(COALESCE(bin.entropy, (SELECT MAX(entropy) FROM SampleBins) )) AS value 
FROM CrawlingMatches m, CrawlingMatchStatuses s, CrawlingSamples smpl LEFT JOIN SampleBins bin ON floor(smpl.solo_mmr/$1)*$1=bin.mmr_bin AND bin.hero=smpl.hero
WHERE smpl.matchid= m.matchid AND s.label='open' AND s.id=m.status 
AND to_timestamp((m.data->>'start_time')::bigint) > current_date - interval '7 days' GROUP BY m.matchid ORDER BY value DESC LIMIT $2;



WITH SampleBins AS 
(SELECT -LOG(COUNT(*)::float/(SELECT COUNT(*) FROM mmrdata WHERE solo_mmr IS NOT NULL)) as entropy, 
floor(AVG(d.solo_mmr)/250)*250 as mmr_bin 
FROM mmrdata d WHERE d.solo_mmr IS NOT NULL GROUP BY floor(d.solo_mmr/250)*250) 
SELECT m.matchid,json_agg(smpl.solo_mmr), SUM(bin.entropy*bin.entropy) AS value 
FROM CrawlingMatches m, CrawlingMatchStatuses s, CrawlingSamples smpl, SampleBins bin 
WHERE smpl.matchid= m.matchid AND s.label='open' AND s.id=m.status AND floor(smpl.solo_mmr/250)*250=bin.mmr_bin 
AND to_timestamp((m.data->>'start_time')::bigint) > current_date - interval '7 days' GROUP BY m.matchid ORDER BY value DESC LIMIT 25;

INSERT INTO jobs(started, data) (SELECT now(), ('{"message":"Score", "id":'||m.id||'}')::json FROM Matches m WHERE m.analysis_version = '24/05/16');

select * FROM MAtches m where m.analysis_version = '24/05/16' and not exists(SELeCT * FRom results r where r.match_id=m.id)

update settings set data='{"value": 5}' where name='add_samples_batch_size';
update matchretrievalrequests set retrieval_status=1 where retrieval_status=5;
SELECT count(*) FROM JOBS WHERE FINISHED is null;


SELECT -LOG(COUNT(*)::float/(SELECT COUNT(*) FROM mmrdata WHERE solo_mmr IS NOT NULL)) as entropy, 
floor(AVG(d.solo_mmr)/$1)*$1 as mmr_bin 
FROM mmrdata d WHERE d.solo_mmr IS NOT NULL GROUP BY floor(d.solo_mmr/$1)*$1



(select player->>'player_slot' as slot ,player->>'hero_id' as hero from 
    (select json_array_elements(data->'players') as player from matchdetails where matchid=2238075389) players)
     slot_heroes;



WITH SampleBins AS 
(SELECT -LOG(COUNT(*)::float/(SELECT COUNT(*) FROM mmrdata WHERE solo_mmr IS NOT NULL)) as entropy, 
floor(AVG(d.solo_mmr)/250)*250 as mmr_bin, 
sh.hero as hero
FROM mmrdata d,
(select matchid, (player->>'player_slot')::smallint as slot ,(player->>'hero_id')::smallint as hero from 
    (select json_array_elements(data->'players') as player, matchid  from matchdetails) players)
     sh
 WHERE d.matchid=sh.matchid AND d.slot=sh.slot AND d.solo_mmr IS NOT NULL GROUP BY floor(d.solo_mmr/250)*250, sh.hero),

Candidates as (SELECT m.matchid, SUM(COALESCE(bin.entropy, (SELECT MAX(entropy) FROM SampleBins) )) AS value, json_agg(bin.mmr_bin) as bins, json_agg(bin.hero) as heroes 
FROM CrawlingMatches m, CrawlingMatchStatuses s, CrawlingSamples smpl LEFT JOIN SampleBins bin ON floor(smpl.solo_mmr/250)*250=bin.mmr_bin AND bin.hero=smpl.hero
WHERE smpl.matchid= m.matchid AND s.label='open' AND s.id=m.status 
AND to_timestamp((m.data->>'start_time')::bigint) > current_date - interval '7 days' GROUP BY m.matchid ORDER BY value DESC LIMIT 500);

INSERT INTO matchretrievalrequests(id) (SELECT matchid from Candidates);


INSERT INTO jobs(started, data) VALUES (now(), '{"message":"Retrieve", "id":2506343109}'::json);


INSERT INTO jobs(started, data) VALUES (now(), '{"message":"AddSampleMatches", "n":2000}'::json);

INSERT INTO jobs(started, data) (SELECT now(), ('{"message":"Score", "id":'||m.id||'}')::json FROM (SELECT * FROM Matches ORDER BY id DESC) m WHERE m.analysis_version = '24/05/16');




WITH SampleBins AS 
(SELECT -LOG(COUNT(*)::float/(SELECT COUNT(*) FROM mmrdata WHERE solo_mmr IS NOT NULL)) as entropy, 
floor(AVG(d.solo_mmr)/250)*250 as mmr_bin, 
sh.hero as hero
FROM mmrdata d,
(select matchid, (player->>'player_slot')::smallint as slot ,(player->>'hero_id')::smallint as hero from 
    (select json_array_elements(data->'players') as player, matchid  from matchdetails) players)
     sh
 WHERE d.matchid=sh.matchid AND d.slot=sh.slot AND d.solo_mmr IS NOT NULL GROUP BY floor(d.solo_mmr/250)*250, sh.hero) 
SELECT m.matchid, SUM(COALESCE(bin.entropy, (SELECT MAX(entropy) FROM SampleBins) )) AS value, json_agg(bin.mmr_bin) as bins, json_agg(bin.hero) as heroes 
FROM CrawlingMatches m, CrawlingMatchStatuses s, CrawlingSamples smpl LEFT JOIN SampleBins bin ON floor(smpl.solo_mmr/250)*250=bin.mmr_bin AND bin.hero=smpl.hero
WHERE smpl.matchid= m.matchid AND s.label='open' AND s.id=m.status 
AND to_timestamp((m.data->>'start_time')::bigint) > current_date - interval '7 days' GROUP BY m.matchid ORDER BY value DESC LIMIT 2000;

INSERT INTO jobs(started, data) VALUES (now(), '{"message":"Score", "id":2425170236}'::json);


update matchretrievalrequests set retrieval_status=1 where id  in (SElECT id from matchretrievalrequests where retrieval_status=5 limit 100);


INSERT INTO MatchRetrievalRequests(id, retrieval_status, requester_id) 
(SELECT umh.match_id, (SELECT mrs.id FROM MatchRetrievalStatuses mrs where mrs.label='requested'), 2839 
FROM UserMatchHistory umh 
WHERE umh.user_id = 2839 AND to_timestamp((umh.data->>'start_time')::int) > current_timestamp - interval '7 days' 
AND NOT EXISTS (SELECT mrs.id FROM MatchRetrievalRequests mrs where mrs.id = umh.match_id) );


SELECT umh.match_id, umh.data as history_data, EXISTS(SELECT id FROM MatchRetrievalRequests where id = umh.match_id) as requested, 
COALESCE( (SELECT ps.label FROM ProcessingStatuses ps, Replayfiles rf where rf.match_id = umh.match_id AND ps.id=rf.processing_status),
'unknown') AS processing_status, 
COALESCE( (SELECT mrs.label FROM MatchRetrievalStatuses mrs, MatchRetrievalRequests mrr where mrr.id = umh.match_id AND mrs.id=mrr.retrieval_status),
'unknown') AS retrieval_status, 
COALESCE( (SELECT ps.data FROM PlayerStats ps WHERE umh.match_id = ps.match_id AND ps.steam_identifier = u.steam_identifier),
'null'::json) AS player_stats, 
COALESCE( (SELECT ms.data FROM MatchStats ms WHERE umh.match_id = ms.id ),
'null'::json) AS match_stats, 
COALESCE( (SELECT r.data FROM Results r WHERE umh.match_id = r.match_id AND r.steam_identifier = u.steam_identifier),
'null'::json) AS score_data, 
COALESCE( (SELECT md.data FROM MatchDetails md WHERE umh.match_id = md.matchid),
'null'::json) AS match_details 
FROM Users u, UserMatchHistory umh
WHERE u.id = 2 
AND u.id = umh.user_id 
ORDER BY umh.match_id DESC 
LIMIT 30 OFFSET 0;

select count(*), data->>'message' from jobs where finished is null group by data->>'message';


select count(*) as n, floor(date_part('day', now()- last_login)/7) as weeks_since_login 
from (select max(time) last_login, count(*) as logins, data->>'user' as id 
    from events 
    where event_type=2 and 
    floor(date_part('day',now() - time)/7)>=1 group by data->>'user')
 as userlogins 
 group by floor(date_part('day', now()- last_login)/7) 
 ORDER BY floor(date_part('day', now()- last_login)/7);

 select count(*) as n, floor(date_part('day', now()- last_login)/7) as weeks_since_login 
from (select max(time) last_login, count(*) as logins, data->>'user' as id 
    from events 
    where event_type=2 and 
    floor(date_part('day',now() - time)/7)>=2 group by data->>'user')
 as userlogins 
 group by floor(date_part('day', now()- last_login)/7) 
 ORDER BY floor(date_part('day', now()- last_login)/7);

  select count(*) as n, floor(date_part('day', now()- last_login)/7) as weeks_since_login 
from (select max(time) last_login, count(*) as logins, data->>'user' as id 
    from events 
    where event_type=2 and 
    floor(date_part('day',now() - time)/7)>=5 group by data->>'user')
 as userlogins 
 group by floor(date_part('day', now()- last_login)/7) 
 ORDER BY floor(date_part('day', now()- last_login)/7);

   select count(*) as n, floor(date_part('day', now()- last_login)/7) as weeks_since_login 
from (select max(time) last_login, count(*) as logins, data->>'user' as id 
    from events 
    where event_type=2 and 
    floor(date_part('day',now() - time)/7)>=6 group by data->>'user')
 as userlogins 
 group by floor(date_part('day', now()- last_login)/7) 
 ORDER BY floor(date_part('day', now()- last_login)/7);




 SELECT match_id, processing_status, retrieval_status FROM
(SELECT umh.match_id, umh.data as history_data, EXISTS(SELECT id FROM MatchRetrievalRequests where id = umh.match_id) as requested, 
           COALESCE( (SELECT ps.label FROM ProcessingStatuses ps, Replayfiles rf where rf.match_id = umh.match_id AND ps.id=rf.processing_status),
                                    'unknown') AS processing_status, 
                    COALESCE( (SELECT mrs.label FROM MatchRetrievalStatuses mrs, MatchRetrievalRequests mrr where mrr.id = umh.match_id AND mrs.id=mrr.retrieval_status),
                           'unknown') AS retrieval_status, 
           COALESCE( (SELECT ps.data FROM PlayerStats ps WHERE umh.match_id = ps.match_id AND ps.steam_identifier = u.steam_identifier),
             'null'::json) AS player_stats, 
        COALESCE( (SELECT ms.data FROM MatchStats ms WHERE umh.match_id = ms.id ),
                      'null'::json) AS match_stats, 
         COALESCE( (SELECT r.data FROM Results r WHERE umh.match_id = r.match_id AND r.steam_identifier = u.steam_identifier),
                    'null'::json) AS score_data, 
        COALESCE( (SELECT md.data FROM MatchDetails md WHERE umh.match_id = md.matchid),
      'null'::json) AS match_details 
 FROM Users u, UserMatchHistory umh 
 WHERE u.id = 1 
 AND u.id = umh.user_id 
ORDER BY umh.match_id DESC 
) md;



SELECT match_id, processing_status, retrieval_status FROM
(SELECT umh.match_id, umh.data as history_data,
        EXISTS(SELECT id FROM MatchRetrievalRequests where id = umh.match_id) as requested, 
        COALESCE( (SELECT ps.label FROM ProcessingStatuses ps, Replayfiles rf where rf.match_id = umh.match_id AND ps.id=rf.processing_status),
                                    'unknown') AS processing_status, 
                    COALESCE( (SELECT mrs.label FROM MatchRetrievalStatuses mrs, MatchRetrievalRequests mrr where mrr.id = umh.match_id AND mrs.id=mrr.retrieval_status),
                           'unknown') AS retrieval_status, 
           COALESCE( (SELECT ps.data FROM PlayerStats ps WHERE umh.match_id = ps.match_id AND ps.steam_identifier = u.steam_identifier),
             'null'::json) AS player_stats, 
        COALESCE( (SELECT ms.data FROM MatchStats ms WHERE umh.match_id = ms.id ),
                      'null'::json) AS match_stats, 
         COALESCE( (SELECT r.data FROM Results r WHERE umh.match_id = r.match_id AND r.steam_identifier = u.steam_identifier),
                    'null'::json) AS score_data, 
        COALESCE( (SELECT md.data FROM MatchDetails md WHERE umh.match_id = md.matchid),
      'null'::json) AS match_details 
 FROM Users u, UserMatchHistory umh 
 WHERE u.id = 1 
 AND u.id = umh.user_id 
ORDER BY umh.match_id DESC 
) md;

select count(*), json_agg(processing_status), upload_filename from replayfiles group by upload_filename having count(*)>1;

delete from replayfiles where id in  (select distinct rf1.id from replayfiles rf1, replayfiles rf2 where rf1.upload_filename=rf2.upload_filename and rf1.id <> rf2.id and not exists (Select id from matches where replayfile_id=rf1.id));

wisdota-bot@tembryo.com
insert into steamaccounts(name, password) values ('wisdota_bot_59', 'crawley-the-bot-59');

  insert into jobs (started, data) (SELECT NOW(), ('{"message":"Download", "id":'||id||'}')::json FROM Matchretrievalrequests where retrieval_status=13);

  insert into jobs (started, data) (SELECT NOW(), ('{"message":"Analyse", "id":'||id||'}')::json FROM Replayfiles where processing_status=5);

insert into jobs (started, data) (SELECT NOW(), ('{"message":"Retrieve", "id":'||id||'}')::json FROM Matchretrievalrequests where retrieval_status=5);

insert into jobs (started, data) values (now(), '{"message":"Analyse", "id":"60168","machine":1}');

insert into jobs (started, data) (select now(), data from jobs where result->>'result'='failed' and data->>'message'='Analyse' AND id>  311000  order by started desc);

select * from logentries where filters->>'machine'='2' AND filters->>'module'='analysis-server' order by id desc limit 1000;

insert into jobs (started, data) VALUES (NOW(),'{"message":"Analyse", "id": 1702}');
insert into jobs (started, data) VALUES ( NOW(), '{"message":"Download", "id":2513321466}'::json);

  SELECT (SELECT COUNT(*) FROM UserMatchHistory umh WHERE umh.user_id=mrr.requester_id AND umh.match_id > mrr.id) as n_newer_matches FROM ReplayFiles rf, MatchRetrievalRequests mrr WHERE rf.id=60170 AND mrr.id=rf.upload_filename::bigint AND mrr.requester_id IS NOT NULL;

select analysis_version, count(*) from matches group by analysis_version;

insert into jobs (started, data) (SELECT NOW(), ('{"message":"Analyse", "id":'||replayfile_id||'}')::json FROM Matches where analysis_version <> '18/06/16');

select count(*), n FROM ( select rf.id, (select count(*) from matchdetails md where md.matchid=rf.match_id) as n from replayfiles rf) detailsperreplay group by n;

insert into jobs (started, data) (SELECT NOW(), ('{"message":"Score", "id":'||id||'}')::json FROM Matches where analysis_version='18/06/16');