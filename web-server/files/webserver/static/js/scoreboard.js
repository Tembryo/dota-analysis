var entry = "IMR";

function getValue(entry, d)
{
    switch(entry)
    {
        case "IMR":
            if(d["score_data"])
                return d["score_data"]["IMR"]["score"];
            else
                return 0;
        case "Mechanics":
            return d["score_data"]["mechanics"]["score"];
        case "Farming":
            return d["score_data"]["farming"]["score"];
        case "Fighting":
            return d["score_data"]["fighting"]["score"]; 
        default:
            return 0;
    }
}

$(document).ready(function(){	

	var results_path = "/api/results?matchid="+match_id;
	var header_path = "/api//match-details/"+match_id;
    var data = {};

	$.getJSON(results_path, function(json_results) {
		data["results"] = json_results;
		$.getJSON(header_path, function(response) {
            if(response["result"] === "success")
            {
    			data["details"] = response["details"];
                drawScoreboard(data);
            }
            else console.log("bad response", response)

		});
	});
	
    $('#select-imr').click(function(e) {
        entry = "IMR";
        drawScoreboard(data);
        e.preventDefault();// prevent the default anchor functionality
    });
    $('#select-mechanics').click(function(e) {
        entry = "Mechanics";
        drawScoreboard(data);
        e.preventDefault();// prevent the default anchor functionality
    });
    $('#select-farming').click(function(e) {
        entry = "Farming";
        drawScoreboard(data);
        e.preventDefault();// prevent the default anchor functionality
    });
    $('#select-fighting').click(function(e) {
        entry = "Fighting";
        drawScoreboard(data);
        e.preventDefault();// prevent the default anchor functionality
    });
});

function drawScoreboard(data)
{
	var pairs = [];
	for(var i = 0; i < 5; ++i)
	{
		pairs.push({"radiant": null, "dire": null });
	}
	var avg_value = 0;
    var radiant_avg_value = 0;
    var dire_avg_value = 0;
	for(var i = 0; i < data["results"].length; ++i)
	{
		var player = {};
		player["score"] = data["results"][i];
        for(var j = 0; j < data["details"]["players"].length; ++j)
        {
            var detail_slot = data["details"]["players"][j]["player_slot"];
            if (detail_slot >= 128) 
                detail_slot = detail_slot - 128 +5;

            if(detail_slot == player["score"]["player_data"]["slot"])
            {
                player["details"] = data["details"]["players"][j];
                break;
            }
        }

		var slot = player["score"]["player_data"]["slot"];
		var row_id =  slot % 5;
		var team;
		if(slot < 5)
		{
			team = "radiant";
            radiant_avg_value += getValue(entry, player["score"]);
		}
		else 
		{
			team = "dire";
            dire_avg_value += getValue(entry, player["score"]);
		}


		pairs[row_id][team] = player;

	}
    radiant_avg_value /= data["results"].length/2;
    dire_avg_value /= data["results"].length/2;

    var small_table = d3.select("#players-table").selectAll(".score-row").data(pairs, function(pair,i){
                return i;
            });

    small_table.enter()
        .append("tr")
        .attr("class", "score-row")
        .each(createRow);

    small_table.each(updateRow);

    d3.selectAll(".value-label")
        .text(entry);

    d3.select("#radiant-average-value")
        .text(Math.floor(radiant_avg_value));

    d3.select("#dire-average-value")
        .text(Math.floor(dire_avg_value));
}


function createRow(pair)
{
    var row = d3.select(this);

    row.append("td")
        .append("div")
            .attr("class","image-thumbnail")
            .append("img")
                .attr("src", function(d){if(pair["radiant"]) return picture_by_name[pair["radiant"]["score"]["player_data"]["hero"]];})
                .attr("style", "height:37px");

    row.append("td")
        .text(function(d){if(pair["dire"]) return pair["radiant"]["details"]["player_name"];});

    row.append("td")
        .attr("id","radiant-value");

    row.append("td")

    row.append("td")
        .append("div")
            .attr("class","image-thumbnail")
            .append("img")
                .attr("src", function(d){if(pair["dire"]) return picture_by_name[pair["dire"]["score"]["player_data"]["hero"]];})
                .attr("style", "height:37px");

    row.append("td")
        .text(function(d){if(pair["dire"]) return pair["dire"]["details"]["player_name"];});

    row.append("td")
        .attr("id","dire-value");
}

function updateRow(pair)
{
    var row = d3.select(this);

    row.select("#radiant-value").text(function(d){if(pair["radiant"]) return Math.floor(getValue(entry, pair["radiant"]["score"]));});
    row.select("#dire-value").text(function(d){if(pair["dire"]) return Math.floor(getValue(entry, pair["dire"]["score"]));});

}