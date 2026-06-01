// ASCENDA GROUPS - SUPABASE CONFIG
window.SUPABASE_URL = 'https://rfogomnbicceentrhymy.supabase.co';
window.SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJmb2dvbW5iaWNjZWVudHJoeW15Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAyNDQwOTEsImV4cCI6MjA5NTgyMDA5MX0.wke5a7GEdU2oepfKfSD-rthLTEmpk3GqVfFRM_MjZ9c';
window.LOGO_URL = 'https://rfogomnbicceentrhymy.supabase.co/storage/v1/object/public/Ascenda%20pics/logo.png';
window.BANNER_URL = 'https://rfogomnbicceentrhymy.supabase.co/storage/v1/object/public/Ascenda%20pics/banner.png';
window.CEO_EMAIL = 'takeleeyakem@gmail.com';
window.TELEGRAM_URL = 'https://t.me/ascendagroups';
window.COPYRIGHT_YEAR = '2026';

(function() {
  if (window.supabase && !window.supabaseClient) {
    window.supabaseClient = window.supabase.createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, storage: window.localStorage }
    });
  }
})();