$(document).ready(function(){	
	$("#ratePlayerBtn").click(function(){
		timeoutID = window.setTimeout(modifyBar1,3000);
	});

	function modifyBar1(){
		$("#my-loading-bar").attr("style","width:30%").text("30% Complete");
		$("#my-modal-title").text("Parsing Replay");
		timeoutID = window.setTimeout(modifyBar2,4000);
	}

	function modifyBar2(){
		$("#my-loading-bar").attr("style","width:50%").text("50% Complete");
		$("#my-modal-title").text("Analysing Match");
		timeoutID = window.setTimeout(modifyBar3,4000);

	}

	function modifyBar3(){
		$("#my-loading-bar").attr("style","width:80%").text("80% Complete");
		$("#my-modal-title").text("Calculating MMR");
		timeoutID = window.setTimeout(modifyBar4,6000);

	}

	function modifyBar4(){
		$("#my-loading-bar").attr("style","width:100%").text("100% Complete");
		timeoutID = window.setTimeout(modifyBar5,2000);
	}
	function modifyBar5(){
		window.location.replace("results.html");
	}

});