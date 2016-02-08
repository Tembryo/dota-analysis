var the_stats;

$(document).ready(function(){
    var pathname = "/api/stats?start=0&end=20";

    $.getJSON(pathname, function(data) {
        the_stats = data.filter(
            function(d){return d["score_data"];});
        plot_graph("MMR");
    });

    var width = 810;
    var height = 350;
    var padding = 50;


    var canvas =d3.select("#dashboard")
    .append("svg")
    .attr("width",width)
    .attr("height",height);

    var path = canvas.append("path")
                    .attr("id", "graph")
                    .attr("fill","none")
                    .attr("stroke","black")  
                    .attr("stroke-width",4);


    canvas.append("g")
        .attr("id", "xAxis")
        .attr("transform", "translate(0," + (height-padding) + ")");

    canvas.append("text")
        .attr("class", "x label")
        .attr("text-anchor", "end")
        .attr("x", width-padding/2)
        .attr("y", height - padding-10)
        .text("match nr");

    canvas.append("g")
        .attr("id", "yAxis")
        .attr("transform", "translate(" + padding + ",0)");

    canvas.append("text")
        .attr("class", "y label")
        .attr("id", "y-axis-label")
        .attr("text-anchor", "end")
        .attr("transform", "translate("+(padding+10)+", "+(padding/2)+") rotate(-90)")
        .text("rating");

    function getValue(entry, d)
    {
        switch(entry)
        {
            case "MMR":
                if(d["score_data"])
                    return d["score_data"]["MMR"];
                else
                    return 0;
            case "GPM":
                return d["data"]["GPM"];
            case "Win":
                var indicator = (((d["match_data"]["winner"] === "radiant" && d["data"]["slot"] < 5) || (d["match_data"]["winner"] === "dire" && d["data"]["slot"] >=5 ))
                        ? 1: 0);
                return indicator;
            case "nChecks":
                return d["data"]["n-checks"];
            case "checkDuration":
                return d["data"]["average-check-duration"];
            case "lasthits":
                return d["data"]["lasthits"];
            default:
                return 0;
        }
    }

    function plot_graph(entry)
    {
        var horizontal_scale = d3.scale.linear()
                                .domain([1,the_stats.length])
                                .range([padding,width-padding]);


        var value_min = d3.min(the_stats,function(d){return getValue(entry, d);});
        var value_max = d3.max(the_stats,function(d){return getValue(entry, d);});
        var value_padding = (value_max - value_min)*0.05;

        var vertical_scale = d3.scale.linear()
                                .domain([value_min-value_padding,value_max+value_padding])
                                .range([height-padding,padding]);

        var line =d3.svg.line()
                    .x(
                        function(d,i)
                        {
                                return horizontal_scale(i+1);
                        }
                    )
                    .y(
                        function(d)
                        {
                            return vertical_scale(getValue(entry, d));
                        }
                    )
                    .interpolate("linear");

        var mypath = d3.select("#graph");

        mypath.attr("d",line(the_stats));

        var xAxis = d3.svg.axis()
                        .scale(horizontal_scale)
                        .orient("bottom");

        var yAxis = d3.svg.axis()
                        .scale(vertical_scale)
                        .orient("left");

        canvas.select("#xAxis")
            .call(xAxis);
        
        canvas.select("#yAxis")
            .transition().duration(500).ease("sin-in-out")
            .call(yAxis);

        canvas.select("#y-axis-label")
            .text(entry);
    }

    $("#last-hits-button").click(function(){
        plot_graph("GPM");
    });

    $("#mmr-button").click(function(){
     plot_graph("MMR");
 });

    $("#fights-button").click(function(){
     plot_graph("nChecks");
 });

    $("#objectives-button").click(function(){
     plot_graph("checkDuration");
 });

    $("#movement-button").click(function(){
     plot_graph("lasthits");
 });

    $("#nom-button").click(function(){
     plot_graph("Win");
 });




});
