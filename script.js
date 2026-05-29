/**
 * Professional Dashboard - Complete Version
 * Features: Hash Routing, Dark Mode, Favorites, Notifications, Loading States
 */

// ========== ROUTER (Hash-based Routing - No 404 Error) ==========
class Router {
    constructor() {
        this.routes = {
            'dashboard': 'dashboard',
            'analytics': 'analytics',
            'products': 'products',
            'customers': 'customers',
            'settings': 'settings'
        };

        window.addEventListener('hashchange', () => this.handleRoute());
        this.handleRoute();
    }

    getCurrentRoute() {
        const hash = window.location.hash.slice(1) || 'dashboard';
        return this.routes[hash] || 'dashboard';
    }

    handleRoute() {
        const page = this.getCurrentRoute();
        this.updateActiveNav(page);
        PageManager.loadPage(page);
    }

    updateActiveNav(page) {
        document.querySelectorAll('.nav-item').forEach(nav => {
            const route = nav.getAttribute('data-route');
            if (route === page) nav.classList.add('active');
            else nav.classList.remove('active');
        });
    }
}

// ========== CONFIGURATION ==========
const CONFIG = {
    API: {
        BASE_URL: 'https://dummyjson.com',
        PRODUCTS: '/products',
        CATEGORIES: '/products/categories',
        USERS: '/users',
        CARTS: '/carts'
    },
    STORAGE_KEYS: {
        FAVORITES: 'dashboard_favorites',
        THEME: 'dashboard_theme',
        SIDEBAR: 'dashboard_sidebar',
        USER: 'dashboard_user',
        NOTIFICATIONS: 'dashboard_notifications'
    }
};

// ========== APP STATE ==========
const AppState = {
    currentPage: 'dashboard',
    currentFilter: 'all',
    currentSort: 'name',
    searchQuery: '',
    products: [],
    favorites: [],
    stats: { revenue: 0, customers: 0, orders: 0, products: 0 },
    theme: 'dark',
    sidebarCollapsed: false,
    charts: {},
    notifications: [],
    user: {
        name: 'Moh Shahabi',
        email: 'mshshahabi55@google.com',
        role: 'Administrator'
    }
};

// ========== DOM ELEMENTS ==========
const DOM = {
    sidebar: document.getElementById('sidebar'),
    sidebarToggle: document.getElementById('sidebarToggle'),
    mobileMenuBtn: document.getElementById('mobileMenuBtn'),
    navItems: document.querySelectorAll('.nav-item'),
    themeToggle: document.getElementById('themeToggle'),
    globalSearch: document.getElementById('globalSearch'),
    favoritesBtn: document.getElementById('favoritesBtn'),
    favoritesSidebar: document.getElementById('favoritesSidebar'),
    closeFavorites: document.getElementById('closeFavorites'),
    favoritesContent: document.getElementById('favoritesContent'),
    favoritesCount: document.getElementById('favoritesCount'),
    dynamicContent: document.getElementById('dynamicContent'),
    overlay: document.getElementById('overlay'),
    notificationsBtn: document.getElementById('notificationsBtn'),
    notificationsBadge: document.getElementById('notificationsBadge'),
    toastContainer: document.getElementById('toastContainer'),
    userName: document.getElementById('userName'),
    userRole: document.getElementById('userRole'),
    userAvatar: document.getElementById('userAvatar')
};

// ========== STORAGE MANAGER ==========
const StorageManager = {
    get(key, defaultValue = null) {
        try {
            const value = localStorage.getItem(key);
            return value ? JSON.parse(value) : defaultValue;
        } catch { return defaultValue; }
    },

    set(key, value) { localStorage.setItem(key, JSON.stringify(value)); },

    getFavorites() { return this.get(CONFIG.STORAGE_KEYS.FAVORITES, []); },
    saveFavorites(favorites) { this.set(CONFIG.STORAGE_KEYS.FAVORITES, favorites); this.updateFavoritesCount(favorites.length); },

    getTheme() { return this.get(CONFIG.STORAGE_KEYS.THEME, 'dark'); },
    saveTheme(theme) { this.set(CONFIG.STORAGE_KEYS.THEME, theme); },

    getSidebarState() { return this.get(CONFIG.STORAGE_KEYS.SIDEBAR, false); },
    saveSidebarState(collapsed) { this.set(CONFIG.STORAGE_KEYS.SIDEBAR, collapsed); },

    getUser() { return this.get(CONFIG.STORAGE_KEYS.USER, AppState.user); },
    saveUser(user) { this.set(CONFIG.STORAGE_KEYS.USER, user); this.updateUserUI(user); },

    getNotifications() { return this.get(CONFIG.STORAGE_KEYS.NOTIFICATIONS, []); },
    saveNotifications(notifications) { this.set(CONFIG.STORAGE_KEYS.NOTIFICATIONS, notifications); this.updateNotificationsBadge(notifications); },

    updateFavoritesCount(count) { if (DOM.favoritesCount) DOM.favoritesCount.textContent = count; },

    updateNotificationsBadge(notifications) {
        const unread = notifications.filter(n => !n.read).length;
        if (DOM.notificationsBadge) {
            DOM.notificationsBadge.textContent = unread;
            DOM.notificationsBadge.style.display = unread > 0 ? 'flex' : 'none';
        }
    },

    updateUserUI(user) {
        if (DOM.userName) DOM.userName.textContent = user.name;
        if (DOM.userRole) DOM.userRole.textContent = user.role;
    }
};

