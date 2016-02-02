function updateSelectedImage() {
    $(".ImageSlider .ScrollArea *").each(function( index ) {$(this).removeClass("scrolling");});
    selectedImage = $(".ImageSlider .ScrollArea *")[myScroll.currentPage.pageX];
    selectedImage.className = "selectedImage"
}

function refresh() {
    myScroll.options.snap = myScroll.scroller.querySelectorAll("*");
    $(".ImageSlider .ScrollArea *").on("tap", function () {
        myScroll.currentPage.pageX != $(this).index() && ($(".ImageSlider .ScrollArea .selectedImage").removeClass("selectedImage"), myScroll.goToPage($(this).index(), 0, 400))
    });
    var n = $(".ImageSlider .ScrollArea *"),
    t = parseInt(n.css("margin-left").replace("px", "")) || 0,
    i = parseInt(n.css("margin-right").replace("px", "")) || 0,
    r = n[0].offsetWidth,
    u = (r + t + i) * n.length + 200;
    $(".ImageSlider .ScrollArea").css("width", u + "px");
    myScroll.refresh();
    myScroll.goToPage((n.length / 2).toFixed(0) - 1, 0, 0, !1);
    updateSelectedImage()
}
function loaded() {
    var n = $(".ImageSlider .ScrollArea *"),
    t = parseInt(n.css("margin-left").replace("px", "")) || 0,
    i = parseInt(n.css("margin-right").replace("px", "")) || 0,
    r = n[0].offsetWidth,
    u = (r + t + i) * n.length;
    $(".ImageSlider .ScrollArea").css("width", u + "px");
    myScroll = new IScroll(".ImageSlider", {
            scrollX : !0,
            scrollY : !1,
            snap : "*",
            momentum : !0,
            tap : !0,
            deceleration : .002,
            bounce : !1,
            disableMouse: false,
            disableTouch: true
        });
    myScroll.goToPage((n.length / 2).toFixed(0) - 1, 0, 0, !1);
    $(".ImageSlider .ScrollArea *").on("tap", function () {
        myScroll.currentPage.pageX != $(this).index() && ($(".ImageSlider .ScrollArea .selectedImage").removeClass("selectedImage"), myScroll.goToPage($(this).index(), 0, 400))
    });
    myScroll.on("flick", function () {
        this.x == this.startX && updateSelectedImage()
    });
    myScroll.on("scrollEnd", updateSelectedImage);
    myScroll.on("scrollStart", function () {
        $(".ImageSlider .ScrollArea .selectedImage").removeClass("selectedImage");
        $(".ImageSlider .ScrollArea *").each(function( index ) {$(this).addClass("scrolling");});
    });
    $(".ImageSlider").css("opacity", 1);
    updateSelectedImage()
}

function next(){
    ga('send', 'event', 'Scroll Button', 'click', 'right');
    if(!$(".ImageSlider .ScrollArea .selectedImage").is(":last-child")){
        myScroll.next();
        $(".ImageSlider .ScrollArea .selectedImage").removeClass("selectedImage");
        $(".ImageSlider .ScrollArea *").each(function( index ) {$(this).addClass("scrolling");});
    }
}

function prev(){
    ga('send', 'event', 'Scroll Button', 'click', 'left');
    if(!$(".ImageSlider .ScrollArea .selectedImage").is(":first-child")){
        myScroll.prev();
        $(".ImageSlider .ScrollArea .selectedImage").removeClass("selectedImage");
        $(".ImageSlider .ScrollArea *").each(function( index ) {$(this).addClass("scrolling");});
    }
}

loaded();