// Admin Panel Dashboard Script - SalesBot

// State variables
let token = localStorage.getItem('admin_token') || '';
let currentTab = 'dashboard';
let cache = {
  models: [],
  users: [],
  orders: []
};

// DOM elements
const loginContainer = document.getElementById('login-container');
const appContainer = document.getElementById('app-container');
const loginForm = document.getElementById('login-form');
const adminPasswordInput = document.getElementById('admin-password');
const btnLogout = document.getElementById('btn-logout');
const toastContainer = document.getElementById('toast-container');
const currentSectionTitle = document.getElementById('current-section-title');

// Toast notifications
function showToast(message, type = 'info') {
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  
  let icon = 'ℹ️';
  if (type === 'success') icon = '✅';
  if (type === 'error') icon = '❌';

  toast.innerHTML = `<span>${icon}</span> <span>${message}</span>`;
  toastContainer.appendChild(toast);

  // Auto remove after 4 seconds
  setTimeout(() => {
    toast.style.animation = 'toast-in 0.3s reverse forwards';
    setTimeout(() => {
      toast.remove();
    }, 300);
  }, 4000);
}

// Custom Confirmation Modal Logic
let onConfirmDeleteCallback = null;

const confirmModal = document.getElementById('confirm-modal');
const btnConfirmCancel = document.getElementById('btn-confirm-cancel');
const btnConfirmDelete = document.getElementById('btn-confirm-delete');
const btnConfirmDeleteText = document.getElementById('btn-confirm-delete-text');
const btnConfirmDeleteSpinner = document.getElementById('btn-confirm-delete-spinner');

function openConfirmModal(title, message, deleteAction) {
  document.getElementById('confirm-modal-title').textContent = title;
  document.getElementById('confirm-modal-message').textContent = message;
  
  // Reset button states
  btnConfirmDelete.disabled = false;
  btnConfirmDeleteText.classList.remove('hidden');
  btnConfirmDeleteSpinner.classList.add('hidden');
  
  confirmModal.classList.remove('hidden');
  
  onConfirmDeleteCallback = async () => {
    // Prevent double clicking & show spinner
    btnConfirmDelete.disabled = true;
    btnConfirmDeleteText.classList.add('hidden');
    btnConfirmDeleteSpinner.classList.remove('hidden');
    
    try {
      await deleteAction();
      hideConfirmModal();
    } catch (e) {
      // Re-enable on error so user can retry or cancel
      btnConfirmDelete.disabled = false;
      btnConfirmDeleteText.classList.remove('hidden');
      btnConfirmDeleteSpinner.classList.add('hidden');
    }
  };
}

function hideConfirmModal() {
  confirmModal.classList.add('hidden');
  onConfirmDeleteCallback = null;
}

// Click Cancel to dismiss
btnConfirmCancel.addEventListener('click', hideConfirmModal);

// Click Delete to run action
btnConfirmDelete.addEventListener('click', () => {
  if (onConfirmDeleteCallback) {
    onConfirmDeleteCallback();
  }
});

// Click backdrop to dismiss
confirmModal.addEventListener('click', (e) => {
  if (e.target === confirmModal) {
    hideConfirmModal();
  }
});

// Press ESC to dismiss confirm modal
window.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && !confirmModal.classList.contains('hidden')) {
    hideConfirmModal();
  }
  if (e.key === 'Escape' && !editModal.classList.contains('hidden')) {
    hideEditModal();
  }
});

// ============================================================
// Edit Modal Logic
// ============================================================
const editModal = document.getElementById('edit-modal');
const btnEditCancel = document.getElementById('btn-edit-cancel');
const btnEditSave = document.getElementById('btn-edit-save');
const btnEditSaveText = document.getElementById('btn-edit-save-text');
const btnEditSaveSpinner = document.getElementById('btn-edit-save-spinner');

let onEditSaveCallback = null;

function openEditModal(title, config, saveAction) {
  document.getElementById('edit-modal-title').textContent = title;

  // Show/hide fields based on config
  const fields = ['model-select', 'name-uz', 'name-ru', 'price', 'desc-uz', 'desc-ru'];
  fields.forEach(f => {
    const el = document.getElementById(`edit-field-${f}`);
    if (el) el.classList.add('hidden');
  });

  // Populate fields from config: { fieldId: value }
  Object.entries(config).forEach(([fieldId, value]) => {
    const wrapper = document.getElementById(`edit-field-${fieldId}`);
    if (wrapper) wrapper.classList.remove('hidden');
    const input = document.getElementById(`edit-${fieldId}`);
    if (input) input.value = value !== null && value !== undefined ? value : '';
  });

  // Reset buttons
  btnEditSave.disabled = false;
  btnEditSaveText.classList.remove('hidden');
  btnEditSaveSpinner.classList.add('hidden');

  editModal.classList.remove('hidden');

  onEditSaveCallback = async () => {
    btnEditSave.disabled = true;
    btnEditSaveText.classList.add('hidden');
    btnEditSaveSpinner.classList.remove('hidden');
    try {
      await saveAction();
      hideEditModal();
    } catch (e) {
      btnEditSave.disabled = false;
      btnEditSaveText.classList.remove('hidden');
      btnEditSaveSpinner.classList.add('hidden');
    }
  };
}