// ========== API SERVICE ==========
const APIService = {
    async fetch(endpoint) {
        const response = await fetch(endpoint);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return await response.json();
    },

    async getProducts() {
        try {
            const data = await this.fetch('https://dummyjson.com/products?limit=100');

            return data.products.map(p => ({
                id: p.id,
                title: p.title,
                price: p.price,
                description: p.description,
                category: p.category,
                image: p.thumbnail,
                rating: p.rating,
                sales: Math.floor(Math.random() * 1000) + 50
            }));

        } catch (err) {
            console.error("Products API failed:", err);

            // 👇 fallback
            return [];
        }
    },

    async getCategories() {
        const data = await this.fetch('https://dummyjson.com/products/categories');

        // 👇 normalize کن
        return data.map(c => {
            if (typeof c === 'string') return c;
            return c.name || c.slug || '';
        });
    },

    async getUsers() {
        const data = await this.fetch('https://dummyjson.com/users?limit=100');

        return data.users.map(u => ({
            id: u.id,
            email: u.email,
            phone: u.phone,
            name: {
                firstname: u.firstName,
                lastname: u.lastName
            }
        }));
    },

    async getCarts() {
        const data = await this.fetch('https://dummyjson.com/carts?limit=100');

        return data.carts.map(c => ({
            id: c.id,
            userId: c.userId,
            products: c.products.map(p => ({
                productId: p.id,
                quantity: p.quantity
            }))
        }));
    },

    async getStats() {
        const [products, users, carts] = await Promise.all([
            this.getProducts(),
            this.getUsers(),
            this.getCarts()
        ]);

        let totalRevenue = 0;

        carts.forEach(cart => {
            cart.products.forEach(item => {
                const product = products.find(p => p.id === item.productId);
                if (product) totalRevenue += product.price * item.quantity;
            });
        });

        return {
            revenue: totalRevenue,
            customers: users.length,
            orders: carts.length,
            products: products.length
        };
    }
};

