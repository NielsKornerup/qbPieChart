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

function isColor(str){
	var col=true;
	if(str[0]=='#'&&str.length==7){
		for(var i = 1; i<str.length && col; i++){
			if(!((str.charCodeAt(i)>=48 && str.charCodeAt(i)<=57)||(str.charCodeAt(i)>=65 && str.charCodeAt(i)<=70)||(str.charCodeAt(i)>=97 && str.charCodeAt(i)<=102))){
				col=false;
			}
		}
	}
	else{
		return false;
	}
	return col;
}

function isName(str){
	var good=true;
	for(var i = 0; i<str.length && good; i++){
		if(!((str.charCodeAt(i)>=48 && str.charCodeAt(i)<=57)||(str.charCodeAt(i)>=65 && str.charCodeAt(i)<=90)||(str.charCodeAt(i)>=97 && str.charCodeAt(i)<=122)||str.charCodeAt(i)==32)){
			good=false;
		}
	}
	return good;
}

function updateUsers(){
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
			if(isName(buzzes[i].name)){
				client.querySync("UPDATE users SET username ='"+buzzes[i].name+"' WHERE name = '"+buzzes[i].user+"'");
			}
		}
	}
	client.querySync("DELETE FROM buzz;");	
}

require("express-persona")(app, {
  audience: "localhost:5000"
});

io.on('connection', function(io){
	io.on('getData', function(user){
		console.log("user is " + user);
		var result = client.querySync("SELECT * FROM users WHERE name ='"+sha1(user)+"' ORDER BY subject");
		io.emit('queryFor' + user, result);
		updateUsers();
	});
	io.on('deleteData', function(user, subject){
		client.querySync("DELETE FROM users WHERE name ='"+sha1(user)+"' AND subject='"+subject+"'");
		var result = client.querySync("SELECT * FROM users WHERE name ='"+sha1(user)+"' ORDER BY subject");
		io.emit('queryFor' + user, result);
	});
	io.on('changeSettings', function(user, changes){
		if(changes.username!=null&&isName(changes.username)){
			client.querySync("UPDATE users SET username='"+changes.username+"' WHERE name='"+sha1(user)+"';");
		}
		for(var i = 0; i < changes.newSubjects.length; i++){
			if(isColor(changes.newColors[i])&&isName(changes.newSubjects[i])){
				client.querySync("UPDATE users SET color='"+changes.newColors[i]+"' WHERE name='"+sha1(user)+"' AND subject='"+changes.newSubjects[i]+"';");
			}
		}
		var result = client.querySync("SELECT * FROM users WHERE name ='"+sha1(user)+"' ORDER BY subject");
		io.emit('queryFor' + user, result);
	});
});
var port = process.env.PORT||5000;
http.listen(port, function(){
	console.log('listening on :' + port);
});
