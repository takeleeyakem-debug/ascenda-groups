// Ascenda Groups - Script v7 FIXED
const sb = window.supabaseClient || window.supabase.createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, storage: window.localStorage }
});

let currentUser = null;
let currentProfile = null;
let isAdmin = false;

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
    const s = hamburger.querySelectorAll('span');
    s[0].style.transform = 'rotate(45deg) translate(5px,6px)'; s[0].style.background = '#3b82f6';
    s[1].style.opacity = '0'; s[2].style.transform = 'rotate(-45deg) translate(5px,-6px)'; s[2].style.background = '#3b82f6';
  }
  function close() {
    hamburger.classList.remove('active'); mobileNav.style.transform = 'translateX(100%)'; mobileNav.style.visibility = 'hidden';
    overlay.style.opacity = '0'; overlay.style.pointerEvents = 'none'; document.body.style.overflow = '';
    const s = hamburger.querySelectorAll('span');
    s[0].style.transform = 'rotate(0)'; s[0].style.background = '#f1f5f9';
    s[1].style.opacity = '1'; s[2].style.transform = 'rotate(0)'; s[2].style.background = '#f1f5f9';
  }

  hamburger.addEventListener('click', (e) => { e.stopPropagation(); hamburger.classList.contains('active') ? close() : open(); });
  overlay.addEventListener('click', close);
  mobileNav.querySelectorAll('a').forEach(l => l.addEventListener('click', close));
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') close(); });

  function check() { hamburger.style.display = window.innerWidth <= 768 ? 'flex' : 'none'; if (window.innerWidth > 768) close(); }
  window.addEventListener('resize', check); check();

  mobileNav.querySelectorAll('a').forEach(l => {
    l.style.cssText = 'display:block;width:100%;color:#f1f5f9;text-decoration:none;padding:14px 18px;font-size:1rem;border-radius:10px;margin-bottom:4px;background:rgba(26,35,50,0.6);';
  });
}

// ========== AUTH ==========
async function restoreSession() {
  const { data: { session } } = await sb.auth.getSession();
  if (session?.user) {
    currentUser = session.user;
    const { data: profile } = await sb.from('profiles').select('*').eq('id', currentUser.id).single();
    currentProfile = profile || { id: currentUser.id, role: 'user', full_name: currentUser.user_metadata?.full_name || currentUser.email };
    isAdmin = currentProfile.role === 'admin' || currentProfile.role === 'ceo' || session.user.email === 'takeleeyakem@gmail.com';
    updateUIForRole();
    
    // Only redirect if on auth pages while logged in
    const path = window.location.pathname;
    if (path.includes('login.html') || path.includes('register.html') || path.includes('landing.html')) {
      window.location.href = isAdmin ? 'admin.html' : 'index.html';
    }
  } else {
    updateUIForRole();
  }

  sb.auth.onAuthStateChange(async (event, session) => {
    if (event === 'SIGNED_IN' && session?.user) {
      currentUser = session.user;
      const { data: profile } = await sb.from('profiles').select('*').eq('id', currentUser.id).single();
      currentProfile = profile || { id: currentUser.id, role: 'user' };
      isAdmin = currentProfile.role === 'admin' || currentProfile.role === 'ceo' || session.user.email === 'takeleeyakem@gmail.com';
      updateUIForRole();
    }
    if (event === 'SIGNED_OUT') {
      currentUser = null; currentProfile = null; isAdmin = false; updateUIForRole();
    }
  });
}

function updateUIForRole() {
  const loggedIn = !!currentUser;
  document.querySelectorAll('.nav-login').forEach(e => e.style.display = loggedIn ? 'none' : 'inline-flex');
  document.querySelectorAll('.nav-register').forEach(e => e.style.display = loggedIn ? 'none' : 'inline-flex');
  document.querySelectorAll('.nav-guest').forEach(e => e.style.display = loggedIn ? 'none' : 'inline-flex');
  document.querySelectorAll('.nav-profile').forEach(e => e.style.display = loggedIn ? 'inline-flex' : 'none');
  document.querySelectorAll('.nav-logout').forEach(e => e.style.display = loggedIn ? 'inline-flex' : 'none');
  document.querySelectorAll('.nav-admin').forEach(e => e.style.display = (loggedIn && isAdmin) ? 'inline-flex' : 'none');
  if (loggedIn) {
    document.querySelectorAll('.nav-username').forEach(e => { e.textContent = currentProfile?.full_name || currentUser.email?.split('@')[0]; });
  }

  document.querySelectorAll('.mob-login').forEach(e => e.style.display = loggedIn ? 'none' : 'block');
  document.querySelectorAll('.mob-register').forEach(e => e.style.display = loggedIn ? 'none' : 'block');
  document.querySelectorAll('.mob-guest').forEach(e => e.style.display = loggedIn ? 'none' : 'block');
  document.querySelectorAll('.mob-profile').forEach(e => e.style.display = loggedIn ? 'block' : 'none');
  document.querySelectorAll('.mob-logout').forEach(e => e.style.display = loggedIn ? 'block' : 'none');
  document.querySelectorAll('.mob-admin').forEach(e => e.style.display = (loggedIn && isAdmin) ? 'block' : 'none');
}

async function logout() { await sb.auth.signOut(); window.location.href = 'landing.html'; }

function showToast(msg, isError = false) {
  const t = document.createElement('div');
  t.style.cssText = `position:fixed;top:20px;right:20px;padding:14px 20px;background:#1a2332;border:1px solid ${isError?'#ef4444':'#10b981'};border-radius:12px;color:white;z-index:9999;font-size:0.9rem;`;
  t.textContent = (isError ? '❌ ' : '✅ ') + msg;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 3000);
}

