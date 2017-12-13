FROM node:8-slim
MAINTAINER Micooz<micooz@hotmail.com>

# install blinksocks
RUN npm install --global --production blinksocks pm2

# run
RUN mkdir -p /blinksocks

COPY pm2.config.json /blinksocks/pm2.config.json
COPY start.sh /start.sh

RUN chmod 755 /start.sh
CMD /start.sh

# expose ports
EXPOSE 1080
