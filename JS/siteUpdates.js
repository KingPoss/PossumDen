(async function() {
  // Load and display updates
  async function loadUpdates() {
    const resp = await fetch('updates.json');
    if (!resp.ok) {
      console.error('Failed to load updates.json');
      return;
    }
    const updates = await resp.json();
    const container = document.getElementById('updates');
    container.innerHTML = '';  // clear any placeholder
    updates.forEach(u => {
      // .post wrapper
      const post = document.createElement('div');
      post.className = 'post';
      // Title and date/time wrapper
      const wrap = document.createElement('div');
      wrap.className = 'postWrapper';
      // Title
      const titleEl = document.createElement('p');
      titleEl.className = 'postTitle';
      titleEl.textContent = u.title;
      // Date/time container (stacked on right)
      const dt = document.createElement('div');
      dt.className = 'postDateContainer';
      const dateEl = document.createElement('p');
      dateEl.className = 'postDate';
      dateEl.textContent = u.date;
      const timeEl = document.createElement('p');
      timeEl.className = 'postTime';
      timeEl.textContent = u.time;
      dt.append(dateEl, timeEl);
      wrap.append(titleEl, dt);
      // Body = commit message
      const bodyEl = document.createElement('p');
      bodyEl.className = 'postBody';
      bodyEl.textContent = u.message.trim();
      post.append(wrap, bodyEl);
      container.append(post);
    });
  }

  // Load and display news
  async function loadNews() {
    const resp = await fetch('news.json');
    if (!resp.ok) {
      console.error('Failed to load news.json');
      return;
    }
    const news = await resp.json();
    const container = document.getElementById('news');
    container.innerHTML = '';  // clear any placeholder
    news.forEach(n => {
      // .post wrapper
      const post = document.createElement('div');
      post.className = 'post';
      // Title and date/time wrapper
      const wrap = document.createElement('div');
      wrap.className = 'postWrapper';
      // Title
      const titleEl = document.createElement('p');
      titleEl.className = 'postTitle';
      titleEl.textContent = n.title;
      // Date/time container (stacked on right)
      const dt = document.createElement('div');
      dt.className = 'postDateContainer';
      const dateEl = document.createElement('p');
      dateEl.className = 'postDate';
      dateEl.textContent = n.date;
      const timeEl = document.createElement('p');
      timeEl.className = 'postTime';
      timeEl.textContent = n.time;
      dt.append(dateEl, timeEl);
      wrap.append(titleEl, dt);
      // Body = news message
      const bodyEl = document.createElement('p');
      bodyEl.className = 'postBody';
      bodyEl.textContent = n.message.trim();
      post.append(wrap, bodyEl);
      container.append(post);
    });
  }

  // Load both
  loadUpdates();
  loadNews();
})();