function hideEditModal() {
  editModal.classList.add('hidden');
  onEditSaveCallback = null;
}

btnEditCancel.addEventListener('click', hideEditModal);
btnEditSave.addEventListener('click', () => {
  if (onEditSaveCallback) onEditSaveCallback();
});
editModal.addEventListener('click', (e) => {
  if (e.target === editModal) hideEditModal();
});

// Edit a vehicle model
function editModel(id, nameUz, nameRu) {
  openEditModal(
    '✏️ Edit Vehicle Model',
    { 'name-uz': nameUz, 'name-ru': nameRu },
    async () => {
      const newNameUz = document.getElementById('edit-name-uz').value.trim();
      const newNameRu = document.getElementById('edit-name-ru').value.trim();
      if (!newNameUz || !newNameRu) {
        showToast('Both name fields are required', 'error');
        throw new Error('Validation');
      }
      await apiFetch(`/api/admin/models/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ nameUz: newNameUz, nameRu: newNameRu })
      });
      showToast('Model updated successfully', 'success');
      loadModels();
    }
  );
}

// Edit a product
function editProduct(id, product) {
  // Populate model select dropdown
  const modelSelect = document.getElementById('edit-model-select');
  modelSelect.innerHTML = '';
  cache.models.forEach(m => {
    const opt = document.createElement('option');
    opt.value = m.id;
    opt.textContent = m.nameUz;
    if (m.id === product.modelId) opt.selected = true;
    modelSelect.appendChild(opt);
  });

  openEditModal(
    '✏️ Edit Product',
    {
      'model-select': product.modelId,
      'name-uz': product.nameUz,
      'name-ru': product.nameRu,
      'price': product.price,
      'desc-uz': product.descUz || '',
      'desc-ru': product.descRu || ''
    },
    async () => {
      const newModelId = document.getElementById('edit-model-select').value;
      const newNameUz = document.getElementById('edit-name-uz').value.trim();
      const newNameRu = document.getElementById('edit-name-ru').value.trim();
      const newPrice = document.getElementById('edit-price').value;
      const newDescUz = document.getElementById('edit-desc-uz').value.trim();
      const newDescRu = document.getElementById('edit-desc-ru').value.trim();

      if (!newNameUz || !newNameRu || !newPrice) {
        showToast('Name (UZ/RU) and Price are required', 'error');
        throw new Error('Validation');
      }

      await apiFetch(`/api/admin/products/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          modelId: newModelId,
          nameUz: newNameUz,
          nameRu: newNameRu,
          price: newPrice,
          descUz: newDescUz,
          descRu: newDescRu
        })
      });
      showToast('Product updated successfully', 'success');
      loadProducts();
    }
  );
}

// Fetch helper with auth header
async function apiFetch(url, options = {}) {
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers
  };
  
  if (token) {
    headers['x-admin-password'] = token;
  }

  const response = await fetch(url, { ...options, headers });
  
  if (response.status === 401) {
    showToast('Session expired or unauthorized. Logging out.', 'error');
    logout();
    throw new Error('Unauthorized');
  }

  const data = await response.json();
  
  if (!response.ok) {
    const errMsg = data.error || 'Something went wrong';
    showToast(errMsg, 'error');
    throw new Error(errMsg);
  }

  return data;
}

// Check Auth State
function checkAuth() {
  if (token) {
    loginContainer.classList.add('hidden');
    appContainer.classList.remove('hidden');
    loadTabContent();
  } else {
    loginContainer.classList.remove('hidden');
    appContainer.classList.add('hidden');
  }
}

// Logout
function logout() {
  token = '';
  localStorage.removeItem('admin_token');
  checkAuth();
}

// Navigation Tabs
document.querySelectorAll('.nav-link').forEach(link => {
  link.addEventListener('click', (e) => {
    e.preventDefault();
    
    // Deactivate previous active links
    document.querySelectorAll('.nav-link').forEach(item => item.classList.remove('active'));
    
    // Activate current
    link.classList.add('active');
    
    // Switch tabs
    const target = link.getAttribute('data-tab');
    document.querySelectorAll('.tab-content').forEach(tab => tab.classList.add('hidden'));
    
    const tabEl = document.getElementById(`tab-${target}`);
    if (tabEl) {
      tabEl.classList.remove('hidden');
    }

    currentTab = target;
    
    // Update title
    const readableTitle = link.textContent.trim().substring(link.textContent.trim().indexOf(' ') + 1);
    currentSectionTitle.textContent = `${readableTitle} Management`;

    loadTabContent();
  });
});

