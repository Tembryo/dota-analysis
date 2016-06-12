WITH SampleBins AS 
(SELECT -LOG(COUNT(*)::float/(SELECT COUNT(*) FROM mmrdata WHERE solo_mmr IS NOT NULL)) as entropy, 
floor(AVG(d.solo_mmr)/$1)*$1 as mmr_bin 
FROM mmrdata d WHERE d.solo_mmr IS NOT NULL GROUP BY floor(d.solo_mmr/$1)*$1) 
SELECT m.matchid, SUM(bin.entropy) AS value 
FROM CrawlingMatches m, CrawlingMatchStatuses s, CrawlingSamples smpl, SampleBins bin 
WHERE smpl.matchid= m.matchid AND s.label='open' AND s.id=m.status AND floor(smpl.solo_mmr/$1)*$1=bin.mmr_bin 
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

update settings set data='{"value": 3}' where name='add_samples_batch_size';

SELECT count(*) FROM JOBS WHERE FINISHED is null;