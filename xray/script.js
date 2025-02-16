/******************************************************
 1) Base Dimensions for Pixel Checking
******************************************************/
const BASE_WIDTH  = 390;
const BASE_HEIGHT = 735;

/******************************************************
 2) Organ Data
    - For demonstration, let's define some organs with
      separate "fullSrc" images, or use placeholders.
******************************************************/
const organData = {
  "brain": {
    title: "Human Brain",
    description: "The command center of the nervous system.",
    imageSrc: "/assets/art/brainscan.gif",
    audioSrc: "/assets/audio/test.wav",
    videoSrc: "/assets/art/digitalnightmare.mp4"
  },
  "heart": {
    title: "Human Heart",
    description: "Pumps blood throughout the body.",
    fullSrc: "assets/heart_detail.png"
  },
  "green_thumb": {
    title: "Green Thumb",
    description: "A whimsical top layer, representing a love of plants!",
    fullSrc: "assets/green_thumb_detail.png"
  },
  // ... add more, or match alt text to an object key
};

/******************************************************
 3) Setup Container + Images + Offscreen Canvases
******************************************************/
const container = document.getElementById('anatomy-container');
container.style.width  = BASE_WIDTH  + "px";
container.style.height = BASE_HEIGHT + "px";
const allImgs   = Array.from(container.querySelectorAll('img'));

const layeredImages = allImgs.map(imgEl => {
  // For each <img>, make an offscreen canvas
  const offCanvas = document.createElement('canvas');
  offCanvas.width  = BASE_WIDTH;
  offCanvas.height = BASE_HEIGHT;
  allImgs.forEach(imgEl => {
    // If the image is NOT the eyeball or iris, then set 390×735
    const src = imgEl.getAttribute('src') || "";
    if (!src.includes("eyeball") && !src.includes("iris")) {
      imgEl.style.width  = BASE_WIDTH  + "px";
      imgEl.style.height = BASE_HEIGHT + "px";
    }
  });
  return {
    img:       imgEl,
    offCanvas: offCanvas,
    ctx:       offCanvas.getContext('2d'),
    imageData: null,
    loaded:    false
  };
});

// Draw each image once loaded => store pixel data
layeredImages.forEach(layer => {
  const { img, ctx, offCanvas } = layer;
  if (img.complete) {
    storeImageData(layer);
  } else {
    img.onload = () => storeImageData(layer);
  }
});

function storeImageData(layer) {
  const { img, ctx, offCanvas } = layer;
  ctx.clearRect(0, 0, offCanvas.width, offCanvas.height);
  ctx.drawImage(img, 0, 0, offCanvas.width, offCanvas.height);
  layer.imageData = ctx.getImageData(0, 0, offCanvas.width, offCanvas.height).data;
  layer.loaded = true;
}

/******************************************************
 4) Full-Screen Modal Logic
******************************************************/
function showOrganModal(organKey) {
  const modal          = document.getElementById("myModal");
  const modalDisplay   = document.getElementById("modalDisplay");
  const loadingGif     = document.getElementById("loadingPlaceholder");
  const titleText      = document.getElementById("title");
  const captionText    = document.getElementById("caption");

  document.body.style.overflow = "hidden"; // Lock scroll
  modal.style.display = "block";

  // Show loading while preparing content
  loadingGif.style.display = "block";
  modalDisplay.innerHTML = ""; // Clear previous content

  // Grab organ data
  const organ = organData[organKey];
  if (!organ) {
    titleText.innerHTML = "Unknown Organ";
    captionText.innerHTML = "No data available.";
    loadingGif.style.display = "none";
    return;
  }

  titleText.innerHTML = organ.title;
  captionText.innerHTML = organ.description;

  // Handle image if available
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

  // Handle video if available
  if (organ.videoSrc) {
    const videoElement = document.createElement("video");
    videoElement.className = "modal-content modal-video";
    videoElement.controls = true;

    const videoSource = document.createElement("source");
    videoSource.src = organ.videoSrc;
    // Optionally specify mime type
    // videoSource.type = "video/mp4";

    videoElement.appendChild(videoSource);
    videoElement.onloadeddata = () => {
      loadingGif.style.display = "none";
    };
    videoElement.onerror = () => {
      console.error("Failed to load video:", organ.videoSrc);
      loadingGif.style.display = "none";
    };
    modalDisplay.appendChild(videoElement);
  }

  // Handle audio if available
  if (organ.audioSrc) {
    const audioElement = document.createElement("audio");
    audioElement.className = "modal-content modal-audio";
    audioElement.controls = true;

    const audioSource = document.createElement("source");
    audioSource.src = organ.audioSrc;
    // Optionally specify mime type
    // audioSource.type = "audio/mp3";

    audioElement.appendChild(audioSource);
    audioElement.oncanplaythrough = () => {
      loadingGif.style.display = "none";
    };
    audioElement.onerror = () => {
      console.error("Failed to load audio:", organ.audioSrc);
      loadingGif.style.display = "none";
    };
    modalDisplay.appendChild(audioElement);
  }

  // Hide loading if none of the above elements require loading
  if (!organ.imageSrc && !organ.videoSrc && !organ.audioSrc) {
    loadingGif.style.display = "none";
  }
}



