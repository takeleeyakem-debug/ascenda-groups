// ============================================
// ASCENDA GROUPS - ENTERPRISE SCRIPT v2
// Fixed: Hamburger, Admin, Logout, Filters
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

// ========== LOGOUT HANDLER ==========
function setupLogoutHandler() {
  document.addEventListener('click', async (e) => {
    if (e.target.matches('.auth-logout-btn') || e.target.closest('.auth-logout-btn') || e.target.matches('[onclick="logout()"]') || e.target.closest('[onclick="logout()"]')) {
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

// ========== MOBILE NAV (Fixed - No Blink, Half Screen) ==========
function initMobileNav() {
  const hamburger = document.getElementById('hamburger');
  const mobileNav = document.getElementById('mobileNav');
  if (!hamburger || !mobileNav) return;
  
  // Hide immediately - no blink
  mobileNav.style.display = 'none';
  mobileNav.style.cssText = `
    display: none;
    position: fixed;
    top: 72px;
    left: 0;
    right: 0;
    height: calc(100vh - 72px);
    background: rgba(3, 7, 18, 0.98);
    backdrop-filter: blur(24px);
    -webkit-backdrop-filter: blur(24px);
    z-index: 998;
    overflow-y: auto;
    padding: 20px;
  `;
  
  hamburger.style.cssText = 'display:none;flex-direction:column;gap:5px;cursor:pointer;padding:12px;z-index:1000;background:none;border:none;border-radius:8px;';
  hamburger.querySelectorAll('span').forEach(s => s.style.cssText = 'display:block;width:26px;height:2.5px;background:#f1f5f9;border-radius:2px;transition:all 0.3s ease;');
  
  function open() {
    hamburger.classList.add('active');
    mobileNav.style.display = 'flex';
    mobileNav.style.flexDirection = 'column';
    mobileNav.style.gap = '8px';
    document.body.style.overflow = 'hidden';
    const sp = hamburger.querySelectorAll('span');
    sp[0].style.transform = 'rotate(45deg) translate(5px, 6px)';
    sp[0].style.background = '#3b82f6';
    sp[1].style.opacity = '0';
    sp[2].style.transform = 'rotate(-45deg) translate(5px, -6px)';
    sp[2].style.background = '#3b82f6';
  }
  
  function close() {
    hamburger.classList.remove('active');
    mobileNav.style.display = 'none';
    document.body.style.overflow = '';
    const sp = hamburger.querySelectorAll('span');
    sp[0].style.transform = 'rotate(0)';
    sp[0].style.background = '#f1f5f9';
    sp[1].style.opacity = '1';
    sp[2].style.transform = 'rotate(0)';
    sp[2].style.background = '#f1f5f9';
  }
  
  hamburger.addEventListener('click', (e) => {
    e.stopPropagation();
    hamburger.classList.contains('active') ? close() : open();
  });
  
  mobileNav.querySelectorAll('a').forEach(l => {
    l.style.cssText = 'display:block;width:100%;color:#f1f5f9;text-decoration:none;padding:16px 20px;font-size:1.1rem;font-weight:500;border-radius:12px;background:rgba(26,35,50,0.7);border:1px solid #1e293b;transition:all 0.2s ease;';
    l.addEventListener('click', close);
  });
  
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
  } catch (err) {
    console.error('Session error:', err);
    updateUIForLoggedOut();
  }
  
  sb.auth.onAuthStateChange(async (event, session) => {
    if (event === 'SIGNED_IN') window.location.reload();
    if (event === 'SIGNED_OUT') { currentUser = null; currentProfile = null; isAdmin = false; updateUIForLoggedOut(); }
  });
}

// ========== UI ==========
function showAdminLink() {
  const existing = document.querySelector('.admin-nav-link');
  if (existing) return;
  const link = document.createElement('a');
  link.href = 'admin.html';
  link.textContent = '⚡ Admin';
  link.className = 'admin-nav-link';
  link.style.cssText = 'color:#f59e0b!important;font-weight:700!important;';
  const navLinks = document.querySelector('.nav-links');
  if (navLinks) navLinks.appendChild(link);
  const mobileNav = document.getElementById('mobileNav');
  if (mobileNav) {
    const mlink = link.cloneNode(true);
    mlink.style.cssText = 'display:block;width:100%;color:#f59e0b!important;text-decoration:none;padding:16px 20px;font-size:1.1rem;font-weight:700;border-radius:12px;background:rgba(245,158,11,0.1);border:1px solid rgba(245,158,11,0.3);';
    mobileNav.insertBefore(mlink, mobileNav.firstChild);
  }
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
  const t = document.createElement('div');
  t.style.cssText = `position:fixed;top:24px;right:24px;padding:16px 24px;background:#1a2332;border:1px solid ${type==='success'?'#10b981':'#ef4444'};border-radius:12px;color:white;z-index:9999;font-size:0.9rem;box-shadow:0 8px 30px rgba(0,0,0,0.6);`;
  t.textContent = (type === 'success' ? '✅ ' : '❌ ') + msg;
  document.body.appendChild(t);
  setTimeout(() => { t.style.opacity = '0'; t.style.transform = 'translateX(100%)'; t.style.transition = 'all 0.3s ease'; setTimeout(() => t.remove(), 300); }, 3000);
}

// ========== SITE SETTINGS ==========
async function loadSiteSettings() {
  const { data } = await sb.from('site_settings').select('*');
  if (data) {
    data.forEach(s => {
      document.querySelectorAll(`[data-setting="${s.key}"]`).forEach(el => {
        if (el.tagName === 'IMG') el.src = s.value;
        else el.textContent = s.value;
      });
    });
  }
}

// ========== ANNOUNCEMENTS ==========
async function loadAnnouncements() {
  const { data } = await sb.from('announcements').select('*').eq('is_active', true).order('created_at', { ascending: false }).limit(3);
  const container = document.getElementById('announcements-bar');
  if (container && data?.length) {
    container.innerHTML = data.map(a => `<div class="announcement-item" style="padding:8px;color:${a.type==='urgent'?'#ef4444':a.type==='warning'?'#f59e0b':'#60a5fa'};">📢 ${a.message}</div>`).join('');
    container.style.display = 'block';
  }
}

// ========== API HELPERS ==========
async function fetchData(table, filter = {}) {
  let q = sb.from(table).select('*');
  Object.entries(filter).forEach(([k, v]) => q = q.eq(k, v));
  const { data } = await q.order('created_at', { ascending: false });
  return data || [];
}

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
  else if (path.includes('dashboard.html')) loadDashboard();
  else if (path.includes('admin.html')) initAdminPanel();
}

// ========== HOME ==========
async function loadHomePage() {
  const [jobs, services, news, items] = await Promise.all([
    fetchData('jobs', { is_active: true }), fetchData('services', { is_active: true }), fetchData('news_posts', { is_published: true }), fetchData('marketplace_items', { is_active: true })
  ]);
  renderCards('featured-jobs', jobs.slice(0, 4), 'job');
  renderCards('featured-services', services.slice(0, 4), 'service');
  renderCards('featured-news', news.slice(0, 3), 'news');
  renderCards('featured-marketplace', items.slice(0, 4), 'marketplace');
}

function renderCards(id, data, type) {
  const c = document.getElementById(id); if (!c) return;
  if (type === 'job') c.innerHTML = data.map(j => `<div class="card" style="cursor:pointer;" onclick="window.location.href='jobs.html'"><span class="badge badge-blue">Job</span><h3>${j.title}</h3><p>${j.location || 'Remote'}</p></div>`).join('') || '<p style="text-align:center;color:var(--text-muted);">No jobs yet</p>';
  if (type === 'service') c.innerHTML = data.map(s => `<div class="card" style="cursor:pointer;" onclick="window.location.href='services.html'"><span class="badge badge-purple">Service</span><h3>${s.title}</h3><p>${(s.description || '').substring(0, 80)}...</p></div>`).join('') || '<p style="text-align:center;color:var(--text-muted);">No services yet</p>';
  if (type === 'news') c.innerHTML = data.map(n => `<div class="card" style="cursor:pointer;" onclick="window.location.href='news.html'"><span class="badge badge-gold">${n.type}</span><h3>${n.title}</h3>${n.media_url ? `<img src="${n.media_url}" style="width:100%;border-radius:8px;margin:8px 0;">` : ''}<p>${(n.content || '').substring(0, 80)}...</p></div>`).join('') || '<p style="text-align:center;color:var(--text-muted);">No news yet</p>';
  if (type === 'marketplace') c.innerHTML = data.map(i => `<div class="card" style="cursor:pointer;" onclick="window.location.href='marketplace.html'"><span class="badge badge-green">${i.category}</span><h3>${i.title}</h3><p style="color:var(--green);font-weight:700;">$${i.price}</p></div>`).join('') || '<p style="text-align:center;color:var(--text-muted);">No items yet</p>';
}

// ========== ABOUT ==========
async function loadAboutPage() {
  const [authority, workers, departments] = await Promise.all([
    fetchData('authority', { is_active: true }), sb.from('profiles').select('*').or('role.eq.worker,role.eq.dept_admin'), fetchData('departments', { is_active: true })
  ]);
  const authC = document.getElementById('authority-ladder');
  if (authC) authC.innerHTML = authority.sort((a, b) => b.level - a.level).map(a => `<div class="card"><h3>${a.title}</h3><p>Level ${a.level}</p></div>`).join('') || '<p>No authority set</p>';
  const deptC = document.getElementById('departments-list');
  if (deptC) deptC.innerHTML = departments.map(d => `<div class="card"><h3>${d.name}</h3><p>${d.description || ''}</p></div>`).join('') || '<p>No departments</p>';
  const workersC = document.getElementById('workers-grid');
  if (workersC) workersC.innerHTML = (workers.data || []).map(w => `<div class="card text-center"><img src="${w.avatar_url || 'https://via.placeholder.com/100'}" style="width:80px;height:80px;border-radius:50%;margin:0 auto 12px;object-fit:cover;"><h3>${w.full_name}</h3><p>${w.position || 'Worker'}</p><p style="font-size:0.85rem;">${w.bio || ''}</p></div>`).join('') || '<p>No workers yet</p>';
}

// ========== SERVICES ==========
async function loadServicesPage() {
  const data = await fetchData('services', { is_active: true });
  const c = document.getElementById('services-list');
  if (c) c.innerHTML = data.map(s => `<div class="card" style="cursor:pointer;"><span class="badge badge-purple">Service</span><h3>${s.title}</h3><p>${s.description || ''}</p>${s.price ? `<p style="color:var(--gold);font-weight:700;">${s.price}</p>` : ''}</div>`).join('') || '<p style="text-align:center;">No services available.</p>';
}

// ========== MARKETPLACE (Clickable Fixed) ==========
async function loadMarketplacePage() {
  const data = await fetchData('marketplace_items', { is_active: true });
  const c = document.getElementById('marketplace-list');
  if (c) c.innerHTML = data.map(i => `<div class="card" style="cursor:pointer;" onclick="alert('Contact: ${i.seller_contact || 'Admin'}')"><span class="badge badge-green">${i.category}</span><h3>${i.title}</h3><p style="color:var(--green);font-weight:700;font-size:1.2rem;">$${i.price}</p><p>${i.description || ''}</p><small style="color:var(--text-muted);">📞 ${i.seller_contact || 'Contact admin'}</small></div>`).join('') || '<p style="text-align:center;">No items in this category.</p>';
  
  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const cat = btn.dataset.category;
      const filtered = cat === 'all' ? data : data.filter(i => i.category === cat);
      if (c) c.innerHTML = filtered.map(i => `<div class="card" style="cursor:pointer;" onclick="alert('Contact: ${i.seller_contact || 'Admin'}')"><span class="badge badge-green">${i.category}</span><h3>${i.title}</h3><p style="color:var(--green);font-weight:700;font-size:1.2rem;">$${i.price}</p><p>${i.description || ''}</p><small style="color:var(--text-muted);">📞 ${i.seller_contact || 'Contact admin'}</small></div>`).join('') || '<p style="text-align:center;">No items in this category.</p>';
    });
  });
}

