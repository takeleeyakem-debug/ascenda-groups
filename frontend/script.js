// ============================================
// ASCENDA GROUPS - ENTERPRISE SCRIPT
// Dynamic content loading, auth, admin, live
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
let isCEO = false;
let userPermissions = {};

// ========== INIT ==========
document.addEventListener('DOMContentLoaded', async () => {
  initMobileNav();
  await restoreSession();
  await loadSiteSettings();
  loadAnnouncements();
  initPageLogic();
});

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

// ========== LIVE ANNOUNCEMENTS ==========
async function loadAnnouncements() {
  const { data } = await sb.from('announcements').select('*').eq('is_active', true).order('created_at', { ascending: false }).limit(3);
  const container = document.getElementById('announcements-bar');
  if (container && data?.length) {
    container.innerHTML = data.map(a => `
      <div class="announcement-item announcement-${a.type}">${a.message}</div>
    `).join('');
    container.style.display = 'block';
  }
}

// ========== SESSION ==========
async function restoreSession() {
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
    isAdmin = currentProfile.role === 'admin' || currentProfile.role === 'ceo';
    isCEO = currentProfile.role === 'ceo' || currentProfile.email === 'takeleeyakem@gmail.com';
    userPermissions = {
      canPostJobs: currentProfile.can_post_jobs || isAdmin,
      canPostMarketplace: currentProfile.can_post_marketplace || isAdmin,
      canPostServices: currentProfile.can_post_services || isAdmin,
      canPostNews: currentProfile.can_post_news || isAdmin
    };
    updateUIForLoggedIn();
    if (isAdmin) showAdminLink();
  } else {
    updateUIForLoggedOut();
  }
  
  sb.auth.onAuthStateChange(async (event, session) => {
    if (event === 'SIGNED_IN') window.location.reload();
    if (event === 'SIGNED_OUT') { currentUser = null; currentProfile = null; isAdmin = false; updateUIForLoggedOut(); }
  });
}

// ========== MOBILE NAV (Smooth Fullscreen) ==========
function initMobileNav() {
  const hamburger = document.getElementById('hamburger');
  const mobileNav = document.getElementById('mobileNav');
  if (!hamburger || !mobileNav) return;
  
  mobileNav.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;width:100vw;height:100vh;background:rgba(3,7,18,0.98);backdrop-filter:blur(24px);-webkit-backdrop-filter:blur(24px);z-index:998;display:flex;flex-direction:column;justify-content:center;align-items:center;gap:10px;padding:60px 20px;opacity:0;pointer-events:none;transition:opacity 0.4s ease;';
  
  hamburger.style.cssText = 'display:none;flex-direction:column;gap:5px;cursor:pointer;padding:12px;z-index:1000;background:none;border:none;border-radius:8px;';
  hamburger.querySelectorAll('span').forEach(s => s.style.cssText = 'display:block;width:26px;height:2.5px;background:#f1f5f9;border-radius:2px;transition:all 0.4s ease;');
  
  function open() {
    hamburger.classList.add('active'); mobileNav.style.opacity='1'; mobileNav.style.pointerEvents='all';
    document.body.style.overflow='hidden';
    const sp = hamburger.querySelectorAll('span');
    sp[0].style.transform='rotate(45deg) translate(5px,6px)'; sp[0].style.background='#3b82f6';
    sp[1].style.opacity='0'; sp[2].style.transform='rotate(-45deg) translate(5px,-6px)'; sp[2].style.background='#3b82f6';
  }
  function close() {
    hamburger.classList.remove('active'); mobileNav.style.opacity='0'; mobileNav.style.pointerEvents='none';
    document.body.style.overflow='';
    const sp = hamburger.querySelectorAll('span');
    sp[0].style.transform='rotate(0)'; sp[0].style.background='#f1f5f9';
    sp[1].style.opacity='1'; sp[2].style.transform='rotate(0)'; sp[2].style.background='#f1f5f9';
  }
  
  hamburger.addEventListener('click', () => hamburger.classList.contains('active') ? close() : open());
  mobileNav.querySelectorAll('a').forEach(l => l.addEventListener('click', close));
  mobileNav.querySelectorAll('a').forEach(l => l.style.cssText = 'display:block;width:100%;max-width:360px;color:#f1f5f9;text-decoration:none;padding:16px 24px;font-size:1.15rem;font-weight:500;text-align:center;border-radius:14px;background:rgba(26,35,50,0.7);border:1px solid #1e293b;transition:all 0.3s ease;');
  
  function check() { hamburger.style.display = window.innerWidth <= 768 ? 'flex' : 'none'; if(window.innerWidth>768) close(); }
  window.addEventListener('resize', check); check();
}

