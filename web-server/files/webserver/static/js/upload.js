keep_checking = false;
var n_tries = 0;
update_interval = 2000;

upload_list = [];


$("#upload-file").change(function(){
    var file = this.files[0];
    var name = file.name;
    var size = file.size;
    var type = name.substring(name.lastIndexOf(".")+1);
    //Your validation
    if(type === "dem")
    {
        console.log("OK");
        $("#upload-button").prop('disabled', false);
    }
    else
    {
        console.log("N" +type);
        $("#upload-button").prop('disabled', true);
    }
});

$("#upload-button").click(function(){
    console.log($('#upload-form'));
    var formData = new FormData($('#upload-form').get(0));
    $.ajax({
        url: '/api/upload',
        type: 'POST',
        xhr: function() {  // Custom XMLHttpRequest
            var myXhr = $.ajaxSettings.xhr();
            if(myXhr.upload){ // Check if upload property exists
                myXhr.upload.addEventListener('progress',onUploadProgress, false);
            }
            return myXhr;
        },
        //Ajax events
        beforeSend: beforeSendHandler,
        success: completeHandler,
        error: errorHandler,
        // Form data
        data: formData,
        //Options to tell jQuery not to process data or worry about content-type.
        cache: false,
        contentType: false,
        processData: false
    });
});

function beforeSendHandler(e){
}

function completeHandler(e){

    setTimeout(updateReplays(), update_interval/2);
    n_tries = 5;
    $('#progress-field').text("Upload complete");
    console.log("complete");
    console.log(e);
}
function errorHandler(e){
    $('#progress-field').text("Upload failed");
    console.log("error");
    console.log(e);
}


function onUploadProgress(e){
    console.log("progress");
    console.log(e);
    if(e.lengthComputable){
        var percent_complete = (e.loaded / e.total) * 100;
        console.log(" complete " + percent_complete.toFixed(2));
        $('#progress-field').text(percent_complete.toFixed(2)+"%");
    }
}



function updateReplays()
{
    d3.json("/api/uploads"
		,function(error, data){
			upload_list = data;
            upload_list.sort(function(a,b){return parseInt(a["match_id"])-parseInt(b["match_id"]);});
            updateList();
            
            keep_checking = false;
            for(var upload_i in upload_list)
            {
                if(upload_list[upload_i]["status"] === "uploaded" || upload_list[upload_i]["status"] === "processing" || upload_list[upload_i]["status"] === "extracted" )
                {
                    keep_checking = true;
                    break;
                }
            }

            if(keep_checking || n_tries > 0)
            {
            	setTimeout(updateReplays, update_interval);
                if(n_tries > 0)
                    n_tries--;
                console.log(n_tries);
            }
		});
}

function updateList()
{
	var uploads = d3.select("#uploads-table").selectAll(".upload").data(upload_list, function(match){
					return match["_id"];
				});

	uploads.enter()
		.append("tr")
		.attr("class", "upload")
		.each(createUploadElement);

	uploads.each(updateUploadElement);

	uploads.exit()
		.remove();
}

function createUploadElement(upload)
{
    if(upload["status"] === "registered")
    {
        d3.select(this)
		    .append("td")
            .attr("colspan", 2)
		        .append("a")
                .attr("href", function(file){return "/match/"+upload["match_id"];})
                .text(upload["match_id"]);
    }
    else
    {
        d3.select(this)
		        .append("td")
		            .append("a")
                    .attr({
                            "href": function(file){return "/match/"+upload["match_id"];},
                            "class": "match-id"})
        d3.select(this)
		        .append("td")
                .attr("class", "status")
    }
}

function updateUploadElement(upload)
{
    if(upload["status"] === "registered" && !d3.select(this).select(".status").empty())
    {
        d3.select(this).selectAll("*").remove();

        d3.select(this)
		    .append("td")
            .attr("colspan", 2)
		        .append("a")
                .attr("href", function(file){return "/match/"+upload["match_id"];})
                .text(upload["match_id"]);
    }
    d3.select(this).select(".status")
        .text(function(d){
                switch(d["status"])
                {
                    case "uploaded": return "Queued";
                    case "processing": return "Parsing replay";
                    case "extracted": return "Analysing replay";
                }
            });

    d3.select(this).select(".match-id")
        .text(function(d){
                if(parseInt(d["match_id"]) < 0)
                    return "Unparsed ID";
                else
                    return d["match_id"];
            });
}


function main()
{
	updateReplays();
}

window.onload = main;