// ========== JOBS ==========
async function loadJobsPage() {
  const data = await fetchData('jobs', { is_active: true });
  const c = document.getElementById('jobs-list');
  if (c) c.innerHTML = data.map(j => `<div class="card"><span class="badge badge-blue">Job</span><h3>${j.title}</h3><p>📍 ${j.location || 'Remote'} · ${j.type || 'Full-time'}</p><p>${j.description || ''}</p><button class="btn btn-primary" onclick="applyForJob('${j.id}')">Apply Now</button></div>`).join('') || '<p style="text-align:center;">No jobs available.</p>';
}

async function applyForJob(jobId) {
  if (!currentUser) { showToast('Login first', 'error'); window.location.href = 'login.html'; return; }
  const { error } = await sb.from('job_applications').insert({ job_id: jobId, applicant_id: currentUser.id });
  error ? showToast('Failed: ' + error.message, 'error') : showToast('Applied successfully!');
}

// ========== NEWS (Clickable Fixed) ==========
async function loadNewsPage() {
  const data = await fetchData('news_posts', { is_published: true });
  const c = document.getElementById('news-list');
  if (c) c.innerHTML = data.map(n => `<div class="card" style="cursor:pointer;">${n.media_url ? (n.type === 'video' ? `<video src="${n.media_url}" controls style="width:100%;border-radius:8px;margin-bottom:12px;"></video>` : `<img src="${n.media_url}" style="width:100%;border-radius:8px;margin-bottom:12px;">`) : ''}<span class="badge badge-gold">${n.type}</span><h3>${n.title}</h3><p>${n.content || ''}</p></div>`).join('') || '<p style="text-align:center;">No news available.</p>';
  
  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const type = btn.dataset.type;
      const filtered = type === 'all' ? data : data.filter(n => n.type === type);
      if (c) c.innerHTML = filtered.map(n => `<div class="card" style="cursor:pointer;">${n.media_url ? (n.type === 'video' ? `<video src="${n.media_url}" controls style="width:100%;border-radius:8px;margin-bottom:12px;"></video>` : `<img src="${n.media_url}" style="width:100%;border-radius:8px;margin-bottom:12px;">`) : ''}<span class="badge badge-gold">${n.type}</span><h3>${n.title}</h3><p>${n.content || ''}</p></div>`).join('') || '<p style="text-align:center;">No news in this category.</p>';
    });
  });
}

