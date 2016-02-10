DROP TABLE EventProperties;
DROP TABLE EventPropertyNames;

ALTER TABLE Events ADD COLUMN data json;
