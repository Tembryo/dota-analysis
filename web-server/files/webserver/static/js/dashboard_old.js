      $(document).ready(function(){

        var indx = 0;
        var numMatches = 20;

        var boxSize = 275;   // size of the SVG container
        var polyScale = 0.6;  // size of polygon as proportion of SVG container
        var textPaddingScale = 0.12; // padding for text around polygon
        var alpha = 0.1;
        var maxMMR = 8000;
        var textFont = "helvetica";

        // variables for userSkills
        var height = 120;
        var width = 300;
        var xOffsetText = 0;
        var yOffsetText = height*0.1;
        var yOffsetSkills = height*0.2;   
        var textTranslateString = "translate(" + xOffsetText.toString() + "," + yOffsetText.toString()+ ")";
        var barHeight = 20;
        var textWidth = 140;
        var barWidth = 160;
        var barSpacing = 5;

        // definitions to explain skills when user hovers over the text
        var skill_constants = {
            "n-checks":
                {   "label": "Item Checks",
                    //"scale": d3.scale.linear().domain([0, 300]).range([0,100]).clamp(true),
                    "explanation": "measures how frequently you check items of opponents",
                    "tip": "Click enemies as often as possible so you know their current items and exact HP/Mana values."
                },

            "average-check-duration":
                {   "label": "Check Speed",
                    //"scale": d3.scale.linear().domain([0.5, 3]).range([0,100]).clamp(true),
                    "explanation": "measures how quickly you check items of opponents",
                    "tip": "Checking enemy inventories should be as quick as possible, you have many other things to do!"
                },

            "camera-jumps":
                {   "label": "Camera Jumps",
                    //"scale": d3.scale.linear().domain([0, 400]).range([0,100]).clamp(true),
                    "explanation": "measures how often you reposition the camera to check things far away",
                    "tip": "Use the minimap to jump with your camera and view action happening somewhere else."
                },
            "movement-per-minute":
                {   "label": "Camera Movement",
                    //"scale": d3.scale.linear().domain([500, 2000]).range([0,100]).clamp(true),
                    "explanation": "measures how much you move your camera around",
                    "tip": "Keep your camera moving to see as much as possible."
                },
            "GPM":
                {   "label": "GPM",
                    //"scale": d3.scale.linear().domain([0, 900]).range([0,100]).clamp(true),
                    "explanation": "measures average gold gain per minute",
                    "tip": "Earning Gold is crucial to success."
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
                    "tip": "When nobody is around, you should be lasthitting every creep that dies. Every single one!"
                },
            "percent-of-contested-lasthits-gotten":
                {   "label": "Contested LH",
                    //"scale": d3.scale.linear().domain([0, 1]).range([0,100]).clamp(true),
                    "explanation": "measures how much of the lasthits you got when challenged by an enemy",
                    "tip": "Lasthitting creeps while competing with an enemy is a challenge, keep practicing."
                },
            "kills":
                {   "label": "Kills",
                    //"scale": d3.scale.linear().domain([0, 20]).range([0,100]).clamp(true),
                    "explanation": "Number of opponents killed",
                    "tip": "Kill enemies and you will gain a significant advantage over them."
                },
            "deaths":
                {   "label": "Deaths",
                    //"scale": d3.scale.linear().domain([20, 0]).range([0,100]).clamp(true),
                    "explanation": "Your number of deaths",
                    "tip": "Most deaths could be avoided with a little more careful play."
                },
            "fights":
                {   "label": "Fights",
                    //"scale": d3.scale.linear().domain([0, 60]).range([0,100]).clamp(true),
                    "explanation": "measures how often you got involved in fights with enemy heroes.",
                    "tip": "Fight the enemy a lot to keep up pressure."
                }
            };

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


        function load(data){ 

            var N = data.length;
            var n = makeDivs(data);
            var incr = 2*Math.PI/n;

            // make SVG container
            var canvas = d3.select("#polygon-container").append("svg")
                            .attr("height",boxSize)
                            .attr("width",boxSize)
                            .attr("id","polygon-canvas");

            var polygonText = document.createElement("p");
            polygonText.innerHTML = "Yellow polygon = rating for selected match. <br> Grey polygon = average over your matches.";
            document.getElementById("polygon-container").appendChild(polygonText); 

            // make an array of [x,y] vectors that point towards nodes of polygon
            var vectorArray = [];  
            for (i=0; i < n; i++){
                var x = Math.cos(i*incr - thetaOffset);
                var y = Math.sin(i*incr - thetaOffset);
                vectorArray.push([x,y]);
            }

            //given an array of vectors and a radius, make a string of points to pass to SVG to make a polygon
            function genPointString(vectorArray,radius){
                var pointString = "";
                for (i=0; i < n; i++){
                    pointString = pointString + " " + (radius*vectorArray[i][0]).toString() +"," + (radius*vectorArray[i][1]).toString();
                }
                return pointString
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
            

            var n_ratings = 0;
            var index = 0;
            for (j=0; j<data.length; j++){
                if (data[j]["ratings"].length > n_ratings){
                    n_ratings = data[j]["ratings"].length;
                    index = j;
                }
            }

            // loop over points on polygon drawing lines, adding text 
            for (i=0; i<n; i++){
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
                            .text(data[index]["ratings"][i].attribute)
                            .attr("text-anchor","middle")
                            .attr("font-family",textFont)
                            .attr("transform",translateString);

            }

            function renderPolygon(dataPoint,fill,flag){

                // if intending to draw a point polygon set flag = 1
                if (flag==1){
                    var polygonClass = "point-polygon";
                    //remove any existing point polygons
                    d3.select("#polygon-canvas").selectAll(".point-polygon").remove();
                }
                else {
                    var polygonClass = "average-polygon";

                }

                var dataPointString = "";
                if(dataPoint["ratings"].length > 0)
                {
                    for (i=0;i<n; i++){
                        // make string of points to describe the user's score polygon
                        var x = scale(dataPoint["ratings"][i].rating*vectorArray[i][0]);
                        var y = scale(dataPoint["ratings"][i].rating*vectorArray[i][1]);

                        dataPointString = dataPointString + " " + x.toString() +"," + y.toString();
                    }
                }
                // make the user's score polygon for the match selected by index
                var userPolygon = d3.select("#polygon-canvas").append("polygon")
                                  .attr("points",dataPointString)
                                  .attr("fill",fill)
                                  .attr("stroke","black")
                                  .attr("stroke-width",0)
                                  .attr("class",polygonClass)
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


            function makeDivs(data){

                // find entry in data set with the greatest number of attributes
                n = 0;
                index = 0;
                for (j=0; j<data.length; j++){
                    if (data[j]["ratings"].length > n){
                        n = data[j]["ratings"].length;
                        index = j;
                    }
                }

                for (i=0; i<n; i++){

                var div = d3.select("#skills-container").append("div")
                                .attr("class","col-md-6 text-center");

                div.append("h3")
                    .text(data[index]["ratings"][i].attribute)

                var classString = "svg_" + i.toString();
                var userSkills =  div.append("svg")
                                    .attr("height",height)
                                    .attr("width",width)
                                    .attr("class",classString);
                }
                return n
            }

            function renderBars(dataPoint){

                for (i=0; i<n; i++){
                    //select svg_i
                    var classString = ".svg_" + i.toString();

                    var skills = [];
                    if(dataPoint["ratings"][i])
                        skills = dataPoint["ratings"][i].skills;

                    var userBar = d3.select(classString).selectAll("rect.userBar")
                                    .data(d3.entries(skills))
                                    .attr("width",function(d){return barScale(d.value.index)})
                                    .attr("fill",function(d){return color(d.value.index);})

                    userBar.enter()
                        .append("rect")
                        .attr("class","userBar")
                        .attr("transform", function(d, i) { 
                                    yOffsetGroup = i*(barHeight+barSpacing) + 10;
                                    return "translate(10," + yOffsetGroup.toString() +")"; })
                        .attr("height",barHeight)
                        .attr("x", textWidth +15)
                        .attr("fill-opacity",0.5)
                        .attr("width",function(d){return barScale(d.value.index)})
                        .attr("fill",function(d){return color(d.value.index);});

                    userBar.exit().remove();

                    var barText = d3.select(classString).selectAll("text.bar-text")
                                .data(d3.entries(skills))
                                .attr("x",function(d){return textWidth -12;})
                                .text(function(d){return d.value.index;});

                    barText.enter()
                        .append("text")
                        .attr("class","bar-text")
                        .attr("transform", function(d, i) { 
                                    yOffsetGroup = i*(barHeight + barSpacing)+10;
                                    return "translate(10," + yOffsetGroup.toString() +")"; })
                        .attr("y",barHeight/2)
                        .attr("x",function(d){return textWidth-12;})
                        .attr("dy", ".35em")
                        .attr("fill","black")
                        .attr("style", "font-weight: bold;")
                        .text(function(d){return d.value.index;});

                    barText.exit().remove();

                }
            }

            function renderBarsAv(dataPoint){

                for (i=0; i<n; i++){
                    //select svg_i
                    var classString = ".svg_" + i.toString();
                    console.log(d3.entries(dataPoint["ratings"][i].skills));
                    var userBar = d3.select(classString).selectAll("rect.userBarAv")
                                    .data(d3.entries(dataPoint["ratings"][i].skills))
                                    .attr("width",function(d){return barScale(Math.floor(d.value))});

                    userBar.enter()
                        .append("rect")
                        .attr("class","userBarAv")
                        .attr("transform", function(d, i) { 
                                    yOffsetGroup = i*(barHeight + barSpacing)+10;
                                    return "translate(10," + yOffsetGroup.toString() +")"; })
                        .attr("height",barHeight)
                        .attr("x",textWidth +15)
                        .attr("fill-opacity",0.7)
                        .attr("width",function(d){return barScale(Math.floor(d.value));})
                        .attr("fill","rgba(0,0,0,0.5)");

                    userBar.exit().remove();

                    var skillText = d3.select(classString).selectAll("text.skill-text")
                                .data(d3.entries(dataPoint["ratings"][i].skills))
                                .text(function(d){return skill_constants[d.key];});

                    skillText.enter()
                        .append("text")
                        .attr("class","skill-text")
                        .attr("style","cursor:Pointer")
                        .attr("font-family",textFont)
                        .attr("text-anchor","end")
                        .attr("transform", function(d, i) { 
                                    yOffsetGroup = i*(barHeight + barSpacing)+10;
                                    return "translate(10," + yOffsetGroup.toString() +")"; })
                        .attr("x",textWidth - 20)
                        .attr("y",0.75*barHeight)
                        .text(function(d){if(d.key in skill_constants) return skill_constants[d.key]["label"]; else return d.key;});

                    skillText.append("svg:title")
                        .text(function(d){if(d.key in skill_constants) return skill_constants[d.key]["label"]; else return d.key;});

                    skillText.exit().remove();

                }
            }

            function getAverage(data){

                var n_ratings = 0;
                var index = 0;
                for (j=0; j<data.length; j++){
                    if (data[j]["ratings"].length > n_ratings){
                        n_ratings = data[j]["ratings"].length;
                        index = j;
                    }
                }

                //first entry in dataset must have all of the c
                var averageData = JSON.parse(JSON.stringify(data[index]));
                averageData["IMR"] = 0;
                for (j=0; j<averageData["ratings"].length; j++){
                    averageData["ratings"][j]["rating"] =  0;
                    for (var key in averageData["ratings"][j]["skills"]){
                        averageData["ratings"][j]["skills"][key] = 0;
                    }
                }

                var avg_counter = 0;
                for (i=0; i<N; i++){
                    if(data[i]["IMR"])
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

                return averageData
            }

            function indicesRange(array) {
                var foo = [];
                for (var i = 0; i < array.length; i++) {
                    foo.push(i);
                }
                return foo;
            }



            function renderGraph(width,height,padding){

                canvas=d3.select("#timeline-container")
                        .append("svg")
                        .attr("id","graph-canvas")
                        .attr("viewBox", "-30 0 "+(width+20)+" "+height);

                var path = canvas.append("path")
                    .attr("id", "graph")
                    .attr("fill","none")
                    .attr("stroke","black")  
                    .attr("stroke-width",5);

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
                    .attr("text-anchor", "start")
                    .attr("transform", "translate("+(padding/2)+", "+(padding-10)+")")
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

                $("#timeline-container").append(backwards);

                var loadTwenty = document.createElement("a");
                $(loadTwenty).attr("class","btn btn-primary btn-sm disabled")
                            .attr("id","load-twenty")
                            .css("margin","5px")
                            .text("20");

                var loadFifty = document.createElement("a");
                $(loadFifty).attr("class","btn btn-primary btn-sm disabled")
                            .attr("id","load-fifty")
                            .css("margin","5px")
                            .text("50");

                $("#timeline-container").append(loadTwenty);
                $("#timeline-container").append(loadFifty);

                $("#timeline-container").append(forwards);
    


                }

                function updateGraph(data){

                x_scale = d3.scale.linear()
                            .domain([0,data.length+1])
                            .range([padding,width-padding]);
                var value_min = d3.min(data,function(d){return d["IMR"];});
                var value_max = d3.max(data,function(d){return d["IMR"];});
                var value_padding = Math.max((value_max - value_min)*0.05, value_min*0.05);

                y_scale = d3.scale.linear()
                            .domain([value_min-value_padding,value_max+value_padding])
                            .range([height-padding,padding]);

                var line_data = data.map(function(d,i){return {"IMR": d["IMR"], "index": i};}).filter(function(d){return d["IMR"];});

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

                var xAxis = d3.svg.axis()
                    .scale(x_scale)
                    .orient("bottom")
                    .tickFormat(function(d){return Math.floor(d);});

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

                var icon_size = 32;

                d3.selectAll(".icons").remove()

                var icons = canvas.selectAll(".icons")
                                .data(data);

                icons.enter()
                    .append("g")
                    .attr("class","icons")
                    .attr("id", function(d,i){return "circle" + i;});

                icons.append("circle")
                        .attr("fill",
                            function(d,i)
                            {
                                if (i==data.length-1)
                                    { return "rgba(255,0,0,0.8)" }
                                else if(d["status"]==="open")
                                    { return "rgba(140,140,140,0.5)"} 
                                else if(d["status"]==="queued")
                                    {return "rgba(0,255,0,0.3)";}
                                else if(d["status"]==="failed")
                                    {return "rgba(255,0,0,0.3)";}
                                else if(d["status"]==="parsed")
                                    {return "rgba(0,0,0,0)";}
                            })
                        .attr("cx",function(d,i){return  x_scale(i+1)})
                        .attr("cy",function(d){if(d["IMR"]) return y_scale(d["IMR"]); else return height/2;})
                        .attr("r",20)
                        .on("click",function(d){
                            renderBars(d);
                            d3.selectAll("circle").attr("fill",
                                function(d)
                                {
                                    if(d["status"]==="open")
                                        { return "rgba(140,140,140,0.5)"}
                                    else if(d["status"]==="queued")
                                        {return "rgba(0,255,0,0.3)";}
                                    else if(d["status"]==="failed")
                                        {return "rgba(255,0,0,0.3)";}
                                    else if(d["status"]==="parsed")
                                        {return "rgba(0,0,0,0)";}
                                });
                            renderPolygon(d,"rgba(236,151,31,0.8)",1);
                            d3.select(this).attr("fill","rgba(236,151,31,0.8)");
                            d3.select("#match-report-heading").html("Match <a href='/scoreboard/"+ d["match-id"]+"'>"+d["match-id"]+"</a>");
                            renderTips(d);
                            renderHeroImages(d);
                        })
                        .on("mouseenter",function(d,i){d3.select("#info-text_"+i.toString()).style("opacity",1);})
                        .on("mouseleave",function(d,i){d3.select("#info-text_"+i.toString()).style("opacity",0);});

                icons.append("svg:image")
                        .attr("xlink:href",function(d){return hero_icons[d["hero"]];})
                        .attr("opacity", function(d){if(!d["IMR"]) return 0.5; else return 1;})
                        .attr("x", function(d,i){return  x_scale(i+1)-0.5*icon_size})
                        .attr("y", function(d){if(!d["IMR"])return height/2 -0.5*icon_size; else return y_scale(d["IMR"]) -0.5*icon_size})
                        .attr("width",icon_size)
                        .attr("height",icon_size)
                        .attr("pointer-events","none");

                icons.exit().remove();

                var infoText = canvas.selectAll(".circle-text")
                                .data(data);

                var infoGroup = infoText.enter()
                                    .append("g")
                                    .attr("id",function(d,i){return "info-text_"+ i.toString();})
                                    .style("opacity",0);

                infoGroup.append("rect")
                        .attr("class","textRect")
                        .attr("height",30)
                        .attr("width",40)
                        .attr("fill","rgba(50,50,50,0.9)")  
                        .attr("rx",4)
                        .attr("ry",4)    
                        .attr("x",function(d,i){return x_scale(i+1)-20;})
                        .attr("y",function(d){if(!d["IMR"])return height/2-60; else return y_scale(d["IMR"])-60;});

                infoGroup.append("text")                                           
                        .attr("x",function(d,i){return x_scale(i+1)-16;})
                        .attr("y",function(d){if(!d["IMR"])return height/2-40; else return y_scale(d["IMR"])-40;})
                        .attr("fill","white")
                        .text(function(d){if(!d["IMR"])return "?"; else return Math.floor(d["IMR"]);});

                infoText.exit().remove();

                $("#match-report-heading").html("Match <a href='/scoreboard/"+  data[data.length-1]["match-id"]+"'>"+ data[data.length-1]["match-id"]+"</a>");

            }
            
            function renderTips(dataPoint){
                if(dataPoint["ratings"].length ==0)
                    return;

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
                var new_tips_text =""
                if(skillOne[0] in skill_constants)
                    new_tips_text += "<p>Work on your <b>" + skill_constants[skillOne[0]]["label"] +"</b>:<br/>"+
                        " You achieved "+skillOne[1]["value"].toFixed(3)+", a value of "+skillOne[1]["improved-value"].toFixed(3)+" would result in "+Math.floor(skillOne[1]["improved-score"])+" IMR. <br/> " +
                         skill_constants[skillOne[0]]["tip"] + "</p>";
                else
                    new_tips_text += "<p>Work on your <b>" + skillOne[0] +"</b>:<br/>"+
                        " You achieved "+skillOne[1]["value"].toFixed(3)+", a value of "+skillOne[1]["improved-value"].toFixed(3)+" would result in "+Math.floor(skillOne[1]["improved-score"])+" IMR.</p>";
                
                if(skillTwo[0] in skill_constants)
                    new_tips_text += "<p>Work on your <b>" + skill_constants[skillTwo[0]]["label"] +"</b>:<br/>"+
                        " You achieved "+skillTwo[1]["value"].toFixed(3)+", a value of "+skillTwo[1]["improved-value"].toFixed(3)+" would result in "+Math.floor(skillTwo[1]["improved-score"])+" IMR. <br/> " +
                         skill_constants[skillTwo[0]]["tip"] + "</p>";
                else
                    new_tips_text += "<p>Work on your <b>" + skillTwo[0] +"</b>:<br/>"+
                        " You achieved "+skillTwo[1]["value"].toFixed(3)+", a value of "+skillTwo[1]["improved-value"].toFixed(3)+" would result in "+Math.floor(skillTwo[1]["improved-score"])+" IMR.</p>";

                tipsText.innerHTML = new_tips_text;

                document.getElementById("polygon-container").appendChild(tipsText);
            }

            function renderHeroImages(dataPoint) {
                var players = dataPoint["players"];
                for (i=0; i<players.length; i++){
                    document.getElementById("hero_" + i.toString()).src = hero_pictures[players[i]["hero"]];
                    document.getElementById("hero_" + i.toString()).alt = players[i]["name"];

                    if(players[i]["hero"] == dataPoint["hero"])
                    {
                        document.getElementById("hero_" + i.toString()).style = "border:3px solid #ec971f;"
                    }
                    else
                    {
                        document.getElementById("hero_" + i.toString()).style = "border:0px;"
                    }
                }
            }

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
 
            var sel = 2;
            var avData = getAverage(data);
            renderPolygon(avData,"rgba(0,0,0,0.5)",0);
            renderPolygon(data[sel],"rgba(236,151,31,0.8)",1);

            var tipsHeading = document.createElement("h3");
            tipsHeading.innerHTML = "Tips";
            document.getElementById("polygon-container").appendChild(tipsHeading);

            var tipsText = document.createElement("p");

            renderBarsAv(avData);
            renderBars(data[sel]);

            width = 800;
            height = 300;
            padding = 20;

            renderGraph(width,height,padding);
            updateGraph(data);
            renderTips(data[sel]);
            renderHeroImages(data[sel]);


            $("#scroll-right").click(function(){indx = indx +1;
                updateGraph(data.slice(Math.max(0,indx),numMatches+indx));});
            $("#scroll-left").click(function(){indx = indx -1;
                updateGraph(data.slice(Math.max(0,indx),numMatches+indx));});

            $("#load-twenty").click(function(){ numMatches = 20;
                updateGraph(data.slice(Math.max(0,indx),numMatches+indx))});
            $("#load-fifty").click(function(){ numMatches = 50;
                updateGraph(data.slice(Math.max(0,indx),numMatches+indx))});



        };

        d3.json("/api/get-player-matches?start="+indx+"&end="+(indx+numMatches), load);
    })