$(document).ready(function(){

	var pathname = "/api/history?start=0&end=5";

	$.getJSON(pathname, function(data) {
		drawTable(data);

	});

	function drawTable(data) {
    for (var i = 0; i < data.length; i++) {
        drawRow(data[i], true);
        drawRow(data[i], false);
    	}
    }

var icon_pictures = {
"102":              "/static/img/heroes/pictures/Abaddon.png",
"73":            "/static/img/heroes/pictures/Alchemist.png",
"68":   "/static/img/heroes/pictures/Ancient_Apparition.png",
"1":             "/static/img/heroes/pictures/Antimage.png",
"113":           "/static/img/heroes/pictures/Arc Warden.png",
"2":                  "/static/img/heroes/pictures/Axe.png",
"3":                 "/static/img/heroes/pictures/Bane.png",
"65":             "/static/img/heroes/pictures/Batrider.png",
"38":          "/static/img/heroes/pictures/Beastmaster.png",
"4":          "/static/img/heroes/pictures/Bloodseeker.png",
"62":        "/static/img/heroes/pictures/Bounty_Hunter.png",
"78":           "/static/img/heroes/pictures/Brewmaster.png",
"99":          "/static/img/heroes/pictures/Bristleback.png",
"61":          "/static/img/heroes/pictures/Broodmother.png",
"96":              "/static/img/heroes/pictures/Centaur_Warrunner.png",
"81":         "/static/img/heroes/pictures/Chaos_Knight.png",
"66":                 "/static/img/heroes/pictures/Chen.png",
"56":               "/static/img/heroes/pictures/Clinkz.png",
"5":       "/static/img/heroes/pictures/Crystal Maiden.png",
"55":            "/static/img/heroes/pictures/Dark Seer.png",
"50":               "/static/img/heroes/pictures/Dazzle.png",
"43":        "/static/img/heroes/pictures/Death_Prophet.png",
"87":            "/static/img/heroes/pictures/Disruptor.png",
"69":         "/static/img/heroes/pictures/Doom.png",
"49":        "/static/img/heroes/pictures/Dragon_Knight.png",
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


    function drawRow(rowData, full_columns)
    {
        var row = $("<tr />")
        if(full_columns)
            $("#large-match-list").append(row);
        else
            $("#small-match-list").append(row); 
        /* match-id*/

        if(full_columns)
        {
            row.append($("<td><a href='/match/"+rowData["match_id"]+"'>" + rowData["match_id"] + "</a></td>"));
        }
        else
        {
                /* match id and result */
            var result = (rowData["data"]["winner"]? "Win": "Loss");
            row.append($("<td><a href='/match/"+rowData["match_id"]+"'>" + rowData["match_id"] + "</a></br>" + result + "</td>"));
        }
        var date = moment.unix(rowData["data"]["start_time"]);
        if(full_columns)
        {
            row.append($("<td>" + date.format("DD/MM/YYYY") + "</td>"));
            row.append($("<td>" + date.format("HH:mm:ss") + "</td>"));
        }
        else
        {
            row.append($("<td>" + date.format("DD/MM/YYYY") + "</br>" +  date.format("HH:mm:ss") +  "</td>"));
        }



        /* hero image */
        var hero_td = $("<td />");
        row.append($(hero_td));
        var hero_div = $("<div> </div>");
        hero_td.append(hero_div);
        hero_div.addClass("image-thumbnail");
        var hero_img = $("<img>");
        hero_div.append(hero_img);
        hero_img.attr("src",icon_pictures[rowData["data"]["hero_id"]]);
        hero_img.attr("style","height:37px");


        if(full_columns)
        {


            row.append($("<td>" + formatDuration(rowData["data"]["duration"]) + "</td>"));
            var result = (rowData["data"]["winner"]? "Win": "Loss");
            row.append($("<td>" + result + "</td>"));
        }

        /* download */
        var download_td = $("<td />");
        row.append($(download_td));
        var download_btn = $("<button></button>");
        download_td.append(download_btn);
        download_btn.addClass("btn dashboard-button");

        switch(rowData["match_status"])
        {
            case "parsed":
                if(rowData["result_id"]>=0)
                {
                    download_btn.addClass("btn-success");
                    download_btn.html("Ready");
                    download_btn.on("click", function(){ window.location.replace("/result/"+rowData["result_id"]);});
                }
                else
                {
                    download_btn.addClass("btn-warning");
                    download_btn.html("Rate");
                    download_btn.attr("data-target","#loading");
                    download_btn.attr("data-toggle","modal");
                    download_btn.on("click",
                        function()
                        {   
                            var result_id = 0;
                            $("#progressTimer").progressTimer({
                                timeLimit: 2,
                                warningThreshold: 1,
                                baseStyle: 'progress-bar-warning',
                                warningStyle: 'progress-bar-danger',
                                completeStyle: 'progress-bar-info',
                                onFinish: function() {
                                    //window.location.replace("/result/"+rowData["result_id"])
                                }
                            });
                            $.getJSON("/api/score/"+rowData["match_id"], function(data) {
                                    console.log(data);
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
                download_btn.addClass("btn-success disabled");
                download_btn.html("Processing");
                break;
            case "failed":
                download_btn.addClass("btn-danger disabled");
                download_btn.html("Failed");
                break;
            case "unavailable":
                download_btn.addClass("btn-default disabled");
                download_btn.html("Not available");
                break;
            case "untried":
                if((Date.now()/1000) - rowData["data"]["start_time"] < 10*24*60*60 )
                {
                    download_btn.addClass("btn-warning");
                    download_btn.html("Parse");
                    download_btn.attr("data-target","#loading");
                    download_btn.attr("data-toggle","modal");
                    
                    download_btnon("click",function()
                        {   
                            var result_id = 0;

                            $("#progressTimer").progressTimer({
                                timeLimit: 12,
                                warningThreshold: 10,
                                baseStyle: 'progress-bar-warning',
                                warningStyle: 'progress-bar-danger',
                                completeStyle: 'progress-bar-info',
                                onFinish:
                                    function() {
                                        window.location.replace("/result/"+result_id)
                                    }
                            });  
                        }
                    );


                }
                else
                {
                    download_btn.addClass("btn-default disabled");
                    download_btn.html("Not available");
                }  
                break;
            default:
                download_btn.addClass("btn-default disabled");
                download_btn.html("Unknown");
                break;
        }

        var download_icon = $("<td />");
        row.append($(download_icon));
        if (rowData["match_status"] === "parsed"){
            download_icon.html("<a class='download_span' href='/download/"+rowData["match-id"]+".dem'></a>");
            $(".download_span").addClass("glyphicon glyphicon-download-alt")
            download_icon.addClass("default");
        }
        else{
        }
    }
});
