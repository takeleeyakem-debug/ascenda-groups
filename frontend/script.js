// ============================================
// ASCENDA GROUPS - COMPLETE SCRIPT
// Fixed: Auth, Sessions, Mobile Nav, Loading
// ============================================

// Init Supabase with session persistence
if (window.supabase && !window.supabaseClient) {
  window.supabaseClient = window.supabase.createClient(
    window.SUPABASE_URL,
    window.SUPABASE_ANON_KEY,
    {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        storage: window.localStorage
      }
    }
  );
}

const supabase = window.supabaseClient;

// Global state
let currentUser = null;
let currentProfile = null;
let isAdmin = false;

// ========== DOM READY ==========
document.addEventListener('DOMContentLoaded', async () => {
  initMobileNav();
  await restoreSession();
  initPageLogic();
  setupGlobalListeners();
});

// ========== SESSION RESTORE ==========
async function restoreSession() {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (session?.user) {
      currentUser = session.user;
      
      // Try to get profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', currentUser.id)
        .single();
      
      if (!profile) {
        // Create profile if missing
        const { data: newProfile } = await supabase
          .from('profiles')
          .insert({
            id: currentUser.id,
            role: 'user',
            full_name: currentUser.user_metadata?.full_name || currentUser.email?.split('@')[0] || 'User'
          })
          .select()
          .single();
        currentProfile = newProfile;
      } else {
        currentProfile = profile;
      }
      
      isAdmin = currentProfile?.role === 'admin';
      updateUIForLoggedIn();
      if (isAdmin) showAdminElements();
    } else {
      updateUIForLoggedOut();
    }
  } catch (err) {
    console.error('Session error:', err);
    updateUIForLoggedOut();
  }
  
  // Auth state listener
  supabase.auth.onAuthStateChange(async (event, session) => {
    if (event === 'SIGNED_IN' && session?.user) {
      currentUser = session.user;
      const { data: profile } = await supabase.from('profiles').select('*').eq('id', session.user.id).single();
      currentProfile = profile || { id: session.user.id, role: 'user' };
      isAdmin = currentProfile?.role === 'admin';
      updateUIForLoggedIn();
      if (isAdmin) showAdminElements();
      if (window.location.pathname.includes('login.html')) {
        window.location.href = 'dashboard.html';
      }
    } else if (event === 'SIGNED_OUT') {
      currentUser = null;
      currentProfile = null;
      isAdmin = false;
      updateUIForLoggedOut();
      hideAdminElements();
    }
  });
}

// ========== MOBILE NAVIGATION (Smooth Full-Screen) ==========
function initMobileNav() {
  const hamburger = document.getElementById('hamburger');
  const mobileNav = document.getElementById('mobileNav');
  
  if (!hamburger || !mobileNav) return;
  
  // Full-screen overlay style
  mobileNav.style.cssText = `
    position: fixed;
    top: 0; left: 0; right: 0; bottom: 0;
    width: 100vw; height: 100vh;
    background: rgba(3, 7, 18, 0.97);
    backdrop-filter: blur(24px);
    -webkit-backdrop-filter: blur(24px);
    z-index: 998;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    gap: 10px;
    padding: 60px 20px;
    opacity: 0;
    pointer-events: none;
    transition: opacity 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  `;
  
  // Hamburger style
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
  
  const spans = hamburger.querySelectorAll('span');
  spans.forEach(span => {
    span.style.cssText = `
      display: block;
      width: 26px;
      height: 2.5px;
      background: #f1f5f9;
      border-radius: 2px;
      transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
    `;
  });
  
  // Toggle function
  function openMenu() {
    hamburger.classList.add('active');
    mobileNav.style.opacity = '1';
    mobileNav.style.pointerEvents = 'all';
    document.body.style.overflow = 'hidden';
    spans[0].style.transform = 'rotate(45deg) translate(5px, 6px)';
    spans[0].style.background = '#3b82f6';
    spans[1].style.opacity = '0';
    spans[2].style.transform = 'rotate(-45deg) translate(5px, -6px)';
    spans[2].style.background = '#3b82f6';
  }
  
  function closeMenu() {
    hamburger.classList.remove('active');
    mobileNav.style.opacity = '0';
    mobileNav.style.pointerEvents = 'none';
    document.body.style.overflow = '';
    spans[0].style.transform = 'rotate(0)';
    spans[0].style.background = '#f1f5f9';
    spans[1].style.opacity = '1';
    spans[2].style.transform = 'rotate(0)';
    spans[2].style.background = '#f1f5f9';
  }
  
  hamburger.addEventListener('click', () => {
    hamburger.classList.contains('active') ? closeMenu() : openMenu();
  });
  
  // Close on link click
  mobileNav.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', closeMenu);
  });
  
  // Style mobile links
  mobileNav.querySelectorAll('a').forEach(link => {
    link.style.cssText = `
      display: block;
      width: 100%;
      max-width: 360px;
      color: #f1f5f9;
      text-decoration: none;
      padding: 16px 24px;
      font-size: 1.15rem;
      font-weight: 500;
      text-align: center;
      border-radius: 14px;
      background: rgba(26, 35, 50, 0.7);
      border: 1px solid #1e293b;
      transition: all 0.3s ease;
    `;
  });
  
  // Responsive
  function checkScreen() {
    if (window.innerWidth <= 768) {
      hamburger.style.display = 'flex';
    } else {
      hamburger.style.display = 'none';
      closeMenu();
    }
  }
  window.addEventListener('resize', checkScreen);
  checkScreen();
}

