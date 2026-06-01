// ============================================
// ASCENDA GROUPS - FINAL SCRIPT
// All fixes applied
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
  initPageLogic();
});

// ========== MOBILE NAV ==========
function initMobileNav() {
  const hamburger = document.getElementById('hamburger');
  const mobileNav = document.getElementById('mobileNav');
  if (!hamburger || !mobileNav) return;

  mobileNav.style.cssText = 'position:fixed;top:0;right:0;width:75%;max-width:320px;height:100vh;background:rgba(10,15,28,0.98);backdrop-filter:blur(24px);border-left:1px solid #1e293b;z-index:998;display:flex;flex-direction:column;padding:80px 20px 40px;overflow-y:auto;transform:translateX(100%);transition:transform 0.35s;visibility:hidden;';
  hamburger.style.cssText = 'display:none;flex-direction:column;gap:5px;cursor:pointer;padding:12px;z-index:1000;background:none;border:none;';
  hamburger.querySelectorAll('span').forEach(s => s.style.cssText = 'display:block;width:26px;height:2.5px;background:#f1f5f9;border-radius:2px;transition:all 0.3s;');

  const overlay = document.createElement('div'); overlay.id = 'nav-overlay';
  overlay.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.5);z-index:997;opacity:0;pointer-events:none;transition:opacity 0.35s;';
  document.body.appendChild(overlay);

  function open() {
    hamburger.classList.add('active'); mobileNav.style.transform = 'translateX(0)'; mobileNav.style.visibility = 'visible';
    overlay.style.opacity = '1'; overlay.style.pointerEvents = 'all'; document.body.style.overflow = 'hidden';
    const s = hamburger.querySelectorAll('span'); s[0].style.transform = 'rotate(45deg) translate(5px,6px)'; s[0].style.background = '#3b82f6'; s[1].style.opacity = '0'; s[2].style.transform = 'rotate(-45deg) translate(5px,-6px)'; s[2].style.background = '#3b82f6';
  }
  function close() {
    hamburger.classList.remove('active'); mobileNav.style.transform = 'translateX(100%)'; mobileNav.style.visibility = 'hidden';
    overlay.style.opacity = '0'; overlay.style.pointerEvents = 'none'; document.body.style.overflow = '';
    const s = hamburger.querySelectorAll('span'); s[0].style.transform = 'rotate(0)'; s[0].style.background = '#f1f5f9'; s[1].style.opacity = '1'; s[2].style.transform = 'rotate(0)'; s[2].style.background = '#f1f5f9';
  }

  hamburger.addEventListener('click', (e) => { e.stopPropagation(); hamburger.classList.contains('active') ? close() : open(); });
  overlay.addEventListener('click', close);
  mobileNav.querySelectorAll('a').forEach(l => { l.style.cssText = 'display:block;width:100%;color:#f1f5f9;text-decoration:none;padding:14px 18px;font-size:1rem;border-radius:10px;margin-bottom:4px;background:rgba(26,35,50,0.6);'; l.addEventListener('click', close); });
  function check() { hamburger.style.display = window.innerWidth <= 768 ? 'flex' : 'none'; if (window.innerWidth > 768) close(); }
  window.addEventListener('resize', check); check();
}

// ========== SESSION & AUTH UI ==========
async function restoreSession() {
  try {
    const { data: { session } } = await sb.auth.getSession();
    if (session?.user) {
      currentUser = session.user;
      const { data: profile } = await sb.from('profiles').select('*').eq('id', currentUser.id).single();
      currentProfile = profile || { id: currentUser.id, role: 'user', full_name: currentUser.user_metadata?.full_name || currentUser.email };
      isAdmin = currentProfile.role === 'admin' || currentProfile.role === 'ceo' || currentProfile.email === 'takeleeyakem@gmail.com';
      showLoggedInUI();
    } else { showLoggedOutUI(); }
  } catch (e) { showLoggedOutUI(); }

  sb.auth.onAuthStateChange(async (event, session) => {
    if (event === 'SIGNED_IN' && session?.user) {
      currentUser = session.user;
      const { data: profile } = await sb.from('profiles').select('*').eq('id', currentUser.id).single();
      currentProfile = profile || { id: currentUser.id, role: 'user' };
      isAdmin = currentProfile.role === 'admin' || currentProfile.role === 'ceo' || currentProfile.email === 'takeleeyakem@gmail.com';
      showLoggedInUI();
    }
    if (event === 'SIGNED_OUT') { currentUser = null; currentProfile = null; isAdmin = false; showLoggedOutUI(); }
  });
}

