FROM node:6.10.1-slim
MAINTAINER Micooz<micooz@hotmail.com>

# environment varibles
ENV NODE_ENV production

# install pwgen
RUN apt-get update
RUN apt-get install --yes pwgen

# install blinksocks
RUN npm install --global blinksocks pm2

# expose ports
EXPOSE 1080

# run
RUN mkdir -p /blinksocks

COPY blinksocks.config.json /blinksocks/blinksocks.config.json
COPY pm2.config.json /blinksocks/pm2.config.json
COPY start.sh /start.sh

RUN chmod 755 /start.sh
CMD /start.sh
