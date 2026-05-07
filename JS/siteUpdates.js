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
    const doc = await resp.json();
    const container = document.getElementById('news');
    container.innerHTML = '';
    const posts = (Array.isArray(doc) ? doc : (doc && Array.isArray(doc.posts) ? doc.posts : []))
      .filter(p => !p.deleted)
      .sort((a, b) => new Date(b.date) - new Date(a.date));

    const PAGE = 10;
    let rendered = 0;

    function renderPost(p) {
      const post = document.createElement('div');
      post.className = 'post newsPost' + (p.title ? '' : ' noTitle');

      const dt = document.createElement('div');
      dt.className = 'postDateContainer';
      const d = new Date(p.date);
      const dateEl = document.createElement('p');
      dateEl.className = 'postDate';
      dateEl.textContent = d.toLocaleDateString('en-US');
      const timeEl = document.createElement('p');
      timeEl.className = 'postTime';
      timeEl.textContent = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
      dt.append(dateEl, timeEl);

      const bodyEl = document.createElement('div');
      bodyEl.className = 'postBody';
      bodyEl.innerHTML = marked.parse((p.markdown || '').trim(), { breaks: true });

      if (p.title) {
        const wrap = document.createElement('div');
        wrap.className = 'postWrapper';
        const titleEl = document.createElement('p');
        titleEl.className = 'postTitle';
        titleEl.textContent = p.title;
        wrap.append(titleEl, dt);
        post.append(wrap, bodyEl);
      } else {
        post.append(dt, bodyEl);
      }

      container.append(post);
    }

    function loadMore() {
      const next = posts.slice(rendered, rendered + PAGE);
      next.forEach(renderPost);
      rendered += next.length;
    }

    loadMore();
    container.scrollTop = 0;

    container.addEventListener('scroll', () => {
      if (rendered >= posts.length) return;
      if (container.scrollTop + container.clientHeight >= container.scrollHeight - 50) {
        loadMore();
      }
    });
  }

  loadUpdates();
  loadNews();
})();