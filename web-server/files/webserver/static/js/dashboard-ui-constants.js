var ratings =[
{   "key":      "Mechanics",
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
            "ordering": 2
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
            "ordering": 3
        }      
};