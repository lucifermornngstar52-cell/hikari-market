// ===== CONFIG =====
const GITHUB_OWNER = 'lucifermornngstar52-cell';

const GITHUB_REPOS = [
  'lucifermornngstar52-cell/airi-assistant',
  'lucifermornngstar52-cell/aika-assistant'
];
const ADMIN_PASSWORD = 'hikari2026';

const DEFAULT_PROJECTS = [
  {
    id: 'default_aika',
    name: 'Aika Assistant',
    desc: 'AI-ассистент для Android с 3D-аватаром, голосовым управлением, доступом к экрану и автоматизацией задач. Live2D и 3D модели, оверлей поверх других приложений, реакции на приложения, самообучение.',
    category: 'app',
    icon: '🤖',
    repo: 'lucifermornngstar52-cell/aika-assistant',
    version: 'build-1310',
    url: 'https://github.com/lucifermornngstar52-cell/aika-assistant/releases/download/build-1310/aika-assistant-build1310.apk',
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
  document.getElementById('secUpload').style.display = sec === 'upload' ? 'block' : 'none';
  if (sec === 'upload') populateUploadRepos();
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
    populateUploadRepos();
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
        populateUploadRepos();
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

    const dlBtn = p.url
      ? `<button class="card-download" onclick="event.stopPropagation();downloadProject('${p.id}')">⬇ Скачать</button>`
      : `<button class="card-download" disabled>Скоро</button>`;

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
            ${dlBtn}
          </div>
        </div>
      </div>`;
  }).join('');
}

function downloadProject(id) {
  const p = projects.find(x => x.id === id);
  if (p && p.url) window.open(p.url, '_blank');
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

  let dlBtn;
  if (p.allAssets && p.allAssets.length > 1) {
    dlBtn = `<div class="modal-assets">${p.allAssets.map(a => {
      const icon = a.name.endsWith('.apk') ? '🤖' : a.name.endsWith('.exe') ? '🪟' : a.name.endsWith('.zip') ? '📦' : '📄';
      const sizeMb = a.size ? (a.size / 1024 / 1024).toFixed(1) : '?';
      return `<a href="${a.url}" download class="btn-asset"><span>${icon} ${a.name}</span><small>${sizeMb} MB · ⬇ ${a.downloads}</small></a>`;
    }).join('')}</div>`;
  } else if (p.url) {
    dlBtn = `<a href="${p.url}" download class="btn-primary">⬇ Скачать</a>`;
  } else {
    dlBtn = `<button class="btn-primary" disabled>Файл недоступен</button>`;
  }

  const githubBtn = p.repo ? `<a href="https://github.com/${p.repo}" target="_blank" class="btn-secondary">📂 GitHub</a>` : '';
  const isMultiAsset = p.allAssets && p.allAssets.length > 1;

  document.getElementById('modalContent').innerHTML = `
    <div class="modal-icon">${iconHtml}</div>
    <h2>${p.name}</h2>
    <p class="modal-version">${p.version || '—'}</p>
    ${metaHtml}
    <p class="modal-desc">${p.desc}</p>
    ${shotsHtml}
    ${isMultiAsset ? `<div class="modal-assets-section"><h4>Файлы для скачивания:</h4>${dlBtn}</div>` : ''}
    <div class="modal-actions">
      ${isMultiAsset ? githubBtn : dlBtn + githubBtn}
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

// ===== ADMIN: UPLOAD TO GITHUB RELEASE =====
function populateUploadRepos() {
  const select = document.getElementById('uploadRepo');
  select.innerHTML = '';

  // Add GitHub repos
  GITHUB_REPOS.forEach(repo => {
    const opt = document.createElement('option');
    opt.value = repo;
    opt.textContent = formatRepoName(repo);
    select.appendChild(opt);
  });

  // Add custom projects with repos
  const custom = JSON.parse(localStorage.getItem('hikari_projects') || '[]');
  custom.forEach(p => {
    if (p.repo && !GITHUB_REPOS.includes(p.repo)) {
      const opt = document.createElement('option');
      opt.value = p.repo;
      opt.textContent = p.name;
      select.appendChild(opt);
    }
  });
}

async function uploadToRelease() {
  const token = githubToken || sessionStorage.getItem('gh_token');
  if (!token) {
    alert('⚠️ Сначала войдите через GitHub Token для загрузки файлов!');
    switchTab('token');
    document.getElementById('adminContent').style.display = 'none';
    document.getElementById('adminLogin').style.display = 'block';
    return;
  }

  const repo = document.getElementById('uploadRepo').value;
  const tag = document.getElementById('uploadTag').value.trim();
  const title = document.getElementById('uploadTitle').value.trim();
  const body = document.getElementById('uploadBody').value.trim();
  const fileInput = document.getElementById('uploadFile');
  const file = fileInput.files[0];

  if (!repo || !tag) return alert('Заполните репозиторий и версию!');
  if (!file) return alert('Выберите файл для загрузки!');

  const progressDiv = document.getElementById('uploadProgress');
  const fill = document.getElementById('progressFill');
  const text = document.getElementById('progressText');
  progressDiv.style.display = 'block';
  fill.style.width = '5%';
  text.textContent = 'Создание релиза...';

  try {
    // Step 1: Create release
    fill.style.width = '10%';
    text.textContent = 'Создание релиза ' + tag + '...';

    const releaseResp = await fetch(`https://api.github.com/repos/${repo}/releases`, {
      method: 'POST',
      headers: {
        'Authorization': 'token ' + token,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        tag_name: tag,
        name: title || tag,
        body: body || '',
        draft: false,
        prerelease: false
      })
    });

    if (!releaseResp.ok) {
      const err = await releaseResp.json();
      throw new Error('Не удалось создать релиз: ' + (err.message || releaseResp.status));
    }

    const release = await releaseResp.json();
    const releaseId = release.id;
    const uploadUrl = release.upload_url.replace('{?name,label}', '');

    // Step 2: Upload file
    fill.style.width = '30%';
    text.textContent = 'Загрузка файла ' + file.name + ' (' + (file.size / 1024 / 1024).toFixed(1) + ' MB)...';

    // Use XMLHttpRequest for progress tracking
    await new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('POST', uploadUrl + '?name=' + encodeURIComponent(file.name));
      xhr.setRequestHeader('Authorization', 'token ' + token);
      xhr.setRequestHeader('Content-Type', file.type || 'application/octet-stream');

      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) {
          const pct = 30 + (e.loaded / e.total) * 65;
          fill.style.width = pct + '%';
          text.textContent = 'Загрузка... ' + Math.round(e.loaded / e.total * 100) + '% (' + (e.loaded / 1024 / 1024).toFixed(1) + ' / ' + (file.size / 1024 / 1024).toFixed(1) + ' MB)';
        }
      };

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) resolve();
        else reject(new Error('Загрузка не удалась: ' + xhr.status));
      };

      xhr.onerror = () => reject(new Error('Ошибка сети при загрузке'));
      xhr.send(file);
    });

    fill.style.width = '100%';
    text.textContent = '✅ Готово! Релиз ' + tag + ' создан, файл загружен!';

    // Clear form
    document.getElementById('uploadTag').value = '';
    document.getElementById('uploadTitle').value = '';
    document.getElementById('uploadBody').value = '';
    fileInput.value = '';

    // Reload projects
    setTimeout(() => {
      progressDiv.style.display = 'none';
      loadProjects();
    }, 3000);

  } catch (err) {
    text.textContent = '❌ ' + err.message;
    fill.style.width = '0%';
  }
}
