// ======= STATE =======
let state = {
  user: null,        // { name, email }
  workspaces: [],    // [{ id, name, lists, members }]
  currentWsId: null,
  editingTask: null, // { listIdx, taskIdx } or null
  editingListIdx: null,
};

// ======= LOAD/SAVE =======
function saveState() {
  localStorage.setItem('tidytable', JSON.stringify(state));
}
function loadState() {
  const s = localStorage.getItem('tidytable');
  if (s) state = JSON.parse(s);
}

// ======= INIT =======
loadState();
if (state.user) {
  goToDashboard();
} else {
  showPage('page-landing');
}

// ======= PAGE NAVIGATION =======
function showPage(id) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  const pg = document.getElementById(id);
  if (pg) {
    pg.classList.add('active');
    if (id === 'page-dashboard') renderDashboard();
    if (id === 'page-settings') renderSettings();
    if (id === 'page-workspace') renderWorkspace();
  }
}

// ======= LANDING =======
function landingSignup() {
  const email = document.getElementById('landing-email').value.trim();
  if (email) { document.getElementById('signup-email').value = email; }
  showPage('page-signup');
}

// ======= AUTH =======
function doLogin() {
  const email = document.getElementById('login-email').value.trim();
  const pass = document.getElementById('login-pass').value;
  if (!email || !pass) { showToast('Isi email dan password!'); return; }
  // Check stored users
  const users = JSON.parse(localStorage.getItem('tt-users') || '[]');
  const found = users.find(u => u.email === email && u.pass === pass);
  if (found) {
    state.user = { name: found.name, email: found.email };
    saveState();
    goToDashboard();
  } else {
    // Allow any login for prototype
    state.user = { name: email.split('@')[0], email };
    saveState();
    goToDashboard();
  }
}

function doSignup() {
  const name = document.getElementById('signup-name').value.trim();
  const email = document.getElementById('signup-email').value.trim();
  const pass = document.getElementById('signup-pass').value;
  const pass2 = document.getElementById('signup-pass2').value;
  if (!name || !email || !pass) { showToast('Lengkapi semua field!'); return; }
  if (pass !== pass2) { showToast('Password tidak cocok!'); return; }
  const users = JSON.parse(localStorage.getItem('tt-users') || '[]');
  users.push({ name, email, pass });
  localStorage.setItem('tt-users', JSON.stringify(users));
  state.user = { name, email };
  saveState();
  showToast('Akun berhasil dibuat!');
  goToDashboard();
}

function doLogout() {
  state.user = null;
  state.currentWsId = null;
  saveState();
  showPage('page-landing');
}

function goToDashboard() {
  updateSidebars();
  showPage('page-dashboard');
}

// ======= SIDEBAR =======
function updateSidebars() {
  if (!state.user) return;
  const initial = (state.user.name || 'U')[0].toUpperCase();
  const name = state.user.name || 'User';
  ['sidebar-avatar','ws-sidebar-avatar','set-sidebar-avatar','rpt-sidebar-avatar'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.textContent = initial;
  });
  ['sidebar-username','ws-sidebar-username','set-sidebar-username','rpt-sidebar-username'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.textContent = name;
  });
  renderSidebarWsList();
}

function renderSidebarWsList() {
  ['sidebar-ws-list','ws-sidebar-ws-list'].forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    el.innerHTML = state.workspaces.map((ws,i) =>
      `<div class="sidebar-ws-item" onclick="openWorkspace(${i})">${ws.name}</div>`
    ).join('');
  });
}

// ======= DASHBOARD =======
function renderDashboard() {
  updateSidebars();
  document.getElementById('dash-greeting').textContent = `Selamat Datang, ${state.user?.name || 'User'}!`;
  const myList = document.getElementById('my-ws-list');
  const teamList = document.getElementById('team-ws-list');
  if (state.workspaces.length === 0) {
    myList.innerHTML = '<span class="ws-list-empty">Belum ada workspace</span>';
    teamList.innerHTML = '<span class="ws-list-empty">Belum ada workspace tim</span>';
    return;
  }
  myList.innerHTML = state.workspaces.map((ws, i) => `
    <div class="ws-list-item" onclick="openWorkspace(${i})">
      <span>${ws.name}</span>
      <button class="ws-item-del" onclick="event.stopPropagation();deleteWorkspace(${i})">✕</button>
    </div>
  `).join('');
  // team workspaces = ones with >1 member
  const team = state.workspaces.filter(ws => ws.members && ws.members.length > 1);
  if (team.length === 0) {
    teamList.innerHTML = '<span class="ws-list-empty">Belum ada workspace tim</span>';
  } else {
    teamList.innerHTML = team.map((ws, i) => {
      const realIdx = state.workspaces.indexOf(ws);
      return `<div class="ws-list-item" onclick="openWorkspace(${realIdx})"><span>${ws.name}</span></div>`;
    }).join('');
  }
}

