var background;
var attributesCircle;
var averageRatingPolygon;
var matchRatingPolygon;

var matchRatingText = [];

var nr_attributes;
var attributes = [];

function setBackground()
{
	if(background != undefined && typeof background.remove == 'function') background.remove();

	background = new Path.Rectangle({
	    point: [0, 0],
	    size: [view.size.width, view.size.height],
	    strokeWidth: 0,
	    fillColor: '#383838'
	});

	background.sendToBack();
}

function drawCardBackground()
{
	setBackground();

	var centerCircle = new Path.Circle(view.center,11);
	centerCircle.fillColor = '#848486';


	var color1 = '#848486';
	var color2 = '#5D5D5F';

	var distance = 9;

	for(var i = 0; i < 9; ++i)
	{
		var circle = new Path.Circle(view.center, distance);
		circle.strokeWidth = 1;
		circle.strokeColor = (distance/9 % 2 == 1 ? color1 : color2);
		
		distance += 9;
	}

	attributesCircle = new Path.Circle(view.center,115);


	// Draw the attribute points
	var attributePoints = new Group();

	for(var i = 0; i < ratings.length; ++i)
	{
		var x = view.center.x + 105 * Math.cos(2 * Math.PI * i / ratings.length);
		var y = view.center.y + 105 * Math.sin(2 * Math.PI * i / ratings.length);

		var x_graph = view.center.x + 81 * Math.cos(2 * Math.PI * i / ratings.length);
		var y_graph = view.center.y + 81 * Math.sin(2 * Math.PI * i / ratings.length);

	 	var attributePoint = new Path.Circle(new Point(x,y),6);
		attributePoint.strokeColor = attributes[i].color;
		attributePoint.fillColor = '#383838';

		var attributeGraphPoint = new Path.Circle(new Point(x_graph,y_graph),6);
		attributeGraphPoint.strokeWidth = 0;

		ratings[i].point = attributePoint;
		ratings[i].graphPoint = attributeGraphPoint;

		attributePoints.addChildren([attributePoint,attributeGraphPoint]);
	}

	// Rotate the points so that the first one sits at an angle of Math.PI / 2
	attributePoints.rotate(-90,view.center);

	// Draw the other elements of the graph after we have rotated the points
	for(var i = 0; i < ratings.length; ++i)
	{
		var attributePoint = ratings[i].point;
		var attributeGraphPoint = ratings[i].graphPoint;

		var attributeLine = new Path();
		attributeLine.add(attributePoint.position);
		attributeLine.add(view.center);
		attributeLine.strokeColor = '#848486';
		attributeLine.strokeWidth = 1;
		attributeLine.insertBelow(attributePoint);

		var attributeGraphLine = new Path();
		attributeGraphLine.add(attributeGraphPoint.position);
		attributeGraphLine.add(view.center);
		attributeGraphLine.strokeWidth = 0;

		ratings[i].line = attributeLine;
		ratings[i].graphLine = attributeGraphLine;

		var attributeName = new PointText({
		    content: ratings[i].label,
		    fillColor: '#aaa',
		    fontFamily: 'Arial',
		    fontSize: 12
		});

		attributeName.pivot = attributeName.bounds.center;
		attributeName.position.x = attributePoint.position.x

		if(attributePoint.position.y < view.center.y)
			attributeName.position.y = attributePoint.position.y - 37;
		else
			attributeName.position.y = attributePoint.position.y + 37;

	}

}

function drawAverageCard(data)
{
	averageRatingPolygon = new Path();
	averageRatingPolygon.strokeColor = '#E19326';

	for(var i = 0; i < ratings.length; ++i)
	{
		var center = {x: ratings[i].graphLine.segments[1].point.x, y: ratings[i].graphLine.segments[1].point.y};
		var vertex = {x: ratings[i].graphLine.segments[0].point.x, y: ratings[i].graphLine.segments[0].point.y};

		var ratingX = center.x + data[ratings[i].key].value_normalized * (vertex.x - center.x);
		var ratingY = center.y + data[ratings[i].key].value_normalized * (vertex.y - center.y);

		averageRatingPolygon.add(new Point(ratingX,ratingY));

	}

	averageRatingPolygon.fillColor = '#E19326';
	averageRatingPolygon.opacity = 0.9;

}


function drawCard(data)
{
	// Delete polygon if it already exists
	if(matchRatingPolygon != undefined && typeof matchRatingPolygon.remove == 'function') matchRatingPolygon.remove();

	matchRatingPolygon = new Path();
	matchRatingPolygon.strokeColor = '#FFFFFF';

	// Clear rating text
	$.each(matchRatingText,function(index,textElement){
		textElement.remove();
	});

	matchRatingText = [];

	for(var i = 0; i < ratings.length; ++i)
	{
		var attributePoint = ratings[i].point;

		var center = {x: ratings[i].graphLine.segments[1].point.x, y: ratings[i].graphLine.segments[1].point.y};
		var vertex = {x: ratings[i].graphLine.segments[0].point.x, y: ratings[i].graphLine.segments[0].point.y};

		var ratingX = center.x + data.ratings[i].rating_normalized * (vertex.x - center.x);
		var ratingY = center.y + data.ratings[i].rating_normalized * (vertex.y - center.y);

		matchRatingPolygon.add(new Point(ratingX,ratingY));

		var attributeRating = new PointText({
		    content: data.attributes[i].rating,
		    fillColor: '#eee',
		    fontFamily: 'Arial',
		    fontSize: 12
		});

		attributeRating.pivot = attributeRating.bounds.center;
		attributeRating.position.x = attributePoint.position.x

		if(attributePoint.position.y < view.center.y)
			attributeRating.position.y = attributePoint.position.y - 21;
		else
			attributeRating.position.y = attributePoint.position.y + 21;

		matchRatingText.push(attributeRating);

	}

	matchRatingPolygon.fillColor = '#FFFFFF';
	matchRatingPolygon.opacity = 0.9;
	matchRatingPolygon.insertAbove(averageRatingPolygon);

}