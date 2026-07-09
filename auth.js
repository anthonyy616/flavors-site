// auth.js - GUARANTEED WORKING VERSION
console.log(' auth.js loaded - Starting authentication');


// GUARANTEED navigation update
async function updateNavigation() {
    console.log(' UPDATING NAVIGATION...');

    try {
        const { data: { session } } = await supabaseClient.auth.getSession();

        const navSection = document.getElementById('nav-auth-section');
        const mobileSection = document.getElementById('mobile-auth-section');

        console.log('Session exists:', !!session);
        console.log('Nav section found:', !!navSection);

        if (!navSection) {
            console.error(' CRITICAL: nav-auth-section element not found!');
            return;
        }

        if (session && session.user) {
            const firstName = session.user.user_metadata.first_name || 'User'; // Use session metadata directly (fallback if missing)
            console.log(' USER LOGGED IN: Showing welcome message');

            // DESKTOP - Show "Wishlist", "My Orders", "Hi, Name", + Logout
            navSection.innerHTML = `
                <div class="flex items-center space-x-4">
                    <a href="wishlist.html" class="text-[14px] font-semibold text-[#C8102E] hover:opacity-80 transition-colors flex items-center gap-1" style="font-family:'Inter',sans-serif;"><span class="sym" style="font-size:16px;">favorite</span> Wishlist</a>
                    <a href="orders.html" class="text-[14px] font-semibold text-[#605e5a] hover:text-[#3D1D16] transition-colors" style="font-family:'Inter',sans-serif;">My Orders</a>
                    <span class="text-red-300 font-medium">Hi, ${firstName}</span>
                    <button onclick="logout()" class="bg-red-600 hover:bg-red-700 px-4 py-2 rounded-full transition text-white text-[13px]">
                        Logout
                    </button>
                </div>
            `;

            // MOBILE - Show in mobile menu too
            if (mobileSection) {
                mobileSection.innerHTML = `
                    <div class="border-t border-amber-600 pt-3 mt-3 flex flex-col gap-3">
                        <a href="wishlist.html" class="w-full text-center py-3 rounded-xl border text-[#C8102E] font-semibold text-sm transition-colors hover:bg-[#e6e2dc]/40 flex items-center justify-center gap-2" style="font-family:'Inter',sans-serif; border-color:#d5c2bf;"><span class="sym" style="font-size:16px;">favorite</span> Wishlist</a>
                        <a href="orders.html" class="w-full text-center py-3 rounded-xl border text-[#3D1D16] font-semibold text-sm transition-colors hover:bg-[#e6e2dc]/40" style="font-family:'Inter',sans-serif; border-color:#d5c2bf;">My Orders</a>
                        <span class="text-red-300 block mb-2 text-center">Hi, ${firstName}</span>
                        <button onclick="logout()" class="text-red-300 hover:text-white w-full text-center">
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

        console.log(' Navigation updated successfully!');

    } catch (error) {
        console.error(' Navigation update failed:', error);
    }
}

// Logout function
async function logout() {
    // Clear local cart first to prevent shared-device leakage (A.4.6).
    if (typeof clearLocalCartOnLogout === 'function') clearLocalCartOnLogout();
    await supabaseClient.auth.signOut();
    window.location.href = 'index.html';
}

// Initialize auth on page load and listen for changes
function initAuth() {
    updateNavigation();

    // Listen for auth state changes (e.g., login/logout from other tabs or immediate updates)
    supabaseClient.auth.onAuthStateChange((event, session) => {
        console.log(`Auth state changed: ${event}`);
        updateNavigation();
    });
}

// Call initAuth on page load
document.addEventListener('DOMContentLoaded', initAuth);

// Make functions global
window.logout = logout;
window.updateNavigation = updateNavigation;
