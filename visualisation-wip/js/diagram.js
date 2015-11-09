/* Declare global variables*/


//data organisation
pregame_time = 90;

replay_data = {};

function loadData(callback_finished)
{
	d3.json("data/monkey_vs_nip.json",function(error, data){
			replay_data = data;
			buildDataIndices();
			callback_finished();
		});
}

function buildDataIndices()
{
	replay_data["indices"] = {};
	replay_data["indices"]["kills"] = [];
	replay_data["indices"]["fights"] = [];
	for (var event_id in replay_data["events"]) {
		switch(replay_data["events"][event_id]["type"])
		{
		case "kill":
			replay_data["indices"]["kills"].push(event_id);
			break;
		case "fight":
			replay_data["indices"]["fights"].push(event_id);
			break;
		}
	}
}

function generateGraph(id, group, timeseries, xrange, yrange, area_colors){
	var graph_node = group.append("g")
				.attr("id", id+"-graph");
	switch(timeseries["format"])
	{
	case "samples":
		xscale = d3.scale.linear()
				.domain(xrange)
				.range(xrange);

		var range = Math.max(	Math.abs(d3.min(timeseries["samples"], function(sample){return sample["v"];})),
					Math.abs(d3.min(timeseries["samples"], function(sample){return sample["v"];}))
					);
		yscale = d3.scale.linear()
				.domain([-range,range])
				.range(yrange);

		var postive_area = d3.svg.area()
		    .x(function(d) {return xscale(d["t"]);})
		    .y0(0)
		    .y1(function(d) {return - Math.max(0, yscale(d["v"]));});

		var negative_area = d3.svg.area()
		    .x(function(d) {return xscale(d["t"]);})
		    .y0(function(d) {return - Math.min(0, yscale(d["v"]));})
		    .y1(0);

		var line = d3.svg.line()
					.x(function(d) {return xscale(d["t"]);})
					.y(function(d) {return - yscale(d["v"]);})
					.interpolate('linear');

		graph_node.append('svg:path')
			.attr({	"id": id+"-graph-positive-area",
				"d": postive_area(timeseries["samples"]),
				"stroke-width": 0,
				"fill": area_colors[0],
				"opacity": 0.5});

		graph_node.append('svg:path')
			.attr({	"id": id+"-graph-negative-area",
				"d": negative_area(timeseries["samples"]),
				"stroke-width": 0,
				"fill": area_colors[1],
				"opacity": 0.5});

		graph_node.append('svg:path')
			.attr({	"id": id+"-graph-line",
				"d": line(timeseries["samples"]),
				"stroke": "black",
				"stroke-width": 2,
				"fill": "none"});


		return ;
	}
}


// set up internal display state
gui_state = {
	"cursor-time": 0,

	"timeline-cursor-width": 30,
	"active-sub-timelines": 0,	
	"timelines": [],

	"visible-players": []
};

map_events = ["fight", "movement", "fountain-visit", "jungling", "laning", "rotation"];

for(var i = 0; i < 10; ++i)
	gui_state["visible-players"].push(false);

d3_elements = {} //Filled by creation methods

colors_reds = ["#FC9494", "#D35858", "#B23232", "#8E1515", "#630000"];
colors_greens = ["#76CA76", "#46A946", "#288E28", "#117211", "#004F00"];
colors_blues = ["#7771AF", "#504893", "#372E7C", "#221A63", "#0F0945"];
colors_yellows = ["#FCE694", "#D3B858", "#B29632", "#8E7415", "#634D00"];
colors_purples = ["#A573B9", "#83479B", "#6D2D86", "#581971", "#400857"];
colors_beiges = ["#F8FD99", "#E1E765", "#C0C73D", "#A1A820", "#7B8106"];

timeline_inset_left = 140;
timeline_height = 200;
timeline_height_inset_factor = 0.9;
timeline_separator_width = 5;
timeline_separator_offset_labels = 5;
timeline_kill_radius = 10;

color_scale_fights = d3.scale.ordinal()
			.domain(["encounter", "skirmish", "battle", "clash"])
			.range([colors_blues[1], colors_blues[2], colors_blues[3], colors_blues[4]]);

