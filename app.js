// ===== CONFIG =====
const GITHUB_OWNER = 'lucifermornngstar52-cell';

const GITHUB_REPOS = [
  'lucifermornngstar52-cell/aika-assistant'
];
const ADMIN_PASSWORD = 'hikari2026';

const DEFAULT_PROJECTS = [
  {
    id: 'default_aika',
    name: 'Aika Assistant',
    desc: 'AI-компаньон для Android с Live2D-аватаром: оверлей поверх любых приложений, живой голосовой диалог, чтение экрана и управление телефоном (запуск приложений, сообщения в WhatsApp и Telegram, поиск в интернете), реакции на открываемые приложения, помощь в играх, самообучение и собственный характер с эмоциями.',
    category: 'app',
    icon: 'img/aika_icon.png',
    repo: 'lucifermornngstar52-cell/aika-assistant',
    version: 'build-1311',
    url: 'https://github.com/lucifermornngstar52-cell/aika-assistant/releases/download/build-1311/aika-assistant-build-1311.apk',
    date: '2026-08-13T00:00:00Z',
    downloads: 0,
    shots: [],
    auto: false,
    platforms: ['android']
  },
  {
    id: 'default_airi',
    name: 'AIRI Assistant',
    desc: 'AI-ассистент на Flutter с двумя персонажами: милая AIRI и J.A.R.V.I.S. в стиле Iron Man. Live2D модели в чате, определение эмоций через камеру, голосовое управление, память о пользователе, дневник настроения, поиск в интернете, запуск приложений, напоминания, погода, конвертер валют. Android APK + Windows EXE.',
    category: 'app',
    icon: '🌙',
    repo: 'lucifermornngstar52-cell/airi-assistant',
    version: 'v1.1.0',
    url: '',
    date: '2026-08-14T00:00:00Z',
    downloads: 0,
    shots: [],
    auto: false,
    platforms: ['android', 'windows']
  },
];

// ===== STATE =====
let projects = [];
let currentFilter = 'all';
let isAdmin = false;
let githubToken = null;

// ===== INIT =====
document.addEventListener('DOMContentLoaded', () => {
  loadProjects();
  setupNavFilters();
});

function setupNavFilters() {
  document.querySelectorAll('.nav-link').forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
      link.classList.add('active');
      currentFilter = link.dataset.filter;
      renderProjects();
    });
  });
}

// ===== ADMIN TABS =====
function switchTab(tab) {
  document.querySelectorAll('.admin-tab-row .admin-tab').forEach(t => t.classList.remove('active'));
  event.target.classList.add('active');
  document.getElementById('tabPass').style.display = tab === 'pass' ? 'block' : 'none';
  document.getElementById('tabToken').style.display = tab === 'token' ? 'block' : 'none';
}

function adminSection(sec) {
  document.querySelectorAll('.admin-tabs .admin-tab').forEach(t => t.classList.remove('active'));
  event.target.classList.add('active');
  document.getElementById('secProjects').style.display = sec === 'projects' ? 'block' : 'none';
  document.getElementById('secKeys').style.display = sec === 'keys' ? 'block' : 'none';
  if (sec === 'keys') renderKeys();
}

function toggleAdmin() {
  const panel = document.getElementById('adminPanel');
  panel.style.display = panel.style.display === 'none' ? 'flex' : 'none';
}

// ===== ADMIN LOGIN =====
function adminLogin() {
  const pass = document.getElementById('adminPass').value;
  if (pass === ADMIN_PASSWORD) {
    isAdmin = true;
    document.getElementById('adminLogin').style.display = 'none';
    document.getElementById('adminContent').style.display = 'block';
    renderAdminProjects();
  } else {
    document.getElementById('adminHint').textContent = '❌ Неверный пароль';
  }
}

function loginWithToken() {
  const token = document.getElementById('githubToken').value.trim();
  if (!token) return;
  
  // Verify token by fetching user info
  fetch('https://api.github.com/user', {
    headers: { 'Authorization': 'token ' + token }
  })
    .then(r => r.json())
    .then(data => {
      if (data.login) {
        githubToken = token;
        sessionStorage.setItem('gh_token', token);
        isAdmin = true;
        document.getElementById('adminLogin').style.display = 'none';
        document.getElementById('adminContent').style.display = 'block';
        renderAdminProjects();
        document.getElementById('adminHint').textContent = '✅ Вошли как ' + data.login;
      } else {
        document.getElementById('adminHint').textContent = '❌ Неверный токен';
      }
    })
    .catch(() => {
      document.getElementById('adminHint').textContent = '❌ Ошибка соединения';
    });
}