// ========== CHART DATA ==========
const ChartData = {
    getRevenueData(period) {
        const data = {
            week: { labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'], values: [12500, 19200, 15400, 24800, 22300, 30500, 28100] },
            month: { labels: ['Week 1', 'Week 2', 'Week 3', 'Week 4'], values: [85200, 92400, 88300, 105200] },
            year: { labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'], values: [65200, 72400, 81300, 79200, 83400, 97200, 102400, 115200, 108500, 124300, 132800, 156400] }
        };
        return data[period];
    },

    getCategoryData(products) {
        if (products && products.length > 0) {
            const categoryCount = {};
            products.forEach(p => { categoryCount[p.category] = (categoryCount[p.category] || 0) + 1; });
            return { labels: Object.keys(categoryCount), values: Object.values(categoryCount) };
        }
        return { labels: ['Electronics', 'Clothing', 'Jewelery', 'Home'], values: [35, 28, 22, 15] };
    }
};

// ========== CHART MANAGER ==========
const ChartManager = {
    initRevenueChart() {
        const canvas = document.getElementById('revenueChart');
        if (!canvas) return;
        const data = ChartData.getRevenueData('week');

        AppState.charts.revenue = new Chart(canvas, {
            type: 'line',
            data: {
                labels: data.labels,
                datasets: [{
                    label: 'Revenue ($)',
                    data: data.values,
                    borderColor: '#6c63ff',
                    backgroundColor: 'rgba(108, 99, 255, 0.1)',
                    borderWidth: 3,
                    tension: 0.4,
                    fill: true
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: { y: { beginAtZero: true, ticks: { callback: (v) => '$' + v.toLocaleString() } } }
            }
        });
    },

    initCategoryChart() {
        const canvas = document.getElementById('categoryChart');
        if (!canvas) return;
        const data = ChartData.getCategoryData(AppState.products);

        AppState.charts.category = new Chart(canvas, {
            type: 'doughnut',
            data: {
                labels: data.labels.map(l => l.charAt(0).toUpperCase() + l.slice(1)),
                datasets: [{
                    data: data.values,
                    backgroundColor: ['#6c63ff', '#9d4edd', '#06ffa5', '#ffb347', '#ff6b6b'],
                    borderWidth: 0
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { position: 'bottom' } },
                cutout: '65%'
            }
        });
    },

    updateRevenueChart(period) {
        if (AppState.charts.revenue) {
            const data = ChartData.getRevenueData(period);
            AppState.charts.revenue.data.labels = data.labels;
            AppState.charts.revenue.data.datasets[0].data = data.values;
            AppState.charts.revenue.update();
        }
    }
};

// ========== UI COMPONENTS ==========
const UI = {
    showLoading() {
        return `<div class="loading-container"><div class="loading-spinner"></div><p class="loading-text">Loading data...</p></div>`;
    },

    showSkeletonDashboard() {
        return `
            <div class="skeleton-stats">
                ${Array(4).fill(0).map(() => `
                    <div class="skeleton-card">
                        <div class="skeleton-icon loading-skeleton"></div>
                        <div class="skeleton-line medium loading-skeleton" style="margin-top: 15px;"></div>
                        <div class="skeleton-line long loading-skeleton"></div>
                        <div class="skeleton-line short loading-skeleton"></div>
                    </div>
                `).join('')}
            </div>
            <div class="skeleton-chart"><div class="skeleton-chart-header loading-skeleton"></div><div class="skeleton-chart-body loading-skeleton"></div></div>
            <div class="skeleton-chart"><div class="skeleton-chart-header loading-skeleton"></div><div class="skeleton-chart-body loading-skeleton"></div></div>
        `;
    },

    showEmptyProducts(message, action) {
        return `<div class="empty-state"><div class="empty-state-icon"><i class="fas fa-box-open"></i></div><h3>${message}</h3><p>Try adjusting your search or filter.</p>${action ? `<button class="btn-primary" onclick="${action}">Clear Filters</button>` : ''}</div>`;
    },

    showEmptyFavorites() {
        return `<div class="empty-state"><div class="empty-state-icon"><i class="fas fa-heart"></i></div><h3>No favorites yet</h3><p>Click the heart icon on products to add them.</p></div>`;
    },

    showEmptyCustomers() {
        return `<div class="empty-state"><div class="empty-state-icon"><i class="fas fa-users"></i></div><h3>No customers found</h3><p>Your customer list is empty.</p></div>`;
    }
};

// ========== NOTIFICATION MANAGER ==========
const NotificationManager = {
    init() {
        AppState.notifications = StorageManager.getNotifications();
        StorageManager.updateNotificationsBadge(AppState.notifications);

        if (DOM.notificationsBtn) {
            DOM.notificationsBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.showPanel();
            });
        }

        document.addEventListener('click', (e) => {
            const panel = document.getElementById('notificationsPanel');
            if (panel && !panel.contains(e.target) && e.target !== DOM.notificationsBtn) {
                panel?.classList.add('hidden');
            }
        });
    },

    showPanel() {
        let panel = document.getElementById('notificationsPanel');
        if (!panel) {
            panel = document.createElement('div');
            panel.id = 'notificationsPanel';
            panel.className = 'notifications-panel hidden';
            document.body.appendChild(panel);
        }

        panel.innerHTML = `
            <div class="notifications-header">
                <h4>Notifications</h4>
                <button id="clearAllNotifications">Clear all</button>
            </div>
            <div class="notifications-list" id="notificationsList"></div>
        `;

        this.renderList();
        panel.classList.toggle('hidden');

        document.getElementById('clearAllNotifications')?.addEventListener('click', () => {
            this.clearAll();
            panel.classList.add('hidden');
        });
    },

    renderList() {
        const list = document.getElementById('notificationsList');
        if (!list) return;

        if (AppState.notifications.length === 0) {
            list.innerHTML = '<div style="padding:40px;text-align:center"><i class="fas fa-bell-slash"></i><p>No notifications</p></div>';
            return;
        }

        list.innerHTML = AppState.notifications.slice(0, 10).map(n => `
            <div class="notification-item ${!n.read ? 'unread' : ''}" onclick="NotificationManager.markAsRead(${n.id})">
                <div class="notification-title">${n.title}</div>
                <div class="notification-message">${n.message}</div>
                <div class="notification-time">${this.formatTime(n.timestamp)}</div>
            </div>
        `).join('');
    },

    formatTime(dateStr) {
        const date = new Date(dateStr);
        const now = new Date();
        const diff = Math.floor((now - date) / 1000);
        if (diff < 60) return 'Just now';
        if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
        if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
        return `${Math.floor(diff / 86400)}d ago`;
    },

    markAsRead(id) {
        const notification = AppState.notifications.find(n => n.id === id);
        if (notification) {
            notification.read = true;
            StorageManager.saveNotifications(AppState.notifications);
            this.renderList();
            StorageManager.updateNotificationsBadge(AppState.notifications);
        }
    },

    clearAll() {
        AppState.notifications = [];
        StorageManager.saveNotifications(AppState.notifications);
        this.renderList();
        StorageManager.updateNotificationsBadge(AppState.notifications);
        this.showToast('Cleared', 'All notifications cleared', 'info');
    },

    add(title, message, type = 'info') {
        const notification = {
            id: Date.now(),
            title,
            message,
            type,
            timestamp: new Date().toISOString(),
            read: false
        };

        AppState.notifications.unshift(notification);
        StorageManager.saveNotifications(AppState.notifications);
        StorageManager.updateNotificationsBadge(AppState.notifications);
        this.showToast(title, message, type);
        this.renderList();
    },

    showToast(title, message, type) {
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        const icons = { success: 'fa-check-circle', error: 'fa-exclamation-circle', warning: 'fa-exclamation-triangle', info: 'fa-info-circle' };
        toast.innerHTML = `<i class="fas ${icons[type]}"></i><div><strong>${title}</strong><div style="font-size:0.85rem">${message}</div></div>`;
        DOM.toastContainer?.appendChild(toast);
        setTimeout(() => { toast.remove(); }, 4000);
    }
};

// ========== FAVORITES MANAGER ==========
const FavoritesManager = {
    init() {
        AppState.favorites = StorageManager.getFavorites();
        StorageManager.updateFavoritesCount(AppState.favorites.length);
    },

    isFavorite(id) { return AppState.favorites.some(item => item.id === id); },

    async toggle(id) {
        if (this.isFavorite(id)) {
            this.remove(id);
            NotificationManager.add('Removed', 'Item removed from favorites', 'info');
        } else {
            await this.add(id);
            NotificationManager.add('Added', 'Item added to favorites', 'success');
        }
        this.updateUI();
    },

    async add(id) {
        let product = AppState.products.find(p => p.id === id);

        if (!product) {
            // Fallback: refresh product list if not available (network maybe delayed).
            AppState.products = await APIService.getProducts();
            product = AppState.products.find(p => p.id === id);
        }

        if (product && !this.isFavorite(id)) {
            AppState.favorites.push(product);
            StorageManager.saveFavorites(AppState.favorites);
        }
    },

    remove(id) {
        AppState.favorites = AppState.favorites.filter(item => item.id !== id);
        StorageManager.saveFavorites(AppState.favorites);
        this.updateUI();
    },

    updateUI() {
        document.querySelectorAll('.favorite-icon').forEach(btn => {
            const id = parseInt(btn.getAttribute('data-id'), 10);
            if (!Number.isNaN(id) && this.isFavorite(id)) btn.classList.add('active');
            else btn.classList.remove('active');
        });
        this.render();
    },

    render() {
        if (!DOM.favoritesContent) return;
        if (AppState.favorites.length === 0) {
            DOM.favoritesContent.innerHTML = UI.showEmptyFavorites();
            return;
        }
        DOM.favoritesContent.innerHTML = AppState.favorites.map(item => `
            <div class="favorite-item" onclick="PageManager.showProductDetails(${item.id})">
                <img src="${item.image || 'https://via.placeholder.com/60'}" alt="${item.title}">
                <div class="favorite-item-info">
                    <h4>${item.title.substring(0, 40)}...</h4>
                    <p>$${item.price} | ⭐ ${item.rating}</p>
                </div>
                <button class="remove-favorite" onclick="event.stopPropagation(); FavoritesManager.remove(${item.id})"><i class="fas fa-trash"></i></button>
            </div>
        `).join('');
    }
};

// ========== PAGE MANAGER ==========
const PageManager = {
    async loadPage(page) {
        AppState.currentPage = page;
        DOM.dynamicContent.innerHTML = UI.showLoading();

        try {
            switch (page) {
                case 'dashboard': await this.loadDashboard(); break;
                case 'analytics': await this.loadAnalytics(); break;
                case 'products': await this.loadProducts(); break;
                case 'customers': await this.loadCustomers(); break;
                case 'settings': await this.loadSettings(); break;
            }
        } catch (error) {
            DOM.dynamicContent.innerHTML = `<div class="empty-state"><div class="empty-state-icon"><i class="fas fa-exclamation-triangle"></i></div><h3>Error</h3><p>${error.message}</p><button class="btn-primary" onclick="PageManager.loadPage('${page}')">Try Again</button></div>`;
        }
    },

    async loadDashboard() {
        DOM.dynamicContent.innerHTML = UI.showSkeletonDashboard();

        const stats = await APIService.getStats();
        AppState.stats = stats;

        DOM.dynamicContent.innerHTML = `
            <div class="welcome-section"><h1>Welcome back, ${StorageManager.getUser().name}! 👋</h1><p>Here's what's happening with your business today.</p></div>
            <div class="stats-grid" id="statsGrid"></div>
            <div class="charts-grid">
                <div class="chart-card"><div class="chart-header"><h3 class="chart-title">Revenue Overview</h3><div class="chart-actions"><button class="chart-filter active" data-period="week">Week</button><button class="chart-filter" data-period="month">Month</button><button class="chart-filter" data-period="year">Year</button></div></div><div class="chart-container"><canvas id="revenueChart"></canvas></div></div>
                <div class="chart-card"><div class="chart-header"><h3 class="chart-title">Sales by Category</h3></div><div class="chart-container"><canvas id="categoryChart"></canvas></div></div>
            </div>
            <div class="table-section"><div class="table-header"><h3>Top Products</h3><div class="table-filters"><select id="categoryFilter" class="filter-select"><option value="all">All Categories</option></select><select id="sortFilter" class="filter-select"><option value="name">Sort by Name</option><option value="price">Sort by Price</option><option value="sales">Sort by Sales</option><option value="rating">Sort by Rating</option></select></div></div><div class="table-wrapper"><table class="data-table"><thead><tr><th>Product</th><th>Category</th><th>Price</th><th>Sales</th><th>Rating</th><th>Actions</th></tr></thead><tbody id="tableBody"></tbody></table></div></div>
        `;

        this.renderStats(stats);
        await this.loadCategories();
        ChartManager.initRevenueChart();
        ChartManager.initCategoryChart();
        await this.loadProductsTable();

        document.getElementById('categoryFilter')?.addEventListener('change', (e) => { AppState.currentFilter = e.target.value; this.loadProductsTable(); });
        document.getElementById('sortFilter')?.addEventListener('change', (e) => { AppState.currentSort = e.target.value; this.loadProductsTable(); });
        document.querySelectorAll('.chart-filter').forEach(filter => {
            filter.addEventListener('click', () => {
                document.querySelectorAll('.chart-filter').forEach(f => f.classList.remove('active'));
                filter.classList.add('active');
                ChartManager.updateRevenueChart(filter.dataset.period);
            });
        });
    },

    renderStats(stats) {
        const statsGrid = document.getElementById('statsGrid');
        if (!statsGrid) return;
        const statsArray = [
            { icon: 'fa-chart-line', title: 'Total Revenue', value: `$${stats.revenue.toLocaleString()}`, change: '+12.5%', positive: true },
            { icon: 'fa-users', title: 'Total Customers', value: stats.customers.toLocaleString(), change: '+23.2%', positive: true },
            { icon: 'fa-shopping-cart', title: 'Total Orders', value: stats.orders.toLocaleString(), change: '-3.1%', positive: false },
            { icon: 'fa-box', title: 'Products', value: stats.products.toLocaleString(), change: '+5.7%', positive: true }
        ];
        statsGrid.innerHTML = statsArray.map(s => `
            <div class="stat-card"><div class="stat-icon"><i class="fas ${s.icon}"></i></div><div class="stat-info"><h3>${s.title}</h3><div class="stat-value">${s.value}</div><span class="stat-change ${s.positive ? 'positive' : 'negative'}">${s.change}</span></div></div>
        `).join('');
    },

    async loadCategories() {
        const categories = await APIService.getCategories();
        const filter = document.getElementById('categoryFilter');
        if (filter) {
            filter.innerHTML = '<option value="all">All Categories</option>' + categories.map(c => `<option value="${c}">${c.charAt(0).toUpperCase() + c.slice(1)}</option>`).join('');
        }
    },

    async loadProductsTable() {
        const tbody = document.getElementById('tableBody');
        if (!tbody) return;

        let products = [...AppState.products];
        if (AppState.currentFilter !== 'all') products = products.filter(p => p.category === AppState.currentFilter);
        if (AppState.searchQuery) products = products.filter(p => p.title.toLowerCase().includes(AppState.searchQuery.toLowerCase()));

        switch (AppState.currentSort) {
            case 'price': products.sort((a, b) => a.price - b.price); break;
            case 'sales': products.sort((a, b) => b.sales - a.sales); break;
            case 'rating': products.sort((a, b) => b.rating - a.rating); break;
            default: products.sort((a, b) => a.title.localeCompare(b.title));
        }

        if (products.length === 0) {
            tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:60px"><div style="font-size:3rem"><i class="fas fa-box-open"></i></div><p>No products found</p><button class="btn-primary" onclick="PageManager.clearSearch()">Clear Search</button></td></tr>`;
            return;
        }

        tbody.innerHTML = products.slice(0, 10).map(p => `
            <tr>
                <td><div style="display:flex;align-items:center;gap:10px"><img src="${p.image}" style="width:40px;height:40px;object-fit:contain"><span>${p.title.substring(0, 40)}...</span></div></td>
                <td>${p.category}</td>
                <td><strong>$${p.price}</strong></td>
                <td>${p.sales}</td>
                <td>⭐ ${p.rating}</td>
                <td><button class="favorite-icon ${FavoritesManager.isFavorite(p.id) ? 'active' : ''}" data-id="${p.id}" onclick="FavoritesManager.toggle(${p.id})"><i class="fas fa-heart"></i></button></td>
            </tr>
        `).join('');
    },

    async loadProducts() {
        let products = [...AppState.products];
        if (AppState.searchQuery) products = products.filter(p => p.title.toLowerCase().includes(AppState.searchQuery.toLowerCase()));

        DOM.dynamicContent.innerHTML = `
            <div class="products-page"><div class="page-header"><h1>Products Management</h1><button class="btn-primary" onclick="PageManager.showAddProduct()"><i class="fas fa-plus"></i> Add Product</button></div>
            <div class="products-grid" id="productsGrid"></div></div>
        `;

        const grid = document.getElementById('productsGrid');
        if (!grid) return;

        if (products.length === 0) {
            grid.innerHTML = UI.showEmptyProducts(AppState.searchQuery ? `No results for "${AppState.searchQuery}"` : 'No products available', 'PageManager.clearSearch()');
            return;
        }

        grid.innerHTML = products.map(p => `
            <div class="product-card" onclick="PageManager.showProductDetails(${p.id})">
                <img src="${p.image}" alt="${p.title}">
                <div class="product-card-info">
                    <div class="product-card-title">${p.title.substring(0, 50)}</div>
                    <div class="product-card-price">$${p.price}</div>
                    <div style="display:flex;justify-content:space-between;align-items:center">
                        <span>⭐ ${p.rating}</span>
                        <button class="favorite-icon ${FavoritesManager.isFavorite(p.id) ? 'active' : ''}" data-id="${p.id}" onclick="event.stopPropagation(); FavoritesManager.toggle(${p.id})"><i class="fas fa-heart"></i></button>
                    </div>
                </div>
            </div>
        `).join('');
    },

    async loadCustomers() {
        DOM.dynamicContent.innerHTML = UI.showLoading();

        const users = await APIService.getUsers();
        const carts = await APIService.getCarts();
        const products = await APIService.getProducts();

        const spending = {};
        carts.forEach(cart => {
            let total = 0;
            cart.products.forEach(item => {
                const product = products.find(p => p.id === item.productId);
                if (product) total += product.price * item.quantity;
            });
            spending[cart.userId] = (spending[cart.userId] || 0) + total;
        });

        if (users.length === 0) {
            DOM.dynamicContent.innerHTML = UI.showEmptyCustomers();
            return;
        }

        DOM.dynamicContent.innerHTML = `
            <div class="customers-page"><div class="page-header"><h1>Customer Management <span style="font-size:0.9rem; color:var(--text-secondary)">(${users.length} total customers)</span></h1><button class="btn-primary" onclick="PageManager.showAddCustomer()"><i class="fas fa-user-plus"></i> Add Customer</button></div>
            <div class="table-wrapper"><table class="data-table"><thead><tr><th>Customer</th><th>Email</th><th>Phone</th><th>Orders</th><th>Total Spent</th><th>Actions</th></tr></thead><tbody id="customersTableBody"></tbody></table></div></div>
        `;

        const tbody = document.getElementById('customersTableBody');
        if (tbody) {
            tbody.innerHTML = users.map(user => `
                <tr onclick="PageManager.showCustomerDetails(${user.id})">
                    <td><strong>${user.name.firstname} ${user.name.lastname}</strong></td>
                    <td>${user.email}</td>
                    <td>${user.phone || 'N/A'}</td>
                    <td>${carts.filter(cart => cart.userId === user.id).length}</td>
                    <td><strong>$${spending[user.id]?.toLocaleString() || 0}</strong></td>
                    <td><button class="favorite-icon" onclick="event.stopPropagation(); NotificationManager.add('Contact', 'Email sent to ${user.email}', 'info')"><i class="fas fa-envelope"></i></button></td>
                </tr>
            `).join('');
        }
    },

    async loadAnalytics() {
        DOM.dynamicContent.innerHTML = UI.showLoading();

        setTimeout(() => {
            DOM.dynamicContent.innerHTML = `
                <div class="analytics-page"><div class="page-header"><h1>Advanced Analytics</h1></div>
                <div class="charts-grid">
                    <div class="chart-card"><div class="chart-header"><h3 class="chart-title">Sales Trend</h3></div><div class="chart-container"><canvas id="salesTrendChart"></canvas></div></div>
                    <div class="chart-card"><div class="chart-header"><h3 class="chart-title">Category Performance</h3></div><div class="chart-container"><canvas id="performanceChart"></canvas></div></div>
                </div>
                <div class="table-section"><div class="table-header"><h3>Top Products</h3></div><div class="table-wrapper"><table class="data-table"><thead><tr><th>Rank</th><th>Product</th><th>Sales</th><th>Revenue</th></tr></thead><tbody id="topProductsTable"></tbody></table></div></div></div>
            `;

            new Chart(document.getElementById('salesTrendChart'), {
                type: 'bar',
                data: { labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'], datasets: [{ label: 'Sales', data: [65, 78, 82, 91, 88, 95], backgroundColor: '#6c63ff' }] },
                options: { responsive: true, maintainAspectRatio: false }
            });

            new Chart(document.getElementById('performanceChart'), {
                type: 'radar',
                data: { labels: ['Electronics', 'Clothing', 'Jewelery', 'Home'], datasets: [{ label: 'Performance', data: [85, 72, 68, 45], backgroundColor: 'rgba(108, 99, 255, 0.2)', borderColor: '#6c63ff' }] },
                options: { responsive: true, maintainAspectRatio: false }
            });

            const topProducts = [...AppState.products].sort((a, b) => b.sales - a.sales).slice(0, 5);
            document.getElementById('topProductsTable').innerHTML = topProducts.map((p, i) => `
                <tr><td><strong>#${i + 1}</strong></td><td>${p.title.substring(0, 40)}...</td><td>${p.sales}</td><td><strong>$${(p.price * p.sales).toLocaleString()}</strong></td></tr>
            `).join('');
        }, 800);
    },

    async loadSettings() {
        const user = StorageManager.getUser();
        DOM.dynamicContent.innerHTML = `
            <div class="settings-page"><div class="page-header"><h1>Settings</h1></div>
            <div class="settings-grid">
                <div class="settings-card"><h3><i class="fas fa-user"></i> Profile Settings</h3><div class="setting-item"><label>Full Name</label><input type="text" id="profileName" value="${user.name}"></div><div class="setting-item"><label>Email</label><input type="email" id="profileEmail" value="${user.email}"></div><button class="btn-primary" onclick="PageManager.saveProfile()">Save Changes</button></div>
                <div class="settings-card"><h3><i class="fas fa-palette"></i> Theme</h3><div class="setting-item"><label>Theme Mode</label><select id="themeSelect"><option value="dark" ${AppState.theme === 'dark' ? 'selected' : ''}>Dark</option><option value="light" ${AppState.theme === 'light' ? 'selected' : ''}>Light</option></select></div></div>
                <div class="settings-card"><h3><i class="fas fa-database"></i> Data</h3><button class="btn-primary" onclick="PageManager.exportData()">Export Data</button><div class="setting-item"><button class="btn-primary" onclick="PageManager.clearAllData()" style="background:var(--danger)">Clear All Data</button></div></div>
            </div></div>
        `;

        document.getElementById('themeSelect')?.addEventListener('change', (e) => { ThemeManager.setTheme(e.target.value); });
    },

    saveProfile() {
        const user = StorageManager.getUser();
        user.name = document.getElementById('profileName')?.value || user.name;
        user.email = document.getElementById('profileEmail')?.value || user.email;
        StorageManager.saveUser(user);
        NotificationManager.add('Profile Updated', 'Your profile has been saved', 'success');
    },

    clearSearch() {
        AppState.searchQuery = '';
        AppState.currentFilter = 'all';
        if (DOM.globalSearch) DOM.globalSearch.value = '';
        PageManager.loadPage(AppState.currentPage);
    },

    showProductDetails(id) {
        const product = AppState.products.find(p => p.id === id);
        if (product) {
            NotificationManager.add('Product Details', `${product.title} - $${product.price}`, 'info');
            alert(`Product: ${product.title}\nPrice: $${product.price}\nRating: ⭐ ${product.rating}`);
        }
    },

    showCustomerDetails(id) {
        NotificationManager.add('Customer Details', `Viewing customer #${id}`, 'info');
        alert(`Customer details for ID: ${id}`);
    },

    showAddProduct() {
        NotificationManager.add('Add Product', 'Product creation form would open here', 'info');
        alert('Add Product functionality - Form would open here');
    },

    showAddCustomer() {
        NotificationManager.add('Add Customer', 'Customer creation form would open here', 'info');
        alert('Add Customer functionality - Form would open here');
    },

    exportData() {
        NotificationManager.add('Export', 'Data export started', 'success');
        alert('Data export started!');
    },

    clearAllData() {
        if (confirm('Clear all data? This will delete all favorites and settings.')) {
            localStorage.clear();
            location.reload();
        }
    }
};

// ========== SEARCH MANAGER ==========
const SearchManager = {
    init() {
        DOM.globalSearch?.addEventListener('input', (e) => {
            AppState.searchQuery = e.target.value;
            PageManager.loadPage(AppState.currentPage);
        });
    }
};

// ========== THEME MANAGER ==========
const ThemeManager = {
    init() {
        AppState.theme = StorageManager.getTheme();
        this.applyTheme();
        DOM.themeToggle?.addEventListener('click', () => this.toggleTheme());
    },

    toggleTheme() {
        AppState.theme = AppState.theme === 'dark' ? 'light' : 'dark';
        this.applyTheme();
        StorageManager.saveTheme(AppState.theme);
        NotificationManager.add('Theme Changed', `${AppState.theme === 'dark' ? 'Dark' : 'Light'} mode`, 'info');
    },

    setTheme(theme) {
        AppState.theme = theme;
        this.applyTheme();
        StorageManager.saveTheme(theme);
    },

    applyTheme() {
        document.documentElement.setAttribute('data-theme', AppState.theme);
        if (AppState.charts.category) {
            const textColor = getComputedStyle(document.documentElement).getPropertyValue('--text-primary').trim();
            AppState.charts.category.options.plugins.legend.labels.color = textColor;
            AppState.charts.category.update();
        }
    }
};

// ========== SIDEBAR MANAGER ==========
const SidebarManager = {
    init() {
        AppState.sidebarCollapsed = StorageManager.getSidebarState();
        this.applyState();

        DOM.sidebarToggle?.addEventListener('click', () => this.toggleSidebar());
        DOM.mobileMenuBtn?.addEventListener('click', () => this.toggleMobile());
        DOM.favoritesBtn?.addEventListener('click', () => this.openFavorites());
        DOM.closeFavorites?.addEventListener('click', () => this.closeFavorites());
        DOM.overlay?.addEventListener('click', () => this.closeAll());
    },

    toggleSidebar() {
        AppState.sidebarCollapsed = !AppState.sidebarCollapsed;
        this.applyState();
        StorageManager.saveSidebarState(AppState.sidebarCollapsed);
    },

    toggleMobile() {
        DOM.sidebar?.classList.toggle('active');
        DOM.overlay?.classList.toggle('active');
    },

    applyState() {
        if (AppState.sidebarCollapsed) DOM.sidebar?.classList.add('collapsed');
        else DOM.sidebar?.classList.remove('collapsed');
    },

    openFavorites() {
        DOM.favoritesSidebar?.classList.remove('hidden');
        DOM.favoritesSidebar?.classList.add('open');
        DOM.overlay?.classList.add('active');
        FavoritesManager.render();
    },

    closeFavorites() {
        DOM.favoritesSidebar?.classList.remove('open');
        DOM.favoritesSidebar?.classList.add('hidden');
        DOM.overlay?.classList.remove('active');
    },

    closeAll() {
        this.closeFavorites();
        DOM.sidebar?.classList.remove('active');
        DOM.overlay?.classList.remove('active');
    }
};

// ========== INITIALIZATION & URL FALLBACK ==========|
function ensureHashRouteFallback() {
    const validRoutes = ['dashboard', 'analytics', 'products', 'customers', 'settings'];
    const pathname = window.location.pathname.replace(/^\/+|\/+$/g, '');

    if (pathname && pathname !== '' && !window.location.hash && validRoutes.includes(pathname)) {
        const search = window.location.search || '';
        window.location.replace(`${window.location.origin}/#${pathname}${search}`);
        return true;
    }
    return false;
}

async function init() {
    console.log('🚀 Initializing Dashboard...');

    if (ensureHashRouteFallback()) {
        // fallback redirect triggered, page will reload with hash route
        return;
    }

    StorageManager.updateUserUI(StorageManager.getUser());
    FavoritesManager.init();
    NotificationManager.init();
    AppState.products = await APIService.getProducts();
    AppState.stats = await APIService.getStats();

    ThemeManager.init();
    SidebarManager.init();
    SearchManager.init();

    const router = new Router();

    NotificationManager.add('Welcome!', 'Dashboard is ready with all features', 'success');
    console.log('✅ Dashboard initialized!');
}

// Make global functions available
window.PageManager = PageManager;
window.FavoritesManager = FavoritesManager;
window.NotificationManager = NotificationManager;

// Start the app
document.addEventListener('DOMContentLoaded', init);