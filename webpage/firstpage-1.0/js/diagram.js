visible_players = [];

for(var i = 0; i < 10; ++i)
	visible_players.push(false);

function updatePlayers(data)
{
	d3.select("#viz").selectAll("[player-id]")
		.data(data)
		.attr("visibility", function(d){
				if(d)
				{
					console.log("visible");
					console.log(this);
					return "visible";
				}
				else
				{
					console.log("hidden");
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

function main()
{
	d3.xml("img/diagram.svg", "image/svg+xml", function(xml) {
	    var importedNode = document.importNode(xml.documentElement, true);
	    d3.select("#viz").node().appendChild(importedNode);
	    d3.selectAll("svg").attr({
	    "class": "svg-content",
	    "width": "100%",
	    "height": "100%"
	  });
            updatePlayers(visible_players);    

	    d3.selectAll("[data-id]")
		.on("click", function(){togglePlayer(this)});
	});

	d3.xml("img/legend.svg", "image/svg+xml", function(xml) {
	    var importedNode = document.importNode(xml.documentElement, true);
	    d3.select("#leg").node().appendChild(importedNode);
	    d3.selectAll("svg").attr({
	    "class": "svg-content",
	    "width": "100%",
	    "height": "100%"
	  });
	});
}

main();