// ===== LOAD PROJECTS =====
async function loadProjects() {
  const custom = JSON.parse(localStorage.getItem('hikari_projects') || '[]');
  projects = [...DEFAULT_PROJECTS, ...custom];

  for (const repo of GITHUB_REPOS) {
    try {
      const releases = await fetchGitHubReleases(repo);
      for (const rel of releases) {
        const assets = rel.assets || [];
        const apk = assets.find(a => a.name.endsWith('.apk'));
        const exe = assets.find(a => a.name.endsWith('.exe'));
        const zip = assets.find(a => a.name.endsWith('.zip'));
        const primaryAsset = apk || exe || zip || assets[0];

        // Check if we have a custom project for this repo
        const existing = projects.find(p => p.repo === repo && !p.auto);

        if (existing) {
          if (primaryAsset && !existing.url) existing.url = primaryAsset.browser_download_url;
          if (rel.tag_name) existing.version = rel.tag_name;
          existing.downloads = (existing.downloads || 0) + assets.reduce((s, a) => s + a.download_count, 0);
          if (rel.published_at && (!existing.date || new Date(rel.published_at) > new Date(existing.date))) {
            existing.date = rel.published_at;
          }
          if (!existing.allAssets) existing.allAssets = [];
          const newAssets = assets.map(a => ({
            name: a.name,
            url: a.browser_download_url,
            size: a.size,
            downloads: a.download_count
          }));
          for (const na of newAssets) {
            if (!existing.allAssets.find(a => a.name === na.name)) existing.allAssets.push(na);
          }
          if (!existing.platforms || existing.platforms.length === 0) {
            existing.platforms = detectPlatforms(assets);
          }
        } else {
          // Create new project from release
          const isGame = repo.includes('clock') || repo.includes('game');
          const existingCustom = custom.find(p => p.repo === repo);
          if (!existingCustom) {
            projects.push({
              id: 'gh_' + repo,
              name: formatRepoName(repo),
              desc: rel.body ? rel.body.substring(0, 200) : 'Релиз ' + rel.tag_name,
              category: isGame ? 'game' : 'app',
              icon: '📦',
              repo: repo,
              version: rel.tag_name || '—',
              url: primaryAsset ? primaryAsset.browser_download_url : rel.html_url,
              downloads: assets.reduce((s, a) => s + a.download_count, 0),
              date: rel.published_at,
              shots: [],
              auto: true,
              platforms: detectPlatforms(assets),
              allAssets: assets.map(a => ({
                name: a.name,
                url: a.browser_download_url,
                size: a.size,
                downloads: a.download_count
              }))
            });
          }
        }
      }
    } catch (e) {
      console.log('GitHub API error for', repo, e);
    }
  }

  projects.sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));
  renderProjects();
  updateStats();
}

function detectPlatforms(assets) {
  const platforms = [];
  if (assets.some(a => a.name.endsWith('.apk'))) platforms.push('android');
  if (assets.some(a => a.name.endsWith('.exe'))) platforms.push('windows');
  if (assets.some(a => a.name.endsWith('.zip'))) platforms.push('pwa');
  if (assets.some(a => a.name.endsWith('.ipa'))) platforms.push('ios');
  if (assets.some(a => a.name.endsWith('.dmg'))) platforms.push('macos');
  return platforms.length ? platforms : ['other'];
}

async function fetchGitHubReleases(repo) {
  const url = `https://api.github.com/repos/${repo}/releases?per_page=10`;
  const resp = await fetch(url);
  if (!resp.ok) throw new Error('GitHub API: ' + resp.status);
  return resp.json();
}

