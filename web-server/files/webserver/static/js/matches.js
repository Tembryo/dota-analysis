match_list = [];

d3.json("/api/matches"
		,function(error, data){
			match_list = data;
            updateList();
		});

function updateList()
{
	var matches = d3.select("#matches-list").selectAll(".match").data(match_list, function(file){
					return file;
				});
	matches.enter()
		.append("li")
		.attr("class", "match")
		    .append("a")
            .attr("href", function(file){return "/match/"+file;})
            .text( function(file){return file;})

	matches.exit()
		.remove();
}
