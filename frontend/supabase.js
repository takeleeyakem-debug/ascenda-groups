// ========== SUPABASE CONFIG ==========
const SUPABASE_URL = 'https://rfogomnbicceentrhymy.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJmb2dvbW5iaWNjZWVudHJoeW15Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAyNDQwOTEsImV4cCI6MjA5NTgyMDA5MX0.wke5a7GEdU2oepfKfSD-rthLTEmpk3GqVfFRM_MjZ9c';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJmb2dvbW5iaWNjZWVudHJoeW15Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MDI0NDA5MSwiZXhwIjoyMDk1ODIwMDkxfQ.ckB_ZWAM7gBgaK9yG31z8p8BY1hKAZ4l8Q1duUkEzGY';
const LOGO_URL = 'https://rfogomnbicceentrhymy.supabase.co/storage/v1/object/public/Ascenda%20pics/logo.png';
const BANNER_URL = 'https://rfogomnbicceentrhymy.supabase.co/storage/v1/object/public/Ascenda%20pics/banner.png';

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
const supabaseAdmin = window.supabase.createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);