var indx = 0;
var numMatchesDisplayed = 20;
var load_offset = 0
var load_num = 30;

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

var ratings =[
{   "key":      "Mechanics",
    "label":    "Mechanics"
},
{
    "key":      "Farming",
    "label":    "Farming"
},
{
    "key":      "Fighting",
    "label":    "Fighting"
}];


var xOffset = boxSize/2;
var yOffset = boxSize/2;
var radius = polyScale*boxSize/2;
var textPadding = textPaddingScale*boxSize/2;
var thetaOffset = Math.PI/2;

// make a linear scale mapping MMR to pixel scale of polygon
var scale = d3.scale.linear()
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

function initPage()
{
    createPolygonBase();
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
            d3.json("/api/get-player-matches?start="+load_offset+"&end="+(load_offset+load_num),
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
                d3.json("/api/get-player-matches?start="+load_offset+"&end="+(load_offset+load_num),
                function(data){
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

            d3.json("/api/get-player-matches?start="+load_offset+"&end="+(load_offset+load_num),
            function(data){
                numMatchesDisplayed = 20;
                icon_size = 32;
                load_num = 30;
                load(data);
            } );
        }
    });

    $("#load-fifty").click(function(){
        if(numMatchesDisplayed != 50)
        {
            d3.json("/api/get-player-matches?start="+load_offset+"&end="+(load_offset+load_num),
            function(data){
                numMatchesDisplayed = 50;
                icon_size = 24;
                load_num = 70;
                load(data);
            } );
        }
    });
}