function formatRepoName(repo) {
  const name = repo.split('/')[1] || repo;
  return name.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

// ===== RENDER =====
function renderProjects() {
  const grid = document.getElementById('projectsGrid');
  if (projects.length === 0) {
    grid.innerHTML = `<div class="empty-state"><div class="emoji">📂</div><p>Пока нет проектов</p></div>`;
    return;
  }

  const filtered = currentFilter === 'all' ? projects : projects.filter(p => p.category === currentFilter);

  if (filtered.length === 0) {
    grid.innerHTML = `<div class="empty-state"><div class="emoji">🔍</div><p>Нет проектов в этой категории</p></div>`;
    return;
  }

  grid.innerHTML = filtered.map(p => {
    const iconHtml = p.icon && (p.icon.startsWith('http') || p.icon.match(/\.(png|jpg|jpeg|webp|gif|svg)/i))
      ? `<img src="${p.icon}" alt="${p.name}">`
      : p.icon || '📦';

    const platformIcons = (p.platforms || []).map(pl => {
      const icons = { android: '🤖', windows: '🪟', web: '🌐', pwa: '📱', ios: '🍎', macos: '💻', other: '📦' };
      return icons[pl] || '📦';
    }).join(' ');

    return `
      <div class="project-card" onclick="openModal('${p.id}')">
        <div class="card-banner">${iconHtml}
          ${p.downloads ? `<span class="card-badge">⬇ ${p.downloads}</span>` : ''}
        </div>
        <div class="card-body">
          <div class="card-title">${p.name}</div>
          <div class="card-desc">${p.desc}</div>
          <div class="card-footer">
            <span class="card-version">${platformIcons} ${p.version || '—'}</span>
          </div>
        </div>
      </div>`;
  }).join('');
}

function updateStats() {
  document.getElementById('statApps').textContent = projects.length;
  const totalDl = projects.reduce((s, p) => s + (p.downloads || 0), 0);
  document.getElementById('statDownloads').textContent = totalDl > 1000 ? (totalDl / 1000).toFixed(1) + 'k' : totalDl;
  if (projects.length > 0) {
    document.getElementById('statLatest').textContent = projects[0].version || '—';
  }
}

// ===== MODAL =====
function openModal(id) {
  const p = projects.find(x => x.id === id);
  if (!p) return;

  const iconHtml = p.icon && (p.icon.startsWith('http') || p.icon.match(/\.(png|jpg|jpeg|webp|gif|svg)/i))
    ? `<img src="${p.icon}" alt="${p.name}">`
    : p.icon || '📦';

  const shotsHtml = p.shots && p.shots.length
    ? `<div class="modal-shots">${p.shots.map(s => `<img src="${s}" alt="screenshot">`).join('')}</div>`
    : '';

  const platformIcons = (p.platforms || []).map(pl => {
    const icons = { android: '🤖 Android', windows: '🪟 Windows', web: '🌐 Web', pwa: '📱 PWA', ios: '🍎 iOS', macos: '💻 macOS', other: '📦' };
    return `<span class="meta-item">${icons[pl] || '📦'}</span>`;
  }).join('');

  const metaHtml = `
    <div class="modal-meta">
      <span class="meta-item">📅 ${p.date ? new Date(p.date).toLocaleDateString('ru') : '—'}</span>
      <span class="meta-item">⬇ ${p.downloads || 0} загрузок</span>
      ${platformIcons}
    </div>`;

  const isMultiAsset = p.allAssets && p.allAssets.length > 1;
  const hasFiles = isMultiAsset || !!p.url;
  window._modalDlBtn = isMultiAsset
    ? `<div class="modal-assets">${p.allAssets.map(a => {
        const icon = a.name.endsWith('.apk') ? '🤖' : a.name.endsWith('.exe') ? '🪟' : a.name.endsWith('.zip') ? '📦' : '📄';
        const sizeMb = a.size ? (a.size / 1024 / 1024).toFixed(1) : '?';
        return `<a href="${a.url}" download class="btn-asset"><span>${icon} ${a.name}</span><small>${sizeMb} MB · ⬇ ${a.downloads}</small></a>`;
      }).join('')}</div>`
    : `<a href="${p.url}" download class="btn-primary">⬇ Скачать</a>`;
  window._modalProject = p;
  const paid = localStorage.getItem('hkm_paid');
  const actionsHtml = !hasFiles
    ? `<button class="btn-primary" disabled>Файл недоступен</button>`
    : paid
      ? window._modalDlBtn
      : `<button class="btn-primary" onclick="showPaymentStep()">💳 Купить за 1 000 ₸</button>`;

  document.getElementById('modalContent').innerHTML = `
    <div class="modal-icon">${iconHtml}</div>
    <h2>${p.name}</h2>
    <p class="modal-version">${p.version || '—'}</p>
    ${metaHtml}
    <p class="modal-desc">${p.desc}</p>
    ${shotsHtml}
    <div class="modal-actions" id="modalActions">
      ${actionsHtml}
    </div>
  `;

  document.getElementById('modalOverlay').classList.add('active');
}

function closeModal(event) {
  if (event && event.target !== event.currentTarget) return;
  document.getElementById('modalOverlay').classList.remove('active');
}

// ===== ADMIN: PROJECTS =====
function addProject() {
  const name = document.getElementById('projName').value.trim();
  if (!name) return alert('Введите название');

  const project = {
    id: 'custom_' + Date.now(),
    name: name,
    desc: document.getElementById('projDesc').value.trim() || 'Без описания',
    category: document.getElementById('projCategory').value,
    icon: document.getElementById('projIcon').value.trim() || '📦',
    repo: document.getElementById('projRepo').value.trim(),
    version: '—',
    url: '',
    date: new Date().toISOString(),
    downloads: 0,
    shots: document.getElementById('projShots').value.trim()
      ? document.getElementById('projShots').value.split(',').map(s => s.trim()).filter(Boolean)
      : [],
    platforms: document.getElementById('projPlatforms').value.trim()
      ? document.getElementById('projPlatforms').value.split(',').map(s => s.trim()).filter(Boolean)
      : [],
    auto: false
  };

  const custom = JSON.parse(localStorage.getItem('hikari_projects') || '[]');
  custom.push(project);
  localStorage.setItem('hikari_projects', JSON.stringify(custom));

  // Clear form
  ['projName', 'projDesc', 'projIcon', 'projRepo', 'projShots', 'projPlatforms'].forEach(id => {
    document.getElementById(id).value = '';
  });

  renderAdminProjects();
  loadProjects();
}

function deleteProject(id) {
  let custom = JSON.parse(localStorage.getItem('hikari_projects') || '[]');
  custom = custom.filter(p => p.id !== id);
  localStorage.setItem('hikari_projects', JSON.stringify(custom));
  renderAdminProjects();
  loadProjects();
}

function renderAdminProjects() {
  const list = document.getElementById('adminProjectList');
  const custom = JSON.parse(localStorage.getItem('hikari_projects') || '[]');

  if (custom.length === 0) {
    list.innerHTML = '<p class="admin-hint">Нет добавленных проектов</p>';
    return;
  }

  list.innerHTML = custom.map(p => `
    <div class="admin-project-item">
      <div>
        <div class="pi-name">${p.icon} ${p.name}</div>
        <div class="pi-cat">${p.category} · ${p.repo || 'без репо'}</div>
      </div>
      <button class="btn-delete" onclick="deleteProject('${p.id}')">Удалить</button>
    </div>
  `).join('');
}


// ===== PURCHASE: PAYMENT STEP =====
function showPaymentStep() {
  document.getElementById('modalActions').innerHTML = `
    <div style="width:100%;text-align:left;">
      <p style="color:var(--text2);font-size:13px;margin:0 0 12px;">Переведи <b style="color:var(--p);">1 000 ₸</b> на карту любым банком и нажми кнопку ниже:</p>
      <div style="display:flex;gap:10px;flex-wrap:wrap;margin-bottom:14px;">
        <div onclick="copyCard('kaspi')" style="flex:1;min-width:200px;cursor:pointer;background:var(--card,#161626);border:1px solid rgba(123,97,255,.3);border-radius:12px;padding:12px 14px;">
          <div style="font-weight:700;color:#fff;font-size:13px;">🟡 Kaspi Gold</div>
          <div style="color:var(--text2,#9a9ab0);font-size:14px;letter-spacing:1px;margin-top:4px;">4400 4300 6272 0914</div>
          <div style="font-size:10px;color:var(--text2,#9a9ab0);margin-top:4px;opacity:.7;">нажми, чтобы скопировать</div>
        </div>
        <div onclick="copyCard('freedom')" style="flex:1;min-width:200px;cursor:pointer;background:var(--card,#161626);border:1px solid rgba(123,97,255,.3);border-radius:12px;padding:12px 14px;">
          <div style="font-weight:700;color:#fff;font-size:13px;">🟢 Freedom Bank</div>
          <div style="color:var(--text2,#9a9ab0);font-size:14px;letter-spacing:1px;margin-top:4px;">4002 8900 5058 4816</div>
          <div style="font-size:10px;color:var(--text2,#9a9ab0);margin-top:4px;opacity:.7;">нажми, чтобы скопировать</div>
        </div>
      </div>
      <button class="btn-primary" style="width:100%;" onclick="showCodeEntry()">✅ Я оплатил — ввести код</button>
    </div>`;
}
function showCodeEntry() {
  document.getElementById('modalActions').innerHTML = `
    <div style="width:100%;text-align:left;">
      <p style="color:var(--text2,#9a9ab0);font-size:13px;margin:0 0 6px;">1️⃣ Отправь скриншот оплаты разработчику в Telegram: <a href="https://t.me/Unqry" target="_blank" style="color:var(--p,#7c3aed);font-weight:700;">@Unqry</a> → получишь <b style="color:var(--p,#7c3aed);">код доступа</b> для скачивания — введи его здесь:</p>
      <p style="color:var(--text2,#9a9ab0);font-size:12px;margin:0 0 10px;">2️⃣ Установив приложение, открой его: на экране активации появится ID устройства. Отправь его в @Unqry → получишь код активации приложения (привязан к твоему телефону).</p>
      <div style="display:flex;gap:10px;flex-wrap:wrap;">
        <input id="accessCodeInput" placeholder="HK-XXXXXX" style="flex:1;min-width:180px;background:var(--card,#161626);border:1px solid rgba(123,97,255,.3);border-radius:12px;padding:12px 14px;color:#fff;font-size:14px;letter-spacing:1px;" onkeypress="if(event.key==='Enter')activateKey()">
        <button class="btn-primary" onclick="activateKey()">🔓 Открыть доступ</button>
      </div>
      <p id="codeHint" style="color:var(--r,#f44);font-size:12px;margin:8px 0 0;display:none;"></p>
    </div>`;
}
async function activateKey() {
  const input = document.getElementById('accessCodeInput');
  const hint = document.getElementById('codeHint');
  const code = (input.value || '').trim().toUpperCase();
  if (!code) return;
  try {
    const resp = await fetch('keys.json?t=' + Date.now());
    const data = resp.ok ? await resp.json() : { keys: [] };
    const keys = (data.keys || []).map(k => String(k).toUpperCase());
    if (keys.includes(code)) {
      localStorage.setItem('hkm_paid', '1');
      document.getElementById('modalActions').innerHTML = window._modalDlBtn;
      notifyKeyActivation(code);
    } else {
      hint.style.display = 'block';
      hint.textContent = '❌ Неверный код. Дождись подтверждения оплаты.';
    }
  } catch (e) {
    hint.style.display = 'block';
    hint.textContent = '⚠️ Ошибка соединения, попробуй ещё раз.';
  }
}

// ===== ADMIN: ACCESS KEYS =====
async function fetchKeysFile() {
  const resp = await fetch('https://api.github.com/repos/lucifermornngstar52-cell/hikari-market/contents/keys.json', {
    headers: { 'Authorization': 'token ' + githubToken }
  });
  if (resp.status === 404) return { sha: null, keys: [] };
  if (!resp.ok) throw new Error('GitHub: ' + resp.status);
  const data = await resp.json();
  const content = data.content ? JSON.parse(atob(data.content.replace(/\n/g, ''))) : { keys: [] };
  return { sha: data.sha, keys: content.keys || [] };
}
async function saveKeysFile(keys, sha) {
  const content = btoa(JSON.stringify({ keys }, null, 2));
  const resp = await fetch('https://api.github.com/repos/lucifermornngstar52-cell/hikari-market/contents/keys.json', {
    method: 'PUT',
    headers: {
      'Authorization': 'token ' + githubToken,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      message: 'update: access keys',
      content: content,
      sha: sha || undefined
    })
  });
  if (!resp.ok) throw new Error('GitHub: ' + resp.status);
}
function genKey() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let k = '';
  for (let i = 0; i < 6; i++) k += chars[Math.floor(Math.random() * chars.length)];
  return 'HK-' + k;
}
async function renderKeys() {
  const list = document.getElementById('adminKeysList');
  const hint = document.getElementById('keysHint');
  if (!githubToken) {
    hint.textContent = '⚠️ Для работы с ключами войди через GitHub Token.';
    list.innerHTML = '';
    return;
  }
  try {
    const { keys } = await fetchKeysFile();
    list.innerHTML = keys.length
      ? keys.map(k => `<div style="display:flex;justify-content:space-between;align-items:center;background:var(--card,#161626);border:1px solid rgba(123,97,255,.2);border-radius:10px;padding:10px 14px;margin-bottom:8px;"><code style="color:#fff;font-size:15px;letter-spacing:1px;">${k}</code><button class="btn-secondary" style="padding:6px 12px;font-size:12px;" onclick="deleteKey('${k}')">🗑</button></div>`).join('')
      : '<p style="color:var(--text2,#9a9ab0);font-size:13px;">Ключей пока нет.</p>';
    hint.textContent = '';
  } catch (e) {
    hint.textContent = '⚠️ Не удалось загрузить ключи: ' + e.message;
  }
}
async function createKey() {
  const hint = document.getElementById('keysHint');
  if (!githubToken) {
    hint.textContent = '⚠️ Войди через GitHub Token, чтобы создавать ключи.';
    return;
  }
  try {
    hint.textContent = 'Создание ключа...';
    const { keys, sha } = await fetchKeysFile();
    const key = genKey();
    keys.push(key);
    await saveKeysFile(keys, sha);
    hint.textContent = '✅ Ключ создан: ' + key + ' — отправь его покупателю.';
    renderKeys();
  } catch (e) {
    hint.textContent = '❌ Ошибка: ' + e.message;
  }
}
async function deleteKey(k) {
  try {
    const { keys, sha } = await fetchKeysFile();
    const idx = keys.indexOf(k);
    if (idx !== -1) keys.splice(idx, 1);
    await saveKeysFile(keys, sha);
    renderKeys();
  } catch (e) {
    document.getElementById('keysHint').textContent = '❌ Ошибка: ' + e.message;
  }
}

