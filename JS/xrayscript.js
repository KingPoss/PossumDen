   /* --- Dimensions & Scaling --- */
    const BASE_WIDTH = 520;
    const BASE_HEIGHT = 980;

    /* --- Organ Data --- */
    const organData = {
  "brain": {
    title: "Human Brain",
    description: "The command center of the nervous system.",
    imageSrc: "/assets/art/kpfashion.jpg",

  },
  "heart": {
    title: "Human Heart",
    description: "Pumps blood throughout the body.",
    imageSrc: "/assets/art/systemmhalted.gif"
  },
  "green_thumb": {
    title: "Green Thumb",
    description: "A whimsical top layer, representing a love of plants!",
    imageSrc: "assets/green_thumb_detail.png"
  },
  "digestive_tract": {
    title: "the belly",
    description: "test",
    link: "https://youtube.com/"
  }
    };


    /* --- Setup --- */
    const container = document.getElementById('anatomy-container');
    const anatomyContent = container.querySelector('.anatomy-content');

    // skip eyeball stuff, those are handled separately
    const allImgs = Array.from(anatomyContent.querySelectorAll('img')).filter(img => {
      const src = img.getAttribute('src') || "";
      return !src.includes("eyeball") && !src.includes("iris");
    });

    const layeredImages = allImgs.map(imgEl => {
      const offCanvas = document.createElement('canvas');
      offCanvas.width = BASE_WIDTH;
      offCanvas.height = BASE_HEIGHT;
      
      return {
        img: imgEl,
        offCanvas: offCanvas,
        ctx: offCanvas.getContext('2d'),
        imageData: null,
        loaded: false
      };
    });

    function getScaleFactor() {
      const containerRect = container.getBoundingClientRect();
      return {
        scaleX: containerRect.width / BASE_WIDTH,
        scaleY: containerRect.height / BASE_HEIGHT
      };
    }

    function storeImageData(layer) {
      const { img, ctx, offCanvas } = layer;
      if (!img.complete) return;
      
      ctx.clearRect(0, 0, offCanvas.width, offCanvas.height);
      ctx.drawImage(img, 0, 0, offCanvas.width, offCanvas.height);
      layer.imageData = ctx.getImageData(0, 0, offCanvas.width, offCanvas.height).data;
      layer.loaded = true;
    }

    layeredImages.forEach(layer => {
      const { img } = layer;
      if (img.complete) {
        storeImageData(layer);
      } else {
        img.onload = () => storeImageData(layer);
      }
    });

    /* --- Modal --- */
    function showOrganModal(organKey) {
      const modal = document.getElementById("myModal");
      const modalDisplay = document.getElementById("modalDisplay");
      const loadingGif = document.getElementById("loadingPlaceholder");
      const titleText = document.getElementById("title");
      const captionText = document.getElementById("caption");

      document.body.style.overflow = "hidden";
      modal.style.display = "block";

      loadingGif.style.display = "block";
      modalDisplay.innerHTML = "";

      const organ = organData[organKey];
      if (!organ) {
        titleText.innerHTML = "Unknown Organ";
        captionText.innerHTML = "No data available for this organ.";
        loadingGif.style.display = "none";
        return;
      }

      titleText.innerHTML = organ.title || "Organ Information";
      captionText.innerHTML = organ.description || "No description available.";

      if (organ.imageSrc) {
        const imageElement = document.createElement("img");
        imageElement.className = "modal-content modal-image";
        imageElement.alt = organ.title || "Organ Image";
        imageElement.src = organ.imageSrc;
        imageElement.onload = () => {
          loadingGif.style.display = "none";
        };
        imageElement.onerror = () => {
          console.error("Failed to load image:", organ.imageSrc);
          loadingGif.style.display = "none";
        };
        modalDisplay.appendChild(imageElement);
      }

      if (organ.videoSrc) {
        const videoElement = document.createElement("video");
        videoElement.className = "modal-content modal-video";
        videoElement.controls = true;
        videoElement.src = organ.videoSrc;
        videoElement.onloadeddata = () => {
          loadingGif.style.display = "none";
        };
        modalDisplay.appendChild(videoElement);
      }

      if (organ.audioSrc) {
        const audioElement = document.createElement("audio");
        audioElement.className = "modal-content modal-audio";
        audioElement.controls = true;
        audioElement.src = organ.audioSrc;
        audioElement.oncanplaythrough = () => {
          loadingGif.style.display = "none";
        };
        modalDisplay.appendChild(audioElement);
      }

      if (organ.link) {
        const linkElement = document.createElement("a");
        linkElement.href = organ.link;
        linkElement.textContent = "Learn More";
        linkElement.target = "_blank";
        linkElement.className = "modal-link";
        modalDisplay.appendChild(linkElement);
      }

      if (!organ.imageSrc && !organ.videoSrc && !organ.audioSrc) {
        loadingGif.style.display = "none";
      }
    }

    (function setupModalClose() {
      const modal = document.getElementById("myModal");
      const closeBtn = modal.querySelector(".close");

      function closeModal() {
        modal.style.display = "none";
        document.body.style.overflow = "auto";
        if (lastHoveredImg) {
          unHighlight(lastHoveredImg);
          lastHoveredImg = null;
        }
      }

      closeBtn.addEventListener("click", closeModal);

      modal.addEventListener("click", (event) => {
        const ignoreSelectors = [
          ".modal-content",
          ".modal-link",
          "#title",
          "#caption",
          "#loadingPlaceholder"
        ];

        for (const selector of ignoreSelectors) {
          if (event.target.closest(selector)) {
            return;
          }
        }
        closeModal();
      });
    })();

    /* --- Info Box --- */
    const infoBox = document.getElementById('info-box');
    const infoText = document.getElementById('info-text');
    const infoClose = document.getElementById('info-close');

    infoClose.onclick = function() {
      infoBox.style.display = 'none';
    };

    /* --- Click Handler --- */
    container.addEventListener('click', (evt) => {
      const containerRect = container.getBoundingClientRect();
      const { scaleX, scaleY } = getScaleFactor();

      const clickX = Math.floor((evt.clientX - containerRect.left) / scaleX);
      const clickY = Math.floor((evt.clientY - containerRect.top) / scaleY);

      if (clickX < 0 || clickX >= BASE_WIDTH || clickY < 0 || clickY >= BASE_HEIGHT) {
        return;
      }

      let found = false;

      for (let i = layeredImages.length - 1; i >= 0; i--) {
        const layer = layeredImages[i];
        if (!layer.loaded || !layer.imageData) continue;

        const src = layer.img.getAttribute('src') || "";
        const alt = layer.img.getAttribute('alt') || "";
        
        if (src.includes("xray_outline") || alt.includes("or_table")) {
          continue;
        }

        const index = ((clickY * BASE_WIDTH) + clickX) * 4;
        const alpha = layer.imageData[index + 3];
        
        if (alpha > 0) {
          const organKey = alt;
          const organ = organData[organKey];

          if (organ && organ.link && !organ.imageSrc && !organ.videoSrc && !organ.audioSrc) {
            window.open(organ.link, '_blank');
          } else {
            showOrganModal(organKey);
          }
          found = true;
          break;
        }
      }

      if (!found) {
        infoBox.style.display = 'none';
      }
    });

    /* --- Hover Effects --- */
    let lastHoveredImg = null;

    function highlight(imgEl) {
      imgEl.style.filter = "sepia(1)  saturate(4)";
    }

    function unHighlight(imgEl) {
      if (imgEl) {
        imgEl.style.filter = "none";
      }
    }

    container.addEventListener("mousemove", (evt) => {
      const containerRect = container.getBoundingClientRect();
      const { scaleX, scaleY } = getScaleFactor();
      
      const mouseX = Math.floor((evt.clientX - containerRect.left) / scaleX);
      const mouseY = Math.floor((evt.clientY - containerRect.top) / scaleY);

      if (mouseX < 0 || mouseX >= BASE_WIDTH || mouseY < 0 || mouseY >= BASE_HEIGHT) {
        if (lastHoveredImg) {
          unHighlight(lastHoveredImg);
          lastHoveredImg = null;
        }
        return;
      }

      let hoveredLayer = null;

      for (let i = layeredImages.length - 1; i >= 0; i--) {
        const layer = layeredImages[i];
        if (!layer.loaded || !layer.imageData) continue;

        const src = layer.img.getAttribute("src") || "";
        const alt = layer.img.getAttribute("alt") || "";
        
        if (src.includes("xray_outline") || alt.includes("or_table")) {
          continue;
        }

        const index = ((mouseY * BASE_WIDTH) + mouseX) * 4;
        const alpha = layer.imageData[index + 3];
        
        if (alpha > 0) {
          hoveredLayer = layer;
          break;
        }
      }

      if (hoveredLayer) {
        if (hoveredLayer.img !== lastHoveredImg) {
          if (lastHoveredImg) unHighlight(lastHoveredImg);
          highlight(hoveredLayer.img);
          lastHoveredImg = hoveredLayer.img;
        }
      } else {
        if (lastHoveredImg) {
          unHighlight(lastHoveredImg);
          lastHoveredImg = null;
        }
      }
    });

    /* --- Eye Tracking --- */
    const eyeContainer = document.getElementById('eyeContainer');
    const irisImg = document.getElementById('irisImg');

    document.addEventListener('mousemove', (e) => {
      if (!eyeContainer || !irisImg) return;

      const eyeRect = eyeContainer.getBoundingClientRect();
      const eyeCenterX = eyeRect.left + eyeRect.width / 2;
      const eyeCenterY = eyeRect.top + eyeRect.height / 2;
      const mouseX = e.clientX;
      const mouseY = e.clientY;

      const dx = mouseX - eyeCenterX;
      const dy = mouseY - eyeCenterY;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance < 10) return; // deadzone near center

      const normalizedX = dx / distance;
      const normalizedY = dy / distance;

      // iris is 50% of eyeball, so it can shift 25% before clipping
      const maxMovement = 25;
      const offsetX = normalizedX * maxMovement;
      const offsetY = normalizedY * maxMovement;

      const centerX = 25;
      const centerY = 25;

      irisImg.style.left = (centerX + offsetX) + '%';
      irisImg.style.top = (centerY + offsetY) + '%';
    });

    /* --- Resize --- */
    let resizeTimeout;
    window.addEventListener('resize', () => {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(() => {
        layeredImages.forEach(layer => {
          if (layer.img.complete) {
            storeImageData(layer);
          }
        });
      }, 250);
    });






