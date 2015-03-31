function del(subject, user){
	var socket = io();
	console.log("testing");
	if(confirm('Are you sure that you would like to reset your score in this subject? This change cannot be undone.')){
		socket.emit('delete data', user, subject);
	}
}

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

function getChart(user){
var socket = io();
socket.emit('getData', user);
socket.on('queryFor' + user, function(data){
$('#settings').html("<br><div class='row'><div class='col-md-2'> Username </div><input type='text' class='form-control col-md-3 col-md-offset-1' id='username' placeholder='"+data[0].username+"' style='width:35%'></div>");
d3.selectAll("svg").remove();
if(data.length==0){
	document.getElementById('content').innerHTML="There is currently no buzz data associeated with this user. Please spend some time on protobowl, and come back here to get your results!";
}
else{
	document.getElementById('content').innerHTML="";
	document.getElementById('playername').innerHTML=data[0].username;
	var width = 400,
	height = 400,
	radius = Math.min(width, height) / 2,
	innerRadius = 0.3 * radius;

	var pie = d3.layout.pie().sort(null).value(function(d) { return d.width; });
	var tip = d3.tip().attr('class', 'd3-tip').offset([0, 0]).html(function(d) {
		return d.data.id + ": <span style='color:"+d.data.color+"'>" + d.data.points + "</span> points";
	});
	var arc = d3.svg.arc().innerRadius(innerRadius).outerRadius(function (d) { 
		return (radius - innerRadius) * (d.data.accuracy / 100.0) + innerRadius; 
	});

	var outlineArc = d3.svg.arc().innerRadius(innerRadius).outerRadius(radius);

	var svg = d3.select("#chart").append("svg")
    .attr("width", width)
    .attr("height", height)
    .append("g")
    .attr("transform", "translate(" + width / 2 + "," + height / 2 + ")");
	svg.call(tip);
	var count = 0;
	var colors = ['#BF3EFF', '#FFCC00', '#49E20E', '#FF3030', '#00CDCD', '#8968CD', '#66CD00', '#FF9900', '#009ACD', '#FF6600'];
	data.forEach(function(d) {
		d.id     =  d.subject;
		if(d.color==null){
			d.color  =  colors[count%colors.length];
		}
		else{
			d.color = d.color;
		}
		count++;	
		d.points = Math.max(15*+d.powers + 10*+d.gets - 5*+d.negs,0);
		d.accuracy  = (+d.powers + +d.gets)/(+d.powers + +d.gets + +d.negs) * 100;
		d.width  = +d.points;
		$('#settings').append("<br><div class='row'><div class='col-md-2'>" +d.subject+"'s color </div><input type='text' class='form-control col-md-3 col-md-offset-1' id='"+d.subject.replace(/ /g,'')+"' placeholder='"+d.color+"' style='width:35%'><input class='btn btn-default col-md-1 col-md-offset-1' type='submit' value='delete' onclick='del(&#39;"+d.subject+"&#39;, &#39;"+user+"&#39;)'></div>");
	});

	$('#settings').append('<br><div style="text-align:left"><button type="button" class="btn btn-default" id="submit">Submit</button></div>');
	
	$("#submit").click( function(){
		var newSettings= new Object();
		if($("#username").val()!=""&&isName($("#username").val())){
			newSettings.username=$("#username").val();
		}
		else if(!isName($("#username").val())){
			alert("please only use letters, numbers, and whitespaces for your username");
		}
		newSettings.newSubjects = [];
		newSettings.newColors = [];
		var goodColors=true;
		data.forEach(function(d) {
			if($("#"+d.subject.replace(/ /g,'')).val()!=""){
				if(isColor($("#"+d.subject.replace(/ /g,'')).val())){
					newSettings.newSubjects.push(d.subject);
					newSettings.newColors.push($("#"+d.subject.replace(/ /g,'')).val());
				}
				else{
					goodColors=false;
					return;
				}
			}
		});
		if(!goodColors){
			alert("please pick hex colors");
		}
		else{
			socket.emit("change settings", user, newSettings);
		}
	});

	var path = svg.selectAll(".solidArc").data(pie(data)).enter().append("path").attr("fill", function(d) { return d.data.color; }).attr("class", "solidArc").attr("d", arc).on('mouseover', tip.show)
      .on('mouseout', tip.hide);

	var outerPath = svg.selectAll(".outlineArc").data(pie(data)).enter().append("path").attr("fill", "none").attr("class", "outlineArc").attr("d", outlineArc);
	var accuracy = data.reduce(function(a, b) { return a + (b.accuracy * b.points); }, 0) / 
	data.reduce(function(a, b) {return a + b.points; }, 0);
	return svg;
}
});

$(window).on('beforeunload', function(){
	socket.close();
});

}