function createRatingDivs(){
    for (i=0; i<ratings.length; i++){

    var div = d3.select("#skills-container").append("div")
                    .attr("class","col-md-6 text-center");

    div.append("h3")
        .text(ratings[i]["label"]);

    var table_id = "rating-table-" + i.toString();
    var table =  div.append("table")
                    .attr("class", "skills-table")
                    .attr("width", "100%");

    table.append("thead")
        .html("<tr><th>Skill</th><th colspan='2'>Rating</th></tr>")

    table.append("tbody")
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

function load(new_data)
{
    data = new_data;
    average = calculateAverage(data);

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
        displayMatch(data[i]);
    }
}

function calculateAverage(data){
    var averageData = null;
    for (i=0; i<data.length; i++){
        if (data[i]["status"] === "parsed"){
            averageData = JSON.parse(JSON.stringify(data[i]));
        }
    }

    averageData["IMR"] = 0;
    for (i=0; i<averageData["ratings"].length; i++){
        averageData["ratings"][i]["rating"] =  0;
        for (var key in averageData["ratings"][i]["skills"]){
            averageData["ratings"][i]["skills"][key] = 0;
        }
    }

    var avg_counter = 0;
    for (i=0; i<data.length; i++){
        if(data[i]["status"] === "parsed")
            avg_counter++;
        else
            continue;

        averageData["IMR"] += (data[i]["IMR"] - averageData["IMR"]) /avg_counter;
        for (j=0; j<data[i]["ratings"].length; j++){
            averageData["ratings"][j]["rating"] +=  (data[i]["ratings"][j]["rating"] - averageData["ratings"][j]["rating"]) /avg_counter;
            for (var key in data[i]["ratings"][j]["skills"]){
                averageData["ratings"][j]["skills"][key] += (data[i]["ratings"][j]["skills"][key]["index"] - averageData["ratings"][j]["skills"][key] ) /avg_counter;
            }
        }
    }

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
        console.log("shouldn't happen");

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
        .attr("opacity", function(d){if(!d["IMR"]) return 0.5; else return 1;})
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
                        return "rgba(140,140,140,0.5)"
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
        .attr("height", icon_size);
}


var skill_constants = {
    "n-checks":
        {   "label": "Item Checks",
            //"scale": d3.scale.linear().domain([0, 300]).range([0,100]).clamp(true),
            "explanation": "measures how frequently you check items of opponents",
            "tip": "Click enemies as often as possible so you know their current items and exact HP/Mana values.",
            "fixed_direction": 0
        },

    "average-check-duration":
        {   "label": "Check Speed",
            //"scale": d3.scale.linear().domain([0.5, 3]).range([0,100]).clamp(true),
            "explanation": "measures how quickly you check items of opponents",
            "tip": "Checking enemy inventories should be as quick as possible, you have many other things to do!",
            "fixed_direction": 0
        },

    "camera-jumps":
        {   "label": "Camera Jumps",
            //"scale": d3.scale.linear().domain([0, 400]).range([0,100]).clamp(true),
            "explanation": "measures how often you reposition the camera to check things far away",
            "tip": "Use the minimap to jump with your camera and view action happening somewhere else.",
            "fixed_direction": 0
        },
    "movement-per-minute":
        {   "label": "Camera Movement",
            //"scale": d3.scale.linear().domain([500, 2000]).range([0,100]).clamp(true),
            "explanation": "measures how much you move your camera around",
            "tip": "Keep your camera moving to see as much as possible.",
            "fixed_direction": 0
        },
    "GPM":
        {   "label": "GPM",
            //"scale": d3.scale.linear().domain([0, 900]).range([0,100]).clamp(true),
            "explanation": "measures average gold gain per minute",
            "tip": "Earning Gold is crucial to success.",
            "fixed_direction": 1
        },
    "XPM":
        {   "label": "XPM",
            //"scale": d3.scale.linear().domain([0, 600]).range([0,100]).clamp(true),
            "explanation": "measures average experience gain per minute",
            "tip": "Make sure you collect enough experience, if you are underleveled your abilities will lose their impact."
        },
    "missed-free-lasthits":
        {   "label": "Missed LH",
            //"scale": d3.scale.linear().domain([100, 0]).range([0,100]).clamp(true),
            "explanation": "Measures how many easy to get lasthits you missed",
            "tip": "When nobody is around, you should be lasthitting every creep that dies. Every single one!",
            "fixed_direction": -1
        },
    "percent-of-contested-lasthits-gotten":
        {   "label": "Contested LH",
            //"scale": d3.scale.linear().domain([0, 1]).range([0,100]).clamp(true),
            "explanation": "measures how much of the lasthits you got when challenged by an enemy",
            "tip": "Lasthitting creeps while competing with an enemy is a challenge, keep practicing.",
            "fixed_direction": -1
        },
    "kills":
        {   "label": "Kills",
            //"scale": d3.scale.linear().domain([0, 20]).range([0,100]).clamp(true),
            "explanation": "Number of opponents killed",
            "tip": "Kill enemies and you will gain a significant advantage over them.",
            "fixed_direction": 1
        },
    "deaths":
        {   "label": "Deaths",
            //"scale": d3.scale.linear().domain([20, 0]).range([0,100]).clamp(true),
            "explanation": "Your number of deaths",
            "tip": "Most deaths could be avoided with a little more careful play.",
            "fixed_direction": -1
        },
    "fights":
        {   "label": "Fights",
            //"scale": d3.scale.linear().domain([0, 60]).range([0,100]).clamp(true),
            "explanation": "measures how often you got involved in fights with enemy heroes.",
            "tip": "Fight the enemy a lot to keep up pressure.",
            "fixed_direction": 0
        }
};

function displayMatch(match)
{
    selected_match = match["match-id"];
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
    alert("clear");
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
        var x = scale(dataPoint["ratings"][i].rating*vectorArray[i][0]);
        var y = scale(dataPoint["ratings"][i].rating*vectorArray[i][1]);

        dataPointString += " " + x.toString() +"," + y.toString();
    }

    var averageDataPointString = "";
    for (i=0;i<ratings.length; i++){
        // make string of points to describe the user's score polygon
        var x = scale(average["ratings"][i].rating*vectorArray[i][0]);
        var y = scale(average["ratings"][i].rating*vectorArray[i][1]);

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
                      .attr("fill","rgba(0,0,0,0.5)")
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
                            "avg": average["ratings"][j]["skills"][skill]
                        })
                }
                break;
            }

        var skill_rows = d3.select(table_string).selectAll(".skill-row")
                        .data(skills, function(d){return d.skill});

        skill_rows.enter()
            .append("tr")
            .attr("class", "skill-row")
            .each(createSkillRow);

        skill_rows.each(updateSkillRow);

        skill_rows.exit()
            .remove();
    }
}

function createSkillRow(d)
{
    var row = d3.select(this);

    row.append("td")
        .attr("class", "skill-name");
    row.append("td")
        .attr("class", "skill-score");
    var bar_container = row.append("td")
        .append("div")
            .attr("style", "width: 120px;")
            .attr("class", "skill-bar");
    bar_container.append("div")
        .attr("class", "skill-bar-value");
    bar_container.append("div")
        .attr("class", "skill-bar-average");
}

