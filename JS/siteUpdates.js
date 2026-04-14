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

  function renderSpan(span) {
    const parts = (span.text || '').split('\n');
    const frag = document.createDocumentFragment();
    parts.forEach((part, i) => {
      if (i > 0) frag.appendChild(document.createElement('br'));
      if (!part) return;
      let node = document.createTextNode(part);
      if (span.code) {
        const el = document.createElement('code');
        el.appendChild(node);
        node = el;
      }
      if (span.italic) {
        const el = document.createElement('em');
        el.appendChild(node);
        node = el;
      }
      if (span.bold) {
        const el = document.createElement('strong');
        el.appendChild(node);
        node = el;
      }
      if (span.underline) {
        const el = document.createElement('u');
        el.appendChild(node);
        node = el;
      }
      if (span.strike) {
        const el = document.createElement('s');
        el.appendChild(node);
        node = el;
      }
      if (span.link) {
        const a = document.createElement('a');
        a.href = span.link;
        a.target = '_blank';
        a.rel = 'noopener noreferrer';
        a.appendChild(node);
        node = a;
      }
      frag.appendChild(node);
    });
    return frag;
  }

  function renderBlock(block) {
    switch (block.type) {
      case 'heading': {
        const level = Math.min(Math.max(block.level || 2, 1), 6);
        const el = document.createElement('h' + level);
        (block.spans || []).forEach(s => el.appendChild(renderSpan(s)));
        return el;
      }
      case 'quote': {
        const el = document.createElement('blockquote');
        (block.spans || []).forEach(s => el.appendChild(renderSpan(s)));
        return el;
      }
      case 'image': {
        const el = document.createElement('img');
        el.src = block.src || '';
        if (block.alt) el.alt = block.alt;
        return el;
      }
      case 'list': {
        const el = document.createElement(block.ordered ? 'ol' : 'ul');
        (block.items || []).forEach(item => {
          const li = document.createElement('li');
          (item.spans || []).forEach(s => li.appendChild(renderSpan(s)));
          el.appendChild(li);
        });
        return el;
      }
      case 'paragraph':
      default: {
        const el = document.createElement('p');
        (block.spans || []).forEach(s => el.appendChild(renderSpan(s)));
        return el;
      }
    }
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
    doc.posts.forEach(p => {
      const post = document.createElement('div');
      post.className = 'post newsPost';

      const dt = document.createElement('div');
      dt.className = 'postDateContainer';
      const d = new Date(p.date);
      const dateEl = document.createElement('p');
      dateEl.className = 'postDate';
      dateEl.textContent = d.toLocaleDateString();
      const timeEl = document.createElement('p');
      timeEl.className = 'postTime';
      timeEl.textContent = d.toLocaleTimeString();
      dt.append(dateEl, timeEl);

      const bodyEl = document.createElement('div');
      bodyEl.className = 'postBody';
      p.blocks.forEach(block => bodyEl.appendChild(renderBlock(block)));

      post.append(bodyEl, dt);
      container.append(post);
    });
  }

  loadUpdates();
  loadNews();
})();