function showLoggedInUI() {
  document.querySelectorAll('.nav-login').forEach(e => e.style.display = 'none');
  document.querySelectorAll('.nav-register').forEach(e => e.style.display = 'none');
  document.querySelectorAll('.nav-profile').forEach(e => e.style.display = 'inline-flex');
  document.querySelectorAll('.nav-logout').forEach(e => e.style.display = 'inline-flex');
  document.querySelectorAll('.nav-username').forEach(e => { e.textContent = currentProfile?.full_name || currentUser?.email?.split('@')[0] || 'User'; });
  if (isAdmin) document.querySelectorAll('.nav-admin').forEach(e => e.style.display = 'inline-flex');
  document.querySelectorAll('.mob-login').forEach(e => e.style.display = 'none');
  document.querySelectorAll('.mob-register').forEach(e => e.style.display = 'none');
  document.querySelectorAll('.mob-profile').forEach(e => e.style.display = 'block');
  document.querySelectorAll('.mob-logout').forEach(e => e.style.display = 'block');
  if (isAdmin) document.querySelectorAll('.mob-admin').forEach(e => e.style.display = 'block');
}

function showLoggedOutUI() {
  document.querySelectorAll('.nav-login').forEach(e => e.style.display = 'inline-flex');
  document.querySelectorAll('.nav-register').forEach(e => e.style.display = 'inline-flex');
  document.querySelectorAll('.nav-profile').forEach(e => e.style.display = 'none');
  document.querySelectorAll('.nav-logout').forEach(e => e.style.display = 'none');
  document.querySelectorAll('.nav-admin').forEach(e => e.style.display = 'none');
  document.querySelectorAll('.mob-login').forEach(e => e.style.display = 'block');
  document.querySelectorAll('.mob-register').forEach(e => e.style.display = 'block');
  document.querySelectorAll('.mob-profile').forEach(e => e.style.display = 'none');
  document.querySelectorAll('.mob-logout').forEach(e => e.style.display = 'none');
  document.querySelectorAll('.mob-admin').forEach(e => e.style.display = 'none');
}

async function logout() { await sb.auth.signOut(); window.location.href = 'index.html'; }

function showToast(msg, err) {
  const t = document.createElement('div'); t.style.cssText = `position:fixed;top:20px;right:20px;padding:14px 20px;background:#1a2332;border:1px solid ${err?'#ef4444':'#10b981'};border-radius:12px;color:white;z-index:9999;font-size:0.9rem;`;
  t.textContent = (err ? '❌ ' : '✅ ') + msg; document.body.appendChild(t); setTimeout(() => t.remove(), 3000);
}

// ========== PAGE ROUTER ==========
function initPageLogic() {
  const p = window.location.pathname;
  if (p.includes('index.html') || p === '/' || p.endsWith('/frontend/')) loadHome();
  if (p.includes('services.html')) loadServices();
  if (p.includes('dashboard.html')) loadDashboard();
  if (p.includes('admin.html')) initAdmin();
  if (p.includes('dept-admin.html')) initDept();
  if (p.includes('profile.html')) { if (!currentUser) window.location.href = 'login.html'; }
}

async function loadHome() {
  const [jobs, services] = await Promise.all([
    sb.from('jobs').select('*').eq('is_active', true).limit(4),
    sb.from('services').select('*').eq('is_active', true).limit(4)
  ]);
  const jc = document.getElementById('featured-jobs'); if (jc) jc.innerHTML = (jobs.data || []).map(j => `<div class="card"><span class="badge badge-blue">Job</span><h3>${j.title}</h3><p>${j.location || 'Remote'}</p></div>`).join('') || '<p>No jobs</p>';
  const sc = document.getElementById('featured-services'); if (sc) sc.innerHTML = (services.data || []).map(s => `<div class="card"><span class="badge badge-purple">Service</span><h3>${s.title}</h3></div>`).join('') || '<p>No services</p>';
}

