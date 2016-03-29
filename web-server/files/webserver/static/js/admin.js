$('.nav-tabs a').on('show.bs.tab', function(event){
    var selected = $(event.target).attr("href");         // active tab

    console.log("showing", selected);
    switch(selected)
    {
    case "#users":
        $.getJSON("api/admin-stats/users",
            function(data)
            {
                console.log("u", data);
                d3.select("#users-nr").text(data.rows[0]["count"]);
            }
        );
        break;
    case "#retrieval-statuses":
        $.getJSON("api/admin-stats/retrieval-statuses",
            function(data)
            {
                console.log("rs", data);
                displayTable(data, "#retrieval-statuses-table");
            }
        );
        break;
    case "#processing-statuses":
        $.getJSON("api/admin-stats/processing-statuses",
            function(data)
            {
                console.log("ps", data)
                displayTable(data, "#processing-statuses-table");
            }
        );
        break;
    case "#mmr-samples":
        $.getJSON("api/admin-stats/mmrs",
            function(data)
            {
                console.log("ps", data)
                displayTable(data, "#mmr-samples-table");
            }
        );
    }


    var y = $(event.relatedTarget).text();  // previous tab
});

$(document).ready(function(){
    $('.nav-tabs a[href="#users"]').tab('show');
});


function displayTable(data, table_selector)
{
    var table = d3.select(table_selector);

    var header_row = d3.select(table_selector+" thead tr");
    var cols  = header_row.selectAll(".fieldname").data(data.fields, function(d,i){return i});
    cols.enter()
        .append("th")
            .attr("class","fieldname")
            .text(function(d)
                {
                    return d["name"];
                });
    cols.exit().remove();

    var body = d3.select(table_selector+" tbody");
    var rows  = body.selectAll(".tablerow").data(data.rows)
    rows.enter()
        .append("tr")
            .attr("class","tablerow")
            .each(function(d){
                var row = d3.select(this);

                for(var i = 0; i < data.fields.length; ++i)
                    row
                        .append("td")
                        .text(d[data.fields[i]["name"]]);
            })
    rows.exit().remove();
}