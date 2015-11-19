FROM ubuntu:14.04
MAINTAINER fischerq.de@gmail.com

RUN \
   apt-key adv --keyserver hkp://keyserver.ubuntu.com:80 --recv 7F0CEB10 && \
   echo "deb http://repo.mongodb.org/apt/ubuntu trusty/mongodb-org/3.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-3.0.list && \
   apt-get update && \
   apt-get install -y mongodb-org

VOLUME ["/data/db"]
WORKDIR /data

EXPOSE 42200

CMD ["mongod", "--port", "42200"]
