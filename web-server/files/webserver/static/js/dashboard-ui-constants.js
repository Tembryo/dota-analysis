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
            "tip": "Click enemies as often as possible to see their current items and exact HP/Mana values.",
            "fixed_direction": 0,
            "format": function(value){return value.toFixed(2)+" checks per minute";},
            "ordering": 0
        },
    "average-check-duration":
        {   "label": "Check Speed",
            //"scale": d3.scale.linear().domain([0.5, 3]).range([0,100]).clamp(true),
            "explanation": "Average time you take to check the items of opponents.",
            "tip": "Checking enemy inventories should be as quick as possible, you have many other things to do!",
            "fixed_direction": 0,
            "format": function(value){return value.toFixed(2)+"s per check";},
            "ordering": 1

        },
    "camera-jumps-per-minute":
        {   "label": "Camera Jumps",
            //"scale": d3.scale.linear().domain([0, 400]).range([0,100]).clamp(true),
            "explanation": "Number of big camera jumps (e.g. via minimap).",
            "tip": "Use the minimap to jump with your camera and view action happening somewhere else.",
            "format": function(value){return value.toFixed(2)+" jumps per minute";},
            "ordering": 2
        },
    "camera-average-movement":
        {   "label": "Camera Movement",
            //"scale": d3.scale.linear().domain([500, 2000]).range([0,100]).clamp(true),
            "explanation": "Distance covered as you move your camera.",
            "tip": "Keep your camera moving to see as much as possible.",
            "format": function(value){return Math.floor(value)+" units moved per second";},
            "ordering": 3
        },
    "camera-distance-average":
        {   "label": "Camera Distance",
            //"scale": d3.scale.linear().domain([500, 2000]).range([0,100]).clamp(true),
            "explanation": "Average distance from your camera to your hero.",
            "tip": "You need to keep an eye on your hero, but sometimes you better look somewhere else.",
            "format": function(value){return Math.floor(value)+" units average distance";},
            "ordering": 4
        },
    "camera-distance-stdev":
        {   "label": "Camera Distance Variation",
            //"scale": d3.scale.linear().domain([500, 2000]).range([0,100]).clamp(true),
            "explanation": "Standard deviation of the distance from your camera to your hero.",
            "tip": "You alternate looking at things close to your hero and keeping track of action far away.",
            "format": function(value){return Math.floor(value)+" units deviation";},
            "ordering": 5
        },
    "camera-percent-self":
        {   "label": "Camera Near",
            //"scale": d3.scale.linear().domain([0, 1]).range([0,100]).clamp(true),
            "explanation": "Time you spent looking at your hero.",
            "tip": "You need to keep an eye on your hero, but sometimes you better look somewhere else.",
            "format": function(value){return Math.floor(value*100)+"% time close";},
            "ordering": 6
        },
    "camera-percent-moving":
        {   "label": "Camera Moving",
            //"scale": d3.scale.linear().domain([0, 1]).range([0,100]).clamp(true),
            "explanation": "Time you spent moving the camera.",
            "tip": "Keep your camera moving to see as much as possible.",
            "format": function(value){return Math.floor(value*100)+"% time moving";},
            "ordering": 7
        },
    "camera-percent-far":
        {   "label": "Camera Far",
            //"scale": d3.scale.linear().domain([0, 1]).range([0,100]).clamp(true),
            "explanation": "Time you spent looking at things far away from your hero.",
            "tip": "You need to keep an eye on your hero, but sometimes you better look somewhere else.",
            "format": function(value){return Math.floor(value*100)+"% time far";},
            "ordering": 8
        },

    "GPM":
        {   "label": "GPM",
            //"scale": d3.scale.linear().domain([0, 900]).range([0,100]).clamp(true),
            "explanation": "Average gold gained per minute.",
            "tip": "Earning Gold is crucial to success.",
            "format": function(value){return Math.floor(value)+" GPM";},
            "ordering": 0
        },
    "XPM":
        {   "label": "XPM",
            //"scale": d3.scale.linear().domain([0, 600]).range([0,100]).clamp(true),
            "explanation": "Average experience gained per minute.",
            "tip": "Make sure you collect enough experience, if you are underleveled your abilities will lose their impact.",
            "format": function(value){return Math.floor(value)+" XPM";},
            "ordering": 1
        },
    "lasthits-per-minute":
        {   "label": "Lasthits",
            //"scale": d3.scale.linear().domain([100, 0]).range([0,100]).clamp(true),
            "explanation": "Number of creeps you lasthit.",
            "tip": "Creeps are money. More money -  more win.",
            "format": function(value){return value.toFixed(2)+" lasthits per minute";},
            "fixed_direction": 1,
            "ordering": 2
        },
    "lasthits-total-contested":
        {   "label": "Contesting Lasthits",
            //"scale": d3.scale.linear().domain([100, 0]).range([0,100]).clamp(true),
            "explanation": "Number of enemy lasthits you contested.",
            "tip": "We you are strong, prevent the enemy from taking farm.",
            "format": function(value){return Math.floor(value)+" lasthits contested";},
            "ordering": 6
        },
    "lasthits-contested-percent-lasthit":
        {   "label": "Contest success",
            //"scale": d3.scale.linear().domain([0, 1]).range([0,100]).clamp(true),
            "explanation": "Percentage of the lasthits an enemy got when you contested him.",
            "tip": "When you are nearby, make sure the enemy doesn't get the lasthit on your creeps.",
            "format": function(value){return Math.floor(value*100)+"% lost lasthits";},
            "ordering": 7
        },
    "lasthits-taken-percent-free":
        {   "label": "Freefarm",
            //"scale": d3.scale.linear().domain([0, 1]).range([0,100]).clamp(true),
            "explanation": "Percentage of your lasthits that were free to take.",
            "tip": "Sometimes it is better to just go to a safe place and hit creeps.",
            "format": function(value){return Math.floor(value*100)+"% free lasthits";},
            "ordering": 4
        },
    "lasthits-missed-free":
        {   "label": "Missed Lasthits",
            //"scale": d3.scale.linear().domain([100, 0]).range([0,100]).clamp(true),
            "explanation": "Number of lasthits you missed that were free to take.",
            "tip": "When nobody is around, you should be lasthitting every creep that dies. Every single one!",
            "fixed_direction": -1,
            "format": function(value){return Math.floor(value)+" missed creeps";},
            "ordering": 3
        },
    "lasthits-percent-taken-against-contest":
        {   "label": "Lasthits Against Contest",
            //"scale": d3.scale.linear().domain([0, 1]).range([0,100]).clamp(true),
            "explanation": "Percentage of the lasthits you got when challenged by an enemy.",
            "tip": "Lasthitting creeps while competing with an enemy is a challenge, keep practicing.",
            "format": function(value){return Math.floor(value*100)+"% lasthits taken";},
            "ordering": 5
        },

    "kills":
        {   "label": "Kills",
            //"scale": d3.scale.linear().domain([0, 20]).range([0,100]).clamp(true),
            "explanation": "Number of opponents killed",
            "tip": "Kill enemies and you will gain a significant advantage over them.",
            "fixed_direction": 1,
            "format": function(value){return Math.floor(value)+ " kills";},
            "ordering": 0
        },
    "deaths":
        {   "label": "Deaths",
            //"scale": d3.scale.linear().domain([20, 0]).range([0,100]).clamp(true),
            "explanation": "Your number of deaths",
            "tip": "Most deaths could be avoided with a little more careful play.",
            "fixed_direction": -1,
            "format": function(value){return Math.floor(value)+" deaths";},
            "ordering": 1
        },
    "fightsPerMin":
        {   "label": "Fights",
            //"scale": d3.scale.linear().domain([0, 60]).range([0,100]).clamp(true),
            "explanation": "Frequency of engagements you were involved in .",
            "tip": "Fight the enemy a lot to keep up pressure.",
            "format": function(value){return (1/value).toFixed(2)+" minutes inbetween fights";},
            "ordering": 2
        },
    "initiation-score":
        {   "label": "Initiation Score",
            //"scale": d3.scale.linear().domain([0, 60]).range([0,100]).clamp(true),
            "explanation": "Success of fights that you initiated.<br/> Higher the more gold and exp your team gained from fights that your side started.",
            "tip": "Take fights when you know you will win.",
            "format": function(value){return value.toFixed(2);},
            "ordering": 3
        }      
};