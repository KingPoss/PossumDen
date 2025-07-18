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









    


        class ECGMonitor {
            constructor(canvasId) {
                this.canvas = document.getElementById(canvasId);
                this.ctx = this.canvas.getContext('2d');
                this.sweepX = 5;
                this.speed = 2;
                this.heartRate = 72;
                this.beatInterval = 60000 / this.heartRate;
                this.time = 0;
                this.fadeWidth = 5; // Width of the fade effect
                this.prevY = null; // Store previous Y for smooth drawing
                
                // Create persistent canvas for the trace
                this.traceCanvas = document.createElement('canvas');
                this.traceCtx = this.traceCanvas.getContext('2d');
                
                // Set canvas size
                this.resize();
                window.addEventListener('resize', () => this.resize());
                
                // Start animation
                this.animate();
            }
            
            resize() {
                const rect = this.canvas.getBoundingClientRect();
                this.canvas.width = rect.width;
                this.canvas.height = rect.height;
                this.traceCanvas.width = rect.width;
                this.traceCanvas.height = rect.height;
                this.baselineY = this.canvas.height / 2 + 10;
            }
            
            generateECGWave(x) {
                const normalizedX = x % this.beatInterval;
                const progress = normalizedX / this.beatInterval;
                
                let y = this.baselineY;
                
                // P wave (atrial depolarization)
                if (progress < 0.1) {
                    const pProgress = progress / 0.1;
                    y -= Math.sin(pProgress * Math.PI) * 10;
                }
                // PR segment (flat)
                else if (progress < 0.2) {
                    y = this.baselineY;
                }
                // QRS complex (ventricular depolarization)
                else if (progress < 0.3) {
                    const qrsProgress = (progress - 0.2) / 0.1;
                    if (qrsProgress < 0.2) {
                        // Q wave (small dip)
                        y += Math.sin(qrsProgress * 5 * Math.PI) * 5;
                    } else if (qrsProgress < 0.5) {
                        // R wave (large spike)
                        const rProgress = (qrsProgress - 0.2) / 0.3;
                        y -= Math.sin(rProgress * Math.PI) * 60;
                    } else {
                        // S wave (small dip after R)
                        const sProgress = (qrsProgress - 0.5) / 0.5;
                        y += Math.sin(sProgress * Math.PI) * 15;
                    }
                }
                // ST segment (flat)
                else if (progress < 0.4) {
                    y = this.baselineY;
                }
                // T wave (ventricular repolarization)
                else if (progress < 0.55) {
                    const tProgress = (progress - 0.4) / 0.15;
                    y -= Math.sin(tProgress * Math.PI) * 20;
                }
                // Baseline
                else {
                    y = this.baselineY;
                }
                
                // Add slight noise for realism
                y += (Math.random() - 0.2) * 0.2;
                
                return y;
            }
            
animate() {
    // Clear main canvas with transparency (like vital monitors)
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    
    // Draw the persistent trace
    this.ctx.drawImage(this.traceCanvas, 0, 0);
    
    // Update time
    this.time += 16; // Assuming 60fps
    
    // Calculate current Y position
    const currentY = this.generateECGWave(this.time);
    
    // Draw on the trace canvas (only if we have a previous point)
    if (this.prevY !== null) {
        this.traceCtx.strokeStyle = '#00ff00';
        this.traceCtx.lineWidth = 2;
        this.traceCtx.shadowBlur = 10;
        this.traceCtx.shadowColor = '#00ff00';
        
        this.traceCtx.beginPath();
        this.traceCtx.moveTo(this.sweepX - this.speed, this.prevY);
        this.traceCtx.lineTo(this.sweepX, currentY);
        this.traceCtx.stroke();
    }
    
    // Clear immediately ahead of the sweep (matching vital monitors style)
    this.traceCtx.clearRect(this.sweepX + 2, 0, this.fadeWidth, this.canvas.height);
    
    // Draw the bright leading edge dot
    this.ctx.fillStyle = '#00ff00';
    this.ctx.shadowBlur = 20;
    this.ctx.shadowColor = '#00ff00';
    this.ctx.beginPath();
    this.ctx.arc(this.sweepX, currentY, 3, 0, Math.PI * 2);
    this.ctx.fill();
    
    // Draw a vertical sweep line
    this.ctx.strokeStyle = 'rgba(0, 255, 0, 0.3)';
    this.ctx.lineWidth = 1;
    this.ctx.shadowBlur = 5;
    this.ctx.beginPath();
    this.ctx.moveTo(this.sweepX, 0);
    this.ctx.lineTo(this.sweepX, this.canvas.height);
    this.ctx.stroke();
    
    // Store current Y for next frame
    this.prevY = currentY;
    
    // Update sweep position
    this.sweepX += this.speed;
    
    // Wrap around when reaching the right edge
    if (this.sweepX > this.canvas.width) {
        this.sweepX = 0;
        this.prevY = null; // Reset to avoid drawing a line across the screen
    }
    
    // Update heart rate display with slight variation
    if (Math.random() < 0.02) {
        this.heartRate = 72 + Math.floor(Math.random() * 5 - 2);
        document.getElementById('heartRate').textContent = this.heartRate;
        this.beatInterval = 60000 / this.heartRate;
    }
    
    requestAnimationFrame(() => this.animate());
}}
        
        // Start the ECG monitor
        const ecg = new ECGMonitor('ecgCanvas');




        class VitalSignMonitor {
            constructor(canvasId, config) {
                this.canvas = document.getElementById(canvasId);
                this.ctx = this.canvas.getContext('2d');
                this.config = config;
                this.sweepX = 10;
                this.speed = 2;
                this.time = 0;
                this.fadeWidth = 5;
                this.prevY = null;
                this.respPhase = 0; // Continuous phase for smooth respiratory wave
                
                // Create persistent canvas for the trace
                this.traceCanvas = document.createElement('canvas');
                this.traceCtx = this.traceCanvas.getContext('2d');
                
                // Set canvas size
                this.resize();
                window.addEventListener('resize', () => this.resize());
                
                // Start animation
                this.animate();
            }
            
            resize() {
                const rect = this.canvas.getBoundingClientRect();
                this.canvas.width = rect.width;
                this.canvas.height = rect.height;
                this.traceCanvas.width = rect.width;
                this.traceCanvas.height = rect.height;
                
                // Add offset for O2 monitor only
                if (this.config.type === 'o2') {
                    this.baselineY = this.canvas.height / 2 + 15; // Move down 10 pixels
                } else {
                    this.baselineY = this.canvas.height / 2;
                }
            }
            generateWave(x) {
                if (this.config.type === 'o2') {
                    return this.generateO2Wave(x);
                } else if (this.config.type === 'resp') {
                    return this.generateRespWave(x);
                }
            }
            
            generateO2Wave(x) {
                // O2 saturation plethysmography waveform (pulse oximetry)
                // This waveform represents blood volume changes in the finger
                const period = 60000 / this.config.pulseRate;
                const normalizedX = x % period;
                const progress = normalizedX / period;
                
                let y = this.baselineY;
                
                // Anacrotic phase (initial upstroke) - blood rushing into finger
                if (progress < 0.12) {
                    const upProgress = progress / 0.12;
                    // Steeper initial rise
                    y -= Math.pow(upProgress, 1.5) * 35;
                }
                // Systolic peak
                else if (progress < 0.18) {
                    const peakProgress = (progress - 0.12) / 0.06;
                    y -= 35 + Math.sin(peakProgress * Math.PI * 0.5) * 5;
                }
                // Dicrotic notch (closure of aortic valve)
                else if (progress < 0.25) {
                    const notchProgress = (progress - 0.18) / 0.07;
                    y -= 40 - Math.sin(notchProgress * Math.PI) * 8;
                }
                // Diastolic decline
                else if (progress < 0.8) {
                    const downProgress = (progress - 0.25) / 0.55;
                    // More gradual, realistic decline
                    y -= 32 * Math.exp(-downProgress * 2.5);
                }
                
                // Add respiratory modulation (affects amplitude slightly)
                const respModulation = Math.sin(x * 0.0003) * 3;
                y += respModulation;
                
                // Minimal noise for stable signal
                y += (Math.random() - 0.5) * 0.2;
                
                return y;
            }
            
            generateRespWave(x) {
                // For respiratory, use continuous phase to avoid jumps
                if (this.config.type === 'resp') {
                    // Increment phase based on respiratory rate
                    const phaseIncrement = (this.config.respRate / 60) * 0.016 * 2 * Math.PI;
                    this.respPhase += phaseIncrement;
                    
                    let y = this.baselineY;
                    
                    // Primary breathing wave - smooth sine
                    y -= Math.sin(this.respPhase) * 35;
                    
                    // Very subtle variation over multiple breaths
                    const slowVariation = Math.sin(this.respPhase * 0.1) * 3;
                    y += slowVariation;
                    
                    // Tiny physiological variation
                    const microVariation = Math.sin(this.respPhase * 2.5) * 0.5;
                    y += microVariation;
                    
                    // Minimal noise
                    y += (Math.random() - 0.5) * 0.1;
                    
                    return y;
                } else {
                    // Original respiratory wave code for other monitor types
                    const period = 60000 / this.config.respRate;
                    const normalizedX = x % period;
                    const progress = normalizedX / period;
                    
                    let y = this.baselineY;
                    const breathPhase = progress * 2 * Math.PI;
                    y -= Math.sin(breathPhase) * 35;
                    const slowVariation = Math.sin(x * 0.00008) * 3;
                    y += slowVariation;
                    const microVariation = Math.sin(x * 0.002) * 0.5;
                    y += microVariation;
                    y += (Math.random() - 0.5) * 0.1;
                    
                    return y;
                }
            }
            
            animate() {
                // Clear main canvas with transparency
                this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
                
                // Draw the persistent trace
                this.ctx.drawImage(this.traceCanvas, 0, 0);
                
                // Update time smoothly
                this.time += 16; // Assuming 60fps
                
                // Calculate current Y position
                const currentY = this.generateWave(this.time);
                
                // Draw on the trace canvas (only if we have a previous point)
                if (this.prevY !== null) {
                    this.traceCtx.strokeStyle = this.config.color;
                    this.traceCtx.lineWidth = 2;
                    this.traceCtx.shadowBlur = 10;
                    this.traceCtx.shadowColor = this.config.color;
                    
                    this.traceCtx.beginPath();
                    this.traceCtx.moveTo(this.sweepX - this.speed, this.prevY);
                    this.traceCtx.lineTo(this.sweepX, currentY);
                    this.traceCtx.stroke();
                }
                
                // Clear immediately ahead of the sweep with gradient fade
                const gradient = this.traceCtx.createLinearGradient(
                    this.sweepX + 2, 0,
                    this.sweepX + this.fadeWidth, 0
                );
                gradient.addColorStop(0, 'rgba(0, 0, 0, 0)');
                gradient.addColorStop(1, 'rgba(0, 0, 0, 0.9)'); 
                
                this.traceCtx.fillStyle = gradient;
                // Clear the trace starting 2 pixels ahead of the dot position (this.sweepX)
                // The clearing wave extends from (sweepX + 2) to (sweepX + 2 + fadeWidth)
                this.traceCtx.clearRect(this.sweepX + 2, 0, this.fadeWidth, this.canvas.height);
                
                // Draw the bright leading edge dot
                this.ctx.fillStyle = this.config.color;
                this.ctx.shadowBlur = 20;
                this.ctx.shadowColor = this.config.color;
                this.ctx.beginPath();
                this.ctx.arc(this.sweepX, currentY, 3, 0, Math.PI * 2);
                this.ctx.fill();
                
                // Draw a vertical sweep line
                this.ctx.strokeStyle = this.config.color + '33'; // 20% opacity
                this.ctx.lineWidth = 1;
                this.ctx.shadowBlur = 5;
                this.ctx.beginPath();
                this.ctx.moveTo(this.sweepX, 0);
                this.ctx.lineTo(this.sweepX, this.canvas.height);
                this.ctx.stroke();
                
                // Store current Y for next frame
                this.prevY = currentY;
                
                // Update sweep position
                this.sweepX += this.speed;
                
                // Wrap around when reaching the right edge
                if (this.sweepX > this.canvas.width) {
                    this.sweepX = 0;
                    this.prevY = null; // Reset to avoid drawing a line across the screen
                }
                
                // Update display values with slight variation
                if (Math.random() < 0.02) {
                    this.config.updateValues();
                }
                
                requestAnimationFrame(() => this.animate());
            }
        }
        
        // O2 Monitor configuration
        const o2Config = {
            type: 'o2',
            color: '#ffff00',
            pulseRate: 72,
            o2Level: 98,
            baseO2: 98, // Base SpO2 level
            lastO2Update: 0,
            updateValues: function() {
                // SpO2 should be very stable in healthy individuals
                // Only update every ~10 seconds for realism
                const now = Date.now();
                if (now - this.lastO2Update > 10000) {
                    // Small variation: 97-99% for healthy individual
                    this.baseO2 = 97 + Math.floor(Math.random() * 3);
                    this.lastO2Update = now;
                }
                // Very slight flutter (±1) that can happen between base values
                const flutter = Math.random() < 0.1 ? (Math.random() < 0.5 ? -1 : 0) : 0;
                this.o2Level = Math.max(96, Math.min(100, this.baseO2 + flutter));
                document.getElementById('o2Level').textContent = this.o2Level;
                
                // Pulse rate syncs with ECG heart rate
                this.pulseRate = 70 + Math.floor(Math.random() * 1);
            }
        };
        
        // Respiratory Monitor configuration
        const respConfig = {
            type: 'resp',
            color: '#00ccff',
            respRate: 16,
            updateValues: function() {
                // Resp rate varies between 14-18
                this.respRate = 14 + Math.floor(Math.random() * 5);
                document.getElementById('respRate').textContent = this.respRate;
            }
        };
        
        // Start the monitors
        const o2Monitor = new VitalSignMonitor('o2Canvas', o2Config);
        const respMonitor = new VitalSignMonitor('respCanvas', respConfig);








        



    /******************************************************
     10) Touch Support for Mobile
    ******************************************************/
    container.addEventListener('touchstart', (evt) => {
      evt.preventDefault(); // Prevent scrolling
      const touch = evt.touches[0];
      const clickEvent = new MouseEvent('click', {
        clientX: touch.clientX,
        clientY: touch.clientY,
        bubbles: true
      });
      container.dispatchEvent(clickEvent);
    });

    // Handle touch move for hover effects on mobile
    container.addEventListener('touchmove', (evt) => {
      evt.preventDefault();
      const touch = evt.touches[0];
      const moveEvent = new MouseEvent('mousemove', {
        clientX: touch.clientX,
        clientY: touch.clientY,
        bubbles: true
      });
      container.dispatchEvent(moveEvent);
    });



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


    console.log('Responsive Anatomy Viewer initialized successfully!');