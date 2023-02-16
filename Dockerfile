FROM ubuntu:latest

# NOTE: Am hardcoding the serial port. This means that the pulser will have to be the very first device plugged in.
# Don't funk with the internet port and baud rate. The internet port is consistent with the docker-compose file and
# the baud rate is fixed for the pulser.
ENV serial_port=/dev/ttyUSB0
ENV internet_port=9002
ENV baud_rate=9600

RUN apt-get update -y && apt-get install -y \
    git \
    nodejs \
    npm \
    sudo

RUN git clone http://github.com/steingartlab/nodeforwarder
WORKDIR nodeforwarder/
RUN npm install

ENTRYPOINT ["bash"]
CMD ["start.sh", "-i", "$internet_port", "-s", "$serial_port", "-b", "$baud_rate"]