// ========== PAGE ROUTER (FIXED - No redirect for guests) ==========
function initPageLogic() {
  const path = window.location.pathname;
  
  // index.html works for everyone (guest or logged in)
  if (path.includes('index.html') || path === '/' || path.endsWith('/frontend/')) {
    loadHome();
    return;
  }
  
  // Profile and dashboard require login
  if (path.includes('profile.html') || path.includes('dashboard.html')) {
    if (!currentUser) { window.location.href = 'login.html'; return; }
  }
  
  if (path.includes('about.html')) loadAbout();
  else if (path.includes('services.html')) loadServices();
  else if (path.includes('marketplace.html')) loadMarketplace();
  else if (path.includes('jobs.html')) loadJobs();
  else if (path.includes('news.html')) loadNews();
  else if (path.includes('dashboard.html')) loadDashboard();
}

// ========== PAGE LOADERS ==========
async function loadHome() {
  const [jobs, services] = await Promise.all([
    sb.from('jobs').select('*').eq('is_active', true).limit(4),
    sb.from('services').select('*').eq('is_active', true).limit(4)
  ]);
  const jc = document.getElementById('featured-jobs');
  if (jc) jc.innerHTML = (jobs.data || []).map(j => `<div class="card"><span class="badge badge-blue">Job</span><h3>${j.title}</h3><p>${j.location || 'Remote'}</p></div>`).join('') || '<p>No jobs</p>';
  const sc = document.getElementById('featured-services');
  if (sc) sc.innerHTML = (services.data || []).map(s => `<div class="card"><span class="badge badge-purple">Service</span><h3>${s.title}</h3></div>`).join('') || '<p>No services</p>';
}

async function loadAbout() {
  const [workers, authority] = await Promise.all([
    sb.from('profiles').select('*').or('role.eq.worker,role.eq.dept_admin'),
    sb.from('authority').select('*, profiles(full_name), departments(name)').order('level')
  ]);
  const wc = document.getElementById('workers-grid'); if (wc) wc.innerHTML = (workers.data || []).map(w => `<div class="card text-center"><img src="${w.avatar_url || 'https://via.placeholder.com/100'}" style="width:80px;height:80px;border-radius:50%;margin:0 auto 12px;"><h3>${w.full_name}</h3><p>${w.position || 'Worker'}</p></div>`).join('') || '<p>No workers</p>';
  const ac = document.getElementById('authority-ladder'); if (ac) ac.innerHTML = authority.data?.map(a => `<div class="card"><h3>${a.title} (Level ${a.level})</h3><p>${a.profiles?.full_name || 'Unassigned'} – ${a.departments?.name || 'N/A'}</p></div>`).join('') || '<p>No authority set</p>';
}

async function loadServices() {
  const { data } = await sb.from('services').select('*, departments(name)').eq('is_active', true);
  const c = document.getElementById('services-list'); if (c) c.innerHTML = (data || []).map(s => `<div class="card"><span class="badge badge-purple">Service</span><h3>${s.title}</h3><p>${(s.description || '').substring(0, 80)}...</p>${s.price ? `<p style="color:var(--green);">${s.price}</p>` : ''}</div>`).join('') || '<p>No services</p>';
}

async function loadMarketplace() {
  const { data } = await sb.from('marketplace_items').select('*').eq('is_active', true);
  const c = document.getElementById('marketplace-list'); if (c) c.innerHTML = data?.map(i => `<div class="card"><span class="badge badge-green">${i.category}</span><h3>${i.title}</h3><p style="color:var(--green);">$${i.price}</p><p>${i.description || ''}</p><small>📞 ${i.seller_contact || 'N/A'}</small></div>`).join('') || '<p>No items</p>';
}

async function loadJobs() {
  const { data } = await sb.from('jobs').select('*').eq('is_active', true);
  const c = document.getElementById('jobs-list'); if (c) c.innerHTML = data?.map(j => `<div class="card"><span class="badge badge-blue">Job</span><h3>${j.title}</h3><p>📍 ${j.location || 'Remote'}</p><p>${j.description || ''}</p><button class="btn btn-primary" onclick="applyForJob('${j.id}')">Apply</button></div>`).join('') || '<p>No jobs</p>';
}

async function applyForJob(jobId) {
  if (!currentUser) { showToast('Login first', true); window.location.href = 'login.html'; return; }
  const { error } = await sb.from('job_applications').insert({ job_id: jobId, applicant_id: currentUser.id });
  error ? showToast('Failed', true) : showToast('Applied!');
}

async function loadNews() {
  const { data } = await sb.from('news_posts').select('*').eq('is_published', true).order('created_at', { ascending: false });
  const c = document.getElementById('news-list'); if (c) c.innerHTML = data?.map(n => `<div class="card">${n.media_url ? (n.type === 'video' ? `<video src="${n.media_url}" controls style="width:100%;border-radius:8px;"></video>` : `<img src="${n.media_url}" style="width:100%;border-radius:8px;">`) : ''}<span class="badge badge-gold">${n.type}</span><h3>${n.title}</h3><p>${n.content || ''}</p></div>`).join('') || '<p>No news</p>';
}

async function loadDashboard() {
  if (!currentUser) { window.location.href = 'login.html'; return; }
  document.getElementById('dash-name').textContent = currentProfile?.full_name || 'User';
  document.getElementById('dash-role').textContent = (currentProfile?.role || 'user').toUpperCase();
  if (isAdmin) { document.getElementById('admin-link').style.display = 'block'; document.getElementById('dept-link').style.display = 'block'; }
  if (currentProfile?.role === 'dept_admin') document.getElementById('dept-link').style.display = 'block';
}