document.addEventListener('DOMContentLoaded', function() {
    const display = document.querySelector('.display');
    const display1 = document.querySelector('.display1');
    const image = document.getElementById('onair');
    const shouldUpdateTitle = document.title === "KP Radio";

    getMetaData(display, display1, image, shouldUpdateTitle);
    setInterval(function() {
        getMetaData(display, display1, image, shouldUpdateTitle);
    }, 3000);
});

function getMetaData(display, display1, image, shouldUpdateTitle) {
    fetch('https://radio.kingposs.com/api/nowplaying/kpradio')
        .then(response => response.json())
        .then(result => {
            display.textContent = result.now_playing.song.title;
            display1.textContent = result.now_playing.song.artist;

            if (shouldUpdateTitle) {
                document.title = `KP Radio ${result.now_playing.song.artist} - ${result.now_playing.song.title}`;
            }
           
            let isLive = result.live.is_live;
            image.src = isLive ? '/assets/kplive.gif' : '/assets/autodj.gif';

            const chatWindow = document.querySelector('.chatWindow');
            if (chatWindow) {
                chatWindow.style.display = isLive ? '' : 'none';
            }
        })
        .catch(error => {
            console.error('Error fetching metadata:', error);
        });
}