var indx = 0;
var numMatchesDisplayed = 20;
var load_offset = 0
var load_num = 30;

function reloadMatches(callback)
{
    d3.json("/api/get-player-matches?start="+load_offset+"&end="+(load_offset+load_num), callback);
}

var boxSize = 275;   // size of the SVG container
var polyScale = 0.6;  // size of polygon as proportion of SVG container
var textPaddingScale = 0.12; // padding for text around polygon
var alpha = 0.1;
var maxMMR = 8000;
var textFont = "helvetica";

// variables for userSkills

var icon_size = 32;

var height = 120;
var width = 300;
var xOffsetText = 0;
var yOffsetText = height*0.1;
var yOffsetSkills = height*0.2;   
var textTranslateString = "translate(" + xOffsetText.toString() + "," + yOffsetText.toString()+ ")";
var barHeight = 20;
var textWidth = 140;
var barWidth = 120;

var graph_width = 800;
var graph_height = 360;
var graph_padding = 40;

var selected_match = null;
var selected_match_data = null;
var selected_skill = null;

var xOffset = boxSize/2;
var yOffset = boxSize/2;
var radius = polyScale*boxSize/2;
var textPadding = textPaddingScale*boxSize/2;
var thetaOffset = Math.PI/2;

// make a linear scale mapping MMR to pixel scale of polygon
var polygon_range_stepping = 500;
var polygon_scale = d3.scale.linear()
              .domain([0,maxMMR])
              .range([0,radius]);

var color = d3.scale.linear()
                .domain([0,100])
                .range(["#a50026","#d73027","#f46d43","#fdae61","#fee08b","#ffffbf","#d9ef8b","#a6d96a","#66bd63","#1a9850","#006837"]);

var barScale = d3.scale.linear()
                     .domain([0,100])
                     .range([0,barWidth]);

var data = null;
var average =  null;

function formatIMR(value)
{
    return Math.floor(value/10)*10;
}

function initPage()
{
    createPolygonBase();
    createLegend();
    createRatingDivs();
    createTimeline();
}

function createPolygonBase()
{
    // make SVG container
    var canvas = d3.select("#polygon-canvas")
                    .attr("height",boxSize)
                    .attr("width",boxSize);

    // make an array of [x,y] vectors that point towards nodes of polygon
    var incr = 2*Math.PI/ratings.length;
    var vectorArray = [];  
    for (i=0; i < ratings.length; i++){
        var x = Math.cos(i*incr - thetaOffset);
        var y = Math.sin(i*incr - thetaOffset);
        vectorArray.push([x,y]);
    }

    // string to translate objects to the middle of the SVG canvas
    var translateString = "translate(" + xOffset.toString() + "," + yOffset.toString()+ ")";

    // make outer polygon
    var outerPolygon = canvas.append("polygon")
                        .attr("points",genPointString(vectorArray,radius))
                        .attr("fill","none")
                        .attr("stroke","black")
                        .attr("stroke-width",1)
                        .attr("transform",translateString);
                        
    // make inner polygon that is alpha times the size of the outer polygon
    var innerPolygon = canvas.append("polygon")
                        .attr("points",genPointString(vectorArray,alpha*radius))
                        .attr("fill","black")
                        .attr("stroke","black")
                        .attr("transform",translateString);

    // loop over points on polygon drawing lines, adding text 
    for (i=0; i<ratings.length; i++){
        var line = canvas.append("line")
                    .attr("x1",0)
                    .attr("y1",0)
                    .attr("x2",function(){return radius*vectorArray[i][0];})
                    .attr("y2",function(){return radius*vectorArray[i][1];})
                    .attr("stroke","black")
                    .attr("stroke-width",1)
                    .attr("width",5)
                    .attr("transform",translateString);

        var text = canvas.append("text")
                    .attr("x",function(){return (textPadding*(1+Math.abs(Math.sin(incr*i)))+radius)*vectorArray[i][0];})
                    .attr("y",function(){return (textPadding*(1+Math.abs(Math.sin(incr*i)))+radius)*vectorArray[i][1];})
                    .text(ratings[i]["label"])
                    .attr("text-anchor","middle")
                    .attr("font-family",textFont)
                    .attr("transform",translateString);

    }
}