// ===== PAYMENT: COPY CARD =====
function copyCard(bank) {
  const num = bank === 'kaspi' ? '4400430062720914' : '4002890050584816';
  navigator.clipboard.writeText(num).then(() => {
    toastCardCopied(bank);
  }).catch(() => {
    const ta = document.createElement('textarea');
    ta.value = num;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
    toastCardCopied(bank);
  });
}
function toastCardCopied(bank) {
  const label = bank === 'kaspi' ? 'Kaspi' : 'Freedom';
  const old = document.getElementById('copyToast');
  if (old) old.remove();
  const t = document.createElement('div');
  t.id = 'copyToast';
  t.textContent = '✅ Карта ' + label + ' скопирована';
  t.style.cssText = 'position:fixed;bottom:24px;left:50%;transform:translateX(-50%);background:var(--p);color:#fff;padding:12px 24px;border-radius:12px;font-size:14px;font-weight:600;z-index:9999;box-shadow:0 8px 24px rgba(123,97,255,.4);';
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 2500);
}

// ===== NOTIFY OWNER: key activated (ntfy push) =====
function notifyKeyActivation(code) {
  try {
    fetch('https://ntfy.sh/hikari-keys-x7k2m9v4q8', {
      method: 'POST',
      body: '🔑 Ключ ' + code + ' активирован — удали его в админке, чтобы не слили'
    }).catch(() => {});
  } catch (e) {}
}


