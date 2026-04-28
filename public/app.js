/* ========================================
   NEXUS — Frontend Application
   ======================================== */

// ===== STATE =====
const state = {
  user: null,
  token: localStorage.getItem('nexus_token') || null,
  currentView: 'landing',
  posts: [],
  currentPage: 1,
  totalPages: 1,
  searchQuery: '',
  searchTimeout: null
};

// ===== API HELPER =====
async function api(endpoint, options = {}) {
  const url = `/api${endpoint}`;
  const headers = { 'Content-Type': 'application/json', ...options.headers };

  if (state.token) {
    headers['Authorization'] = `Bearer ${state.token}`;
  }

  const response = await fetch(url, { ...options, headers });
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || 'Something went wrong');
  }

  return data;
}

// ===== AUTH =====
async function handleSignup(event) {
  event.preventDefault();
  const btn = document.getElementById('signup-submit-btn');
  setLoading(btn, true);

  try {
    const data = await api('/auth/signup', {
      method: 'POST',
      body: JSON.stringify({
        username: document.getElementById('signup-username').value.trim(),
        email: document.getElementById('signup-email').value.trim(),
        password: document.getElementById('signup-password').value,
        display_name: document.getElementById('signup-display-name').value.trim()
      })
    });

    state.token = data.token;
    state.user = data.user;
    localStorage.setItem('nexus_token', data.token);

    showToast('Welcome to Nexus! 🎉', 'success');
    updateNavUser();
    showView('feed');
    document.getElementById('signup-form').reset();
  } catch (err) {
    showToast(err.message, 'error');
  } finally {
    setLoading(btn, false);
  }
}

async function handleLogin(event) {
  event.preventDefault();
  const btn = document.getElementById('login-submit-btn');
  setLoading(btn, true);

  try {
    const data = await api('/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        email: document.getElementById('login-email').value.trim(),
        password: document.getElementById('login-password').value
      })
    });

    state.token = data.token;
    state.user = data.user;
    localStorage.setItem('nexus_token', data.token);

    showToast('Welcome back! 👋', 'success');
    updateNavUser();
    showView('feed');
    document.getElementById('login-form').reset();
  } catch (err) {
    showToast(err.message, 'error');
  } finally {
    setLoading(btn, false);
  }
}

async function handleLogout() {
  try {
    await api('/auth/logout', { method: 'POST' });
  } catch (e) { /* ignore */ }

  state.token = null;
  state.user = null;
  localStorage.removeItem('nexus_token');
  closeDropdown();
  updateNavUser();
  showView('landing');
  showToast('Logged out successfully', 'info');
}

async function checkAuth() {
  if (!state.token) return;

  try {
    const data = await api('/auth/me');
    state.user = data.user;
    updateNavUser();
  } catch (err) {
    state.token = null;
    state.user = null;
    localStorage.removeItem('nexus_token');
  }
}

// ===== POSTS =====
async function loadPosts(page = 1, append = false) {
  const container = document.getElementById('posts-container');
  const loading = document.getElementById('posts-loading');
  const empty = document.getElementById('posts-empty');
  const loadMoreBtn = document.getElementById('load-more-btn');

  if (!append) {
    container.innerHTML = '';
    loading.classList.remove('hidden');
  }
  empty.classList.add('hidden');
  loadMoreBtn.classList.add('hidden');

  try {
    const searchParam = state.searchQuery ? `&search=${encodeURIComponent(state.searchQuery)}` : '';
    const data = await api(`/posts?page=${page}&limit=15${searchParam}`);

    state.posts = append ? [...state.posts, ...data.posts] : data.posts;
    state.currentPage = data.pagination.page;
    state.totalPages = data.pagination.totalPages;

    loading.classList.add('hidden');

    if (state.posts.length === 0) {
      empty.classList.remove('hidden');
    } else {
      const newPosts = append ? data.posts : state.posts;
      newPosts.forEach(post => {
        container.appendChild(createPostCard(post));
      });
    }

    if (state.currentPage < state.totalPages) {
      loadMoreBtn.classList.remove('hidden');
    }
  } catch (err) {
    loading.classList.add('hidden');
    showToast('Failed to load posts', 'error');
  }
}