// ========== UI ==========
function showAdminLink() {
  const link = document.createElement('a'); link.href='admin.html'; link.textContent='⚡ Admin'; link.style.color='#f59e0b'; link.style.fontWeight='700';
  document.querySelector('.nav-links')?.appendChild(link);
  document.getElementById('mobileNav')?.insertBefore(link.cloneNode(true), document.getElementById('mobileNav').firstChild);
}
function updateUIForLoggedIn() {
  document.querySelectorAll('.auth-login-btn').forEach(e=>e.style.display='none');
  document.querySelectorAll('.auth-register-btn').forEach(e=>e.style.display='none');
  document.querySelectorAll('.auth-logout-btn').forEach(e=>e.style.display='inline-flex');
  document.querySelectorAll('.auth-user-name').forEach(e=>{e.textContent=currentProfile?.full_name||'User';e.style.display='inline';});
}
function updateUIForLoggedOut() {
  document.querySelectorAll('.auth-login-btn').forEach(e=>e.style.display='inline-flex');
  document.querySelectorAll('.auth-register-btn').forEach(e=>e.style.display='inline-flex');
  document.querySelectorAll('.auth-logout-btn').forEach(e=>e.style.display='none');
  document.querySelectorAll('.auth-user-name').forEach(e=>e.style.display='none');
  document.querySelectorAll('.admin-only').forEach(e=>e.style.display='none');
}
function showToast(msg, type='success') {
  const t = document.createElement('div'); t.style.cssText=`position:fixed;top:24px;right:24px;padding:16px 24px;background:#1a2332;border:1px solid ${type==='success'?'#10b981':'#ef4444'};border-radius:12px;color:white;z-index:9999;font-size:0.9rem;box-shadow:0 8px 30px rgba(0,0,0,0.6);animation:slideIn 0.3s ease;`; t.textContent=(type==='success'?'✅ ':'❌ ')+msg; document.body.appendChild(t); setTimeout(()=>{t.style.opacity='0';t.style.transform='translateX(100%)';t.style.transition='all 0.3s ease';setTimeout(()=>t.remove(),300);},3000);
}

// ========== API HELPERS ==========
async function fetchData(table, filter={}) {
  let q = sb.from(table).select('*');
  Object.entries(filter).forEach(([k,v]) => q = q.eq(k,v));
  const { data } = await q.order('created_at', { ascending: false });
  return data || [];
}

// ========== PAGE LOGIC ==========
function initPageLogic() {
  const path = window.location.pathname;
  if (path.includes('index.html')||path==='/'||path.endsWith('/frontend/')) loadHomePage();
  else if (path.includes('about.html')) loadAboutPage();
  else if (path.includes('services.html')) loadServicesPage();
  else if (path.includes('marketplace.html')) loadMarketplacePage();
  else if (path.includes('jobs.html')) loadJobsPage();
  else if (path.includes('news.html')) loadNewsPage();
  else if (path.includes('contact.html')) initContactForm();
  else if (path.includes('profile.html')) loadProfilePage();
  else if (path.includes('dashboard.html')) loadDashboard();
  else if (path.includes('admin.html')) loadAdminPanel();
}

