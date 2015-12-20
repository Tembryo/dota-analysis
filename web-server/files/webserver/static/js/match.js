json_address="/api/match/"+match_id;

function main()
{
	loadData(json_address, displayMatch);
}

function displayMatch()
{
    initVisualisation();
    displayFights(replay_data);
}

window.onload = main;
