var width = 1100;
var height = 400;
var padding = 50;

var canvas =d3.select("#dashboard")
            .append("svg")
            .attr("width",width)
            .attr("height",height);

var data =[{date:10,MMR:3000},{date:40,MMR:3100},{date:50,MMR:3325},{date:100,MMR:2955},{date:120,MMR:3155},{date:130,MMR:3199},{date:160,MMR:2825}];


var MMR_max = d3.max(data, function(d) {
				 return d.MMR;
				});

var MMR_min = d3.min(data, function(d) {
				 return d.MMR;
				});

var date_max = d3.max(data, function(d) {
				 return d.date;
				});

var date_min = d3.min(data, function(d) {
				 return d.date;
				});

var MMR_scale = d3.scale.linear()
                	.domain([MMR_min,MMR_max])
                    .range([height-padding,padding]);

var time_scale = d3.scale.linear()
                	.domain([date_min,date_max])
                    .range([padding,width-padding]);

var group = canvas.append("g")

var line =d3.svg.line()
          .x(function(d){return time_scale(d.date);})
          .y(function(d){return MMR_scale(d.MMR);});

group.selectAll("path")
   .data([data])
   .enter()
   .append("path")
   .attr("d",line)
   .attr("fill","none")
   .attr("stroke","black")  
   .attr("stroke-width",6);

var xAxis = d3.svg.axis()
                  .scale(time_scale)
                  .orient("bottom");

var yAxis = d3.svg.axis()
                  .scale(MMR_scale)
                  .orient("left")
                  .ticks(5);

canvas.append("g")
	.attr("transform", "translate(0," + (height-padding) + ")")
    .call(xAxis);

canvas.append("g")
    .attr("transform", "translate(" + padding + ",0)")
    .call(yAxis);