/* --- Vital Monitors --- */

class MonitorManager {
    constructor() {
        this.monitors = [];
        this.animating = false;
        this.frameCount = 0;
        this.fps = 60;
    }
    
    addMonitor(monitor) {
        this.monitors.push(monitor);
    }
    
    animate() {
        if (!this.animating) return;
        
        this.frameCount++;
        
        if (this.frameCount % (60 / this.fps) === 0) {
            this.monitors.forEach(monitor => monitor.update());
        }
        
        requestAnimationFrame(() => this.animate());
    }
    
    start() {
        this.animating = true;
        this.animate();
    }
    
    stop() {
        this.animating = false;
    }
}

class BaseMonitor {
    constructor(canvasId, config) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');
        this.config = config;
        this.sweepX = 10;
        this.speed = 2;
        this.time = 0;
        this.fadeWidth = 5;
        this.prevY = null;
        this.performanceMode = true;

        this.traceCanvas = document.createElement('canvas');
        this.traceCtx = this.traceCanvas.getContext('2d');
        this.ctx.imageSmoothingEnabled = false;
        this.traceCtx.imageSmoothingEnabled = false;

        this.width = 0;
        this.height = 0;
        this.baselineY = 0;
        this.resize();
        window.addEventListener('resize', () => this.resize());
    }
    
    resize() {
        const rect = this.canvas.getBoundingClientRect();
        this.width = rect.width;
        this.height = rect.height;
        this.canvas.width = this.width;
        this.canvas.height = this.height;
        this.traceCanvas.width = this.width;
        this.traceCanvas.height = this.height;
        
        if (this.config && this.config.baselineOffset) {
            this.baselineY = this.height / 2 + this.config.baselineOffset;
        } else {
            this.baselineY = this.height / 2;
        }
    }
    
    update() {
        const clearX = Math.max(0, this.sweepX - 10);
        const clearWidth = this.fadeWidth + 20;
        this.ctx.clearRect(clearX, 0, clearWidth, this.height);
        this.ctx.drawImage(this.traceCanvas, 0, 0);

        this.time += 16;
        const currentY = Math.round(this.generateWave(this.time));

        if (this.prevY !== null) {
            this.traceCtx.strokeStyle = this.config.color;
            this.traceCtx.lineWidth = 2;

            if (!this.performanceMode) {
                this.traceCtx.shadowBlur = 10;
                this.traceCtx.shadowColor = this.config.color;
            } else {
                this.traceCtx.shadowBlur = 0;
            }
            
            this.traceCtx.beginPath();
            this.traceCtx.moveTo(Math.round(this.sweepX - this.speed), this.prevY);
            this.traceCtx.lineTo(Math.round(this.sweepX), currentY);
            this.traceCtx.stroke();
        }
        
        this.traceCtx.clearRect(this.sweepX + 2, 0, this.fadeWidth, this.height);

        // leading edge dot
        this.ctx.fillStyle = this.config.color;
        
        if (!this.performanceMode) {
            this.ctx.shadowBlur = 20;
            this.ctx.shadowColor = this.config.color;
        } else {
            this.ctx.shadowBlur = 0;
        }
        
        this.ctx.beginPath();
        this.ctx.arc(Math.round(this.sweepX), currentY, 3, 0, Math.PI * 2);
        this.ctx.fill();
        
        if (!this.performanceMode) {
            this.ctx.strokeStyle = this.config.color + '33';
            this.ctx.lineWidth = 1;
            this.ctx.shadowBlur = 0;
            this.ctx.beginPath();
            this.ctx.moveTo(Math.round(this.sweepX), 0);
            this.ctx.lineTo(Math.round(this.sweepX), this.height);
            this.ctx.stroke();
        }
        
        this.prevY = currentY;
        this.sweepX += this.speed;

        if (this.sweepX > this.width) {
            this.sweepX = 0;
            this.prevY = null;
        }
        
        if (Math.random() < 0.02 && this.config.updateValues) {
            this.config.updateValues();
        }
    }
    
    generateWave(x) {
        return this.baselineY;
    }
}

