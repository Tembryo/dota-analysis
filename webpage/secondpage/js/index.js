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
    $("#ratePlayerDiv").click(function(){   
    $("#progressTimer").progressTimer({
        timeLimit: 10,
        warningThreshold: 10,
        baseStyle: 'progress-bar-warning',
        warningStyle: 'progress-bar-danger',
        completeStyle: 'progress-bar-info',
        onFinish: function() {
            window.location.replace("results"+String(currentSlide)+".html")
        }
    });  
  });


    
    });

  $("#ratePlayerDiv").click(function(){   
    $("#progressTimer").progressTimer({
        timeLimit: 12,
        warningThreshold: 10,
        baseStyle: 'progress-bar-warning',
        warningStyle: 'progress-bar-danger',
        completeStyle: 'progress-bar-info',
        onFinish: function() {
            window.location.replace("results.html")
        }
    });  
  });
});