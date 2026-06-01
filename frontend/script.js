// ========== INIT SUPABASE ==========
(function initSupabase() {
  if (!window.supabaseClient && window.supabase && window.SUPABASE_URL && window.SUPABASE_ANON_KEY) {
    window.supabaseClient = window.supabase.createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY);
  }
})();

function getSupabase() {
  if (!window.supabaseClient) {
    initSupabase();
  }
  return window.supabaseClient;
}

// ========== GLOBAL STATE ==========
let currentUser = null;
let currentProfile = null;
let isAdmin = false;

// ========== INIT ==========
document.addEventListener('DOMContentLoaded', async () => {
  initNavigation();
  await checkAuthState();
  initPageLogic();
});

// ========== NAVIGATION ==========
function initNavigation() {
  const hamburger = document.getElementById('hamburger');
  const mobileNav = document.getElementById('mobileNav');
  if (hamburger && mobileNav) {
    hamburger.addEventListener('click', () => {
      hamburger.classList.toggle('active');
      mobileNav.classList.toggle('active');
    });
    mobileNav.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', () => {
        hamburger.classList.remove('active');
        mobileNav.classList.remove('active');
      });
    });
  }
  window.addEventListener('scroll', () => {
    const navbar = document.querySelector('.navbar');
    if (navbar && window.scrollY > 50) navbar.classList.add('scrolled');
    else if (navbar) navbar.classList.remove('scrolled');
  });
}

// ========== AUTH ==========
async function checkAuthState() {
  const sb = getSupabase();
  if (!sb) { console.error('Supabase not initialized'); return; }
  
  try {
    const { data: { user } } = await sb.auth.getUser();
    currentUser = user;
    
    if (user) {
      const { data: profile } = await sb.from('profiles').select('*').eq('id', user.id).single();
      currentProfile = profile;
      isAdmin = profile?.role === 'admin';
      updateUIForLoggedIn();
      if (isAdmin) showAdminElements();
    } else {
      updateUIForLoggedOut();
    }
  } catch (err) {
    console.error('Auth check failed:', err);
  }
}

function showAdminElements() {
  document.querySelectorAll('.admin-only').forEach(el => el.style.display = 'block');
  document.querySelectorAll('.admin-inline').forEach(el => el.style.display = 'inline-flex');
}

function updateUIForLoggedIn() {
  document.querySelectorAll('.auth-login-btn').forEach(el => el.style.display = 'none');
  document.querySelectorAll('.auth-register-btn').forEach(el => el.style.display = 'none');
  document.querySelectorAll('.auth-logout-btn').forEach(el => el.style.display = 'inline-flex');
  document.querySelectorAll('.auth-user-name').forEach(el => {
    el.textContent = currentProfile?.full_name || currentUser?.email || 'User';
    el.style.display = 'inline';
  });
}

function updateUIForLoggedOut() {
  document.querySelectorAll('.auth-login-btn').forEach(el => el.style.display = 'inline-flex');
  document.querySelectorAll('.auth-register-btn').forEach(el => el.style.display = 'inline-flex');
  document.querySelectorAll('.auth-logout-btn').forEach(el => el.style.display = 'none');
  document.querySelectorAll('.auth-user-name').forEach(el => el.style.display = 'none');
}

async function logout() {
  const sb = getSupabase();
  if (sb) await sb.auth.signOut();
  window.location.href = 'index.html';
}

// ========== TOAST ==========
function showToast(msg, type = 'success') {
  const toast = document.createElement('div');
  toast.className = 'toast ' + type;
  toast.textContent = msg;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
}

// ========== API HELPERS ==========
async function fetchJobs() {
  const sb = getSupabase();
  if (!sb) return [];
  const { data } = await sb.from('jobs').select('*').eq('is_active', true).order('created_at', { ascending: false });
  return data || [];
}

async function fetchMarketplace(category = null) {
  const sb = getSupabase();
  if (!sb) return [];
  let query = sb.from('marketplace_items').select('*').eq('is_active', true);
  if (category && category !== 'all') query = query.eq('category', category);
  const { data } = await query.order('created_at', { ascending: false });
  return data || [];
}

// ========== PAGE LOGIC ==========
function initPageLogic() {
  const path = window.location.pathname;
  
  if (path.includes('index.html') || path === '/' || path.endsWith('/frontend/')) {
    loadHomePage();
  } else if (path.includes('jobs.html')) {
    loadJobsPage();
  } else if (path.includes('marketplace.html')) {
    loadMarketplacePage();
  } else if (path.includes('contact.html')) {
    initContactForm();
  } else if (path.includes('dashboard.html')) {
    loadDashboard();
  }
}

