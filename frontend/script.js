// ============================================
// ASCENDA GROUPS - ENTERPRISE SCRIPT v3
// ============================================

if (window.supabase && !window.supabaseClient) {
  window.supabaseClient = window.supabase.createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, storage: window.localStorage }
  });
}
const sb = window.supabaseClient;

let currentUser = null;
let currentProfile = null;
let isAdmin = false;

// ========== DOM READY ==========
document.addEventListener('DOMContentLoaded', async () => {
  initMobileNav();
  await restoreSession();
  await loadSiteSettings();
  loadAnnouncements();
  initPageLogic();
  setupLogoutHandler();
});

// ========== LOGOUT ==========
function setupLogoutHandler() {
  document.addEventListener('click', async (e) => {
    if (e.target.matches('.auth-logout-btn') || e.target.closest('.auth-logout-btn')) {
      e.preventDefault();
      await sb.auth.signOut();
      window.location.href = 'index.html';
    }
  });
}

async function logout() {
  await sb.auth.signOut();
  window.location.href = 'index.html';
}

// ========== MOBILE NAV (Right Sidebar - Half Screen) ==========
function initMobileNav() {
  const hamburger = document.getElementById('hamburger');
  const mobileNav = document.getElementById('mobileNav');
  if (!hamburger || !mobileNav) return;
  
  // Style the mobile nav - slides from right, half screen
  mobileNav.style.cssText = `
    position: fixed;
    top: 0;
    right: 0;
    width: 70%;
    max-width: 320px;
    height: 100vh;
    background: rgba(10, 15, 28, 0.98);
    backdrop-filter: blur(24px);
    -webkit-backdrop-filter: blur(24px);
    border-left: 1px solid #1e293b;
    z-index: 998;
    display: flex;
    flex-direction: column;
    padding: 80px 20px 40px;
    overflow-y: auto;
    transform: translateX(100%);
    transition: transform 0.35s cubic-bezier(0.4, 0, 0.2, 1);
    box-shadow: -10px 0 40px rgba(0,0,0,0.5);
  `;
  
  // Overlay background
  const overlay = document.createElement('div');
  overlay.id = 'nav-overlay';
  overlay.style.cssText = `
    position: fixed;
    top: 0; left: 0; right: 0; bottom: 0;
    background: rgba(0,0,0,0.5);
    z-index: 997;
    opacity: 0;
    pointer-events: none;
    transition: opacity 0.35s ease;
  `;
  document.body.appendChild(overlay);
  
  // Hamburger button
  hamburger.style.cssText = `
    display: none;
    flex-direction: column;
    gap: 5px;
    cursor: pointer;
    padding: 12px;
    z-index: 1000;
    background: none;
    border: none;
    border-radius: 8px;
  `;
  
  hamburger.querySelectorAll('span').forEach(s => {
    s.style.cssText = `
      display: block;
      width: 26px;
      height: 2.5px;
      background: #f1f5f9;
      border-radius: 2px;
      transition: all 0.3s ease;
    `;
  });
  
  // Style mobile nav links
  mobileNav.querySelectorAll('a').forEach(link => {
    link.style.cssText = `
      display: block;
      width: 100%;
      color: #f1f5f9;
      text-decoration: none;
      padding: 14px 18px;
      font-size: 1rem;
      font-weight: 500;
      border-radius: 10px;
      margin-bottom: 4px;
      background: rgba(26, 35, 50, 0.6);
      border: 1px solid transparent;
      transition: all 0.2s ease;
    `;
    link.addEventListener('mouseenter', () => {
      link.style.background = 'rgba(31, 42, 61, 0.8)';
      link.style.borderColor = '#3b82f6';
    });
    link.addEventListener('mouseleave', () => {
      link.style.background = 'rgba(26, 35, 50, 0.6)';
      link.style.borderColor = 'transparent';
    });
  });
  
  // Open menu
  function open() {
    hamburger.classList.add('active');
    mobileNav.style.transform = 'translateX(0)';
    overlay.style.opacity = '1';
    overlay.style.pointerEvents = 'all';
    document.body.style.overflow = 'hidden';
    
    const sp = hamburger.querySelectorAll('span');
    sp[0].style.transform = 'rotate(45deg) translate(5px, 6px)';
    sp[0].style.background = '#3b82f6';
    sp[1].style.opacity = '0';
    sp[2].style.transform = 'rotate(-45deg) translate(5px, -6px)';
    sp[2].style.background = '#3b82f6';
  }
  
  // Close menu
  function close() {
    hamburger.classList.remove('active');
    mobileNav.style.transform = 'translateX(100%)';
    overlay.style.opacity = '0';
    overlay.style.pointerEvents = 'none';
    document.body.style.overflow = '';
    
    const sp = hamburger.querySelectorAll('span');
    sp[0].style.transform = 'rotate(0)';
    sp[0].style.background = '#f1f5f9';
    sp[1].style.opacity = '1';
    sp[2].style.transform = 'rotate(0)';
    sp[2].style.background = '#f1f5f9';
  }
  
  // Events
  hamburger.addEventListener('click', (e) => {
    e.stopPropagation();
    hamburger.classList.contains('active') ? close() : open();
  });
  
  overlay.addEventListener('click', close);
  
  mobileNav.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', close);
  });
  
  // Responsive check
  function check() {
    if (window.innerWidth <= 768) {
      hamburger.style.display = 'flex';
    } else {
      hamburger.style.display = 'none';
      close();
    }
  }
  
  window.addEventListener('resize', check);
  check();
  
  // Close on Escape key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && hamburger.classList.contains('active')) {
      close();
    }
  });
}