function getLocationCoordinates(position)
{
	switch(position)
	{
	case "top-rune":
		return {"x": 30 , y: 30};
	case "bottom-rune":
		return {"x": 70 , y: 70};

	case "toplane-dire-t1":
		return {"x": 20 , y: 20};

	case "midlane-dire-before-t1":
		return {"x": 50 , y: 40};

	case "botlane-radiant-t1":
		return {"x": 90 , y: 90};
	case "botlane-radiant-before-t1":
		return {"x": 80 , y: 90};


	case "dire-jungle":
		return {"x": 60 , y: 30};
	case "radiant-jungle":
		return {"x": 60 , y: 80};
	default: 
		console.log("unknown location", position);
		return {"x": 50 , y: 50};
	}
}

/*
	Init functions
Create the D3 elements used for the interface 
*/
/*function initTimeline(){
	loadSVG("img/timeline.svg", "timeline", function(){});
}*/

function initVisualisation(){
	initTimeline();
	initDiagram();
	initMap();
	initLegend();

	d3.selectAll("[data-id]")
		.on("click", function(){togglePlayer(this)});
}

function initTimeline(){

	var game_length = replay_data["header"]["length"];

	d3_elements["timeline-svg"] = d3.select("#timeline")
					.append("svg")
					.attr({ "id": "timeline-svg",
						"class": "svg-content",
						"viewBox": "-"+(timeline_inset_left+pregame_time)+" 0 "+game_length+" "+timeline_height});
	
	d3_elements["timeline-svg-foreground"] = d3.select("#timeline")
					.append("svg")
					.attr({ "id": "timeline-svg-foreground",
						"class": "svg-content-overlay",
						"viewBox": "-"+(timeline_inset_left+pregame_time)+" 0 "+game_length+" "+timeline_height});

	d3_elements["timeline-svg"].append("svg:rect")
					.attr({	"id": "timeline-separator",
						"x": (-pregame_time-timeline_separator_width),
						"y": 0,
						"width": timeline_separator_width,
						"height": timeline_height
					})

	d3_elements["timeline-drag"] = d3.behavior.drag()  
             .on('dragstart', function() { d3_elements["timeline-cursor"].style('fill', 'red'); })
             .on('drag', function() { 	
					gui_state["cursor-time"] = Math.min(Math.max(-pregame_time+gui_state["timeline-cursor-width"]/2, d3.event.x), game_length);
					updateDisplay();
				})
             .on('dragend', function() { d3_elements["timeline-cursor"].style('fill', 'black'); });


	var cursor_height = timeline_height;//*timeline_height_inset_factor;
	d3_elements["timeline-svg-foreground"]
                .append('svg:rect')
                .attr({
			'id': 'timeline-cursor',
			'x': 0,//overridden by time
                	'y': 0,//timeline_height* (1-timeline_height_inset_factor)/2,
                	'width': gui_state["timeline-cursor-width"],
                	'height': cursor_height
			})
                .call(d3_elements["timeline-drag"]);
	
	d3_elements["timeline-cursor"] = d3_elements["timeline-svg-foreground"].select("#timeline-cursor");

	gui_state["timelines"] =
		[
			{"label": "Time"},
			{"label": "Kills"},
			{"label": "Gold"},
			{"label": "Experience"},
			{"label": "Fights"},
		];

	gui_state["active-sub-timelines"] = 5;

	updateTimeline();
}