function openCreateWsModal() {
  document.getElementById('new-ws-name').value = '';
  openModal('modal-create-ws');
}

function createWorkspace() {
  const name = document.getElementById('new-ws-name').value.trim();
  if (!name) { showToast('Masukkan nama workspace!'); return; }
  state.workspaces.push({
    id: Date.now(),
    name,
    lists: [],
    members: [{ name: state.user.name, email: state.user.email, role: 'Admin' }]
  });
  saveState();
  closeModal('modal-create-ws');
  renderDashboard();
  showToast('Workspace berhasil dibuat!');
}

function deleteWorkspace(i) {
  if (!confirm(`Hapus workspace "${state.workspaces[i].name}"?`)) return;
  state.workspaces.splice(i, 1);
  saveState();
  renderDashboard();
  showToast('Workspace dihapus.');
}

// ======= WORKSPACE =======
function openWorkspace(idx) {
  state.currentWsId = idx;
  saveState();
  updateSidebars();
  renderWorkspace();
  showPage('page-workspace');
}

function openCurrentWs() {
  if (state.currentWsId !== null) openWorkspace(state.currentWsId);
}

function renderWorkspace() {
  const idx = state.currentWsId;
  if (idx === null || !state.workspaces[idx]) return;
  const ws = state.workspaces[idx];
  document.getElementById('current-ws-name').textContent = ws.name;

  const container = document.getElementById('lists-container');
  container.innerHTML = '';

  ws.lists.forEach((list, li) => {
    const card = document.createElement('div');
    card.className = 'list-card';
    card.innerHTML = `
      <div class="list-card-header">
        <h4>${list.name}</h4>
        <button class="list-del-btn" onclick="deleteList(${li})" title="Hapus list">✕</button>
      </div>
      <div id="tasks-${li}"></div>
      <button class="btn-add-task" onclick="openAddTaskModal(${li})">+ Buat Tugas Baru</button>
    `;
    container.appendChild(card);
    renderTasks(li);
  });

  const newListBtn = document.createElement('button');
  newListBtn.className = 'btn-new-list';
  newListBtn.textContent = '+ Buat List Baru';
  newListBtn.onclick = openNewListModal;
  container.appendChild(newListBtn);
}

function renderTasks(listIdx) {
  const ws = state.workspaces[state.currentWsId];
  const list = ws.lists[listIdx];
  const container = document.getElementById(`tasks-${listIdx}`);
  if (!container) return;
  if (!list.tasks || list.tasks.length === 0) {
    container.innerHTML = '';
    return;
  }
  container.innerHTML = list.tasks.map((task, ti) => `
    <div class="task-item ${task.done ? 'done' : ''}" id="task-${listIdx}-${ti}">
      <div class="task-check ${task.done ? 'checked' : ''}" onclick="toggleTask(${listIdx},${ti})"></div>
      <div class="task-body">
        <span class="task-title">${task.name}</span>
        ${task.start || task.deadline ? `<span class="task-meta">${task.start ? 'Mulai: '+task.start : ''} ${task.deadline ? '· Deadline: '+task.deadline : ''}</span>` : ''}
      </div>
      <div class="task-actions">
        <button class="task-btn" onclick="openEditTaskModal(${listIdx},${ti})" title="Edit">✏️</button>
        <button class="task-btn" onclick="deleteTask(${listIdx},${ti})" title="Hapus">🗑️</button>
      </div>
    </div>
  `).join('');
}

// Lists
function openNewListModal() {
  document.getElementById('new-list-name').value = '';
  openModal('modal-new-list');
}

