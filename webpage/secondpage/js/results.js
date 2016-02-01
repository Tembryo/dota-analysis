$(document).ready(function(){	
	var pathname = "data/results/2097372263_Zera.json"
	$.getJSON(pathname, function(json) {
    	$("h1").text(json["user"] + ": " +json["id"])
    	$("h2").text(json["MMR"])
		$("#hero-img").attr("src","img/heros/thumbnails/"+json["hero"]+".png")
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
		$(id_str).attr("src","img/logos/" + url_str + ".png")
	});
});