function loadMorePosts() {
  loadPosts(state.currentPage + 1, true);
}

function createPostCard(post) {
  const card = document.createElement('div');
  card.className = 'post-card';
  card.onclick = () => viewPost(post.id);

  const initial = (post.display_name || post.username || '?')[0].toUpperCase();
  const timeAgo = getTimeAgo(post.created_at);
  const excerpt = post.content.length > 200 ? post.content.substring(0, 200) + '...' : post.content;

  card.innerHTML = `
    <div class="post-card-header">
      <div class="post-avatar">${initial}</div>
      <div class="post-meta">
        <span class="post-author">${escapeHtml(post.display_name || post.username)}</span>
        <span class="post-date">${timeAgo}</span>
      </div>
    </div>
    <h3 class="post-title">${escapeHtml(post.title)}</h3>
    <p class="post-excerpt">${escapeHtml(excerpt)}</p>
    <div class="post-actions">
      <button class="post-action-btn ${post.liked_by_me ? 'liked' : ''}" onclick="event.stopPropagation(); toggleLike(${post.id}, this)">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="${post.liked_by_me ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2">
          <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
        </svg>
        <span>${post.likes_count || 0}</span>
      </button>
      <button class="post-action-btn" onclick="event.stopPropagation(); viewPost(${post.id})">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
        </svg>
        <span>${post.comments_count || 0}</span>
      </button>
    </div>
  `;

  return card;
}

async function handleCreatePost(event) {
  event.preventDefault();
  const btn = document.getElementById('create-post-btn');
  setLoading(btn, true);

  try {
    const data = await api('/posts', {
      method: 'POST',
      body: JSON.stringify({
        title: document.getElementById('post-title').value.trim(),
        content: document.getElementById('post-content').value.trim()
      })
    });

    showToast('Post published! 🚀', 'success');
    document.getElementById('create-post-form').reset();
    document.getElementById('title-char-count').textContent = '0';
    showView('feed');
  } catch (err) {
    showToast(err.message, 'error');
  } finally {
    setLoading(btn, false);
  }
}

async function viewPost(postId) {
  showView('post-detail');
  const container = document.getElementById('post-detail-content');
  container.innerHTML = '<div class="posts-loading"><div class="loader-spinner small"></div><span>Loading...</span></div>';

  try {
    const data = await api(`/posts/${postId}`);
    const post = data.post;
    const comments = data.comments;

    const initial = (post.display_name || post.username || '?')[0].toUpperCase();
    const timeAgo = getTimeAgo(post.created_at);
    const isOwner = state.user && state.user.id === post.user_id;

    container.innerHTML = `
      <div class="post-detail-card">
        <div class="post-card-header">
          <div class="post-avatar">${initial}</div>
          <div class="post-meta">
            <span class="post-author">${escapeHtml(post.display_name || post.username)}</span>
            <span class="post-date">${timeAgo}</span>
          </div>
        </div>
        <h1 class="post-detail-title">${escapeHtml(post.title)}</h1>
        <div class="post-detail-body">${escapeHtml(post.content)}</div>
        <div class="post-detail-footer">
          <div class="post-actions">
            <button class="post-action-btn ${post.liked_by_me ? 'liked' : ''}" onclick="toggleLike(${post.id}, this)" id="detail-like-btn">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="${post.liked_by_me ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2">
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
              </svg>
              <span>${post.likes_count || 0}</span>
            </button>
          </div>
          ${isOwner ? `
          <div class="detail-actions">
            <button class="btn btn-ghost" onclick="deletePost(${post.id})" style="color: var(--danger);">Delete</button>
          </div>` : ''}
        </div>
      </div>

      <div class="comments-section">
        <h3>Comments (${comments.length})</h3>
        ${state.user ? `
        <div class="comment-form">
          <input type="text" id="comment-input" class="input-clean" placeholder="Write a comment..." onkeydown="if(event.key==='Enter'){submitComment(${post.id})}">
          <button class="btn btn-primary" onclick="submitComment(${post.id})">Post</button>
        </div>` : '<p style="color: var(--text-tertiary); font-size: 0.875rem; margin-bottom: 20px;">Log in to leave a comment.</p>'}
        <div id="comments-container">
          ${comments.map(c => createCommentHTML(c)).join('')}
        </div>
      </div>
    `;
  } catch (err) {
    container.innerHTML = '<p style="text-align:center;color:var(--text-tertiary);padding:40px;">Failed to load post.</p>';
    showToast(err.message, 'error');
  }
}