// ========== GLOBAL LISTENERS ==========
function setupGlobalListeners() {
  // All logout buttons
  document.addEventListener('click', async (e) => {
    if (e.target.matches('.auth-logout-btn') || e.target.closest('.auth-logout-btn')) {
      e.preventDefault();
      await supabase.auth.signOut();
      window.location.href = 'index.html';
    }
  });
}

// ========== UI HELPERS ==========
function showAdminElements() {
  document.querySelectorAll('.admin-only').forEach(el => el.style.display = 'block');
  document.querySelectorAll('.admin-inline').forEach(el => el.style.display = 'inline-flex');
}

function hideAdminElements() {
  document.querySelectorAll('.admin-only').forEach(el => el.style.display = 'none');
  document.querySelectorAll('.admin-inline').forEach(el => el.style.display = 'none');
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
  hideAdminElements();
}

// ========== TOAST ==========
function showToast(msg, type = 'success') {
  const toast = document.createElement('div');
  toast.style.cssText = `
    position: fixed; top: 24px; right: 24px;
    padding: 16px 24px; background: #1a2332;
    border: 1px solid ${type === 'success' ? '#10b981' : '#ef4444'};
    border-radius: 12px; color: white; z-index: 9999;
    font-size: 0.9rem; font-weight: 500;
    box-shadow: 0 8px 30px rgba(0,0,0,0.6);
    animation: slideIn 0.3s ease;
    display: flex; align-items: center; gap: 8px;
  `;
  toast.innerHTML = (type === 'success' ? '✅ ' : '❌ ') + msg;
  document.body.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(100%)';
    toast.style.transition = 'all 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

// ========== LOADING SKELETON ==========
function showSkeleton(containerId, count = 3) {
  const container = document.getElementById(containerId);
  if (!container) return;
  container.innerHTML = Array(count).fill(`
    <div class="card" style="animation: pulse 1.5s infinite;">
      <div class="skeleton skeleton-title" style="height:20px;width:60%;"></div>
      <div class="skeleton skeleton-text" style="height:14px;width:80%;"></div>
      <div class="skeleton skeleton-text" style="height:14px;width:40%;"></div>
    </div>
  `).join('');
}

// Add pulse animation
const style = document.createElement('style');
style.textContent = `
  @keyframes slideIn {
    from { opacity: 0; transform: translateX(100%); }
    to { opacity: 1; transform: translateX(0); }
  }
  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.5; }
  }
`;
document.head.appendChild(style);

// ========== API HELPERS ==========
async function fetchJobs() {
  const { data } = await supabase.from('jobs').select('*').eq('is_active', true).order('created_at', { ascending: false });
  return data || [];
}

async function fetchMarketplace(category = null) {
  let query = supabase.from('marketplace_items').select('*').eq('is_active', true);
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
  } else if (path.includes('profile.html')) {
    loadProfilePage();
  }
}