// Load specific tab data
async function loadTabContent() {
  try {
    if (currentTab === 'dashboard') {
      await loadDashboardStats();
    } else if (currentTab === 'channels') {
      await loadChannels();
    } else if (currentTab === 'models') {
      await loadModels();
    } else if (currentTab === 'products') {
      await loadModelsForSelect(); // dependencies first
      await loadProducts();
    } else if (currentTab === 'users') {
      await loadUsers();
    } else if (currentTab === 'orders') {
      await loadOrders();
    }
  } catch (err) {
    console.error('Failed to load tab data:', err);
  }
}

// Dashboard statistics
async function loadDashboardStats() {
  const stats = await apiFetch('/api/admin/stats');
  document.getElementById('stat-users').textContent = stats.totalUsers;
  document.getElementById('stat-channels').textContent = stats.totalChannels;
  document.getElementById('stat-models').textContent = stats.totalModels;
  document.getElementById('stat-products').textContent = stats.totalProducts;
  document.getElementById('stat-orders').textContent = stats.totalOrders || 0;
  document.getElementById('stat-pending-orders').textContent = stats.pendingOrders || 0;
  document.getElementById('stat-completed-orders').textContent = stats.completedOrders || 0;
}

// Channels management
async function loadChannels() {
  const channels = await apiFetch('/api/admin/channels');
  const tbody = document.getElementById('channels-list');
  tbody.innerHTML = '';

  if (channels.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: var(--text-muted);">No subscription channels registered yet.</td></tr>`;
    return;
  }

  channels.forEach(channel => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${channel.id}</td>
      <td><code>${channel.channelId}</code></td>
      <td><strong>${escapeHtml(channel.title)}</strong></td>
      <td>
        ${channel.inviteLink ? `<a href="${escapeHtml(channel.inviteLink)}" target="_blank" class="link-text">Open Channel ↗</a>` : '—'}
      </td>
      <td>
        <button class="btn btn-danger btn-sm" onclick="deleteChannel(${channel.id})">Delete</button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

function deleteChannel(id) {
  openConfirmModal(
    'Delete Subscription Channel',
    'Are you sure you want to delete this subscription channel? This will remove mandatory subscription checks for this channel.',
    async () => {
      await apiFetch(`/api/admin/channels/${id}`, { method: 'DELETE' });
      showToast('Channel successfully deleted', 'success');
      loadChannels();
    }
  );
}

// Vehicle Models management
async function loadModels() {
  const models = await apiFetch('/api/admin/models');
  cache.models = models; // Cache for other tabs
  const tbody = document.getElementById('models-list');
  tbody.innerHTML = '';

  if (models.length === 0) {
    tbody.innerHTML = `<tr><td colspan="4" style="text-align: center; color: var(--text-muted);">No vehicle models registered yet.</td></tr>`;
    return;
  }

  models.forEach(model => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${model.id}</td>
      <td>${escapeHtml(model.nameUz)}</td>
      <td>${escapeHtml(model.nameRu)}</td>
      <td>
        <div class="action-btns">
          <button class="btn btn-edit btn-sm" data-model-id="${model.id}">✏️ Edit</button>
          <button class="btn btn-danger btn-sm" onclick="deleteModel(${model.id})">Delete</button>
        </div>
      </td>
    `;
    // Safe: attach event listener after the row is created
    tr.querySelector('.btn-edit').addEventListener('click', () => {
      editModel(model.id, model.nameUz, model.nameRu);
    });
    tbody.appendChild(tr);
  });
}

function deleteModel(id) {
  openConfirmModal(
    'Delete Vehicle Model',
    'Are you sure you want to delete this vehicle model? This will also permanently delete all products associated with this model!',
    async () => {
      await apiFetch(`/api/admin/models/${id}`, { method: 'DELETE' });
      showToast('Model successfully deleted', 'success');
      loadModels();
    }
  );
}

// Products management
async function loadModelsForSelect() {
  const select = document.getElementById('prod-model-select');
  // Cache check or fetch
  const models = await apiFetch('/api/admin/models');
  cache.models = models;
  
  select.innerHTML = '<option value="">Select a Model...</option>';
  models.forEach(model => {
    const opt = document.createElement('option');
    opt.value = model.id;
    opt.textContent = model.nameUz;
    select.appendChild(opt);
  });
}

async function loadProducts() {
  const products = await apiFetch('/api/admin/products');
  const listContainer = document.getElementById('products-list');
  listContainer.innerHTML = '';

  if (products.length === 0) {
    listContainer.innerHTML = `<div style="grid-column: 1/-1; text-align: center; color: var(--text-muted); padding: 40px 0;">No products registered yet. Add one above!</div>`;
    return;
  }

  products.forEach(product => {
    const card = document.createElement('div');
    card.className = 'product-card';
    
    // Build media item HTML (with delete button)
    let mediaHtml = '';
    if (product.media && product.media.length > 0) {
      product.media.forEach(m => {
        mediaHtml += `
          <div class="media-item" id="media-item-${m.id}">
            <span class="media-item-icon">${m.mediaType === 'video' ? '🎥' : '📷'}</span>
            <span class="media-item-id" title="${escapeHtml(m.fileId)}">${m.fileId.substring(0, 20)}…</span>
            <button class="media-item-delete" title="Remove this attachment" onclick="deleteMedia(${m.id}, ${product.id})">✕</button>
          </div>
        `;
      });
    } else {
      mediaHtml = '<span style="color: var(--text-muted); font-size: 0.8rem;">No media attached</span>';
    }

    const uploadZoneId = `upload-zone-${product.id}`;
    const progressBarId = `progress-bar-${product.id}`;
    const statusId = `upload-status-${product.id}`;
    const previewId = `upload-preview-${product.id}`;
    const fileInputId = `file-input-${product.id}`;

    card.innerHTML = `
      <div class="product-card-body">
        <div class="product-card-header">
          <h4 class="product-title">${escapeHtml(product.nameUz)}</h4>
          <span class="product-price">$${product.price}</span>
        </div>
        <span class="product-model">${escapeHtml(product.model.nameUz)}</span>
        
        <p class="product-description" title="RU: ${escapeHtml(product.descRu || '')}">
          <strong>UZ:</strong> ${escapeHtml(product.descUz || '—')}<br/>
          <strong>RU:</strong> ${escapeHtml(product.descRu || '—')}
        </p>

        <div class="media-section">
          <div class="media-title">Attachments</div>
          <div class="media-tags" id="media-tags-${product.id}">
            ${mediaHtml}
          </div>
        </div>

        <!-- File Upload Zone -->
        <div class="upload-zone" id="${uploadZoneId}">
          <input type="file" id="${fileInputId}" accept="image/*,video/*" />
          <img class="upload-preview" id="${previewId}" alt="Preview" />
          <span class="upload-zone-icon">📁</span>
          <div class="upload-zone-text">
            <strong>Click or drag &amp; drop</strong><br/>
            Photos (JPG, PNG, WebP) or Videos (MP4, MOV)
          </div>
        </div>
        <div class="upload-progress-wrap" id="${progressBarId}">
          <div class="upload-progress-bar" style="width:0%"></div>
        </div>
        <div class="upload-status" id="${statusId}"></div>

        <div class="product-actions">
          <button class="btn btn-edit btn-edit-product">✏️ Edit</button>
          <button class="btn btn-danger btn-block" onclick="deleteProduct(${product.id})">Delete Product</button>
        </div>
      </div>
    `;
    // Safe: store product data and attach listener after card is built
    listContainer.appendChild(card);
    card.querySelector('.btn-edit-product').addEventListener('click', () => {
      editProduct(product.id, {
        modelId: product.modelId,
        nameUz: product.nameUz,
        nameRu: product.nameRu,
        price: product.price,
        descUz: product.descUz,
        descRu: product.descRu
      });
    });
    setupUploadZone(product.id);
  });
}

// Setup drag-and-drop upload zone for a product card
function setupUploadZone(productId) {
  const zone = document.getElementById(`upload-zone-${productId}`);
  const fileInput = document.getElementById(`file-input-${productId}`);
  const progressWrap = document.getElementById(`progress-bar-${productId}`);
  const progressBar = progressWrap ? progressWrap.querySelector('.upload-progress-bar') : null;
  const statusEl = document.getElementById(`upload-status-${productId}`);
  const previewImg = document.getElementById(`upload-preview-${productId}`);

  if (!zone || !fileInput) return;

  // Drag over
  zone.addEventListener('dragover', (e) => {
    e.preventDefault();
    zone.classList.add('drag-over');
  });
  zone.addEventListener('dragleave', () => {
    zone.classList.remove('drag-over');
  });
  zone.addEventListener('drop', (e) => {
    e.preventDefault();
    zone.classList.remove('drag-over');
    const files = e.dataTransfer.files;
    if (files && files[0]) {
      handleUpload(files[0], productId, zone, progressWrap, progressBar, statusEl, previewImg);
    }
  });

  // File input change
  fileInput.addEventListener('change', () => {
    if (fileInput.files && fileInput.files[0]) {
      handleUpload(fileInput.files[0], productId, zone, progressWrap, progressBar, statusEl, previewImg);
      fileInput.value = ''; // reset so same file can be uploaded again
    }
  });
}

async function handleUpload(file, productId, zone, progressWrap, progressBar, statusEl, previewImg) {
  // Show image preview (photos only)
  if (file.type.startsWith('image/')) {
    const reader = new FileReader();
    reader.onload = (e) => {
      previewImg.src = e.target.result;
      previewImg.classList.add('visible');
    };
    reader.readAsDataURL(file);
  } else {
    previewImg.classList.remove('visible');
  }

  // Show progress
  progressWrap.classList.add('visible');
  progressBar.style.width = '20%';
  setStatus(statusEl, 'Uploading to Telegram…', '');

  const formData = new FormData();
  formData.append('file', file);

  try {
    progressBar.style.width = '50%';
    const response = await fetch('/api/admin/upload', {
      method: 'POST',
      headers: { 'x-admin-password': token },
      body: formData
    });

    progressBar.style.width = '80%';
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Upload failed');
    }

    progressBar.style.width = '100%';
    setStatus(statusEl, `✅ Got fileId — attaching to product…`, 'success');

    // Now save the fileId to the product
    await apiFetch(`/api/admin/products/${productId}/media`, {
      method: 'POST',
      body: JSON.stringify({ fileId: data.fileId, mediaType: data.mediaType })
    });

    showToast('Media attached successfully!', 'success');
    setTimeout(() => {
      progressWrap.classList.remove('visible');
      progressBar.style.width = '0%';
      previewImg.classList.remove('visible');
      setStatus(statusEl, '', '');
    }, 1500);

    // Refresh just the media tags section
    loadProducts();
  } catch (err) {
    progressBar.style.width = '0%';
    progressWrap.classList.remove('visible');
    setStatus(statusEl, `❌ ${err.message}`, 'error');
    showToast(err.message, 'error');
  }
}

function setStatus(el, msg, type) {
  if (!el) return;
  el.textContent = msg;
  el.className = 'upload-status' + (type ? ' ' + type : '');
}

async function deleteMedia(mediaId, productId) {
  openConfirmModal(
    'Remove Attachment',
    'Are you sure you want to remove this media attachment from this product?',
    async () => {
      await apiFetch(`/api/admin/media/${mediaId}`, { method: 'DELETE' });
      showToast('Media attachment removed', 'success');
      loadProducts();
    }
  );
}

function deleteProduct(id) {
  openConfirmModal(
    'Delete Product',
    'Are you sure you want to delete this product from the catalog?',
    async () => {
      await apiFetch(`/api/admin/products/${id}`, { method: 'DELETE' });
      showToast('Product deleted successfully', 'success');
      loadProducts();
    }
  );
}

// Users management
async function loadUsers() {
  const users = await apiFetch('/api/admin/users');
  cache.users = users;
  renderUsersList(users);
}

function renderUsersList(users) {
  const tbody = document.getElementById('users-list');
  tbody.innerHTML = '';

  if (users.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: var(--text-muted);">No users found.</td></tr>`;
    return;
  }

  users.forEach(user => {
    const customerName = user.customer ? user.customer.fullName : '—';
    const customerPhone = user.customer ? user.customer.phoneNumber : '—';
    const usernameText = user.username ? `@${user.username}` : '—';
    
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><code>${user.id}</code></td>
      <td>${escapeHtml(usernameText)}</td>
      <td><span style="text-transform: uppercase;">${escapeHtml(user.language)}</span></td>
      <td>${escapeHtml(customerName)}</td>
      <td><code>${escapeHtml(customerPhone)}</code></td>
      <td>
        <span class="role-badge ${user.isAdmin ? 'admin' : 'user'}">
          ${user.isAdmin ? 'Administrator' : 'Customer'}
        </span>
      </td>
      <td>
        <button class="btn btn-sm ${user.isAdmin ? 'btn-danger' : 'btn-primary'}" onclick="toggleAdmin('${user.id}')">
          ${user.isAdmin ? 'Revoke Admin' : 'Make Admin'}
        </button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

async function toggleAdmin(userId) {
  try {
    const res = await apiFetch(`/api/admin/users/${userId}/toggle-admin`, { method: 'POST' });
    const status = res.isAdmin ? 'promoted to admin' : 'revoked from admin';
    showToast(`User ${userId} successfully ${status}`, 'success');
    loadUsers();
  } catch (e) {}
}

// Orders management
let ordersCurrentPage = 1;
let ordersFilters = {
  search: '',
  status: '',
  source: ''
};

async function loadOrders() {
  const params = new URLSearchParams();
  if (ordersFilters.status) params.append('status', ordersFilters.status);
  if (ordersFilters.search) params.append('search', ordersFilters.search);
  
  const url = `/api/admin/orders?${params.toString()}`;
  const orders = await apiFetch(url);
  cache.orders = orders;
  renderOrdersList(orders);
}

function renderOrdersList(orders) {
  const tbody = document.getElementById('orders-list');
  tbody.innerHTML = '';

  if (orders.length === 0) {
    tbody.innerHTML = `<tr><td colspan="10" style="text-align: center; color: var(--text-muted);">No orders found.</td></tr>`;
    return;
  }

  orders.forEach(order => {
    const tr = document.createElement('tr');
    
    const statusColors = {
      'PENDING': 'status-pending',
      'PROCESSING': 'status-processing',
      'COMPLETED': 'status-completed',
      'CANCELLED': 'status-cancelled'
    };
    
    const sourceLabels = {
      'WEBSITE': 'Website',
      'TELEGRAM_BOT': 'Telegram Bot',
      'TELEGRAM_GROUP': 'Telegram Group'
    };

    // Handle new order structure with items array
    let productsInfo = '';
    let totalQuantity = 0;
    
    if (order.items && order.items.length > 0) {
      const productCount = order.items.length;
      order.items.forEach(item => {
        totalQuantity += item.quantity;
      });
      
      const firstProduct = order.items[0].product;
      const firstProductName = firstProduct.nameUz || firstProduct.nameRu || '—';
      
      if (productCount === 1) {
        productsInfo = `${escapeHtml(firstProductName)}`;
      } else {
        productsInfo = `${escapeHtml(firstProductName)} +${productCount - 1} more`;
      }
    } else {
      productsInfo = '—';
    }
    
    const totalAmount = order.totalAmount ? order.totalAmount.toLocaleString() : '—';
    
    tr.innerHTML = `
      <td><code>${order.id}</code></td>
      <td>${escapeHtml(order.fullName)}</td>
      <td><code>${escapeHtml(order.phoneNumber)}</code></td>
      <td>${productsInfo}</td>
      <td>${order.items ? order.items.length : 0}</td>
      <td>${totalQuantity}</td>
      <td>$${totalAmount}</td>
      <td><span class="source-badge">${sourceLabels[order.source] || order.source}</span></td>
      <td><span class="status-badge ${statusColors[order.status] || ''}">${order.status}</span></td>
      <td>${new Date(order.createdAt).toLocaleString()}</td>
      <td>
        <div class="action-btns">
          <button class="btn btn-sm btn-primary" onclick="viewOrderDetails(${order.id})">View</button>
          <button class="btn btn-sm btn-secondary" onclick="changeOrderStatus(${order.id})">Status</button>
          <button class="btn btn-sm btn-danger" onclick="deleteOrder(${order.id})">Delete</button>
        </div>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

async function viewOrderDetails(orderId) {
  try {
    const order = await apiFetch(`/api/admin/orders/${orderId}`);
    
    const sourceLabels = {
      'WEBSITE': 'Website',
      'TELEGRAM_BOT': 'Telegram Bot',
      'TELEGRAM_GROUP': 'Telegram Group'
    };

    // Build products HTML for new structure
    let productsHtml = '';
    let totalQuantity = 0;
    
    if (order.items && order.items.length > 0) {
      order.items.forEach(item => {
        totalQuantity += item.quantity;
        const productName = item.product.nameUz || item.product.nameRu || '—';
        const itemTotal = item.price ? (item.price * item.quantity).toLocaleString() : '—';
        
        productsHtml += `
          <div style="margin-bottom: 12px; padding: 10px; background: rgba(255,255,255,0.03); border-radius: 6px;">
            <div style="font-weight: 600;">${escapeHtml(productName)}</div>
            <div style="font-size: 0.85rem; color: var(--text-muted); margin-top: 4px;">
              <div>Model: ${escapeHtml(item.product.model.nameUz || item.product.model.nameRu)}</div>
              <div>Quantity: ${item.quantity} × $${item.price || '—'} = $${itemTotal}</div>
            </div>
          </div>
        `;
      });
    } else {
      productsHtml = '<div style="color: var(--text-muted);">No products found</div>';
    }
    
    const totalAmount = order.totalAmount ? order.totalAmount.toLocaleString() : '—';

    // Build timeline HTML
    let timelineHtml = '';
    if (order.history && order.history.length > 0) {
      timelineHtml = `
        <div style="margin-bottom: 20px;">
          <strong>Order Timeline:</strong><br/>
          <div style="margin-top: 10px; border-left: 2px solid var(--border-light); padding-left: 15px;">
            ${order.history.map(h => `
              <div style="margin-bottom: 12px;">
                <div style="font-size: 0.85rem; color: var(--text-muted);">${new Date(h.createdAt).toLocaleString()}</div>
                <div style="font-weight: 600;">${h.newStatus}</div>
                ${h.oldStatus ? `<div style="font-size: 0.8rem; color: var(--text-muted);">Changed from ${h.oldStatus}</div>` : ''}
                <div style="font-size: 0.75rem; color: var(--text-muted);">By: ${h.changedBy || 'Unknown'}</div>
                ${h.notes ? `<div style="font-size: 0.8rem; margin-top: 4px;">${escapeHtml(h.notes)}</div>` : ''}
              </div>
            `).join('')}
          </div>
        </div>
      `;
    }

    const detailsHtml = `
      <div style="max-height: 600px; overflow-y: auto;">
        <h4 style="margin-bottom: 20px; font-size: 1.3rem;">Order #${order.id}</h4>
        
        <div style="margin-bottom: 25px; padding: 15px; background: rgba(255,255,255,0.05); border-radius: 8px;">
          <strong style="display: block; margin-bottom: 12px; color: var(--color-primary);">Customer Information</strong>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
            <div><span style="color: var(--text-muted);">Name:</span> ${escapeHtml(order.fullName)}</div>
            <div><span style="color: var(--text-muted);">Phone:</span> ${escapeHtml(order.phoneNumber)}</div>
            ${order.user ? `
              <div><span style="color: var(--text-muted);">User ID:</span> ${escapeHtml(order.user.id)}</div>
              <div><span style="color: var(--text-muted);">Username:</span> ${escapeHtml(order.user.username || '—')}</div>
            ` : ''}
          </div>
        </div>
        
        <div style="margin-bottom: 25px; padding: 15px; background: rgba(255,255,255,0.05); border-radius: 8px;">
          <strong style="display: block; margin-bottom: 12px; color: var(--color-primary);">Order Information</strong>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
            <div><span style="color: var(--text-muted);">Products:</span> ${order.items ? order.items.length : 0}</div>
            <div><span style="color: var(--text-muted);">Total Items:</span> ${totalQuantity}</div>
            <div><span style="color: var(--text-muted);">Total:</span> $${totalAmount}</div>
            <div><span style="color: var(--text-muted);">Status:</span> <span class="status-badge status-${order.status.toLowerCase()}">${order.status}</span></div>
            <div><span style="color: var(--text-muted);">Source:</span> ${sourceLabels[order.source] || order.source}</div>
            <div><span style="color: var(--text-muted);">Created:</span> ${new Date(order.createdAt).toLocaleString()}</div>
            <div><span style="color: var(--text-muted);">Updated:</span> ${new Date(order.updatedAt).toLocaleString()}</div>
          </div>
        </div>
        
        <div style="margin-bottom: 25px; padding: 15px; background: rgba(255,255,255,0.05); border-radius: 8px;">
          <strong style="display: block; margin-bottom: 12px; color: var(--color-primary);">Products</strong>
          ${productsHtml}
        </div>
        
        ${order.notes ? `
          <div style="margin-bottom: 25px; padding: 15px; background: rgba(255,255,255,0.05); border-radius: 8px;">
            <strong style="display: block; margin-bottom: 8px; color: var(--color-primary);">Notes</strong>
            ${escapeHtml(order.notes)}
          </div>
        ` : ''}
        
        ${timelineHtml}
        
        <div style="margin-top: 25px; display: flex; gap: 10px;">
          <button onclick="changeOrderStatus(${order.id})" class="btn btn-secondary" style="flex: 1;">Change Status</button>
          <button onclick="deleteOrder(${order.id})" class="btn btn-danger" style="flex: 1;">Delete Order</button>
        </div>
      </div>
    `;

    // Store original modal content
    const originalForm = document.getElementById('edit-modal-form').cloneNode(true);

    openEditModal('Order Details', {}, async () => {
      // Restore original modal content
      const modalBody = document.querySelector('#edit-modal .modal-body');
      if (modalBody) {
        modalBody.innerHTML = '';
        modalBody.appendChild(originalForm);
        originalForm.style.display = 'block';
      }
      const saveBtn = document.getElementById('btn-edit-save');
      if (saveBtn) {
        saveBtn.style.display = 'inline-flex';
      }
      hideEditModal();
    });

    // Replace modal content with custom HTML
    const modalBody = document.querySelector('#edit-modal .modal-body');
    if (modalBody) {
      modalBody.innerHTML = detailsHtml;
      document.getElementById('edit-modal-form').style.display = 'none';
    }

    // Hide save button for view-only
    document.getElementById('btn-edit-save').style.display = 'none';
  } catch (error) {
    console.error('Failed to load order details:', error);
    showToast('Failed to load order details', 'error');
  }
}

async function changeOrderStatus(orderId) {
  try {
    const order = await apiFetch(`/api/admin/orders/${orderId}`);
    
    const statusOptions = ['PENDING', 'PROCESSING', 'COMPLETED', 'CANCELLED'];
    
    const statusHtml = `
      <div style="margin-bottom: 15px;">
        <label for="status-select" style="display: block; margin-bottom: 5px; font-weight: bold;">Select New Status:</label>
        <select id="status-select" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
          ${statusOptions.map(status => 
            `<option value="${status}" ${status === order.status ? 'selected' : ''}>${status}</option>`
          ).join('')}
        </select>
      </div>
      <div style="margin-bottom: 15px;">
        <p><strong>Current Status:</strong> <span class="status-badge status-${order.status.toLowerCase()}">${order.status}</span></p>
        <p><strong>Order ID:</strong> ${order.id}</p>
      </div>
    `;

    // Store original modal content
    const originalForm = document.getElementById('edit-modal-form').cloneNode(true);

    openEditModal('Change Order Status', {}, async () => {
      const newStatus = document.getElementById('status-select').value;
      await apiFetch(`/api/admin/orders/${orderId}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: newStatus })
      });
      showToast('Order status updated successfully', 'success');
      
      // Restore original modal content
      const modalBody = document.querySelector('#edit-modal .modal-body');
      if (modalBody) {
        modalBody.innerHTML = '';
        modalBody.appendChild(originalForm);
        originalForm.style.display = 'block';
      }
      
      loadOrders();
      hideEditModal();
    });

    // Replace modal content with custom HTML
    const modalBody = document.querySelector('#edit-modal .modal-body');
    if (modalBody) {
      modalBody.innerHTML = statusHtml;
      document.getElementById('edit-modal-form').style.display = 'none';
    }
  } catch (error) {
    console.error('Failed to load order for status change:', error);
    showToast('Failed to load order details', 'error');
  }
}

