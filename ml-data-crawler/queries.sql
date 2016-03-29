SELECT count(*), floor(mmr/200)*200 as mmrgroup from matches, mmrsamples where matches.matchid=mmrsamples.matchid group by mmrgroup ORDER BY mmrgroup DESC;


SELECT count(*), n_samples  FROM (SELECT matches.matchid, count(*) as n_samples FROM Matches, mmrsamples where matches.matchid = mmrsamples.matchid AND  status = 'queued' GROUP BY  matches.matchid ORDER BY Count(*)) as tmp GROUP BY n_samples order by n_samples;

select count(*), status from matches group by status;

select count(*), status from matches, mmrsamples where matches.matchid=mmrsamples.matchid group by status;

SELECT count(*), floor(mmr/500)*500 as mmrgroup from matches, mmrsamples where matches.matchid=mmrsamples.matchid  AND matches.status='queued' group by mmrgroup ORDER BY mmrgroup DESC;


SELECT count(*), floor(mmr/500)*500 as mmrgroup from matches, mmrsamples where matches.matchid=mmrsamples.matchid  AND matches.status='processed' group by mmrgroup ORDER BY mmrgroup DESC;




select u.id from users u where not exists(select * from events e where e.event_type=2 and (e.data->>'user')::bigint=u.id) order by u.id;
select u.id from users u where exists(select * from events e where e.event_type=2 and (e.data->>'user')::bigint=u.id) order by u.id;

select u.id from users u where (select count(*) from events e where e.event_type=2 and (e.data->>'user')::bigint=u.id)>1 order by u.id;

insert into events (event_type, time, data) (SELECT 2, TIMESTAMP '2016-02-10 00:00:00', ('{"user":'||u.id||', "fixed":1}')::json FROM Users u where u.id = 453);

with Logins as (select (e.data->>'user')::bigint as id, count(*) n_logins, max(e.time) last_login from events e where e.event_type=2 group by e.data->>'user' order by id )
select u.id from users u, Logins l where u.id=l.id AND l.n_logins > 1 AND l.last_login > (now() - interval '2 days') ;


scp -r fischerq@wisdota.com:/home/fischerq/logins.txt ~/logins2.txt

select count(distinct e.data->>'user') from events e where e.event_type=1 and e.data->>'page' like '/result/%';
