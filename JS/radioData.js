$(document).ready(function() {
    const $display = $('.display');
    const $display1 = $('.display1');
    const $image = $('#onair');

    setInterval(function() {
        getMetaData($display, $display1, $image);
    }, 3000);
});

function getMetaData($display, $display1, $image) {
    $.ajax({
        type: "GET",
        url: "https://radio.kingposs.com/api/nowplaying/kpradio",
        dataType: "json",
        success: function(result) {
            $display.text(result["now_playing"]["song"]["title"]);
            $display1.text(result["now_playing"]["song"]["artist"]);
 
            let isLive = result["live"]["is_live"];
            $image.attr('src', isLive ? "/assets/kplive.gif" : "/assets/autodj.gif");
            $('.chatWindow').toggle(isLive);

        },
        error: function(xhr, status, error) {
            console.error("Error fetching metadata:", error);
        }
    });
}