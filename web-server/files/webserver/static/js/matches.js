match_list = [];

//hero images
var icon_images = {
"abaddon":              "/static/img/hero-pictures/Abaddon.png",
"alchemist":            "/static/img/hero-pictures/Alchemist.png",
"ancient_apparition":   "/static/img/hero-pictures/Ancient_Apparition.png",
"antimage":             "/static/img/hero-pictures/Antimage.png",
"axe":                  "/static/img/hero-pictures/Axe.png",
"bane":                 "/static/img/hero-pictures/Bane.png",
"batrider":             "/static/img/hero-pictures/Batrider.png",
"beastmaster":          "/static/img/hero-pictures/Beastmaster.png",
"bloodseeker":          "/static/img/hero-pictures/Bloodseeker.png",
"bounty_hunter":        "/static/img/hero-pictures/Bounty_Hunter.png",
"brewmaster":           "/static/img/hero-pictures/Brewmaster.png",
"bristleback":          "/static/img/hero-pictures/Bristleback.png",
"broodmother":          "/static/img/hero-pictures/Broodmother.png",
"centaur":              "/static/img/hero-pictures/Centaur_Warrunner.png",
"chaos_knight":         "/static/img/hero-pictures/Chaos_Knight.png",
"chen":                 "/static/img/hero-pictures/Chen.png",
"clinkz":               "/static/img/hero-pictures/Clinkz.png",
"crystal_maiden":       "/static/img/hero-pictures/Crystal Maiden.png",
"dark_seer":            "/static/img/hero-pictures/Dark Seer.png",
"dazzle":               "/static/img/hero-pictures/Dazzle.png",
"death_prophet":        "/static/img/hero-pictures/Death_Prophet.png",
"disruptor":            "/static/img/hero-pictures/Disruptor.png",
"doom_bringer":         "/static/img/hero-pictures/Doom.png",
"dragon_knight":        "/static/img/hero-pictures/Dragon_Knight.png",
"drow_ranger":          "/static/img/hero-pictures/Drow_Ranger.png",
"earthshaker":          "/static/img/hero-pictures/Earthshaker.png",
"elder_titan":          "/static/img/hero-pictures/Elder_Titan.png",
"eart_spirit":          "/static/img/hero-pictures/Earth_Spirit.png",
"ember_spirit":         "/static/img/hero-pictures/Enchantress.png",
"enchantress":          "/static/img/hero-pictures/Ember_Spirit.png",
"enigma":               "/static/img/hero-pictures/Enigma.png",
"furion":               "/static/img/hero-pictures/Furion.png",
"faceless_void":        "/static/img/hero-pictures/Faceless Void.png",
"gyrocopter":           "/static/img/hero-pictures/Gyrocopter.png", 
"huskar":               "/static/img/hero-pictures/Huskar.png",
"invoker":              "/static/img/hero-pictures/Invoker.png",
"jakiro":               "/static/img/hero-pictures/Jakiro.png",
"juggernaut":           "/static/img/hero-pictures/Juggernaut.png",
"keeper_of_the_light":  "/static/img/hero-pictures/Keeper_of_the_Light.png",
"kunkka":               "/static/img/hero-pictures/Kunkka.png",
"legion_commander":     "/static/img/hero-pictures/Legion_Commander.png",
"leshrac":              "/static/img/hero-pictures/Leshrac.png",
"lich":                 "/static/img/hero-pictures/Lich.png",
"life_stealer":         "/static/img/hero-pictures/Life Stealer.png",
"lina":                 "/static/img/hero-pictures/Lina.png",
"lion":                 "/static/img/hero-pictures/Lion.png",
"lone_druid":           "/static/img/hero-pictures/Lone_Druid.png",
"luna":                 "/static/img/hero-pictures/Luna.png",
"lycan":                "/static/img/hero-pictures/Lycanthrope.png",
"magnataur":            "/static/img/hero-pictures/Magnataur.png",
"medusa":               "/static/img/hero-pictures/Medusa.png",
"meepo":                "/static/img/hero-pictures/Meepo.png",
"mirana":               "/static/img/hero-pictures/Mirana.png",
"morphling":            "/static/img/hero-pictures/Morphling.png",
"naga_siren":           "/static/img/hero-pictures/Naga Siren.png",
"necrolyte":            "/static/img/hero-pictures/Necrolyte.png",
"nevermore":            "/static/img/hero-pictures/Shadow Fiend.png",
"night_stalker":        "/static/img/hero-pictures/Night_Stalker.png",
"nyx_assassin":         "/static/img/hero-pictures/Nyx Assassin.png",
"obsidian_destroyer":   "/static/img/hero-pictures/Obsidian Destroyer.png",
"ogre_magi":            "/static/img/hero-pictures/Ogre_Magi.png",
"omniknight":           "/static/img/hero-pictures/Omniknight.png",
"oracle":               "/static/img/hero-pictures/Oracle.png",
"phantom_assassin":     "/static/img/hero-pictures/Phantom_Assassin.png",
"phantom_lancer":       "/static/img/hero-pictures/Phantom_Lancer.png",
"phoenix":              "/static/img/hero-pictures/Phoenix.png",
"puck":                 "/static/img/hero-pictures/Puck.png",
"pudge":                "/static/img/hero-pictures/Pudge.png",
"pugna":                "/static/img/hero-pictures/Pugna.png",
"queenofpain":          "/static/img/hero-pictures/Queen of Pain.png",
"rattletrap":           "/static/img/hero-pictures/Rattletrap.png",
"razor":                "/static/img/hero-pictures/Razor.png",
"riki":                 "/static/img/hero-pictures/Riki.png",
"rubick":               "/static/img/hero-pictures/Rubick.png",
"sand_king":            "/static/img/hero-pictures/Sand_King.png",
"shadow_demon":         "/static/img/hero-pictures/Shadow_Demon.png",
"shadow_shaman":        "/static/img/hero-pictures/Shadow_Shaman.png",
"shredder":             "/static/img/hero-pictures/Shredder.png",
"silencer":             "/static/img/hero-pictures/Silencer.png",
"skeleton_king":        "/static/img/hero-pictures/Wraith_King.png",
"skywrath_mage":        "/static/img/hero-pictures/Skywrath_Mage.png",
"slardar":              "/static/img/hero-pictures/Slardar.png",
"slark":                "/static/img/hero-pictures/Slark.png",
"sniper":               "/static/img/hero-pictures/Sniper.png",
"spectre":              "/static/img/hero-pictures/Spectre.png", 
"spirit_breaker":       "/static/img/hero-pictures/Spirit_Breaker.png",
"storm_spirit":         "/static/img/hero-pictures/Storm_Spirit.png",
"sven":                 "/static/img/hero-pictures/Sven.png",
"techies":              "/static/img/hero-pictures/Techies.png",
"templar_assassin":     "/static/img/hero-pictures/Templar Assassin.png",
"terrorblade":          "/static/img/hero-pictures/Terrorblade.png",
"tidehunter":           "/static/img/hero-pictures/Tidehunter.png",
"tinker":               "/static/img/hero-pictures/Tinker.png",
"tiny":                 "/static/img/hero-pictures/Tiny.png",
"treant":               "/static/img/hero-pictures/Treant.png",
"troll_warlord":        "/static/img/hero-pictures/Troll_Warlord.png",
"tusk":                 "/static/img/hero-pictures/Tusk.png",
"undying":              "/static/img/hero-pictures/Undying.png",
"vengefulspirit":       "/static/img/hero-pictures/Vengeful Spirit.png",
"venomancer":           "/static/img/hero-pictures/Venomancer.png",
"viper":                "/static/img/hero-pictures/Viper.png", 
"visage":               "/static/img/hero-pictures/Visage.png",
"ursa":                 "/static/img/hero-pictures/Ursa.png",
"warlock":              "/static/img/hero-pictures/Warlock.png",
"weaver":               "/static/img/hero-pictures/Weaver.png",
"windrunner":           "/static/img/hero-pictures/Windrunner.png",
"winter_wyvern":        "/static/img/hero-pictures/Winter_Wyvern.png",
"wisp":                 "/static/img/hero-pictures/Wisp.png",
"witch_doctor":         "/static/img/hero-pictures/Witch_Doctor.png",
"zuus":                 "/static/img/hero-pictures/Zeus.png"
};

