$(document).ready(function(){	
	var pathname;
	if (result_id < 0)
	{
		pathname = "/static/data/example_results/example"+example+".json";
		$.getJSON(pathname, function(json) {
	    	$("h1").text(json["user"] + ": " +json["id"])
	    	$(".results-header-small").text(json["MMR"])
			$("#hero-img").attr("src","/static/img/heroes/pictures/"+json["hero"]+".png")
			$("#skill-bar1").attr("valuenow",String(json["last_hits"]))
			$("#skill-bar1").attr("style","width:"+ String(json["last_hits"] + "%"))
			$("#skill-bar2").attr("valuenow",String(json["fights"]))
			$("#skill-bar2").attr("style","width:"+ String(json["fights"] + "%"))
			$("#skill-bar3").attr("valuenow",String(json["movement"]))
			$("#skill-bar3").attr("style","width:"+ String(json["movement"] + "%"))
			$("#skill-bar4").attr("valuenow",String(json["skill"]))
			$("#skill-bar4").attr("style","width:"+ String(json["skill"] + "%"))
			var category = json["category"];
			var url_str = "block" + String(category) + "selected";
			var id_str = "#block" + String(category);
			$(id_str).attr("src","/static/img/logos/" + url_str + ".png")
		});
	}
	else
	{
		pathname = "/api/result/"+result_id;
		$.getJSON(pathname, function(json) {
	    	$("h1").text(json["user"] + ": " +json["player_data"]["steamid"])
	    	$(".results-header-small").text(json["score_data"]["MMR"])
			$("#hero-img").attr("src","/static/img/heroes/pictures/"+json["player_data"]["hero"]+".png")
			$("#skill-bar1").attr("valuenow",String(json["last_hits"]))
			$("#skill-bar1").attr("style","width:"+ String(json["last_hits"] + "%"))
			$("#skill-bar2").attr("valuenow",String(json["fights"]))
			$("#skill-bar2").attr("style","width:"+ String(json["fights"] + "%"))
			$("#skill-bar3").attr("valuenow",String(json["movement"]))
			$("#skill-bar3").attr("style","width:"+ String(json["movement"] + "%"))
			$("#skill-bar4").attr("valuenow",String(json["skill"]))
			$("#skill-bar4").attr("style","width:"+ String(json["skill"] + "%"))
			var category = json["category"];
			var url_str = "block" + String(category) + "selected";
			var id_str = "#block" + String(category);
			$(id_str).attr("src","/static/img/logos/" + url_str + ".png")
		});
	}

	
});