// ========== SESSION ==========
async function restoreSession() {
  try {
    const { data: { session } } = await sb.auth.getSession();
    if (session?.user) {
      currentUser = session.user;
      const { data: profile } = await sb.from('profiles').select('*').eq('id', currentUser.id).single();
      if (!profile) {
        await sb.from('profiles').insert({ id: currentUser.id, role: 'user', full_name: currentUser.user_metadata?.full_name || currentUser.email, email: currentUser.email });
        currentProfile = { id: currentUser.id, role: 'user' };
      } else {
        currentProfile = profile;
      }
      isAdmin = currentProfile.role === 'admin' || currentProfile.role === 'ceo' || currentProfile.email === 'takeleeyakem@gmail.com';
      updateUIForLoggedIn();
      if (isAdmin) showAdminLink();
    } else {
      updateUIForLoggedOut();
    }
  } catch (err) { console.error('Session error:', err); updateUIForLoggedOut(); }
  
  sb.auth.onAuthStateChange(async (event) => {
    if (event === 'SIGNED_IN') window.location.reload();
    if (event === 'SIGNED_OUT') { currentUser = null; currentProfile = null; isAdmin = false; updateUIForLoggedOut(); }
  });
}

function showAdminLink() {
  if (document.querySelector('.admin-nav-link')) return;
  const link = document.createElement('a'); link.href = 'admin.html'; link.textContent = '⚡ Admin'; link.className = 'admin-nav-link'; link.style.cssText = 'color:#f59e0b!important;font-weight:700!important;';
  document.querySelector('.nav-links')?.appendChild(link);
  const mobileNav = document.getElementById('mobileNav');
  if (mobileNav) { const ml = link.cloneNode(true); ml.style.cssText = 'display:block;width:100%;color:#f59e0b!important;padding:16px 20px;font-size:1.1rem;font-weight:700;border-radius:12px;background:rgba(245,158,11,0.1);border:1px solid rgba(245,158,11,0.3);'; mobileNav.insertBefore(ml, mobileNav.firstChild); }
}

function updateUIForLoggedIn() {
  document.querySelectorAll('.auth-login-btn').forEach(e => e.style.display = 'none');
  document.querySelectorAll('.auth-register-btn').forEach(e => e.style.display = 'none');
  document.querySelectorAll('.auth-logout-btn').forEach(e => e.style.display = 'inline-flex');
  document.querySelectorAll('.auth-user-name').forEach(e => { e.textContent = currentProfile?.full_name || 'User'; e.style.display = 'inline'; });
}

function updateUIForLoggedOut() {
  document.querySelectorAll('.auth-login-btn').forEach(e => e.style.display = 'inline-flex');
  document.querySelectorAll('.auth-register-btn').forEach(e => e.style.display = 'inline-flex');
  document.querySelectorAll('.auth-logout-btn').forEach(e => e.style.display = 'none');
  document.querySelectorAll('.auth-user-name').forEach(e => e.style.display = 'none');
  document.querySelectorAll('.admin-nav-link').forEach(e => e.remove());
}

