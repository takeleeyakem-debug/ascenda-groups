// ========== GLOBAL STATE ==========
let currentUser = null;
let currentProfile = null;
let isAdmin = false;

// ========== INITIALIZATION ==========
document.addEventListener('DOMContentLoaded', async () => {
  initNavigation();
  await checkAuthState();
  initPageSpecificLogic();
});

// ========== NAVIGATION ==========
function initNavigation() {
  const hamburger = document.getElementById('hamburger');
  const mobileNav = document.getElementById('mobileNav');
  
  if (hamburger) {
    hamburger.addEventListener('click', () => {
      hamburger.classList.toggle('active');
      mobileNav.classList.toggle('active');
    });
  }

  // Close mobile nav on link click
  document.querySelectorAll('.mobile-nav a').forEach(link => {
    link.addEventListener('click', () => {
      hamburger?.classList.remove('active');
      mobileNav?.classList.remove('active');
    });
  });

  // Navbar scroll effect
  window.addEventListener('scroll', () => {
    const navbar = document.querySelector('.navbar');
    if (window.scrollY > 50) navbar.classList.add('scrolled');
    else navbar.classList.remove('scrolled');
  });
}

// ========== AUTH ==========
async function checkAuthState() {
  const { data: { user } } = await supabase.auth.getUser();
  currentUser = user;
  
  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();
    currentProfile = profile;
    
    if (profile?.role === 'admin') {
      isAdmin = true;
      showAdminElements();
    }
    
    updateUIForLoggedInUser();
  } else {
    updateUIForLoggedOutUser();
  }
  
  // Listen for auth changes
  supabase.auth.onAuthStateChange(async (event, session) => {
    if (event === 'SIGNED_IN') {
      currentUser = session.user;
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single();
      currentProfile = profile;
      isAdmin = profile?.role === 'admin';
      if (isAdmin) showAdminElements();
      updateUIForLoggedInUser();
      window.location.reload();
    } else if (event === 'SIGNED_OUT') {
      currentUser = null;
      currentProfile = null;
      isAdmin = false;
      hideAdminElements();
      updateUIForLoggedOutUser();
    }
  });
}

function showAdminElements() {
  document.querySelectorAll('.admin-only').forEach(el => el.classList.add('visible'));
  document.querySelectorAll('.admin-inline').forEach(el => el.classList.add('visible'));
  
  // Add dashboard link to nav
  const dashLink = document.createElement('a');
  dashLink.href = 'dashboard.html';
  dashLink.textContent = '⚡ Admin Panel';
  dashLink.style.color = 'var(--accent-gold)';
  dashLink.className = 'admin-only visible';
  document.querySelector('.nav-links')?.appendChild(dashLink);
  
  const mobileDashLink = document.createElement('a');
  mobileDashLink.href = 'dashboard.html';
  mobileDashLink.textContent = '⚡ Admin Panel';
  mobileDashLink.style.color = 'var(--accent-gold)';
  mobileDashLink.className = 'admin-only visible';
  document.getElementById('mobileNav')?.appendChild(mobileDashLink);
}

function hideAdminElements() {
  document.querySelectorAll('.admin-only').forEach(el => el.classList.remove('visible'));
  document.querySelectorAll('.admin-inline').forEach(el => el.classList.remove('visible'));
}

function updateUIForLoggedInUser() {
  document.querySelectorAll('.auth-login-btn').forEach(el => el.style.display = 'none');
  document.querySelectorAll('.auth-register-btn').forEach(el => el.style.display = 'none');
  document.querySelectorAll('.auth-logout-btn').forEach(el => el.style.display = 'inline-flex');
  document.querySelectorAll('.auth-user-name').forEach(el => {
    el.textContent = currentProfile?.full_name || currentUser?.email;
    el.style.display = 'inline';
  });
}