// ========== HOME PAGE ==========
async function loadHomePage() {
  const [jobs, services, news, items] = await Promise.all([
    fetchData('jobs', {is_active:true}), fetchData('services', {is_active:true}), fetchData('news_posts', {is_published:true}), fetchData('marketplace_items', {is_active:true})
  ]);
  renderSection('featured-jobs', jobs.slice(0,4), 'job');
  renderSection('featured-services', services.slice(0,4), 'service');
  renderSection('featured-news', news.slice(0,3), 'news');
  renderSection('featured-marketplace', items.slice(0,4), 'marketplace');
}
function renderSection(id, data, type) {
  const c = document.getElementById(id); if(!c) return;
  if(type==='job') c.innerHTML = data.map(j=>`<div class="card"><span class="badge badge-blue">Job</span><h3>${j.title}</h3><p>${j.location||'Remote'}</p></div>`).join('')||'<p class="text-muted">No jobs yet</p>';
  if(type==='service') c.innerHTML = data.map(s=>`<div class="card"><span class="badge badge-purple">Service</span><h3>${s.title}</h3><p>${s.description?.substring(0,80)}...</p></div>`).join('')||'<p class="text-muted">No services yet</p>';
  if(type==='news') c.innerHTML = data.map(n=>`<div class="card"><span class="badge badge-gold">${n.type}</span><h3>${n.title}</h3><p>${n.content?.substring(0,80)}...</p></div>`).join('')||'<p class="text-muted">No news yet</p>';
  if(type==='marketplace') c.innerHTML = data.map(i=>`<div class="card"><span class="badge badge-green">${i.category}</span><h3>${i.title}</h3><p>$${i.price}</p></div>`).join('')||'<p class="text-muted">No items yet</p>';
}

// ========== ABOUT PAGE ==========
async function loadAboutPage() {
  const [authority, workers, departments] = await Promise.all([
    fetchData('authority', {is_active:true}), fetchData('profiles', {role:'worker'}), fetchData('departments', {is_active:true})
  ]);
  const authContainer = document.getElementById('authority-ladder');
  if(authContainer) authContainer.innerHTML = authority.sort((a,b)=>b.level-a.level).map(a=>`<div class="card"><h3>${a.title}</h3><p>Level ${a.level}</p></div>`).join('');
  const workersContainer = document.getElementById('workers-grid');
  if(workersContainer) workersContainer.innerHTML = workers.map(w=>`<div class="card text-center"><img src="${w.avatar_url||'https://via.placeholder.com/100'}" class="avatar-lg"><h3>${w.full_name}</h3><p>${w.position||'Worker'}</p><p>${w.bio||''}</p></div>`).join('');
}

// ========== SERVICES PAGE ==========
async function loadServicesPage() { const data = await fetchData('services',{is_active:true}); renderSection('services-list', data, 'service'); }

// ========== MARKETPLACE PAGE ==========
async function loadMarketplacePage() {
  const data = await fetchData('marketplace_items',{is_active:true});
  document.getElementById('marketplace-list').innerHTML = data.map(i=>`<div class="card"><span class="badge badge-green">${i.category}</span><h3>${i.title}</h3><p style="color:var(--green);font-weight:700;font-size:1.2rem;">$${i.price}</p><p>${i.description||''}</p><small>📞 ${i.seller_contact}</small></div>`).join('')||'<p>No items</p>';
}

// ========== JOBS PAGE ==========
async function loadJobsPage() {
  const data = await fetchData('jobs',{is_active:true});
  document.getElementById('jobs-list').innerHTML = data.map(j=>`<div class="card"><span class="badge badge-blue">Job</span><h3>${j.title}</h3><p>📍${j.location||'Remote'}</p><p>${j.description||''}</p><button class="btn btn-primary" onclick="applyForJob('${j.id}')">Apply</button></div>`).join('');
}
async function applyForJob(jobId) {
  if(!currentUser){showToast('Login first','error');window.location.href='login.html';return;}
  const {error} = await sb.from('job_applications').insert({job_id:jobId,applicant_id:currentUser.id});
  error?showToast('Failed','error'):showToast('Applied!');
}

// ========== NEWS PAGE ==========
async function loadNewsPage() {
  const data = await fetchData('news_posts',{is_published:true});
  document.getElementById('news-list').innerHTML = data.map(n=>`<div class="card">${n.media_url?`<img src="${n.media_url}" style="width:100%;border-radius:8px;margin-bottom:12px;">`:''}<span class="badge badge-gold">${n.type}</span><h3>${n.title}</h3><p>${n.content||''}</p></div>`).join('');
}

