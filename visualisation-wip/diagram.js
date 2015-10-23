visible_players = [];

for(var i = 0; i < 10; ++i)
	visible_players.push(false);

function updatePlayers(data)
{
	d3.select("#viz").selectAll(".player")
		.data(data)
		.attr("visibility", function(d){
				if(d)
					return "visible";
				else
					return "hidden";
			});

}

function showPlayer(player)
{
	for(var i = 0; i < 10; ++i)
	{
		if(parseInt(player.dataset["id"]) == i)
			visible_players[i] = true;
		else
			visible_players[i] = false;
	}
	updatePlayers(visible_players);
};

d3.xml("diagram_base.svg", "image/svg+xml", function(xml) {
    var importedNode = document.importNode(xml.documentElement, true);
    d3.select("#viz").node().appendChild(importedNode);
    d3.select("svg").attr({
    "class": "svg-content",
    "width": "100%",
    "height": "100%"
  });
	
	updatePlayers(visible_players);    


    d3.selectAll(".player")
        .on("click", function(){showPlayer(this)});
    
    
    d3.select("#download")
     .on("mouseover", function(){
        var html = d3.select("svg")
            .attr("version", 1.1)
            .attr("xmlns", "http://www.w3.org/2000/svg")
            .node().parentNode.innerHTML;
        
        d3.select(this)
            .attr("href-lang", "image/svg+xml")
            .attr("href", "data:image/svg+xml;base64,\n" + btoa(html));
    });
    
});

