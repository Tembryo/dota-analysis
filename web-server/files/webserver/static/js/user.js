var the_stats;
var is_example;

var width = 1600;
var height = 400;
var padding = 50;
var entry = "IMR";

var canvas;

$(document).ready(function(){

    var pathname = "/api/stats?start=0&end=20";
    entry = "IMR";
    $.getJSON(pathname, function(data) {
        if(data.length == 0)
        {
            var example_path = "/static/data/example_results/example_stats.json";
            is_example = true;
            $.getJSON(example_path, function(data) {
               the_stats = data.filter(
                    function(d){return d["score_data"];}
                );
                the_stats = the_stats.reverse();
                plot_graph(); 
                setTimeout(function(){alert("Seems like you are visiting for the first time. We will show some example data for now, while we fetch your match history.");}, 500);
            });
        }
        else{
            is_example = false;
            full_stats = data;
           the_stats = data.filter(
            function(d){return d["score_data"];});
            the_stats = the_stats.reverse();
            plot_graph(); 
        }
    });

    canvas=d3.select("#dashboard")
    .append("svg")
    .attr("class", "svg-content")
    .attr("viewBox", "-30 0 "+(width+20)+" "+height);

    var path = canvas.append("path")
                    .attr("id", "graph")
                    .attr("fill","none")
                    .attr("stroke","black")  
                    .attr("stroke-width",5);


    canvas.append("g")
        .attr("id", "xAxis")
        .attr("transform", "translate(0," + (height-padding) + ")");

    canvas.append("text")
        .attr("class", "x label")
        .attr("text-anchor", "end")
        .attr("x", width-padding/2)
        .attr("y", height - padding-10)
        .text("match nr");

    canvas.append("g")
        .attr("id", "yAxis")
        .attr("transform", "translate(" + padding + ",0)");

    canvas.append("text")
        .attr("class", "y label")
        .attr("id", "y-axis-label")
        .attr("text-anchor", "start")
        .attr("transform", "translate("+(padding/2)+", "+(padding-10)+")")
        .text("rating");

     $("#imr-button").click(function(){
        entry = "IMR";
         plot_graph();
     });   

    $("#mechanics-button").click(function(){
        entry = "mechanics";
        plot_graph();
    });



    $("#fights-button").click(function(){
        entry = "checksPM";
         plot_graph();
     });

    $("#objectives-button").click(function(){
        entry = "checkDuration";
         plot_graph();
     });

    $("#movement-button").click(function(){
        entry = "lasthits";
         plot_graph();
     });

    $("#mmr-button").click(function(){
        entry = "MMR";
         plot_graph();
     });




});


function getValue(entry, d)
{
    switch(entry)
    {
        case "IMR":
            if(d["score_data"])
                return d["score_data"]["IMR"];
            else
                return 0;
        case "GPM":
            return d["data"]["GPM"];
        case "Win":
            var indicator = (((d["match_data"]["winner"] === "radiant" && d["data"]["slot"] < 5) || (d["match_data"]["winner"] === "dire" && d["data"]["slot"] >=5 ))
                    ? 1: 0);
            return indicator;
        case "checksPM":
            return d["data"]["n-checks"]/(d["match_data"]["duration-all"]/60);
        case "checkDuration":
            return d["data"]["average-check-duration"];
        case "lasthits":
            return d["data"]["lasthits"];
        case "mechanics":
            return d["score_data"]["mechanics"];
        case "MMR":
            return d["score_data"]["MMR"]; 
        default:
            return 0;
    }
}

var x_scale;
var y_scale;