function showToast(msg, type = 'success') {
  const t = document.createElement('div'); t.style.cssText = `position:fixed;top:24px;right:24px;padding:16px 24px;background:#1a2332;border:1px solid ${type==='success'?'#10b981':'#ef4444'};border-radius:12px;color:white;z-index:9999;font-size:0.9rem;box-shadow:0 8px 30px rgba(0,0,0,0.6);`; t.textContent = (type === 'success' ? '✅ ' : '❌ ') + msg; document.body.appendChild(t); setTimeout(() => { t.style.opacity = '0'; t.style.transform = 'translateX(100%)'; t.style.transition = 'all 0.3s'; setTimeout(() => t.remove(), 300); }, 3000);
}

// ========== SITE SETTINGS ==========
async function loadSiteSettings() {
  const { data } = await sb.from('site_settings').select('*');
  if (data) data.forEach(s => { document.querySelectorAll(`[data-setting="${s.key}"]`).forEach(el => { if (el.tagName === 'IMG') el.src = s.value; else el.textContent = s.value; }); });
}

async function loadAnnouncements() {
  const { data } = await sb.from('announcements').select('*').eq('is_active', true).order('created_at', { ascending: false }).limit(3);
  const container = document.getElementById('announcements-bar');
  if (container && data?.length) { container.innerHTML = data.map(a => `<div style="padding:8px;color:${a.type==='urgent'?'#ef4444':a.type==='warning'?'#f59e0b':'#60a5fa'};">📢 ${a.message}</div>`).join(''); container.style.display = 'block'; }
}

// ========== API HELPERS ==========
async function fetchData(table, filter = {}) { let q = sb.from(table).select('*'); Object.entries(filter).forEach(([k, v]) => q = q.eq(k, v)); const { data } = await q.order('created_at', { ascending: false }); return data || []; }

// ========== PAGE LOGIC ==========
function initPageLogic() {
  const path = window.location.pathname;
  if (path.includes('index.html') || path === '/' || path.endsWith('/frontend/')) loadHomePage();
  else if (path.includes('about.html')) loadAboutPage();
  else if (path.includes('services.html')) loadServicesPage();
  else if (path.includes('marketplace.html')) loadMarketplacePage();
  else if (path.includes('jobs.html')) loadJobsPage();
  else if (path.includes('news.html')) loadNewsPage();
  else if (path.includes('contact.html')) initContactForm();
  else if (path.includes('profile.html')) loadProfilePage();
  else if (path.includes('dashboard.html')) loadDashboardPage();
  else if (path.includes('admin.html')) initAdminPanel();
  else if (path.includes('dept-admin.html')) initDeptAdmin();
}

// ========== HOME ==========
async function loadHomePage() {
  const [jobs, services, news, items] = await Promise.all([fetchData('jobs',{is_active:true}), fetchData('services',{is_active:true}), fetchData('news_posts',{is_published:true}), fetchData('marketplace_items',{is_active:true})]);
  renderSection('featured-jobs', jobs.slice(0,4), 'job');
  renderSection('featured-services', services.slice(0,4), 'service');
  renderSection('featured-news', news.slice(0,3), 'news');
  renderSection('featured-marketplace', items.slice(0,4), 'marketplace');
}

function renderSection(id, data, type) {
  const c = document.getElementById(id); if (!c) return;
  if (type === 'job') c.innerHTML = data.map(j => `<div class="card" onclick="window.location.href='jobs.html'"><span class="badge badge-blue">Job</span><h3>${j.title}</h3><p>${j.location||'Remote'}</p></div>`).join('') || '<p style="text-align:center;color:var(--text-muted);">No jobs yet</p>';
  if (type === 'service') c.innerHTML = data.map(s => `<div class="card" onclick="window.location.href='services.html'"><span class="badge badge-purple">Service</span><h3>${s.title}</h3><p>${(s.description||'').substring(0,80)}...</p></div>`).join('') || '<p style="text-align:center;color:var(--text-muted);">No services yet</p>';
  if (type === 'news') c.innerHTML = data.map(n => `<div class="card" onclick="window.location.href='news.html'"><span class="badge badge-gold">${n.type}</span><h3>${n.title}</h3></div>`).join('') || '<p>No news yet</p>';
  if (type === 'marketplace') c.innerHTML = data.map(i => `<div class="card" onclick="window.location.href='marketplace.html'"><span class="badge badge-green">${i.category}</span><h3>${i.title}</h3><p style="color:var(--green);">$${i.price}</p></div>`).join('') || '<p>No items yet</p>';
}