function createLegend()
{
    var legend_container = d3.select("#legend-container");
    
    var row_1 = legend_container.append("div")
                        .attr("class", "row")
    
    row_1.append("div")
        .attr("class", "col-xs-6 col-xs-offset-2")
            .append("span")
            .attr("class", "skill-name")
            .text("Match value");

    var bar_container_1  = row_1.append("div")
                                .attr("class", "col-xs-2")
                                    .append("div")
                                    .attr("style", "width: 120px;")
                                    .attr("class", "skill-bar");

    bar_container_1.append("div")
        .attr("class", "skill-bar-value")
        .attr("style", "width:100%");

    var row_2 = legend_container.append("div")
                .attr("class", "row")
    
    row_2.append("div")
        .attr("class", "col-xs-6 col-xs-offset-2")
            .append("span")
            .attr("class", "skill-name")
            .text("Average over last games");

    var bar_container_2  = row_2.append("div")
                                .attr("class", "col-xs-2")
                                    .append("div")
                                    .attr("style", "width: 120px;")
                                    .attr("class", "skill-bar");

    bar_container_2.append("div")
        .attr("class", "skill-bar-average")
        .attr("style", "width:100%");

}

function createTimeline()
{
    var canvas = d3.select("#timeline-container")
            .append("svg")
                .attr("id","timeline-canvas")
                .attr("viewBox", "-30 0 "+(graph_width+20)+" "+graph_height);

    canvas.append("path")
        .attr("id", "graph")
        .attr("fill","none")
        .attr("stroke","black")  
        .attr("stroke-width",5);

    canvas.append("g")
        .attr("id", "xAxis")
        .attr("transform", "translate(0," + (graph_height-graph_padding) + ")");

    canvas.append("text")
        .attr("class", "x label")
        .attr("text-anchor", "end")
        .attr("x", graph_width-graph_padding/2)
        .attr("y", graph_height - graph_padding-10)
        .text("latest match");

    canvas.append("g")
        .attr("id", "yAxis")
        .attr("transform", "translate(" + graph_padding + ",0)");

    canvas.append("text")
        .attr("class", "y label")
        .attr("id", "y-axis-label")
        .attr("text-anchor", "start")
        .attr("transform", "translate("+(graph_padding/2)+", "+(graph_padding-10)+")")
        .text("rating");

    var backwards = document.createElement("a");
    $(backwards).attr("class","glyphicon glyphicon-chevron-left")
                .attr("id","scroll-left")
                .css("color","black")
                .css("font-size","20px");

    var forwards = document.createElement("a");
    $(forwards).attr("class","glyphicon glyphicon-chevron-right")
            .attr("id","scroll-right")
            .css("color","black")
            .css("font-size","20px");



    var loadTwenty = document.createElement("a");
    $(loadTwenty).attr("class","btn btn-primary btn-sm")
                .attr("id","load-twenty")
                .css("margin","5px")
                .text("20");

    var loadFifty = document.createElement("a");
    $(loadFifty).attr("class","btn btn-primary btn-sm")
                .attr("id","load-fifty")
                .css("margin","5px")
                .text("50");

    $("#timeline-container").append(backwards);

    $("#timeline-container").append(loadTwenty);
    $("#timeline-container").append(loadFifty);

    $("#timeline-container").append(forwards);
    

    $("#scroll-left").click(function(){
        indx += 1;
        if(numMatchesDisplayed+indx > load_num)
        {
            load_offset = load_offset+indx;
            reloadMatches(
            function(data){
                indx = 0;
                load(data);
            } );
        }
        else
        {
            renderTimeline();
        }
    });


    $("#scroll-right").click(function(){
        indx -= 1;
        if(indx < 0)
        {
            if(load_offset > 0)
            {
                load_offset = Math.max(0, load_offset-(load_num - numMatchesDisplayed));
                reloadMatches(
                    function(data)
                    {
                        indx = load_num- numMatchesDisplayed;
                        load(data);
                    } );
            }
            else
                //ignore
                indx = 0;
        }
        else
        {
            renderTimeline();
        }
    });

    $("#load-twenty").click(function(){
        if(numMatchesDisplayed != 20)
        {
            load_num = 30;
            reloadMatches (
                function(data)
                {
                    numMatchesDisplayed = 20;
                    icon_size = 32;
                    load(data);
                } );
        }
    });

    $("#load-fifty").click(function(){
        if(numMatchesDisplayed != 50)
        {
            load_num = 70;
            reloadMatches(
                function(data)
                {
                    numMatchesDisplayed = 50;
                    icon_size = 24;
                    load(data);
                } );
        }
    });
}