// ========== CONTACT ==========
function initContactForm() {
  document.getElementById('contact-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const f = e.target;
    const btn = f.querySelector('button');
    btn.disabled = true;
    btn.textContent = 'Sending...';
    const { error } = await sb.from('contact_messages').insert({ name: f.name.value, email: f.email.value, subject: f.subject.value, message: f.message.value });
    btn.disabled = false;
    btn.textContent = 'Send Message ✉️';
    error ? showToast('Error sending', 'error') : (showToast('Message sent!'), f.reset());
  });
}

// ========== PROFILE ==========
async function loadProfilePage() {
  if (!currentUser) { window.location.href = 'login.html'; return; }
  document.getElementById('profile-name').textContent = currentProfile?.full_name || 'User';
  document.getElementById('profile-bio').textContent = currentProfile?.bio || 'No bio yet';
  document.getElementById('profile-role').textContent = currentProfile?.role?.toUpperCase() || 'USER';
  if (currentProfile?.instagram) document.getElementById('profile-instagram').href = currentProfile.instagram;
  if (currentProfile?.tiktok) document.getElementById('profile-tiktok').href = currentProfile.tiktok;
  if (currentProfile?.telegram) document.getElementById('profile-telegram').href = currentProfile.telegram;
}

async function saveProfile() {
  const bio = document.getElementById('edit-bio')?.value;
  const instagram = document.getElementById('edit-instagram')?.value;
  const tiktok = document.getElementById('edit-tiktok')?.value;
  const telegram = document.getElementById('edit-telegram')?.value;
  if (currentUser) {
    await sb.from('profiles').update({ bio, instagram, tiktok, telegram }).eq('id', currentUser.id);
    showToast('Profile updated!');
    loadProfilePage();
  }
}

