CREATE TABLE Emails (id bigserial primary key, user_id bigint, email text, verified boolean);

Alter table email add column verified boolean;