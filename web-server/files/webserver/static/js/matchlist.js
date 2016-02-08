var refresh_interval = 2000;

$(document).ready(function(){
    load();
});


function load()
{
    var pathname = "/api/history?start="+start+"&end="+(start+range);

    $.getJSON(pathname, function(data)
    {
        if(data.length == range)
        {
            d3.selectAll("#scroll-right")
                .classed("disabled", false)
                .on("click", function (){start+= range; load()});
        }   
        else
        {
            d3.selectAll("#scroll-right")
                .classed("disabled", true)
                .on("click", null);
        }    
       d3.selectAll("#range")
            .text((start+1)+" - "+(start+data.length));

        drawTables(data);
    });

    if(start >= range)
    {
        d3.selectAll("#scroll-left")
            .classed("disabled", false)
            .on("click", function (){start-= range; load()});
    }   
    else
    {
        d3.selectAll("#scroll-left")
            .classed("disabled", true)
            .on("click", null);
    }            
}


function drawTables(data) {

    var n_processing = 0;
    for(var i = 0; i < data.length; ++i)
    {
        if( data[i]["match_status"] ===  "requested" ||
            data[i]["match_status"] ===  "retrieving" ||
            data[i]["match_status"] ===  "uploaded" ||
            data[i]["match_status"] ===  "retrieved" ||
            data[i]["match_status"] ===  "extracting" ||
            data[i]["match_status"] ===  "analysing")
            n_processing ++;
    }
    if(n_processing > 0)
    {
        console.log("refreshing in ", refresh_interval);
        setTimeout(load, refresh_interval);
    }

    var large_table = d3.select("#large-match-list").selectAll(".match").data(data, function(match){
                return match["match_id"];
            });

    large_table.enter()
        .append("tr")
        .attr("class", "match")
        .each(createLargeRow);
    large_table.order();

    large_table.each(updateRow);

    large_table.exit()
        .remove();


    var small_table = d3.select("#small-match-list").selectAll(".match").data(data, function(match){
                return match["match_id"];
            });

    small_table.enter()
        .append("tr")
        .attr("class", "match")
        .each(createSmallRow);
    small_table.order();

    small_table.each(updateRow);

    small_table.exit()
        .remove();
}

