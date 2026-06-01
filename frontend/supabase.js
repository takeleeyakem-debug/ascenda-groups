// Supabase Configuration
const SUPABASE_URL = 'https://rfogomnbicceentrhymy.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJmb2dvbW5iaWNjZWVudHJoeW15Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAyNDQwOTEsImV4cCI6MjA5NTgyMDA5MX0.wke5a7GEdU2oepfKfSD-rthLTEmpk3GqVfFRM_MjZ9c';

// Initialize Supabase client
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Check if user is logged in
async function checkAuth() {
    const { data: { user } } = await supabase.auth.getUser();
    return user;
}

// Get user profile
async function getUserProfile(userId) {
    const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
    
    if (error) {
        console.error('Error fetching profile:', error);
        return null;
    }
    return data;
}

// Check if user is admin
function isAdmin(profile) {
    if (!profile) return false;
    return profile.role === 'admin' || 
           profile.role === 'ceo' || 
           profile.email === 'takeleeyakem@gmail.com';
}