function createRatingDivs(){
    for (i=0; i<ratings.length; i++){

    var div = d3.select("#skills-container").append("div")
                    .attr("class","col-md-6 text-center");

    div.append("div")
        .attr("class","row")
            .append("h3")
            .text(ratings[i]["label"]);

    var table_id = "rating-table-" + i.toString();
    var table =  div.append("div")
                    .attr("class","row")
                        .append("div")
                        .attr("class", "col-xs-12 text-center");

    var header  = table.append("div")
                    .attr("class","row");
    header
        .append("div")
        .attr("class", "col-xs-7")
        .text("Skill");
    header
        .append("div")
        .attr("class", "col-xs-5")
        .text("Rating");      

    table.append("div")
        .attr("class","row")
            .append("div")
            .attr("class", "col-xs-12 text-center")
            .attr("id",table_id);
    }
}

//given an array of vectors and a radius, make a string of points to pass to SVG to make a polygon
function genPointString(vectorArray,radius){
    var pointString = "";
    for (i=0; i < vectorArray.length; i++){
        pointString = pointString + " " + (radius*vectorArray[i][0]).toString() +"," + (radius*vectorArray[i][1]).toString();
    }
    return pointString
}

var reload_interval = 60*1000;

function load(new_data)
{
    data = new_data;
    average = calculateAverage(data);

    var some_queued = false;
    for(var i = 0; i < data.length; ++i)
        if(data[i]["status"] === "queued")
        {
            some_queued = true; 
            break;
        }
    if(some_queued)
    {
        setTimeout(
            function(){
                //console.log("reload");
                reloadMatches(load);
            },
            reload_interval);
    }

    renderTimeline();

    if(selected_match == null)
    {
        var first_parsed = -1;
        for(var i = 0; i < data.length; ++i)
            if(data[i]["status"] === "parsed")
            {
                first_parsed = i; 
                break;
            }
        if(first_parsed >= 0)
            displayMatch(data[i]);
    }
}

function calculateAverage(data){
    var averageData = {
        "IMR": 0,
        "ratings": []
    };
    for (i=0; i<data.length; i++){
        if (data[i]["status"] === "parsed"){
            averageData = JSON.parse(JSON.stringify(data[i]));
        }
    }

    averageData["IMR"] = 0;
    for (i=0; i<averageData["ratings"].length; i++){
        averageData["ratings"][i]["rating"] =  0;
        for (var key in averageData["ratings"][i]["skills"]){
            averageData["ratings"][i]["skills"][key] = {};
            averageData["ratings"][i]["skills"][key]["index"] = 0;
            averageData["ratings"][i]["skills"][key]["value"] = 0;
        }
    }

    var avg_counter = 0;
    var min_rating = 10000;
    var max_rating = 0;

    for (i=0; i<data.length; i++){
        if(data[i]["status"] === "parsed")
            avg_counter++;
        else
            continue;

        averageData["IMR"] += (data[i]["IMR"] - averageData["IMR"]) /avg_counter;

        for (j=0; j<data[i]["ratings"].length; j++){
            averageData["ratings"][j]["rating"] +=  (data[i]["ratings"][j]["rating"] - averageData["ratings"][j]["rating"]) /avg_counter;

            min_rating = Math.min(min_rating, data[i]["ratings"][j]["rating"]);
            max_rating = Math.max(max_rating, data[i]["ratings"][j]["rating"]);

            for (var key in data[i]["ratings"][j]["skills"]){
                averageData["ratings"][j]["skills"][key]["index"] += (data[i]["ratings"][j]["skills"][key]["index"] - averageData["ratings"][j]["skills"][key]["index"] ) /avg_counter;
                averageData["ratings"][j]["skills"][key]["value"] += (data[i]["ratings"][j]["skills"][key]["value"] - averageData["ratings"][j]["skills"][key]["value"] ) /avg_counter;
            }
        }
    }

    var stepped_min = Math.floor(min_rating/polygon_range_stepping)*polygon_range_stepping;
    var stepped_max = Math.ceil(max_rating/polygon_range_stepping)*polygon_range_stepping;

    polygon_scale = d3.scale.linear()
                  .domain([stepped_min,stepped_max])
                  .range([0,radius]);


    return averageData;
}

