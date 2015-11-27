FROM node:5

# make the src folder available in the docker image as volume
VOLUME ["/source"]
WORKDIR /source


# install the dependencies from the package.json file
#ADD src/ /src
#WORKDIR /src
#RUN npm install

# expose port of the server
EXPOSE 42000

# start node with the index.js file of our hello-world application
CMD ["node", "server.js"]
