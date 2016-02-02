$(document).ready(function(){

	var pathname = "data/matchlists/lord_zera.json"
	$.getJSON(pathname, function(data) {
		drawTable(data["match-list"]);

	});

	function drawTable(data) {
    for (var i = 0; i < data.length; i++) {
        drawRow(data[i]);
        drawRow2(data[i]);
    	}
    }

    function drawRow(rowData) {
    var row = $("<tr />")
    $("#large-match-list").append(row); 
    /* status */
    var results_td = $("<td />");
    row.append($(results_td));
    var my_circle = $("<a> </a>");
    results_td.append(my_circle);
    my_circle.addClass("circle");
    if (rowData["status"]=="green"){
        my_circle.attr("id","green-circle");
    } else if (rowData["status"]=="orange"){
        my_circle.attr("id","orange-circle");
    }
    else if ((rowData["status"]=="red")){
        my_circle.attr("id","red-circle");
    }
    else {
        my_circle.attr("id","black-circle");
    }
    /* match-id*/
    row.append($("<td>" + rowData["match-id"] + "</td>"));
    /* date */
    row.append($("<td>" + rowData["date"] + "</td>"));
    /* time*/
    row.append($("<td>" + rowData["time"] + "</td>"));
    /* hero image */
    var hero_td = $("<td />");
    row.append($(hero_td));
    var hero_div = $("<div> </div>");
    hero_td.append(hero_div);
    hero_div.addClass("image-thumbnail");
    var hero_img = $("<img>");
    hero_div.append(hero_img);
    var hero_str = "img/heros/thumbnails/" + rowData["hero"] + ".png" 
    hero_img.attr("src",hero_str);
    hero_img.attr("style","height:37px");
    /* duration */
    row.append($("<td>" + rowData["duration"] + "</td>"));
    /* result */
    var result = rowData["result"]
    result = capitalizeFirstLetter(result)
    row.append($("<td>" + result + "</td>"));
    /* download */
    var download_td = $("<td />");
    row.append($(download_td));
    var download_btn = $("<button></button>");
    download_td.append(download_btn);
    download_btn.addClass("btn btn-default");
    download_btn.html("<span class='download_span'></span>" + " " + rowData["match-id"]+".dem");
    $(".download_span").addClass("glyphicon glyphicon-download-alt")
    if (rowData["download"] == 1){
    	download_btn.addClass("default");
    	}
    else{
		download_btn.addClass("disabled");

    	}

	}

	function drawRow2(rowData) {
    var row = $("<tr />")
    $("#small-match-list").append(row); 
    /* status */
    var results_td = $("<td />");
    row.append($(results_td));
    var my_circle = $("<a> </a>");
    results_td.append(my_circle);
    my_circle.addClass("circle");
    if (rowData["status"]=="green"){
        my_circle.attr("id","green-circle");
    } else if (rowData["status"]=="orange"){
        my_circle.attr("id","orange-circle");
    }
    else if ((rowData["status"]=="red")){
        my_circle.attr("id","red-circle");
    }
    else {
        my_circle.attr("id","black-circle");
    }
    /* match id and result */
    var result = rowData["result"]
    result = capitalizeFirstLetter(result)
    row.append($("<td>" + rowData["match-id"] + "</br>" + result + "</td>"));
    row.append($("<td>" + rowData["date"] + "</br>" +  rowData["time"] +  "</td>"));
    /* hero image */
    var hero_td = $("<td />");
    row.append($(hero_td));
    var hero_div = $("<div> </div>");
    hero_td.append(hero_div);
    hero_div.addClass("image-thumbnail");
    var hero_img = $("<img>");
    hero_div.append(hero_img);
    var hero_str = "img/heros/thumbnails/" + rowData["hero"] + ".png" 
    hero_img.attr("src",hero_str);
    hero_img.attr("style","height:37px");
	}

	function capitalizeFirstLetter(string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
}

});
