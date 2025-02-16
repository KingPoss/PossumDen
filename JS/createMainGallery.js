function getRandomImages(imageArray, count) {
    let result = [];
    let taken = [];
    let len = imageArray.length;
  
    if (count > len) count = len;
  
    while (result.length < count) {
      let randomIndex = Math.floor(Math.random() * len);
      if (!taken.includes(randomIndex)) {
        taken.push(randomIndex);
        result.push(imageArray[randomIndex]);
      }
    }
    return result;
  }
  
  function createImages(tags) {
    fetch('allArt.json')
      .then(response => response.json())
      .then(originalImageArray => {
        // Convert the tags string into an array of tags
        var tagArray = tags.split(',');
  
        // Filter images that include at least one of the tags
        var imageArray = originalImageArray.filter(image => image.tags && image.tags.some(tag => tagArray.includes(tag)));
  
        // For the main page, show only 6 random images
        if (tagArray.includes("all")) {
          imageArray = getRandomImages(imageArray, 6);
        }
  
        var gallery = document.getElementById('gallery');
        gallery.innerHTML = '';
  
        for (var i = 0; i < imageArray.length; i++) {
          var imgData = imageArray[i];
  
          var container = document.createElement('div');
          container.className = 'imageContainer';
  
          var img = document.createElement('img');
          img.src = imgData.thumbnailSrc;
  
          img.onclick = function() {
            var modal = document.getElementById("myModal");
            var modalImg = document.getElementById("img01");
            var titleText = document.getElementById("title");
            var captionText = document.getElementById("caption");
            var loadingPlaceholder = document.getElementById("loadingPlaceholder");
  
            modal.style.display = "block";
            loadingPlaceholder.style.display = "block";
            modalImg.style.display = "none";
            document.body.style.overflow = "hidden";
            modalImg.src = this.dataset.fullSrc;
            titleText.innerHTML = this.dataset.title;
            captionText.innerHTML = this.dataset.description;
  
            // Load the image
            var newImage = new Image();
            newImage.src = this.dataset.fullSrc;
  
            newImage.onload = function() {
                loadingPlaceholder.style.display = "none";
                modalImg.src = this.src;
                modalImg.style.display = "block";
            };
  
            newImage.onerror = function() {
                loadingPlaceholder.style.display = "none";
                console.error('Failed to load image:', this.src);
            };
  
            titleText.innerHTML = this.dataset.title;
            captionText.innerHTML = this.dataset.description;
          }
  
          img.dataset.fullSrc = imgData.fullSrc;
          img.dataset.title = imgData.title;
          img.dataset.description = imgData.description;
  
          var title = document.createElement('p');
          title.textContent = imgData.title;
  
          container.appendChild(img);
          container.appendChild(title);
          gallery.appendChild(container);
        }
  
        var modal = document.getElementById("myModal");
        var span = document.getElementsByClassName("close")[0];
  
        span.onclick = function() { 
          modal.style.display = "none";
          document.body.style.overflow = "auto"; // Reset overflow property
        }
  
        window.onclick = function(event) {
          if (event.target == modal) {
            modal.style.display = "none";
            document.body.style.overflow = "auto"; // Reset overflow property
          }
        }
        document.getElementById("galleryLoader").style.display = "none";
      })
      .catch(error => console.error('Error fetching images:', error));
  }
  
  window.onload = function() {
    var gallery = document.getElementById('gallery');
    var tags = gallery.dataset.tag;
    createImages(tags);
  };
  
  document.getElementById('reshuffle').onclick = function() {
    var gallery = document.getElementById('gallery');
    var tags = gallery.dataset.tag;
    createImages(tags);
  };
  