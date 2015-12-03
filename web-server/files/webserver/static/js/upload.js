
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