function updateUIForLoggedOutUser() {
  document.querySelectorAll('.auth-login-btn').forEach(el => el.style.display = 'inline-flex');
  document.querySelectorAll('.auth-register-btn').forEach(el => el.style.display = 'inline-flex');
  document.querySelectorAll('.auth-logout-btn').forEach(el => el.style.display = 'none');
  document.querySelectorAll('.auth-user-name').forEach(el => el.style.display = 'none');
}

async function logout() {
  await supabase.auth.signOut();
  window.location.href = 'index.html';
}

// ========== TOAST NOTIFICATIONS ==========
function showToast(message, type = 'success') {
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = message;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
}

// ========== API HELPERS ==========
async function fetchJobs() {
  const { data, error } = await supabase
    .from('jobs')
    .select('*')
    .eq('is_active', true)
    .order('created_at', { ascending: false });
  if (error) { console.error(error); return []; }
  return data;
}

async function fetchMarketplace(category = null) {
  let query = supabase.from('marketplace_items').select('*').eq('is_active', true);
  if (category && category !== 'all') query = query.eq('category', category);
  const { data } = await query.order('created_at', { ascending: false });
  return data || [];
}

async function fetchBlogPosts() {
  const { data } = await supabase.from('blog_posts').select('*').eq('published', true).order('created_at', { ascending: false });
  return data || [];
}

async function fetchWorkers() {
  const { data } = await supabase.from('workers').select('*').order('display_order');
  return data || [];
}

// ========== PAGE-SPECIFIC LOGIC ==========
function initPageSpecificLogic() {
  const path = window.location.pathname;

  if (path.includes('index.html') || path === '/' || path.endsWith('/frontend/')) {
    initHomePage();
  } else if (path.includes('jobs.html')) {
    initJobsPage();
  } else if (path.includes('marketplace.html')) {
    initMarketplacePage();
  } else if (path.includes('contact.html')) {
    initContactPage();
  } else if (path.includes('login.html')) {
    initLoginPage();
  } else if (path.includes('register.html')) {
    initRegisterPage();
  } else if (path.includes('dashboard.html')) {
    initDashboardPage();
  }
}

// ========== HOME PAGE ==========
async function initHomePage() {
  const jobs = await fetchJobs();
  const items = await fetchMarketplace();
  
  const featuredJobs = document.getElementById('featured-jobs');
  const featuredMarketplace = document.getElementById('featured-marketplace');
  
  if (featuredJobs) {
    featuredJobs.innerHTML = jobs.slice(0, 4).map(job => `
      <div class="card">
        <div class="card-icon">💼</div>
        <span class="badge badge-blue">${job.category || 'Job'}</span>
        <h3>${job.title}</h3>
        <p>${job.location || 'Remote'} · ${job.type || 'Full-time'}</p>
        <p style="color:var(--text-muted);font-size:0.85rem;">${(job.description || '').substring(0, 80)}...</p>
        <a href="jobs.html" class="card-link">View Details →</a>
      </div>
    `).join('') || '<p>No jobs available yet.</p>';
  }
  
  if (featuredMarketplace) {
    featuredMarketplace.innerHTML = items.slice(0, 4).map(item => `
      <div class="card">
        <span class="badge badge-gold">${item.category}</span>
        <h3>${item.title}</h3>
        <p style="font-size:1.2rem;font-weight:700;color:var(--accent-green);">$${item.price}</p>
        <p style="color:var(--text-muted);font-size:0.85rem;">${(item.description || '').substring(0, 60)}...</p>
      </div>
    `).join('') || '<p>No items available yet.</p>';
  }
}

// ========== JOBS PAGE ==========
async function initJobsPage() {
  const jobs = await fetchJobs();
  const container = document.getElementById('jobs-list');
  if (container) {
    container.innerHTML = jobs.map(job => `
      <div class="card">
        <span class="badge badge-blue">${job.category || 'Job'}</span>
        <h3>${job.title}</h3>
        <p>📍 ${job.location || 'Remote'} · 🕐 ${job.type || 'Full-time'}</p>
        <p>${job.description || ''}</p>
        ${job.salary ? `<p>💰 ${job.salary}</p>` : ''}
        <button class="btn btn-primary" onclick="applyForJob('${job.id}')">Apply Now</button>
      </div>
    `).join('');
  }
}