class ECGMonitor extends BaseMonitor {
    constructor(canvasId) {
        super(canvasId, {
            color: '#00ff00',
            baselineOffset: 10
        });
        
        this.heartRate = 72;
        this.beatInterval = 60000 / this.heartRate;
        
        this.waveformSteps = 1000;
        this.waveformCache = new Float32Array(this.waveformSteps);
        this.precalculateWaveform();
    }
    
    precalculateWaveform() {
        for (let i = 0; i < this.waveformSteps; i++) {
            const progress = i / this.waveformSteps;
            let y = 0;
            
            if (progress < 0.1) { // P wave
                const pProgress = progress / 0.1;
                y -= Math.sin(pProgress * Math.PI) * 10;
            }
            else if (progress >= 0.2 && progress < 0.3) { // QRS complex
                const qrsProgress = (progress - 0.2) / 0.1;
                if (qrsProgress < 0.2) {
                    y += Math.sin(qrsProgress * 5 * Math.PI) * 5;
                } else if (qrsProgress < 0.5) {
                    const rProgress = (qrsProgress - 0.2) / 0.3;
                    y -= Math.sin(rProgress * Math.PI) * 60;
                } else {
                    const sProgress = (qrsProgress - 0.5) / 0.5;
                    y += Math.sin(sProgress * Math.PI) * 15;
                }
            }
            else if (progress >= 0.4 && progress < 0.55) { // T wave
                const tProgress = (progress - 0.4) / 0.15;
                y -= Math.sin(tProgress * Math.PI) * 20;
            }
            
            this.waveformCache[i] = y;
        }
    }
    