var icon_pictures = {
    "102":  "/static/img/heroes/pictures/Abaddon.png",
    "73":   "/static/img/heroes/pictures/Alchemist.png",
    "68":   "/static/img/heroes/pictures/Ancient_Apparition.png",
    "1":    "/static/img/heroes/pictures/Antimage.png",
    "113":  "/static/img/heroes/pictures/Arc Warden.png",
    "2":    "/static/img/heroes/pictures/Axe.png",
    "3":    "/static/img/heroes/pictures/Bane.png",
    "65":   "/static/img/heroes/pictures/Batrider.png",
    "38":   "/static/img/heroes/pictures/Beastmaster.png",
    "4":    "/static/img/heroes/pictures/Bloodseeker.png",
    "62":   "/static/img/heroes/pictures/Bounty_Hunter.png",
    "78":   "/static/img/heroes/pictures/Brewmaster.png",
    "99":   "/static/img/heroes/pictures/Bristleback.png",
    "61":   "/static/img/heroes/pictures/Broodmother.png",
    "96":   "/static/img/heroes/pictures/Centaur_Warrunner.png",
    "81":   "/static/img/heroes/pictures/Chaos_Knight.png",
    "66":   "/static/img/heroes/pictures/Chen.png",
    "56":   "/static/img/heroes/pictures/Clinkz.png",
    "5":    "/static/img/heroes/pictures/Crystal Maiden.png",
    "55":   "/static/img/heroes/pictures/Dark Seer.png",
    "50":   "/static/img/heroes/pictures/Dazzle.png",
    "43":   "/static/img/heroes/pictures/Death_Prophet.png",
    "87":   "/static/img/heroes/pictures/Disruptor.png",
    "69":   "/static/img/heroes/pictures/Doom.png",
    "49":   "/static/img/heroes/pictures/Dragon_Knight.png",
    "6":          "/static/img/heroes/pictures/Drow_Ranger.png",
    "7":          "/static/img/heroes/pictures/Earthshaker.png",
    "103":          "/static/img/heroes/pictures/Elder_Titan.png",
    "107":          "/static/img/heroes/pictures/Earth_Spirit.png",
    "106":         "/static/img/heroes/pictures/Enchantress.png",
    "58":          "/static/img/heroes/pictures/Ember_Spirit.png",
    "33":               "/static/img/heroes/pictures/Enigma.png",
    "53":               "/static/img/heroes/pictures/Furion.png",
    "41":        "/static/img/heroes/pictures/Faceless Void.png",
    "72":           "/static/img/heroes/pictures/Gyrocopter.png", 
    "59":               "/static/img/heroes/pictures/Huskar.png",
    "74":              "/static/img/heroes/pictures/Invoker.png",
    "64":               "/static/img/heroes/pictures/Jakiro.png",
    "8":           "/static/img/heroes/pictures/Juggernaut.png",
    "90":  "/static/img/heroes/pictures/Keeper_of_the_Light.png",
    "23":               "/static/img/heroes/pictures/Kunkka.png",
    "104":     "/static/img/heroes/pictures/Legion_Commander.png",
    "52":              "/static/img/heroes/pictures/Leshrac.png",
    "31":                 "/static/img/heroes/pictures/Lich.png",
    "54":         "/static/img/heroes/pictures/Life Stealer.png",
    "25":                 "/static/img/heroes/pictures/Lina.png",
    "26":                 "/static/img/heroes/pictures/Lion.png",
    "80":           "/static/img/heroes/pictures/Lone_Druid.png",
    "48":                 "/static/img/heroes/pictures/Luna.png",
    "77":                "/static/img/heroes/pictures/Lycanthrope.png",
    "97":            "/static/img/heroes/pictures/Magnataur.png",
    "94":               "/static/img/heroes/pictures/Medusa.png",
    "82":                "/static/img/heroes/pictures/Meepo.png",
    "9":               "/static/img/heroes/pictures/Mirana.png",
    "10":            "/static/img/heroes/pictures/Morphling.png",
    "89":           "/static/img/heroes/pictures/Naga Siren.png",
    "36":            "/static/img/heroes/pictures/Necrolyte.png",
    "11":            "/static/img/heroes/pictures/Shadow_Fiend.png",
    "60":        "/static/img/heroes/pictures/Night_Stalker.png",
    "88":         "/static/img/heroes/pictures/Nyx Assassin.png",
    "76":   "/static/img/heroes/pictures/Obsidian Destroyer.png",
    "84":            "/static/img/heroes/pictures/Ogre_Magi.png",
    "57":           "/static/img/heroes/pictures/Omniknight.png",
    "111":               "/static/img/heroes/pictures/Oracle.png",
    "44":     "/static/img/heroes/pictures/Phantom_Assassin.png",
    "12":       "/static/img/heroes/pictures/Phantom_Lancer.png",
    "110":              "/static/img/heroes/pictures/Phoenix.png",
    "13":                 "/static/img/heroes/pictures/Puck.png",
    "14":                "/static/img/heroes/pictures/Pudge.png",
    "45":                "/static/img/heroes/pictures/Pugna.png",
    "39":          "/static/img/heroes/pictures/Queen of Pain.png",
    "51":           "/static/img/heroes/pictures/Rattletrap.png",
    "15":                "/static/img/heroes/pictures/Razor.png",
    "32":                 "/static/img/heroes/pictures/Riki.png",
    "86":               "/static/img/heroes/pictures/Rubick.png",
    "16":            "/static/img/heroes/pictures/Sand_King.png",
    "79":         "/static/img/heroes/pictures/Shadow_Demon.png",
    "27":        "/static/img/heroes/pictures/Shadow_Shaman.png",
    "98":             "/static/img/heroes/pictures/Timbersaw.png",
    "75":             "/static/img/heroes/pictures/Silencer.png",
    "42":        "/static/img/heroes/pictures/Wraith_King.png",
    "101":        "/static/img/heroes/pictures/Skywrath_Mage.png",
    "28":              "/static/img/heroes/pictures/Slardar.png",
    "93":                "/static/img/heroes/pictures/Slark.png",
    "35":               "/static/img/heroes/pictures/Sniper.png",
    "67":              "/static/img/heroes/pictures/Spectre.png", 
    "71":       "/static/img/heroes/pictures/Spirit_Breaker.png",
    "17":         "/static/img/heroes/pictures/Storm_Spirit.png",
    "18":                 "/static/img/heroes/pictures/Sven.png",
    "105":              "/static/img/heroes/pictures/Techies.png",
    "46":     "/static/img/heroes/pictures/Templar Assassin.png",
    "109":          "/static/img/heroes/pictures/Terrorblade.png",
    "29":           "/static/img/heroes/pictures/Tidehunter.png",
    "34":               "/static/img/heroes/pictures/Tinker.png",
    "19":                 "/static/img/heroes/pictures/Tiny.png",
    "83":               "/static/img/heroes/pictures/Treant.png",
    "95":        "/static/img/heroes/pictures/Troll_Warlord.png",
    "100":                 "/static/img/heroes/pictures/Tusk.png",
    "85":              "/static/img/heroes/pictures/Undying.png",
    "20":       "/static/img/heroes/pictures/Vengeful Spirit.png",
    "40":           "/static/img/heroes/pictures/Venomancer.png",
    "47":                "/static/img/heroes/pictures/Viper.png", 
    "92":               "/static/img/heroes/pictures/Visage.png",
    "70":                 "/static/img/heroes/pictures/Ursa.png",
    "37":              "/static/img/heroes/pictures/Warlock.png",
    "63":               "/static/img/heroes/pictures/Weaver.png",
    "21":           "/static/img/heroes/pictures/Windrunner.png",
    "112":        "/static/img/heroes/pictures/Winter Wyvern.png",
    "91":                 "/static/img/heroes/pictures/Wisp.png",
    "30":         "/static/img/heroes/pictures/Witch_Doctor.png",
    "22":                 "/static/img/heroes/pictures/Zeus.png"
};

