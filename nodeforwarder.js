/* 
to start: node nodeforwader.js [HTTP PORT] [SERIAL PORT] [BAUD]

what will probably create farts/list of things to deal with later if I need to:
- returning characters that html has issues with
- spaces in the url

TODO as of 2021-10-16:

[x] Update Parser and buffer handling
[x] POST calls
[x] check working with python-socketio (big yes!)
[ ] Add parsing options to inteface?


*/

// Startup
console.log("Starting up nodeforwarder")
parts = process.argv

if (parts.length < 4) {
	console.log(`Nodeforwarder exited on startup, probably due to incorrect number of arguments passed. \
				 Usage: node nodeforwader.js [HTTP PORT] [SERIAL PORT] [BAUD]`);
	process.exit(1);
}

// Setup parameters
var properties = {
	'http': parts[2],
	'serial': parts[3],
	'baud': parseInt(parts[4]),
}
console.log(properties);
var serialConnection;
const bufferLength = 10000;
var buffer = ""; //On Data fill a circular buffer of the specified length
var lastHeard = 0;

// Setting up server stuff
var bodyParser = require('body-parser');
var app = require('express')();
var fs = require('fs');
var cors = require('cors')
const server = require('http').createServer(app);
var io = require('socket.io')(server, { cors: { methods: ["GET", "POST"] } });
server.listen(properties['http']);

// Establish connection
var SerialPort = require("serialport"); //per ak47 fix
function connect() {
	serialConnection = new SerialPort(properties['serial'], { baudRate: properties['baud'] })
};
connect();  // Initial ocnnection
serialConnection.on("open", function () { console.log('serial port connection open'); });
serialConnection.on("close", function () {
	console.log('closed, reopening');
	connect()
});


serialConnection.on('data', function (data) {

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
	return new Date().toISOString();
}

function send(url, req, res) {
	toSend = req.originalUrl.replace(`/${url}/`, "")
	toSend = decodeURIComponent(toSend);
	toSend += req.originalUrl.includes("/writecf/") ? "\r\n" : "";
	serialConnection.write(toSend);
	res.send(toSend);

	const timestamp = get_timestamp();
	console.log(`${timestamp} sent: ${toSend}`);
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
	serialConnection.write(toSend)
	res.send(toSend)
});


//Show Last Updated
app.get('/lastread/', function (req, res) {
	lastHeard = lastHeard.toString();
	console.log(`lastread ${lastHeard}`)
	res.send(lastHeard)
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
		serialConnection.write(msg + "\r\n")

	});
});
