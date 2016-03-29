$.ajax({
    url: '/api/verify/'+code,
    type: 'GET',
    //Ajax events
    success: verifyCompleteHandler,
    error: verifyErrorHandler,
});

function verifyCompleteHandler(e){
    var message_str = "";
    if(e["result"] === "success")
    {
        message_str = "Subscription complete!";
    }
    else
    {
        message_str = "We are afraid, something went wrong.";
    }
    $( "#result" ).text( message_str );
    console.log("message_str complete");
    console.log(e);
}
function verifyErrorHandler(e){
    var message_str = "We are afraid, something went wrong.";
    $( "#result" ).text( message_str );
    console.log("verify error");
    console.log(e);
}