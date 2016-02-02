$(document).ready(function(){	
	$("#ratePlayerBtn").click(function(){
		
		$("#progressTimer").progressTimer({
		    timeLimit: 12,
		    warningThreshold: 10,
		    baseStyle: 'progress-bar-warning',
		    warningStyle: 'progress-bar-danger',
		    completeStyle: 'progress-bar-info',
		    onFinish: function() {
		        console.log("I'm done");
		        window.location.replace("results.html")
		    }
		});
	});


});