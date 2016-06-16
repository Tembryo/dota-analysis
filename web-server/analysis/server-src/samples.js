var id_to_hero =
{
    "102":  "abaddon",
    "73":   "alchemist",
    "68":   "ancient_apparition",
    "1":    "antimage",
    "113":  "arc_warden",
    "2":    "axe",
    "3":    "bane",
    "65":   "batrider",
    "38":   "beastmaster",
    "4":    "bloodseeker",
    "62":   "bounty_hunter",
    "78":   "brewmaster",
    "99":   "bristleback",
    "61":   "broodmother",
    "96":   "centaur",
    "81":   "chaos_knight",
    "66":   "chen",
    "56":   "clinkz",
    "5":    "crystal_maiden",
    "55":   "dark_seer",
    "50":   "dazzle",
    "43":   "death_prophet",
    "87":   "disruptor",
    "69":   "doom_bringer",
    "49":   "dragon_knight",
    "6":    "drow_ranger",
    "7":    "earthshaker",
    "103":  "elder_titan",
    "107":  "earth_spirit",
    "58":   "ember_spirit",
    "106":  "enchantress",
    "33":   "enigma",
    "53":   "furion",
    "41":   "faceless_void",
    "72":   "gyrocopter", 
    "59":   "huskar",
    "74":   "invoker",
    "64":   "jakiro",
    "8":    "juggernaut",
    "90":   "keeper_of_the_light",
    "23":   "kunkka",
    "104":  "legion_commander",
    "52":   "leshrac",
    "31":   "lich",
    "54":   "life_stealer",
    "25":   "lina",
    "26":   "lion",
    "80":   "lone_druid",
    "48":   "luna",
    "77":   "lycan",
    "97":   "magnataur",
    "94":   "medusa",
    "82":   "meepo",
    "9":    "mirana",
    "10":   "morphling",
    "89":   "naga_siren",
    "36":   "necrolyte",
    "11":   "nevermore",
    "60":   "night_stalker",
    "88":   "nyx_assassin",
    "76":   "obsidian_destroyer",
    "84":   "ogre_magi",
    "57":   "omniknight",
    "111":  "oracle",
    "44":   "phantom_assassin",
    "12":   "phantom_lancer",
    "110":  "phoenix",
    "13":   "puck",
    "14":   "pudge",
    "45":   "pugna",
    "39":   "queenofpain",
    "51":   "rattletrap",
    "15":   "razor",
    "32":   "riki",
    "86":   "rubick",
    "16":   "sand_king",
    "79":   "shadow_demon",
    "27":   "shadow_shaman",
    "98":   "shredder",
    "75":   "silencer",
    "42":   "skeleton_king",
    "101":  "skywrath_mage",
    "28":   "slardar",
    "93":   "slark",
    "35":   "sniper",
    "67":   "spectre", 
    "71":   "spirit_breaker",
    "17":   "storm_spirit",
    "18":   "sven",
    "105":  "techies",
    "46":   "templar_assassin",
    "109":  "terrorblade",
    "29":   "tidehunter",
    "34":   "tinker",
    "19":   "tiny",
    "83":   "treant",
    "95":   "troll_warlord",
    "100":  "tusk",
    "85":   "undying",
    "20":   "vengefulspirit",
    "40":   "Venomancer",
    "47":   "viper", 
    "92":   "visage",
    "70":   "ursa",
    "37":   "warlock",
    "63":   "weaver",
    "21":   "windrunner",
    "112":  "winter_wyvern",
    "91":   "wisp",
    "30":   "witch_doctor",
    "22":   "zuus"
};


function sampleHeader()
{
    var header = {  "label":"steamid", 
                    "data": [   "hero",
                                "own_team",
                                "enemy_team",
                                "win",
                                "durationMins",
                                "GPM",
                                "XPM",
                                "fraction-creeps-lasthit",
                                "fraction-lasthits",
                                "checks-per-minute",
                                "average-check-duration",
                                "time-fraction-visible",
                                "kills",
                                "deaths",
                                "fightsPerMin",
                                "initiation-score",
                                "camera-average-movement",
                                "camera-distance-average",
                                "camera-distance-stdev",
                                "camera-jumps-per-minute",
                                "camera-percent-far",
                                "camera-percent-moving",
                                "camera-percent-self",
                                "lasthits-per-minute",
                                "lasthits-total-contested",
                                "lasthits-contested-percent-lasthit",
                                "lasthits-taken-percent-free",
                                "lasthits-missed-free",
                                "lasthits-percent-taken-against-contest",
                                "tower-damage",
                                "rax-damage"
                                ]};
    return header;
}