function renderTimeline()
{
    var displayed_matches = data.slice(indx,indx+numMatchesDisplayed);

    x_scale = d3.scale.linear()
                .domain([displayed_matches.length+1, 0])
                .range([graph_padding,graph_width-graph_padding]);

    var value_min = d3.min(displayed_matches,function(d){return d["IMR"];});
    var value_max = d3.max(displayed_matches,function(d){return d["IMR"];});
    var value_padding = Math.max((value_max - value_min)*0.05, value_min*0.05);

    y_scale = d3.scale.linear()
                .domain([value_min-value_padding,value_max+value_padding])
                .range([graph_height-graph_padding,graph_padding]);

    var line_data = displayed_matches.map(function(d,i){return {"IMR": d["IMR"], "index": i};}).filter(function(d){return d["IMR"];});

    var line = d3.svg.line()
        .x(function(d) { return x_scale(d["index"]+1); })
        .y(function(d){ return y_scale(d["IMR"]);})
        .interpolate("linear");

    var mypath = d3.select("#graph");

    if(line_data.length > 1)
        mypath.attr("d",line(line_data));
    else if(line_data.length == 1)
    {
        var vertical_center = (y_scale.range()[0]+y_scale.range()[1]) /2;
        mypath.attr("d","M "+x_scale.range()[0]+" "+vertical_center+" L "+x_scale.range()[1]+" "+vertical_center);
    }
    else
    {
        console.log("no analysed matches at all");
    }    

    var canvas = d3.select("#timeline-canvas");

    var xAxis = d3.svg.axis()
        .scale(x_scale)
        .orient("bottom")
        .tickFormat(function(d){return ""/*Math.floor(d)*/;});

    var yAxis = d3.svg.axis()
                    .scale(y_scale)
                    .orient("left");

    canvas.select("#xAxis")
        .call(xAxis);
    
    canvas.select("#yAxis")
        .transition().duration(500).ease("sin-in-out")
        .call(yAxis);

    canvas.select("#y-axis-label")
        .text("IMR");

    var icons = canvas.selectAll(".icon")
                    .data(displayed_matches, function(d){return d["match-id"]});

    icons.enter()
        .append("g")
        .attr("class", "icon")
        .each(createIcon);

    icons.each(updateIcon);

    icons.exit()
        .remove();
}

function createIcon(d,i)
{
    var group = d3.select(this);

    group.append("circle")
        .attr("id", "bg-circle")
        .attr("cx",0)
        .attr("cy",0)
        .attr("r",20)
        .on("click",function(d,i){
            displayMatch(d);
        })
        .on("mouseenter",function(d,i){group.select("#info-text").style("opacity",1);})
        .on("mouseleave",function(d,i){group.select("#info-text").style("opacity",0);});

    group.append("svg:image")
        .attr("id", "image")
        .attr("xlink:href",function(d){return hero_icons[d["hero"]];})
        .attr("pointer-events", "none");

    var infoGroup = group.append("g")
                        .attr("id","info-text")
                        .style("opacity",0);

    var text_bg = infoGroup.append("rect")
            .attr("class","textRect")
            .attr("height",30)
            .attr("width",40)
            .attr("fill","rgba(50,50,50,0.9)")  
            .attr("rx",4)
            .attr("ry",4)    
            .attr("x",-20)
            .attr("y",-50);

    var text = infoGroup.append("text")
            .attr("x",-16)
            .attr("y",-32)
            .attr("fill","white")
            .text(function(d){if(d["status"]==="parsed") return Math.floor(d["IMR"]); else return d["status"];});

    text_bg
        .attr("height",text.node().getBBox().height +10)
        .attr("width",text.node().getBBox().width +10);//40)
    
}

function updateIcon(d,i)
{
    var group = d3.select(this);

    var x = x_scale(i+1);
    var y;
    if(d["status"]==="parsed")
        y = y_scale(d["IMR"]);
    else
        y = (y_scale.range()[0]+y_scale.range()[1]) /2
    group.attr("transform", "translate("+x+", "+y+")");

    group.select("#bg-circle")
        .attr("fill",
            function(d)
                {
                    if(d["match-id"] === selected_match)
                        return "rgba(236,151,31,0.8)";
                    else if(d["status"]==="open")
                        return "rgba(140,140,140,0.7)"
                    else if(d["status"]==="too-old")
                        return "rgba(200,200,200,0.2)"
                    else if(d["status"]==="queued")
                        return "rgba(0,255,0,0.3)";
                    else if(d["status"]==="failed")
                        return "rgba(255,0,0,0.3)";
                    else if(d["status"]==="parsed")
                        return "rgba(0,0,0,0)";
                });
    group.select("#image")
        .attr("x", -0.5*icon_size)
        .attr("y", -0.5*icon_size)
        .attr("width", icon_size)
        .attr("height", icon_size)
        .attr("opacity", function(d){if(!d["IMR"]) return 0.5; else return 1;});
}