function formatDuration(seconds)
{
    var date = new Date(null);
    date.setSeconds(seconds); // specify value for SECONDS here
    return date.toISOString().substr(11, 8);
}

function createSmallRow(data)
{
    var row = d3.select(this);

    var result = (data["data"]["winner"]? "Win": "Loss");
    var id_result =row.append("td");
        id_result.append("a")
            .attr("class", "match-link")
            .attr("href", "/match/"+data["match_id"])
            .text(data["match_id"]);
        id_result.append("br");
        id_result.append("span")
            .text(result);;

    var date = moment.unix(data["data"]["start_time"]);
    var day_time = row.append("td");
        day_time.append("span")
            .text(date.format("DD/MM/YYYY"));
        day_time.append("br");
        day_time.append("span")
            .text(date.format("HH:mm:ss"));

    row.append("td")
        .append("div")
            .attr("class","image-thumbnail")
            .append("img")
                .attr("src", icon_pictures[data["data"]["hero_id"]])
                .attr("style", "height:37px");

    row.append("td")
        .append("button")
            .attr("id", "match-button");

    row.append("td")
        .attr("class", "default")
        .append("a")
            .attr("id", "download-icon");
}

function createLargeRow(data)
{
    var row = d3.select(this);
        
    row.append("td")
        .append("a")
            .attr("class", "match-link")
            .attr("href", "/match/"+data["match_id"])
            .text(data["match_id"]);

    var date = moment.unix(data["data"]["start_time"]);
    row.append("td")
        .text(date.format("DD/MM/YYYY"));

    row.append("td")
        .text(date.format("HH:mm:ss"));

    row.append("td")
        .append("div")
            .attr("class","image-thumbnail")
            .append("img")
                .attr("src", icon_pictures[data["data"]["hero_id"]])
                .attr("style", "height:37px");

    row.append("td")
        .text(formatDuration(data["data"]["duration"]));

    var result = (data["data"]["winner"]? "Win": "Loss");
    row.append("td")
        .text(result);

    row.append("td")
        .append("button")
            .attr("id", "match-button");

    row.append("td")
        .attr("class", "default")
        .append("a")
            .attr("id", "download-icon");
}