// ========== DASHBOARD ==========
async function loadDashboard() {
  if (!currentUser) { window.location.href = 'login.html'; return; }
  document.getElementById('dash-name').textContent = currentProfile?.full_name || 'User';
  document.getElementById('dash-role').textContent = currentProfile?.role?.toUpperCase() || 'USER';
  if (isAdmin) document.getElementById('admin-quick-links').style.display = 'block';
}

async function applyAsAgent() {
  if (!currentUser) { showToast('Login first', 'error'); return; }
  const { error } = await sb.from('applications').insert({ applicant_id: currentUser.id, type: 'agent', status: 'pending' });
  error ? showToast('Error: ' + error.message, 'error') : showToast('Application submitted!');
}

// ========== ADMIN PANEL (Full Forms - Not Popups) ==========
function initAdminPanel() {
  if (!isAdmin) { window.location.href = 'index.html'; return; }
  const tabs = ['departments', 'authority', 'jobs', 'services', 'marketplace', 'news', 'announcements', 'applications', 'users', 'messages', 'settings'];
  tabs.forEach(t => {
    document.getElementById(`tab-${t}`)?.addEventListener('click', () => loadAdminTab(t));
  });
  loadAdminTab('departments');
}

async function loadAdminTab(tab) {
  const content = document.getElementById('admin-content');
  content.innerHTML = '<div class="skeleton" style="height:200px;"></div>';
  
  let html = '<div style="background:var(--bg-card);padding:24px;border-radius:16px;border:1px solid var(--border);">';
  html += `<h2 style="margin-bottom:20px;">${tab.toUpperCase()}</h2>`;
  
  if (tab === 'departments') {
    html += `<form onsubmit="event.preventDefault();addDepartment();" style="margin-bottom:20px;"><input type="text" id="dept-name" placeholder="Department Name" required style="margin-bottom:8px;"><input type="text" id="dept-desc" placeholder="Description"><button type="submit" class="btn btn-primary">Add Department</button></form>`;
    const data = await fetchData('departments');
    html += data.map(d => `<div class="card" style="margin-bottom:8px;"><strong>${d.name}</strong><p>${d.description||''}</p><button class="btn btn-danger btn-sm" onclick="deleteItem('departments','${d.id}')">Delete</button></div>`).join('');
  }
  
  if (tab === 'jobs') {
    html += `<form onsubmit="event.preventDefault();addJob();" style="margin-bottom:20px;"><input type="text" id="job-title" placeholder="Job Title" required><textarea id="job-desc" placeholder="Description"></textarea><input type="text" id="job-category" placeholder="Category"><input type="text" id="job-location" placeholder="Location"><button type="submit" class="btn btn-primary">Add Job</button></form>`;
    const data = await fetchData('jobs');
    html += data.map(j => `<div class="card" style="margin-bottom:8px;"><strong>${j.title}</strong><p>${j.location||''}</p><button class="btn btn-danger btn-sm" onclick="deleteItem('jobs','${j.id}')">Delete</button></div>`).join('');
  }
  
  if (tab === 'services') {
    html += `<form onsubmit="event.preventDefault();addService();" style="margin-bottom:20px;"><input type="text" id="svc-title" placeholder="Service Title" required><textarea id="svc-desc" placeholder="Description"></textarea><input type="text" id="svc-price" placeholder="Price"><button type="submit" class="btn btn-primary">Add Service</button></form>`;
    const data = await fetchData('services');
    html += data.map(s => `<div class="card" style="margin-bottom:8px;"><strong>${s.title}</strong><button class="btn btn-danger btn-sm" onclick="deleteItem('services','${s.id}')">Delete</button></div>`).join('');
  }
  
  if (tab === 'marketplace') {
    html += `<form onsubmit="event.preventDefault();addMarketplace();" style="margin-bottom:20px;"><input type="text" id="mp-title" placeholder="Title" required><textarea id="mp-desc" placeholder="Description"></textarea><select id="mp-category"><option>house</option><option>car</option><option>value_item</option><option>e_service</option><option>digital_product</option><option>other</option></select><input type="number" id="mp-price" placeholder="Price"><input type="text" id="mp-contact" placeholder="Contact"><button type="submit" class="btn btn-primary">Add Item</button></form>`;
    const data = await fetchData('marketplace_items');
    html += data.map(i => `<div class="card" style="margin-bottom:8px;"><strong>${i.title}</strong> - $${i.price}<button class="btn btn-danger btn-sm" onclick="deleteItem('marketplace_items','${i.id}')">Delete</button></div>`).join('');
  }
  
  if (tab === 'news') {
    html += `<form onsubmit="event.preventDefault();addNews();" style="margin-bottom:20px;"><input type="text" id="news-title" placeholder="Title" required><textarea id="news-content" placeholder="Content"></textarea><select id="news-type"><option>article</option><option>video</option><option>image</option><option>document</option></select><input type="text" id="news-media" placeholder="Media URL"><button type="submit" class="btn btn-primary">Add News</button></form>`;
    const data = await fetchData('news_posts');
    html += data.map(n => `<div class="card" style="margin-bottom:8px;"><strong>${n.title}</strong> (${n.type})<button class="btn btn-danger btn-sm" onclick="deleteItem('news_posts','${n.id}')">Delete</button></div>`).join('');
  }
  
  if (tab === 'announcements') {
    html += `<form onsubmit="event.preventDefault();addAnnouncement();" style="margin-bottom:20px;"><textarea id="ann-msg" placeholder="Announcement message" required></textarea><select id="ann-type"><option>info</option><option>success</option><option>warning</option><option>urgent</option></select><button type="submit" class="btn btn-primary">Post Announcement</button></form>`;
    const data = await fetchData('announcements');
    html += data.map(a => `<div class="card" style="margin-bottom:8px;"><p>${a.message}</p><button class="btn btn-danger btn-sm" onclick="deleteItem('announcements','${a.id}')">Delete</button></div>`).join('');
  }
  
  if (tab === 'applications') {
    const data = await fetchData('applications');
    html += data.map(a => `<div class="card" style="margin-bottom:8px;"><strong>${a.type}</strong> - ${a.status}${a.status==='pending'?`<div style="margin-top:8px;"><button class="btn btn-success btn-sm" onclick="approveApp('${a.id}')">Approve</button><button class="btn btn-danger btn-sm" onclick="rejectApp('${a.id}')">Reject</button></div>`:''}</div>`).join('') || '<p>No applications</p>';
  }
  
  if (tab === 'users') {
    const { data } = await sb.from('profiles').select('*');
    html += (data||[]).map(u => `<div class="card" style="margin-bottom:8px;"><strong>${u.full_name}</strong> (${u.email})<p>Role: ${u.role}</p><select onchange="updateUserRole('${u.id}',this.value)"><option ${u.role==='user'?'selected':''}>user</option><option ${u.role==='agent'?'selected':''}>agent</option><option ${u.role==='worker'?'selected':''}>worker</option><option ${u.role==='dept_admin'?'selected':''}>dept_admin</option><option ${u.role==='admin'?'selected':''}>admin</option></select></div>`).join('');
  }
  
  if (tab === 'messages') {
    const data = await fetchData('contact_messages');
    html += data.map(m => `<div class="card" style="margin-bottom:8px;"><strong>${m.name}</strong> (${m.email})<p>${m.message?.substring(0,100)}</p></div>`).join('') || '<p>No messages</p>';
  }
  
  if (tab === 'settings') {
    const { data } = await sb.from('site_settings').select('*');
    html += (data||[]).map(s => `<div class="form-group"><label>${s.key}</label><input value="${s.value||''}" onchange="updateSetting('${s.key}',this.value)"></div>`).join('');
    html += '<button class="btn btn-primary" onclick="showToast(\'Settings saved!\')">Save All</button>';
  }
  
  html += '</div>';
  content.innerHTML = html;
}