async function applyForJob(jobId) {
  if (!currentUser) {
    showToast('Please login to apply', 'error');
    window.location.href = 'login.html';
    return;
  }
  const { error } = await supabase.from('job_applications').insert({
    job_id: jobId,
    applicant_id: currentUser.id
  });
  if (error) showToast('Application failed', 'error');
  else showToast('Applied successfully! ✅');
}

// ========== MARKETPLACE PAGE ==========
async function initMarketplacePage() {
  await loadMarketplaceItems();
  
  const filterBtns = document.querySelectorAll('.filter-btn');
  filterBtns.forEach(btn => {
    btn.addEventListener('click', async () => {
      filterBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      await loadMarketplaceItems(btn.dataset.category);
    });
  });
}

async function loadMarketplaceItems(category = 'all') {
  const items = await fetchMarketplace(category);
  const container = document.getElementById('marketplace-list');
  if (container) {
    container.innerHTML = items.map(item => `
      <div class="card">
        <span class="badge badge-gold">${item.category.replace('_', ' ')}</span>
        <h3>${item.title}</h3>
        <p style="font-size:1.3rem;font-weight:700;color:var(--accent-green);">$${item.price}</p>
        <p>${item.description || ''}</p>
        <small style="color:var(--text-muted);">📞 ${item.seller_contact}</small>
      </div>
    `).join('') || '<p style="text-align:center;">No items in this category.</p>';
  }
}

// ========== CONTACT PAGE ==========
function initContactPage() {
  const form = document.getElementById('contact-form');
  if (form) {
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
      btn.textContent = 'Send Message';
      
      if (error) showToast('Error sending message', 'error');
      else {
        showToast('Message sent successfully! ✅');
        form.reset();
      }
    });
  }
}

// ========== LOGIN PAGE ==========
function initLoginPage() {
  const form = document.getElementById('login-form');
  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const btn = form.querySelector('button[type="submit"]');
      btn.disabled = true;
      btn.textContent = 'Logging in...';
      
      const { error } = await supabase.auth.signInWithPassword({
        email: form.email.value,
        password: form.password.value
      });
      
      if (error) {
        showToast(error.message, 'error');
        btn.disabled = false;
        btn.textContent = 'Login';
      } else {
        window.location.href = 'dashboard.html';
      }
    });
  }
  
  const googleBtn = document.getElementById('google-login');
  if (googleBtn) {
    googleBtn.addEventListener('click', async () => {
      await supabase.auth.signInWithOAuth({ 
        provider: 'google',
        options: { redirectTo: window.location.origin + '/dashboard.html' }
      });
    });
  }
}

// ========== REGISTER PAGE ==========
function initRegisterPage() {
  const form = document.getElementById('register-form');
  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const btn = form.querySelector('button[type="submit"]');
      btn.disabled = true;
      btn.textContent = 'Creating account...';
      
      const { error } = await supabase.auth.signUp({
        email: form.email.value,
        password: form.password.value,
        options: {
          data: { full_name: form.name.value }
        }
      });
      
      if (error) {
        showToast(error.message, 'error');
        btn.disabled = false;
        btn.textContent = 'Create Account';
      } else {
        showToast('Check your email to confirm! 📧');
        setTimeout(() => window.location.href = 'login.html', 2000);
      }
    });
  }
}

