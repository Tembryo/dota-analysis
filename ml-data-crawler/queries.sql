SELECT count(*), floor(mmr/200)*200 as mmrgroup from matches, mmrsamples where matches.matchid=mmrsamples.matchid group by mmrgroup ORDER BY mmrgroup DESC;


SELECT count(*), n_samples  FROM (SELECT matches.matchid, count(*) as n_samples FROM Matches, mmrsamples where matches.matchid = mmrsamples.matchid AND  status = 'queued' GROUP BY  matches.matchid ORDER BY Count(*)) as tmp GROUP BY n_samples order by n_samples;

select count(*), status from matches group by status;

SELECT count(*), floor(mmr/500)*500 as mmrgroup from matches, mmrsamples where matches.matchid=mmrsamples.matchid  AND matches.status='queued' group by mmrgroup ORDER BY mmrgroup DESC;


SELECT count(*), floor(mmr/500)*500 as mmrgroup from matches, mmrsamples where matches.matchid=mmrsamples.matchid  AND matches.status='processed' group by mmrgroup ORDER BY mmrgroup DESC;