// Admin CRUD functions
async function addDepartment() {
  const name = document.getElementById('dept-name')?.value;
  const desc = document.getElementById('dept-desc')?.value;
  if (!name) return showToast('Name required', 'error');
  await sb.from('departments').insert({ name, description: desc });
  showToast('Department created!');
  loadAdminTab('departments');
}

async function addJob() {
  const title = document.getElementById('job-title')?.value;
  const desc = document.getElementById('job-desc')?.value;
  const category = document.getElementById('job-category')?.value;
  const location = document.getElementById('job-location')?.value;
  if (!title) return showToast('Title required', 'error');
  await sb.from('jobs').insert({ title, description: desc, category, location, posted_by: currentUser.id });
  showToast('Job created!');
  loadAdminTab('jobs');
}

async function addService() {
  const title = document.getElementById('svc-title')?.value;
  const desc = document.getElementById('svc-desc')?.value;
  const price = document.getElementById('svc-price')?.value;
  if (!title) return showToast('Title required', 'error');
  await sb.from('services').insert({ title, description: desc, price, posted_by: currentUser.id });
  showToast('Service created!');
  loadAdminTab('services');
}

async function addMarketplace() {
  const title = document.getElementById('mp-title')?.value;
  const desc = document.getElementById('mp-desc')?.value;
  const category = document.getElementById('mp-category')?.value;
  const price = document.getElementById('mp-price')?.value;
  const contact = document.getElementById('mp-contact')?.value;
  if (!title) return showToast('Title required', 'error');
  await sb.from('marketplace_items').insert({ title, description: desc, category, price: parseFloat(price), seller_contact: contact, posted_by: currentUser.id });
  showToast('Item created!');
  loadAdminTab('marketplace');
}

