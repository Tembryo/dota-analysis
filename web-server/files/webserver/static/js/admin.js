$('#main-tabs a').on('show.bs.tab', 
    function(event){
        var selected = $(event.target).attr("href");         // active tab
        var y = $(event.relatedTarget).text();  // previous tab
        showTab(selected);
    }
);

$(document).on('click', '#refresh', function () {
    var link = $('li.active a[data-toggle="tab"]');
    link.parent().removeClass('active');
    var tabLink = link.attr('href');
    console.log("refreshing");
    $('#main-tabs a[href="' + tabLink + '"]').tab('show');
});

function showTab(tabref){
    console.log("showing", tabref);
    switch(tabref)
    {
    case "#users":
        $.getJSON("api/admin-stats/users",
            function(data)
            {
                d3.select("#users-nr").text(data.rows[0]["count"]);
            }
        );
        $.getJSON("api/admin-stats/logins",
            function(data)
            {
                displayTable(data, "#logins-table");
            }
        );
        break;
    case "#jobs":
        $.getJSON("api/admin-stats/jobs",
            function(data)
            {
                displayTable(data, "#jobs-table");
            }
        );
        break;
    case "#scheduler":
        $.getJSON("api/admin-scheduler-state",
            function(data)
            {
                displayServices(data["services"]);
            }
        );
        break;
    case "#retrieval-statuses":
        $.getJSON("api/admin-stats/retrieval-statuses",
            function(data)
            {
                displayTable(data, "#retrieval-statuses-table");
            }
        );
        break;
    case "#processing-statuses":
        $.getJSON("api/admin-stats/processing-statuses",
            function(data)
            {
                displayTable(data, "#processing-statuses-table");
            }
        );
        break;
    case "#mmr-samples":
        $.getJSON("api/admin-stats/mmrs",
            function(data)
            {
                displayTable(data, "#mmr-samples-table");
            }
        );
        break;
    case "#mmr-distribution":
        $.getJSON("api/admin-stats/mmr-distribution",
            function(data)
            {
                displayTable(data, "#mmr-distribution-table");
            }
        );
        break;
    }
}


$(document).on('click', '#select-new-user', function () {
    var new_id =  parseInt($('#new-user-id').val());
    console.log("switching to user", new_id);
    $.getJSON("/api/admin-switch-user/"+new_id,
        function(data)
        {
            console.log("switched user", data)
            alert("switched to "+data["new-id"])
            location.reload();
        }
    );
});

$(document).on('click', '#find-user', function () {
    var name = $('#user-name').val();
    console.log("searching user", name);
    $.getJSON("/api/admin-find-user/"+encodeURIComponent(name),
        function(data)
        {
            console.log("found", data["users"].length)

            displayUserList(data["users"]);
        }
    );
});

$(document).on('click', '#list-all-users', function () {

    $.getJSON("/api/admin-list-users/?mode=all",
        function(data)
        {
            console.log("found", data["users"].length)
            displayUserList(data["users"]);
        }
    );
});


$(document).on('click', '#logs-by-time', function () {
    var timewindow =  parseInt($('#logs-timewindow').val());
    $.getJSON("/api/admin-get-logs/?timewindow="+timewindow,
        function(data)
        {
            displayLogs(data["logs"]);
        }
    );
});

$(document).on('click', '#logs-by-id', function () {
    var idstart =  parseInt($('#logs-idstart').val());
    var idend =  parseInt($('#logs-idstop').val());
    $.getJSON("/api/admin-get-logs/?id_start="+idstart+"&id_end="+idend,
        function(data)
        {
            displayLogs(data["logs"]);
        }
    );
});


function displayServices(list)
{
    var user_table = d3.select("#services_list");
    var rows  = user_table.selectAll(".service-row").data(list, function(d,i){return d["identifier"]});
    
    rows.enter()
        .append("tr")
        .attr("class", "service-row");
            

    rows.html(function(d){
                var time = new Date(d["last_heartbeat"]*1000);
                var timestring= time.getUTCHours()+":"+time.getUTCMinutes()+":"+time.getUTCSeconds()+"."+time.getUTCMilliseconds();
                return "<td>"+d["identifier"]+"</td><td>"+d["type"]+"</td><td>"+timestring+"</td>"+"<td>"+transformDict(d["job"])+"</td>"+"<td>"+transformDict(d["status"])+"</td>";
            });

    rows.exit().remove();
}



function displayLogs(list)
{
    var user_table = d3.select("#logs_list");
    var rows  = user_table.selectAll(".user-row").data(list, function(d,i){return d["id"]});
    
    rows.enter()
        .append("tr")
        .attr("class", "user-row")
            .html(function(d){
                var time = new Date(d["time"]*1000);
                var timestring= time.getUTCHours()+":"+time.getUTCMinutes()+":"+time.getUTCSeconds()+"."+time.getUTCMilliseconds();
                return "<td>"+d["id"]+"</td><td>"+timestring+"</td>"+"<td>"+transformDict(d["filters"])+"</td>"+"<td>"+transformDict(d["entry"])+"</td>";
            });

    rows.exit().remove();

    rows.order();
}

function transformDict(d){
    var result="";
    for (var k in d)
    {
        if(d[k] instanceof Object)
            result+= k+": <br/><span style='margin-left:10px'>"+transformDict(d[k])+"</span>";
        else
            result+= k+": "+d[k]+"<br/>";
    }
    return result;
}

function displayUserList(list)
{
    var user_table = d3.select("#user_list");
    var rows  = user_table.selectAll(".user-row").data(list, function(d,i){return d["id"]});
    
    rows.enter()
        .append("tr")
        .attr("class", "user-row")
            .html(function(d){return "<td>"+d["id"]+"</td><td>"+d["name"]+"</td>";});

    rows.exit().remove();
}

$(document).ready(function(){
    $('.nav-tabs a[href="#users"]').tab('show');
});


function displayTable(data, table_selector, key)
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
                        .attr("id", data.fields[i]["name"])
                        .text(d[data.fields[i]["name"]]);
            })

    rows.each(
            function(d){
                var row = d3.select(this);

                for(var i = 0; i < data.fields.length; ++i)
                    row.select("#"+data.fields[i]["name"])
                        .text(d[data.fields[i]["name"]]);
            }
        );

    rows.exit().remove();
}