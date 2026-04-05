document.addEventListener("DOMContentLoaded", function() {
    const thumbnails = document.querySelectorAll(".thumbnail");
    const modal = document.getElementById("phone_modal");

    thumbnails.forEach(function(thumbnail) {
      thumbnail.addEventListener("click", function(event) {
        event.preventDefault();
        modal.style.display = "flex";
      });
    });

    modal.addEventListener("click", function() {
      modal.style.display = "none";
    });
  });