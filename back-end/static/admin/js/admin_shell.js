// Enable auto-closing details dropdown when clicking outside
document.addEventListener('click', function (e) {
    const details = document.querySelector('.user-menu');
    if (details && details.hasAttribute('open') && !details.contains(e.target)) {
        details.removeAttribute('open');
    }
    const notifDetails = document.querySelector('.notification-menu');
    if (notifDetails && notifDetails.hasAttribute('open') && !notifDetails.contains(e.target)) {
        notifDetails.removeAttribute('open');
    }
});

// Global Admin Search Handler
(function () {
    const searchInput = document.getElementById('admin-search');
    const searchClear = document.getElementById('admin-search-clear');
    const searchDropdown = document.getElementById('admin-search-dropdown');
    const searchWrap = document.querySelector('.header-search-wrap');

    if (!searchInput || !searchDropdown) return;

    let activeIndex = -1;
    const storefrontUrl = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
        ? 'http://localhost:3000'
        : (window.STOREFRONT_URL || window.location.origin);

    // Quick navigation items map
    const dashboardMenus = [
        { id: 'dashboard', name: 'Dashboard', url: '/admin/', desc: 'Admin overview, statistics & metrics', keywords: ['dashboard', 'home', 'main', 'overview', 'stats', 'analytics'], icon: '📊' },
        { id: 'products', name: 'Products', url: '/admin/products/product/', desc: 'Manage store products, stock & inventory', keywords: ['product', 'products', 'item', 'inventory', 'stock', 'catalog'], icon: '📦' },
        { id: 'categories', name: 'Categories', url: '/admin/categories/category/', desc: 'Product categories & collections', keywords: ['category', 'categories', 'collections', 'groups'], icon: '📂' },
        { id: 'subcategories', name: 'Subcategories', url: '/admin/categories/subcategory/', desc: 'Subcategories & sub-groupings', keywords: ['subcategory', 'subcategories', 'sub category'], icon: '📁' },
        { id: 'banners', name: 'Banners', url: '/admin/banners/banner/', desc: 'Promotional banners & hero carousels', keywords: ['banner', 'banners', 'slider', 'hero', 'promo'], icon: '🖼️' },
        { id: 'reviews', name: 'Reviews', url: '/admin/products/review/', desc: 'Customer ratings, reviews & feedback', keywords: ['review', 'reviews', 'rating', 'feedback', 'stars'], icon: '💬' },
        { id: 'offers', name: 'Offers', url: '/admin/offers/', desc: 'Discounts, coupon codes & promotions', keywords: ['offer', 'offers', 'discount', 'coupon', 'deals', 'sale'], icon: '🏷️' },
        { id: 'orders', name: 'Orders', url: '/admin/orders/', desc: 'Customer orders, invoices & tracking', keywords: ['order', 'orders', 'purchase', 'sales', 'invoice', 'tracking'], icon: '🛍️' },
        { id: 'customers', name: 'Customers', url: '/admin/customers/', desc: 'Registered shoppers & customer accounts', keywords: ['customer', 'customers', 'client', 'shoppers'], icon: '👥' },
        { id: 'users', name: 'Users / Staff', url: '/admin/users/', desc: 'Admin team, staff members & roles', keywords: ['user', 'users', 'staff', 'admin', 'roles', 'permissions'], icon: '👤' },
        { id: 'messages', name: 'Messages', url: '/admin/messages/', desc: 'Admin notifications, inquiries & alerts', keywords: ['message', 'messages', 'notification', 'alerts', 'inquiry'], icon: '✉️' },
        { id: 'settings', name: 'Settings', url: '/admin/settings/', desc: 'Store configuration & system settings', keywords: ['setting', 'settings', 'config', 'preferences'], icon: '⚙️' },
        { id: 'profile', name: 'My Profile', url: '/admin/profile/', desc: 'Admin user details & profile credentials', keywords: ['profile', 'my profile', 'account'], icon: '🧑‍💼' },
        { id: 'storefront', name: 'Go to Storefront', url: storefrontUrl, isExternal: true, desc: 'Open live customer storefront', keywords: ['storefront', 'store', 'shop', 'live site'], icon: '🌐' }
    ];

    const recordSections = [
        { name: 'Products', url: '/admin/products/product/?q=', icon: '📦', desc: 'Search products by name, SKU or tags' },
        { name: 'Categories', url: '/admin/categories/category/?q=', icon: '📂', desc: 'Search category names' },
        { name: 'Subcategories', url: '/admin/categories/subcategory/?q=', icon: '📁', desc: 'Search subcategories' },
        { name: 'Banners', url: '/admin/banners/banner/?q=', icon: '🖼️', desc: 'Search promo banners' },
        { name: 'Reviews', url: '/admin/products/review/?q=', icon: '💬', desc: 'Search customer reviews & comments' },
        { name: 'Orders', url: '/admin/orders/?q=', icon: '🛍️', desc: 'Search orders and tracking' },
        { name: 'Customers', url: '/admin/customers/?q=', icon: '👥', desc: 'Search customer names & emails' },
        { name: 'Users / Staff', url: '/admin/users/?q=', icon: '👤', desc: 'Search staff & admin accounts' },
        { name: 'Messages', url: '/admin/messages/?q=', icon: '✉️', desc: 'Search messages and inquiries' },
        { name: 'Offers', url: '/admin/offers/?q=', icon: '🏷️', desc: 'Search discount codes & promotions' }
    ];

    function escapeHtml(str) {
        return (str || '').replace(/[&<>"']/g, function(m) {
            return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[m];
        });
    }

    function highlightMatch(text, query) {
        if (!query) return escapeHtml(text);
        const safeText = escapeHtml(text);
        const safeQ = escapeHtml(query).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const regex = new RegExp(`(${safeQ})`, 'gi');
        return safeText.replace(regex, '<mark class="search-highlight">$1</mark>');
    }

    function updateClearBtn() {
        if (searchClear) {
            searchClear.style.display = searchInput.value.trim() ? 'flex' : 'none';
        }
    }

    function navigateToUrl(url, isExternal) {
        if (isExternal) {
            window.open(url, '_blank', 'noopener,noreferrer');
        } else {
            window.location.href = url;
        }
    }

    function renderDropdown(q) {
        const query = (q || '').trim();
        activeIndex = -1;
        updateClearBtn();

        if (!query) {
            let html = '<div class="search-dropdown-section-title"><span>Dashboard Menus</span><span>Quick Jump</span></div>';
            dashboardMenus.slice(0, 8).forEach(function(item) {
                html += `
                    <a href="${item.url}" ${item.isExternal ? 'target="_blank" rel="noopener"' : ''} class="search-dropdown-item" data-url="${item.url}" data-external="${item.isExternal ? '1' : '0'}">
                        <div class="search-dropdown-item-icon">${item.icon}</div>
                        <div class="search-dropdown-item-info">
                            <div class="search-dropdown-item-title">${escapeHtml(item.name)}</div>
                            <div class="search-dropdown-item-desc">${escapeHtml(item.desc)}</div>
                        </div>
                        <span class="search-dropdown-item-badge">Jump &rarr;</span>
                    </a>
                `;
            });
            searchDropdown.innerHTML = html;
            searchDropdown.style.display = 'block';
            attachItemEvents();
            return;
        }

        const lowerQ = query.toLowerCase();
        const matchedMenus = dashboardMenus.filter(function(item) {
            if (item.name.toLowerCase().includes(lowerQ)) return true;
            if (item.desc && item.desc.toLowerCase().includes(lowerQ)) return true;
            if (item.keywords && item.keywords.some(k => k.toLowerCase().includes(lowerQ))) return true;
            return false;
        });

        let html = '';
        if (matchedMenus.length > 0) {
            html += `<div class="search-dropdown-section-title"><span>Dashboard Pages</span><span>${matchedMenus.length} matched</span></div>`;
            matchedMenus.forEach(function(item) {
                html += `
                    <a href="${item.url}" ${item.isExternal ? 'target="_blank" rel="noopener"' : ''} class="search-dropdown-item" data-url="${item.url}" data-external="${item.isExternal ? '1' : '0'}">
                        <div class="search-dropdown-item-icon">${item.icon}</div>
                        <div class="search-dropdown-item-info">
                            <div class="search-dropdown-item-title">${highlightMatch(item.name, query)}</div>
                            <div class="search-dropdown-item-desc">${highlightMatch(item.desc, query)}</div>
                        </div>
                        <span class="search-dropdown-item-badge">Go to Page &rarr;</span>
                    </a>
                `;
            });
        }

        html += `<div class="search-dropdown-section-title"><span>Search Records for &ldquo;${escapeHtml(query)}&rdquo;</span><span>Records</span></div>`;
        recordSections.forEach(function(sec) {
            const searchUrl = sec.url + encodeURIComponent(query);
            html += `
                <a href="${searchUrl}" class="search-dropdown-item" data-url="${searchUrl}" data-external="0">
                    <div class="search-dropdown-item-icon">${sec.icon}</div>
                    <div class="search-dropdown-item-info">
                        <div class="search-dropdown-item-title">Search <strong>${escapeHtml(sec.name)}</strong> for &ldquo;<span style="color: var(--purple, #6657ec);">${escapeHtml(query)}</span>&rdquo;</div>
                        <div class="search-dropdown-item-desc">${escapeHtml(sec.desc)}</div>
                    </div>
                    <span class="search-dropdown-item-badge">&crarr;</span>
                </a>
            `;
        });

        searchDropdown.innerHTML = html;
        searchDropdown.style.display = 'block';
        attachItemEvents();
    }

    function attachItemEvents() {
        const items = searchDropdown.querySelectorAll('.search-dropdown-item');
        items.forEach(function(item, idx) {
            item.addEventListener('mouseenter', function() {
                items.forEach(i => i.classList.remove('active'));
                item.classList.add('active');
                activeIndex = idx;
            });
            item.addEventListener('click', function(e) {
                const url = this.getAttribute('data-url');
                const isExt = this.getAttribute('data-external') === '1';
                if (url) {
                    if (isExt) {
                        window.open(url, '_blank', 'noopener,noreferrer');
                    } else {
                        window.location.href = url;
                    }
                }
            });
        });
    }

    function handleDirectSearch(query) {
        const q = (query || '').trim();
        if (!q) return;

        const lowerQ = q.toLowerCase();

        for (const menu of dashboardMenus) {
            if (menu.id === lowerQ || menu.name.toLowerCase() === lowerQ || (menu.keywords && menu.keywords.includes(lowerQ))) {
                navigateToUrl(menu.url, menu.isExternal);
                return;
            }
        }

        const activeItem = searchDropdown.querySelector('.search-dropdown-item.active');
        if (activeItem) {
            const url = activeItem.getAttribute('data-url');
            const isExt = activeItem.getAttribute('data-external') === '1';
            if (url) {
                navigateToUrl(url, isExt);
                return;
            }
        }

        const path = window.location.pathname;
        if (path.includes('/admin/products/')) {
            window.location.href = '/admin/products/product/?q=' + encodeURIComponent(q);
        } else if (path.includes('/admin/categories/subcategory/')) {
            window.location.href = '/admin/categories/subcategory/?q=' + encodeURIComponent(q);
        } else if (path.includes('/admin/categories/')) {
            window.location.href = '/admin/categories/category/?q=' + encodeURIComponent(q);
        } else if (path.includes('/admin/banners/')) {
            window.location.href = '/admin/banners/banner/?q=' + encodeURIComponent(q);
        } else if (path.includes('/admin/reviews/')) {
            window.location.href = '/admin/products/review/?q=' + encodeURIComponent(q);
        } else if (path.includes('/admin/orders/')) {
            window.location.href = '/admin/orders/?q=' + encodeURIComponent(q);
        } else if (path.includes('/admin/customers/')) {
            window.location.href = '/admin/customers/?q=' + encodeURIComponent(q);
        } else if (path.includes('/admin/users/')) {
            window.location.href = '/admin/users/?q=' + encodeURIComponent(q);
        } else if (path.includes('/admin/messages/')) {
            window.location.href = '/admin/messages/?q=' + encodeURIComponent(q);
        } else if (path.includes('/admin/offers/')) {
            window.location.href = '/admin/offers/?q=' + encodeURIComponent(q);
        } else {
            window.location.href = '/admin/products/product/?q=' + encodeURIComponent(q);
        }
    }

    searchInput.addEventListener('input', function() {
        renderDropdown(this.value);
    });

    searchInput.addEventListener('focus', function() {
        renderDropdown(this.value);
    });

    searchInput.addEventListener('keydown', function(e) {
        const items = searchDropdown.querySelectorAll('.search-dropdown-item');
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            if (items.length === 0) return;
            activeIndex = (activeIndex + 1) % items.length;
            items.forEach(i => i.classList.remove('active'));
            items[activeIndex].classList.add('active');
            items[activeIndex].scrollIntoView({ block: 'nearest' });
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            if (items.length === 0) return;
            activeIndex = (activeIndex - 1 + items.length) % items.length;
            items.forEach(i => i.classList.remove('active'));
            items[activeIndex].classList.add('active');
            items[activeIndex].scrollIntoView({ block: 'nearest' });
        } else if (e.key === 'Enter') {
            e.preventDefault();
            handleDirectSearch(searchInput.value);
        } else if (e.key === 'Escape') {
            searchDropdown.style.display = 'none';
            searchInput.blur();
        }
    });

    if (searchClear) {
        searchClear.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            searchInput.value = '';
            searchInput.focus();
            renderDropdown('');
        });
    }

    document.addEventListener('click', function(e) {
        if (searchWrap && !searchWrap.contains(e.target)) {
            searchDropdown.style.display = 'none';
        }
    });

    const urlParams = new URLSearchParams(window.location.search);
    const currentQ = urlParams.get('q');
    if (currentQ) {
        searchInput.value = currentQ;
        updateClearBtn();
    }
})();

