// ═══════════════════════════════════════════════════════
//  CampusZero — Auth & Registration Module (API-backed)
// ═══════════════════════════════════════════════════════

const Auth = {
    generateId() {
        return 'CZ-' + Date.now().toString(36).toUpperCase() + '-' + Math.random().toString(36).substr(2, 4).toUpperCase();
    },

    async register(data) {
        const response = await fetch('/api/auth/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                institutionName: data.institutionName,
                campusLat: data.campusLat,
                campusLng: data.campusLng,
                campusAddress: data.campusAddress || '',
                adminName: data.adminName,
                adminEmail: data.adminEmail,
                avatarUrl: data.avatarUrl || null,
                bbox: data.bbox || null
            })
        });
        const result = await response.json();
        if (result.admin) {
            await Store.setAdmin(result.admin);
            await Store.setCampus({
                name: data.institutionName,
                lat: data.campusLat,
                lng: data.campusLng,
                address: data.campusAddress || '',
                bbox: data.bbox || null,
                buildings: [],
                sensorCount: 0
            });
        }
        return result.admin;
    },

    async login(email) {
        const response = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email })
        });
        if (!response.ok) return null;
        const { admin } = await response.json();
        if (admin) await Store.setAdmin(admin);
        return admin;
    },

    async mockGoogleLogin(adminName, email) {
        return await this.login(email);
    },

    async isAuthenticated() {
        return await Store.isLoggedIn();
    },

    async getCurrentAdmin() {
        return await Store.getAdmin();
    },

    async logout() {
        await Store.logout();
    }
};

window.Auth = Auth;
