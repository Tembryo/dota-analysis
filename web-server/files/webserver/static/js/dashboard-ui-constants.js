var ratings =[
{   "key":      "Mechanics",
<<<<<<< HEAD
    "label":    "Mechanics",
    "colour":   '#0FA9D7'
},
{
    "key":      "Farming",
    "label":    "Farming",
    "colour":   '#4DD264'
},
{
    "key":      "Fighting",
    "label":    "Fighting",
    "colour":   '#EA900C'
},
{
    "key":      "Movement",
    "label":    "Movement",
    "colour":   '#D73356'
},
{
    "key":      "Miscellaneous",
    "label":    "Other",
    "colour":   '#5A56DC'
}];


var skill_constants = {

    //        Mechanics skills

=======
    "label":    "Mechanics"
},
{
    "key":      "Farming",
    "label":    "Farming"
},
{
    "key":      "Fighting",
    "label":    "Fighting"
}];

var skill_constants = {
>>>>>>> 2e1af2313645758671669fecce11f5d82b7eea54
    "checks-per-minute":
        {   "label": "Item Checks",
            //"scale": d3.scale.linear().domain([0, 300]).range([0,100]).clamp(true),
            "explanation": "How frequently did you click on other units to check their state.",
            "tips": {
                "1": "Click enemies as often as possible to see their current items and exact HP/Mana values.",
                "-1": "You should focus less on check units and maybe play more calmly."
            },
            "fixed_direction": 0,
            "format": function(value){return value.toFixed(2)+" checks per minute";},
            "ordering": 0
        },
    "average-check-duration":
        {   "label": "Check Speed",
            //"scale": d3.scale.linear().domain([0.5, 3]).range([0,100]).clamp(true),
            "explanation": "Average time you take to check the items of opponents.",
            "tips": {
                "-1":   "Checking enemy inventories should be as quick as possible, you have many other things to do!",
                "1":    "Take a bit more time when checking units, maybe you will memorize more."
            },
            "fixed_direction": 0,
            "format": function(value){return value.toFixed(2)+"s per check";},
            "ordering": 1

        },
    "camera-jumps-per-minute":
        {   "label": "Camera Jumps",
            //"scale": d3.scale.linear().domain([0, 400]).range([0,100]).clamp(true),
            "explanation": "Number of big camera jumps (e.g. via minimap).",
            "tips":{
                "1": "Use the minimap to jump with your camera and view action happening somewhere else.",
                "-1": "Don't jump around with your camera that much, stay calm and focused."
            },
            "fixed_direction": 0,
            "format": function(value){return value.toFixed(2)+" jumps per minute";},
            "ordering": 2
        },
    "camera-average-movement":
        {   "label": "Camera Movement",
            //"scale": d3.scale.linear().domain([500, 2000]).range([0,100]).clamp(true),
            "explanation": "Distance covered as you move your camera.",
            "tips": {
                "1": "Keep your camera moving to see as much as possible.",
                "-1": "Don't move your camera that much, play calmer and consciously choose where to look."
            },
            "fixed_direction": 0,
            "format": function(value){return Math.floor(value)+" units moved per second";},
            "ordering": 3
        },
    "camera-distance-average":
        {   "label": "Camera Distance",
            //"scale": d3.scale.linear().domain([500, 2000]).range([0,100]).clamp(true),
            "explanation": "Average distance from your camera to your hero.",
            "tips": {
                "1": "You should look more at things happening far from away from your hero, to get a better awareness of the game.",
                "-1": "Keeping an eye on your hero is important, you might get ambushed if you get too distracted"
            },
            "fixed_direction": 0,
            "format": function(value){return Math.floor(value)+" units average distance";},
            "ordering": 4
        },
    "camera-distance-stdev":
        {   "label": "Camera Distance Variation",
            //"scale": d3.scale.linear().domain([500, 2000]).range([0,100]).clamp(true),
            "explanation": "Standard deviation of the distance from your camera to your hero.",
            "tips": {
                "1": "You should alternate more between looking at things close to your hero and keeping track of action far away.",
                "-1": "Decide more consciously if the important events are near your hero or far away."
            },
            "fixed_direction": 0,
            "format": function(value){return Math.floor(value)+" units deviation";},
            "ordering": 5
        },
    "camera-percent-self":
        {   "label": "Camera Near",
            //"scale": d3.scale.linear().domain([0, 1]).range([0,100]).clamp(true),
            "explanation": "Time you spent looking at your hero.",
            "tips": {
                "1": "Spend more time looking at your hero, you might get ambushed.",
                "-1": "Keep track of what is happening around the map, otherwise you won't know how your team is doing."
            },
            "fixed_direction": 0,
            "format": function(value){return Math.floor(value*100)+"% time close";},
            "ordering": 6
        },
    "camera-percent-moving":
        {   "label": "Camera Moving",
            //"scale": d3.scale.linear().domain([0, 1]).range([0,100]).clamp(true),
            "explanation": "Time you spent moving the camera.",
            "tips": {
                "1": "Keep your camera moving to see as much as possible.",
                "-1": "You are too restless with your camera, do things more deliberately to use your time better."
            },
            "fixed_direction": 0,
            "format": function(value){return Math.floor(value*100)+"% time moving";},
            "ordering": 7
        },
    "camera-percent-far":
        {   "label": "Camera Far",
            //"scale": d3.scale.linear().domain([0, 1]).range([0,100]).clamp(true),
            "explanation": "Time you spent looking at things far away from your hero.",
            "tips": {
                "1": "Make sure to spend enough time looking at fights ",
                "-1": "You need to keep an eye on your hero, but sometimes you better look somewhere else."
            },
            "fixed_direction": 0,
            "format": function(value){return Math.floor(value*100)+"% time far";},
            "ordering": 8
        },

<<<<<<< HEAD
    // Farming skills

=======
>>>>>>> 2e1af2313645758671669fecce11f5d82b7eea54
    "GPM":
        {   "label": "GPM",
            //"scale": d3.scale.linear().domain([0, 900]).range([0,100]).clamp(true),
            "explanation": "Average gold gained per minute.",
            "tips": {
                "1": "Earning Gold is crucial to success.",
                "-1": "Gold alone does not win games, make sure you are there to fight for the imortant objectives."
            },
            "fixed_direction": 0,
            "format": function(value){return Math.floor(value)+" GPM";},
            "ordering": 0
        },
    "XPM":
        {   "label": "XPM",
            //"scale": d3.scale.linear().domain([0, 600]).range([0,100]).clamp(true),
            "explanation": "Average experience gained per minute.",
            "tips": {
                "1": "Make sure you collect enough experience, if you are underleveled your abilities will lose their impact.",
                "-1": "Spending too much time alone collecting EXP hurts your team."
            },
            "fixed_direction": 0,
            "format": function(value){return Math.floor(value)+" XPM";},
            "ordering": 1
        },
    "lasthits-per-minute":
        {   "label": "Lasthits",
            //"scale": d3.scale.linear().domain([100, 0]).range([0,100]).clamp(true),
            "explanation": "Number of creeps you lasthit.",
            "tips": {
                "1": "Creeps are money. More money -  more win.",
                "-1": "Creeps are not everything, Dota is a PvP game."
            },
            "fixed_direction": 0,
            "format": function(value){return value.toFixed(2)+" lasthits per minute";},
            "fixed_direction": 1,
            "ordering": 2
        },
    "lasthits-total-contested":
        {   "label": "Contesting Lasthits",
            //"scale": d3.scale.linear().domain([100, 0]).range([0,100]).clamp(true),
            "explanation": "Number of enemy lasthits you contested.",
            "tips": {
                "1": "We you are strong, make sure to take the fight to enemies that try to farm.",
                "-1": "Maybe you should not spend so much time in lane against enemies, and rather ambush them."
            },
            "fixed_direction": 0,
            "format": function(value){return Math.floor(value)+" lasthits contested";},
            "ordering": 6
        },
    "lasthits-contested-percent-lasthit":
        {   "label": "Contest success",
            //"scale": d3.scale.linear().domain([0, 1]).range([0,100]).clamp(true),
            "explanation": "Percentage of the lasthits an enemy got when you contested him.",
            "tips": {
                "1": "...",
                "-1": "When you are nearby, make sure the enemy doesn't get the lasthits on your creeps."
            },
            "fixed_direction": -1,
            "format": function(value){return Math.floor(value*100)+"% lost lasthits";},
            "ordering": 7
        },
    "lasthits-taken-percent-free":
        {   "label": "Freefarm",
            //"scale": d3.scale.linear().domain([0, 1]).range([0,100]).clamp(true),
            "explanation": "Percentage of your lasthits that were free to take.",
            "tips": {
                "1": "Sometimes it is better to just go to a safe place and hit creeps rather than fight enemies for the space.",
                "-1": "You should show more presence on the map and go for farm that is contested by enemies."
            },
            "fixed_direction": 0,
            "format": function(value){return Math.floor(value*100)+"% free lasthits";},
            "ordering": 4
        },
    "lasthits-missed-free":
        {   "label": "Missed Lasthits",
            //"scale": d3.scale.linear().domain([100, 0]).range([0,100]).clamp(true),
            "explanation": "Number of lasthits you missed that were free to take.",
            "tips": {
                "1": "...",
                "-1": "When nobody is around, you should be lasthitting every creep that dies. Every single one!"
            },
            "fixed_direction": -1,
            "format": function(value){return Math.floor(value)+" missed creeps";},
            "ordering": 3
        },
    "lasthits-percent-taken-against-contest":
        {   "label": "Lasthits Against Contest",
            //"scale": d3.scale.linear().domain([0, 1]).range([0,100]).clamp(true),
            "explanation": "Percentage of the lasthits you got when challenged by an enemy.",
            "tips": {
                "1": "Lasthitting creeps while competing with an enemy is a challenge, keep practicing.",
                "-1": "..."
            },
            "fixed_direction": 1,
            "format": function(value){return Math.floor(value*100)+"% lasthits taken";},
            "ordering": 5
        },

<<<<<<< HEAD
    // Fighting Skills

=======
>>>>>>> 2e1af2313645758671669fecce11f5d82b7eea54
    "kills":
        {   "label": "Kills",
            //"scale": d3.scale.linear().domain([0, 20]).range([0,100]).clamp(true),
            "explanation": "Number of opponents killed",
            "tips": {
                "1": "Kill enemies and you will gain a significant advantage over them.",
                "-1": "..."
            },
            "fixed_direction": 1,
            "format": function(value){return Math.floor(value)+ " kills";},
            "ordering": 0
        },
    "deaths":
        {   "label": "Deaths",
            //"scale": d3.scale.linear().domain([20, 0]).range([0,100]).clamp(true),
            "explanation": "Your number of deaths",
            "tips": {
                "1": "...",
                "-1": "Most deaths could be avoided with a little more careful play."
            },
            "fixed_direction": -1,
            "format": function(value){return Math.floor(value)+" deaths";},
            "ordering": 1
        },
<<<<<<< HEAD
    "1-vs-1-kills":
        {   "label": "Solo Kills",
            //"scale": d3.scale.linear().domain([0, 20]).range([0,100]).clamp(true),
            "explanation": "Number of enemies you killed in 1  vs. 1 fights.",
            "tips": {
                "1": "Killing enemies on your own has a massive impact on how a game will progress.",
                "-1": "..."
            },
            "fixed_direction": 1,
            "format": function(value){return Math.floor(value)+ " kills";},
            "ordering": 2
        },
    "1-vs-1-deaths":
        {   "label": "Solo Deaths",
            //"scale": d3.scale.linear().domain([0, 20]).range([0,100]).clamp(true),
            "explanation": "Number of death in 1  vs. 1 fights.",
            "tips": {
                "1": "...",
                "-1": "Always try to keep track of which enemy hero can potentially kill you."
            },
            "fixed_direction": -1,
            "format": function(value){return Math.floor(value)+ " deaths";},
            "ordering": 3
        },
    "many-vs-1-kills":
        {   "label": "Gank Kills",
            //"scale": d3.scale.linear().domain([0, 20]).range([0,100]).clamp(true),
            "explanation": "Number of kills in fights where multiple heroes faced off a single one.",
            "tips": {
                "1": "Ganking with some allies can give you a way to kill enemies even when they are stronger than you on your own.",
                "-1": "Sometimes it is better if somebody else on your team takes the kill."
            },
            "fixed_direction": 0,
            "format": function(value){return Math.floor(value)+ " kills";},
            "ordering": 4
        },
    "many-vs-1-deaths":
        {   "label": "Gank Deaths",
            //"scale": d3.scale.linear().domain([0, 20]).range([0,100]).clamp(true),
            "explanation": "Number of deaths in fights where multiple heroes faced off a single one.",
            "tips": {
                "1": "?",
                "-1": "Always try to keep track of how you might die in a fight."
            },
            "fixed_direction": 0,
            "format": function(value){return Math.floor(value)+ " deaths";},
            "ordering": 5
        },
    "many-vs-many-kills":
        {   "label": "Teamfight Kills",
            //"scale": d3.scale.linear().domain([0, 20]).range([0,100]).clamp(true),
            "explanation": "Number of kills in teamfights (multiple heroes on both sides involved).",
            "tips": {
                "1": "Sometimes you should make sure to secure the kills in the fight yourself.",
                "-1": "Sometimes it is better if somebody else on your team takes the kill."
            },
            "fixed_direction": 0,
            "format": function(value){return Math.floor(value)+ " kills";},
            "ordering": 6
        },
    "many-vs-many-deaths":
        {   "label": "Teamfight Deaths",
            //"scale": d3.scale.linear().domain([0, 20]).range([0,100]).clamp(true),
            "explanation": "Number of deaths in teamfights (multiple heroes on both sides involved).",
            "tips": {
                "1": "Sometimes sacrifices ofr the team have to be made.",
                "-1": "Always try to keep track of how you might die in a fight."
            },
            "fixed_direction": 0,
            "format": function(value){return Math.floor(value)+ " deaths";},
            "ordering": 7
        },
=======
>>>>>>> 2e1af2313645758671669fecce11f5d82b7eea54
    "fightsPerMin":
        {   "label": "Fights",
            //"scale": d3.scale.linear().domain([0, 60]).range([0,100]).clamp(true),
            "explanation": "Frequency of engagements you were involved in .",
            "tips": {
                "1": "Fight the enemy a lot to keep up pressure.",
                "-1": "Sometimes there is better things to do than fighting heroes."
            },
            "fixed_direction": 0,
            "format": function(value){return (1/value).toFixed(2)+" minutes inbetween fights";},
<<<<<<< HEAD
            "ordering": 8
=======
            "ordering": 2
>>>>>>> 2e1af2313645758671669fecce11f5d82b7eea54
        },
    "initiation-score":
        {   "label": "Initiation Score",
            //"scale": d3.scale.linear().domain([0, 60]).range([0,100]).clamp(true),
            "explanation": "Success of fights that you initiated.<br/> Higher the more gold and exp your team gained from fights that your side started.",
            "tips": {
                "1": "Take fights only when you know you will win.",
                "-1": "Sometimes fighting is all about keeping heroes busy, and not about winning the engagement."
            },
            "fixed_direction": 0,
            "format": function(value){return value.toFixed(2);},
<<<<<<< HEAD
            "ordering": 9
        },
    "fight-coordination":
        {   "label": "Coordination Score",
            //"scale": d3.scale.linear().domain([0, 60]).range([0,100]).clamp(true),
            "explanation": "Measures the synchronisation of your teamfighting. <br/> Higher if you damage the same target as your teammates.",
            "tips": {
                "1": "Focus on one enemy at a time and kill him with your team.",
                "-1": "If there is enough damage available, switch focus and start bringing down the next target."
            },
            "fixed_direction": 0,
            "format": function(value){return value.toFixed(2);},
            "ordering": 10
        }

=======
            "ordering": 3
        }      
>>>>>>> 2e1af2313645758671669fecce11f5d82b7eea54
};