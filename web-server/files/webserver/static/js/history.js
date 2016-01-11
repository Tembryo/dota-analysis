match_history = [];




function displayHistory()
{
	var history = d3.select("#history-table").selectAll(".history-match").data(match_history, function(match){
					return match["match_id"];
				});

	history.enter()
		.append("tr")
		.attr("class", function(d)
            {
                if(d["match_status"]==="parsed")
                    return "history-match parsed";
                else
                    return "history-match";
            })
        .on("click", function(d)
            {
                if(d["match_status"]==="parsed")
                    window.document.location = "/match/"+d["match_id"];
            })
        .on("mouseover", function(d)
            {
               if(d["match_status"]==="parsed")
                     d3.select(this).attr("class", "history-match parsed mouseover");
                else
                     d3.select(this).attr("class", "history-match mouseover");
            })
        .on("mouseout", function(d)
            {
               if(d["match_status"]==="parsed")
                     d3.select(this).attr("class", "history-match parsed");
                else
                     d3.select(this).attr("class", "history-match");
            })
		.each(createHistoryRow);
    history.order();

	history.exit()
		.remove();
}

function formatTime(timestamp)
{
    var newDate = new Date();
    newDate.setTime(timestamp*1000);
    dateString = newDate.toLocaleString();
    return dateString;
}

var icon_pictures = {
"102":              "/static/img/hero-pictures/Abaddon.png",
"73":            "/static/img/hero-pictures/Alchemist.png",
"68":   "/static/img/hero-pictures/Ancient_Apparition.png",
"1":             "/static/img/hero-pictures/Antimage.png",
"113":           "/static/img/hero-pictures/Arc Warden.png",
"2":                  "/static/img/hero-pictures/Axe.png",
"3":                 "/static/img/hero-pictures/Bane.png",
"65":             "/static/img/hero-pictures/Batrider.png",
"38":          "/static/img/hero-pictures/Beastmaster.png",
"4":          "/static/img/hero-pictures/Bloodseeker.png",
"62":        "/static/img/hero-pictures/Bounty_Hunter.png",
"78":           "/static/img/hero-pictures/Brewmaster.png",
"99":          "/static/img/hero-pictures/Bristleback.png",
"61":          "/static/img/hero-pictures/Broodmother.png",
"96":              "/static/img/hero-pictures/Centaur_Warrunner.png",
"81":         "/static/img/hero-pictures/Chaos_Knight.png",
"66":                 "/static/img/hero-pictures/Chen.png",
"56":               "/static/img/hero-pictures/Clinkz.png",
"5":       "/static/img/hero-pictures/Crystal Maiden.png",
"55":            "/static/img/hero-pictures/Dark Seer.png",
"50":               "/static/img/hero-pictures/Dazzle.png",
"43":        "/static/img/hero-pictures/Death_Prophet.png",
"87":            "/static/img/hero-pictures/Disruptor.png",
"69":         "/static/img/hero-pictures/Doom.png",
"49":        "/static/img/hero-pictures/Dragon_Knight.png",
"6":          "/static/img/hero-pictures/Drow_Ranger.png",
"7":          "/static/img/hero-pictures/Earthshaker.png",
"103":          "/static/img/hero-pictures/Elder_Titan.png",
"107":          "/static/img/hero-pictures/Earth_Spirit.png",
"106":         "/static/img/hero-pictures/Enchantress.png",
"58":          "/static/img/hero-pictures/Ember_Spirit.png",
"33":               "/static/img/hero-pictures/Enigma.png",
"53":               "/static/img/hero-pictures/Furion.png",
"41":        "/static/img/hero-pictures/Faceless Void.png",
"72":           "/static/img/hero-pictures/Gyrocopter.png", 
"59":               "/static/img/hero-pictures/Huskar.png",
"74":              "/static/img/hero-pictures/Invoker.png",
"64":               "/static/img/hero-pictures/Jakiro.png",
"8":           "/static/img/hero-pictures/Juggernaut.png",
"90":  "/static/img/hero-pictures/Keeper_of_the_Light.png",
"23":               "/static/img/hero-pictures/Kunkka.png",
"104":     "/static/img/hero-pictures/Legion_Commander.png",
"52":              "/static/img/hero-pictures/Leshrac.png",
"31":                 "/static/img/hero-pictures/Lich.png",
"54":         "/static/img/hero-pictures/Life Stealer.png",
"25":                 "/static/img/hero-pictures/Lina.png",
"26":                 "/static/img/hero-pictures/Lion.png",
"80":           "/static/img/hero-pictures/Lone_Druid.png",
"48":                 "/static/img/hero-pictures/Luna.png",
"77":                "/static/img/hero-pictures/Lycanthrope.png",
"97":            "/static/img/hero-pictures/Magnataur.png",
"94":               "/static/img/hero-pictures/Medusa.png",
"82":                "/static/img/hero-pictures/Meepo.png",
"9":               "/static/img/hero-pictures/Mirana.png",
"10":            "/static/img/hero-pictures/Morphling.png",
"89":           "/static/img/hero-pictures/Naga Siren.png",
"36":            "/static/img/hero-pictures/Necrolyte.png",
"11":            "/static/img/hero-pictures/Shadow_Fiend.png",
"60":        "/static/img/hero-pictures/Night_Stalker.png",
"88":         "/static/img/hero-pictures/Nyx Assassin.png",
"76":   "/static/img/hero-pictures/Obsidian Destroyer.png",
"84":            "/static/img/hero-pictures/Ogre_Magi.png",
"57":           "/static/img/hero-pictures/Omniknight.png",
"111":               "/static/img/hero-pictures/Oracle.png",
"44":     "/static/img/hero-pictures/Phantom_Assassin.png",
"12":       "/static/img/hero-pictures/Phantom_Lancer.png",
"110":              "/static/img/hero-pictures/Phoenix.png",
"13":                 "/static/img/hero-pictures/Puck.png",
"14":                "/static/img/hero-pictures/Pudge.png",
"45":                "/static/img/hero-pictures/Pugna.png",
"39":          "/static/img/hero-pictures/Queen of Pain.png",
"51":           "/static/img/hero-pictures/Rattletrap.png",
"15":                "/static/img/hero-pictures/Razor.png",
"32":                 "/static/img/hero-pictures/Riki.png",
"86":               "/static/img/hero-pictures/Rubick.png",
"16":            "/static/img/hero-pictures/Sand_King.png",
"79":         "/static/img/hero-pictures/Shadow_Demon.png",
"27":        "/static/img/hero-pictures/Shadow_Shaman.png",
"98":             "/static/img/hero-pictures/Timbersaw.png",
"75":             "/static/img/hero-pictures/Silencer.png",
"42":        "/static/img/hero-pictures/Wraith_King.png",
"101":        "/static/img/hero-pictures/Skywrath_Mage.png",
"28":              "/static/img/hero-pictures/Slardar.png",
"93":                "/static/img/hero-pictures/Slark.png",
"35":               "/static/img/hero-pictures/Sniper.png",
"67":              "/static/img/hero-pictures/Spectre.png", 
"71":       "/static/img/hero-pictures/Spirit_Breaker.png",
"17":         "/static/img/hero-pictures/Storm_Spirit.png",
"18":                 "/static/img/hero-pictures/Sven.png",
"105":              "/static/img/hero-pictures/Techies.png",
"46":     "/static/img/hero-pictures/Templar Assassin.png",
"109":          "/static/img/hero-pictures/Terrorblade.png",
"29":           "/static/img/hero-pictures/Tidehunter.png",
"34":               "/static/img/hero-pictures/Tinker.png",
"19":                 "/static/img/hero-pictures/Tiny.png",
"83":               "/static/img/hero-pictures/Treant.png",
"95":        "/static/img/hero-pictures/Troll_Warlord.png",
"100":                 "/static/img/hero-pictures/Tusk.png",
"85":              "/static/img/hero-pictures/Undying.png",
"20":       "/static/img/hero-pictures/Vengeful Spirit.png",
"40":           "/static/img/hero-pictures/Venomancer.png",
"47":                "/static/img/hero-pictures/Viper.png", 
"92":               "/static/img/hero-pictures/Visage.png",
"70":                 "/static/img/hero-pictures/Ursa.png",
"37":              "/static/img/hero-pictures/Warlock.png",
"63":               "/static/img/hero-pictures/Weaver.png",
"21":           "/static/img/hero-pictures/Windrunner.png",
"112":        "/static/img/hero-pictures/Winter Wyvern.png",
"91":                 "/static/img/hero-pictures/Wisp.png",
"30":         "/static/img/hero-pictures/Witch_Doctor.png",
"22":                 "/static/img/hero-pictures/Zeus.png"
  };