// ========== ABOUT ==========
async function loadAboutPage() {
  const [authority, workers, departments] = await Promise.all([fetchData('authority',{is_active:true}), sb.from('profiles').select('*').or('role.eq.worker,role.eq.dept_admin'), fetchData('departments',{is_active:true})]);
  const ac = document.getElementById('authority-ladder'); if (ac) ac.innerHTML = authority.sort((a,b)=>b.level-a.level).map(a=>`<div class="card"><h3>${a.title}</h3><p>Level ${a.level}</p></div>`).join('')||'<p>No authority set</p>';
  const dc = document.getElementById('departments-list'); if (dc) dc.innerHTML = departments.map(d=>`<div class="card"><h3>${d.name}</h3><p>${d.description||''}</p></div>`).join('')||'<p>No departments</p>';
  const wc = document.getElementById('workers-grid'); if (wc) wc.innerHTML = (workers.data||[]).map(w=>`<div class="card text-center"><img src="${w.avatar_url||'https://via.placeholder.com/100'}" style="width:80px;height:80px;border-radius:50%;margin:0 auto 12px;"><h3>${w.full_name}</h3><p>${w.position||'Worker'}</p></div>`).join('')||'<p>No workers</p>';
}

// ========== SERVICES PAGE (Frontend Display) ==========
async function loadServicesPage() {
  const { data: depts } = await sb.from('departments').select('id,name');
  const { data: services } = await sb.from('services').select('*').eq('is_active',true).order('created_at',{ascending:false});
  const c = document.getElementById('services-list');
  if (c) c.innerHTML = (services||[]).map(s => {
    const dept = depts?.find(d=>d.id===s.department_id);
    return `<div class="card" onclick="openServiceDetail('${s.id}')"><span class="badge badge-purple">Service</span><h3>${s.icon||'🔧'} ${s.title}</h3><p>${(s.description||'').substring(0,100)}...</p>${s.price?`<p style="color:var(--green);font-weight:700;">${s.price}</p>`:''}${dept?`<span style="font-size:0.75rem;color:var(--purple);">${dept.name}</span>`:''}</div>`;
  }).join('') || '<p style="text-align:center;">No services available.</p>';
}

// ========== MARKETPLACE ==========
async function loadMarketplacePage() { /* existing code */ }
async function loadJobsPage() { /* existing code */ }
async function loadNewsPage() { /* existing code */ }
function initContactForm() { /* existing code */ }
async function loadProfilePage() { /* existing code */ }

// ========== DASHBOARD ==========
async function loadDashboardPage() {
  if (!currentUser) { window.location.href = 'login.html'; return; }
  document.getElementById('dash-name').textContent = currentProfile?.full_name || 'User';
  document.getElementById('dash-role').textContent = currentProfile?.role?.toUpperCase() || 'USER';
  
  if (isAdmin) {
    document.getElementById('admin-quick-links').style.display = 'block';
    document.getElementById('dept-admin-link').style.display = 'block';
  }
  if (currentProfile?.role === 'dept_admin') {
    document.getElementById('dept-admin-link').style.display = 'block';
  }
  if (currentProfile?.role === 'agent') {
    document.getElementById('agent-panel').style.display = 'block';
    const { data: agent } = await sb.from('agents').select('*').eq('profile_id', currentUser.id).single();
    if (agent) {
      document.getElementById('agent-status').textContent = agent.status;
      document.getElementById('agent-rate').textContent = agent.commission_rate;
      document.getElementById('agent-earnings').textContent = agent.total_earnings || 0;
    }
  }
}

