/**
 * Client-Side Navigation Script
 *
 * Generates the <script> block that handles:
 *   - View switching (home/area/devices/settings/blueprint)
 *   - URL state management (pushState with ?hdp_area=xxx)
 *   - Sidebar resize (drag handle)
 *   - Active state highlighting
 *   - Mobile bottom nav sheet toggle
 *   - HA menu toggle
 */

/**
 * Generate the complete client-side navigation <script> content.
 */
export function buildNavigationScript(): string {
  return `
// ─── HDP Navigation ─────────────────────────────────────────────────────

(function() {
  var root = document.getElementById('hdp-root');
  if (!root) return;

  // Read initial view from URL
  var params = new URLSearchParams(window.location.search);
  var initialView = params.get('hdp_area') || 'home';

  function findView(viewId) {
    var views = root.querySelectorAll('.hdp-view');
    for (var i = 0; i < views.length; i++) {
      if (views[i].getAttribute('data-view') === viewId) return views[i];
    }
    return null;
  }

  // Show a view by ID
  window.hdpShowView = function(viewId) {
    // Hide all views
    var views = root.querySelectorAll('.hdp-view');
    for (var i = 0; i < views.length; i++) {
      views[i].style.display = 'none';
    }
    // Show target view
    var target = findView(viewId);
    if (target) {
      target.style.display = '';
    } else {
      // Fallback to home
      var home = root.querySelector('.hdp-view[data-view="home"]');
      if (home) home.style.display = '';
    }

    // Update URL
    var url = new URL(window.location.href);
    if (viewId === 'home') {
      url.searchParams.delete('hdp_area');
    } else {
      url.searchParams.set('hdp_area', viewId);
    }
    window.history.pushState(null, '', url.toString());

    // Update sidebar active states
    updateActiveStates(viewId);
  };

  // Update active button highlighting
  function updateActiveStates(viewId) {
    // Sidebar nav buttons
    var navBtns = root.querySelectorAll('.sb-nav-btn');
    for (var i = 0; i < navBtns.length; i++) {
      var btn = navBtns[i];
      var btnView = btn.getAttribute('data-view');
      if (btnView === viewId || (btnView === 'home' && viewId === 'home')) {
        btn.classList.add('sb-nav-btn--active');
      } else {
        btn.classList.remove('sb-nav-btn--active');
      }
    }
    // Area buttons
    var areaBtns = root.querySelectorAll('.sb-area-btn');
    for (var i = 0; i < areaBtns.length; i++) {
      var btn = areaBtns[i];
      if (btn.getAttribute('data-area') === viewId) {
        btn.classList.add('sb-area-btn--active');
      } else {
        btn.classList.remove('sb-area-btn--active');
      }
    }
    // Bottom nav buttons
    var bnBtns = root.querySelectorAll('.bn-btn');
    for (var i = 0; i < bnBtns.length; i++) {
      var btn = bnBtns[i];
      var btnView = btn.getAttribute('data-view');
      if (btnView === viewId) {
        btn.classList.add('bn-btn--active');
      } else {
        btn.classList.remove('bn-btn--active');
      }
    }
  }

  // Handle browser back/forward
  window.addEventListener('popstate', function() {
    var params = new URLSearchParams(window.location.search);
    var viewId = params.get('hdp_area') || 'home';
    // Direct show without pushState
    var views = root.querySelectorAll('.hdp-view');
    for (var i = 0; i < views.length; i++) {
      views[i].style.display = 'none';
    }
    var target = findView(viewId);
    if (target) target.style.display = '';
    else {
      var home = root.querySelector('.hdp-view[data-view="home"]');
      if (home) home.style.display = '';
    }
    updateActiveStates(viewId);
  });

  // ─── Sidebar Resize ──────────────────────────────────────────────────
  var handle = root.querySelector('.hdp-resize-handle');
  var sidebar = root.querySelector('.hdp-sidebar');
  if (handle && sidebar) {
    var startX = 0, startWidth = 0;

    // Restore saved width
    try {
      var saved = localStorage.getItem('hdp_sidebar_width');
      if (saved) sidebar.style.width = saved + 'px';
    } catch(e) {}

    handle.addEventListener('mousedown', function(e) {
      e.preventDefault();
      startX = e.clientX;
      startWidth = sidebar.offsetWidth;

      function onMove(e) {
        var delta = e.clientX - startX;
        var newWidth = Math.max(200, Math.min(400, startWidth + delta));
        sidebar.style.width = newWidth + 'px';
      }

      function onUp() {
        document.removeEventListener('mousemove', onMove);
        document.removeEventListener('mouseup', onUp);
        try {
          localStorage.setItem('hdp_sidebar_width', sidebar.offsetWidth);
        } catch(e) {}
      }

      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup', onUp);
    });

    // Touch support for resize
    handle.addEventListener('touchstart', function(e) {
      startX = e.touches[0].clientX;
      startWidth = sidebar.offsetWidth;

      function onTouchMove(e) {
        var delta = e.touches[0].clientX - startX;
        var newWidth = Math.max(200, Math.min(400, startWidth + delta));
        sidebar.style.width = newWidth + 'px';
      }

      function onTouchEnd() {
        document.removeEventListener('touchmove', onTouchMove);
        document.removeEventListener('touchend', onTouchEnd);
        try {
          localStorage.setItem('hdp_sidebar_width', sidebar.offsetWidth);
        } catch(e) {}
      }

      document.addEventListener('touchmove', onTouchMove);
      document.addEventListener('touchend', onTouchEnd);
    });
  }

  // ─── Mobile Sheet Toggle ──────────────────────────────────────────────
  window.hdpToggleSheet = function() {
    var sheet = document.getElementById('hdp-sheet');
    if (sheet) {
      sheet.style.display = sheet.style.display === 'none' ? 'block' : 'none';
    }
  };

  window.hdpCloseSheet = function() {
    var sheet = document.getElementById('hdp-sheet');
    if (sheet) sheet.style.display = 'none';
  };

  // ─── HA Menu Toggle ──────────────────────────────────────────────────
  window.hdpToggleHAMenu = function() {
    var event = new CustomEvent('hass-toggle-menu', {
      bubbles: true,
      composed: true,
    });
    window.dispatchEvent(event);
  };

  // Initialize
  hdpShowView(initialView);

  // Initialize entity click handlers (toggle entities by clicking cards)
  if (typeof hdpInitEntityClickHandlers === 'function') {
    hdpInitEntityClickHandlers();
  }
})();
`;
}
