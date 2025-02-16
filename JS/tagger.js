let allSortedPosts = [];
let currentDisplayIndex = 0;
const PAGE_SIZE = 5;          
const LOAD_MORE_SIZE = 10;

function fetchAndDisplayPosts() {
  fetch('/Thoughts/POSTLIST.json')
    .then(response => {
      if (!response.ok) throw new Error('Network response was not ok');
      return response.json();
    })
    .then(posts => {
      const postListElement = document.getElementById('postList');
      const tags = postListElement.dataset.tag ? postListElement.dataset.tag.split(',') : [];
      const filteredPosts = tags.length 
        ? posts.filter(post => tags.some(tag => post.PostTags.includes(tag))) 
        : posts;

      allSortedPosts = filteredPosts.sort((a, b) => new Date(b.PostDate) - new Date(a.PostDate));
      currentDisplayIndex = 0;
      postListElement.innerHTML = '';

      // Display initial batch
      displayNextBatch(PAGE_SIZE);
      toggleViewMoreButton();
    })
    .catch(error => {
      console.error('There was a problem with the fetch operation:', error);
    });
}

function displayNextBatch(count) {
  const postListElement = document.getElementById('postList');
  const remaining = allSortedPosts.length - currentDisplayIndex;
  const numberToShow = Math.min(count, remaining);

  for (let i = 0; i < numberToShow; i++) {
    const post = allSortedPosts[currentDisplayIndex + i];
    const correctedPath = post.PostPath.includes('Thoughts/')
      ? post.PostPath 
      : `/Thoughts${post.PostPath}`;

      const tagsLinks = post.PostTags
      .map(tag => `<a href="/Thoughts/Tag${tag}.html" class="post-tag">${tag}</a>`)
      .join(' , ');
    const postElement = document.createElement('div');
    postElement.className = 'post-background';
    postElement.innerHTML = `
      <h2 class="post-title"><a href="${correctedPath}">${post.PostTitle}</a></h2>
      <div class="post-info">
        <div class="tags">Tags: ${tagsLinks}</div>
        <p class="post-date">Date: ${post.PostDate}</p>
      </div>
    `;

    postListElement.appendChild(postElement);
  }

  currentDisplayIndex += numberToShow;
}

function setupViewMoreButton() {
  const button = document.getElementById('viewMoreButton');
  button.addEventListener('click', () => {
    displayNextBatch(LOAD_MORE_SIZE);
    toggleViewMoreButton();
  });
}

function toggleViewMoreButton() {
  const button = document.getElementById('viewMoreButton');
  if (currentDisplayIndex >= allSortedPosts.length) {
    button.style.display = 'none';
  } else {
    button.style.display = 'block';
  }
}

function fetchAndDisplayTags() {
  fetch('/Thoughts/POSTLIST.json')
    .then(response => {
      if (!response.ok) throw new Error('Network response was not ok');
      return response.json();
    })
    .then(posts => {
      const allTags = new Set();
      posts.forEach(post => post.PostTags.forEach(tag => allTags.add(tag)));
      const tagListElement = document.getElementById('tagList');
      tagListElement.innerHTML = '';

      const tagsArray = Array.from(allTags);

      tagsArray.forEach((tag, index) => {
        const tagBadge = document.createElement('span');
        tagBadge.className = 'post-tag';

        const link = document.createElement('a');
        link.href = `/Thoughts/Tag${tag}.html`;
        link.textContent = tag;
        link.className = 'tag-link';

        tagBadge.appendChild(link);
        tagListElement.appendChild(tagBadge);

        if (index < tagsArray.length - 1) {
          tagListElement.appendChild(document.createTextNode(', '));
        }
      });
    })
    .catch(error => {
      console.error('There was a problem with the fetch operation:', error);
    });
}

document.addEventListener('DOMContentLoaded', () => {
  fetchAndDisplayPosts();
  fetchAndDisplayTags();
  setupViewMoreButton();
});