    generateWave(x) {
        const normalizedX = x % this.beatInterval;
        const progress = normalizedX / this.beatInterval;
        const index = Math.floor(progress * this.waveformSteps);
        
        const noise = (Math.random() - 0.5) * 0.2;
        
        return this.baselineY + this.waveformCache[index] + noise;
    }
    
    update() {
        super.update();
        
        if (Math.random() < 0.02) {
            this.heartRate = 72 + Math.floor(Math.random() * 5 - 2);
            document.getElementById('heartRate').textContent = this.heartRate;
            this.beatInterval = 60000 / this.heartRate;
        }
    }
}

class VitalSignMonitor extends BaseMonitor {
    constructor(canvasId, config) {
        super(canvasId, config);
        this.respPhase = 0;

        if (config.type === 'o2') {
            this.o2WaveformCache = new Float32Array(1000);
            this.precalculateO2Waveform();
        }
    }
    
    precalculateO2Waveform() {
        for (let i = 0; i < 1000; i++) {
            const progress = i / 1000;
            let y = 0;
            
            if (progress < 0.12) {
                const upProgress = progress / 0.12;
                y -= Math.pow(upProgress, 1.5) * 35;
            }
            else if (progress < 0.18) {
                const peakProgress = (progress - 0.12) / 0.06;
                y -= 35 + Math.sin(peakProgress * Math.PI * 0.5) * 5;
            }
            else if (progress < 0.25) {
                const notchProgress = (progress - 0.18) / 0.07;
                y -= 40 - Math.sin(notchProgress * Math.PI) * 8;
            }
            else if (progress < 0.8) {
                const downProgress = (progress - 0.25) / 0.55;
                y -= 32 * Math.exp(-downProgress * 2.5);
            }
            
            this.o2WaveformCache[i] = y;
        }
    }
    