async function applyAsAgent() {
  if (!currentUser) { showToast('Login first', 'error'); return; }
  const { error } = await sb.from('applications').insert({ applicant_id: currentUser.id, type: 'agent', status: 'pending' });
  error ? showToast('Error', 'error') : showToast('Application submitted!');
}

// ========== ADMIN PANEL ==========
function initAdminPanel() {
  if (!isAdmin) { window.location.href = 'index.html'; return; }
  const tabs = ['users','departments','authority','jobs','services','marketplace','news','announcements','applications','messages','settings'];
  tabs.forEach(t => document.getElementById(`tab-${t}`)?.addEventListener('click', () => loadAdminTab(t)));
  loadAdminTab('users');
}

async function loadAdminTab(tab) {
  const content = document.getElementById('admin-content');
  content.innerHTML = '<div class="skeleton" style="height:200px;"></div>';
  let html = '';
  
  if (tab === 'users') {
    const { data } = await sb.from('profiles').select('*');
    html = `<div class="card"><h3>👥 Users</h3><table><thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Actions</th></tr></thead><tbody>${data.map(u=>`<tr><td>${u.full_name||''}</td><td>${u.email}</td><td>${u.role}</td><td><select onchange="updateRole('${u.id}',this.value)"><option ${u.role==='user'?'selected':''}>user</option><option ${u.role==='agent'?'selected':''}>agent</option><option ${u.role==='worker'?'selected':''}>worker</option><option ${u.role==='dept_admin'?'selected':''}>dept_admin</option><option ${u.role==='admin'?'selected':''}>admin</option></select> <button class="btn btn-danger btn-sm" onclick="deleteUser('${u.id}')">Delete</button></td></tr>`).join('')}</tbody></table></div>`;
  }
  
  if (tab === 'departments') {
    const { data } = await sb.from('departments').select('*');
    html = `<div class="card"><h3>➕ Add Department</h3><input id="dept-name" placeholder="Name" style="margin-bottom:8px;"><input id="dept-desc" placeholder="Description"><button class="btn btn-primary" onclick="addDept()">Add</button></div><div class="card"><h3>Departments</h3><table><tbody>${data.map(d=>`<tr><td>${d.name}</td><td>${d.description||''}</td><td><button class="btn btn-danger btn-sm" onclick="deleteItem('departments','${d.id}')">Delete</button></td></tr>`).join('')}</tbody></table></div>`;
  }
  
  if (tab === 'services') {
    const { data: depts } = await sb.from('departments').select('*');
    const { data: services } = await sb.from('services').select('*, departments(name)');
    html = `<div class="card"><h3>➕ Add Service</h3><div class="form-grid"><input id="svc-title" placeholder="Title*"><input id="svc-price" placeholder="Price"><select id="svc-dept"><option value="">Dept</option>${depts.map(d=>`<option value="${d.id}">${d.name}</option>`).join('')}</select></div><textarea id="svc-desc" placeholder="Description" style="margin:8px 0;"></textarea><button class="btn btn-primary" onclick="addService()">Add Service</button></div><div class="card"><h3>Services</h3><table><thead><tr><th>Title</th><th>Price</th><th>Dept</th><th>Status</th><th>Actions</th></tr></thead><tbody>${services.map(s=>`<tr><td>${s.title}</td><td>${s.price||'-'}</td><td>${s.departments?.name||'-'}</td><td>${s.is_active?'✅':'❌'}</td><td><button class="btn btn-sm btn-primary" onclick="toggleService('${s.id}',${!s.is_active})">${s.is_active?'Hide':'Show'}</button> <button class="btn btn-sm btn-danger" onclick="deleteItem('services','${s.id}')">Del</button></td></tr>`).join('')}</tbody></table></div>`;
  }
  
  if (tab === 'settings') {
    const { data } = await sb.from('site_settings').select('*');
    html = `<div class="card"><h3>Site Settings</h3>${data.map(s=>`<div class="form-group"><label>${s.key}</label><input id="set-${s.key}" value="${s.value||''}"></div>`).join('')}<button class="btn btn-primary" onclick="saveSettings()">Save</button></div>`;
  }
  
  content.innerHTML = html;
}

async function addDept() {
  const n = document.getElementById('dept-name').value, d = document.getElementById('dept-desc').value;
  if (!n) return showToast('Name required', 'error');
  await sb.from('departments').insert({ name: n, description: d });
  showToast('Created!'); loadAdminTab('departments');
}

