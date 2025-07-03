(async function() {
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
})();