function displayMatch(match)
{
    selected_match = match["match-id"];
    selected_match_data = match;
    if(match["status"] !== "parsed")
    {
        clearMatch();
        return;
    }

    renderTimeline();

    renderPolygon(match);
    renderBars(match);
    renderTips(match);
    renderHeroImages(match);
}

function  clearMatch()
{
    //alert("clear");
}

function renderPolygon(dataPoint)
{

    d3.select("#polygon-canvas").selectAll(".point-polygon").remove();
    d3.select("#polygon-canvas").selectAll(".average-polygon").remove();


    // make an array of [x,y] vectors that point towards nodes of polygon
    var incr = 2*Math.PI/ratings.length;
    var vectorArray = [];  
    for (i=0; i < ratings.length; i++){
        var x = Math.cos(i*incr - thetaOffset);
        var y = Math.sin(i*incr - thetaOffset);
        vectorArray.push([x,y]);
    }

    var dataPointString = "";
    for (i=0;i<ratings.length; i++){
        // make string of points to describe the user's score polygon
        var x = polygon_scale(dataPoint["ratings"][i].rating)*vectorArray[i][0];
        var y = polygon_scale(dataPoint["ratings"][i].rating)*vectorArray[i][1];

        dataPointString += " " + x.toString() +"," + y.toString();
    }

    var averageDataPointString = "";
    for (i=0;i<ratings.length; i++){
        // make string of points to describe the user's score polygon
        var x = polygon_scale(average["ratings"][i].rating)*vectorArray[i][0];
        var y = polygon_scale(average["ratings"][i].rating)*vectorArray[i][1];

        averageDataPointString += " " + x.toString() +"," + y.toString();
    }

    // string to translate objects to the middle of the SVG canvas
    var translateString = "translate(" + xOffset.toString() + "," + yOffset.toString()+ ")";

    // make the user's score polygon for the match selected by index
    var userPolygon = d3.select("#polygon-canvas").append("polygon")
                      .attr("points",dataPointString)
                      .attr("fill","rgba(236,151,31,1)")
                      .attr("stroke","black")
                      .attr("stroke-width",0)
                      .attr("class","point-polygon")
                      .attr("transform",translateString);

  // make the user's score polygon for the match selected by index
    var averagePolygon = d3.select("#polygon-canvas").append("polygon")
                      .attr("points",averageDataPointString)
                      .attr("fill","rgba(0,0,0,0.2)")
                      .attr("stroke","black")
                      .attr("stroke-width",0)
                      .attr("class","average-polygon")
                      .attr("transform",translateString);

    var attributeArray = [];
    for (i=0; i<dataPoint["ratings"].length; i++){
        attributeArray.push(Math.floor(dataPoint["ratings"][i]["rating"]/10)*10);
    }

    var polygonText = d3.select("#polygon-canvas").selectAll(".polygonText")
                        .data(attributeArray)
                        .text(function(d){return d;});

    polygonText.enter()
                .append("text")
                .attr("class","polygonText")
                .attr("x",function(d,i){return (textPadding*(1+Math.abs(Math.sin(incr*i)))+radius)*vectorArray[i][0] -15;})
                .attr("y",function(d,i){return (textPadding*(1+Math.abs(Math.sin(incr*i)))+radius)*vectorArray[i][1] + 15;})
                .attr("transform",translateString)
                .text(function(d){return d;});

    polygonText.exit().remove();
}

