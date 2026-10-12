(() => {
  const list = document.querySelector('[data-news-list]');
  const status = document.querySelector('[data-news-status]');
  const toggle = document.querySelector('[data-news-toggle]');
  if (!list || !status || !toggle) return;

  function parseDate(value) {
    const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(value || '');
    if (!match) return null;
    const [, day, month, year] = match.map(Number);
    const date = new Date(year, month - 1, day, 12);
    if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) return null;
    return { date, iso: `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}` };
  }

  function parseNews(text) {
    return text.replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n').split(/^\s*---\s*$/m).map(block => {
      const item = {};
      let field = '';
      for (const line of block.split('\n')) {
        if (line.trimStart().startsWith('#')) continue;
        const match = /^(data|titolo|categoria|testo|link):\s*(.*)$/i.exec(line);
        if (match) {
          field = match[1].toLowerCase();
          item[field] = match[2];
        } else if (field === 'testo') {
          item.testo += `\n${line}`;
        }
      }
      for (const key of Object.keys(item)) item[key] = item[key].trim();
      const parsed = parseDate(item.data);
      return item.titolo && item.testo && parsed ? { ...item, ...parsed } : null;
    }).filter(Boolean).sort((a, b) => b.date - a.date);
  }

  function safeLink(value) {
    if (!value) return null;
    try {
      const url = new URL(value, document.baseURI);
      return ['https:', 'http:'].includes(url.protocol) && !url.username && !url.password ? url.href : null;
    } catch { return null; }
  }

  function newsCard(item) {
    const article = document.createElement('article');
    article.className = 'news-card';
    const heading = document.createElement('div');
    heading.className = 'news-card-heading';
    const meta = document.createElement('div');
    meta.className = 'news-meta';
    const category = document.createElement('span');
    category.textContent = item.categoria || 'Aggiornamenti';
    const time = document.createElement('time');
    time.dateTime = item.iso;
    time.textContent = new Intl.DateTimeFormat('it-IT', { day: 'numeric', month: 'long', year: 'numeric' }).format(item.date);
    meta.append(category, time);
    const title = document.createElement('h3');
    title.textContent = item.titolo;
    heading.append(meta, title);
    const copy = document.createElement('div');
    copy.className = 'news-card-copy';
    item.testo.split(/\n\s*\n/).filter(Boolean).forEach(text => {
      const paragraph = document.createElement('p');
      paragraph.textContent = text;
      copy.append(paragraph);
    });
    const href = safeLink(item.link);
    if (href) {
      const link = document.createElement('a');
      link.className = 'text-link';
      link.href = href;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      link.textContent = 'Approfondisci';
      const arrow = document.createElement('span');
      arrow.setAttribute('aria-hidden', 'true');
      arrow.textContent = '↗';
      link.append(arrow);
      copy.append(link);
    }
    article.append(heading, copy);
    return article;
  }

  async function loadNews() {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    try {
      const url = new URL('news.txt', document.baseURI);
      url.searchParams.set('v', String(Date.now()));
      const response = await fetch(url, { cache: 'no-store', signal: controller.signal });
      if (!response.ok) throw new Error('News unavailable');
      const items = parseNews(await response.text());
      if (!items.length) {
        status.textContent = 'Le prossime novità saranno qui. Nel frattempo, possiamo parlare della tua attività.';
        return;
      }
      let expanded = false;
      function render() {
        const visible = expanded ? items : items.slice(0, 3);
        list.replaceChildren(...visible.map(newsCard));
        list.classList.toggle('single', visible.length === 1);
        toggle.textContent = expanded ? 'Mostra meno' : 'Mostra tutte le notizie';
        toggle.setAttribute('aria-expanded', String(expanded));
      }
      render();
      status.hidden = true;
      toggle.hidden = items.length <= 3;
      toggle.addEventListener('click', () => { expanded = !expanded; render(); });
    } catch {
      status.textContent = 'Per le ultime novità puoi seguirmi anche su LinkedIn.';
    } finally {
      clearTimeout(timeout);
      list.setAttribute('aria-busy', 'false');
    }
  }
  loadNews();
})();
