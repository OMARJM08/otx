let token = localStorage.getItem('otx_admin_token') || null;
let products = [];
let editingId = null;
let pendingPdfFile = null;
let pendingImgFile = null;
let quickPdfFile = null;

function api(path, opts = {}){
  const headers = opts.headers || {};
  if(token) headers['Authorization'] = 'Bearer ' + token;
  return fetch(path, { ...opts, headers });
}

async function tryAutoLogin(){
  if(!token) return showLogin();
  const res = await api('/api/admin/settings');
  if(res.ok) { showDashboard(); } else { showLogin(); }
}

function showLogin(){
  document.getElementById('loginView').style.display = 'block';
  document.getElementById('dashboardView').style.display = 'none';
}
function showDashboard(){
  document.getElementById('loginView').style.display = 'none';
  document.getElementById('dashboardView').style.display = 'block';
  loadSettings();
  loadProducts();
  loadOrders();
}

document.getElementById('loginBtn').addEventListener('click', async () => {
  const email = document.getElementById('loginEmail').value.trim();
  const password = document.getElementById('loginPassword').value;
  const res = await fetch('/api/admin/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });
  if(!res.ok){
    document.getElementById('loginErr').textContent = 'البريد الإلكتروني أو كلمة المرور غير صحيحة';
    return;
  }
  const data = await res.json();
  token = data.token;
  localStorage.setItem('otx_admin_token', token);
  showDashboard();
});

async function loadSettings(){
  const res = await api('/api/admin/settings');
  const data = await res.json();
  document.getElementById('fWhatsapp').value = data.whatsapp || '';
}

document.getElementById('saveWhatsappBtn').addEventListener('click', async () => {
  await api('/api/admin/settings', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ whatsapp: document.getElementById('fWhatsapp').value.trim() })
  });
  const savedEl = document.getElementById('whatsappSaved');
  savedEl.style.display = 'inline';
  setTimeout(() => savedEl.style.display = 'none', 2000);
});

async function loadProducts(){
  const res = await fetch('/api/products');
  products = await res.json();
  renderTable();
}

function renderTable(){
  document.getElementById('adminTableBody').innerHTML = products.map(p => `
    <tr>
      <td><span class="swatch-sm" style="background:${p.swatch}"></span></td>
      <td>${p.name}</td>
      <td>${p.category || ''}</td>
      <td>${p.price} د.أ</td>
      <td style="text-align:left;">
        <button class="row-btn" onclick="editProduct(${p.id})">تعديل</button>
        <button class="row-btn danger" onclick="deleteProduct(${p.id})">حذف</button>
      </td>
    </tr>
  `).join('');
}

function clearForm(){
  editingId = null;
  pendingPdfFile = null;
  pendingImgFile = null;
  document.getElementById('formTitle').textContent = 'إضافة منتج جديد';
  ['fName','fCat','fPrice','fOldPrice','fSwatch','fTop','fHeart','fBase'].forEach(id => document.getElementById(id).value = '');
  document.getElementById('pdfDropName').textContent = '';
  document.getElementById('imgDropName').textContent = '';
  document.getElementById('pdfInput').value = '';
  document.getElementById('imgInput').value = '';
}

window.editProduct = function(id){
  const p = products.find(x => x.id === id);
  if(!p) return;
  editingId = id;
  document.getElementById('formTitle').textContent = 'تعديل: ' + p.name;
  document.getElementById('fName').value = p.name;
  document.getElementById('fCat').value = p.category || '';
  document.getElementById('fPrice').value = p.price;
  document.getElementById('fOldPrice').value = p.oldPrice || '';
  document.getElementById('fSwatch').value = p.swatch;
  document.getElementById('fTop').value = p.top.join(', ');
  document.getElementById('fHeart').value = p.heart.join(', ');
  document.getElementById('fBase').value = p.base.join(', ');
  window.scrollTo({ top: 0, behavior: 'smooth' });
};

window.deleteProduct = async function(id){
  if(!confirm('هل أنت متأكد من حذف هذا المنتج؟')) return;
  await api('/api/products/' + id, { method: 'DELETE' });
  loadProducts();
};

document.getElementById('pdfDrop').addEventListener('click', () => document.getElementById('pdfInput').click());
document.getElementById('pdfInput').addEventListener('change', (e) => {
  pendingPdfFile = e.target.files[0] || null;
  document.getElementById('pdfDropName').textContent = pendingPdfFile ? '📎 ' + pendingPdfFile.name : '';
});
document.getElementById('imgDrop').addEventListener('click', () => document.getElementById('imgInput').click());
document.getElementById('imgInput').addEventListener('change', (e) => {
  pendingImgFile = e.target.files[0] || null;
  document.getElementById('imgDropName').textContent = pendingImgFile ? '🖼️ ' + pendingImgFile.name : '';
});

