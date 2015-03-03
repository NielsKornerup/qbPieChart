var pg = require('pg');
var express = require('express');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var path = require('path');

app.use(express.logger())
.use(express.static(__dirname))
.use(express.urlencoded())
.use(express.json())
.use(express.cookieParser())
.use(express.session({
secret: "mozillapersona"
}));

require("express-persona")(app, {
  audience: "dry-wildwood-8809.herokuapp.com"
});

app.get('/', function(req, res){
	var options = {
		root: __dirname + '/',
	}
	res.sendFile('./index.html', options);
});

io.on('connection', function(io){
	io.on('getData', function(user){
		pg.connect(process.env.DATABASE_URL+'?ssl=true', function(err, client) {
			client.query("SELECT * FROM users WHERE name ='"+user+"'", function(err, result) {
				if(err) {	
					return console.error('error running query', err);
				}
				io.emit('queryFor' + user, result.rows);
				client.end();
			});
		});
	});
});
var port = process.env.PORT||5000;
http.listen(port, function(){
	console.log('listening on :' + port);
});