d3.json("/api/matches"
		,function(error, data){
			match_list = data;
            match_list.sort(function(a,b){return parseInt(a["id"])-parseInt(b["id"]);})
            updateList();
		});

function updateList()
{
	//load data from json 
	var my_json = match_list;
	var num_keys = Object.keys(my_json).length;
	for (var i = 0; i < num_keys; i++){
	    if (i % 2 == 0){
	      var column_choice = "#match-list-1";
	    }
	    else{
	      var column_choice = "#match-list-2";
	    };
	    //make make header with team 1 vs team 2 and the date 
	    var team_0 = my_json[i]["teams"]["0"]["name"];
	    if (team_0 === "empty"){
	      team_0 = "Radiant";
	    };
	    var team_1 = my_json[i]["teams"]["1"]["name"];
	    if (team_1 === "empty"){
	      team_1 = "Dire";
	    };
	    // handle old versions where the datetime is not in the header file
	    if (my_json[i]["parameters"]["datetime"] == null){
	        var date = "";
	    }
	    else{
	       var date = my_json[i]["parameters"]["datetime"]["date"]
	    };
		var text = "<h2>" + team_0 + "  vs  " + team_1 + " - " + date + " </h2>";
		$(column_choice).prepend("<div class = match-summary id = div" + i + "> </div>");
		$("#div" + i ).append(text);
	    $("#div" + i ).css("height","205px");
	    $("h2").css("margin-bottom","10px");
	    $("h2").css("margin-top","5px");
	    //make sub heading with the label of the match
	    var label =  "<h3>" + my_json[i]["label"] + "</h3>";
	    $("#div" + i ).append(label);
	    $("h3").css("margin-bottom","15px");
	    // style the div so that it changes colour when we hover over it
	    $("#div" + i ).hover(function(){
	    $(this).css("background-color","#666");
	    $(this).css("cursor","hand");
	    $(this).css("cursor","pointer");
	    }, function(){
	   		$(this).css("background-color","#444");
	    });
	    // make a div to put first 5 hero images in
	    $("#div" + i ).append("<div id = my_div" + i + "a > </div>");
	    $("#my_div" + i + "a" ).css("margin-bottom","7px");
	    // handle old versions where the players heros are not in the header file
	    if (my_json[i]["players"][0]["hero"] == null){
	    	console.log("old version where player heros are not in the header");
	    }
	    else {
	    	for (j=0; j < 5; j++){
		        var player_hero = my_json[i]["players"][j]["hero"]; 
		        var hero_image_location = icon_images[player_hero];
		        var player_name = my_json[i]["players"][j]["name"];
		        $("#my_div" + i + "a" ).append("<div class = imgWrap id =  player_div_a" + j + " > <img class = hero_img src =" + hero_image_location + " id = player_icon_" + j + " > <p class = imgDescription> " + player_name + "</p> </div>");
	       	};
	       // make a div to put next 5 hero images in
	      	$("#div" + i ).append("<div id = my_div" + i + "b > </div>");
	      	for (j=5; j < 10; j++){
	        	var player_hero = my_json[i]["players"][j]["hero"]; 
	        	var hero_image_location = icon_images[player_hero];
	        	var player_name = my_json[i]["players"][j]["name"];
	        	$("#my_div" + i + "b" ).append("<div class = imgWrap id = player_div_b" + j + " > <img class = hero_img src =" + hero_image_location + " id = player_icon_" + j + " > <p class = imgDescription> " + player_name + "</p>  </div>");
	     	};
	    };
	    // make the div containing the match summary a clickable link
	    var my_link = "<a href = http://www.wisdota.com/match/" + my_json[i]["id"] + "> </a>";
	    $("#div" + i ).append(my_link);
	    $("#div" + i).click(function(){
	      window.location = $(this).find("a:first").attr("href");
	      return false;
	    });
	}; 
}
