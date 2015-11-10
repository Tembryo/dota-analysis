                .on("mousedown",function(d){
				gui_state["cursor-time"] = validateTimeCursor(d3.mouse(this)[0]);
				updateDisplay();
			})