async function addService() {
  const t = document.getElementById('svc-title').value;
  if (!t) return showToast('Title required', 'error');
  await sb.from('services').insert({
    title: t, description: document.getElementById('svc-desc').value,
    price: document.getElementById('svc-price').value,
    department_id: document.getElementById('svc-dept').value || null,
    posted_by: currentUser.id
  });
  showToast('Service added!'); loadAdminTab('services');
}

async function toggleService(id, status) {
  await sb.from('services').update({ is_active: status }).eq('id', id);
  showToast(status ? 'Activated!' : 'Hidden'); loadAdminTab('services');
}

async function updateRole(id, role) { await sb.from('profiles').update({ role }).eq('id', id); showToast('Updated!'); loadAdminTab('users'); }
async function deleteUser(id) { if (confirm('Delete?')) { await sb.from('profiles').delete().eq('id', id); showToast('Deleted!'); loadAdminTab('users'); } }
async function deleteItem(table, id) { if (confirm('Delete?')) { await sb.from(table).delete().eq('id', id); showToast('Deleted!'); loadAdminTab(table); } }
async function saveSettings() {
  document.querySelectorAll('[id^="set-"]').forEach(async inp => {
    await sb.from('site_settings').update({ value: inp.value }).eq('key', inp.id.replace('set-', ''));
  });
  showToast('Saved!');
}

// ========== DEPT ADMIN ==========
function initDeptAdmin() {
  if (!currentUser) { window.location.href = 'login.html'; return; }
  if (currentProfile?.role !== 'dept_admin' && currentProfile?.role !== 'admin' && currentProfile?.role !== 'ceo') {
    window.location.href = 'dashboard.html'; return;
  }
  loadDeptData();
}

async function loadDeptData() {
  const deptId = currentProfile?.department;
  document.getElementById('dept-name').textContent = 'Loading...';
  if (deptId) {
    const { data: dept } = await sb.from('departments').select('name').eq('id', deptId).single();
    document.getElementById('dept-name').textContent = dept?.name || 'Your Department';
  } else {
    document.getElementById('dept-name').textContent = 'All Departments';
  }
  await loadDeptServices();
  await loadDeptJobs();
}

async function loadDeptServices() {
  let q = sb.from('services').select('*').eq('is_active', true);
  if (currentProfile?.department) q = q.eq('department_id', currentProfile.department);
  const { data } = await q;
  const tbody = document.getElementById('dept-svc-tbody');
  if (tbody) tbody.innerHTML = data.map(s => `<tr><td>${s.title}</td><td>${s.price||'-'}</td><td><button class="btn btn-danger btn-sm" onclick="deleteDeptItem('services','${s.id}')">Del</button></td></tr>`).join('') || '<tr><td colspan="3">No services</td></tr>';
}

async function addDeptService() {
  const t = document.getElementById('dept-svc-title').value;
  if (!t) return showToast('Title required', 'error');
  await sb.from('services').insert({
    title: t, description: document.getElementById('dept-svc-desc').value,
    price: document.getElementById('dept-svc-price').value,
    department_id: currentProfile?.department || null,
    posted_by: currentUser.id
  });
  showToast('Service added!'); loadDeptServices();
}

async function loadDeptJobs() {
  let q = sb.from('jobs').select('*').eq('is_active', true);
  if (currentProfile?.department) q = q.eq('department_id', currentProfile.department);
  const { data } = await q;
  const tbody = document.getElementById('dept-job-tbody');
  if (tbody) tbody.innerHTML = data.map(j => `<tr><td>${j.title}</td><td>${j.location||'-'}</td><td><button class="btn btn-danger btn-sm" onclick="deleteDeptItem('jobs','${j.id}')">Del</button></td></tr>`).join('') || '<tr><td colspan="3">No jobs</td></tr>';
}

async function deleteDeptItem(table, id) {
  if (!confirm('Delete?')) return;
  await sb.from(table).delete().eq('id', id);
  showToast('Deleted!');
  if (table === 'services') loadDeptServices();
  if (table === 'jobs') loadDeptJobs();
}

console.log('✅ Ascenda Groups v3 Ready');