function deleteOrder(orderId) {
  openConfirmModal(
    'Delete Order',
    'Are you sure you want to delete this order? This action cannot be undone.',
    async () => {
      await apiFetch(`/api/admin/orders/${orderId}`, { method: 'DELETE' });
      showToast('Order deleted successfully', 'success');
      loadOrders();
    }
  );
}

// Order filters
document.getElementById('order-search').addEventListener('input', (e) => {
  ordersFilters.search = e.target.value;
  loadOrders();
});

document.getElementById('order-status-filter').addEventListener('change', (e) => {
  ordersFilters.status = e.target.value;
  loadOrders();
});

document.getElementById('order-source-filter').addEventListener('change', (e) => {
  ordersFilters.source = e.target.value;
  loadOrders();
});

// Forms Submission Setup
loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const password = adminPasswordInput.value;
  
  try {
    const data = await apiFetch('/api/admin/login', {
      method: 'POST',
      body: JSON.stringify({ password })
    });
    
    token = data.token;
    localStorage.setItem('admin_token', token);
    showToast('Authenticated successfully!', 'success');
    adminPasswordInput.value = '';
    checkAuth();
  } catch (err) {
    // Error is handled in apiFetch with custom Toast notification
  }
});

btnLogout.addEventListener('click', logout);