// Dynamic Storefront URL resolution (Localhost vs Production Origin)
const sfLink = document.getElementById('storefront-link');
if (sfLink) {
    const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    sfLink.href = isLocal ? 'http://localhost:3000' : (window.STOREFRONT_URL || window.location.origin);
}

// Sidebar Hamburger Close on ESC
document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
        document.body.classList.remove('sidebar-open');
    }
});

// Global Notification & Badge Manager
(function () {
    function getCsrfToken() {
        const cookie = document.cookie.split('; ').find(row => row.startsWith('csrftoken='));
        if (cookie) return cookie.split('=')[1];
        const input = document.querySelector('input[name="csrfmiddlewaretoken"]');
        if (input) return input.value;
        if (window.DJANGO_CONTEXT && window.DJANGO_CONTEXT.csrfToken) return window.DJANGO_CONTEXT.csrfToken;
        return '';
    }

    window.updateGlobalNotificationBadges = function (count) {
        const headerBadge = document.getElementById('header-notification-badge');
        const sidebarBadge = document.getElementById('messages-sidebar-badge') || document.querySelector('a[href="/admin/messages/"] .badge');

        const num = Math.max(0, parseInt(count, 10) || 0);
        localStorage.setItem('unread_messages_count', num.toString());

        if (num <= 0) {
            if (headerBadge) headerBadge.style.display = 'none';
            if (sidebarBadge) sidebarBadge.style.display = 'none';
        } else {
            if (headerBadge) {
                headerBadge.textContent = num.toString();
                headerBadge.style.display = 'inline-flex';
            }
            if (sidebarBadge) {
                sidebarBadge.textContent = num.toString();
                sidebarBadge.style.display = 'inline-flex';
            }
        }
    };

    function renderHeaderNotifications(notifications) {
        const listContainer = document.getElementById('header-notification-list');
        if (!listContainer) return;

        if (!notifications || notifications.length === 0) {
            listContainer.innerHTML = '<div style="padding: 30px 16px; text-align: center; color: #94a3b8; font-size: 13px;">No notifications found.</div>';
            return;
        }

        let html = '';
        notifications.slice(0, 8).forEach(function (n) {
            const isUnread = !n.is_read;
            const bgStyle = isUnread ? 'background: #f8fafc;' : '';
            const fontStyle = isUnread ? 'font-weight: 700;' : 'font-weight: 600;';
            const dotPill = isUnread ? '<span style="width: 8px; height: 8px; min-width: 8px; min-height: 8px; border-radius: 50%; background: #6657ec; display: inline-block; margin-top: 4px;"></span>' : '';

            html += '<a href="/admin/messages/" class="notification-popover-item ' + (isUnread ? 'unread' : 'read') + '" data-id="' + (n.numeric_id || n.id) + '" style="' + bgStyle + ' border-bottom: 1px solid #f1f5f9; text-decoration: none; display: flex; gap: 12px; padding: 12px 16px; align-items: flex-start; transition: background 0.15s ease;">';
            html += '<div style="width: 32px; height: 32px; min-width: 32px; min-height: 32px; border-radius: 50%; background: ' + (n.sender_color || '#6657ec') + '; color: #ffffff; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 13px; margin-top: 2px;">' + (n.sender_initial || 'N') + '</div>';
            html += '<div style="flex: 1; min-width: 0;">';
            html += '<div style="display: flex; justify-content: space-between; align-items: center; gap: 8px; margin-bottom: 3px;">';
            html += '<strong style="font-size: 13px; color: #0f172a; ' + fontStyle + ' overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">' + n.title + '</strong>';
            html += '<span style="font-size: 11px; color: #94a3b8; white-space: nowrap; flex-shrink: 0;">' + (n.time || '') + '</span>';
            html += '</div>';
            html += '<p style="margin: 0; font-size: 12px; color: #64748b; line-height: 1.4; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;">' + n.body + '</p>';
            html += '</div>';
            html += dotPill;
            html += '</a>';
        });

        listContainer.innerHTML = html;

        listContainer.querySelectorAll('.notification-popover-item').forEach(function (item) {
            item.addEventListener('click', function () {
                const notifId = this.getAttribute('data-id');
                if (notifId) {
                    const numericId = String(notifId).replace('notif_', '');
                    fetch('/api/notifications/' + numericId + '/read/', {
                        method: 'POST',
                        headers: {
                            'X-CSRFToken': getCsrfToken(),
                            'Content-Type': 'application/json',
                        },
                    }).catch(function () {});
                }
            });
        });
    }

    function fetchHeaderNotifications() {
        fetch('/api/notifications/?category=all')
            .then(function (res) { return res.json(); })
            .then(function (data) {
                if (data.notifications) {
                    renderHeaderNotifications(data.notifications);
                    const unread = data.unread_count !== undefined ? data.unread_count : data.notifications.filter(function (m) { return !m.is_read; }).length;
                    window.updateGlobalNotificationBadges(unread);
                }
            })
            .catch(function (err) { console.warn('Failed to fetch header notifications:', err); });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', fetchHeaderNotifications);
    } else {
        fetchHeaderNotifications();
    }

    setInterval(fetchHeaderNotifications, 10000);

    function initListeners() {
        const notifMenu = document.querySelector('.notification-menu');
        const markReadBtn = document.getElementById('mark-notifications-read-btn');

        if (notifMenu) {
            notifMenu.addEventListener('toggle', function () {
                if (notifMenu.hasAttribute('open')) {
                    fetchHeaderNotifications();
                }
            });
            notifMenu.addEventListener('click', function () {
                fetchHeaderNotifications();
            });
        }

        if (markReadBtn) {
            markReadBtn.addEventListener('click', function (e) {
                e.preventDefault();
                e.stopPropagation();
                fetch('/api/notifications/mark-all-read/', {
                    method: 'POST',
                    headers: {
                        'X-CSRFToken': getCsrfToken(),
                        'Content-Type': 'application/json',
                    },
                }).then(function () {
                    window.updateGlobalNotificationBadges(0);
                    fetchHeaderNotifications();
                }).catch(function (err) {
                    console.warn('Failed to mark all read:', err);
                });
            });
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initListeners);
    } else {
        initListeners();
    }
})();