function plot_graph()
{
    x_scale = d3.scale.linear()
                            .domain([0,the_stats.length+1])
                            .range([padding,width-padding]);


    var value_min = d3.min(the_stats,function(d){return getValue(entry, d);});
    var value_max = d3.max(the_stats,function(d){return getValue(entry, d);});
    var value_padding = Math.max((value_max - value_min)*0.05, value_min*0.05);

    y_scale = d3.scale.linear()
                            .domain([value_min-value_padding,value_max+value_padding])
                            .range([height-padding,padding]);

    var line =d3.svg.line()
                .x(
                    function(d,i)
                    {
                            return x_scale(i+1);
                    }
                )
                .y(
                    function(d)
                    {
                        return y_scale(getValue(entry, d));
                    }
                )
                .interpolate("linear");

    var mypath = d3.select("#graph");

    if(the_stats.length > 1)
        mypath.attr("d",line(the_stats));
    else if(the_stats.length == 1)
    {
        var vertical_center = (y_scale.range()[0]+y_scale.range()[1]) /2;
        mypath.attr("d","M "+x_scale.range()[0]+" "+vertical_center+" L "+x_scale.range()[1]+" "+vertical_center);
    }
    else
        console.log("shouldn't happen");

    var xAxis = d3.svg.axis()
                    .scale(x_scale)
                    .orient("bottom")
                    .tickFormat(function(d){return Math.floor(d);});

    var yAxis = d3.svg.axis()
                    .scale(y_scale)
                    .orient("left");

    canvas.select("#xAxis")
        .call(xAxis);
    
    canvas.select("#yAxis")
        .transition().duration(500).ease("sin-in-out")
        .call(yAxis);

    canvas.select("#y-axis-label")
        .text(entry);

    var icons = canvas.selectAll(".hero-bubble").data(the_stats, function(d){return d["match_id"];});

    icons.enter()
        .append("g")
        .attr("class", "hero-bubble")
        .each(createHeroBubble);

    icons.each(updateHeroBubble);

    icons.exit()
        .remove();
}


