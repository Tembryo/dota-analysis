FROM node:5

# make the src folder available in the docker image
ADD src/ /src
WORKDIR /src

# install the dependencies from the package.json file
RUN npm install

# expose port of the server
EXPOSE 42000

# start node with the index.js file of our hello-world application
CMD ["node", "server.js"]
