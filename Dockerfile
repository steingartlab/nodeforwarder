FROM ubuntu:latest

# NOTE: These default values (for pulser) can be overwritten using 'command' in docker-compose.yaml
ENV serial_port=/dev/ttyUSB0
ENV internet_port=9002
ENV baud_rate=9600

RUN apt-get update -y && apt-get install -y \
    git \
    nodejs \
    npm

RUN git clone http://github.com/steingartlab/nodeforwarder
WORKDIR nodeforwarder/
RUN npm install

CMD ["/bin/bash", "-l", "-c", "node nodeforwarder.js $internet_port $serial_port $baud_rate"]