    generateWave(x) {
        if (this.config.type === 'o2') {
            const period = 60000 / this.config.pulseRate;
            const normalizedX = x % period;
            const progress = normalizedX / period;
            const index = Math.floor(progress * 1000);
            
            const baseWave = this.o2WaveformCache[index];
            const respModulation = Math.sin(x * 0.0003) * 3;
            const noise = (Math.random() - 0.5) * 0.2;
            
            return this.baselineY + baseWave + respModulation + noise;
        } 
        else if (this.config.type === 'resp') {
            const phaseIncrement = (this.config.respRate / 60) * 0.016 * 2 * Math.PI;
            this.respPhase += phaseIncrement;

            let y = this.baselineY;
            y -= Math.sin(this.respPhase) * 35;

            const slowVariation = Math.sin(this.respPhase * 0.1) * 3;
            const microVariation = Math.sin(this.respPhase * 2.5) * 0.5;
            const noise = (Math.random() - 0.5) * 0.1;
            
            return y + slowVariation + microVariation + noise;
        }
        
        return this.baselineY;
    }
}

const o2Config = {
    type: 'o2',
    color: '#ffff00',
    baselineOffset: 15,
    pulseRate: 72,
    o2Level: 98,
    baseO2: 98,
    lastO2Update: 0,
    updateValues: function() {
        const now = Date.now();
        if (now - this.lastO2Update > 10000) {
            this.baseO2 = 97 + Math.floor(Math.random() * 3);
            this.lastO2Update = now;
        }
        const flutter = Math.random() < 0.1 ? (Math.random() < 0.5 ? -1 : 0) : 0;
        this.o2Level = Math.max(96, Math.min(100, this.baseO2 + flutter));
        document.getElementById('o2Level').textContent = this.o2Level;
        this.pulseRate = 70 + Math.floor(Math.random() * 1);
    }
};

const respConfig = {
    type: 'resp',
    color: '#00ccff',
    baselineOffset: 0,
    respRate: 16,
    updateValues: function() {
        this.respRate = 14 + Math.floor(Math.random() * 5);
        document.getElementById('respRate').textContent = this.respRate;
    }
};

document.addEventListener('DOMContentLoaded', function() {
    const manager = new MonitorManager();
    const ecg = new ECGMonitor('ecgCanvas');
    const o2Monitor = new VitalSignMonitor('o2Canvas', o2Config);
    const respMonitor = new VitalSignMonitor('respCanvas', respConfig);

    manager.addMonitor(ecg);
    manager.addMonitor(o2Monitor);
    manager.addMonitor(respMonitor);
    manager.start();
    
    console.log('ECG,SPO2, and Resp monitors initialized!');
});







        



    /* --- Touch Support --- */
let touchStartX = 0;
let touchStartY = 0;

container.addEventListener('touchstart', (evt) => {
    const touch = evt.touches[0];
    touchStartX = touch.clientX;
    touchStartY = touch.clientY;
}, { passive: true });

container.addEventListener('touchend', (evt) => {
    const touch = evt.changedTouches[0];
    
    const deltaX = Math.abs(touch.clientX - touchStartX);
    const deltaY = Math.abs(touch.clientY - touchStartY);

    // treat as tap only if finger barely moved
    if (deltaX < 10 && deltaY < 10) {
        const element = document.elementFromPoint(touch.clientX, touch.clientY);

        if (element && element.closest('#eyeContainer')) {
            return;
        }
        
        const clickEvent = new MouseEvent('click', {
            clientX: touch.clientX,
            clientY: touch.clientY,
            bubbles: true
        });
        container.dispatchEvent(clickEvent);
    }
}, { passive: true });

container.addEventListener('touchmove', (evt) => {
    const touch = evt.touches[0];
    const deltaY = Math.abs(touch.clientY - touchStartY);

    if (deltaY < 10) { // not scrolling, so do hover
        const moveEvent = new MouseEvent('mousemove', {
            clientX: touch.clientX,
            clientY: touch.clientY,
            bubbles: true
        });
        container.dispatchEvent(moveEvent);
    }
}, { passive: true });




function populateOrganList() {
  const container = document.getElementById('organ-list');
  
  Object.entries(organData).forEach(([organName, organ]) => {
    const sidebarItem = document.createElement('div');
    sidebarItem.className = 'sidebar-item';
    sidebarItem.innerHTML = `
      <p><strong>Structure:</strong> <b><i>${organ.title}</i></b></p>
      <p><strong>Results:</strong> ${organ.description}</p>
    `;
    container.appendChild(sidebarItem);
  });
}
document.addEventListener('DOMContentLoaded', populateOrganList);


console.log('The Observation Room is ready for you, Doctor...');