function createList() {
  const name = document.getElementById('new-list-name').value.trim();
  if (!name) { showToast('Masukkan nama list!'); return; }
  const ws = state.workspaces[state.currentWsId];
  ws.lists.push({ name, tasks: [] });
  saveState();
  closeModal('modal-new-list');
  renderWorkspace();
  showToast('List berhasil dibuat!');
}

function deleteList(li) {
  if (!confirm('Hapus list ini beserta semua tugasnya?')) return;
  const ws = state.workspaces[state.currentWsId];
  ws.lists.splice(li, 1);
  saveState();
  renderWorkspace();
  showToast('List dihapus.');
}

// Tasks
function openAddTaskModal(listIdx) {
  state.editingListIdx = listIdx;
  state.editingTask = null;
  document.getElementById('modal-task-title').textContent = 'Buat Tugas Baru';
  document.getElementById('task-name').value = '';
  document.getElementById('task-start').value = '';
  document.getElementById('task-deadline').value = '';
  openModal('modal-task');
}

function openEditTaskModal(listIdx, taskIdx) {
  const ws = state.workspaces[state.currentWsId];
  const task = ws.lists[listIdx].tasks[taskIdx];
  state.editingListIdx = listIdx;
  state.editingTask = taskIdx;
  document.getElementById('modal-task-title').textContent = 'Edit Tugas';
  document.getElementById('task-name').value = task.name;
  document.getElementById('task-start').value = task.start || '';
  document.getElementById('task-deadline').value = task.deadline || '';
  openModal('modal-task');
}

function saveTask() {
  const name = document.getElementById('task-name').value.trim();
  if (!name) { showToast('Masukkan nama tugas!'); return; }
  const start = document.getElementById('task-start').value;
  const deadline = document.getElementById('task-deadline').value;
  const ws = state.workspaces[state.currentWsId];
  const li = state.editingListIdx;
  if (state.editingTask !== null) {
    ws.lists[li].tasks[state.editingTask] = { ...ws.lists[li].tasks[state.editingTask], name, start, deadline };
    showToast('Tugas diperbarui!');
  } else {
    ws.lists[li].tasks.push({ name, start, deadline, done: false, createdBy: state.user.name });
    showToast('Tugas ditambahkan!');
  }
  saveState();
  closeModal('modal-task');
  renderTasks(li);
}

function toggleTask(listIdx, taskIdx) {
  const ws = state.workspaces[state.currentWsId];
  ws.lists[listIdx].tasks[taskIdx].done = !ws.lists[listIdx].tasks[taskIdx].done;
  saveState();
  renderTasks(listIdx);
}

function deleteTask(listIdx, taskIdx) {
  const ws = state.workspaces[state.currentWsId];
  ws.lists[listIdx].tasks.splice(taskIdx, 1);
  saveState();
  renderTasks(listIdx);
  showToast('Tugas dihapus.');
}

// ======= SHARE =======
function openShareModal() {
  const idx = state.currentWsId;
  if (idx === null || !state.workspaces[idx]) {
    showToast('Buka workspace dulu ya!'); return;
  }
  renderShareList();
  openModal('modal-share');
}

function renderShareList() {
  const ws = state.workspaces[state.currentWsId];
  const el = document.getElementById('share-user-list');
  if (!ws.members || ws.members.length === 0) {
    el.innerHTML = '<span style="color:var(--gray-400);font-size:0.85rem">Belum ada anggota.</span>';
    return;
  }
  el.innerHTML = ws.members.map((m, i) => `
    <div class="share-user-item">
      <div class="avatar" style="width:28px;height:28px;font-size:0.75rem">${(m.name||'U')[0].toUpperCase()}</div>
      <span style="flex:1;font-size:0.85rem;font-weight:600">${m.name || m.email}</span>
      <span class="badge badge-${m.role.toLowerCase()}">${m.role}</span>
      ${i > 0 ? `<button onclick="removeMember(${i})" style="background:none;border:none;color:var(--danger);cursor:pointer;margin-left:6px;font-size:0.8rem">✕</button>` : ''}
    </div>
  `).join('');
}

