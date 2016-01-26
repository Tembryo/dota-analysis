$(document).ready(function(){

	  //hero images
	var icon_images = {
	  "abaddon":              "img/hero-pictures/Abaddon.png",
	  "alchemist":            "img/hero-pictures/Alchemist.png",
	  "ancient_apparition":   "img/hero-pictures/Ancient_Apparition.png",
	  "antimage":             "img/hero-pictures/Antimage.png",
	  "axe":                  "img/hero-pictures/Axe.png",
	  "bane":                 "img/hero-pictures/Bane.png",
	  "batrider":             "img/hero-pictures/Batrider.png",
	  "beastmaster":          "img/hero-pictures/Beastmaster.png",
	  "bloodseeker":          "img/hero-pictures/Bloodseeker.png",
	  "bounty_hunter":        "img/hero-pictures/Bounty Hunter.png",
	  "brewmaster":           "img/hero-pictures/Brewmaster.png",
	  "bristleback":          "img/hero-pictures/Bristleback.png",
	  "broodmother":          "img/hero-pictures/Broodmother.png",
	  "centaur":              "img/hero-pictures/Centaur Warrunner.png",
	  "chaos_knight":         "img/hero-pictures/Chaos Knight.png",
	  "chen":                 "img/hero-pictures/Chen.png",
	  "clinkz":               "img/hero-pictures/Clinkz.png",
	  "crystal_maiden":       "img/hero-pictures/Crystal Maiden.png",
	  "dark_seer":            "img/hero-pictures/Dark Seer.png",
	  "dazzle":               "img/hero-pictures/Dazzle.png",
	  "death_prophet":        "img/hero-pictures/Death Prophet.png",
	  "disruptor":            "img/hero-pictures/Disruptor.png",
	  "doom_bringer":         "img/hero-pictures/Doom Bringer.png",
	  "dragon_knight":        "img/hero-pictures/Dragon Knight.png",
	  "drow_ranger":          "img/hero-pictures/Drow Ranger.png",
	  "earthshaker":          "img/hero-pictures/Earthshaker.png",
	  "elder_titan":          "img/hero-pictures/Elder Titan.png",
	  "eart_spirit":          "img/hero-pictures/Earth Spirit.png",
	  "ember_spirit":         "img/hero-pictures/Enchantress.png",
	  "enchantress":          "img/hero-pictures/Ember Spirit.png",
	  "enigma":               "img/hero-pictures/Enigma.png",
	  "furion":               "img/hero-pictures/Nature's Prophet.png",
	  "faceless_void":        "img/hero-pictures/Faceless Void.png",
	  "gyrocopter":           "img/hero-pictures/Gyrocopter.png", 
	  "huskar":               "img/hero-pictures/Huskar.png",
	  "invoker":              "img/hero-pictures/Invoker.png",
	  "jakiro":               "img/hero-pictures/Jakiro.png",
	  "juggernaut":           "img/hero-pictures/Juggernaut.png",
	  "keeper_of_the_light":  "img/hero-pictures/Keeper of the Light.png",
	  "kunkka":               "img/hero-pictures/Kunkka.png",
	  "legion_commander":     "img/hero-pictures/Legion Commander.png",
	  "leshrac":              "img/hero-pictures/Leshrac.png",
	  "lich":                 "img/hero-pictures/Lich.png",
	  "life_stealer":         "img/hero-pictures/Life Stealer.png",
	  "lina":                 "img/hero-pictures/Lina.png",
	  "lion":                 "img/hero-pictures/Lion.png",
	  "lone_druid":           "img/hero-pictures/Lone Druid.png",
	  "luna":                 "img/hero-pictures/Luna.png",
	  "lycan":                "img/hero-pictures/Lycanthrope.png",
	  "magnataur":            "img/hero-pictures/Magnataur.png",
	  "medusa":               "img/hero-pictures/Medusa.png",
	  "meepo":                "img/hero-pictures/Meepo.png",
	  "mirana":               "img/hero-pictures/Mirana.png",
	  "morphling":            "img/hero-pictures/Morphling.png",
	  "naga_siren":           "img/hero-pictures/Naga Siren.png",
	  "necrolyte":            "img/hero-pictures/Necrolyte.png",
	  "nevermore":            "img/hero-pictures/Shadow Fiend.png",
	  "night_stalker":        "img/hero-pictures/Night Stalker.png",
	  "nyx_assassin":         "img/hero-pictures/Nyx Assassin.png",
	  "obsidian_destroyer":   "img/hero-pictures/Obsidian Destroyer.png",
	  "ogre_magi":            "img/hero-pictures/Ogre Magi.png",
	  "omniknight":           "img/hero-pictures/Omniknight.png",
	  "oracle":               "img/hero-pictures/Oracle.png",
	  "phantom_assassin":     "img/hero-pictures/Phantom Assassin.png",
	  "phantom_lancer":       "img/hero-pictures/Phantom Lancer.png",
	  "phoenix":              "img/hero-pictures/Phoenix.png",
	  "puck":                 "img/hero-pictures/Puck.png",
	  "pudge":                "img/hero-pictures/Pudge.png",
	  "pugna":                "img/hero-pictures/Pugna.png",
	  "queenofpain":          "img/hero-pictures/Queen Of Pain.png",
	  "rattletrap":           "img/hero-pictures/Rattletrap.png",
	  "razor":                "img/hero-pictures/Razor.png",
	  "riki":                 "img/hero-pictures/Riki.png",
	  "rubick":               "img/hero-pictures/Rubick.png",
	  "sand_king":            "img/hero-pictures/Sand King.png",
	  "shadow_demon":         "img/hero-pictures/Shadow Demon.png",
	  "shadow_shaman":        "img/hero-pictures/Shadow Shaman.png",
	  "shredder":             "img/hero-pictures/Shredder.png",
	  "silencer":             "img/hero-pictures/Silencer.png",
	  "skeleton_king":        "img/hero-pictures/Wraith_King.png",
	  "skywrath_mage":        "img/hero-pictures/Skywrath_Mage.png",
	  "slardar":              "img/hero-pictures/Slardar.png",
	  "slark":                "img/hero-pictures/Slark.png",
	  "sniper":               "img/hero-pictures/Sniper.png",
	  "spectre":              "img/hero-pictures/Spectre.png", 
	  "spirit_breaker":       "img/hero-pictures/Spirit Breaker.png",
	  "storm_spirit":         "img/hero-pictures/Storm_Spirit.png",
	  "sven":                 "img/hero-pictures/Sven.png",
	  "techies":              "img/hero-pictures/Techies.png",
	  "templar_assassin":     "img/hero-pictures/Templar Assassin.png",
	  "terrorblade":          "img/hero-pictures/Terrorblade.png",
	  "tidehunter":           "img/hero-pictures/Tidehunter.png",
	  "tinker":               "img/hero-pictures/Tinker.png",
	  "tiny":                 "img/hero-pictures/Tiny.png",
	  "treant":               "img/hero-pictures/Treant.png",
	  "troll_warlord":        "img/hero-pictures/Troll Warlord.png",
	  "tusk":                 "img/hero-pictures/Tusk.png",
	  "undying":              "img/hero-pictures/Undying.png",
	  "vengefulspirit":       "img/hero-pictures/Vengeful Spirit.png",
	  "venomancer":           "img/hero-pictures/Venomancer.png",
	  "viper":                "img/hero-pictures/Viper.png", 
	  "visage":               "img/hero-pictures/Visage.png",
	  "ursa":                 "img/hero-pictures/Ursa.png",
	  "warlock":              "img/hero-pictures/Warlock.png",
	  "weaver":               "img/hero-pictures/Weaver.png",
	  "windrunner":           "img/hero-pictures/Windrunner.png",
	  "winter_wyvern":        "img/hero-pictures/Winter_Wyvern.png",
	  "wisp":                 "img/hero-pictures/Wisp.png",
	  "witch_doctor":         "img/hero-pictures/Witch_Doctor.png",
	  "zuus":                 "img/hero-pictures/Zeus.png"
	  };

	// open up the header file for the match
	// need to decide if will simply load the whole analysis file instead
	$.getJSON("data/analysis.json", function(json) {
  		replay_data = json;
  		var hero_id = {};
  		var hero_namespace = replay_data["header"]["parameters"]["namespace"]["hero_namespace"];
  		for (i = 0; i < replay_data["header"]["parameters"]["general"]["num_players"]; i++){
  			hero_id[hero_namespace+i] = replay_data["header"]["players"][i]["hero"]; 
  		};
  		var fights = findFightEvents();
		var num_keys = Object.keys(fights).length;
		// loop over all of the fights in the json file
		for (var i = 0; i < num_keys; i++){
			// make a div to contain each fight
			var fight_div = $("<div> </div>");
			$(fight_div).addClass("fight_div");
			$(fight_div).addClass("carousel_box");
			$(fight_div).attr("id",i);
			var fight_title = "<h2 class = fight_title> Fight " + i + "</h2>"; 
			$(fight_div).append(fight_title);
			// put two divs inside this div to separate the radiant and dire heros
			var fight_div_radiant = $("<div> </div>");
			$(fight_div_radiant).addClass("fight_div_radiant");
			$(fight_div).append(fight_div_radiant);
			var fight_div_dire = $("<div> </div>");
			$(fight_div).append(fight_div_dire);
			//find the number of heros invovled in the fight
			var event_id = Object.keys(fights[i]);
			var involved = fights[i][event_id[0]]["involved"];
			var killed = fights[i][event_id[0]]["killed"];
			// make a div to contain the picture of each hero involved in the fight
			for (var j = 0; j < involved.length; j++){
				var hero_pic_div= $("<div> </div>");
				$(hero_pic_div).addClass("hero_pic_div");
				var hero_image_location = icon_images[hero_id[involved[j]]];
				var hero_img = $("<img src = '" + hero_image_location + "'>");
				$(hero_img).addClass("hero_img");
				$(hero_pic_div).append(hero_img);
				//check if that hero was killed in the fight
				for (var k = 0; k < killed.length; k++){
					if (involved[j] == killed[k]) {
						var skull_img = $("<img src = 'img/Red_Cross.svg' >");
						$(skull_img).addClass('red_cross_img');
						$(hero_pic_div).append(skull_img);
					};					
				}
				// put the images in different divs depending on if they are dire or radiant heros
				if (involved[j] <= 104){
					$(fight_div_radiant).append(hero_pic_div);
				}
				else {
					$(fight_div_dire).append(hero_pic_div);
				}
			};
			// make a div to contain information on the time of the fight/gold/xp exchanged
			var info_div = $("<div> </div>");
			var location = fights[i][event_id[0]]["location"];
			var time_start = Math.floor(fights[i][event_id[0]]["time_start"]);
			var time_start_minutes = Math.floor(time_start / 60);
			var time_start_seconds = Math.floor(time_start % 60);

			var time_end = fights[i][event_id[0]]["time_end"];
			var time_end_minutes = Math.floor(time_end / 60);
			var time_end_seconds = Math.floor(time_end % 60);

			var total_damage = fights[i][event_id[0]]["total_damage"];

			var time_text = "<p class = 'fight_text' > Time: " + str_pad_left(time_start_minutes,'0',2) +":"+ str_pad_left(time_start_seconds,'0',2) + "-" + str_pad_left(time_end_minutes,'0',2) +":"+ str_pad_left(time_end_seconds,'0',2)+ ", Total Damage: " + total_damage +" </p>";
			var location_text = "<p class = 'fight_text'> Location: " + location + "</p>";
			$(info_div).append(time_text);
			$(info_div).append(location_text);
			$(fight_div).append(info_div);
			// append the div to the fight-list-container
			$("#carousel").append(fight_div);
	  	};
	  	var $carousel = $('#carousel').carousel({
			vertical: true,
			indicator:true,
			group: 3
		});			  
		$('#carousel_prev').on('click', function(ev) {
	  		$carousel.carousel('prev');
		});
		$('#carousel_next').on('click', function(ev) {
	  		$carousel.carousel('next');
		});
		// display the first fight details in the fight-details view when the page laods up
		$("#my_text_area").val('');
		var event_id = Object.keys(fights[0]);
		var attacks = fights[0][event_id[0]]["attack_sequence"];
		var attack_text = "";
		var old_attack = new Object();
		old_attack.attack_method = "";
		old_attack.victim_list = [];
		old_attack.attacker = "";
		old_attack.damage = 0;
		old_attack.time_start = "";
		old_attack.time_end = "";

		var new_attack = new Object();
		for (i = 0; i < attacks.length; i++){
			new_attack.attack_method = attacks[i]["attack_method"];
			new_attack.attacker = capitalizeFirstLetter(hero_id[attacks[i]["attacker"]]);
			new_attack.victim = capitalizeFirstLetter(hero_id[attacks[i]["victim"]]);
			new_attack.damage = attacks[i]["damage"];
			new_attack.time = Math.floor(10*attacks[i]["t"])/10;
			if (attack_method === old_attack_method){

			}


			attack_text = attack_text + "\n " + "At " + str_pad_left(minutes,'0',2) + ":" + str_pad_left(seconds,'0',2) + " - " + attacker + " attacked " + victim + " with " + attack_method + " did " + damage + " damage" + health_delta;
		};
		document.getElementById("my_text_area").value += attack_text;
		// when a new fight is clicked remove the old one and show the new details instead
		$('.fight_div').click(function(){
			$("#my_text_area").val('');
			var selected_id = $(this).attr("id");
			//load attack data into a variable
			var event_id = Object.keys(fights[selected_id]);
			var attacks = fights[selected_id][event_id[0]]["attack_sequence"];
			var attack_text = "";
			for (i = 0; i < attacks.length; i++){		
				var attacker = hero_id[attacks[i]["attacker"]];
				attacker = capitalizeFirstLetter(attacker);
				var victim = hero_id[attacks[i]["victim"]];
				victim = capitalizeFirstLetter(victim);
				var attack_method = attacks[i]["attack_method"];
				var damage = attacks[i]["damage"];
				var time = Math.floor(attacks[i]["t"]);
				var minutes = Math.floor(time /60);
				var seconds = Math.floor(time % 60);
				var health_delta = attacks[i]["health_delta"];
				attack_text = attack_text + "\n " + "At " + str_pad_left(minutes,'0',2) + ":" + str_pad_left(seconds,'0',2) + " - " + attacker + " attacked " + victim + " with " + attack_method + " did " + damage + " damage" + health_delta;
			};
			document.getElementById("my_text_area").value += attack_text;
		});
  	});	
});

function str_pad_left(string,pad,length){ 
	return (new Array(length+1).join(pad)+string).slice(-length); 
}


function findFightEvents(){
	//sort events
	fights = [];
	for (var event_id in replay_data["events"]) {
		if (replay_data["events"][event_id]["type"] === "fight")
		{
			fight_element = {event_id:replay_data["events"][event_id]};
			fights.push(fight_element);
		}
	}
	return fights
}

function capitalizeFirstLetter(string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
}

			//var minutes = Math.floor(time /60);
			//var seconds = Math.floor(time % 60);
			//var health_delta = attacks[i]["health_delta"];