// ========== HOME PAGE ==========
async function loadHomePage() {
  showSkeleton('featured-jobs', 4);
  showSkeleton('featured-marketplace', 4);
  
  const jobs = await fetchJobs();
  const items = await fetchMarketplace();
  
  const jobContainer = document.getElementById('featured-jobs');
  if (jobContainer) {
    jobContainer.innerHTML = jobs.slice(0, 4).map(j => `
      <div class="card">
        <span class="badge badge-blue">${j.category || 'Job'}</span>
        <h3>${j.title}</h3>
        <p>📍 ${j.location || 'Remote'} · ${j.type || 'Full-time'}</p>
      </div>
    `).join('') || '<p style="text-align:center;color:var(--text-muted);">No jobs available yet.</p>';
  }
  
  const marketContainer = document.getElementById('featured-marketplace');
  if (marketContainer) {
    marketContainer.innerHTML = items.slice(0, 4).map(i => `
      <div class="card">
        <span class="badge badge-gold">${i.category}</span>
        <h3>${i.title}</h3>
        <p style="color:var(--green);font-weight:700;">$${i.price}</p>
      </div>
    `).join('') || '<p style="text-align:center;color:var(--text-muted);">No items yet.</p>';
  }
}

// ========== JOBS PAGE ==========
async function loadJobsPage() {
  showSkeleton('jobs-list', 6);
  const jobs = await fetchJobs();
  const container = document.getElementById('jobs-list');
  if (container) {
    container.innerHTML = jobs.map(j => `
      <div class="card">
        <span class="badge badge-blue">${j.category || 'Job'}</span>
        <h3>${j.title}</h3>
        <p>📍 ${j.location || 'Remote'}</p>
        <p>${j.description || ''}</p>
        <button class="btn btn-primary" onclick="applyForJob('${j.id}')">Apply Now</button>
      </div>
    `).join('');
  }
}

async function applyForJob(jobId) {
  if (!currentUser) {
    showToast('Please login first', 'error');
    window.location.href = 'login.html';
    return;
  }
  const { error } = await supabase.from('job_applications').insert({
    job_id: jobId,
    applicant_id: currentUser.id
  });
  if (error) showToast('Application failed: ' + error.message, 'error');
  else showToast('Applied successfully!');
}

// ========== MARKETPLACE PAGE ==========
async function loadMarketplacePage() {
  showSkeleton('marketplace-list', 6);
  await renderMarketplace();
  
  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      await renderMarketplace(btn.dataset.category);
    });
  });
}

async function renderMarketplace(cat = 'all') {
  const items = await fetchMarketplace(cat);
  const container = document.getElementById('marketplace-list');
  if (container) {
    container.innerHTML = items.map(i => `
      <div class="card">
        <span class="badge badge-gold">${i.category}</span>
        <h3>${i.title}</h3>
        <p style="color:var(--green);font-weight:700;font-size:1.2rem;">$${i.price}</p>
        <p>${i.description || ''}</p>
        <small style="color:var(--text-muted);">📞 ${i.seller_contact}</small>
      </div>
    `).join('') || '<p style="text-align:center;color:var(--text-muted);">No items in this category.</p>';
  }
}

// ========== CONTACT FORM ==========
function initContactForm() {
  const form = document.getElementById('contact-form');
  if (!form) return;
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = form.querySelector('button');
    btn.disabled = true;
    btn.textContent = 'Sending...';
    
    const { error } = await supabase.from('contact_messages').insert({
      name: form.name.value,
      email: form.email.value,
      subject: form.subject.value,
      message: form.message.value
    });
    
    btn.disabled = false;
    btn.textContent = 'Send Message ✉️';
    
    if (error) showToast('Error sending message', 'error');
    else {
      showToast('Message sent successfully!');
      form.reset();
    }
  });
}

// ========== DASHBOARD ==========
async function loadDashboard() {
  if (!currentUser) {
    window.location.href = 'login.html';
    return;
  }
  
  const nameEl = document.getElementById('dashboard-name');
  const roleEl = document.getElementById('dashboard-role');
  if (nameEl) nameEl.textContent = currentProfile?.full_name || currentUser.email;
  if (roleEl) roleEl.textContent = (currentProfile?.role || 'user').toUpperCase();
  
  if (isAdmin) {
    const adminPanel = document.getElementById('admin-panel');
    if (adminPanel) adminPanel.style.display = 'block';
    await loadAdminData();
  }
  
  if (currentProfile?.role === 'agent') {
    const agentPanel = document.getElementById('agent-panel');
    if (agentPanel) agentPanel.style.display = 'block';
    await loadAgentData();
  }
}

