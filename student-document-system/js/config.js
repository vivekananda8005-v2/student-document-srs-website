// js/config.js - FINAL & WORKING (2025)

const SUPABASE_URL = 'https://rfhgbuytxeurwiekhzgp.supabase.co';

// COPY THE FULL ANON KEY FROM SUPABASE DASHBOARD → API SETTINGS → "anon public"
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJmaGdidXl0eGV1cndpZWtoemdwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQyNDQxNDQsImV4cCI6MjA3OTgyMDE0NH0.ajm2uKgUbIj6P7z-jlTeyIUyhSY7G7FmvNVeldpP4tw';

window.supabase = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
window.STORAGE_BUCKET = 'documents';

// Global alert
window.showAlert = (message, type = 'info') => {
    const container = document.getElementById('alertContainer');
    if (!container) return;
    const alert = document.createElement('div');
    alert.className = `alert alert-${type} alert-dismissible fade show mt-3`;
    alert.innerHTML = `${message}<button type="button" class="btn-close" data-bs-dismiss="alert"></button>`;
    container.innerHTML = '';
    container.appendChild(alert);
    setTimeout(() => alert.remove(), 6000);
};

// Global date formatter – used in dashboard
window.formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit'
    });
};