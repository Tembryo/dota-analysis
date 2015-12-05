function validateEmail(email) {
    var re = /^([\w-]+(?:\.[\w-]+)*)@((?:[\w-]+\.)*\w[\w-]{0,66})\.([a-z]{2,6}(?:\.[a-z]{2})?)$/i;
    return re.test(email);
}


$("#email-address").on('blur keyup change click', function(){
    var address = $("#email-address").val();
    //Your validation
    if(validateEmail(address))
    {
        $("#email-button").prop('disabled', false);
    }
    else
    {
        $("#email-button").prop('disabled', true);
    }
});


$("#email-button").click(function(){
    console.log($('#email-form'));
    var email_address = $("#email-address").val();
    console.log("address: "+email_address);
    $.ajax({
        url: '/api/settings/email/'+encodeURIComponent(email_address),
        type: 'GET',
        //Ajax events
        success: emailCompleteHandler,
        error: emailErrorHandler,
    });
});

function emailCompleteHandler(e){
    if(e["result"] === "success")
    {
        message_str = "Verification email sent! Please check your inbox.";
    }
    else
    {
        message_str = "We are afraid, something went wrong.";
    }
    alert(message_str);
    console.log("email complete");
    console.log(e);
}
function emailErrorHandler(e){
    console.log("email error");
    console.log(e);
}


$("#verify-button").click(function(){
    console.log($('#verify-form'));
    var verify_code = $("#verify-code").val();
    console.log("code: "+verify_code);
    $.ajax({
        url: '/api/verify/'+encodeURIComponent(verify_code),
        type: 'GET',
        //Ajax events
        success: verifyCompleteHandler,
        error: verifyErrorHandler,
    });
});

function verifyCompleteHandler(e){
    console.log("verify complete");
    var message_str = "";
    if(e["result"] === "success")
    {
        message_str = "Verification successfull! You can now upload replay files.";
    }
    else
    {
        message_str = "We are afraid, something went wrong.";
    }
    alert(message_str);
    $("#verify-code").val("");
    //$("#verify-result").text(e["action"]+" "+JSON.stringify(e["info"])+" "+e["result"]);
    console.log(e);
}
function verifyErrorHandler(e){
    console.log("verify error");
    console.log(e);
}
