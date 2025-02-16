document.addEventListener('DOMContentLoaded', (event) => {
    function updateProgressBar(wrapper) {
        var progress = wrapper.getAttribute('data-progress');
        var progressBar = wrapper.querySelector('.progress-bar');
        var progressText = wrapper.querySelector('.progress-text');

        progressBar.style.width = progress + '%';
        progressText.textContent = progress + '%';
    }

    var wrappers = document.querySelectorAll('.wrapper');
    wrappers.forEach(wrapper => {
        updateProgressBar(wrapper);
    });
});
