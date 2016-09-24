FROM node:latest
MAINTAINER Pranav Jain "pranajain@gmail.com"

# Create app directory
RUN mkdir -p /usr/src/app
WORKDIR /usr/src/app



# Bundle app source
RUN git clone git://github.com/ThePBJain/BarTab-Server.git .

# Install app dependencies
RUN npm install

EXPOSE 8080
CMD [ "npm", "start" ]
