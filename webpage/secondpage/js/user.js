$(document).ready(function(){

var data =[{date:10,MMR:6200,LH:5100},{date:20,MMR:6275,LH:3150},{date:30,MMR:6250,LH:2900},{date:40,MMR:6300,LH:2925},{date:50,MMR:6325,LH:2850},{date:60,MMR:6400,LH:2775},{date:70,MMR:6475,LH:2750},{date:80,MMR:6425,LH:2700},{date:90,MMR:6450,LH:2700},{date:100,MMR:6475,LH:2700}];

var width = 800;
var height = 500;
var padding = 50;


var canvas =d3.select("#dashboard")
            .append("svg")
            .attr("width",width)
            .attr("height",height);

var group = canvas.append("g")


function plot_graph(var1,var2){

    var var1_max = find_max(data,var1);
    var var1_min = find_min(data,var1);

    var var2_max = find_max(data,var2);
    var var2_min = find_min(data,var2);

    var horizontal_scale = var1_scale(var1_min,var1_max,width,padding);
    var vertical_scale = var2_scale(var2_min,var2_max,height,padding);

    var line =d3.svg.line()
                .x(function(d){return horizontal_scale(d[var1]);})
                .y(function(d){return vertical_scale(d[var2]);});

    var mypath = group.selectAll("path")
                 .data([data]);

   mypath.enter()
   .append("path")
   .attr("fill","none")
   .attr("stroke","black")  
   .attr("stroke-width",6);

   mypath
      .attr("d",line);

  var xAxis = d3.svg.axis()
                  .scale(horizontal_scale)
                  .orient("bottom");

  var yAxis = d3.svg.axis()
                  .scale(vertical_scale)
                  .orient("left");

  canvas.append("g")
  .attr("transform", "translate(0," + (height-padding) + ")")
    .call(xAxis);

  canvas.append("g")
    .attr("transform", "translate(" + padding + ",0)")
    .call(yAxis);

}

function find_max(data,value){
    var max_val = d3.max(data,function(d){return d[value]});
    return max_val;
}

function find_min(data,value){
    var max_val = d3.min(data,function(d){return d[value]});
    return max_val;
}


function var1_scale(var1_min,var1_max,width,padding){
  return d3.scale.linear()
                  .domain([var1_min,var1_max])
                    .range([padding,width-padding]);
}

function var2_scale(var2_min,var2_max,height,padding){
  return d3.scale.linear()
                  .domain([var2_min,var2_max])
                  .range([height-padding,padding]);
}


plot_graph("date","MMR");


    $("#last-hits-button").click(function(){
    	 plot_graph("date","LH");
    });

    $("#mmr-button").click(function(){
       plot_graph("date","MMR");
    });

    $("#fights-button").click(function(){
       plot_graph("date","LH");
    });

    $("#objectives-button").click(function(){
       plot_graph("date","MMR");
    });

    $("#movement-button").click(function(){
       plot_graph("date","LH");
    });

    $("#nom-button").click(function(){
       plot_graph("date","MMR");
    });




});
