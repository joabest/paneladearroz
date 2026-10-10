'use strict';
(() => {
  const STORAGE_KEY = 'panela-preview-v1';
  const PRODUCT = Object.freeze({ id: 'P7292S1Zema', name: 'Panela de Arroz Mondial Bianca NEP05', image: 'images/images.jpg', pixCents: 16141, cardCents: 16990 });
  const STOCK = Object.freeze({ '110V': 1, '220V': 0 });
  const money = cents => (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  const normalizeCep = value => String(value || '').replace(/\D/g, '').slice(0, 8);
  const validCep = value => /^\d{5}-?\d{3}$/.test(String(value ?? '').trim()) && normalizeCep(value) !== '00000000';
  function sanitizeState(value) {
    const raw = value && typeof value === 'object' ? value : {};
    const voltage = Object.hasOwn(STOCK, raw.voltage) ? raw.voltage : '110V';
    const cart = Array.isArray(raw.cart) ? raw.cart.filter(x => x && x.id === PRODUCT.id && Object.hasOwn(STOCK, x.voltage) && STOCK[x.voltage] > 0).slice(0, 1).map(x => ({ id: PRODUCT.id, voltage: x.voltage, quantity: 1 })) : [];
    return { voltage, cart, favorites: Array.isArray(raw.favorites) ? [...new Set(raw.favorites.filter(x => typeof x === 'string' && /^[a-zA-Z0-9_-]{1,80}$/.test(x)))].slice(0, 100) : [], cep: normalizeCep(raw.cep) };
  }
  function addToCart(current, voltage) {
    const next = sanitizeState(current);
    if (!Object.hasOwn(STOCK, voltage) || STOCK[voltage] < 1) return { ok: false, state: next, reason: 'unavailable' };
    const exists = next.cart.some(x => x.id === PRODUCT.id && x.voltage === voltage);
    next.cart = [{ id: PRODUCT.id, voltage, quantity: 1 }];
    return { ok: true, state: next, reason: exists ? 'already-added' : 'added' };
  }
  const pure = { money, normalizeCep, validCep, sanitizeState, addToCart, PRODUCT, STOCK };
  if (typeof module !== 'undefined' && module.exports) module.exports = pure;
  if (typeof document === 'undefined') return;

  const $ = selector => document.querySelector(selector);
  const $$ = selector => [...document.querySelectorAll(selector)];
  const escapeText = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  let state;
  try { state = sanitizeState(JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}')); } catch { state = sanitizeState({}); }
  let toastTimer;
  let imageIndex = 0;
  let lastSwipeAt = 0;
  let dialogReturnFocus;
  const imageSources = ['images/images.jpg', 'images/images_3.jpg', 'images/images_1.jpg', 'images/images_2.jpg'];
  const imageLabels = ['vista frontal', 'vista do produto', 'detalhes do produto', 'vista complementar'];
  const catalog = [ { ...PRODUCT, id: PRODUCT.id, price: money(PRODUCT.pixCents), url: null }, ...(window.PANELA_CATALOG || []) ];
  const dialog = $('#preview-dialog');
  function persist() { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch {} }
  function announce(text) { $('#preview-live').textContent = text; }
  function toast(text) {
    const box = $('#preview-toast');
    box.textContent = text; box.hidden = false; announce(text);
    clearTimeout(toastTimer); toastTimer = setTimeout(() => { box.hidden = true; }, 3500);
  }
  function openDialog(title, content) {
    if (!dialog.open) dialogReturnFocus = document.activeElement;
    $('#dialog-title').textContent = title;
    $('#dialog-body').innerHTML = content;
    if (!dialog.open) dialog.showModal();
    $('.dialog-close').focus();
  }
  function closeDialog() { dialog.close(); }
  dialog.addEventListener('close', () => { if (dialogReturnFocus?.isConnected) dialogReturnFocus.focus(); });
  dialog.addEventListener('click', event => { if (event.target === dialog) { const rect = dialog.getBoundingClientRect(); if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) closeDialog(); } });

  function productCard(item, removeFavorite = false) {
    return `<article class="preview-card"><img src="${escapeText(item.image)}" alt="${escapeText(item.name)}"><div><p>${escapeText(item.name)}</p><strong>${escapeText(item.price || money(PRODUCT.pixCents))}</strong>${item.url ? `<p><a class="preview-secondary" href="${escapeText(item.url)}" target="_blank" rel="noopener noreferrer">Abrir link original</a></p>` : '<button type="button" data-action="show-product">Ver produto</button>'}${removeFavorite ? `<p><button type="button" data-action="remove-favorite" data-id="${escapeText(item.id)}">Remover favorito</button></p>` : ''}</div></article>`;
  }
  function showCart(checkout = false) {
    const item = state.cart[0];
    if (!item) { openDialog('Minha sacola de compras', '<p class="preview-empty">Sua sacola está vazia.</p><button type="button" class="preview-primary" data-action="close-dialog">Continuar navegando</button>'); return; }
    openDialog(checkout ? 'Comprar agora' : 'Minha sacola de compras', `<article class="preview-card"><img src="${PRODUCT.image}" alt="${PRODUCT.name}"><div><p>${PRODUCT.name} ${escapeText(item.voltage)}</p><p>Quantidade: ${item.quantity}</p><strong>${money(PRODUCT.pixCents)} no Pix</strong><p><button type="button" data-action="remove-cart">Remover</button></p></div></article><p>Cartão: ${money(PRODUCT.cardCents)}, em até 12 parcelas.</p><p class="preview-note">Esta é a prévia privada para revisão. Nenhum pedido ou cobrança é realizado aqui. O ZIP não inclui a integração de pagamento, estoque em tempo real ou transportadora.</p><button type="button" class="preview-primary" data-action="close-dialog">Continuar conferindo o site</button>`);
  }
  function renderState() {
    const available = STOCK[state.voltage] > 0;
    $('#product-name').textContent = `${PRODUCT.name} ${state.voltage}`;
    $('#product-code').textContent = `(Cod. ${PRODUCT.id}${state.voltage === '110V' ? 'V0' : 'V1'})`;
    $$('[data-voltage]').forEach(x => x.setAttribute('aria-pressed', String(x.dataset.voltage === state.voltage)));
    $('[data-action="buy"]').disabled = !available;
    $('[data-action="add-cart"]').disabled = !available;
    $('#sticky-buy button').disabled = !available;
    $('.css-weirhn').textContent = available ? 'Estoque disponível  ' : 'Produto indisponível  ';
    $('.css-17ogsa1').textContent = available ? '( 1 unidades restantes )' : '( 220V indisponível na captura )';
    $('.css-ifdf80').style.opacity = available ? '1' : '.65';
    $$('[data-action="favorite"]').forEach(x => { const on = state.favorites.includes(PRODUCT.id); x.classList.toggle('favorite-active', on); x.setAttribute('aria-pressed', String(on)); x.setAttribute('aria-label', on ? 'Remover dos favoritos' : 'Adicionar aos favoritos'); });
    $$('[data-action="favorite-card"]').forEach(x => { const on = state.favorites.includes(x.closest('[data-product-id]').dataset.productId); x.classList.toggle('favorite-active', on); x.setAttribute('aria-pressed', String(on)); });
    const bag = $('[data-action="cart"]');
    let badge = bag.querySelector('.cart-badge');
    if (!badge) { badge = document.createElement('span'); badge.className = 'cart-badge'; bag.append(badge); }
    badge.hidden = !state.cart.length; badge.textContent = String(state.cart.length);
    bag.setAttribute('aria-label', `Minha sacola de compras, ${state.cart.length} item`);
    $('#postal-code').value = state.cep ? state.cep.replace(/(\d{5})(\d{3})/, '$1-$2') : '';
  }
  function setVoltage(voltage) { if (!Object.hasOwn(STOCK, voltage)) return; state.voltage = voltage; persist(); renderState(); announce(`Voltagem ${voltage}${STOCK[voltage] ? '' : ', indisponível na captura'}`); }
  function showVoltage() {
    openDialog('Selecione a voltagem', '<div class="preview-link-list"><button type="button" class="preview-secondary" data-select-voltage="110V">110V</button><button type="button" class="preview-secondary" data-select-voltage="220V">220V — indisponível na captura</button></div>');
  }
  function toggleFavorite(id) { state.favorites = state.favorites.includes(id) ? state.favorites.filter(x => x !== id) : [...state.favorites, id]; persist(); renderState(); toast(state.favorites.includes(id) ? 'Produto salvo nos favoritos.' : 'Produto removido dos favoritos.'); }
  function showFavorites() {
    const items = catalog.filter(x => state.favorites.includes(x.id));
    openDialog('Meus Favoritos', items.length ? items.map(x => productCard(x, true)).join('') : '<p class="preview-empty">Você ainda não salvou nenhum produto.</p>');
  }
  function showGallery(index) {
    imageIndex = (index + imageSources.length) % imageSources.length;
    const im = $('#main-product-image'); im.src = imageSources[imageIndex]; im.alt = `${PRODUCT.name} — ${imageLabels[imageIndex]}`;
    $('#gallery-counter').textContent = `${imageIndex + 1} de 4`;
    $$('[data-gallery-index]').forEach(x => x.setAttribute('aria-pressed', String(Number(x.dataset.galleryIndex) === imageIndex)));
    announce(`Imagem ${imageIndex + 1} de 4`);
  }
  function zoom() { openDialog('Imagem do produto', `<img class="preview-zoom" src="${imageSources[imageIndex]}" alt="${PRODUCT.name} — ${imageLabels[imageIndex]}"><div style="display:flex;gap:12px"><button type="button" class="preview-secondary" data-action="image-prev">Imagem anterior</button><button type="button" class="preview-secondary" data-action="image-next">Próxima imagem</button></div>`); }
  function scrollToSection(id) {
    if (dialog.open) closeDialog();
    const element = document.getElementById(id); if (!element) return;
    const button = element.querySelector('.chakra-accordion__button');
    if (button && button.getAttribute('aria-expanded') !== 'true') toggleAccordion(button);
    element.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
  }
  function toggleAccordion(button) {
    const panel = document.getElementById(button.getAttribute('aria-controls'));
    const open = button.getAttribute('aria-expanded') !== 'true';
    button.setAttribute('aria-expanded', String(open));
    panel.parentElement.style.display = open ? 'block' : 'none';
    panel.parentElement.style.height = open ? 'auto' : '0';
    panel.parentElement.style.opacity = open ? '1' : '0';
  }
  function showInstallments() {
    const lines = Array.from({ length: 12 }, (_, index) => { const count = index + 1; const per = Math.round(PRODUCT.cardCents / count); return `<tr><td>${count}x</td><td>${money(per)} sem juros</td></tr>`; }).join('');
    openDialog('Mais formas de Parcelamento', `<p>Preço no cartão: <strong>${money(PRODUCT.cardCents)}</strong></p><table class="installment-table" aria-label="Parcelamento de referência"><tbody>${lines}</tbody></table><p class="preview-note">Condições exibidas no material enviado. A última parcela pode variar por arredondamento.</p>`);
  }
  function shipping() {
    const input = $('#postal-code');
    if (!validCep(input.value)) { input.setAttribute('aria-invalid', 'true'); $('#shipping-result').textContent = 'Digite um CEP válido com 8 números.'; input.focus(); return; }
    input.removeAttribute('aria-invalid'); state.cep = normalizeCep(input.value); persist();
    $('#shipping-result').textContent = `CEP ${state.cep.replace(/(\d{5})(\d{3})/, '$1-$2')} salvo. Frete e prazo dependem da integração da transportadora, ausente no ZIP.`;
  }
  function menu() {
    const fallback = [ ['Ofertas 10.10🔥', '/ofertas'], ['Smartphones', '/celular-e-smartphone'], ['Eletrodomésticos', '/eletrodomesticos'], ['Eletroportáteis', '/eletroportateis'], ['Móveis', '/moveisedecoracao'], ['Smart TV', '/smart-tv'], ['Esporte & Lazer', '/esporte-e-lazer'], ['Pneus', '/pneus'] ];
    openDialog('Todas as categorias', `<nav class="preview-link-list" aria-label="Categorias">${fallback.map(([name, route]) => `<a href="https://www.zema.com${route}" target="_blank" rel="noopener noreferrer">${name}</a>`).join('')}</nav><p class="preview-note">Os links abrem os destinos originais do material enviado.</p>`);
  }
  function search(value) {
    const norm = value => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
    const query = norm(value.trim());
    const result = query ? catalog.filter(x => norm(x.name).includes(query)) : catalog;
    openDialog('Resultado da busca', result.length ? result.map(x => productCard(x)).join('') : '<p class="preview-empty">Nenhum produto corresponde à busca no catálogo incluído no ZIP.</p>');
  }
  async function share() {
    const url = location.href.split('#')[0];
    try {
      if (navigator.share) await navigator.share({ title: PRODUCT.name, url });
      else if (navigator.clipboard) { await navigator.clipboard.writeText(url); toast('Link privado copiado. O acesso continua restrito ao proprietário.'); }
      else openDialog('Compartilhar produto', `<input class="preview-field" readonly aria-label="URL do site" value="${escapeText(url)}"><p class="preview-note">O acesso continua privado.</p>`);
    } catch (error) { if (error.name !== 'AbortError') openDialog('Compartilhar produto', `<input class="preview-field" readonly aria-label="URL do site" value="${escapeText(url)}">`); }
  }

  document.addEventListener('submit', event => { if (event.target.querySelector('[name="searchTerms"]')) { event.preventDefault(); search(event.target.querySelector('[name="searchTerms"]').value); } });
  document.addEventListener('click', event => {
    const item = event.target.closest('[data-gallery-index]');
    if (item) { showGallery(Number(item.dataset.galleryIndex)); return; }
    const select = event.target.closest('[data-select-voltage]');
    if (select) { setVoltage(select.dataset.selectVoltage); closeDialog(); return; }
    const voltage = event.target.closest('[data-voltage]');
    if (voltage) { if (window.matchMedia('(max-width:1024px)').matches) showVoltage(); else setVoltage(voltage.dataset.voltage); return; }
    if (event.target.closest('#voltage-selector') && window.matchMedia('(max-width:1024px)').matches) { showVoltage(); return; }
    const accordion = event.target.closest('.chakra-accordion__button');
    if (accordion) { toggleAccordion(accordion); return; }
    const scroll = event.target.closest('[data-scroll]');
    if (scroll) { scrollToSection(scroll.dataset.scroll); return; }
    const target = event.target.closest('[data-action]');
    if (!target) { if (event.target.closest('#gallery-viewport') && Date.now() - lastSwipeAt > 400) zoom(); return; }
    const action = target.dataset.action;
    if (action === 'close-dialog') closeDialog();
    else if (action === 'back-top') window.scrollTo({ top: 0, behavior: 'smooth' });
    else if (action === 'menu') menu();
    else if (action === 'favorite') toggleFavorite(PRODUCT.id);
    else if (action === 'favorite-card') toggleFavorite(target.closest('[data-product-id]').dataset.productId);
    else if (action === 'remove-favorite') { state.favorites = state.favorites.filter(x => x !== target.dataset.id); persist(); renderState(); showFavorites(); }
    else if (action === 'favorites') showFavorites();
    else if (action === 'cart') showCart();
    else if (action === 'remove-cart') { state.cart = []; persist(); renderState(); showCart(); }
    else if (action === 'buy' || action === 'add-cart') {
      const result = addToCart(state, state.voltage);
      if (!result.ok) { toast('Esta voltagem está indisponível no material original.'); return; }
      state = result.state; persist(); renderState();
      if (action === 'buy') showCart(true); else toast(result.reason === 'already-added' ? 'Este item já está na sacola. Estoque da captura: 1 unidade.' : 'Produto adicionado à sacola.');
    }
    else if (action === 'quantity-minus' || action === 'quantity-plus') toast('A captura original possui apenas 1 unidade disponível.');
    else if (action === 'share') share();
    else if (action === 'shipping') shipping();
    else if (action === 'installments') showInstallments();
    else if (action === 'image-prev' || action === 'image-next') { showGallery(imageIndex + (action === 'image-next' ? 1 : -1)); zoom(); }
    else if (action === 'region') openDialog('Ofertas para minha região', `<p>Informe seu CEP para guardar sua região nesta prévia.</p><label for="region-cep">CEP</label><input id="region-cep" class="preview-field" inputmode="numeric" maxlength="9" placeholder="00000-000" value="${escapeText(state.cep)}"><button type="button" class="preview-primary" data-action="save-region">Salvar região</button>`);
    else if (action === 'save-region') { const input = $('#region-cep'); if (!validCep(input.value)) { input.setAttribute('aria-invalid', 'true'); input.focus(); toast('Informe um CEP com 8 números.'); } else { state.cep = normalizeCep(input.value); persist(); renderState(); closeDialog(); toast('Região salva nesta prévia.'); } }
    else if (action === 'show-product') scrollToSection('product-heading');
    else if (action === 'profile') openDialog('Meu Perfil', '<p class="preview-note">O ZIP não contém autenticação. Esta prévia não solicita senha ou dados de pagamento.</p><a class="preview-secondary" href="https://www.zema.com/registration" target="_blank" rel="noopener noreferrer">Abrir o cadastro original</a>');
    else if (action === 'card-info') { const card = target.closest('[data-product-id]'); const info = catalog.find(x => x.id === card.dataset.productId); if (info) openDialog('Informações do produto', productCard(info)); }
    else if (action === 'combo') { const oven = catalog.find(x => x.name.includes('Layr')); openDialog('Compre Junto', [catalog[0], oven].filter(Boolean).map(x => productCard(x)).join('')); }
    else if (action === 'assistant') openDialog('Ajuda sobre o produto', '<p>Panela de Arroz Mondial Bianca NEP05. A captura mostra a opção 110V disponível e a opção 220V indisponível.</p><p class="preview-note">Preço de referência: R$ 161,41 no Pix ou R$ 169,90 no cartão.</p><div class="preview-link-list"><button type="button" class="preview-secondary" data-scroll="accordion-informations">Descrição do produto</button><button type="button" class="preview-secondary" data-action="installments">Formas de parcelamento</button><button type="button" class="preview-secondary" data-action="close-dialog">Voltar ao site</button></div>');
  });
  document.addEventListener('keydown', event => {
    const interactive = event.target.closest('[role="button"]');
    if (interactive && (event.key === 'Enter' || event.key === ' ')) { event.preventDefault(); interactive.click(); }
    if (event.target.closest('#gallery-viewport') && (event.key === 'ArrowLeft' || event.key === 'ArrowRight')) { event.preventDefault(); showGallery(imageIndex + (event.key === 'ArrowRight' ? 1 : -1)); }
  });
  $('#postal-code').addEventListener('input', event => { const digits = normalizeCep(event.target.value); event.target.value = digits.length > 5 ? `${digits.slice(0, 5)}-${digits.slice(5)}` : digits; event.target.removeAttribute('aria-invalid'); });
  $('#postal-code').addEventListener('keydown', event => { if (event.key === 'Enter') { event.preventDefault(); shipping(); } });
  let touchStart = null;
  $('#gallery-viewport').addEventListener('touchstart', event => { const t = event.touches[0]; touchStart = { x: t.clientX, y: t.clientY }; }, { passive: true });
  $('#gallery-viewport').addEventListener('touchend', event => { if (!touchStart) return; const t = event.changedTouches[0]; const dx = t.clientX - touchStart.x, dy = t.clientY - touchStart.y; if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy)) { lastSwipeAt = Date.now(); showGallery(imageIndex + (dx < 0 ? 1 : -1)); } touchStart = null; }, { passive: true });
  function updateSticky() { const rect = $('#buy-and-add-to-cart-buttons').getBoundingClientRect(); const show = window.matchMedia('(max-width:1024px)').matches && rect.bottom < 0; $('#sticky-buy').hidden = !show; document.body.classList.toggle('has-sticky', show); }
  if ('IntersectionObserver' in window) new IntersectionObserver(updateSticky).observe($('#buy-and-add-to-cart-buttons'));
  window.addEventListener('scroll', updateSticky, { passive: true });
  window.addEventListener('resize', updateSticky);
  renderState(); updateSticky();
})();
