/* Declare global variables*/

pregame_time = 90;

replay_data = {};

// set up internal display state
gui_state = {
	"cursor-time": 0,

	"timeline-cursor-width": 30,

	"visible-players": []
};

for(var i = 0; i < 10; ++i)
	gui_state["visible-players"].push(false);

d3_elements = {
	"timeline-svg": null,	
	"timeline-cursor": null,
	"timeline-drag": null
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
	var inset_left = 100;
	var inset_left = 100;
	var timeline_height = 100;
	var game_length = replay_data["header"]["length"];
	d3_elements["timeline-svg"] = d3.select("#timeline")
					.append("svg")
					.attr({ "id": "timeline-svg",
						"class": "svg-content",
						"viewBox": "-"+(inset_left+pregame_time)+" 0 "+game_length+" "+timeline_height});

	var separator_width = 5;
	d3_elements["timeline-svg"].append("svg:rect")
					.attr({	"id": "timeline-separator",
						"x": (-pregame_time-separator_width),
						"y": 0,
						"width": separator_width,
						"height": timeline_height
					})

	d3_elements["timeline-drag"] = d3.behavior.drag()  
             .on('dragstart', function() { d3_elements["timeline-cursor"].style('fill', 'red'); })
             .on('drag', function() { 	
					gui_state["cursor-time"] = Math.min(Math.max(-pregame_time+gui_state["timeline-cursor-width"]/2, d3.event.x), game_length);
					updateDisplay();
				})
             .on('dragend', function() { d3_elements["timeline-cursor"].style('fill', 'black'); });


	var cursor_height = timeline_height*0.8;
	d3_elements["timeline-svg"]
                .append('svg:rect')
                .attr({
			'id': 'timeline-cursor',
			'x': 0,//overridden by time
                	'y': timeline_height*0.1,
                	'width': gui_state["timeline-cursor-width"],
                	'height': cursor_height
			})
                .call(d3_elements["timeline-drag"]);
	
	d3_elements["timeline-cursor"] = d3_elements["timeline-svg"].select("#timeline-cursor");

	updateTimeline();
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

function updateTimeline()
{
	d3_elements["timeline-cursor"].attr('x', gui_state["cursor-time"]- gui_state["timeline-cursor-width"]/2);
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
			initVisualisation();
			}
		);
}

window.onload = main;