document.getElementById('saveBtn').addEventListener('click', async () => {
  const fd = new FormData();
  fd.append('name', document.getElementById('fName').value.trim());
  fd.append('category', document.getElementById('fCat').value.trim());
  fd.append('price', document.getElementById('fPrice').value);
  fd.append('oldPrice', document.getElementById('fOldPrice').value);
  fd.append('swatch', document.getElementById('fSwatch').value.trim());
  fd.append('top', document.getElementById('fTop').value);
  fd.append('heart', document.getElementById('fHeart').value);
  fd.append('base', document.getElementById('fBase').value);
  if(pendingPdfFile) fd.append('pdf', pendingPdfFile);
  if(pendingImgFile) fd.append('image', pendingImgFile);

  const url = editingId ? '/api/products/' + editingId : '/api/products';
  const method = editingId ? 'PUT' : 'POST';
  const res = await api(url, { method, body: fd });

  if(!res.ok){
    const err = await res.json().catch(() => ({}));
    alert(err.error || 'حدث خطأ أثناء الحفظ');
    return;
  }
  clearForm();
  loadProducts();
});

document.getElementById('resetBtn').addEventListener('click', clearForm);

document.getElementById('quickPdfDrop').addEventListener('click', () => document.getElementById('quickPdfInput').click());
document.getElementById('quickPdfInput').addEventListener('change', (e) => {
  quickPdfFile = e.target.files[0] || null;
  document.getElementById('quickPdfName').textContent = quickPdfFile ? '📎 ' + quickPdfFile.name : '';
  if (quickPdfFile && !document.getElementById('quickPdfTitle').value.trim()) {
    document.getElementById('quickPdfTitle').value = quickPdfFile.name.replace(/\.pdf$/i, '');
  }
});

document.getElementById('quickPdfSaveBtn').addEventListener('click', async () => {
  const status = document.getElementById('quickPdfStatus');
  const price = document.getElementById('quickPdfPrice').value;
  if (!quickPdfFile) {
    alert('اختر ملف PDF أولاً');
    return;
  }
  if (!price || Number(price) < 0) {
    alert('أدخل السعر');
    return;
  }

  const fd = new FormData();
  fd.append('name', document.getElementById('quickPdfTitle').value.trim() || quickPdfFile.name.replace(/\.pdf$/i, ''));
  fd.append('price', price);
  fd.append('category', 'ملف PDF رقمي');
  fd.append('pdf', quickPdfFile);

  const res = await api('/api/products', { method: 'POST', body: fd });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    alert(err.error || 'حدث خطأ أثناء رفع الملف');
    return;
  }

  quickPdfFile = null;
  document.getElementById('quickPdfInput').value = '';
  document.getElementById('quickPdfName').textContent = '';
  document.getElementById('quickPdfTitle').value = '';
  document.getElementById('quickPdfPrice').value = '';
  status.textContent = 'تمت إضافة ملف PDF ✓';
  status.style.display = 'inline';
  setTimeout(() => status.style.display = 'none', 2500);
  loadProducts();
});

tryAutoLogin();

const ORDER_STATUSES = ['جديد', 'تم التواصل', 'مكتمل', 'ملغي'];

async function loadOrders(){
  const res = await api('/api/orders');
  if(!res.ok) return;
  const orders = await res.json();
  document.getElementById('ordersTableBody').innerHTML = orders.length ? orders.map(o => `
    <tr>
      <td>${new Date(o.created_at).toLocaleString('ar-EG')}</td>
      <td>${o.product_name}</td>
      <td>${o.price} د.أ</td>
      <td>
        <select onchange="updateOrderStatus(${o.id}, this.value)" style="background:var(--charcoal2); color:var(--cream); border:1px solid rgba(207,211,216,0.2); border-radius:6px; padding:4px 8px; font-family:inherit;">
          ${ORDER_STATUSES.map(s => `<option value="${s}" ${s === o.status ? 'selected' : ''}>${s}</option>`).join('')}
        </select>
      </td>
    </tr>
  `).join('') : '<tr><td colspan="4" style="text-align:center; color:var(--silver); padding:20px;">لا توجد طلبات بعد</td></tr>';
}

window.updateOrderStatus = async function(id, status){
  await api('/api/orders/' + id + '/status', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status })
  });
};
