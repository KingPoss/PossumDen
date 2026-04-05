function fetchAndDisplayPostTags() {
    fetch('/Thoughts/postlist.json') // Adjust this path if necessary
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.json();
        })
        .then(posts => {
            const currentFilename = window.location.pathname.split('/').pop();
            const post = posts.find(post => post.PostPath.endsWith(currentFilename));

            if (post) {
                const tagsContainer = document.getElementById('postTags');
                tagsContainer.innerHTML = '';
                post.PostTags.forEach((tag, index) => {
                    const tagLink = document.createElement('a');
                    tagLink.href = `/Thoughts/Tag${tag}.html`; // Link to the tag page
                    tagLink.textContent = tag;
                    tagLink.className = 'post-tag';

                    tagsContainer.appendChild(tagLink);

                    if (index < post.PostTags.length - 1) {
                        tagsContainer.appendChild(document.createTextNode(', '));
                    }
                });
            } else {
                console.log('No matching post found for the current page.');
            }
        })
        .catch(error => {
            console.error('There was a problem with the fetch operation:', error);
        });
}

document.addEventListener('DOMContentLoaded', fetchAndDisplayPostTags);