var requested_score_id = -1;
function updateRow(data)
{
    var row = d3.select(this);

    var matchlink = row.select(".match-link");
    matchlink.classed("disabled", !(data["match_status"] === "parsed"));


    var button = row.select("#match-button");
    button.html("");

    switch(data["match_status"])
    {
        case "parsed":
            if(data["result_id"]>=0)
            {
                button
                    .attr("class", "btn dashboard-button btn-success")
                    .text("Ready")
                    .on("click", function(){ window.location.replace("/result/"+data["result_id"]);});
            }
            else
            {
                button
                    .attr({ "class":  "btn dashboard-button btn-warning",
                            "data-target": "#loading",
                            "data-toggle": "modal"})
                    .text("Rate")
                    .on("click",
                        function()
                        {   
                            var result_id = 0;
                            $("#progressTimer").progressTimer({
                                timeLimit: 1,
                                warningThreshold: 0.5,
                                baseStyle: 'progress-bar-warning',
                                warningStyle: 'progress-bar-danger',
                                completeStyle: 'progress-bar-info',
                                onFinish: function() {
                                    if(requested_score_id >= 0)
                                    {
                                        $.getJSON("/api/score_result/"+requested_score_id, function(data) {
                                            if(data["result"]==="success")
                                            {
                                                window.location.replace("/result/"+data["id"]);
                                            }
                                            else
                                            {
                                                alert("Sorry, no result yet");
                                            }
                                        });
                                    }
                                    else
                                    {
                                        alert("Sorry, some error occured");
                                    }
                                }
                            });
                            $.getJSON("/api/score/"+data["match_id"], function(data) {
                                    console.log(data);
                                    if(data["result"]==="success")
                                        requested_score_id = data["id"];
                                    else
                                    {
                                        requested_score_id = -1;
                                    }
                                });
                        }
                    );
            }

            break;
        case "requested":
        case "retrieving":
        case "uploaded":
        case "retrieved":
        case "extracting":
        case "analysing":
            button
                .attr("class", "btn dashboard-button btn-success disabled")
                .html("<div class='sp sp-circle'></div><div class='processing-text'>Processing</div>");
            break;
        case "failed":
            button
                .attr("class", "btn dashboard-button btn-danger disabled")
                .text("Failed");
            break;
        case "unavailable":
            button
                .attr("class", "btn dashboard-button btn-default disabled")
                .text("Not available");
            break;
        case "untried":
            if((Date.now()/1000) - data["data"]["start_time"] < 10*24*60*60 )
            {
                button
                    .attr({ "class":  "btn dashboard-button btn-warning",
                            "data-target": "#loading",
                            "data-toggle": "modal"})
                    .text("Parse")
                    .on("click",function()
                    {   
                        $.post("/api/retrieve/"+data["match_id"],{},
                            function(result){});
                        var result_id = 0;

                        $("#progressTimer").progressTimer({
                            timeLimit: 5,
                            warningThreshold: 5,
                            baseStyle: 'progress-bar-warning',
                            warningStyle: 'progress-bar-warning',
                            completeStyle: 'progress-bar-info',
                            onFinish:
                                function() {
                                    window.location.replace("/user?start="+start+"&end="+(start+range));
                                }
                        });  
                    }
                );


            }
            else
            {
                button
                    .attr("class", "btn dashboard-button btn-default disabled")
                    .text("Not available");
            }  
            break;
        default:
            button
                .attr("class", "btn dashboard-button btn-default disabled")
                .text("Unknown");
            break;
    }

    var download_icon = row.select("#download-icon");

    if (data["match_status"] === "parsed")
    {
        download_icon
            .attr("href", "/api/download/"+data["match_id"])
            .attr("download", "")
            .attr("class", "glyphicon glyphicon-download-alt");
    }
}