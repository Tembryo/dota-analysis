json_address="/api/match/"+match_id;

function main()
{
	loadData(json_address, initVisualisation);
}

window.onload = main;
