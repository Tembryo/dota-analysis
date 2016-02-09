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

  $('.slick-slider').on('click', '.slick-slide', function (e) {
    e.stopPropagation();
    var index = $(this).data("slick-index");
    console.log("clicked ",index, $('.slick-slider').slick('slickCurrentSlide'))

    var offset = ($('.slick-slider').slick('slickGetOption', "slidesToShow")-1) /2;

    $('.slick-slider').slick('slickGoTo', index-offset);
  });


  $('.slider').on('afterChange', function(event, slick, currentSlide, nextSlide){
    var elSlide = $(slick.$slides[currentSlide]);
    console.log("changed to",currentSlide)
    var offset = ($('.slick-slider').slick('slickGetOption', "slidesToShow")-1) /2;
    current_slide = (currentSlide + offset)%examples.length; 
  });

  $("#ratePlayerDiv").click(function(){   
    $("#progressTimer").progressTimer({
        timeLimit: 2,
        warningThreshold: 1,
        baseStyle: 'progress-bar-warning',
        warningStyle: 'progress-bar-danger',
        completeStyle: 'progress-bar-info',
        onFinish: function() {
            var offset = ($('.slick-slider').slick('slickGetOption', "slidesToShow")-1) /2;
            var current_slide = $('.slick-slider').slick('slickCurrentSlide'); 

            window.location.replace("/result?example="+(current_slide+offset)%examples.length);
        }
    });  
  });

  $("#login-button").click(function(){
      window.location.replace("/user")
  });
  
});