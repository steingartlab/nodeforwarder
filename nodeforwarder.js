/* 
NodeForwader: an serial to http proxy driven by ghetto get calls
requirements 
   -- serialport -> npm install serialport
   -- express -> npm install express
   -- sleep -> npm install sleep
   -- socket.io -> npm install socket.io
   -- cors -> npm install cors

to start: node nodeforwader.js [HTTP PORT] [SERIAL PORT] [BAUD] [BUFFER LENGTH]
to read: http://[yourip]:[spec'd port]/read/  -> returns the last [BUFFER LENGTH] bytes from the serial port as a string
to write: http://[yourip]:[spec'd port]/write/[YOUR STRING HERE]

what will probably create farts/list of things to deal with later if I need to:
- returning characters that html has issues with
- spaces in the url

TODO as of 2021-10-16:

[x] Update Parser and buffer handling
[x] POST calls
[x] check working with python-socketio (big yes!)
[ ] Add parsing options to inteface?


*/


parts = process.argv
console.log("Starting up nodeforwarder")

if (parts.length < 5) {
	console.log("usage: node nodeforwader.js [HTTP PORT] [SERIAL PORT] [BAUD]")
	process.exit(1);
}

else {
	console.log(parts);
	httpPort = parts[2]
	serialPort = parts[3]
	baud = parseInt(parts[4])
}

const bufferLength = 10000;
var buffer = ""; //On Data fill a circular buffer of the specified length
var lastHeard = 0;

var bodyParser = require('body-parser');
var app = require('express')();
var fs = require('fs');
var cors = require('cors')
const server = require('http').createServer(app);
var io = require('socket.io')(server, { cors: { methods: ["GET", "POST"] } });
server.listen(httpPort);


var sleep = require("sleep").sleep
var SerialPort = require("serialport"); //per ak47 fix
var serialPort = new SerialPort(serialPort,
	{
		baudRate: baud
	});


serialPort.on("open", function () {
	console.log('open');

});


serialPort.on("close", function () {
	console.log('closed, reopening');
	var serialPort = new SerialPort(serialPort,
		{
			baudRate: baud
		});

});


serialPort.on('data', function (data) {

	console.log(data.toString('binary'));

	buffer += data.toString('binary')
	lastHeard = new Date().getTime()
	if (buffer.length > bufferLength) buffer = buffer.substr(buffer.length - bufferLength, buffer.length)
	io.emit('data', data.toString('utf8'));

});

//Enable Cross Site Scripting
app.use(cors())

//Allows us to rip out data
app.use(bodyParser.urlencoded({ extended: true })); //post forms
app.use(bodyParser.json()) // json forms (e.g. axios)


function get_timestamp() {
	return new Date().toISOString().slice(0, 19); // Remove milliseconds
}

function send(url, req, res) {
	toSend = req.originalUrl.replace(`/${url}/`, "")
	toSend = decodeURIComponent(toSend);
	toSend += req.originalUrl.includes("/writecf/") ? "\r\n" : "";
	const timestamp = get_timestamp()
	console.log(`${timestamp} sent: ${toSend}`);
	serialPort.write(toSend);
	res.send(toSend);
}


app.get('/write/*', function (req, res) {
	send('write', req, res);
});


app.get('/writecf/*', function (req, res) {
	send('writecf', req, res);
});


//#expects data to be in {'payload':data} format
app.post('/write', function (req, res) {
	x = req.body
	toSend = x['payload']
	console.log(toSend)
	serialPort.write(toSend)
	res.send(toSend)
});


//Show Last Updated
app.get('/lastread/', function (req, res) {
	lhs = lastHeard.toString();
	console.log(`lastread ${lhs}`)
	res.send(lhs)
});


//read buffer
app.get('/read/', function (req, res) {
	res.send(buffer)
});


app.get('/flushbuffer/', function (req, res) {
	// Flush the buffer
	buffer = "";
});


//weak interface
app.get('/', function (req, res) {
	res.sendFile(__dirname + '/readout.html');
});


app.get('/readout/', function (req, res) {
	res.sendFile(__dirname + '/readout.html');
});

//sockets
io.on('connection', function (socket) {
	io.emit('data', buffer)
	socket.on('input', function (msg) {
		//console.log('message: ' + msg);
		serialPort.write(msg + "\r\n")

	});
});
