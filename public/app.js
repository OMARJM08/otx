let products = [];
let whatsappNumber = "";

async function loadData(){
  const [productsRes, settingsRes] = await Promise.all([
    fetch('/api/products'),
    fetch('/api/admin/settings')
  ]);
  products = await productsRes.json();
  const settings = await settingsRes.json();
  whatsappNumber = settings.whatsapp || "";
  renderGrid();
}

function pills(arr){ return arr.map(n => `<span class="note-pill">${n}</span>`).join(''); }

function renderGrid(){
  const grid = document.getElementById('productGrid');
  if(!products.length){
    grid.innerHTML = '<div class="empty-state">لا توجد منتجات بعد</div>';
    return;
  }
  grid.innerHTML = products.map(p => `
    <div class="card" data-id="${p.id}">
      <div class="swatch" style="background:${p.swatch}">
        ${p.image ? `<img src="${p.image}" alt="${p.name}">` : `<span>${p.name}</span>`}
      </div>
      <div class="body">
        <h3>${p.name}</h3>
        <span class="cat">${p.category || ''}</span>
        <div class="row">
          <span class="price">${p.price} د.أ</span>
          <span class="view">عرض التفاصيل</span>
        </div>
      </div>
    </div>
  `).join('');
  document.querySelectorAll('.card').forEach(card => {
    card.addEventListener('click', () => openModal(parseInt(card.dataset.id)));
  });
}

function buildWhatsAppLink(p){
  const num = (whatsappNumber || '').replace(/[^0-9]/g, '');
  const text = encodeURIComponent(`مرحباً، أرغب بطلب ${p.name} بسعر ${p.price} د.أ`);
  if(!num) return '#';
  return `https://wa.me/${num}?text=${text}`;
}

function openModal(id){
  const p = products.find(x => x.id === id);
  if(!p) return;
  document.getElementById('mName').textContent = p.name;
  document.getElementById('mCat').textContent = p.category || '';
  document.getElementById('mTop').innerHTML = pills(p.top);
  document.getElementById('mHeart').innerHTML = pills(p.heart);
  document.getElementById('mBase').innerHTML = pills(p.base);
  document.getElementById('mPrice').textContent = p.price + ' د.أ';
  document.getElementById('mPriceOld').textContent = p.oldPrice ? p.oldPrice + ' د.أ' : '';

  const orderBtn = document.getElementById('mOrderBtn');
  orderBtn.href = buildWhatsAppLink(p);
  orderBtn.onclick = (e) => {
    e.preventDefault();
    // Log the order in the real database, then send the customer to WhatsApp
    fetch('/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ productId: p.id, productName: p.name, price: p.price })
    }).finally(() => {
      window.open(buildWhatsAppLink(p), '_blank');
    });
  };

  const imgEl = document.getElementById('mImg');
  if(p.image){ imgEl.src = p.image; imgEl.style.display = 'block'; }
  else { imgEl.style.display = 'none'; }

  const pdfLink = document.getElementById('mPdfLink');
  if(p.pdf){ pdfLink.href = p.pdf; pdfLink.style.display = 'inline-block'; }
  else { pdfLink.style.display = 'none'; }

  document.getElementById('modalOverlay').classList.add('open');
}
document.getElementById('modalClose').addEventListener('click', () => {
  document.getElementById('modalOverlay').classList.remove('open');
});
document.getElementById('modalOverlay').addEventListener('click', (e) => {
  if(e.target.id === 'modalOverlay') e.currentTarget.classList.remove('open');
});

loadData();
