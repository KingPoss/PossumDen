document.addEventListener('DOMContentLoaded', function() {
    const display = document.querySelector('.display');
    const display1 = document.querySelector('.display1');
    const image = document.getElementById('onair');
   
    // Check if we should update the title based on initial page title
    const shouldUpdateTitle = document.title === "KP Radio";
   
    // Initial call to get data immediately
    getMetaData(display, display1, image, shouldUpdateTitle);
   
    // Then repeat every 3 seconds
    setInterval(function() {
        getMetaData(display, display1, image, shouldUpdateTitle);
    }, 3000);
});

function getMetaData(display, display1, image, shouldUpdateTitle) {
    fetch('https://radio.kingposs.com/api/nowplaying/kpradio')
        .then(response => response.json())
        .then(result => {
            // Update song info
            display.textContent = result.now_playing.song.title;
            display1.textContent = result.now_playing.song.artist;
           
            // Only update browser title if the initial title was "KP Radio"
            if (shouldUpdateTitle) {
                document.title = `KP Radio ${result.now_playing.song.artist} - ${result.now_playing.song.title}`;
            }
           
            // Update live/autodj image
            let isLive = result.live.is_live;
            image.src = isLive ? '/assets/kplive.gif' : '/assets/autodj.gif';
           
            // Toggle chat window visibility
            const chatWindow = document.querySelector('.chatWindow');
            if (chatWindow) {
                chatWindow.style.display = isLive ? '' : 'none';
            }
        })
        .catch(error => {
            console.error('Error fetching metadata:', error);
        });
}