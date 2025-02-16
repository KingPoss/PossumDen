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
                tagsContainer.innerHTML = ''; // Clear any existing content

                // Iterate through each tag in the PostTags array
                post.PostTags.forEach((tag, index) => {
                    const tagLink = document.createElement('a');
                    tagLink.href = `/Thoughts/Tag${tag}.html`; // Link to the tag page
                    tagLink.textContent = tag;
                    tagLink.className = 'post-tag'; // Use 'post-badge' class for styling

                    tagsContainer.appendChild(tagLink);

                    // Add a comma after the tag if it's not the last tag
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
