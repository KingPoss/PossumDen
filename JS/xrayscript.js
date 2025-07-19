   /******************************************************
     1) Responsive Dimensions & Scaling
    ******************************************************/
    const BASE_WIDTH = 520;
    const BASE_HEIGHT = 980;

    /******************************************************
     2) Organ Data
     OPTIONS:
     imageSrc
     audioSrc
     VideoSrc
     link
    ******************************************************/
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


    /******************************************************
     3) Responsive Setup
    ******************************************************/
    const container = document.getElementById('anatomy-container');
    const anatomyContent = container.querySelector('.anatomy-content');
    
    // Get all images except eyeball components
    const allImgs = Array.from(anatomyContent.querySelectorAll('img')).filter(img => {
      const src = img.getAttribute('src') || "";
      return !src.includes("eyeball") && !src.includes("iris");
    });

    // Create responsive image data storage
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

    // Function to get current scale factor
    function getScaleFactor() {
      const containerRect = container.getBoundingClientRect();
      return {
        scaleX: containerRect.width / BASE_WIDTH,
        scaleY: containerRect.height / BASE_HEIGHT
      };
    }

    // Store image data for pixel detection
    function storeImageData(layer) {
      const { img, ctx, offCanvas } = layer;
      if (!img.complete) return;
      
      ctx.clearRect(0, 0, offCanvas.width, offCanvas.height);
      ctx.drawImage(img, 0, 0, offCanvas.width, offCanvas.height);
      layer.imageData = ctx.getImageData(0, 0, offCanvas.width, offCanvas.height).data;
      layer.loaded = true;
    }

    // Initialize image data
    layeredImages.forEach(layer => {
      const { img } = layer;
      if (img.complete) {
        storeImageData(layer);
      } else {
        img.onload = () => storeImageData(layer);
      }
    });

    /******************************************************
     4) Modal Logic
    ******************************************************/
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

      // Handle different content types
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

    // Modal close functionality
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

    /******************************************************
     5) Info Box
    ******************************************************/
    const infoBox = document.getElementById('info-box');
    const infoText = document.getElementById('info-text');
    const infoClose = document.getElementById('info-close');

    infoClose.onclick = function() {
      infoBox.style.display = 'none';
    };

    /******************************************************
     6) Responsive Click Handler
    ******************************************************/
    container.addEventListener('click', (evt) => {
      const containerRect = container.getBoundingClientRect();
      const { scaleX, scaleY } = getScaleFactor();
      
      // Convert click position to base coordinates
      const clickX = Math.floor((evt.clientX - containerRect.left) / scaleX);
      const clickY = Math.floor((evt.clientY - containerRect.top) / scaleY);
      
      // Ensure click is within bounds
      if (clickX < 0 || clickX >= BASE_WIDTH || clickY < 0 || clickY >= BASE_HEIGHT) {
        return;
      }

      let found = false;

      // Check layers from top to bottom
      for (let i = layeredImages.length - 1; i >= 0; i--) {
        const layer = layeredImages[i];
        if (!layer.loaded || !layer.imageData) continue;

        const src = layer.img.getAttribute('src') || "";
        const alt = layer.img.getAttribute('alt') || "";
        
        // Skip certain layers
        if (src.includes("xray_outline") || alt.includes("or_table")) {
          continue;
        }

        // Check pixel alpha at click position
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

    /******************************************************
     7) Hover Effects
    ******************************************************/
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

    /******************************************************
     8) Responsive Eye Tracking
    ******************************************************/
    const eyeContainer = document.getElementById('eyeContainer');
    const irisImg = document.getElementById('irisImg');

    document.addEventListener('mousemove', (e) => {
      if (!eyeContainer || !irisImg) return;
      
      const eyeRect = eyeContainer.getBoundingClientRect();
      
      // Calculate eye center in viewport coordinates
      const eyeCenterX = eyeRect.left + eyeRect.width / 2;
      const eyeCenterY = eyeRect.top + eyeRect.height / 2;
      
      // Mouse position
      const mouseX = e.clientX;
      const mouseY = e.clientY;
      
      // Calculate direction vector from eye center to mouse
      const dx = mouseX - eyeCenterX;
      const dy = mouseY - eyeCenterY;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      // Only move iris if mouse is far enough away (prevents weird center movement)
      if (distance < 10) return; // Don't move if mouse is too close to eye center
      
      // Normalize the direction (unit vector)
      const normalizedX = dx / distance;
      const normalizedY = dy / distance;
      
      // Fixed maximum movement distance - iris can move 25% of eyeball size in any direction
      // Since iris is 50% of eyeball size, it can move 25% before hitting the edge
      const maxMovement = 25; // 25% of eyeball container
      
      // Calculate final iris position (always use full movement in mouse direction)
      const offsetX = normalizedX * maxMovement;
      const offsetY = normalizedY * maxMovement;
      
      // Apply the position relative to the center (25%, 25%)
      const centerX = 25; // Perfect center for 50% width iris
      const centerY = 25; // Perfect center for 50% height iris
      
      // Apply new position
      irisImg.style.left = (centerX + offsetX) + '%';
      irisImg.style.top = (centerY + offsetY) + '%';
    });

    /******************************************************
     9) Responsive Resize Handler
    ******************************************************/
    let resizeTimeout;
    window.addEventListener('resize', () => {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(() => {
        // Re-store image data if needed for new dimensions
        layeredImages.forEach(layer => {
          if (layer.img.complete) {
            storeImageData(layer);
          }
        });
      }, 250);
    });









    


// ======================================
//            VITAL MONITORS
// ======================================

class MonitorManager {
    constructor() {
        this.monitors = [];
        this.animating = false;
        this.frameCount = 0;
        this.fps = 60; // Run at 30fps instead of 60fps
    }
    
    addMonitor(monitor) {
        this.monitors.push(monitor);
    }
    
    animate() {
        if (!this.animating) return;
        
        this.frameCount++;
        
        // Only update based on target FPS (30fps = every other frame)
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

// Base class for all monitors
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
        this.performanceMode = true; // Enable performance optimizations
        
        // Create persistent canvas for the trace
        this.traceCanvas = document.createElement('canvas');
        this.traceCtx = this.traceCanvas.getContext('2d');
        
        // Disable image smoothing for better performance
        this.ctx.imageSmoothingEnabled = false;
        this.traceCtx.imageSmoothingEnabled = false;
        
        // Cache dimensions
        this.width = 0;
        this.height = 0;
        this.baselineY = 0;
        
        // Set canvas size
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
        
        // Calculate baseline with offset if needed
        if (this.config && this.config.baselineOffset) {
            this.baselineY = this.height / 2 + this.config.baselineOffset;
        } else {
            this.baselineY = this.height / 2;
        }
    }
    
    update() {
        // Clear only the sweep area, not the entire canvas
        const clearX = Math.max(0, this.sweepX - 10);
        const clearWidth = this.fadeWidth + 20;
        this.ctx.clearRect(clearX, 0, clearWidth, this.height);
        
        // Draw the persistent trace
        this.ctx.drawImage(this.traceCanvas, 0, 0);
        
        // Update time
        this.time += 16;
        
        // Calculate current Y position (rounded for performance)
        const currentY = Math.round(this.generateWave(this.time));
        
        // Draw on the trace canvas (only if we have a previous point)
        if (this.prevY !== null) {
            this.traceCtx.strokeStyle = this.config.color;
            this.traceCtx.lineWidth = 2;
            
            // Skip shadows in performance mode
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
        
        // Clear ahead of the sweep
        this.traceCtx.clearRect(this.sweepX + 2, 0, this.fadeWidth, this.height);
        
        // Draw the bright leading edge dot
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
        
        // Draw vertical sweep line (skip in performance mode)
        if (!this.performanceMode) {
            this.ctx.strokeStyle = this.config.color + '33';
            this.ctx.lineWidth = 1;
            this.ctx.shadowBlur = 0;
            this.ctx.beginPath();
            this.ctx.moveTo(Math.round(this.sweepX), 0);
            this.ctx.lineTo(Math.round(this.sweepX), this.height);
            this.ctx.stroke();
        }
        
        // Store current Y for next frame
        this.prevY = currentY;
        
        // Update sweep position
        this.sweepX += this.speed;
        
        // Wrap around when reaching the right edge
        if (this.sweepX > this.width) {
            this.sweepX = 0;
            this.prevY = null;
        }
        
        // Update display values with slight variation
        if (Math.random() < 0.02 && this.config.updateValues) {
            this.config.updateValues();
        }
    }
    
    generateWave(x) {
        // Override in subclasses
        return this.baselineY;
    }
}

// ECG Monitor with pre-calculated waveform
class ECGMonitor extends BaseMonitor {
    constructor(canvasId) {
        super(canvasId, {
            color: '#00ff00',
            baselineOffset: 10
        });
        
        this.heartRate = 72;
        this.beatInterval = 60000 / this.heartRate;
        
        // Pre-calculate waveform for performance
        this.waveformSteps = 1000;
        this.waveformCache = new Float32Array(this.waveformSteps);
        this.precalculateWaveform();
    }
    
    precalculateWaveform() {
        for (let i = 0; i < this.waveformSteps; i++) {
            const progress = i / this.waveformSteps;
            let y = 0;
            
            // P wave (atrial depolarization)
            if (progress < 0.1) {
                const pProgress = progress / 0.1;
                y -= Math.sin(pProgress * Math.PI) * 10;
            }
            // QRS complex (ventricular depolarization)
            else if (progress >= 0.2 && progress < 0.3) {
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
            // T wave (ventricular repolarization)
            else if (progress >= 0.4 && progress < 0.55) {
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
        
        // Add tiny noise for realism
        const noise = (Math.random() - 0.5) * 0.2;
        
        return this.baselineY + this.waveformCache[index] + noise;
    }
    
    update() {
        super.update();
        
        // Update heart rate occasionally
        if (Math.random() < 0.02) {
            this.heartRate = 72 + Math.floor(Math.random() * 5 - 2);
            document.getElementById('heartRate').textContent = this.heartRate;
            this.beatInterval = 60000 / this.heartRate;
        }
    }
}

// Vital Sign Monitor for O2 and Respiratory
class VitalSignMonitor extends BaseMonitor {
    constructor(canvasId, config) {
        super(canvasId, config);
        this.respPhase = 0;
        
        // Pre-calculate O2 waveform if needed
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
            // Increment phase based on respiratory rate
            const phaseIncrement = (this.config.respRate / 60) * 0.016 * 2 * Math.PI;
            this.respPhase += phaseIncrement;
            
            let y = this.baselineY;
            
            // Primary breathing wave - smooth sine
            y -= Math.sin(this.respPhase) * 35;
            
            // Very subtle variations
            const slowVariation = Math.sin(this.respPhase * 0.1) * 3;
            const microVariation = Math.sin(this.respPhase * 2.5) * 0.5;
            const noise = (Math.random() - 0.5) * 0.1;
            
            return y + slowVariation + microVariation + noise;
        }
        
        return this.baselineY;
    }
}

// Configuration objects
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

// Initialize everything with a single animation loop
document.addEventListener('DOMContentLoaded', function() {
    const manager = new MonitorManager();
    
    // Create monitors
    const ecg = new ECGMonitor('ecgCanvas');
    const o2Monitor = new VitalSignMonitor('o2Canvas', o2Config);
    const respMonitor = new VitalSignMonitor('respCanvas', respConfig);
    
    // Add to manager
    manager.addMonitor(ecg);
    manager.addMonitor(o2Monitor);
    manager.addMonitor(respMonitor);
    
    // Start single animation loop
    manager.start();
    
    console.log('ECG,SPO2, and Resp monitors initialized!');
});







        



    /******************************************************
     10) Touch Support for Mobile
    ******************************************************/
let touchStartX = 0;
let touchStartY = 0;

container.addEventListener('touchstart', (evt) => {
    const touch = evt.touches[0];
    touchStartX = touch.clientX;
    touchStartY = touch.clientY;
}, { passive: true });

container.addEventListener('touchend', (evt) => {
    const touch = evt.changedTouches[0];
    
    // Calculate movement distance
    const deltaX = Math.abs(touch.clientX - touchStartX);
    const deltaY = Math.abs(touch.clientY - touchStartY);
    
    // If it's a tap (minimal movement only)
    if (deltaX < 10 && deltaY < 10) {
        const element = document.elementFromPoint(touch.clientX, touch.clientY);
        
        // Skip eye area
        if (element && element.closest('#eyeContainer')) {
            return;
        }
        
        // Fire click event
        const clickEvent = new MouseEvent('click', {
            clientX: touch.clientX,
            clientY: touch.clientY,
            bubbles: true
        });
        container.dispatchEvent(clickEvent);
    }
}, { passive: true });

// Handle touch move for hover effects
container.addEventListener('touchmove', (evt) => {
    const touch = evt.touches[0];
    const deltaY = Math.abs(touch.clientY - touchStartY);
    
    // Only do hover if not scrolling
    if (deltaY < 10) {
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