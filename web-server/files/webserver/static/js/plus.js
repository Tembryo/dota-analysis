
$(document).ready(function(){

    $("#email-button").click(function(){
        console.log($('#email-form'));

        $("#response").text("Sending confirmation email ...");
        var email_address = $("#email-address").val();
        console.log("address: "+email_address);
        $.ajax({
            url: '/api/add-email/'+encodeURIComponent(email_address),
            type: 'GET',
            //Ajax events
            success: emailCompleteHandler,
            error: emailErrorHandler,
        });
    });

});    

function emailCompleteHandler(e)
{
    if(e["result"] === "success")
    {
        message_str = "We sent you an email to comlete the newsletter subscription. Please check your inbox!";
    }
    else
    {
        message_str = "We are afraid, something went wrong.";
    }
    $("#response").text(message_str);
    console.log("email complete");
    console.log(e);
}

function emailErrorHandler(e)
{
    $("#response").text("We are afraid, something went wrong.");
    console.log("email error");
    console.log(e);
}