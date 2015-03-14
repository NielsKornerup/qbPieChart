var pg = require('pg');
var express = require('express');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var path = require('path');
var schedule = require('node-schedule');
var Client = require('pg-native');
var sha1 = require("sha1");
var client = new Client();
client.connectSync(process.env.DATABASE_URL+'?ssl=true');

app.use(express.logger())
.use(express.static(__dirname))
.use(express.urlencoded())
.use(express.json())
.use(express.cookieParser())
.use(express.session({
secret: "mozillapersona"
}));

var j = schedule.scheduleJob('* * * * *', function(){
	var buzzes=client.querySync("SELECT * FROM buzz");
	for (i = 0; i < buzzes.length; i++){
		var str = "";
		var str2 = "";
		var count = true;
		if(buzzes[i].early&&buzzes[i].correct){
			str = "powers";
			str2 = "gets, negs";
		}
		else if(buzzes[i].correct){
			str = "gets";
			str2 = "powers, negs";
		}
		else if(!buzzes[i].correct&&buzzes[i].interrupt){
			str = "negs";
			str2 = "gets, powers";
		}
		else if(!buzzes[i].correct&&!buzzes[i].interrupt){
			str = "negs";
			str2 = "gets, powers";
			count = false;
		}
		else{
			console.log("correct: " + buzzes[i].correct +", interrupt: " + buzzes[i].interrupt + ", early: " + buzzes[i].early);
		}
		if(count){
			var data = client.querySync("SELECT * FROM users WHERE name ='"+buzzes[i].user+"' AND subject ='"+buzzes[i].category+"'");
			if(data.length == 0){
				client.querySync("INSERT INTO users (name, subject, "+str+", "+str2+") VALUES ('"+buzzes[i].user+"', '"+buzzes[i].category+"', "+1+", 0, 0)");
			}

			else{
				var val = 0;
				if(str=="powers"){
					val = parseInt(data[0].powers);
				}
				else if(str=="gets"){
					val = parseInt(data[0].gets);
				}
				else{
					val = parseInt(data[0].negs);
				}
				val++;
				client.querySync("UPDATE users SET "+str+"="+val+" WHERE name = '"+buzzes[i].user+"' AND subject ='"+buzzes[i].category+"'");
			}
		}
	}
	client.querySync("DELETE FROM buzz;");	
});

require("express-persona")(app, {
  audience: "protobowl.herokuapp.com"
});

app.get('/', function(req, res){
	var options = {
		root: __dirname + '/',
	}
	res.sendFile('./index.html', options);
});

io.on('connection', function(io){
	io.on('getData', function(user){
		var result = client.querySync("SELECT * FROM users WHERE name ='"+sha1(user)+"'");
		io.emit('queryFor' + user, result);
	});
});
var port = process.env.PORT||5000;
http.listen(port, function(){
	console.log('listening on :' + port);
});