function createSubTimeline(sub_timeline, index){
	var sub_timeline_height = timeline_height * timeline_height_inset_factor / gui_state["active-sub-timelines"];
	var top_offset = timeline_height * (1-timeline_height_inset_factor)/2 + sub_timeline_height/2;
	var left_offset = -pregame_time - timeline_separator_width - timeline_separator_offset_labels;

	var game_length = replay_data["header"]["length"];
	//sync with update

	d3.select(this)
		.attr("transform", "translate(0,"+(top_offset+index*sub_timeline_height)+")");
	if(index %2 == 1)
	{
		d3.select(this)
			.append("svg:rect")
			.attr({	"x": -timeline_inset_left-pregame_time,
				"y": -sub_timeline_height/2,
				"width": timeline_inset_left + pregame_time + game_length,
				"height": sub_timeline_height,
				"class": "sub-timeline-alternate-background"
				});
	}
	
	d3.select(this)		
		.append("svg:text")
				.attr({	"x": left_offset,
					"y": 0,
					"class": "sub-timeline-label"})
				.text(sub_timeline["label"]);

	var group = d3.select(this)
		.append("g");

	var axis_scale = d3.scale.linear()
				.domain([-pregame_time, 0, game_length])
				.range([-pregame_time, 0, game_length]);

	var minute_ticks = [];
	for(var i = -60; i <= game_length; i+=60)
		minute_ticks.push(i);

	var time_domain = [-pregame_time, game_length];

	switch(sub_timeline["label"])
	{
	case "Time":

		var axis = d3.svg.axis()	
				.scale(axis_scale)
				.tickValues(minute_ticks)
				.orient("top")
				.tickFormat(function(tick){return tick/60;});

		group.append("g")
			.attr("id", "sub-timeline-time")
			.attr("transform", "translate(0,"+(sub_timeline_height/2)+")")			
			.call(axis);
		group.selectAll("#sub-timeline-time text")
			.attr("y", -sub_timeline_height/2);3

		var line_length = timeline_height * timeline_height_inset_factor * (gui_state["active-sub-timelines"]-1)/ gui_state["active-sub-timelines"];
		var lines= d3.svg.axis()	
				.scale(axis_scale)
				.tickValues(minute_ticks)
				.orient("top")
            			.tickSize(line_length, line_length)
            			.tickFormat("");
		
		group.append("g")
			.attr("id", "sub-timeline-time-lines")
        		.attr("transform", "translate(0," + (sub_timeline_height/2 + line_length) + ")")
			.call(lines);

		break;

	case "Kills":
		d3.select(this).selectAll(".timeline-kill").data(replay_data["indices"]["kills"])
			.enter()
			.append("svg:circle")
			.attr({	"class": function(kill){ return "timeline-kill "+replay_data["events"][kill]["team"]},
				"r": timeline_kill_radius,
				"cx": function(kill){return replay_data["events"][kill]["time"];},
				"cy": function(kill){return 0;}
				});


		break;

	case "Gold":
		var axis = d3.svg.axis()	
				.scale(axis_scale)
				.tickFormat("")
            			.tickSize(0, 0);

		group.append("g")
			.attr("id", "sub-timeline-gold-axis")
			.call(axis);
		
		var gold_data = replay_data["timeseries"]["gold-advantage"];

		generateGraph("sub-timeline-gold", group, gold_data, time_domain, [-sub_timeline_height/2, sub_timeline_height/2], [colors_greens[2], colors_reds[2]]);
		break;

	case "Experience":
		var axis = d3.svg.axis()	
				.scale(axis_scale)
				.tickFormat("")
            			.tickSize(0, 0);

		group.append("g")
			.attr("id", "sub-timeline-exp-axis")
			.call(axis);
		
		var exp_data = replay_data["timeseries"]["exp-advantage"];

		generateGraph("sub-timeline-exp", group, exp_data, time_domain, [-sub_timeline_height/2, sub_timeline_height/2], [colors_greens[2], colors_reds[2]]);

		break;

	case "Fights":
		d3.select(this).selectAll(".timeline-fight").data(replay_data["indices"]["fights"])
			.enter()
			.append("svg:rect")
			.attr({	"class": function(fight){ return "timeline-kill "+replay_data["events"][fight]["team"]},
				"x": function(fight){return replay_data["events"][fight]["time-start"];},
				"y": -sub_timeline_height/2,
				"width": function(fight){return replay_data["events"][fight]["time-end"] - replay_data["events"][fight]["time-start"];},
				"height": sub_timeline_height,
				"fill": function(fight){return color_scale_fights(replay_data["events"][fight]["intensity"]);}
				});

		break;
	}

}

function initDiagram(){
	loadSVG("img/diagram.svg", "diagram", 
			function()
			{
				svgPanZoom('#diagram-svg', {
		  			zoomEnabled: true,
		  			controlIconsEnabled: true
					});
				updateDiagram();
			});
}

function initMap(){
	//loadSVG("img/map.svg", "map", function(){});

	d3_elements["map"] = d3.select("#map");

	d3_elements["map-svg"] = d3.select("#map")
				.append("svg")
				.attr({ "id": "map-svg",
					"class": "svg-content",
					"viewBox": "0 0 "+100+" "+100});

	d3_elements["map-svg-foreground"] = d3.select("#map")
					.append("svg")
					.attr({ "id": "map-svg-foreground",
						"class": "svg-content-overlay",
						"viewBox": "0 0 "+100+" "+100
						});
;

	d3_elements["map-svg"].append("svg:image")
				.attr({	"id": "map-background",
					"xlink:href": "img/minimap.png",
					"x": "0",
					"y": "0",
					"width": "100",
					"height": "100"
					});
	updateMap();
}

function initLegend(){
	loadSVG("img/legend.svg", "legend", function(){});
}


/*
	Dynamic visualisation:
Update state of D3 objs to fit current data
*/