async function loadServices() {
  const { data } = await sb.from('services').select('*, departments(name)').eq('is_active', true);
  const c = document.getElementById('services-list'); if (c) c.innerHTML = (data || []).map(s => `<div class="card"><span class="badge badge-purple">Service</span><h3>${s.title}</h3><p>${(s.description || '').substring(0, 80)}...</p>${s.price ? `<p style="color:var(--green);">${s.price}</p>` : ''}${s.departments?.name ? `<span style="font-size:0.75rem;color:var(--purple);">${s.departments.name}</span>` : ''}</div>`).join('') || '<p>No services</p>';
}

async function loadDashboard() {
  if (!currentUser) { window.location.href = 'login.html'; return; }
  document.getElementById('dash-name').textContent = currentProfile?.full_name || 'User';
  document.getElementById('dash-role').textContent = (currentProfile?.role || 'user').toUpperCase();
  if (isAdmin) { document.getElementById('admin-link').style.display = 'block'; document.getElementById('dept-link').style.display = 'block'; }
  if (currentProfile?.role === 'dept_admin') document.getElementById('dept-link').style.display = 'block';
}

// ========== ADMIN PANEL ==========
function initAdmin() { if (!isAdmin) { window.location.href = 'index.html'; return; } loadAdminTab('users'); }
async function loadAdminTab(tab) {
  const c = document.getElementById('admin-content'); c.innerHTML = '<div class="skeleton" style="height:200px;"></div>'; let h = '';
  if (tab === 'users') {
    const { data } = await sb.from('profiles').select('*');
    h = `<div class="card"><h3>👥 Users (${data.length})</h3><table><thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Actions</th></tr></thead><tbody>${data.map(u => `<tr><td>${u.full_name || ''}</td><td>${u.email}</td><td>${u.role}</td><td><select onchange="updateRole('${u.id}',this.value)"><option ${u.role === 'user' ? 'selected' : ''}>user</option><option ${u.role === 'agent' ? 'selected' : ''}>agent</option><option ${u.role === 'worker' ? 'selected' : ''}>worker</option><option ${u.role === 'dept_admin' ? 'selected' : ''}>dept_admin</option><option ${u.role === 'admin' ? 'selected' : ''}>admin</option></select> <button class="btn btn-danger btn-sm" onclick="deleteUser('${u.id}')">Del</button></td></tr>`).join('')}</tbody></table></div>`;
  }
  if (tab === 'departments') {
    const { data } = await sb.from('departments').select('*');
    h = `<div class="card"><h3>➕ Add Department</h3><input id="dept-name" placeholder="Name"><input id="dept-desc" placeholder="Description"><button class="btn btn-primary" onclick="addDept()">Add</button></div><div class="card"><h3>Departments</h3><table>${data.map(d => `<tr><td>${d.name}</td><td>${d.description || ''}</td><td><button class="btn btn-danger btn-sm" onclick="deleteItem('departments','${d.id}')">Del</button></td></tr>`).join('')}</table></div>`;
  }
  if (tab === 'services') {
    const { data: d } = await sb.from('departments').select('*');
    const { data: s } = await sb.from('services').select('*, departments(name)');
    h = `<div class="card"><h3>➕ Add Service</h3><input id="svc-title" placeholder="Title*"><input id="svc-price" placeholder="Price"><select id="svc-dept"><option value="">Dept</option>${d.map(x => `<option value="${x.id}">${x.name}</option>`).join('')}</select><textarea id="svc-desc"></textarea><button class="btn btn-primary" onclick="addService()">Add</button></div><div class="card"><h3>Services</h3><table><thead><tr><th>Title</th><th>Price</th><th>Dept</th><th>Actions</th></tr></thead><tbody>${s.map(x => `<tr><td>${x.title}</td><td>${x.price || '-'}</td><td>${x.departments?.name || '-'}</td><td><button class="btn btn-sm btn-primary" onclick="toggleService('${x.id}',${!x.is_active})">${x.is_active ? 'Hide' : 'Show'}</button> <button class="btn btn-sm btn-danger" onclick="deleteItem('services','${x.id}')">Del</button></td></tr>`).join('')}</tbody></table></div>`;
  }
  if (tab === 'messages') {
    const { data } = await sb.from('contact_messages').select('*').order('created_at', { ascending: false });
    h = `<div class="card"><h3>✉️ Messages (${data.length})</h3><table><thead><tr><th>From</th><th>Email</th><th>Message</th><th>Date</th></tr></thead><tbody>${data.map(m => `<tr><td>${m.name}</td><td>${m.email}</td><td>${m.message?.substring(0, 80)}</td><td>${new Date(m.created_at).toLocaleDateString()}</td></tr>`).join('')}</tbody></table></div>`;
  }
  c.innerHTML = h;
}
async function addDept() { const n = document.getElementById('dept-name').value; if (!n) return showToast('Name required', 1); await sb.from('departments').insert({ name: n, description: document.getElementById('dept-desc').value }); showToast('Created!'); loadAdminTab('departments'); }
async function addService() { const t = document.getElementById('svc-title').value; if (!t) return showToast('Title required', 1); await sb.from('services').insert({ title: t, description: document.getElementById('svc-desc').value, price: document.getElementById('svc-price').value, department_id: document.getElementById('svc-dept').value || null, posted_by: currentUser.id }); showToast('Added!'); loadAdminTab('services'); }
async function toggleService(id, s) { await sb.from('services').update({ is_active: s }).eq('id', id); showToast(s ? 'Active' : 'Hidden'); loadAdminTab('services'); }
async function updateRole(id, r) { await sb.from('profiles').update({ role: r }).eq('id', id); showToast('Updated!'); loadAdminTab('users'); }
async function deleteUser(id) { if (confirm('Delete?')) { await sb.from('profiles').delete().eq('id', id); showToast('Deleted!'); loadAdminTab('users'); } }
async function deleteItem(t, id) { if (confirm('Delete?')) { await sb.from(t).delete().eq('id', id); showToast('Deleted!'); loadAdminTab(t); } }

