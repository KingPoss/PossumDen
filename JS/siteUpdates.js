(async function() {
  async function loadUpdates() {
    const resp = await fetch('updates.json');
    if (!resp.ok) {
      console.error('Failed to load updates.json');
      return;
    }
    const updates = await resp.json();
    const container = document.getElementById('updates');
    container.innerHTML = '';
    updates.forEach(u => {
      const post = document.createElement('div');
      post.className = 'post';
      const wrap = document.createElement('div');
      wrap.className = 'postWrapper';
      const titleEl = document.createElement('p');
      titleEl.className = 'postTitle';
      titleEl.textContent = u.title;
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
      const bodyEl = document.createElement('p');
      bodyEl.className = 'postBody';
      bodyEl.innerHTML = u.message.trim();
      post.append(wrap, bodyEl);
      container.append(post);
    });
  }

  async function loadNews() {
    const resp = await fetch('news.json');
    if (!resp.ok) {
      console.error('Failed to load news.json');
      return;
    }
    const news = await resp.json();
    const container = document.getElementById('news');
    container.innerHTML = '';
    news.forEach(n => {
      const post = document.createElement('div');
      post.className = 'post';
      const wrap = document.createElement('div');
      wrap.className = 'postWrapper';
      const titleEl = document.createElement('p');
      titleEl.className = 'postTitle';
      titleEl.textContent = n.title;
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
      const bodyEl = document.createElement('p');
      bodyEl.className = 'postBody';
      bodyEl.innerHTML = n.message.trim();
      post.append(wrap, bodyEl);
      container.append(post);
    });
  }

  loadUpdates();
  loadNews();
})();