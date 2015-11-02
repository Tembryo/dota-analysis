visible_players = [];

for(var i = 0; i < 10; ++i)
	visible_players.push(false);

function updatePlayers(data)
{
	d3.select("#diagram").selectAll("[player-id]")
		.data(data)
		.attr("visibility", function(d){
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
	visible_players[index] = !visible_players[index];
	updatePlayers(visible_players);
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
		    "class": "svg-content",
		    "width": "100%",
		    "height": "100%",
		  });
			callback();			
		});
}

function main()
{
	loadSVG("img/timeline.svg", "timeline", function(){});
	loadSVG("img/diagram.svg", "diagram", 
			function()
			{
				svgPanZoom('#diagram-svg', {
		  			zoomEnabled: true,
		  			controlIconsEnabled: true
					});
				updatePlayers(visible_players);
			});
	loadSVG("img/legend.svg", "legend", function(){});
	loadSVG("img/map.svg", "map", function(){});



	d3.selectAll("[data-id]")
		.on("click", function(){togglePlayer(this)});
}

window.onload= main;