// ========== DASHBOARD PAGE ==========
async function initDashboardPage() {
  if (!currentUser) {
    window.location.href = 'login.html';
    return;
  }
  
  document.getElementById('dashboard-role').textContent = currentProfile?.role?.toUpperCase() || 'USER';
  document.getElementById('dashboard-name').textContent = currentProfile?.full_name || currentUser.email;
  
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
  // Pending agents
  const { data: agents } = await supabase
    .from('agents')
    .select('*, profiles(full_name, email)')
    .eq('status', 'pending');
  
  const agentsContainer = document.getElementById('admin-agents');
  if (agentsContainer) {
    agentsContainer.innerHTML = agents?.map(a => `
      <div class="card" style="margin-bottom:12px;">
        <p><strong>${a.profiles.full_name}</strong> (${a.profiles.email})</p>
        <button class="btn btn-primary" onclick="approveAgent('${a.id}')">Approve</button>
        <button class="btn btn-danger" onclick="rejectAgent('${a.id}')">Reject</button>
      </div>
    `).join('') || '<p>No pending agents.</p>';
  }
  
  // Messages
  const { data: messages } = await supabase
    .from('contact_messages')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(10);
  
  const msgsContainer = document.getElementById('admin-messages');
  if (msgsContainer) {
    msgsContainer.innerHTML = messages?.map(m => `
      <div class="card" style="margin-bottom:8px;">
        <p><strong>${m.name}</strong> (${m.email})</p>
        <p style="font-size:0.85rem;">${m.message.substring(0, 100)}</p>
        <small style="color:var(--text-muted);">${new Date(m.created_at).toLocaleString()}</small>
      </div>
    `).join('') || '<p>No messages.</p>';
  }
}

async function approveAgent(agentId) {
  await supabase.from('agents').update({ status: 'approved', approved_by: currentUser.id }).eq('id', agentId);
  showToast('Agent approved! ✅');
  loadAdminData();
}

async function rejectAgent(agentId) {
  await supabase.from('agents').update({ status: 'rejected' }).eq('id', agentId);
  showToast('Agent rejected.');
  loadAdminData();
}

async function loadAgentData() {
  const { data: agent } = await supabase
    .from('agents')
    .select('*')
    .eq('profile_id', currentUser.id)
    .single();
  
  if (agent) {
    document.getElementById('agent-earnings').textContent = agent.total_earnings || 0;
    document.getElementById('agent-rate').textContent = agent.commission_rate || 10;
    document.getElementById('agent-status').textContent = agent.status;
    
    const { data: transactions } = await supabase
      .from('commission_transactions')
      .select('*')
      .eq('agent_id', currentUser.id)
      .order('created_at', { ascending: false });
    
    const transContainer = document.getElementById('agent-transactions');
    if (transContainer) {
      transContainer.innerHTML = transactions?.map(t => `
        <tr>
          <td>${new Date(t.created_at).toLocaleDateString()}</td>
          <td>$${t.amount}</td>
          <td>${t.description || '-'}</td>
        </tr>
      `).join('') || '<tr><td colspan="3">No transactions yet.</td></tr>';
    }
  }
}

// ========== ADMIN: CREATE JOB ==========
async function createJob() {
  const title = document.getElementById('job-title').value;
  const description = document.getElementById('job-desc').value;
  const category = document.getElementById('job-category').value;
  const location = document.getElementById('job-location').value;
  
  const { error } = await supabase.from('jobs').insert({
    title, description, category, location,
    posted_by: currentUser.id
  });
  
  if (error) showToast('Error creating job', 'error');
  else {
    showToast('Job created! ✅');
    document.getElementById('job-title').value = '';
    document.getElementById('job-desc').value = '';
    loadAdminData();
  }
}

// ========== ADMIN: CREATE MARKETPLACE ITEM ==========
async function createMarketplaceItem() {
  const title = document.getElementById('item-title').value;
  const description = document.getElementById('item-desc').value;
  const category = document.getElementById('item-category').value;
  const price = document.getElementById('item-price').value;
  const seller_contact = document.getElementById('item-contact').value;
  
  const { error } = await supabase.from('marketplace_items').insert({
    title, description, category, price, seller_contact,
    posted_by: currentUser.id
  });
  
  if (error) showToast('Error creating item', 'error');
  else {
    showToast('Item created! ✅');
    document.getElementById('item-title').value = '';
    document.getElementById('item-desc').value = '';
    loadAdminData();
  }
}