const apiUrl = '';

const checkToken = (redirect = 'auth.html') => {
  const token = localStorage.getItem('token');
  if (!token) {
    alert('Please log in.');
    window.location.href = redirect;
  }
  return token;
};

const apiFetch = async (url, options = {}) => {
  const token = checkToken();
  const res = await fetch(`${apiUrl}${url}`, {
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
    ...options
  });
  if (!res.ok) {
    const errorData = await res.json();
    if (res.status === 401) {
      alert('Session expired. Please log in again.');
      logout();
      throw new Error('Unauthorized');
    }
    throw new Error(errorData.error || res.statusText);
  }
  return res.json();
};

/* from switch */
const showRegisterForm = () => {
  document.getElementById('login-form').style.display = 'none';
  document.getElementById('register-form').style.display = 'block';
};

const showLoginForm = () => {
  document.getElementById('register-form').style.display = 'none';
  document.getElementById('login-form').style.display = 'block';
};

/* authentication */
const register = async () => {
  const username = document.getElementById('register-username').value;
  const password = document.getElementById('register-password').value;
  const confirmPassword = document.getElementById('confirm-password').value;
  const errorDiv = document.getElementById('error-message');
  errorDiv.textContent = '';
  if (password !== confirmPassword) return errorDiv.textContent = 'Passwords do not match.';
  if (await checkUsernameExists(username)) return errorDiv.textContent = 'Username already exists.';
  try {
    const res = await fetch(`${apiUrl}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    if (!res.ok) throw new Error((await res.json()).error || 'Registration failed');
    alert('Registration successful!');
    showLoginForm();
  } catch (error) {
    errorDiv.textContent = error.message;
  }
};

const checkUsernameExists = async (username) => {
  const res = await fetch(`${apiUrl}/auth/check-username`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username })
  });
  return (await res.json()).exists;
};

const login = async () => {
  const username = document.getElementById('login-username').value;
  const password = document.getElementById('login-password').value;
  try {
    const res = await fetch(`${apiUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Invalid credentials');
    localStorage.setItem('token', data.token);
    localStorage.setItem('userId', data.userId);
    window.location.href = 'profile.html';
  } catch (error) {
    alert(error.message);
  }
};

const logout = () => {
  localStorage.clear();
  window.location.href = 'auth.html';
};

/* posts */
const fetchPosts = async () => {
  try {
    const posts = await fetch(`${apiUrl}/posts`).then(res => res.json());
    document.getElementById('posts').innerHTML = posts.map(p => `
      <div class="post-block" onclick="viewPost('${p._id}')">
        <h3>${p.title}</h3>
        <p><strong>Author:</strong> ${p.author.username}</p>
        <p>${p.body}</p>
        <p class="timestamp">(${new Date(p.createdAt).toLocaleString()})</p>
      </div>
    `).join('');
  } catch (error) {
    document.getElementById('posts').innerHTML = '<p>Error loading posts.</p>';
  }
};

const viewPost = (postId) => window.location.href = `post.html?id=${postId}`;

const fetchUserPosts = async () => {
  const postsContainer = document.getElementById('user-posts');
  try {
    const posts = await apiFetch('/posts/user');
    postsContainer.innerHTML = posts.length === 0 ? '<p>You have no posts yet.</p>' : posts.map(p => `
      <div class="post-block">
        <h3>${p.title}</h3>
        <p><strong>Author:</strong> ${p.author.username}</p>
        <p>${p.body}</p>
        <p class="timestamp">(${new Date(p.createdAt).toLocaleString()})</p>
        <button onclick="editPost('${p._id}')">Edit</button>
        <button onclick="deletePost('${p._id}')">Delete</button>
      </div>
    `).join('');
  } catch (error) {
    postsContainer.innerHTML = `<p>Error loading your posts: ${error.message}</p>`;
  }
};

const createPost = async () => {
  const title = document.getElementById('title').value;
  const body = document.getElementById('body').value;
  try {
    await apiFetch('/posts', { method: 'POST', body: JSON.stringify({ title, body }) });
    fetchUserPosts();
  } catch (error) {
    alert(error.message);
  }
};

const fetchPost = async () => {
  const id = new URLSearchParams(window.location.search).get('id');
  if (!id) return;
  try {
    const post = await apiFetch(`/posts/${id}`);
    document.getElementById('post-details').innerHTML = `
      <h3>${post.title}</h3>
      <p><strong>Author:</strong> ${post.author.username}</p>
      <p><strong>Date:</strong> ${new Date(post.createdAt).toLocaleString()}</p>
      <p>${post.body}</p>
    `;
    fetchComments(id);
  } catch (error) {
    document.getElementById('post-details').innerHTML = '<p>Error loading post details.</p>';
  }
};

const fetchComments = async (postId) => {
  try {
    const comments = await apiFetch(`/posts/${postId}/comments`);
    document.getElementById('comments').innerHTML = comments.map(c => `
      <div class="comment">
        <p><strong>${c.author.username}</strong> (${new Date(c.createdAt).toLocaleString()}):</p>
        <p>${c.text}</p>
      </div>
    `).join('');
  } catch (error) {
    document.getElementById('comments').innerHTML = '<p>Error loading comments.</p>';
  }
};

const addComment = async () => {
  const postId = new URLSearchParams(window.location.search).get('id');
  const text = document.getElementById('comment-text').value;
  if (!text.trim()) return alert('Comment cannot be empty.');
  try {
    await apiFetch(`/posts/${postId}/comments`, { method: 'POST', body: JSON.stringify({ text }) });
    document.getElementById('comment-text').value = '';
    fetchComments(postId);
  } catch (error) {
    alert(error.message);
  }
};

const editPost = async (id) => {
  const newTitle = prompt('Enter new title:');
  const newBody = prompt('Enter new body:');
  if (!newTitle || !newBody) return;
  try {
    await apiFetch(`/posts/${id}`, { method: 'PUT', body: JSON.stringify({ title: newTitle, body: newBody }) });
    fetchUserPosts();
  } catch (error) {
    alert(error.message);
  }
};

const deletePost = async (id) => {
  try {
    await apiFetch(`/posts/${id}`, { method: 'DELETE' });
    fetchUserPosts();
  } catch (error) {
    alert(error.message);
  }
};

/* initialization */
document.addEventListener('DOMContentLoaded', () => {
  const token = localStorage.getItem('token');
  const navButtons = [
    { id: 'home-btn', href: 'index.html' },
    { id: 'profile-link', href: 'profile.html', display: token ? 'inline' : 'none' },
    { id: 'auth-link', href: 'auth.html', display: token ? 'none' : 'inline' },
    { id: 'logout-btn', action: logout, display: token ? 'inline' : 'none' },
    { id: 'back-to-home', href: 'index.html' }
  ];

  if (document.getElementById('posts')) fetchPosts();
  if (document.getElementById('user-posts')) fetchUserPosts();
  if (document.getElementById('post-details')) fetchPost();
  if (document.getElementById('comment-form')) document.getElementById('comment-form').style.display = token ? 'block' : 'none';

  navButtons.forEach(btn => {
    const element = document.getElementById(btn.id);
    if (element) {
      if (btn.display) element.style.display = btn.display;
      element.addEventListener('click', btn.action || (() => window.location.href = btn.href));
    }
  });
});