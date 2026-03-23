// Simple Hash-based Router

const Router = {
  routes: {},
  currentRoute: null,
  routePermissions: {
      'dashboard': ['admin', 'receiver', 'cashier', 'standard'],
      'departments': ['admin', 'receiver', 'cashier', 'standard'],
      'tools': ['admin', 'receiver'],
      'receiving': ['admin', 'receiver'],
      'sales': ['admin', 'cashier']
  },
  
  add(path, renderFn) {
    this.routes[path] = renderFn;
  },
  
  handleRoute() {
    let hash = window.location.hash.replace('#', '') || '/';
    if(hash === '/') hash = 'dashboard';
    
    // RBAC Permissions Check
    let baseRoute = hash;
    if(hash.startsWith('item-') || hash.startsWith('dept-')) baseRoute = 'departments';
    
    const role = (typeof Store !== 'undefined' && Store.state.currentRole) ? Store.state.currentRole : 'admin'; // fallback to admin for uninitialized state (auth bypassed)
    const allowed = this.routePermissions[baseRoute] || ['admin'];
    
    if(!allowed.includes(role)) {
       if(typeof AITeacher !== 'undefined') AITeacher.showTip("Access Denied. Your user role does not have permission for this view.", 4000);
       window.location.hash = 'dashboard';
       return;
    }

    const handler = this.routes[hash];
    
    // Check if dynamic item route
    if (!handler && hash.startsWith('item-')) {
       // Format: item-{deptId}-{itemId}
       const parts = hash.split('-');
       if(parts.length >= 3) {
          const deptId = parts[1];
          const itemId = parts.slice(2).join('-');
          // Assuming Components.createItemDetail returns a DOM element
          const main = document.getElementById('main-content');
          main.innerHTML = ''; // Clear current view
          main.appendChild(Components.createItemDetail(deptId, itemId));
          lucide.createIcons(); // Re-render icons on new content
          this.updateBottomNav(hash); // Update nav for dynamic route
          return;
       }
    }

    // Check if dynamic dept route
    if (!handler && hash.startsWith('dept-')) {
       const deptId = hash.replace('dept-', '');
       // Assuming Components.createItemList returns a DOM element
       const main = document.getElementById('main-content');
       main.innerHTML = ''; // Clear current view
       main.appendChild(Components.createItemList(deptId));
       lucide.createIcons(); // Re-render icons on new content
       this.updateBottomNav(hash); // Update nav for dynamic route
       return;
    }
    
    if (handler) {
      this.navigate(hash);
    } else {
      // Handle 404 or redirect to a default route if no handler found
      // For now, let's navigate to dashboard if hash is not recognized
      if (hash !== 'dashboard') {
        window.location.hash = 'dashboard';
      } else {
        // If it's already dashboard and no handler, something is wrong or it's the default
        // We might want a specific 404 page here
        console.warn(`No handler found for route: ${hash}`);
      }
    }
  },

  navigate(path) {
    this.currentRoute = path;
    const renderFn = this.routes[path];
    if (renderFn) {
      const main = document.getElementById('main-content');
      main.innerHTML = ''; // Clear current view
      main.appendChild(renderFn());
      lucide.createIcons(); // Re-render icons on new content
      this.updateBottomNav(path);
    }
  },

  updateBottomNav(path) {
    document.querySelectorAll('.nav-item').forEach(el => {
      const r = el.getAttribute('data-route');
      r === path ? el.classList.add('active') : el.classList.remove('active');
    });
  },

  init() {
    window.addEventListener('hashchange', () => this.handleRoute());
    // Initial load
    if (!window.location.hash || window.location.hash === '#' || window.location.hash === '#/') {
      window.location.hash = 'dashboard';
    } else {
      this.handleRoute();
    }
  },
};