// Browser Back Button Cache Protection
window.addEventListener('pageshow', function (event) {
    if (event.persisted || (window.performance && window.performance.navigation && window.performance.navigation.type === 2)) {
        window.location.reload();
    }
});

// ==========================================
// Global Logout Confirmation Modal Logic
// ==========================================
(function () {
    let targetLogoutForm = null;

    function getModalElements() {
        return {
            modal: document.getElementById('logout-confirm-modal'),
            closeBtn: document.getElementById('logout-modal-close-btn') || document.getElementById('logout-modal-cancel'),
            cancelBtn: document.getElementById('logout-modal-cancel-btn') || document.getElementById('logout-modal-cancel'),
            confirmBtn: document.getElementById('logout-modal-confirm-btn') || document.getElementById('logout-modal-confirm')
        };
    }

    function openLogoutModal(form) {
        const { modal, cancelBtn } = getModalElements();
        if (!modal) return;

        targetLogoutForm = form;
        modal.style.display = 'flex';
        modal.setAttribute('aria-hidden', 'false');
        document.body.style.overflow = 'hidden';

        // Close user dropdown menu if open
        const details = document.querySelector('.user-menu');
        if (details && details.hasAttribute('open')) {
            details.removeAttribute('open');
        }

        // Auto-focus cancel button for safe keyboard navigation
        setTimeout(function () {
            if (cancelBtn) cancelBtn.focus();
        }, 50);
    }

    function closeLogoutModal() {
        const { modal, cancelBtn, confirmBtn } = getModalElements();
        if (!modal) return;

        modal.style.display = 'none';
        modal.setAttribute('aria-hidden', 'true');
        document.body.style.overflow = '';
        targetLogoutForm = null;

        if (confirmBtn) {
            confirmBtn.disabled = false;
            confirmBtn.innerHTML = `
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                    <polyline points="16 17 21 12 16 7"></polyline>
                    <line x1="21" y1="12" x2="9" y2="12"></line>
                </svg>
                <span>Yes, Logout</span>
            `;
        }
        if (cancelBtn) {
            cancelBtn.disabled = false;
        }
    }

    function initLogoutModal() {
        const { modal, closeBtn, cancelBtn, confirmBtn } = getModalElements();
        if (!modal) return;

        // Delegate click for any logout triggers across navbar and sidebar
        document.addEventListener('click', function (e) {
            const trigger = e.target.closest('.trigger-logout-modal, .logout-item, a[href*="logout"], button[type="submit"][class*="logout"]');
            if (trigger) {
                // Check if this trigger is or belongs to an admin logout action
                const form = trigger.closest('form') || document.querySelector('form[action*="logout"]');
                if (form || trigger.getAttribute('href')?.includes('logout')) {
                    e.preventDefault();
                    e.stopPropagation();
                    openLogoutModal(form);
                }
            }
        });

        if (closeBtn) closeBtn.addEventListener('click', closeLogoutModal);
        if (cancelBtn) cancelBtn.addEventListener('click', closeLogoutModal);

        modal.addEventListener('click', function (e) {
            if (e.target === modal) {
                closeLogoutModal();
            }
        });

        document.addEventListener('keydown', function (e) {
            if (e.key === 'Escape' && modal.style.display === 'flex') {
                closeLogoutModal();
            }
        });

        if (confirmBtn) {
            confirmBtn.addEventListener('click', function () {
                confirmBtn.disabled = true;
                if (cancelBtn) cancelBtn.disabled = true;
                confirmBtn.innerHTML = '<span>Logging out...</span>';

                if (targetLogoutForm) {
                    targetLogoutForm.submit();
                } else {
                    const fallbackForm = document.querySelector('form[action*="logout"]');
                    if (fallbackForm) {
                        fallbackForm.submit();
                    } else {
                        // Create and submit POST form to Django admin logout url
                        const form = document.createElement('form');
                        form.method = 'POST';
                        form.action = '/admin/logout/';
                        const csrfInput = document.createElement('input');
                        csrfInput.type = 'hidden';
                        csrfInput.name = 'csrfmiddlewaretoken';
                        const csrfToken = document.querySelector('[name=csrfmiddlewaretoken]')?.value || (window.DJANGO_CONTEXT && window.DJANGO_CONTEXT.csrfToken) || '';
                        csrfInput.value = csrfToken;
                        form.appendChild(csrfInput);
                        document.body.appendChild(form);
                        form.submit();
                    }
                }
            });
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initLogoutModal);
    } else {
        initLogoutModal();
    }
})();

