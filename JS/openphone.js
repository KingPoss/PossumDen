// Get references to the elements
const modal = document.getElementById('phone_modal');
const thumbnail = document.getElementById('thumbnail');

// Open the modal when the thumbnail is clicked
thumbnail.addEventListener('click', () => {
modal.style.display = 'flex';
});

// Close the modal when clicking anywhere on it
modal.addEventListener('click', () => {
modal.style.display = 'none';
});