function createCommentHTML(comment) {
  const initial = (comment.display_name || comment.username || '?')[0].toUpperCase();
  const timeAgo = getTimeAgo(comment.created_at);
  const isOwner = state.user && state.user.id === comment.user_id;

  return `
    <div class="comment-card" id="comment-${comment.id}">
      <div class="comment-header">
        <div class="comment-avatar">${initial}</div>
        <span class="comment-author">${escapeHtml(comment.display_name || comment.username)}</span>
        <span class="comment-time">${timeAgo}</span>
        ${isOwner ? `<button class="comment-delete" onclick="deleteComment(${comment.post_id}, ${comment.id})" title="Delete comment">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
        </button>` : ''}
      </div>
      <div class="comment-body">${escapeHtml(comment.content)}</div>
    </div>
  `;
}

async function submitComment(postId) {
  const input = document.getElementById('comment-input');
  const content = input.value.trim();
  if (!content) return;

  try {
    const data = await api(`/posts/${postId}/comments`, {
      method: 'POST',
      body: JSON.stringify({ content })
    });

    const container = document.getElementById('comments-container');
    container.insertAdjacentHTML('beforeend', createCommentHTML(data.comment));
    input.value = '';
    showToast('Comment added!', 'success');
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function deleteComment(postId, commentId) {
  if (!confirm('Delete this comment?')) return;

  try {
    await api(`/posts/${postId}/comments/${commentId}`, { method: 'DELETE' });
    const el = document.getElementById(`comment-${commentId}`);
    if (el) el.remove();
    showToast('Comment deleted', 'info');
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function toggleLike(postId, btn) {
  if (!state.user) {
    showToast('Please log in to like posts', 'info');
    return;
  }

  try {
    const data = await api(`/posts/${postId}/like`, { method: 'POST' });

    const svgEl = btn.querySelector('svg');
    const countEl = btn.querySelector('span');
    const currentCount = parseInt(countEl.textContent) || 0;

    if (data.liked) {
      btn.classList.add('liked');
      svgEl.setAttribute('fill', 'currentColor');
      countEl.textContent = currentCount + 1;
    } else {
      btn.classList.remove('liked');
      svgEl.setAttribute('fill', 'none');
      countEl.textContent = Math.max(0, currentCount - 1);
    }
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function deletePost(postId) {
  if (!confirm('Are you sure you want to delete this post?')) return;

  try {
    await api(`/posts/${postId}`, { method: 'DELETE' });
    showToast('Post deleted', 'info');
    showView('feed');
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// ===== PROFILE =====
async function loadProfile() {
  if (!state.user) return;

  document.getElementById('profile-display-name').textContent = state.user.display_name || state.user.username;
  document.getElementById('profile-username').textContent = `@${state.user.username}`;
  document.getElementById('profile-avatar-letter-large').textContent = (state.user.display_name || state.user.username)[0].toUpperCase();
  document.getElementById('profile-bio').textContent = state.user.bio || 'No bio yet.';

  const joinDate = new Date(state.user.created_at);
  document.getElementById('profile-joined').textContent = `Joined ${joinDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`;

  // Load user's posts
  try {
    const data = await api(`/posts?page=1&limit=50`);
    const userPosts = data.posts.filter(p => p.user_id === state.user.id);
    const container = document.getElementById('profile-posts-container');
    container.innerHTML = '';

    document.getElementById('profile-posts-count').textContent = userPosts.length;

    let totalLikes = 0;
    userPosts.forEach(post => {
      totalLikes += post.likes_count || 0;
      container.appendChild(createPostCard(post));
    });

    document.getElementById('profile-likes-count').textContent = totalLikes;

    if (userPosts.length === 0) {
      container.innerHTML = '<p style="text-align:center;color:var(--text-tertiary);padding:32px;">You haven\'t posted anything yet.</p>';
    }
  } catch (err) {
    console.error('Failed to load profile posts:', err);
  }
}

async function handleUpdateProfile(event) {
  event.preventDefault();
  const btn = document.getElementById('settings-save-btn');
  setLoading(btn, true);

  try {
    const data = await api('/auth/profile', {
      method: 'PUT',
      body: JSON.stringify({
        display_name: document.getElementById('settings-display-name').value.trim(),
        bio: document.getElementById('settings-bio').value.trim()
      })
    });

    state.user = data.user;
    updateNavUser();
    showToast('Profile updated! ✨', 'success');
  } catch (err) {
    showToast(err.message, 'error');
  } finally {
    setLoading(btn, false);
  }
}

async function handleChangePassword(event) {
  event.preventDefault();
  const btn = document.getElementById('password-save-btn');
  setLoading(btn, true);

  try {
    await api('/auth/change-password', {
      method: 'PUT',
      body: JSON.stringify({
        current_password: document.getElementById('settings-current-password').value,
        new_password: document.getElementById('settings-new-password').value
      })
    });

    showToast('Password updated! 🔒', 'success');
    document.getElementById('settings-password-form').reset();
  } catch (err) {
    showToast(err.message, 'error');
  } finally {
    setLoading(btn, false);
  }
}

// ===== SEARCH =====
function debounceSearch() {
  clearTimeout(state.searchTimeout);
  state.searchTimeout = setTimeout(() => {
    state.searchQuery = document.getElementById('feed-search').value.trim();
    state.currentPage = 1;
    loadPosts(1, false);
  }, 400);
}

// ===== VIEW MANAGEMENT =====
function showView(viewName) {
  // Auth guard
  const authViews = ['feed', 'create-post', 'profile', 'settings'];
  if (authViews.includes(viewName) && !state.user) {
    showToast('Please log in first', 'info');
    viewName = 'login';
  }

  // Hide all views
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));

  // Show target view
  const targetView = document.getElementById(`view-${viewName}`);
  if (targetView) {
    targetView.classList.add('active');
    state.currentView = viewName;
  }

  // Scroll to top
  window.scrollTo({ top: 0, behavior: 'smooth' });

  // View-specific logic
  if (viewName === 'feed') {
    loadPosts();
  } else if (viewName === 'profile') {
    loadProfile();
  } else if (viewName === 'settings') {
    if (state.user) {
      document.getElementById('settings-display-name').value = state.user.display_name || '';
      document.getElementById('settings-bio').value = state.user.bio || '';
    }
  }
}

// ===== NAV & UI =====
function updateNavUser() {
  const authBtns = document.getElementById('nav-auth-buttons');
  const userMenu = document.getElementById('nav-user-menu');

  if (state.user) {
    authBtns.classList.add('hidden');
    userMenu.classList.remove('hidden');

    const initial = (state.user.display_name || state.user.username || 'U')[0].toUpperCase();
    document.getElementById('nav-avatar-letter').textContent = initial;
    document.getElementById('dropdown-name').textContent = state.user.display_name || state.user.username;
    document.getElementById('dropdown-email').textContent = state.user.email;
  } else {
    authBtns.classList.remove('hidden');
    userMenu.classList.add('hidden');
  }
}

function toggleDropdown() {
  document.getElementById('dropdown-menu').classList.toggle('open');
}

function closeDropdown() {
  document.getElementById('dropdown-menu').classList.remove('open');
}

// Close dropdown when clicking outside
document.addEventListener('click', (e) => {
  const dropdown = document.getElementById('user-dropdown');
  if (dropdown && !dropdown.contains(e.target)) {
    closeDropdown();
  }
});

// Navbar scroll effect
window.addEventListener('scroll', () => {
  const navbar = document.getElementById('navbar');
  if (window.scrollY > 20) {
    navbar.classList.add('scrolled');
  } else {
    navbar.classList.remove('scrolled');
  }
});

// Toggle password visibility
function togglePassword(inputId, btn) {
  const input = document.getElementById(inputId);
  if (input.type === 'password') {
    input.type = 'text';
    btn.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>';
  } else {
    input.type = 'password';
    btn.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>';
  }
}

// Password strength indicator
document.addEventListener('DOMContentLoaded', () => {
  const passwordInput = document.getElementById('signup-password');
  if (passwordInput) {
    passwordInput.addEventListener('input', (e) => {
      const password = e.target.value;
      const fill = document.getElementById('strength-fill');
      const text = document.getElementById('strength-text');

      let strength = 0;
      if (password.length >= 8) strength++;
      if (password.length >= 12) strength++;
      if (/[A-Z]/.test(password)) strength++;
      if (/[0-9]/.test(password)) strength++;
      if (/[^a-zA-Z0-9]/.test(password)) strength++;

      const levels = [
        { width: '0%', color: 'transparent', label: '' },
        { width: '20%', color: '#f87171', label: 'Weak' },
        { width: '40%', color: '#fbbf24', label: 'Fair' },
        { width: '60%', color: '#fbbf24', label: 'Good' },
        { width: '80%', color: '#34d399', label: 'Strong' },
        { width: '100%', color: '#34d399', label: 'Very Strong' }
      ];

      const level = levels[strength];
      fill.style.width = level.width;
      fill.style.background = level.color;
      text.textContent = level.label;
      text.style.color = level.color;
    });
  }

  // Title character counter
  const titleInput = document.getElementById('post-title');
  if (titleInput) {
    titleInput.addEventListener('input', (e) => {
      document.getElementById('title-char-count').textContent = e.target.value.length;
    });
  }
});

// Nav logo click
document.getElementById('nav-logo').addEventListener('click', (e) => {
  e.preventDefault();
  if (state.user) {
    showView('feed');
  } else {
    showView('landing');
  }
});

// ===== TOAST NOTIFICATIONS =====
function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;

  const icons = {
    success: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#34d399" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>',
    error: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#f87171" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>',
    info: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#60a5fa" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>'
  };

  toast.innerHTML = `${icons[type] || icons.info} ${escapeHtml(message)}`;

  toast.onclick = () => {
    toast.classList.add('toast-out');
    setTimeout(() => toast.remove(), 300);
  };

  container.appendChild(toast);

  setTimeout(() => {
    if (toast.parentNode) {
      toast.classList.add('toast-out');
      setTimeout(() => toast.remove(), 300);
    }
  }, 4000);
}

// ===== UTILITIES =====
function setLoading(btn, loading) {
  const text = btn.querySelector('.btn-text');
  const loader = btn.querySelector('.btn-loader');

  if (loading) {
    btn.disabled = true;
    if (text) text.classList.add('hidden');
    if (loader) loader.classList.remove('hidden');
  } else {
    btn.disabled = false;
    if (text) text.classList.remove('hidden');
    if (loader) loader.classList.add('hidden');
  }
}

function escapeHtml(str) {
  if (!str) return '';
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function getTimeAgo(dateStr) {
  const now = new Date();
  const date = new Date(dateStr + (dateStr.endsWith('Z') ? '' : 'Z'));
  const seconds = Math.floor((now - date) / 1000);

  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;

  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

// Counter animation for hero stats
function animateCounters() {
  const counters = document.querySelectorAll('.stat-number[data-count]');
  counters.forEach(counter => {
    const target = parseInt(counter.dataset.count);
    const duration = 2000;
    const start = performance.now();

    function update(now) {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic
      counter.textContent = Math.floor(target * eased).toLocaleString();

      if (progress < 1) {
        requestAnimationFrame(update);
      }
    }

    requestAnimationFrame(update);
  });
}

// ===== INITIALIZATION =====
async function init() {
  // Check authentication status
  await checkAuth();

  // Remove loading screen
  const loadingScreen = document.getElementById('loading-screen');
  loadingScreen.classList.add('fade-out');
  setTimeout(() => loadingScreen.remove(), 600);

  // Show the right view
  if (state.user) {
    showView('feed');
  } else {
    showView('landing');
    // Wait a brief moment then animate counters
    setTimeout(animateCounters, 500);
  }
}

init();
