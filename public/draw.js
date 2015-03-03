function getChart(user){
var socket = io();
console.log(user);
socket.emit('getData', user);
socket.on('queryFor' + user, function(data){
d3.selectAll("svg").remove();
console.log("test");
if(data.length==0){
	document.getElementById('content').innerHTML="There is currently no buzz data associeated with this user. Please spend some time on protobowl, and come back here to get your results!";
}
else{
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

	var svg = d3.select("body").append("svg")
    .attr("width", width)
    .attr("height", height)
    .append("g")
    .attr("transform", "translate(" + width / 2 + "," + height / 2 + ")");
	svg.call(tip);
	var count = 0;
	var colors = ['#BF3EFF', '#FFCC00', '#49E20E', '#FF3030', '#00CDCD', '#8968CD', '#66CD00', '#FF9900', '#009ACD', '#FF6600'];
	data.forEach(function(d) {
		d.id     =  d.subject;
		d.color  =  colors[count];
		count++;	
		d.points = Math.max(15*+d.powers + 10*+d.gets - 5*+d.negs,0);
		d.accuracy  = (+d.powers + +d.gets)/(+d.powers + +d.gets + +d.negs) * 100;
		d.width  = +d.points;
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
