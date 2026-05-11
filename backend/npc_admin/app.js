function basePrefix() {
  const path = window.location.pathname;
  const idx = path.indexOf('/api/');
  return idx >= 0 ? path.slice(0, idx) : '';
}

function imageUrl(fileName) {
  return `${basePrefix()}/npcs/${fileName}`;
}

function npcApiUrl() {
  return `${basePrefix()}/api/npcs`;
}

async function load() {
  const statusEl = document.getElementById('status');
  const gridEl = document.getElementById('grid');

  try {
    const res = await fetch(npcApiUrl(), { credentials: 'include' });
    if (!res.ok) {
      throw new Error(`Request failed (${res.status})`);
    }

    const data = await res.json();
    const npcs = Array.isArray(data.npcs) ? data.npcs : [];
    statusEl.textContent = `${npcs.length} NPC entries`;
    gridEl.innerHTML = '';

    for (const npc of npcs) {
      const file = `${npc.npcId}.png`;
      const url = imageUrl(file);

      const card = document.createElement('article');
      card.className = 'card';
      card.innerHTML = `
        <a href="${url}" target="_blank" rel="noreferrer" title="Open full image">
          <img class="thumb" src="${url}" alt="${npc.name || npc.npcId}" width="128" height="128" loading="lazy" />
        </a>
        <div class="meta">
          <p class="id">${npc.npcId}</p>
          <h2 class="name">${npc.name || npc.npcId}</h2>
          <p class="look">${npc.look || 'No look text found in YAML.'}</p>
          <a href="${url}" target="_blank" rel="noreferrer">${file}</a>
        </div>
      `;
      gridEl.appendChild(card);
    }
  } catch (err) {
    statusEl.textContent = err instanceof Error ? err.message : 'Request failed';
  }
}

load();