function createSampleData(match, slot)
{
    if(slot >=10)
    {
        console.log("bad slot")
    }
    var match_stats = match["match-stats"];
    if(!match["player-stats"].hasOwnProperty(slot))
    {
        console.log("bad slot/match", slot, match);
        return [];
    }
    var player_stats = match["player-stats"][slot];
    var win = 0;
    if( (match_stats["winner"] === "radiant" && slot < 5) ||
        (match_stats["winner"] === "dire" && slot >= 5))
        win = 1;
    //console.log(match, match["player-stats"],id, match["player-stats"][id], player_stats);

    var my_team = [];
    var enemy_team = [];
    for(var i = 0; i < match["match-details"]["players"].length; ++i)
    {
       if( (match["match-details"]["players"][i]["player_slot"] < 128 && slot < 5) ||
           (match["match-details"]["players"][i]["player_slot"] >= 128 && slot >= 5) )
            my_team.push(match["match-details"]["players"][i]["hero_id"])
        else
            enemy_team.push(match["match-details"]["players"][i]["hero_id"])
    }

    var my_team_string = "";
    for(var i = 0; i < my_team.length; ++i)
    {
        my_team_string +=id_to_hero[my_team[i]] ;
        if(i+1 < my_team.length)
            my_team_string += "#";
    }

    var enemy_team_string = "";
    for(var i = 0; i < enemy_team.length; ++i)
    {
        enemy_team_string +=id_to_hero[enemy_team[i]] ;
        if(i+1 < my_team.length)
            enemy_team_string += "#";
    }

    var durationMins =  (match_stats["duration"] /60);
    var fractionCreepsLasthit =  (match_stats["creeps-lasthit"] /match_stats["creeps-killed"]);
    var fractionLasthits =  (player_stats["lasthits"] /match_stats["creeps-lasthit"]);
    var checksPerMin = player_stats["n-checks"] / durationMins;
    var timeFractionVisible = player_stats["time-visible"] / durationMins;
    var fightsPerMin =  (player_stats["num-of-fights"] /durationMins);  

    var camJumpsPerMin =  player_stats["camera-stats"]["jumps"]/durationMins;
    var lasthitsPerMin =  player_stats["lasthits"]/durationMins;
    var contestedCreepsLasthit =  player_stats["contested-lasthit"]/Math.max(player_stats["contested-total"], 1);
    var percentFreeOfLasthits =  player_stats["lasthit-free"]/Math.max(player_stats["lasthits"], 1);
    var percentTakenAgainstContest = player_stats["lasthit-contested"]/Math.max((player_stats["lasthit-contested"]+player_stats["missed-contested"]), 1);

    var features =  [   player_stats["hero"],
                        my_team_string,
                        enemy_team_string,
                        win,
                        durationMins.toFixed(3),
                        player_stats["GPM"],
                        player_stats["XPM"],
                        fractionCreepsLasthit,
                        fractionLasthits,
                        checksPerMin,
                        player_stats["average-check-duration"],
                        timeFractionVisible,
                        player_stats["num-of-kills"],
                        player_stats["num-of-deaths"],
                        fightsPerMin,
                        player_stats["initation-score"],
                        player_stats["camera-stats"]["avg_movement"],
                        player_stats["camera-stats"]["average_distance"],
                        player_stats["camera-stats"]["distance_std_dev"],
                        camJumpsPerMin,
                        player_stats["camera-stats"]["percentFar"],
                        player_stats["camera-stats"]["percentMove"],
                        player_stats["camera-stats"]["percentSelf"],
                        lasthitsPerMin,
                        player_stats["contested-total"],
                        contestedCreepsLasthit,
                        percentFreeOfLasthits,
                        player_stats["missed-free"],
                        percentTakenAgainstContest,
                        player_stats["tower-damage"],
                        player_stats["rax-damage"]
                        ];
    return features;    
}

function writeSample(file, sample)
{
    if(sample.length == 0)
        return;
    var line = "";
    line += sample["label"]+",";
    for(var feature_i = 0; feature_i < sample["data"].length; feature_i ++)
    {
        line += sample["data"][feature_i];
        if(feature_i +1 < sample["data"].length )
            line += ",";
    }
    file.write(line)
}


exports.header =  sampleHeader;
exports.createSampleData =  createSampleData;
exports.writeSample =  writeSample;
exports.version = "24/05/16";