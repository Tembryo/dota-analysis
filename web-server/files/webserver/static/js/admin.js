$("#request-plus").click(function(){
    console.log($('#request-plus'));
    $.ajax({
        url: '/api/admin/request-plus',
        type: 'GET',

        //Ajax events
        success: requestCompleteHandler,
        error: requestErrorHandler,
    });
});

function requestCompleteHandler(result)
{
    if(result["result"] === "success")
        $('#plus-key').text(result["key"]+" (duration:"+result["duration"]+")");
    else
        $('#plus-key').text("failed");
    console.log("completed request");
    console.log(result);
}

function requestErrorHandler(e)
{
    $('#plus-key').text("Error");
    console.log("error");
    console.log(e);
}

$("#rerun-fails").click(function(){
    console.log($('#rerun-fails'));
    $.ajax({
        url: '/api/admin/rerun-fails',
        type: 'GET',

        //Ajax events
        success: rerunCompleteHandler,
        error: rerunErrorHandler,
    });
});

function rerunCompleteHandler(result)
{
    if(result["result"] === "success")
        $('#fails-result').text("Reset "+result["n"]+" matches to parse");
    else
        $('#fails-result').text("failed");
    console.log("completed request");
    console.log(result);
}

function rerunErrorHandler(e)
{
    $('#fails-result').text("Error");
    console.log("error");
    console.log(e);
}