// ===== ADMIN: ACTIVATION CODE GENERATOR (app license, device-bound) =====
async function generateActivationCode() {
  const input = document.getElementById('devIdInput');
  const out = document.getElementById('activationCodeOut');
  const devId = (input.value || '').trim().toUpperCase().replace(/[^A-F0-9]/g, '');
  if (!devId || devId.length < 8) {
    out.textContent = 'Вставь ID устройства с экрана активации';
    out.style.color = '#f87171';
    return;
  }
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw', enc.encode('185f4581ecc7a95d842b149299b26cb00f145cdeb74fa652'),
    { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(devId));
  const hex = Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, '0')).join('');
  const code = 'AK-' + hex.substring(0, 6).toUpperCase();
  out.textContent = code;
  out.style.color = '#fff';
  try { navigator.clipboard.writeText(code); } catch (e) {}
  const hist = JSON.parse(localStorage.getItem('hkm_ak_codes') || '[]');
  hist.unshift({ code, devId, date: new Date().toLocaleString('ru') });
  localStorage.setItem('hkm_ak_codes', JSON.stringify(hist.slice(0, 30)));
  renderAkHistory();
}
function renderAkHistory() {
  const hist = JSON.parse(localStorage.getItem('hkm_ak_codes') || '[]');
  document.getElementById('akHistory').innerHTML = hist.length
    ? hist.map(h => `<div style="display:flex;justify-content:space-between;background:var(--card,#161626);border:1px solid rgba(123,97,255,.2);border-radius:10px;padding:8px 12px;margin-bottom:6px;font-size:13px;"><code style="color:#fff;">${h.code}</code><span style="color:var(--text2,#9a9ab0);">ID ${h.devId.slice(0,8)}… · ${h.date}</span></div>`).join('')
    : '';
}