function iconForStatus(status)
{
    switch(status)
    {
        case "parsed":
            return "/static/img/elements/colored_balls/green.png";
        case "requested":
        case "retrieving":
            return "/static/img/elements/colored_balls/yellow.png";
        case "uploaded":
            return "/static/img/elements/colored_balls/blue.png";
        case "extracting":
        case "analysing":
            return "/static/img/elements/colored_balls/aqua.png";
        case "failed":
            return "/static/img/elements/colored_balls/red.png";
        case "unavailable":
            return "/static/img/elements/colored_balls/white.png";
        case "untried":
            return "/static/img/elements/colored_balls/gray.png";
        default:
            console.log("dafuq is this state", status);
            return "/static/img/elements/colored_balls/black.png";
    }
}

function mapHeroIDtoImage(hero_id)
{
    return icon_pictures[hero_id];
}


function formatDuration(seconds)
{
    var date = new Date(null);
    date.setSeconds(seconds); // specify value for SECONDS here
    return date.toISOString().substr(11, 8);
}


function createHistoryRow(data)
{
    var row = d3.select(this);
        
    row.append("td")
        .append("img")
            .attr({"src": iconForStatus(data.match_status),
                    "width": "20px"});
    row.append("td")
        .text(formatTime(data.data.start_time));
    row.append("td")
        .append("img")
            .attr({"src": mapHeroIDtoImage(data.data.hero_id),
                    "width": "80px"});
    row.append("td")
        .text(formatDuration(data.data.duration));
    row.append("td")
        .text(data.data.winner?"WON":"LOST")
        .attr("style", "color: #"+(data.data.winner?"00FF00":"FF0000"));

}

function compareMatches(a,b)
{
    return parseInt(b["match_id"])-parseInt(a["match_id"]);
}

function loadPlayerHistory()
{
    d3.json("/api/history"
		,function(error, data){
			match_history = data;
            match_history.sort(compareMatches);
            displayHistory();
		});
}

function main()
{
    loadPlayerHistory();
}

window.onload = main;