// ========== DEPT ADMIN ==========
function initDept() { if (!currentUser || (currentProfile?.role !== 'dept_admin' && !isAdmin)) { window.location.href = 'dashboard.html'; return; } loadDeptData(); }
async function loadDeptData() { document.getElementById('dept-name').textContent = 'Loading...'; if (currentProfile?.department) { const { data: d } = await sb.from('departments').select('name').eq('id', currentProfile.department).single(); document.getElementById('dept-name').textContent = d?.name || 'Department'; } else { document.getElementById('dept-name').textContent = 'All'; } loadDS(); loadDJ(); }
async function loadDS() { let q = sb.from('services').select('*').eq('is_active', true); if (currentProfile?.department) q = q.eq('department_id', currentProfile.department); const { data } = await q; document.getElementById('dept-svc-tbody').innerHTML = (data || []).map(s => `<tr><td>${s.title}</td><td>${s.price || '-'}</td><td><button class="btn btn-danger btn-sm" onclick="delD('services','${s.id}')">Del</button></td></tr>`).join('') || '<tr><td colspan="3">None</td></tr>'; }
async function loadDJ() { let q = sb.from('jobs').select('*').eq('is_active', true); if (currentProfile?.department) q = q.eq('department_id', currentProfile.department); const { data } = await q; document.getElementById('dept-job-tbody').innerHTML = (data || []).map(j => `<tr><td>${j.title}</td><td>${j.location || '-'}</td><td><button class="btn btn-danger btn-sm" onclick="delD('jobs','${j.id}')">Del</button></td></tr>`).join('') || '<tr><td colspan="3">None</td></tr>'; }
async function addDS() { const t = document.getElementById('dept-svc-title').value; if (!t) return showToast('Title required', 1); await sb.from('services').insert({ title: t, description: document.getElementById('dept-svc-desc').value, price: document.getElementById('dept-svc-price').value, department_id: currentProfile?.department || null, posted_by: currentUser.id }); showToast('Added!'); loadDS(); }
async function delD(t, id) { if (confirm('Delete?')) { await sb.from(t).delete().eq('id', id); showToast('Deleted!'); t === 'services' ? loadDS() : loadDJ(); } }

console.log('✅ Ascenda Final Ready');