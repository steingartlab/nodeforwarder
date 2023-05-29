# Node Forwarder
_A simple serialport to RESTful interface._

## Overview
Serial ports, bless their robust and simple yet legacy bound hearts, are one to one. Once a program connects to a serial port, without 1337 skills, only one program can attach to it.  This is not inherently good nor bad, it just is. 

For debugging hardware, and for having a second input for control loops, making the serial port one-to-many is useful. So let's go.

`nodeforwarder` connects to your serialport to an http port of your specification, and allows you to read from the serial by points your browser (or better yet cURL like function) to

`http://localhost:PORT/read/`

and you can write by going to 

`http://localhost:PORT/write/YOUR STRING HERE`

or

`http://localhost:PORT/writecf/YOUR STRING HERE`

if you want to append a `\r\n`.

Of course, if your computadora is attached to the interwebs, your ports will be accessible to anyone that your firewall allows via `http://YOUR_IP_OR_WHATEVERDOTCOM:PORT/`

This is also not inherently good or bad, it just is $\longrightarrow$ Make sure that the computer running `nodeforwarder` is on `zerotier` to prevent unwanted traffic.

## Run using Docker

Nodeforwarder can be run locally, see the end of this README for instructions. However, for our applications we typically use it in conjuction with other software, e.g. pithy and picoscopes. Orchestrating these should be done using Docker. To build the Docker image, run from the repo's root folder:

`docker build . -t YOUR_TAG` (ours is `steingartlab/easi:nodeforwarder`)

and then using `docker-compose`

`docker-compose up -d`

(again, in the same folder as the `.yaml` file) where the `docker-compose.yaml` file looks something like this

```
version: "3"
services:
  pulser:
    container_name: pulser
    image: steingartlab/easi:nodeforwarder
    ports:
      - 9002:9002
    environment:
      - serial_port=/dev/ttyUSB0
      - internet_port=9002
      - baud_rate=9600
    volumes:
      - /dev/:/dev/
      - nodeforwarder:/nodeforwarder/
    privileged: true
    tty: true
    networks:
      acoustics-network:
        ipv4_address: 192.168.0.20

volumes:
  docker.sock:
  nodeforwarder:
networks:
  acoustics-network:
    ipam:
      config:
        - subnet: 192.168.0.0/24
```

with other images can be added as needed.

## Using the Nodeforwarder

Let's say you chose an `iPORT` of 9000.  On the computer where you started the forwarder you can browse to that page via 

`http://localhost:9000`.  

You should see a basic console. 

To write data to the serial port simply, in the browser url, type

`http://localhost:9000/write/FOOBAR` 

and `FOOBAR` will be sent to the serial device.  

If you need to send a `\n` with string use

`http://localhost:9000/writecf/FOOBAR` 

To read what comes back, type

`http://localhost:9000/read` and the current buffer contents will display in the browser.

## Get URLS
- `/write/[PAYLOAD]`
  - Writes PAYLOAD to the serialport.  Tries hard to handle what it can, but it's just a url so....
- `/writecf/[PAYLOAD]`
  - Writes PAYLOAD with an appended '\r\n' to the serial port
- `/read`
  - returns the current _entire_ buffer from the serial port.  You'll want to parse it out 
- `/lastread`
  - returns the last time the nodeforwarder received data from the serialport, in unixtime (ms).
- `/flusbuffer`
  - Clears the buffer

## Post URLS
- `/write`
    - You can use whatever you like here and we'll do our best to get the message _exactly_ as formatted to the device. Want to use ArduinoJson? You can!
 
```bash  
curl -s -H 'Content-Type: application/json' -X POST -d '{"payload":"love_is_love"}' \ 
http://HOST:PORT/write/
```

## socket.io
If you want to digest the data as it's coming through the serial port without polling per above, you can use socket.io directly in your language of choice. Example below in python

```python
import socketio

sio = socketio.Client()

@sio.event
def connect():
    print('connection established')

@sio.event
def my_message(data):
    print('message received with ', data)
    #sio.emit('my response', {'response': 'my response'})

@sio.on('data')
def data(data):
    print(data,end="")
    #sio.emit('my response', {'response': 'my response'})

@sio.event
def disconnect():
    print('disconnected from server')

sio.connect('http://localhost:9000')
sio.wait()

```

## Use in a scripting language

Now that the forwarder is set up and you know it's working per above, you can use it in whatever language you want so long as that language can deal with opening and reading from URLs (they _all_ can).  In python this looks like

```python
from requests import urlopen as uo

import requests as r
from time import time, sleep


out = {}
data = {'res1':22000}
out = {'payload'=data}
r.post("http://localhost:9000/write",data=out) 


out = {}
data = {}
data['mode'] = "manual"
data['dac0'] = 3000
data['dac1'] = 1000
out = {'payload'=data}

r.post("http://localhost:9000/write",data=out) 
## your code here
```

## Quick Run - Local (depreciated)

In the directory where you placed the files run

on first run npm i
then and thereafter node nodeforwader.js iPORT pPORT SERIALSPEED BUFF

where
 - `iPORT` = the internet port (e.g. localhost:8000 would be 8000).  
     - You can make this whatever you want, just make sure there's nothing else trying to run at that port (e.g. pithy, or another forwarder).  If you try to start a forwarder where there's a port in use you'll just get an error, so try another port.  Generally, ports under `1000` are reserved for system use, you can start those but probably have to sudo your way in.  If you don't know what that means don't worry about it
    
- `pPORT` = the location of the serial port.  
   - on a linux box this looks like `/dev/ttyUSB*`, where the * is a number in the order the devices were plugged in currently.
   - on a mac this looks like `/dev/tty.usb*` is typically a generated string depending on _what_ USB port you plugged into.  Note that it may not look like `/dev/tty.usb*`, but use your ~Princeton~ Columbia brain and play with the problem.
   - on a Windows box this will be `COMX`, where X is again the order the device was plugged in on that computer.  Note that this is _persistent_, so if something is `COM4` it is always `COM4` 

- `SERIALSPEED` = the baud rate for the device on the serial port.  
   - If you coded it yourself in arduino, it's the same as `Serial.begin(SERIALSPEED)`, otherwise it's either settable according to the manufacturer's instructions or fixed.  Good guesses are already `9600` or `57600`.


phew.  not so quick.  but all you have to write is something like this

`node nodeforwader.js 9000 /dev/ttyUSB0 57600`



## Required Libraries
Just `npm i`, but FYI
- serialport -> `npm install serialport`
- express -> `npm install express`
- sleep -> `npm install sleep`
- socket.io -> `npm install socket.io`
- cors -> `npm install cors`
- body-parser -> `npm install body-parser`



## Updates

- 2023-05-29
  - Steingartlab/Gunnar's fork diverging subtly in usage and behavior
    - Buffer length is hardcoded
    - `flushbuffer` added
    - Docker instructions added

- 2021-12-27
  - `POST` calls now behaving (I hope)
  - Update README

- 2021-10-17
  - Improved display in `readout.html`
  - Update README

- 2021-10-16 
  - Updated to work with Node 16 (some changes to how express and socket.io behave)
  - Console actually works 😅
  - Sorely needed `README` update