function updateDisplay()
{
	updateTimeline();
	updateDiagram();
	updateMap();
}

function updateTimeline(){
	d3_elements["timeline-cursor"].attr('x', gui_state["cursor-time"]- gui_state["timeline-cursor-width"]/2);

	var sub_timelines = d3_elements["timeline-svg"].selectAll(".sub-timeline").data(gui_state["timelines"], function(timeline){
					return timeline["label"];
				});
	sub_timelines.enter()
		.append("g")
		.attr("class", "sub-timeline")
		.each(createSubTimeline);

	sub_timelines.each(updateSubTimeline);

	sub_timelines.exit()
		.remove();
}

function updateSubTimeline(sub_timeline, index){
	//sync with create
	var sub_timeline_height = timeline_height * timeline_height_inset_factor / gui_state["active-sub-timelines"];
	var top_offset = timeline_height * (1-timeline_height_inset_factor)/2 + sub_timeline_height/2;
	var left_offset = -pregame_time - timeline_separator_width - timeline_separator_offset_labels;

	d3.select(this)
		.attr("transform", "translate(0,"+(top_offset+index*sub_timeline_height)+")");
}

function updateMap(){
	var map_events = d3_elements["map-svg"].selectAll(".event")
				.data(d3.entries(replay_data["events"]).filter(function(d){return filterEventsMap(d.value)}),
					function(entry){
						return entry.key;
						});
	map_events.enter()
		.append("g")
			.attr({	"class": "event"
				})
			.each(function(entry){createMapEvent.call(this, entry.value);});

	map_events.each(function(entry){updateMapEvent.call(this, entry.value);});

	map_events.exit()
		.remove();
}

function filterEventsMap(event){
	if(map_events.indexOf(event["type"]) == -1)
		return false;
	
	if(event.hasOwnProperty("time"))
	{
		return 	event["time"] >= (gui_state["cursor-time"] - gui_state["timeline-cursor-width"]/2) &&
			event["time"] <= (gui_state["cursor-time"] + gui_state["timeline-cursor-width"]/2);
	}
	else if(event.hasOwnProperty("time-start") && event.hasOwnProperty("time-end"))
	{
		return 	event["time-end"] >= (gui_state["cursor-time"] - gui_state["timeline-cursor-width"]/2) &&  
			event["time-start"] <= (gui_state["cursor-time"] + gui_state["timeline-cursor-width"]/2);
	}
	else
	{
		console.log("Corrupted event");
		return false;
	}
}

function createMapEvent(event){

	var group = d3.select(this);

	position = getLocationCoordinates(event["location"]);
	var circle = group.append("svg:circle")
		.attr({
			"cx": position.x,
			"cy": position.y,
			"r": 7.5,
			"opacity": 0.7
			});
	switch(event["type"])
	{
	case "fight":
		circle.attr({
			"fill": color_scale_fights(event["intensity"]),
			});
		break;
	case "movement":
		circle.attr({
			"fill": color_scale_fights(color_blues[0]),
			});
		break;
	case "fountain-visit":
		circle.attr({
			"fill": "white",
			});
		break;
	case "jungling":
		circle.attr({
			"fill": color_scale_fights(beiges[3]),
			});
		break;
	case "laning":
		circle.attr({
			"fill": "lightgrey",
			});
		break;
	case "rotation":
		circle.attr({
			"fill": "red",
			});
		break;
	}
}

function updateMapEvent(event){
}

function updateDiagram()
{
	var player_layers = d3.select("#diagram").selectAll("[player-id]").data(gui_state["visible-players"]);
	player_layers.attr("visibility", function(d){
				if(d)
				{
					return "visible";
				}
				else
				{
					return "hidden";
				}
			});

}

function togglePlayer(player)
{
	var index = parseInt(player.dataset["id"]);
	gui_state["visible-players"][index] = !gui_state["visible-players"][index];
	updateDisplay();
}

function loadSVG(file, id, callback)
{
	d3.xml(file, "image/svg+xml", function(xml) {
		    var imported_node = document.importNode(xml.documentElement, true);
			var svg_id = id + "-svg";
			imported_node.setAttribute("id", svg_id);
		    var id_string = "#"+id;
		    d3.select(id_string).node().appendChild(imported_node);
		    d3.select("#"+svg_id).attr({
		    "class": "svg-content"
		  });
			callback();			
		});
}



function main()
{
	loadData(initVisualisation);
}

window.onload = main;