// ========== CONTACT ==========
function initContactForm() {
  document.getElementById('contact-form')?.addEventListener('submit', async (e) => {
    e.preventDefault(); const f=e.target; const btn=f.querySelector('button'); btn.disabled=true; btn.textContent='Sending...';
    const {error}=await sb.from('contact_messages').insert({name:f.name.value,email:f.email.value,subject:f.subject.value,message:f.message.value});
    btn.disabled=false; btn.textContent='Send';
    error?showToast('Error','error'):(showToast('Sent!'),f.reset());
  });
}

// ========== PROFILE PAGE (Instagram Style) ==========
async function loadProfilePage() {
  if(!currentUser){window.location.href='login.html';return;}
  const profile = currentProfile;
  document.getElementById('profile-avatar').src = profile.avatar_url || 'https://via.placeholder.com/150';
  document.getElementById('profile-cover').style.backgroundImage = `url(${profile.cover_url||''})`;
  document.getElementById('profile-name').textContent = profile.full_name;
  document.getElementById('profile-bio').textContent = profile.bio || 'No bio yet';
  document.getElementById('profile-role').textContent = profile.role?.toUpperCase();
  if(profile.instagram) document.getElementById('profile-instagram').href = profile.instagram;
  if(profile.tiktok) document.getElementById('profile-tiktok').href = profile.tiktok;
  if(profile.telegram) document.getElementById('profile-telegram').href = profile.telegram;
}

// ========== DASHBOARD ==========
async function loadDashboard() {
  if(!currentUser){window.location.href='login.html';return;}
  document.getElementById('dash-name').textContent = currentProfile?.full_name;
  document.getElementById('dash-role').textContent = currentProfile?.role?.toUpperCase();
  if(isAdmin) document.getElementById('admin-quick-links').style.display='block';
}

// ========== ADMIN PANEL ==========
async function loadAdminPanel() {
  if(!isAdmin){window.location.href='index.html';return;}
  const tabs = ['departments','authority','jobs','services','marketplace','news','announcements','applications','users','messages','settings'];
  tabs.forEach(t => document.getElementById(`tab-${t}`)?.addEventListener('click', ()=>loadAdminTab(t)));
  loadAdminTab('departments');
}

