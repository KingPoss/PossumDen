const canvas = document.getElementById('staticCanvas');
const ctx = canvas.getContext('2d');

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

function generateStatic() {
    const imageData = ctx.createImageData(canvas.width, canvas.height);
    const data = imageData.data;
    for (let i = 0; i < data.length; i += 4) {
        const color = Math.random() * 255;
        data[i] = color;       // Red
        data[i + 1] = color;   // Green
        data[i + 2] = color;   // Blue
        data[i + 3] = 255;     // Alpha
    }
    ctx.putImageData(imageData, 0, 0);
}

function loop() {
    generateStatic();
    requestAnimationFrame(loop);
}

loop();

const whiteNoise = document.getElementById('whiteNoise');

function generateWhiteNoise() {
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const bufferSize = 2 * audioContext.sampleRate;
    const noiseBuffer = audioContext.createBuffer(1, bufferSize, audioContext.sampleRate);
    const output = noiseBuffer.getChannelData(0);

    for (let i = 0; i < bufferSize; i++) {
        output[i] = Math.random() * 2 - 1;
    }

    const whiteNoiseSource = audioContext.createBufferSource();
    whiteNoiseSource.buffer = noiseBuffer;
    whiteNoiseSource.loop = true;
    whiteNoiseSource.connect(audioContext.destination);
    whiteNoiseSource.start(0);

    whiteNoise.src = URL.createObjectURL(new Blob([output.buffer], { type: 'audio/wav' }));
    whiteNoise.play();
}

generateWhiteNoise();
