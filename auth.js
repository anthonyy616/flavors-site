// auth.js - GUARANTEED WORKING VERSION
console.log(' auth.js loaded - Starting authentication');

const supabase = window.supabaseClient;

// GUARANTEED navigation update
async function updateNavigation() {
    console.log(' UPDATING NAVIGATION...');

    try {
        const { data: { session } } = await supabase.auth.getSession();

        const navSection = document.getElementById('nav-auth-section');
        const mobileSection = document.getElementById('mobile-auth-section');

        console.log('Session exists:', !!session);
        console.log('Nav section found:', !!navSection);

        if (!navSection) {
            console.error('❌ CRITICAL: nav-auth-section element not found!');
            return;
        }

        if (session && session.user) {
            const firstName = session.user.user_metadata.first_name || 'User'; // Use session metadata directly (fallback if missing)
            console.log('✅ USER LOGGED IN: Showing welcome message');

            // DESKTOP - Show "Hi, Name" + Logout
            navSection.innerHTML = `
                <div class="flex items-center space-x-4">
                    <span class="text-amber-300 font-medium">Hi, ${firstName}</span>
                    <button onclick="logout()" class="bg-amber-600 hover:bg-amber-700 px-4 py-2 rounded-full transition text-white">
                        Logout
                    </button>
                </div>
            `;

            // MOBILE - Show in mobile menu too
            if (mobileSection) {
                mobileSection.innerHTML = `
                    <div class="border-t border-amber-600 pt-3 mt-3">
                        <span class="text-amber-300 block mb-2">Hi, ${firstName}</span>
                        <button onclick="logout()" class="text-amber-300 hover:text-white">
                            Logout
                        </button>
                    </div>
                `;
            }

        } else {
            console.log('👤 USER NOT LOGGED IN: Showing login buttons');

            // DESKTOP - Show Login/Signup buttons
            navSection.innerHTML = `
                <div class="flex items-center space-x-4">
                    <a href="login.html" class="hover:text-amber-300 transition">Login</a>
                    <a href="signup.html" class="bg-amber-600 hover:bg-amber-700 px-4 py-2 rounded-full transition text-white">
                        Sign Up
                    </a>
                </div>
            `;

            // MOBILE
            if (mobileSection) {
                mobileSection.innerHTML = `
                    <a href="login.html" class="hover:text-amber-300 transition">Login</a>
                `;
            }
        }

        console.log('✅ Navigation updated successfully!');

    } catch (error) {
        console.error('❌ Navigation update failed:', error);
    }
}

// Logout function
async function logout() {
    await supabase.auth.signOut();
    window.location.href = 'index.html';
}

// Initialize auth on page load and listen for changes
function initAuth() {
    updateNavigation();

    // Listen for auth state changes (e.g., login/logout from other tabs or immediate updates)
    supabase.auth.onAuthStateChange((event, session) => {
        console.log(`Auth state changed: ${event}`);
        updateNavigation();
    });
}

// Call initAuth on page load
document.addEventListener('DOMContentLoaded', initAuth);

// Make functions global
window.logout = logout;
window.updateNavigation = updateNavigation;