// ========== HOME PAGE ==========
async function loadHomePage() {
  const jobs = await fetchJobs();
  const items = await fetchMarketplace();
  
  const jobContainer = document.getElementById('featured-jobs');
  if (jobContainer) {
    jobContainer.innerHTML = jobs.slice(0, 4).map(j => `
      <div class="card"><span class="badge badge-blue">${j.category || 'Job'}</span><h3>${j.title}</h3><p>${j.location || 'Remote'}</p></div>
    `).join('') || '<p>No jobs yet.</p>';
  }
  
  const marketContainer = document.getElementById('featured-marketplace');
  if (marketContainer) {
    marketContainer.innerHTML = items.slice(0, 4).map(i => `
      <div class="card"><span class="badge badge-gold">${i.category}</span><h3>${i.title}</h3><p>$${i.price}</p></div>
    `).join('') || '<p>No items yet.</p>';
  }
}

// ========== JOBS PAGE ==========
async function loadJobsPage() {
  const jobs = await fetchJobs();
  const container = document.getElementById('jobs-list');
  if (container) {
    container.innerHTML = jobs.map(j => `
      <div class="card"><span class="badge badge-blue">${j.category || 'Job'}</span><h3>${j.title}</h3><p>📍 ${j.location || 'Remote'}</p><p>${j.description || ''}</p><button class="btn btn-primary" onclick="applyForJob('${j.id}')">Apply Now</button></div>
    `).join('');
  }
}

async function applyForJob(jobId) {
  const sb = getSupabase();
  if (!currentUser) { showToast('Please login first', 'error'); window.location.href = 'login.html'; return; }
  const { error } = await sb.from('job_applications').insert({ job_id: jobId, applicant_id: currentUser.id });
  if (error) showToast('Application failed', 'error');
  else showToast('Applied successfully! ✅');
}

// ========== MARKETPLACE PAGE ==========
async function loadMarketplacePage() {
  await loadMarketplaceItems();
  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      await loadMarketplaceItems(btn.dataset.category);
    });
  });
}

async function loadMarketplaceItems(cat = 'all') {
  const items = await fetchMarketplace(cat);
  const container = document.getElementById('marketplace-list');
  if (container) {
    container.innerHTML = items.map(i => `
      <div class="card"><span class="badge badge-gold">${i.category}</span><h3>${i.title}</h3><p style="color:var(--accent-green);font-weight:700;">$${i.price}</p><p>${i.description || ''}</p><small>📞 ${i.seller_contact}</small></div>
    `).join('') || '<p>No items found.</p>';
  }
}

// ========== CONTACT FORM ==========
function initContactForm() {
  const form = document.getElementById('contact-form');
  if (!form) return;
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const sb = getSupabase();
    const btn = form.querySelector('button');
    btn.disabled = true;
    btn.textContent = 'Sending...';
    const { error } = await sb.from('contact_messages').insert({
      name: form.name.value,
      email: form.email.value,
      subject: form.subject.value,
      message: form.message.value
    });
    btn.disabled = false;
    btn.textContent = 'Send Message ✉️';
    if (error) showToast('Error sending', 'error');
    else { showToast('Message sent! ✅'); form.reset(); }
  });
}

// ========== DASHBOARD ==========
async function loadDashboard() {
  if (!currentUser) { window.location.href = 'login.html'; return; }
  const nameEl = document.getElementById('dashboard-name');
  const roleEl = document.getElementById('dashboard-role');
  if (nameEl) nameEl.textContent = currentProfile?.full_name || currentUser.email;
  if (roleEl) roleEl.textContent = currentProfile?.role?.toUpperCase() || 'USER';
  
  if (isAdmin) {
    document.getElementById('admin-panel').style.display = 'block';
    await loadAdminData();
  }
  if (currentProfile?.role === 'agent') {
    document.getElementById('agent-panel').style.display = 'block';
    await loadAgentData();
  }
}

async function loadAdminData() {
  const sb = getSupabase();
  const { data: agents } = await sb.from('agents').select('*, profiles(full_name, email)').eq('status', 'pending');
  const { data: messages } = await sb.from('contact_messages').select('*').order('created_at', { ascending: false }).limit(10);
  
  const agentsContainer = document.getElementById('admin-agents');
  if (agentsContainer) {
    agentsContainer.innerHTML = agents?.map(a => `<div class="card"><p><strong>${a.profiles.full_name}</strong></p><button class="btn btn-primary" onclick="approveAgent('${a.id}')">Approve</button></div>`).join('') || '<p>No pending agents</p>';
  }
  
  const msgsContainer = document.getElementById('admin-messages');
  if (msgsContainer) {
    msgsContainer.innerHTML = messages?.map(m => `<div class="card"><p><strong>${m.name}</strong></p><p>${m.message.substring(0, 50)}...</p></div>`).join('') || '<p>No messages</p>';
  }
}

async function approveAgent(id) {
  const sb = getSupabase();
  await sb.from('agents').update({ status: 'approved' }).eq('id', id);
  showToast('Agent approved! ✅');
  loadAdminData();
}

async function loadAgentData() {
  const sb = getSupabase();
  const { data: agent } = await sb.from('agents').select('*').eq('profile_id', currentUser.id).single();
  if (agent) {
    document.getElementById('agent-earnings').textContent = agent.total_earnings || 0;
    document.getElementById('agent-status').textContent = agent.status;
  }
}