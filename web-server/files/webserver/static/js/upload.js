keep_checking = false;
var n_tries = 0;
update_interval = 2000;

requests_list = [];
upload_list = [];

function validateNumeric(number) {
    var re = /[0-9]|\./;
    return re.test(number);
}

$("#request-id").on('blur keyup change click', function(){
    var id = $("#request-id").val();
    //Your validation
    if(validateNumeric(id) && id.length == 10)
    {
        $("#request-button").prop('disabled', false);
    }
    else
    {
        $("#request-button").prop('disabled', true);
    }
});


$("#request-button").click(function(){
    console.log($('#request-form'));
    $.ajax({
        url: '/api/retrieve/'+$("#request-id").val(),
        type: 'POST',

        //Ajax events
        success: requestCompleteHandler,
        error: requestErrorHandler,
    });
});

function requestCompleteHandler(result)
{
    setTimeout(update(), update_interval/2);
    n_tries = 5;

    $('#request-field').text(result.result);
    console.log("completed request");
    console.log(result);
}

function requestErrorHandler(e)
{
    $('#request-field').text("Request failed");
    console.log("error");
    console.log(e);
}


$("#upload-file").on("change reset", function(){
    console.log("checking file field");
    var file = this.files[0];
    if(file)
    {
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
    } 
    else
    {
        console.log("No file");
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

function resetFormElement(e) {
    console.log("resetting");
    e.wrap('<form>').closest('form').get(0).reset();
    e.unwrap();
}

function beforeSendHandler(e){
}

function completeHandler(e){

    setTimeout(update(), update_interval/2);
    n_tries = 5;
    $('#progress-field').text("Upload complete");

    resetFormElement($("#upload-file"));
    $("#upload-file").trigger("change");
    console.log("complete", e);
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

function updateRequests(callback)
{
    d3.json("/api/retrieve"
		,function(error, data){
			requests_list = data;
            requests_list.sort(function(a,b){return parseInt(a["id"])-parseInt(b["id"]);});
            updateRequestsList();
            
            for(var request_i in requests_list)
            {
                if(requests_list[request_i]["status"] === "requested" || requests_list[request_i]["status"] === "retrieving")
                {
                    keep_checking = true;
                    break;
                }
            }
            callback(); 
		});
}

function updateRequestsList()
{
	var requests = d3.select("#requests-table").selectAll(".request").data(requests_list, function(match){
					return match["id"];
				});

	requests.enter()
		.append("tr")
		.attr("class", "request")
		.each(createRequestElement);

	requests.each(updateRequestElement);

	requests.exit()
		.remove();
}

function createRequestElement(request)
{
    d3.select(this)
	        .append("td")
	            .append("a")
                .attr({
                        "href": function(file){return "/match/"+request["id"];},
                        "class": "match-id"})
    d3.select(this)
	        .append("td")
            .attr("class", "status")
}

function updateRequestElement(upload)
{

    d3.select(this).select(".status")
        .text(function(d){
                switch(d["status"])
                {
                    case "failed": return "Failed";
                    case "requested": return "Queued";
                    case "retrieving": return "Retrieving Match";
                    case "unavailable": return "Not available";
                    case "retrieved": return "Retrieved";
                }
            });

    d3.select(this).select(".match-id")
        .text(function(d){ return d["id"];});
}




function updateReplays(callback)
{
    d3.json("/api/uploads"
		,function(error, data){
			upload_list = data;
            upload_list.sort(function(a,b){return parseInt(a["match_id"])-parseInt(b["match_id"]);});
            updateList();
            
            for(var upload_i in upload_list)
            {
                if(upload_list[upload_i]["status"] === "uploaded" || upload_list[upload_i]["status"] === "extracting" || upload_list[upload_i]["status"] === "analysing" )
                {
                    keep_checking = true;
                    break;
                }
            }
            callback();
		});
}

function updateList()
{
	var uploads = d3.select("#uploads-table").selectAll(".upload").data(upload_list, function(match){
					return match["id"];
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
                    case "failed": return "Failed";
                    case "uploaded": return "Queued";
                    case "extracting": return "Parsing replay";
                    case "analysing": return "Analysing replay";
                }
            });

    d3.select(this).select(".match-id")
        .text(function(d){
                if(!d["match_id"])
                    return d["upload_filename"];
                else
                    return d["match_id"];
            });
}


function main()
{
    update();
}

function update()
{
    keep_checking = false;
	async.series(
        [
            updateReplays,
	        updateRequests
        ],
        function(err){
            
            if(keep_checking || n_tries > 0)
            {
            	setTimeout(update, update_interval);
                if(n_tries > 0)
                    n_tries--;
                console.log(n_tries);
            }
        });
}

window.onload = main;
