#!/bin/sh
mvn package
cp target/dotaReplayProcessor-0.0.1-SNAPSHOT.jar ../web-server/analysis/extractor/extractor.jar
