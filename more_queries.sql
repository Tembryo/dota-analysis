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
AND to_timestamp((m.data->>'start_time')::bigint) > current_date - interval '7 days' GROUP BY m.matchid ORDER BY value DESC LIMIT 100)

INSERT INTO matchretrievalrequests(id) (SELECT matchid from Candidates);


INSERT INTO jobs(started, data) VALUES (now(), '{"message":"Retrieve", "id":2418509989}'::json);


INSERT INTO jobs(started, data) VALUES (now(), '{"message":"AddSampleMatches", "n":200}'::json);

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
AND to_timestamp((m.data->>'start_time')::bigint) > current_date - interval '7 days' GROUP BY m.matchid ORDER BY value DESC LIMIT 100;

INSERT INTO jobs(started, data) VALUES (now(), '{"message":"Score", "id":2425170236}'::json);