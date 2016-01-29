$(document).ready(function(){	
	$("#progressTimer").progressTimer({
    timeLimit: 12,
    warningThreshold: 10,
    baseStyle: 'progress-bar-warning',
    warningStyle: 'progress-bar-danger',
    completeStyle: 'progress-bar-info',
    onFinish: function() {
        console.log("I'm done");
        window.location.replace("user.html")
    }
});

	// $("#ratePlayerBtn").click(function(){
	// 	var bar_width = 10
	// 	while (bar_width <100){
	// 		timeoutID = window.setTimeout(function(){modifyBar(bar_width);},10000);
	// 		bar_width = bar_width +1 
	// 	}
	// });

	// function modifyBar(bar_width){
	// 	var bar_str = bar_width.toString();
	// 	var str = "width:" + bar_str + "%"
	// 	var txt = bar_str + "% Complete"
	// 	$("#my-loading-bar").attr("style",str).text(txt);
	// }

});