function renderBars(dataPoint){

    for (i=0; i<ratings.length; i++){
        //select svg_i
        var table_string = "#rating-table-" + i.toString();

        var skills = [];
        for(var j = 0; j < dataPoint["ratings"].length; ++j)
            if(dataPoint["ratings"][j]["attribute"] === ratings[i]["key"])
            {
                for(var skill in dataPoint["ratings"][j]["skills"])
                {
                    skills.push(
                        {
                            "skill":skill,
                            "score":dataPoint["ratings"][j]["skills"][skill].index,
                            "avg": average["ratings"][j]["skills"][skill],
                            "data": dataPoint["ratings"][j]["skills"][skill]
                        })
                }
                break;
            }

        skills.sort(function(a,b){
            if(a["skill"] in skill_constants && b["skill"] in skill_constants)
                return skill_constants[a["skill"]]["ordering"]-skill_constants[b["skill"]]["ordering"];
            else
                return a["skill"].localeCompare(b["skill"]);
        });

        var skill_rows = d3.select(table_string).selectAll(".skill-row")
                        .data(skills, function(d){return d.skill});

        skill_rows.enter()
            .append("div")
            .attr("class", "skill-row")
            .each(createSkillRow);

        skill_rows.each(updateSkillRow);

        skill_rows.exit()
            .remove();
    }
}

function createSkillRow(d)
{
    var row_container = d3.select(this);

    var content_row = row_container.append("div")
                                    .attr("class", "row");
    
    var skill_name  = content_row.append("div")
        .attr("class", "col-xs-7")
            .append("span")
            .attr("class", "skill-name");
    content_row.append("div")
        .attr("class", "col-xs-1 skill-score");

    var bar_container  = content_row.append("div")
                                    .attr("class", "col-xs-4")
                                        .append("div")
                                        .attr("style", "width: 120px;")
                                        .attr("class", "skill-bar");

    bar_container.append("div")
        .attr("class", "skill-bar-value");
    bar_container.append("div")
        .attr("class", "skill-bar-average");


    var details_row = row_container.append("div")
                                    .attr("class", "row")
                                        .append("div")
                                        .attr("class", "col-xs-12 skill-details");
    skill_name
        .on("click",function(d,i){
            if(selected_skill === d.skill)
                selected_skill = null;
            else
                selected_skill = d.skill;
            displayMatch(selected_match_data);
        });
}

function updateSkillRow(d)
{
    var row = d3.select(this);

    row.select(".skill-name")
        .text((d.skill in skill_constants? skill_constants[d.skill]["label"] : d.skill));

    row.select(".skill-score")
        .text(d.score);

    row.select(".skill-bar-value")
        .attr("style", "width:"+d.score+"px");

    row.select(".skill-bar-average")
        .attr("style", "width:"+d.avg["index"]+"px");

    if(selected_skill === d.skill)
    {
        var detail_text = "";
        if(d.skill in skill_constants)
            detail_text = "<p>"+ skill_constants[d.skill]["explanation"]+"</br>"+
                "Match value: <span class='skill-value'>"+skill_constants[d.skill]["format"](d["data"]["value"])+"</span></br>"+
                "Overall average: <span class='skill-value'>"+skill_constants[d.skill]["format"](d["avg"]["value"])+"</span></p>";
        else
            detail_text = "<p> TODO </p><p>Value: <span class='skill-value'>"+d["data"]["value"]+"</span><br/> Average: <span class='skill-value'>"+d["avg"]["value"]+ "</span></p>";
        row.select(".skill-details")
            .html(detail_text);
    }
    else
    {
        row.select(".skill-details")
            .html("");
    }
}