// Form subpage submits
document.getElementById('channel-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const channelId = document.getElementById('channel-id').value.trim();
  const title = document.getElementById('channel-title').value.trim();
  const inviteLink = document.getElementById('channel-link').value.trim();

  try {
    await apiFetch('/api/admin/channels', {
      method: 'POST',
      body: JSON.stringify({ channelId, title, inviteLink })
    });
    showToast('Channel registered successfully', 'success');
    document.getElementById('channel-form').reset();
    loadChannels();
  } catch (e) {}
});

document.getElementById('model-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const nameUz = document.getElementById('model-name-uz').value.trim();
  const nameRu = document.getElementById('model-name-ru').value.trim();

  try {
    await apiFetch('/api/admin/models', {
      method: 'POST',
      body: JSON.stringify({ nameUz, nameRu })
    });
    showToast('Vehicle model added', 'success');
    document.getElementById('model-form').reset();
    loadModels();
  } catch (e) {}
});

document.getElementById('product-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const modelId = document.getElementById('prod-model-select').value;
  const nameUz = document.getElementById('prod-name-uz').value.trim();
  const nameRu = document.getElementById('prod-name-ru').value.trim();
  const price = document.getElementById('prod-price').value;
  const descUz = document.getElementById('prod-desc-uz').value.trim();
  const descRu = document.getElementById('prod-desc-ru').value.trim();

  try {
    await apiFetch('/api/admin/products', {
      method: 'POST',
      body: JSON.stringify({ modelId, nameUz, nameRu, price, descUz, descRu })
    });
    showToast('Product registered in catalog', 'success');
    document.getElementById('product-form').reset();
    loadProducts();
  } catch (e) {}
});

// Users Live Search Filter
document.getElementById('user-search').addEventListener('input', (e) => {
  const query = e.target.value.toLowerCase().trim();
  if (!query) {
    renderUsersList(cache.users);
    return;
  }

  const filtered = cache.users.filter(user => {
    const customerName = user.customer ? user.customer.fullName.toLowerCase() : '';
    const customerPhone = user.customer ? user.customer.phoneNumber.toLowerCase() : '';
    const username = user.username ? user.username.toLowerCase() : '';
    const id = user.id.toLowerCase();

    return id.includes(query) ||
           username.includes(query) ||
           customerName.includes(query) ||
           customerPhone.includes(query);
  });

  renderUsersList(filtered);
});

// Utility functions
function escapeHtml(str) {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// Initial Kick-off
checkAuth();

// Expose global functions for inline onclick handlers
window.deleteChannel = deleteChannel;
window.deleteModel = deleteModel;
window.deleteProduct = deleteProduct;
window.deleteMedia = deleteMedia;
window.toggleAdmin = toggleAdmin;
window.editModel = editModel;
window.editProduct = editProduct;
window.viewOrderDetails = viewOrderDetails;
window.changeOrderStatus = changeOrderStatus;
window.deleteOrder = deleteOrder;
