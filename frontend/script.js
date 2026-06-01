// ============================================
// ASCENDA GROUPS - ENTERPRISE SCRIPT v4
// Fixed: Mobile nav, auth UI, session, services
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
    if (e.target.matches('.auth-logout-btn') || e.target.closest('.auth-logout-btn') || e.target.matches('.mobile-auth-logout') || e.target.closest('.mobile-auth-logout')) {
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

// ========== MOBILE NAV (Right Sidebar) ==========
function initMobileNav() {
  const hamburger = document.getElementById('hamburger');
  const mobileNav = document.getElementById('mobileNav');
  if (!hamburger || !mobileNav) return;

  mobileNav.style.cssText = `
    position: fixed; top: 0; right: 0;
    width: 70%; max-width: 320px; height: 100vh;
    background: rgba(10, 15, 28, 0.98);
    backdrop-filter: blur(24px); -webkit-backdrop-filter: blur(24px);
    border-left: 1px solid #1e293b;
    z-index: 998;
    display: flex; flex-direction: column;
    padding: 80px 20px 40px; overflow-y: auto;
    transform: translateX(100%);
    transition: transform 0.35s cubic-bezier(0.4, 0, 0.2, 1);
    box-shadow: -10px 0 40px rgba(0,0,0,0.5);
    visibility: hidden;
  `;

  const overlay = document.createElement('div');
  overlay.id = 'nav-overlay';
  overlay.style.cssText = `
    position: fixed; top: 0; left: 0; right: 0; bottom: 0;
    background: rgba(0,0,0,0.5); z-index: 997;
    opacity: 0; pointer-events: none;
    transition: opacity 0.35s ease;
  `;
  document.body.appendChild(overlay);

  hamburger.style.cssText = 'display:none;flex-direction:column;gap:5px;cursor:pointer;padding:12px;z-index:1000;background:none;border:none;border-radius:8px;';
  hamburger.querySelectorAll('span').forEach(s => s.style.cssText = 'display:block;width:26px;height:2.5px;background:#f1f5f9;border-radius:2px;transition:all 0.3s ease;');

  mobileNav.querySelectorAll('a').forEach(link => {
    link.style.cssText = 'display:block;width:100%;color:#f1f5f9;text-decoration:none;padding:14px 18px;font-size:1rem;font-weight:500;border-radius:10px;margin-bottom:4px;background:rgba(26,35,50,0.6);border:1px solid transparent;transition:all 0.2s ease;';
  });

  function open() {
    hamburger.classList.add('active');
    mobileNav.style.transform = 'translateX(0)';
    mobileNav.style.visibility = 'visible';
    overlay.style.opacity = '1';
    overlay.style.pointerEvents = 'all';
    document.body.style.overflow = 'hidden';
    const sp = hamburger.querySelectorAll('span');
    sp[0].style.transform = 'rotate(45deg) translate(5px,6px)'; sp[0].style.background = '#3b82f6';
    sp[1].style.opacity = '0';
    sp[2].style.transform = 'rotate(-45deg) translate(5px,-6px)'; sp[2].style.background = '#3b82f6';
  }

  function close() {
    hamburger.classList.remove('active');
    mobileNav.style.transform = 'translateX(100%)';
    mobileNav.style.visibility = 'hidden';
    overlay.style.opacity = '0';
    overlay.style.pointerEvents = 'none';
    document.body.style.overflow = '';
    const sp = hamburger.querySelectorAll('span');
    sp[0].style.transform = 'rotate(0)'; sp[0].style.background = '#f1f5f9';
    sp[1].style.opacity = '1';
    sp[2].style.transform = 'rotate(0)'; sp[2].style.background = '#f1f5f9';
  }

  hamburger.addEventListener('click', (e) => { e.stopPropagation(); hamburger.classList.contains('active') ? close() : open(); });
  overlay.addEventListener('click', close);
  mobileNav.querySelectorAll('a').forEach(l => l.addEventListener('click', close));
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') close(); });

  function check() { hamburger.style.display = window.innerWidth <= 768 ? 'flex' : 'none'; if (window.innerWidth > 768) close(); }
  window.addEventListener('resize', check); check();
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
  } catch (err) { updateUIForLoggedOut(); }

  sb.auth.onAuthStateChange(async (event) => {
    if (event === 'SIGNED_IN') window.location.reload();
    if (event === 'SIGNED_OUT') { currentUser = null; currentProfile = null; isAdmin = false; updateUIForLoggedOut(); }
  });
}