function renderTips(dataPoint){
    if(dataPoint["ratings"].length ==0)
        return;

    $("#current-match-id").text(dataPoint["match-id"]);
    $("#scoreboard-link").attr("href", "/scoreboard/"+dataPoint["match-id"]);
    $("#review-link").attr("href", "/match/"+dataPoint["match-id"]);
    $("#current-hero").html(names[dataPoint["hero"]]);
    $("#current-hero-icon").attr("src", hero_icons[dataPoint["hero"]]);
    $("#current-imr").html(formatIMR(dataPoint["IMR"]));
    // find the two weakest skills of user in selected match

    skillsList = [];

    for (j=0; j<dataPoint["ratings"].length; j++){
        for (var skill in dataPoint["ratings"][j]["skills"]){
            skillsList.push( [skill, dataPoint["ratings"][j]["skills"][skill] ]);
            //sort descending
            skillsList.sort(function(a, b) {
                if(a[0] in skill_constants && "fixed_direction" in skill_constants[a[0]])
                {
                    if( (a[1]["improved-value"] - a[1]["value"])*skill_constants[a[0]]["fixed_direction"] < 0)
                        return 1; //Sort a to the back
                }
                if(b[0] in skill_constants && "fixed_direction" in skill_constants[b[0]])
                {
                    if( (b[1]["improved-value"] - b[1]["value"])*skill_constants[b[0]]["fixed_direction"] < 0)
                        return -1; //Sort b to the back
                }
                if(a[1]["improved-score"] == null)
                    return 1; 
                if(b[1]["improved-score"] == null)
                    return -1; 

                var value_a = (Math.abs(a[1]["impact"]) * (a[1]["improved-score"] - dataPoint["IMR"])*(a[1]["improved-score"] - dataPoint["IMR"]) ) / Math.sqrt(a[1]["certainty"]);
                var value_b = (Math.abs(b[1]["impact"]) * (b[1]["improved-score"] - dataPoint["IMR"])*(b[1]["improved-score"] - dataPoint["IMR"]) ) / Math.sqrt(b[1]["certainty"]);

                return value_b - value_a;
            });
        }
    }

    var skillOne = skillsList[0];
    var skillTwo = skillsList[1];

    $("#tip1").html(generateTipText(skillOne));
    $("#tip2").html(generateTipText(skillTwo));
}

function generateTipText(skill_pair)
{
    var text = "";
    if(skill_pair[0] in skill_constants)
    {
        text = "Work on your <b>" + skill_constants[skill_pair[0]]["label"] +"</b>:<br/>"+
            " You had <span class='skill-value'> "+skill_constants[skill_pair[0]]["format"]( skill_pair[1]["value"])+
            "</span>, a value of <span class='skill-value'>"+skill_constants[skill_pair[0]]["format"]( skill_pair[1]["improved-value"])+
            "</span> would result in "+formatIMR(skill_pair[1]["improved-score"])+" IMR. <br/> ";
        var change_dir = Math.sign(skill_pair[1]["improved-value"] - skill_pair[1]["value"]);
        text += skill_constants[skill_pair[0]]["tips"][change_dir];
    }    
    else
        text = "Work on your <b>" + skill_pair[0] +"</b>:<br/>"+
            " You had <span class='skill-value'>"+skill_pair[1]["value"].toFixed(3)+
            "</span>, a value of <span class='skill-value'>"+skill_pair[1]["improved-value"].toFixed(3)+
            "</span> would result in "+formatIMR(skill_pair[1]["improved-score"])+" IMR.";

    return text;
}


function renderHeroImages(dataPoint) {
    var players = dataPoint["players"];
    for (i=0; i<players.length; i++){
        $("#hero_" + i.toString()).attr("src", hero_pictures[players[i]["hero"]]);
        $("#hero_" + i.toString()).attr("alt", players[i]["name"]);

        if(players[i]["hero"] == dataPoint["hero"])
        {
            $("#hero_" + i.toString()).attr("style", "border:3px solid #ec971f;");
        }
        else
        {
            $("#hero_" + i.toString()).attr("style", "border:0px;");
        }
    }
}

var history_job_check_interval = 5000;

$(document).ready(function(){
    initPage();
    d3.json("/api/update-history", 
        function(data)
        {
            console.log("update history", data);
            if(data["result"] === "success")
            {
                console.log("checking");
                setTimeout(
                    function(){
                        checkHistoryJob(data["job-id"]);
                    },
                    history_job_check_interval);
            }
        }
    );
    reloadMatches(load);
});

$("#analyse-matches-button" ).click(function() {
    d3.json("/api/queue-matches", function(data){ 
    if(data["result"]==="success")
    {
        if(data["n-requested"] == 0)
            alert("No more matches to queue, please wait.");
        else           
        {
            alert("Queued "+data["n-requested"]+" matches for analysis. Games can take ~5 minutes to parse."); 
            reloadMatches(load);
        }

    }
    else
        alert("Sorry, failure queueing matches. Leave us a message and we will look into it.");
  });
});

function checkHistoryJob(job_id)
{
    //console.log("checking!");
    d3.json("/api/check-job-finished/"+job_id,
        function(data)
        {
            if(data["is-finished"])
            {
                //console.log("done!");
                reloadMatches(load);
            }
            else
            {
                setTimeout(
                    function(){
                        checkHistoryJob(job_id);
                    },
                    history_job_check_interval);
            }
        }
    );
}
