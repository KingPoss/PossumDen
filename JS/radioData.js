document.addEventListener('DOMContentLoaded', function() {
    var display = document.querySelector('.display');
    var display1 = document.querySelector('.display1');
    var image = document.getElementById('onair');
    var shouldUpdateTitle = document.title === "KP Radio";

    // initial fetch so the UI isn't blank while waiting for SSE
    getMetaData(display, display1, image, shouldUpdateTitle);

    // try SSE for real-time updates, fall back to polling
    if (typeof EventSource !== 'undefined') {
        connectSSE(display, display1, image, shouldUpdateTitle);
    } else {
        startPolling(display, display1, image, shouldUpdateTitle);
    }
});

function connectSSE(display, display1, image, shouldUpdateTitle) {
    var sseBaseUri = 'https://radio.kingposs.com/api/live/nowplaying/sse';
    var sseUriParams = new URLSearchParams({
        'cf_connect': JSON.stringify({
            'subs': {
                'station:kpradio': { 'recover': true }
            }
        })
    });
    var sse = new EventSource(sseBaseUri + '?' + sseUriParams.toString());

    function handleData(ssePayload) {
        var np = ssePayload.data.np;
        if (np) {
            updateDisplay(np, display, display1, image, shouldUpdateTitle);
        }
    }

    sse.onmessage = function(e) {
        var jsonData = JSON.parse(e.data);

        if ('connect' in jsonData) {
            var connectData = jsonData.connect;

            if ('data' in connectData) {
                connectData.data.forEach(function(row) { handleData(row); });
            } else {
                for (var subName in connectData.subs) {
                    var sub = connectData.subs[subName];
                    if ('publications' in sub && sub.publications.length > 0) {
                        sub.publications.forEach(function(row) { handleData(row); });
                    }
                }
            }
        } else if ('pub' in jsonData) {
            handleData(jsonData.pub);
        }
    };

    sse.onerror = function() {
        sse.close();
        startPolling(display, display1, image, shouldUpdateTitle);
    };
}

function startPolling(display, display1, image, shouldUpdateTitle) {
    setInterval(function() {
        getMetaData(display, display1, image, shouldUpdateTitle);
    }, 3000);
}

function getMetaData(display, display1, image, shouldUpdateTitle) {
    fetch('https://radio.kingposs.com/api/nowplaying/kpradio')
        .then(function(response) { return response.json(); })
        .then(function(result) {
            updateDisplay(result, display, display1, image, shouldUpdateTitle);
        })
        .catch(function(error) {
            console.error('Error fetching metadata:', error);
        });
}

function updateDisplay(result, display, display1, image, shouldUpdateTitle) {
    display.textContent = result.now_playing.song.title;
    display1.textContent = result.now_playing.song.artist;

    if (shouldUpdateTitle) {
        document.title = 'KP Radio ' + result.now_playing.song.artist + ' - ' + result.now_playing.song.title;
    }

    var isLive = result.live.is_live;
    image.src = isLive ? '/assets/kplive.gif' : '/assets/autodj.gif';

    var chatWindow = document.querySelector('.chatWindow');
    if (chatWindow) {
        chatWindow.style.display = isLive ? '' : 'none';
    }
}
