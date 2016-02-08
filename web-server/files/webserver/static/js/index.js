current_slide = 0;
examples = [0,1,2,3,4,5];

$(document).ready(function(){

  $('.slider').slick({
  infinite: true,
  speed: 300,
  slidesToShow: 5,
  slidesToScroll: 1,
  responsive: [
    {
      breakpoint: 992,
      settings: {
        slidesToShow: 3,
        slidesToScroll: 1,
        infinite: true,
      }
    },
    {
      breakpoint: 768,
      settings: {
        slidesToShow: 1,
        slidesToScroll: 1
      }
    }
    // You can unslick at a given breakpoint now by adding:
    // settings: "unslick"
    // instead of a settings object
  ]

  });



  $('.slider').on('afterChange', function(event, slick, currentSlide, nextSlide){
    var elSlide = $(slick.$slides[currentSlide]);
    console.log(currentSlide)
    current_slide = currentSlide; 
  });

  $("#ratePlayerDiv").click(function(){   
    $("#progressTimer").progressTimer({
        timeLimit: 2,
        warningThreshold: 1,
        baseStyle: 'progress-bar-warning',
        warningStyle: 'progress-bar-danger',
        completeStyle: 'progress-bar-info',
        onFinish: function() {
            window.location.replace("/result?example="+current_slide)
        }
    });  
  });

  $("#login-button").click(function(){
      window.location.replace("/user")
  });
  
});