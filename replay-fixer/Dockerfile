FROM node:5

VOLUME ["/source"]
WORKDIR /source

RUN apt-get install bzip2

CMD ["node", "replay-fixer.js"]
