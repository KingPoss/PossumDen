document.addEventListener("DOMContentLoaded", function() {
    // Select all elements with the 'thumbnail' class
    const thumbnails = document.querySelectorAll(".thumbnail");
    const modal = document.getElementById("phone_modal");

    // Attach a click listener to each thumbnail element
    thumbnails.forEach(function(thumbnail) {
      thumbnail.addEventListener("click", function(event) {
        event.preventDefault();
        modal.style.display = "flex"; // Open the modal using flex to center its content
      });
    });

    // Close the modal when clicking anywhere on it
    modal.addEventListener("click", function() {
      modal.style.display = "none";
    });
  });