function showAdminLink() {
  if (document.querySelector('.admin-nav-link')) return;
  const link = document.createElement('a'); link.href = 'admin.html'; link.textContent = '⚡ Admin'; link.className = 'admin-nav-link'; link.style.cssText = 'color:#f59e0b!important;font-weight:700!important;';
  document.querySelector('.nav-links')?.appendChild(link);
}

function updateUIForLoggedIn() {
  document.querySelectorAll('.auth-login-btn').forEach(e => e.style.display = 'none');
  document.querySelectorAll('.auth-register-btn').forEach(e => e.style.display = 'none');
  document.querySelectorAll('.auth-logout-btn').forEach(e => e.style.display = 'inline-flex');
  document.querySelectorAll('.auth-profile-link').forEach(e => e.style.display = 'inline-flex');
  document.querySelectorAll('.auth-user-name').forEach(e => { e.textContent = currentProfile?.full_name || currentUser?.email?.split('@')[0] || 'User'; e.style.display = 'inline'; });
  document.querySelectorAll('.mobile-auth-login').forEach(e => e.style.display = 'none');
  document.querySelectorAll('.mobile-auth-register').forEach(e => e.style.display = 'none');
  document.querySelectorAll('.mobile-auth-profile').forEach(e => e.style.display = 'block');
  document.querySelectorAll('.mobile-auth-logout').forEach(e => e.style.display = 'block');
}

function updateUIForLoggedOut() {
  document.querySelectorAll('.auth-login-btn').forEach(e => e.style.display = 'inline-flex');
  document.querySelectorAll('.auth-register-btn').forEach(e => e.style.display = 'inline-flex');
  document.querySelectorAll('.auth-logout-btn').forEach(e => e.style.display = 'none');
  document.querySelectorAll('.auth-profile-link').forEach(e => e.style.display = 'none');
  document.querySelectorAll('.auth-user-name').forEach(e => e.style.display = 'none');
  document.querySelectorAll('.admin-nav-link').forEach(e => e.remove());
  document.querySelectorAll('.mobile-auth-login').forEach(e => e.style.display = 'block');
  document.querySelectorAll('.mobile-auth-register').forEach(e => e.style.display = 'block');
  document.querySelectorAll('.mobile-auth-profile').forEach(e => e.style.display = 'none');
  document.querySelectorAll('.mobile-auth-logout').forEach(e => e.style.display = 'none');
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
  const c = document.getElementById('announcements-bar');
  if (c && data?.length) { c.innerHTML = data.map(a => `<div style="padding:8px;color:${a.type==='urgent'?'#ef4444':a.type==='warning'?'#f59e0b':'#60a5fa'};">📢 ${a.message}</div>`).join(''); c.style.display = 'block'; }
}

// ========== API ==========
async function fetchData(table, filter = {}) { let q = sb.from(table).select('*'); Object.entries(filter).forEach(([k, v]) => q = q.eq(k, v)); const { data } = await q.order('created_at', { ascending: false }); return data || []; }

// ========== PAGE ROUTER ==========
function initPageLogic() {
  const p = window.location.pathname;
  if (p.includes('index.html') || p === '/' || p.endsWith('/frontend/')) loadHomePage();
  else if (p.includes('services.html')) loadServicesPage();
  else if (p.includes('dashboard.html')) loadDashboardPage();
  else if (p.includes('admin.html')) initAdminPanel();
  else if (p.includes('dept-admin.html')) initDeptAdmin();
}

// ========== HOME ==========
async function loadHomePage() {
  const [jobs, services] = await Promise.all([fetchData('jobs',{is_active:true}), fetchData('services',{is_active:true})]);
  renderCards('featured-jobs', jobs.slice(0,4), 'job');
  renderCards('featured-services', services.slice(0,4), 'service');
}

function renderCards(id, data, type) {
  const c = document.getElementById(id); if (!c) return;
  if (type === 'job') c.innerHTML = data.map(j => `<div class="card" onclick="window.location.href='jobs.html'"><span class="badge badge-blue">Job</span><h3>${j.title}</h3><p>${j.location||'Remote'}</p></div>`).join('') || '<p style="text-align:center;color:var(--text-muted);">No jobs yet</p>';
  if (type === 'service') c.innerHTML = data.map(s => `<div class="card" onclick="window.location.href='services.html'"><span class="badge badge-purple">Service</span><h3>${s.title}</h3><p>${(s.description||'').substring(0,80)}...</p></div>`).join('') || '<p style="text-align:center;color:var(--text-muted);">No services yet</p>';
}