/* Close the modal (similar to your existing approach) */
(function setupModalClose() {
  const modal = document.getElementById("myModal");
  const closeBtn = modal.querySelector(".close");

  // Close modal when clicking the close button
  closeBtn.onclick = function () {
    closeModal();
  };

  // Close modal when clicking anywhere outside the modal content
  modal.onclick = function (event) {
    if (event.target === modal) {
      closeModal();
    }
  };

  function closeModal() {
    modal.style.display = "none";
    document.body.style.overflow = "auto"; // Unlock scroll

    // Remove hover effects when modal closes
    if (lastHoveredImg) {
      unHighlight(lastHoveredImg);
      lastHoveredImg = null;
    }
  }
})();

/******************************************************
 5) Info Box (Small Popup)
******************************************************/
const infoBox   = document.getElementById('info-box');
const infoText  = document.getElementById('info-text');
const infoClose = document.getElementById('info-close');

// Close info box
infoClose.onclick = function() {
  infoBox.style.display = 'none';
};

/* Optional function if you want a small text popup instead of or in addition to the modal */
function showInfoPopup(organKey) {
  infoText.textContent = "Clicked on: " + organKey;
  infoBox.style.display = 'block';
}

/******************************************************
 6) Click Handler: Pixel Detection => Show Modal
******************************************************/
container.addEventListener('click', (evt) => {
  const rect = container.getBoundingClientRect();
  const clickX = Math.floor(evt.clientX - rect.left);
  const clickY = Math.floor(evt.clientY - rect.top);

  let found = false;

  // Because top is physically last <img>, we loop from the end down
  for (let i = layeredImages.length - 1; i >= 0; i--) {
    const layer = layeredImages[i];
    if (!layer.loaded || !layer.imageData) continue;

    const src = layer.img.getAttribute('src') || "";

    // Skip xray + eyeball + iris
    if (src.includes("xray_outline") || src.includes("eyeball") || src.includes("iris") || src.includes("ortable")) {
    continue;
    }

    // check alpha
    const index = ((clickY * BASE_WIDTH) + clickX) * 4;
    const alpha = layer.imageData[index + 3];
    if (alpha > 0) {
      // Found topmost organ => show big modal
      const organKey = layer.img.getAttribute('alt') || "";
      showOrganModal(organKey);

      // or if you wanted the smaller popup:
      // showInfoPopup(organKey);

      found = true;
      break;
    }
  }

  if (!found) {
    // no organ => hide info box or do nothing
    infoBox.style.display = 'none';
  }
});

/******************************************************
 7) Hover Handler: highlight / un-highlight
******************************************************/
let lastHoveredImg = null;

function highlight(imgEl) {
  imgEl.style.filter = "brightness(1.4) drop-shadow(0 0 6px red)";
}

function unHighlight(imgEl) {
  if (imgEl) {
    imgEl.style.filter = "none";
  }
}

container.addEventListener("mousemove", (evt) => {
  const rect = container.getBoundingClientRect();
  const mouseX = Math.floor(evt.clientX - rect.left);
  const mouseY = Math.floor(evt.clientY - rect.top);

  let hoveredLayer = null;

  for (let i = layeredImages.length - 1; i >= 0; i--) {
    const layer = layeredImages[i];
    if (!layer.loaded || !layer.imageData) continue;

    const src = layer.img.getAttribute("src") || "";
    if (src.includes("xray_outline") || src.includes("eyeball") || src.includes("iris") || src.includes("ortable")) {
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


// highlight/unHighlight
function highlight(imgEl) {
  imgEl.style.filter = "brightness(1.4) drop-shadow(0 0 6px red)";
}
function unHighlight(imgEl) {
  imgEl.style.filter = "none";
}

/*******************************************************
 * EYEBALL FOLLOW CODE (28×28 eyeball, 14×14 iris)
 *******************************************************/
const eyeContainer = document.getElementById('eyeContainer');
const irisImg      = document.getElementById('irisImg');

// Dimensions must match CSS & PNGs
const EYEBALL_DIAMETER = 22;
const IRIS_DIAMETER    = 11;

// Calculate radii
const eyeballRadius = EYEBALL_DIAMETER / 2; // 14
const irisRadius    = IRIS_DIAMETER    / 2; // 7
const maxIrisShift  = eyeballRadius - irisRadius; // 14 - 7 = 7

// We'll listen for mousemove on the .anatomy-container.
// If you want the eye to follow anywhere on the page,
// change this to: document.addEventListener('mousemove', ...)
const anatomyContainer = document.getElementById('body');
anatomyContainer.addEventListener('mousemove', (e) => {
  
  // 1) Where is the .eye-container on the page?
  //    getBoundingClientRect() gives the top-left in viewport coords
  const rect    = eyeContainer.getBoundingClientRect();
  const centerX = rect.left + eyeballRadius; 
  const centerY = rect.top  + eyeballRadius;

  // 2) Mouse's page coords
  const mouseX = e.clientX;
  const mouseY = e.clientY;

  // 3) Calculate angle from eye center → mouse
  const dx = mouseX - centerX;
  const dy = mouseY - centerY;
  const angle = Math.atan2(dy, dx);

  // 4) Distance from center, clamp so the iris stays inside
  let distance = Math.sqrt(dx * dx + dy * dy);
  if (distance > maxIrisShift) {
    distance = maxIrisShift;
  }

  // 5) The new iris center in *page* coords
  const irisCenterX = centerX + distance * Math.cos(angle);
  const irisCenterY = centerY + distance * Math.sin(angle);

  // 6) Convert that back to local coords inside .eye-container
  const offsetX = irisCenterX - rect.left;
  const offsetY = irisCenterY - rect.top;

  // 7) Move the iris
  irisImg.style.left = offsetX + 'px';
  irisImg.style.top  = offsetY + 'px';
});