async function loadAdminTab(tab) {
  const content = document.getElementById('admin-content');
  content.innerHTML = '<div class="skeleton" style="height:200px;"></div>';
  let html = '';
  const data = await fetchData(tab==='users'?'profiles':tab==='settings'?'site_settings':tab);
  
  if(tab==='departments') html = `<h3>Departments</h3><button class="btn btn-primary" onclick="addDepartment()">+ Add Department</button><div class="cards-grid mt-4">${data.map(d=>`<div class="card"><h4>${d.name}</h4><p>${d.description||''}</p><button class="btn btn-danger" onclick="deleteItem('departments','${d.id}')">Delete</button></div>`).join('')}</div>`;
  if(tab==='jobs') html = `<h3>Jobs</h3><button class="btn btn-primary" onclick="addJob()">+ Add Job</button><div class="cards-grid mt-4">${data.map(j=>`<div class="card"><h4>${j.title}</h4><p>${j.location}</p><button class="btn btn-danger" onclick="deleteItem('jobs','${j.id}')">Delete</button></div>`).join('')}</div>`;
  if(tab==='services') html = `<h3>Services</h3><button class="btn btn-primary" onclick="addService()">+ Add Service</button><div class="cards-grid mt-4">${data.map(s=>`<div class="card"><h4>${s.title}</h4><button class="btn btn-danger" onclick="deleteItem('services','${s.id}')">Delete</button></div>`).join('')}</div>`;
  if(tab==='marketplace') html = `<h3>Marketplace</h3><div class="cards-grid mt-4">${data.map(i=>`<div class="card"><h4>${i.title}</h4><p>$${i.price}</p><button class="btn btn-danger" onclick="deleteItem('marketplace_items','${i.id}')">Delete</button></div>`).join('')}</div>`;
  if(tab==='news') html = `<h3>News</h3><button class="btn btn-primary" onclick="addNews()">+ Add News</button><div class="cards-grid mt-4">${data.map(n=>`<div class="card"><h4>${n.title}</h4><span class="badge badge-gold">${n.type}</span><button class="btn btn-danger" onclick="deleteItem('news_posts','${n.id}')">Delete</button></div>`).join('')}</div>`;
  if(tab==='announcements') html = `<h3>Announcements</h3><button class="btn btn-primary" onclick="addAnnouncement()">+ Add</button><div class="mt-4">${data.map(a=>`<div class="card"><p>${a.message}</p><button class="btn btn-danger" onclick="deleteItem('announcements','${a.id}')">Delete</button></div>`).join('')}</div>`;
  if(tab==='applications') html = `<h3>Applications</h3><div class="mt-4">${data.map(a=>`<div class="card"><h4>${a.type}</h4><p>Status: ${a.status}</p>${a.status==='pending'?`<button class="btn btn-success" onclick="approveApp('${a.id}')">Approve</button><button class="btn btn-danger" onclick="rejectApp('${a.id}')">Reject</button>`:''}</div>`).join('')}</div>`;
  if(tab==='users') html = `<h3>Users</h3><div class="mt-4">${data.map(u=>`<div class="card"><h4>${u.full_name}</h4><p>${u.email}</p><p>Role: ${u.role}</p><select onchange="updateUserRole('${u.id}',this.value)"><option ${u.role==='user'?'selected':''}>user</option><option ${u.role==='agent'?'selected':''}>agent</option><option ${u.role==='worker'?'selected':''}>worker</option><option ${u.role==='dept_admin'?'selected':''}>dept_admin</option><option ${u.role==='admin'?'selected':''}>admin</option></select></div>`).join('')}</div>`;
  if(tab==='messages') html = `<h3>Messages</h3><div class="mt-4">${data.map(m=>`<div class="card"><h4>${m.name}</h4><p>${m.email}</p><p>${m.message?.substring(0,100)}</p></div>`).join('')}</div>`;
  if(tab==='settings') html = `<h3>Site Settings</h3><div class="mt-4">${data.map(s=>`<div class="card"><h4>${s.key}</h4><input value="${s.value}" onchange="updateSetting('${s.key}',this.value)"></div>`).join('')}</div>`;
  
  content.innerHTML = html;
}

// Admin actions
async function addDepartment() {
  const name = prompt('Department name:'); if(!name) return;
  await sb.from('departments').insert({name}); showToast('Created!'); loadAdminTab('departments');
}
async function addJob() {
  const title = prompt('Job title:'); if(!title) return;
  await sb.from('jobs').insert({title, posted_by:currentUser.id}); showToast('Created!'); loadAdminTab('jobs');
}
async function addService() {
  const title = prompt('Service title:'); if(!title) return;
  await sb.from('services').insert({title, posted_by:currentUser.id}); showToast('Created!'); loadAdminTab('services');
}
async function addNews() {
  const title = prompt('News title:'); const type = prompt('Type (article/video/image/document):');
  if(!title) return;
  await sb.from('news_posts').insert({title, type:type||'article', posted_by:currentUser.id}); showToast('Created!'); loadAdminTab('news');
}
async function addAnnouncement() {
  const msg = prompt('Announcement message:'); if(!msg) return;
  await sb.from('announcements').insert({message:msg, posted_by:currentUser.id}); showToast('Posted!'); loadAdminTab('announcements');
}
async function deleteItem(table, id) { await sb.from(table).delete().eq('id',id); showToast('Deleted!'); loadAdminTab(table); }
async function approveApp(id) { await sb.from('applications').update({status:'approved'}).eq('id',id); showToast('Approved!'); loadAdminTab('applications'); }
async function rejectApp(id) { await sb.from('applications').update({status:'rejected'}).eq('id',id); showToast('Rejected!'); loadAdminTab('applications'); }
async function updateUserRole(id, role) { await sb.from('profiles').update({role}).eq('id',id); showToast('Updated!'); }
async function updateSetting(key, value) { await sb.from('site_settings').update({value}).eq('key',key); showToast('Saved!'); }

console.log('✅ Ascenda Groups Enterprise ready');