async function addNews() {
  const title = document.getElementById('news-title')?.value;
  const content = document.getElementById('news-content')?.value;
  const type = document.getElementById('news-type')?.value;
  const media = document.getElementById('news-media')?.value;
  if (!title) return showToast('Title required', 'error');
  await sb.from('news_posts').insert({ title, content, type, media_url: media, posted_by: currentUser.id });
  showToast('News created!');
  loadAdminTab('news');
}

async function addAnnouncement() {
  const msg = document.getElementById('ann-msg')?.value;
  const type = document.getElementById('ann-type')?.value;
  if (!msg) return showToast('Message required', 'error');
  await sb.from('announcements').insert({ message: msg, type, posted_by: currentUser.id });
  showToast('Announcement posted!');
  loadAdminTab('announcements');
}

async function deleteItem(table, id) {
  if (!confirm('Delete this item?')) return;
  await sb.from(table).delete().eq('id', id);
  showToast('Deleted!');
  loadAdminTab(table);
}

async function approveApp(id) {
  const { data: app } = await sb.from('applications').select('*').eq('id', id).single();
  await sb.from('applications').update({ status: 'approved', reviewed_by: currentUser.id }).eq('id', id);
  // Update user permissions based on application type
  if (app) {
    const updates = {};
    if (app.type === 'agent') updates.role = 'agent';
    if (app.type === 'job_poster') updates.can_post_jobs = true;
    if (app.type === 'marketplace_poster') updates.can_post_marketplace = true;
    await sb.from('profiles').update(updates).eq('id', app.applicant_id);
  }
  showToast('Approved!');
  loadAdminTab('applications');
}

async function rejectApp(id) {
  await sb.from('applications').update({ status: 'rejected', reviewed_by: currentUser.id }).eq('id', id);
  showToast('Rejected!');
  loadAdminTab('applications');
}

async function updateUserRole(id, role) {
  await sb.from('profiles').update({ role }).eq('id', id);
  showToast('Role updated!');
}

async function updateSetting(key, value) {
  await sb.from('site_settings').update({ value }).eq('key', key);
  showToast('Setting saved!');
}

console.log('✅ Ascenda Groups Enterprise v2 ready');