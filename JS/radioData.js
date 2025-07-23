document.addEventListener('DOMContentLoaded', function() {
    const display = document.querySelector('.display');
    const display1 = document.querySelector('.display1');
    const image = document.getElementById('onair');
    
    // Initial call to get data immediately
    getMetaData(display, display1, image);
    
    // Then repeat every 3 seconds
    setInterval(function() {
        getMetaData(display, display1, image);
    }, 3000);
});

function getMetaData(display, display1, image) {
    fetch('https://radio.kingposs.com/api/nowplaying/kpradio')
        .then(response => response.json())
        .then(result => {
            // Update song info
            display.textContent = result.now_playing.song.title;
            display1.textContent = result.now_playing.song.artist;
            
            // Update browser title
            document.title = `${result.now_playing.song.artist} - ${result.now_playing.song.title} | KP Radio`;
            
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