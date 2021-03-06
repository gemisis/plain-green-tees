#!/usr/bin/env node

var http = require('http');
var io = require('socket.io');
var fs = require('fs');
var mysql = require('mysql');

var database = mysql.createConnection({
	host:process.env.OPENSHIFT_MYSQL_DB_HOST || '127.0.0.1',
	user:process.env.OPENSHIFT_MYSQL_DB_USER || 'root',
	password:process.env.OPENSHIFT_MYSQL_DB_PASSWORD || '',
	database:process.env.OPENSHIFT_MYSQL_DB_DB || 'dabase'
});

database.connect(function(err) {
	if(err) console.log(err);
	else console.log('Connected to the database.')
});

var server = http.createServer(function(req,res) {
	var url = req.url == '/' ? 'index.html' : req.url;
	if(url == '/game') {
		url = 'game.html';
	}

	var filesplit = url.split(".");
	filesplit = filesplit[filesplit.length-1];

	var types = {
		'js':'application/javascript',
		'html':'text/html',
		'png':'image/png',
		'jpg':'image/jpeg',
		'jpeg':'image/jpeg',
		'css':'text/css',
		'ico':'image/x-ico',
		'text':'text/plain',
		'gif':'image/gif'
	};

	if(url == '/db_dump') {
		database.query("SELECT * FROM hacku",function(err,rows) {
			res.writeHead(200);
			res.end(JSON.stringify(rows));
		});
	} else if(url.match(/\/apis\/(.*)/gi)) {
		res.writeHead(200);

		var api = url.split("/apis/")[1];
		http.get(api,function(response) {
			var data = '';

			response.on('data',function(chunk) {
				data += chunk;
			});

			response.on('end',function() {
				res.end(data);
			});
		});
	} else {
		fs.readFile(__dirname+'/'+url,function(err,data) {
			if(err) {
				res.writeHead(500);
				return res.end('Error reading index file.');
			}

			res.writeHead(200,{'Content-type':(types[filesplit] || types['text'])});
			res.end(data);
		});
	}
});

if(process.env.OPENSHIFT_NODEJS_PORT) {
	server.listen(process.env.OPENSHIFT_NODEJS_PORT || 8888,process.env.OPENSHIFT_NODEJS_IP || "127.0.0.1");
} else {
	server.listen(8888);
}

var chars = [];
var charDir = {length:0};
var socket = io.listen(server,{log:false}).sockets.on('connection',function(client) {
	client.broadcast.emit('playerData',chars);
	client.emit('welcome',{status:'welcome',data:chars});
	client.on('playerData',function(data) {
		charDir[client.id] = data;
		charDir[client.id].index = charDir.length;
		charDir[client.id].pid = client.id;
		charDir.length++;

		console.log("added char... ");
		console.log(charDir[client.id]);

		chars.push(charDir[client.id]);
		console.log("... "+chars.length+" total");
	});
	client.on('disconnect',function() {
		// var id = client.id;
		// var index = 0;

		// console.log("disconnecting player...");

		// for(var i=0;i<chars.length;i++) {
		// 	if(chars[i].pid == id) index = i;
		// }

		// chars.splice(index,1);
		// client.broadcast.emit('playerDisconnect',charDir[id]);

		// console.log("char removed at index "+index);

		// charDir.length--;
	});
});

