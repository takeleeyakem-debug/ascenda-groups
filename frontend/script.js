// ============================================
// ASCENDA GROUPS - FINAL SCRIPT (MOBILE FIXED)
// ============================================
const sb = window.supabaseClient || supabase.createClient('https://rfogomnbicceentrhymy.supabase.co','eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJmb2dvbW5iaWNjZWVudHJoeW15Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAyNDQwOTEsImV4cCI6MjA5NTgyMDA5MX0.wke5a7GEdU2oepfKfSD-rthLTEmpk3GqVfFRM_MjZ9c',{auth:{persistSession:true,autoRefreshToken:true,storage:localStorage}});

let currentUser = null;
let currentProfile = null;
let isAdmin = false;

document.addEventListener('DOMContentLoaded', async () => {
  initMobileNav();
  await restoreSession();
  loadAnnouncements();
  routePage();
});

// Mobile nav (right slide, half screen)
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
  mobileNav.querySelectorAll('a').forEach(l => { l.style.cssText = 'display:block;width:100%;color:#f1f5f9;text-decoration:none;padding:14px 18px;font-size:1rem;border-radius:10px;margin-bottom:4px;background:rgba(26,35,50,0.6);'; });
}

// Session – no auto redirect on mobile
async function restoreSession() {
  const { data: { session } } = await sb.auth.getSession();
  if (session?.user) {
    currentUser = session.user;
    const { data: p } = await sb.from('profiles').select('*').eq('id', currentUser.id).single();
    currentProfile = p || { id: currentUser.id, role: 'user' };
    isAdmin = currentProfile.role === 'admin' || currentProfile.role === 'ceo' || currentUser.email === 'takeleeyakem@gmail.com';
    updateUI();
  } else updateUI();

  sb.auth.onAuthStateChange(async (event, session) => {
    if (event === 'SIGNED_IN') window.location.reload();
    if (event === 'SIGNED_OUT') { currentUser = null; currentProfile = null; isAdmin = false; updateUI(); }
  });
}

function updateUI() {
  const logged = !!currentUser;
  document.querySelectorAll('.nav-login').forEach(e => e.style.display = logged ? 'none' : 'inline-flex');
  document.querySelectorAll('.nav-register').forEach(e => e.style.display = logged ? 'none' : 'inline-flex');
  document.querySelectorAll('.nav-profile').forEach(e => e.style.display = logged ? 'inline-flex' : 'none');
  document.querySelectorAll('.nav-logout').forEach(e => e.style.display = logged ? 'inline-flex' : 'none');
  document.querySelectorAll('.nav-admin').forEach(e => e.style.display = (logged && isAdmin) ? 'inline-flex' : 'none');
  if (logged) document.querySelectorAll('.nav-username').forEach(e => e.textContent = currentProfile?.full_name || currentUser.email?.split('@')[0]);
  document.querySelectorAll('.mob-login').forEach(e => e.style.display = logged ? 'none' : 'block');
  document.querySelectorAll('.mob-register').forEach(e => e.style.display = logged ? 'none' : 'block');
  document.querySelectorAll('.mob-profile').forEach(e => e.style.display = logged ? 'block' : 'none');
  document.querySelectorAll('.mob-logout').forEach(e => e.style.display = logged ? 'block' : 'none');
  document.querySelectorAll('.mob-admin').forEach(e => e.style.display = (logged && isAdmin) ? 'block' : 'none');
}

async function logout() { await sb.auth.signOut(); window.location.href = 'index.html'; }

function showToast(msg, err) {
  const t = document.createElement('div');
  t.style.cssText = `position:fixed;top:20px;right:20px;padding:14px 20px;background:#1a2332;border:1px solid ${err?'#ef4444':'#10b981'};border-radius:12px;color:white;z-index:9999;font-size:0.9rem;`;
  t.textContent = (err ? '❌ ' : '✅ ') + msg;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 3000);
}

async function loadAnnouncements() {
  const { data } = await sb.from('announcements').select('*').eq('is_active', true).limit(3);
  const bar = document.getElementById('announcements-bar');
  if (bar && data?.length) {
    bar.innerHTML = data.map(a => `<span style="color:${a.type==='urgent'?'#ef4444':a.type==='warning'?'#f59e0b':'#60a5fa'};">📢 ${a.message}</span>`).join(' · ');
    bar.style.display = 'block';
  }
}

function routePage() {
  const path = window.location.pathname;
  if (path.includes('home.html') || path === '/' || path.endsWith('/frontend/')) loadHome();
  else if (path.includes('about.html')) loadAbout();
  else if (path.includes('services.html')) loadServices();
  else if (path.includes('marketplace.html')) loadMarketplace();
  else if (path.includes('jobs.html')) loadJobs();
  else if (path.includes('news.html')) loadNews();
  else if (path.includes('dashboard.html')) loadDashboard();
}

// (all loadHome, loadAbout, loadServices, loadMarketplace, loadJobs, loadNews, loadDashboard functions as provided earlier – they remain identical)
// For brevity they are omitted here, but copy them from the previous complete script.js.