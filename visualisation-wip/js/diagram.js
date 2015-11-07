/* Declare global variables*/

pregame_time = 90;

replay_data = {};

function buildDataIndices()
{
	replay_data["indices"] = {};
	
}


// set up internal display state
gui_state = {
	"cursor-time": 0,

	"timeline-cursor-width": 30,
	"active-sub-timelines": 0,	
	"timelines": [],

	"visible-players": []
};

for(var i = 0; i < 10; ++i)
	gui_state["visible-players"].push(false);

d3_elements = {
	"timeline-svg": null,	
	"timeline-cursor": null,
	"timeline-drag": null
}

timeline_inset_left = 100;
timeline_height = 200;
timeline_height_inset_factor = 0.9;
timeline_separator_width = 5;
timeline_separator_offset_labels = 5;

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
	d3_elements["timeline-svg"]
                .append('svg:rect')
                .attr({
			'id': 'timeline-cursor',
			'x': 0,//overridden by time
                	'y': 0,//timeline_height* (1-timeline_height_inset_factor)/2,
                	'width': gui_state["timeline-cursor-width"],
                	'height': cursor_height
			})
                .call(d3_elements["timeline-drag"]);
	
	d3_elements["timeline-cursor"] = d3_elements["timeline-svg"].select("#timeline-cursor");

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
	//sync with update

	d3.select(this)
		.attr("transform", "translate(0,"+(top_offset+index*sub_timeline_height)+")")
		.attr("height", sub_timeline_height)
		.append("svg:text")
			.attr({	"x": left_offset,
				"y": 0,
				"class": "sub-timeline-label"})
			.text(sub_timeline["label"]);

	var group = d3.select(this)
		.append("g");

	var game_length = replay_data["header"]["length"];
	var axis_scale = d3.scale.linear()
				.domain([-pregame_time, 0, game_length])
				.range([-pregame_time, 0, game_length]);

	var minute_ticks = [];
	for(var i = -60; i <= game_length; i+=60)
		minute_ticks.push(i);

	switch(sub_timeline["label"])
	{
	case "Time":
		group.attr("id", "sub-timeline-time")



		var axis = d3.svg.axis()	
				.scale(axis_scale)
				.tickValues(minute_ticks)
				.orient("top")
				.tickFormat(function(tick){return tick/60;});

		group.call(axis);

		break;

	case "Kills":
		group.attr("id", "sub-timeline-kills")
		var axis = d3.svg.axis()	
				.scale(axis_scale)
				.tickValues(minute_ticks)
				.orient("top")
				.tickFormat("");

		group.call(axis);
		break;

	case "Gold":
		break;

	case "Experience":
		break;

	case "Fights":
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
	loadSVG("img/map.svg", "map", function(){});
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
	d3.json("data/monkey_vs_nip.json",function(error, data){
			replay_data = data;
			buildDataIndices();
			initVisualisation();
			}
		);
}

window.onload = main;


