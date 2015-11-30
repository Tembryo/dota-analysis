match_list = [];

d3.json("/api/matches"
		,function(error, data){
			match_list = data;
            updateList();
		});

function updateList()
{
	var matches = d3.select("#matches-list").selectAll(".match").data(match_list, function(match){
					return match.id;
				});
	matches.enter()
		.append("li")
		.attr("class", "match")
		    .append("a")
            .attr("href", function(file){return "/match/"+file["match-string"];})
            .text( function(file)
                    {
                        str = file["id"];
                        if (file["teams"]["0"]["name"].trim().length != 0 || file["teams"]["1"]["name"].trim().length != 0)
                            str += ": "+ file["teams"]["0"]["name"] +" vs. "+file["teams"]["1"]["name"];
                        return str;
                    });

	matches.exit()
		.remove();
}