function addSharedUser() {
  const email = document.getElementById('share-email-input').value.trim();
  const role = document.getElementById('share-role').value;
  if (!email) { showToast('Masukkan email!'); return; }
  const ws = state.workspaces[state.currentWsId];
  if (ws.members.find(m => m.email === email)) { showToast('User sudah ada!'); return; }
  ws.members.push({ name: email.split('@')[0], email, role });
  saveState();
  renderShareList();
  document.getElementById('share-email-input').value = '';
  showToast('User berhasil ditambahkan!');
}

function removeMember(i) {
  const ws = state.workspaces[state.currentWsId];
  ws.members.splice(i, 1);
  saveState();
  renderShareList();
}

// ======= SETTINGS =======
function renderSettings() {
  updateSidebars();
  if (state.user) {
    document.getElementById('set-username').value = state.user.name || '';
    document.getElementById('set-email').value = state.user.email || '';
    const initial = (state.user.name || 'U')[0].toUpperCase();
    document.getElementById('set-avatar-big').textContent = initial;
  }
}

function saveSettings() {
  const name = document.getElementById('set-username').value.trim();
  const email = document.getElementById('set-email').value.trim();
  if (!name || !email) { showToast('Isi username dan email!'); return; }
  state.user.name = name;
  state.user.email = email;
  saveState();
  updateSidebars();
  showToast('Pengaturan disimpan!');
}

function switchSettingsTab(el, tabId) {
  document.querySelectorAll('.settings-nav-item').forEach(i => i.classList.remove('active'));
  el.classList.add('active');
  ['tab-user','tab-tim','tab-app','tab-tema'].forEach(id => {
    document.getElementById(id).style.display = id === tabId ? '' : 'none';
  });
}

function setTheme(t) {
  showToast('Tema disimpan! Reload untuk melihat perubahan.');
  localStorage.setItem('tt-theme', t);
}

// ======= REPORT =======
function viewReport() {
  const idx = state.currentWsId;
  if (idx === null || !state.workspaces[idx]) { showToast('Buka workspace dulu!'); return; }
  const ws = state.workspaces[idx];
  document.getElementById('report-title').textContent = `Laporan Aktivitas ${ws.name}`;

  // Collect all tasks
  let todoTasks = [], doneTasks = [];
  ws.lists.forEach(list => {
    (list.tasks || []).forEach(task => {
      if (task.done) doneTasks.push({ ...task, listName: list.name });
      else todoTasks.push({ ...task, listName: list.name });
    });
  });

  const renderRptTask = t => `
    <div class="report-task-item">
      <strong>${t.name}</strong>
      <span>${t.listName}${t.start ? ' · Mulai: '+t.start : ''}${t.deadline ? ' · Deadline: '+t.deadline : ''}</span>
    </div>
  `;

  const todoCol = document.getElementById('report-todo-col');
  todoCol.innerHTML = '<h4>To Do</h4>' + (todoTasks.length ? todoTasks.map(renderRptTask).join('') : '<span style="font-size:0.82rem;color:var(--navy-light)">Tidak ada tugas</span>');

  const doneCol = document.getElementById('report-done-col');
  doneCol.innerHTML = '<h4>Done</h4>' + (doneTasks.length ? doneTasks.map(renderRptTask).join('') : '<span style="font-size:0.82rem;color:var(--navy-light)">Tidak ada tugas selesai</span>');

  const contribEl = document.getElementById('report-contributors-list');
  contribEl.innerHTML = (ws.members || []).map(m => `
    <div class="contributor-item">
      <div class="contributor-avatar">${(m.name||'U')[0].toUpperCase()}</div>
      <span class="contributor-name">${m.name || m.email}</span>
      <span class="badge badge-${m.role.toLowerCase()}">${m.role}</span>
    </div>
  `).join('') || '<span style="color:var(--gray-400);font-size:0.85rem">Tidak ada anggota.</span>';

  updateSidebars();
  showPage('page-report');
}

function exportPDF() {
  window.print();
}

// ======= MODAL HELPERS =======
function openModal(id) { document.getElementById(id).classList.add('open'); }
function closeModal(id) { document.getElementById(id).classList.remove('open'); }

// Close modal on overlay click
document.querySelectorAll('.modal-overlay').forEach(overlay => {
  overlay.addEventListener('click', e => { if (e.target === overlay) overlay.classList.remove('open'); });
});

// ======= TOAST =======
let toastTimer;
function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 2500);
}