var icon_images = {
    "abaddon":              "/static/img/heroes/icons/Abaddon_icon.png",
    "alchemist":            "/static/img/heroes/icons/Alchemist_icon.png",
    "ancient_apparition":   "/static/img/heroes/icons/Ancient_Apparition_icon.png",
    "antimage":             "/static/img/heroes/icons/Antimage_icon.png",
    "arc_warden":           "/static/img/heroes/icons/Arc_Warden_icon.png",
    "axe":                  "/static/img/heroes/icons/Axe_icon.png",
    "bane":                 "/static/img/heroes/icons/Bane_icon.png",
    "batrider":             "/static/img/heroes/icons/Batrider_icon.png",
    "beastmaster":          "/static/img/heroes/icons/Beastmaster_icon.png",
    "bloodseeker":          "/static/img/heroes/icons/Bloodseeker_icon.png",
    "bounty_hunter":        "/static/img/heroes/icons/Bounty Hunter_icon.png",
    "brewmaster":           "/static/img/heroes/icons/Brewmaster_icon.png",
    "bristleback":          "/static/img/heroes/icons/Bristleback_icon.png",
    "broodmother":          "/static/img/heroes/icons/Broodmother_icon.png",
    "centaur":              "/static/img/heroes/icons/Centaur Warrunner_icon.png",
    "chaos_knight":         "/static/img/heroes/icons/Chaos Knight_icon.png",
    "chen":                 "/static/img/heroes/icons/Chen_icon.png",
    "clinkz":               "/static/img/heroes/icons/Clinkz_icon.png",
    "crystal_maiden":       "/static/img/heroes/icons/Crystal Maiden_icon.png",
    "dark_seer":            "/static/img/heroes/icons/Dark Seer_icon.png",
    "dazzle":               "/static/img/heroes/icons/Dazzle_icon.png",
    "death_prophet":        "/static/img/heroes/icons/Death Prophet_icon.png",
    "disruptor":            "/static/img/heroes/icons/Disruptor_icon.png",
    "doom_bringer":         "/static/img/heroes/icons/Doom Bringer_icon.png",
    "dragon_knight":        "/static/img/heroes/icons/Dragon Knight_icon.png",
    "drow_ranger":          "/static/img/heroes/icons/Drow Ranger_icon.png",
    "earthshaker":          "/static/img/heroes/icons/Earthshaker_icon.png",
    "elder_titan":          "/static/img/heroes/icons/Elder Titan_icon.png",
    "earth_spirit":          "/static/img/heroes/icons/Earth Spirit_icon.png",
    "ember_spirit":         "/static/img/heroes/icons/Ember Spirit_icon.png",
    "enchantress":          "/static/img/heroes/icons/Enchantress_icon.png",
    "enigma":               "/static/img/heroes/icons/Enigma_icon.png",
    "furion":               "/static/img/heroes/icons/Nature's Prophet_icon.png",
    "faceless_void":        "/static/img/heroes/icons/Faceless Void_icon.png",
    "gyrocopter":           "/static/img/heroes/icons/Gyrocopter_icon.png", 
    "huskar":               "/static/img/heroes/icons/Huskar_icon.png",
    "invoker":              "/static/img/heroes/icons/Invoker_icon.png",
    "jakiro":               "/static/img/heroes/icons/Jakiro_icon.png",
    "juggernaut":           "/static/img/heroes/icons/Juggernaut_icon.png",
    "keeper_of_the_light":  "/static/img/heroes/icons/Keeper of the Light_icon.png",
    "kunkka":               "/static/img/heroes/icons/Kunkka_icon.png",
    "legion_commander":     "/static/img/heroes/icons/Legion Commander_icon.png",
    "leshrac":              "/static/img/heroes/icons/Leshrac_icon.png",
    "lich":                 "/static/img/heroes/icons/Lich_icon.png",
    "life_stealer":         "/static/img/heroes/icons/Life Stealer_icon.png",
    "lina":                 "/static/img/heroes/icons/Lina_icon.png",
    "lion":                 "/static/img/heroes/icons/Lion_icon.png",
    "lone_druid":           "/static/img/heroes/icons/Lone Druid_icon.png",
    "luna":                 "/static/img/heroes/icons/Luna_icon.png",
    "lycan":                "/static/img/heroes/icons/Lycanthrope_icon.png",
    "magnataur":            "/static/img/heroes/icons/Magnataur_icon.png",
    "medusa":               "/static/img/heroes/icons/Medusa_icon.png",
    "meepo":                "/static/img/heroes/icons/Meepo_icon.png",
    "mirana":               "/static/img/heroes/icons/Mirana_icon.png",
    "morphling":            "/static/img/heroes/icons/Morphling_icon.png",
    "naga_siren":           "/static/img/heroes/icons/Naga Siren_icon.png",
    "necrolyte":            "/static/img/heroes/icons/Necrolyte_icon.png",
    "nevermore":            "/static/img/heroes/icons/Shadow Fiend_icon.png",
    "night_stalker":        "/static/img/heroes/icons/Night Stalker_icon.png",
    "nyx_assassin":         "/static/img/heroes/icons/Nyx Assassin_icon.png",
    "obsidian_destroyer":   "/static/img/heroes/icons/Obsidian Destroyer_icon.png",
    "ogre_magi":            "/static/img/heroes/icons/Ogre Magi_icon.png",
    "omniknight":           "/static/img/heroes/icons/Omniknight_icon.png",
    "oracle":               "/static/img/heroes/icons/Oracle_icon.png",
    "phantom_assassin":     "/static/img/heroes/icons/Phantom Assassin_icon.png",
    "phantom_lancer":       "/static/img/heroes/icons/Phantom Lancer_icon.png",
    "phoenix":              "/static/img/heroes/icons/Phoenix_icon.png",
    "puck":                 "/static/img/heroes/icons/Puck_icon.png",
    "pudge":                "/static/img/heroes/icons/Pudge_icon.png",
    "pugna":                "/static/img/heroes/icons/Pugna_icon.png",
    "queenofpain":          "/static/img/heroes/icons/Queen Of Pain_icon.png",
    "rattletrap":           "/static/img/heroes/icons/Rattletrap_icon.png",
    "razor":                "/static/img/heroes/icons/Razor_icon.png",
    "riki":                 "/static/img/heroes/icons/Riki_icon.png",
    "rubick":               "/static/img/heroes/icons/Rubick_icon.png",
    "sand_king":            "/static/img/heroes/icons/Sand King_icon.png",
    "shadow_demon":         "/static/img/heroes/icons/Shadow Demon_icon.png",
    "shadow_shaman":        "/static/img/heroes/icons/Shadow Shaman_icon.png",
    "shredder":             "/static/img/heroes/icons/Shredder_icon.png",
    "silencer":             "/static/img/heroes/icons/Silencer_icon.png",
    "skeleton_king":        "/static/img/heroes/icons/Wraith_King_icon.png",
    "skywrath_mage":        "/static/img/heroes/icons/Skywrath_Mage_icon.png",
    "slardar":              "/static/img/heroes/icons/Slardar_icon.png",
    "slark":                "/static/img/heroes/icons/Slark_icon.png",
    "sniper":               "/static/img/heroes/icons/Sniper_icon.png",
    "spectre":              "/static/img/heroes/icons/Spectre_icon.png", 
    "spirit_breaker":       "/static/img/heroes/icons/Spirit Breaker_icon.png",
    "storm_spirit":         "/static/img/heroes/icons/Storm_Spirit_icon.png",
    "sven":                 "/static/img/heroes/icons/Sven_icon.png",
    "techies":              "/static/img/heroes/icons/Techies_icon.png",
    "templar_assassin":     "/static/img/heroes/icons/Templar Assassin_icon.png",
    "terrorblade":          "/static/img/heroes/icons/Terrorblade_icon.png",
    "tidehunter":           "/static/img/heroes/icons/Tidehunter_icon.png",
    "tinker":               "/static/img/heroes/icons/Tinker_icon.png",
    "tiny":                 "/static/img/heroes/icons/Tiny_icon.png",
    "treant":               "/static/img/heroes/icons/Treant_icon.png",
    "troll_warlord":        "/static/img/heroes/icons/Troll Warlord_icon.png",
    "tusk":                 "/static/img/heroes/icons/Tusk_icon.png",
    "undying":              "/static/img/heroes/icons/Undying_icon.png",
    "vengefulspirit":       "/static/img/heroes/icons/Vengeful Spirit_icon.png",
    "venomancer":           "/static/img/heroes/icons/Venomancer_icon.png",
    "viper":                "/static/img/heroes/icons/Viper_icon.png", 
    "visage":               "/static/img/heroes/icons/Visage_icon.png",
    "ursa":                 "/static/img/heroes/icons/Ursa_icon.png",
    "warlock":              "/static/img/heroes/icons/Warlock_icon.png",
    "weaver":               "/static/img/heroes/icons/Weaver_icon.png",
    "windrunner":           "/static/img/heroes/icons/Windrunner_icon.png",
    "winter_wyvern":        "/static/img/heroes/icons/Winter_Wyvern_icon.png",
    "wisp":                 "/static/img/heroes/icons/Wisp_icon.png",
    "witch_doctor":         "/static/img/heroes/icons/Witch_Doctor_icon.png",
    "zuus":                 "/static/img/heroes/icons/Zeus_icon.png"
};

var icon_size = 48;
var color = "black";

function createHeroBubble(d,i)
{
    var group = d3.select(this);

    group.append("svg:circle")
        .attr({
            "cx": 0,
            "cy": 0,
            "r": icon_size*0.75,
            "fill": color,
            "opacity": 0
            });
        //.on("click", onBubbleClick)
        //.on("mouseover", onBubbleMouseover)
        //.on("mouseout", onBubbleMouseout);

    group.append("svg:image")
        .attr({
            "xlink:href": icon_images[d["data"]["hero"]],
            "x": -0.5*icon_size,
            "y": -0.5*icon_size,
            "width": icon_size,
            "height": icon_size,
            "pointer-events": "none"
            });

}

function updateHeroBubble(d,i)
{
    var group = d3.select(this);

    var x = x_scale(i+1);
    var y = y_scale(getValue(entry, d));

    group.attr("transform", "translate("+x+", "+y+")");

}