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
    $('#plus-key').text("Request failed");
    console.log("error");
    console.log(e);
}
