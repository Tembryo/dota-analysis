var background;
var matches;
var nr_matches = 5;

var gridLines = [];
var gridLabels = [];
var gridPoints = [];
var gridConnections = [];
var gridPointGroups = [];

var axisIMR;

function setBackground()
{
	if(background != undefined && typeof background.remove == 'function') background.remove();

	background = new Path.Rectangle({
	    point: [0, 0],
	    size: [view.size.width, view.size.height],
	    strokeWidth: 0,
	    fillColor: '#3E4156'
	});

	background.sendToBack();
}

function init_grid()
{
	var start_offset = 80;
	var finish_offset = 70;
	var step = (view.size.width - (start_offset + finish_offset) ) / (nr_matches - 1);


	// Draw grid vertical lines

	gridLines = [];

	for(var i = 0; i < nr_matches; ++i)
	{
		var gridLine = new Path();
		var offsetX = start_offset + i*step;

		gridLine.add(new Point(offsetX, 25));
		gridLine.add(new Point(offsetX, view.size.height - 25));

		gridLine.strokeWidth = 2;
		gridLine.strokeColor = '#454962';

		if(i == nr_matches - 1)
			gridLine.strokeColor = '#5A5D7D';

		gridLines.push(gridLine);
	}


	// Draw IMR axis

	var imrAxisName = new PointText({
	    content: 'IMR',
	    fillColor: '#9A9DaD',
	    fontFamily: 'Courier New',
	    fontSize: 14,
	    fontWeight:'bold'
	});

	imrAxisName.position.y = 10;
	imrAxisName.position.x = 20;

	axisIMR = getIMR();
	console.log(axisIMR);
	var imrStep = (axisIMR.max - axisIMR.min) / 8;
	var distanceStep = 310 / 9;
	var y_pos = view.size.height;

	for(var i = 0; i < 9; ++i)
	{
		y_pos -= distanceStep;
		var imr_val = axisIMR.min + imrStep*i;

		if(i == 0)
			imr_val = Math.floor(imr_val / 100) * 100;
		else
			imr_val = Math.ceil(imr_val / 100) * 100;
					

		var imrLabel = new PointText({
		    content: imr_val,
		    fillColor: '#7A7D9D',
		    fontFamily: 'Courier New',
		    fontSize: 13
		});

		imrLabel.pivot = imrLabel.bounds.center;
		imrLabel.position.x = 20;
		imrLabel.position.y = y_pos;

		gridLabels.push(imrLabel);
	}

}

// returns the minimum and maximum IMR in the counted matches
function getIMR()
{
	var max = Number.NEGATIVE_INFINITY;
	var min = Number.POSITIVE_INFINITY;

	$.each(matches.slice(-nr_matches),function(index,match){

		if(match.IMR > max) max = match.IMR;
		if(match.IMR < min) min = match.IMR;

	});

	return {max:max,min:min};
}

// renders the matches on the graph in relation to IMR
function plot_matches()
{
	$.each(matches.slice(-nr_matches),function(index,match){

		// calculate the point on the graph where this match should go
		var y_percent = (match.IMR - axisIMR.min) / (axisIMR.max - axisIMR.min);
		var centerPoint = new Point(gridLines[index].segments[0].point.x,25 + (1-y_percent) * (view.size.height - 50));

		var circleRadius = 14;
		var scale = 0.35;

		if(nr_matches == 10) scale = 0.3;
		if(nr_matches == 20) scale = 0.2;
		if(nr_matches >= 50) scale = 0.12;

		// Load pic from server
		var raster = new Raster('http://wisdota.com'+hero_pictures[match.hero]);
		raster.position = centerPoint;

		// Create the mask path
		var matchPoint = new Path.Circle({
			center: centerPoint,
			radius: circleRadius,
			
		});

		// Mask the image
		var pointGroup = new Group({
			children: [matchPoint, raster],
			clipped: true
		});	

		// When the image loads
		raster.onLoad = function() {
			// Fit the circle around the image
			raster.scale(scale);
			matchPoint.fitBounds(raster.bounds);

		};

		// Sets a property for the current point which represents the index of 
		// this match in the whole matches array and not just the last `nr_matches` matches
		if(matches.length < nr_matches)
			pointGroup.realMatchID = index;
		else
			pointGroup.realMatchID = matches.length - nr_matches + index;
			
		// Set the index of the sliced matches array
		pointGroup.matchID = index;
		pointGroup.selectedColor = '#E29C39';

		pointGroup.onClick = function(e){

			console.log(this);

			e.preventDefault();

			var match_index = this.matchID;

			// Remove the selected property from each point
			$.each(gridPointGroups,function(index,pointGroup){
				pointGroup.children[0].selected = false;
			});

			// This becomes selected
			gridPointGroups[match_index].children[0].selected = true;

			// Trigger the `matchClicked` event to update all the ratings
			displayMatch(this.realMatchID);

		};

		// Auto-select the last point when the graph is initialized
		if(index == matches.slice(-nr_matches).length - 1)
			pointGroup.children[0].selected = true;

		// Save the elements in some arrays
		gridPointGroups.push(pointGroup);
		gridPoints.push(matchPoint);

	});


	// Render the connections between the graph's points
	for(var i = 0; i < gridPointGroups.length - 1; ++i)
	{
		var connection = new Path();
		connection.add(gridPointGroups[i].position);
		connection.add(gridPointGroups[i+1].position);
		connection.strokeColor = '#ffffff';

		var strokeWidth = 2;

		if(nr_matches >= 50) strokeWidth = 2;

		connection.strokeWidth = strokeWidth;

		connection.insertBelow(gridPointGroups[i]);

		gridConnections.push(connection);
	}

	// Trigger a `matchClicked` event here to set the ratings for the latest match
	parent.$('body').trigger('matchClicked',[{match_index:gridPointGroups[gridPointGroups.length-1].realMatchID}]);
}

// Clears all elements of the graph
function clear_graph()
{
	$.each(gridPoints,function(index,elem){ elem.remove(); });
	gridPoints = [];

	$.each(gridLines,function(index,elem){ elem.remove(); });
	gridLines = [];

	$.each(gridLabels,function(index,elem){ elem.remove(); });
	gridLabels = [];

	$.each(gridConnections,function(index,elem){ elem.remove(); });
	gridConnections = [];

	$.each(gridPointGroups,function(index,elem){ elem.remove(); });
	gridPointGroups = [];
}


function drawGraph(data)
{
	matches = data;
	nr_matches = data.length;

	clear_graph();
	init_grid();
	plot_matches();
}