// Global Admin Theme Manager (Light / Dark Mode)
(function () {
    function getStoredTheme() {
        try {
            var saved = localStorage.getItem('moxie-admin-theme');
            if (saved === 'dark' || saved === 'light') return saved;
            if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
                return 'dark';
            }
        } catch (e) {}
        return 'light';
    }

    function applyTheme(theme) {
        document.documentElement.setAttribute('data-theme', theme);
        var toggleBtn = document.getElementById('admin-theme-toggle');
        if (toggleBtn) {
            if (theme === 'dark') {
                toggleBtn.setAttribute('title', 'Switch to light mode');
                toggleBtn.setAttribute('aria-label', 'Switch to light mode');
            } else {
                toggleBtn.setAttribute('title', 'Switch to dark mode');
                toggleBtn.setAttribute('aria-label', 'Switch to dark mode');
            }
        }
        window.dispatchEvent(new CustomEvent('admin-theme-changed', { detail: { theme: theme } }));
    }

    function toggleTheme() {
        var current = document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
        var next = current === 'dark' ? 'light' : 'dark';
        try {
            localStorage.setItem('moxie-admin-theme', next);
        } catch (e) {}
        applyTheme(next);
    }

    window.toggleAdminTheme = toggleTheme;
    window.applyAdminTheme = applyTheme;

    // Delegated click listener ensures clicks on SVG/sub-elements are captured reliably
    document.addEventListener('click', function (e) {
        var btn = e.target.closest('#admin-theme-toggle, .theme-toggle-button');
        if (btn) {
            e.preventDefault();
            e.stopPropagation();
            toggleTheme();
        }
    });

    function initTheme() {
        var initialTheme = getStoredTheme();
        applyTheme(initialTheme);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initTheme);
    } else {
        initTheme();
    }
})();