// ========== SERVICES PAGE ==========
async function loadServicesPage() {
  const { data: services } = await sb.from('services').select('*, departments(name)').eq('is_active', true).order('created_at', { ascending: false });
  const c = document.getElementById('services-list');
  if (c) c.innerHTML = (services || []).map(s => `<div class="card"><span class="badge badge-purple">Service</span><h3>${s.title}</h3><p>${(s.description||'').substring(0,100)}...</p>${s.price?`<p style="color:var(--green);font-weight:700;">${s.price}</p>`:''}${s.departments?.name?`<span style="font-size:0.75rem;color:var(--purple);">${s.departments.name}</span>`:''}</div>`).join('') || '<p style="text-align:center;">No services available.</p>';
}

// ========== DASHBOARD ==========
async function loadDashboardPage() {
  if (!currentUser) { window.location.href = 'login.html'; return; }
  document.getElementById('dash-name').textContent = currentProfile?.full_name || 'User';
  document.getElementById('dash-role').textContent = currentProfile?.role?.toUpperCase() || 'USER';
  if (isAdmin) { document.getElementById('admin-quick-links').style.display = 'block'; document.getElementById('dept-admin-link').style.display = 'block'; }
  if (currentProfile?.role === 'dept_admin') document.getElementById('dept-admin-link').style.display = 'block';
  if (currentProfile?.role === 'agent') {
    document.getElementById('agent-panel').style.display = 'block';
    const { data: agent } = await sb.from('agents').select('*').eq('profile_id', currentUser.id).single();
    if (agent) { document.getElementById('agent-status').textContent = agent.status; document.getElementById('agent-rate').textContent = agent.commission_rate; document.getElementById('agent-earnings').textContent = agent.total_earnings || 0; }
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
  ['users','departments','services','settings'].forEach(t => document.getElementById(`tab-${t}`)?.addEventListener('click', () => loadAdminTab(t)));
  loadAdminTab('users');
}

async function loadAdminTab(tab) {
  const content = document.getElementById('admin-content');
  content.innerHTML = '<div class="skeleton" style="height:200px;"></div>';
  let html = '';
  if (tab === 'users') {
    const { data } = await sb.from('profiles').select('*');
    html = `<div class="card"><h3>Users</h3><table><thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Actions</th></tr></thead><tbody>${data.map(u=>`<tr><td>${u.full_name||''}</td><td>${u.email}</td><td>${u.role}</td><td><select onchange="updateRole('${u.id}',this.value)"><option ${u.role==='user'?'selected':''}>user</option><option ${u.role==='agent'?'selected':''}>agent</option><option ${u.role==='worker'?'selected':''}>worker</option><option ${u.role==='dept_admin'?'selected':''}>dept_admin</option><option ${u.role==='admin'?'selected':''}>admin</option></select> <button class="btn btn-danger btn-sm" onclick="deleteUser('${u.id}')">Del</button></td></tr>`).join('')}</tbody></table></div>`;
  }
  if (tab === 'departments') {
    const { data } = await sb.from('departments').select('*');
    html = `<div class="card"><h3>Add Department</h3><input id="dept-name" placeholder="Name"><input id="dept-desc" placeholder="Description"><button class="btn btn-primary" onclick="addDept()">Add</button></div><div class="card"><table>${data.map(d=>`<tr><td>${d.name}</td><td>${d.description||''}</td><td><button class="btn btn-danger btn-sm" onclick="deleteItem('departments','${d.id}')">Del</button></td></tr>`).join('')}</table></div>`;
  }
  if (tab === 'services') {
    const { data: depts } = await sb.from('departments').select('*');
    const { data: services } = await sb.from('services').select('*, departments(name)');
    html = `<div class="card"><h3>Add Service</h3><input id="svc-title" placeholder="Title*"><input id="svc-price" placeholder="Price"><select id="svc-dept"><option value="">Dept</option>${depts.map(d=>`<option value="${d.id}">${d.name}</option>`).join('')}</select><textarea id="svc-desc" placeholder="Description"></textarea><button class="btn btn-primary" onclick="addService()">Add</button></div><div class="card"><table><thead><tr><th>Title</th><th>Price</th><th>Dept</th><th>Actions</th></tr></thead><tbody>${services.map(s=>`<tr><td>${s.title}</td><td>${s.price||'-'}</td><td>${s.departments?.name||'-'}</td><td><button class="btn btn-sm btn-primary" onclick="toggleService('${s.id}',${!s.is_active})">${s.is_active?'Hide':'Show'}</button> <button class="btn btn-sm btn-danger" onclick="deleteItem('services','${s.id}')">Del</button></td></tr>`).join('')}</tbody></table></div>`;
  }
  if (tab === 'settings') {
    const { data } = await sb.from('site_settings').select('*');
    html = `<div class="card"><h3>Settings</h3>${data.map(s=>`<div class="form-group"><label>${s.key}</label><input id="set-${s.key}" value="${s.value||''}"></div>`).join('')}<button class="btn btn-primary" onclick="saveSettings()">Save</button></div>`;
  }
  content.innerHTML = html;
}

async function addDept() { const n=document.getElementById('dept-name').value; if(!n)return showToast('Name required','error'); await sb.from('departments').insert({name:n,description:document.getElementById('dept-desc').value}); showToast('Created!'); loadAdminTab('departments'); }
async function addService() { const t=document.getElementById('svc-title').value; if(!t)return showToast('Title required','error'); await sb.from('services').insert({title:t,description:document.getElementById('svc-desc').value,price:document.getElementById('svc-price').value,department_id:document.getElementById('svc-dept').value||null,posted_by:currentUser.id}); showToast('Added!'); loadAdminTab('services'); }
async function toggleService(id,status) { await sb.from('services').update({is_active:status}).eq('id',id); showToast(status?'Active':'Hidden'); loadAdminTab('services'); }
async function updateRole(id,role) { await sb.from('profiles').update({role}).eq('id',id); showToast('Updated!'); loadAdminTab('users'); }
async function deleteUser(id) { if(confirm('Delete?')){await sb.from('profiles').delete().eq('id',id);showToast('Deleted!');loadAdminTab('users');} }
async function deleteItem(table,id) { if(confirm('Delete?')){await sb.from(table).delete().eq('id',id);showToast('Deleted!');loadAdminTab(table);} }
async function saveSettings() { document.querySelectorAll('[id^="set-"]').forEach(async i=>{await sb.from('site_settings').update({value:i.value}).eq('key',i.id.replace('set-',''));}); showToast('Saved!'); }

// ========== DEPT ADMIN ==========
function initDeptAdmin() {
  if (!currentUser) { window.location.href = 'login.html'; return; }
  if (currentProfile?.role !== 'dept_admin' && !isAdmin) { window.location.href = 'dashboard.html'; return; }
  loadDeptData();
}

async function loadDeptData() {
  document.getElementById('dept-name').textContent = 'Loading...';
  if (currentProfile?.department) { const { data: d } = await sb.from('departments').select('name').eq('id',currentProfile.department).single(); document.getElementById('dept-name').textContent = d?.name || 'Department'; }
  else { document.getElementById('dept-name').textContent = 'All Departments'; }
  loadDeptServices(); loadDeptJobs();
}

async function loadDeptServices() {
  let q = sb.from('services').select('*').eq('is_active',true); if (currentProfile?.department) q = q.eq('department_id',currentProfile.department);
  const { data } = await q;
  document.getElementById('dept-svc-tbody').innerHTML = (data||[]).map(s=>`<tr><td>${s.title}</td><td>${s.price||'-'}</td><td><button class="btn btn-danger btn-sm" onclick="deleteDeptItem('services','${s.id}')">Del</button></td></tr>`).join('')||'<tr><td colspan="3">No services</td></tr>';
}

async function loadDeptJobs() {
  let q = sb.from('jobs').select('*').eq('is_active',true); if (currentProfile?.department) q = q.eq('department_id',currentProfile.department);
  const { data } = await q;
  document.getElementById('dept-job-tbody').innerHTML = (data||[]).map(j=>`<tr><td>${j.title}</td><td>${j.location||'-'}</td><td><button class="btn btn-danger btn-sm" onclick="deleteDeptItem('jobs','${j.id}')">Del</button></td></tr>`).join('')||'<tr><td colspan="3">No jobs</td></tr>';
}

async function addDeptService() {
  const t=document.getElementById('dept-svc-title').value; if(!t)return showToast('Title required','error');
  await sb.from('services').insert({title:t,description:document.getElementById('dept-svc-desc').value,price:document.getElementById('dept-svc-price').value,department_id:currentProfile?.department||null,posted_by:currentUser.id});
  showToast('Added!'); loadDeptServices();
}

async function deleteDeptItem(table,id) { if(confirm('Delete?')){await sb.from(table).delete().eq('id',id);showToast('Deleted!');if(table==='services')loadDeptServices();if(table==='jobs')loadDeptJobs();} }

console.log('✅ Ascenda Groups v4 Ready');