async function loadAdminData() {
  const { data: agents } = await supabase.from('agents').select('*, profiles(full_name, email)').eq('status', 'pending');
  const { data: messages } = await supabase.from('contact_messages').select('*').order('created_at', { ascending: false }).limit(10);
  
  const agentsEl = document.getElementById('admin-agents');
  if (agentsEl) {
    agentsEl.innerHTML = agents?.map(a => `
      <div class="card" style="margin-bottom:12px;">
        <p><strong>${a.profiles?.full_name || 'Unknown'}</strong></p>
        <p style="font-size:0.85rem;">${a.profiles?.email || ''}</p>
        <div style="display:flex;gap:8px;margin-top:8px;">
          <button class="btn btn-success" onclick="approveAgent('${a.id}')">Approve</button>
          <button class="btn btn-danger" onclick="rejectAgent('${a.id}')">Reject</button>
        </div>
      </div>
    `).join('') || '<p>No pending agents.</p>';
  }
  
  const msgsEl = document.getElementById('admin-messages');
  if (msgsEl) {
    msgsEl.innerHTML = messages?.map(m => `
      <div class="card" style="margin-bottom:8px;">
        <p><strong>${m.name}</strong> (${m.email})</p>
        <p style="font-size:0.85rem;">${m.message?.substring(0, 80)}...</p>
      </div>
    `).join('') || '<p>No messages.</p>';
  }
}

async function approveAgent(id) {
  await supabase.from('agents').update({ status: 'approved' }).eq('id', id);
  showToast('Agent approved!');
  loadAdminData();
}

async function rejectAgent(id) {
  await supabase.from('agents').update({ status: 'rejected' }).eq('id', id);
  showToast('Agent rejected.');
  loadAdminData();
}

async function loadAgentData() {
  const { data: agent } = await supabase.from('agents').select('*').eq('profile_id', currentUser.id).single();
  if (agent) {
    document.getElementById('agent-earnings').textContent = agent.total_earnings || 0;
    document.getElementById('agent-status').textContent = agent.status;
    document.getElementById('agent-rate').textContent = agent.commission_rate || 10;
    
    const { data: transactions } = await supabase.from('commission_transactions').select('*').eq('agent_id', currentUser.id).order('created_at', { ascending: false });
    const transEl = document.getElementById('agent-transactions');
    if (transEl) {
      transEl.innerHTML = transactions?.map(t => `
        <tr><td>${new Date(t.created_at).toLocaleDateString()}</td><td>$${t.amount}</td><td>${t.description || '-'}</td></tr>
      `).join('') || '<tr><td colspan="3">No transactions yet.</td></tr>';
    }
  }
}

// ========== PROFILE PAGE ==========
async function loadProfilePage() {
  if (!currentUser) {
    window.location.href = 'login.html';
    return;
  }
  document.getElementById('profile-name').textContent = currentProfile?.full_name || 'User';
  document.getElementById('profile-email').textContent = currentUser.email;
  document.getElementById('profile-role').textContent = (currentProfile?.role || 'user').toUpperCase();
}

// ========== APPLY AS AGENT ==========
async function applyAsAgent() {
  if (!currentUser) {
    showToast('Please login first', 'error');
    return;
  }
  const { data: existing } = await supabase.from('agents').select('*').eq('profile_id', currentUser.id).single();
  if (existing) {
    showToast('You already applied!', 'error');
    return;
  }
  const { error } = await supabase.from('agents').insert({ profile_id: currentUser.id });
  if (error) showToast('Error: ' + error.message, 'error');
  else showToast('Application submitted! ✅');
}

// ========== ADMIN JOB/MARKETPLACE CREATE ==========
function showJobForm() {
  document.getElementById('job-modal').classList.add('active');
}
function closeJobForm() {
  document.getElementById('job-modal').classList.remove('active');
}
async function createJob() {
  const { error } = await supabase.from('jobs').insert({
    title: document.getElementById('job-title').value,
    description: document.getElementById('job-desc').value,
    category: document.getElementById('job-category').value,
    location: document.getElementById('job-location').value,
    posted_by: currentUser.id
  });
  if (error) showToast('Error creating job', 'error');
  else {
    showToast('Job created!');
    closeJobForm();
    loadAdminData();
  }
}

function showMarketplaceForm() {
  document.getElementById('marketplace-modal').classList.add('active');
}
function closeMarketplaceForm() {
  document.getElementById('marketplace-modal').classList.remove('active');
}
async function createMarketplaceItem() {
  const { error } = await supabase.from('marketplace_items').insert({
    title: document.getElementById('item-title').value,
    description: document.getElementById('item-desc').value,
    category: document.getElementById('item-category').value,
    price: parseFloat(document.getElementById('item-price').value),
    seller_contact: document.getElementById('item-contact').value,
    posted_by: currentUser.id
  });
  if (error) showToast('Error creating item', 'error');
  else {
    showToast('Item created!');
    closeMarketplaceForm();
  }
}

console.log('✅ Ascenda Groups script loaded successfully');