function updateSkillRow(d)
{
    var row = d3.select(this);

    row.select(".skill-name")
        .text(d.skill);

    row.select(".skill-score")
        .text(d.score);

    row.select(".skill-bar-value")
        .attr("style", "width:"+d.score+"px");

    row.select(".skill-bar-average")
        .attr("style", "width:"+d.avg+"px");
}

function renderTips(dataPoint){
    if(dataPoint["ratings"].length ==0)
        return;

    $("#current-match-id").text(dataPoint["match-id"]);
    $("#scoreboard-link").attr("href", "/scoreboard/"+dataPoint["match-id"]);
    $("#review-link").attr("href", "/match/"+dataPoint["match-id"]);
    $("#current-hero").html(names[dataPoint["hero"]]);
    $("#current-hero-icon").attr("src", hero_icons[dataPoint["hero"]]);
    $("#current-imr").html(Math.floor(dataPoint["IMR"]/10)*10);
    // find the two weakest skills of user in selected match

    skillsList = [];

    for (j=0; j<dataPoint["ratings"].length; j++){
        for (var skill in dataPoint["ratings"][j]["skills"]){
            skillsList.push( [skill, dataPoint["ratings"][j]["skills"][skill] ]);
            //sort descending
            skillsList.sort(function(a, b) {
                var value_a = (Math.abs(a[1]["impact"]) * (a[1]["improved-score"] - dataPoint["IMR"]) ) / Math.sqrt(a[1]["certainty"]);
                var value_b = (Math.abs(b[1]["impact"]) * (b[1]["improved-score"] - dataPoint["IMR"]) ) / Math.sqrt(b[1]["certainty"]);

                return value_b - value_a;
            });
        }
    }

    var skillOne = skillsList[0];
    var skillTwo = skillsList[1];
    var tip1_text = "";
    if(skillOne[0] in skill_constants)
        tip1_text = "Work on your <b>" + skill_constants[skillOne[0]]["label"] +"</b>:<br/>"+
            " You achieved "+skillOne[1]["value"].toFixed(3)+", a value of "+skillOne[1]["improved-value"].toFixed(3)+" would result in "+Math.floor(skillOne[1]["improved-score"])+" IMR. <br/> " +
             skill_constants[skillOne[0]]["tip"] + "";
    else
        tip1_text = "Work on your <b>" + skillOne[0] +"</b>:<br/>"+
            " You achieved "+skillOne[1]["value"].toFixed(3)+", a value of "+skillOne[1]["improved-value"].toFixed(3)+" would result in "+Math.floor(skillOne[1]["improved-score"])+" IMR.";
    
    var tip2_text = "";
    if(skillTwo[0] in skill_constants)
        tip2_text = "Work on your <b>" + skill_constants[skillTwo[0]]["label"] +"</b>:<br/>"+
            " You achieved "+skillTwo[1]["value"].toFixed(3)+", a value of "+skillTwo[1]["improved-value"].toFixed(3)+" would result in "+Math.floor(skillTwo[1]["improved-score"])+" IMR. <br/> " +
             skill_constants[skillTwo[0]]["tip"] + "";
    else
        tip2_text = "Work on your <b>" + skillTwo[0] +"</b>:<br/>"+
            " You achieved "+skillTwo[1]["value"].toFixed(3)+", a value of "+skillTwo[1]["improved-value"].toFixed(3)+" would result in "+Math.floor(skillTwo[1]["improved-score"])+" IMR.";

    $("#tip1").html(tip1_text);
    $("#tip2").html(tip2_text);
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

$(document).ready(function(){
    initPage();
    d3.json("/api/get-player-matches?start="+load_offset+"&end="+(load_offset+load_num), load);
});

$("#analyse-matches-button" ).click(function() {
    d3.json("/api/queue-matches", function(data){ 
    if(data["result"]==="success")
    {
        if(data["n-requested"] == 0)
            alert("Up to date, no matches to queue.");
        else           
            alert("Queued "+data["n-requested"]+" matches for analysis.");
    }
    else
        alert("Sorry, failure queueing matches. Leave us a message and we will look into it.");
  });
});