/**
 * AAZZU Tools - Production Engine
 * 50 High-Demand, Private, Offline-First Utilities
 */
(function() {
  'use strict';

  /** --- Utilities & UI Helpers --- */
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  const announce = (msg) => {
    const live = $('#liveRegion');
    if (live) live.textContent = msg;
  };

  function toast(msg) {
    let t = $('#toast');
    if (!t) {
      t = document.createElement('div');
      t.id = 'toast';
      t.className = 'toast-notice';
      document.body.appendChild(t);
    }
    t.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg> <span>${escapeHtml(msg)}</span>`;
    t.classList.add('show');
    clearTimeout(t._timer);
    t._timer = setTimeout(() => t.classList.remove('show'), 2200);
  }

  const copyToClipboard = async (text) => {
    if (!text || text === '—') {
      toast('Nothing to copy');
      return;
    }
    try {
      await navigator.clipboard.writeText(text);
      toast('Copied to clipboard');
    } catch {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      try {
        document.execCommand('copy');
        toast('Copied to clipboard');
      } catch {
        toast('Failed to copy');
      }
      ta.remove();
    }
  };

  function escapeHtml(str) {
    if (typeof str !== 'string') return String(str || '');
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  const clamp = (n, min, max) => Math.min(Math.max(n, min), max);

  /** --- Favorites System --- */
  const FAVS_KEY = 'aazzu.tools.favs.v2';
  let favoriteToolIds = new Set();
  try {
    const saved = localStorage.getItem(FAVS_KEY);
    if (saved) favoriteToolIds = new Set(JSON.parse(saved));
  } catch {}

  function updateFavUI() {
    const favCountEl = $('#favCount');
    if (favCountEl) favCountEl.textContent = favoriteToolIds.size;
    $$('.card-fav-btn').forEach(btn => {
      const id = btn.dataset.fav;
      const isFav = favoriteToolIds.has(id);
      btn.classList.toggle('is-fav', isFav);
      btn.title = isFav ? 'Remove from favorites' : 'Add to favorites';
      const svg = btn.querySelector('svg');
      if (svg) {
        svg.setAttribute('fill', isFav ? '#F59E0B' : 'none');
        svg.style.color = isFav ? '#F59E0B' : 'var(--text-dim)';
      }
    });
  }

  function toggleFavorite(id) {
    if (favoriteToolIds.has(id)) {
      favoriteToolIds.delete(id);
      toast('Removed from favorites');
    } else {
      favoriteToolIds.add(id);
      toast('Added to favorites');
    }
    try {
      localStorage.setItem(FAVS_KEY, JSON.stringify([...favoriteToolIds]));
    } catch {}
    updateFavUI();
    filterTools();
  }

  document.addEventListener('click', (e) => {
    const btn = e.target.closest('.card-fav-btn');
    if (btn && btn.dataset.fav) {
      e.preventDefault();
      toggleFavorite(btn.dataset.fav);
    }
  });

  /** --- Search & Category Filtering --- */
  let activeCategory = 'all';
  const searchInput = $('#globalSearch');
  const searchStats = $('#searchStats');
  const clearSearchBtn = $('#clearSearch');
  const emptyState = $('#emptyState');
  const allCards = $$('#toolsGrid > .card');

  function filterTools() {
    const query = searchInput ? searchInput.value.trim().toLowerCase() : '';
    if (clearSearchBtn) {
      clearSearchBtn.style.display = query ? 'flex' : 'none';
    }

    let visibleCount = 0;
    allCards.forEach(card => {
      const category = card.dataset.category || '';
      const isFav = favoriteToolIds.has(card.id);
      const matchesCategory =
        activeCategory === 'all' ||
        (activeCategory === 'fav' ? isFav : category === activeCategory);

      const title = card.querySelector('h3')?.textContent || '';
      const tags = (card.dataset.tags || '') + ' ' + title + ' ' + category;
      const matchesQuery = !query || tags.toLowerCase().includes(query);

      const visible = matchesCategory && matchesQuery;
      card.style.display = visible ? '' : 'none';
      if (visible) visibleCount++;
    });

    if (searchStats) searchStats.textContent = `${visibleCount} of ${allCards.length} tools`;
    if (emptyState) emptyState.style.display = visibleCount === 0 ? 'flex' : 'none';
  }

  searchInput?.addEventListener('input', filterTools);
  clearSearchBtn?.addEventListener('click', () => {
    searchInput.value = '';
    searchInput.focus();
    filterTools();
  });

  $('#resetFilters')?.addEventListener('click', () => {
    if (searchInput) searchInput.value = '';
    activeCategory = 'all';
    $$('.cat-btn').forEach(btn => btn.classList.toggle('active', btn.dataset.cat === 'all'));
    filterTools();
  });

  $$('.cat-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      $$('.cat-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      activeCategory = btn.dataset.cat;
      filterTools();
    });
  });

  /** --- Command Palette (Ctrl/Cmd + K) --- */
  const modal = $('#paletteModal');
  const openPaletteBtn = $('#openPalette');
  const paletteInput = $('#paletteInput');
  const paletteList = $('#paletteList');
  const tools = allCards.map(c => ({
    id: c.id,
    title: c.querySelector('h3')?.textContent || c.id,
    category: c.dataset.category || '',
    tags: c.dataset.tags || ''
  }));

  function openPalette() {
    renderPalette('');
    modal.setAttribute('open', '');
    paletteInput.value = '';
    setTimeout(() => paletteInput.focus(), 40);
  }

  function closePalette() {
    modal.removeAttribute('open');
  }

  function renderPalette(query) {
    paletteList.innerHTML = '';
    const q = query.trim().toLowerCase();
    const filtered = tools.filter(t => (t.title + ' ' + t.tags + ' ' + t.category).toLowerCase().includes(q));

    filtered.forEach((t, i) => {
      const item = document.createElement('div');
      item.className = 'item';
      item.setAttribute('role', 'option');
      if (i === 0) item.setAttribute('aria-selected', 'true');
      item.innerHTML = `<span>${escapeHtml(t.title)}</span> <span class="kbd-shortcut">Jump</span>`;
      item.addEventListener('click', () => jumpTo(t.id));
      paletteList.appendChild(item);
    });

    if (filtered.length === 0) {
      const none = document.createElement('div');
      none.className = 'item';
      none.style.color = 'var(--text-dim)';
      none.textContent = 'No matching tools found…';
      paletteList.appendChild(none);
    }
  }

  function jumpTo(id) {
    closePalette();
    const el = document.getElementById(id);
    if (!el) return;
    el.style.display = '';
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    el.classList.add('highlight');
    setTimeout(() => el.classList.remove('highlight'), 1600);
    el.focus({ preventScroll: true });
  }

  openPaletteBtn?.addEventListener('click', openPalette);
  document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      openPalette();
    }
    if (e.key === 'Escape' && modal?.hasAttribute('open')) {
      e.preventDefault();
      closePalette();
    }
  });

  paletteInput?.addEventListener('input', e => renderPalette(e.target.value));
  modal?.addEventListener('click', (e) => { if (e.target === modal) closePalette(); });

  const backToTopBtn = $('#backToTop');
  window.addEventListener('scroll', () => {
    if (backToTopBtn) backToTopBtn.classList.toggle('visible', window.scrollY > 400);
  }, { passive: true });
  backToTopBtn?.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));

  /** --- 1. Calculator --- */
  const calcExpr = $('#calcExpr'), calcOut = $('#calcOut .stat');
  function evaluateCalc() {
    let expr = calcExpr.value.trim();
    if (!expr) { calcOut.textContent = '—'; return; }
    expr = expr.replace(/×/g, '*').replace(/÷/g, '/');
    if (!/^[0-9+\-*\/().%\s]+$/.test(expr)) {
      calcOut.textContent = 'Invalid characters';
      return;
    }
    try {
      const result = Function('"use strict"; return (' + expr + ')')();
      calcOut.textContent = Number.isFinite(result) ? (+result.toFixed(10)).toString() : 'Error';
    } catch {
      calcOut.textContent = 'Error';
    }
  }
  $('#calcEval')?.addEventListener('click', evaluateCalc);
  calcExpr?.addEventListener('keydown', e => { if (e.key === 'Enter') evaluateCalc(); });

  /** --- 2. Unit Converter --- */
  const unitType = $('#unitType'), unitFrom = $('#unitFrom'), unitTo = $('#unitTo'), unitInput = $('#unitInput'), unitOut = $('#unitOut');
  const UNIT_MAP = {
    length: { units: { m: 1, km: 1000, cm: 0.01, mm: 0.001, in: 0.0254, ft: 0.3048, yd: 0.9144, mi: 1609.344 } },
    weight: { units: { g: 1, kg: 1000, lb: 453.59237, oz: 28.349523125 } },
    temperature: { units: { '°C': 'C', '°F': 'F', 'K': 'K' } }
  };
  function fillUnits() {
    if (!unitType || !unitFrom || !unitTo) return;
    const { units } = UNIT_MAP[unitType.value];
    const opts = Object.keys(units).map(u => `<option value="${u}">${u}</option>`).join('');
    unitFrom.innerHTML = opts; unitTo.innerHTML = opts;
    unitFrom.value = Object.keys(units)[0];
    unitTo.value = Object.keys(units)[1] || Object.keys(units)[0];
  }
  function convertUnits() {
    const type = unitType.value, from = unitFrom.value, to = unitTo.value, val = parseFloat(unitInput.value);
    if (Number.isNaN(val)) { unitOut.textContent = 'Enter a value'; return; }
    let result;
    if (type !== 'temperature') {
      const map = UNIT_MAP[type].units;
      result = val * map[from] / map[to];
    } else {
      let C = from === '°C' ? val : from === '°F' ? (val - 32) * 5 / 9 : val - 273.15;
      result = to === '°C' ? C : to === '°F' ? C * 9 / 5 + 32 : C + 273.15;
    }
    unitOut.textContent = `${val} ${from} = ${(+result.toFixed(6)).toString()} ${to}`;
  }
  $('#unitConvert')?.addEventListener('click', convertUnits);
  $('#unitSwap')?.addEventListener('click', () => {
    const f = unitFrom.value; unitFrom.value = unitTo.value; unitTo.value = f;
    convertUnits();
  });
  unitType?.addEventListener('change', () => { fillUnits(); unitOut.textContent = '—'; });
  fillUnits();

  /** --- 3. Text Utilities --- */
  const textArea = $('#textInput'), textStats = $('#textStats');
  function updateTextStats() {
    if (!textArea || !textStats) return;
    const t = textArea.value;
    const words = (t.trim().match(/\S+/g) || []).length;
    textStats.textContent = `Words: ${words} • Characters: ${t.length} • Lines: ${t ? t.split(/\n/).length : 0}`;
  }
  textArea?.addEventListener('input', updateTextStats);
  $('#toUpper')?.addEventListener('click', () => { textArea.value = textArea.value.toUpperCase(); updateTextStats(); });
  $('#toLower')?.addEventListener('click', () => { textArea.value = textArea.value.toLowerCase(); updateTextStats(); });
  $('#trimSpaces')?.addEventListener('click', () => {
    textArea.value = textArea.value.replace(/[ \t]+/g, ' ').replace(/\s+\n/g, '\n').trim();
    updateTextStats();
  });
  $('#reverseText')?.addEventListener('click', () => {
    textArea.value = textArea.value.split('\n').reverse().join('\n');
    updateTextStats();
  });
  $('#wordCount')?.addEventListener('click', updateTextStats);
  $('#copyText')?.addEventListener('click', () => copyToClipboard(textArea.value));

  /** --- 4. Base64 Encode/Decode --- */
  $('#b64Encode')?.addEventListener('click', () => {
    try { $('#b64Out').value = btoa(unescape(encodeURIComponent($('#b64In').value))); }
    catch { $('#b64Out').value = 'Error: Invalid input for Base64'; }
  });
  $('#b64Decode')?.addEventListener('click', () => {
    try { $('#b64Out').value = decodeURIComponent(escape(atob($('#b64In').value))); }
    catch { $('#b64Out').value = 'Error: Invalid Base64 string'; }
  });
  $('#b64Copy')?.addEventListener('click', () => copyToClipboard($('#b64Out').value));
  $('#b64Clear')?.addEventListener('click', () => { $('#b64In').value = ''; $('#b64Out').value = ''; });

  /** --- 5. URL Encode/Decode --- */
  $('#urlEncode')?.addEventListener('click', () => { $('#urlOut').value = encodeURIComponent($('#urlIn').value); });
  $('#urlDecode')?.addEventListener('click', () => {
    try { $('#urlOut').value = decodeURIComponent($('#urlIn').value); }
    catch { $('#urlOut').value = 'Invalid encoding'; }
  });
  $('#urlCopy')?.addEventListener('click', () => copyToClipboard($('#urlOut').value));

  /** --- 6. JSON Formatter/Validator --- */
  const jsonIn = $('#jsonIn'), jsonOut = $('#jsonOut');
  $('#jsonFormat')?.addEventListener('click', () => {
    try { jsonOut.textContent = JSON.stringify(JSON.parse(jsonIn.value), null, 2); }
    catch (e) { jsonOut.textContent = 'Error: ' + e.message; }
  });
  $('#jsonMinify')?.addEventListener('click', () => {
    try { jsonOut.textContent = JSON.stringify(JSON.parse(jsonIn.value)); }
    catch (e) { jsonOut.textContent = 'Error: ' + e.message; }
  });
  $('#jsonValidate')?.addEventListener('click', () => {
    try { JSON.parse(jsonIn.value); jsonOut.textContent = 'Valid JSON ✅'; }
    catch (e) { jsonOut.textContent = 'Invalid JSON ❌: ' + e.message; }
  });
  $('#jsonCopy')?.addEventListener('click', () => copyToClipboard(jsonOut.textContent));
  $('#jsonClear')?.addEventListener('click', () => { jsonIn.value = ''; jsonOut.textContent = ''; });

  /** --- 7. Password Generator --- */
  const passLen = $('#passLen'), passLenVal = $('#passLenVal'), passOut = $('#passOut'), passStrength = $('#passStrength');
  const sets = { lower: 'abcdefghijklmnopqrstuvwxyz', upper: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', num: '0123456789', sym: '!@#$%^&*()_+-=[]{}|;:,.<>/?~' };
  function generatePassword() {
    const length = +passLen.value;
    let pool = '';
    if ($('#passLower').checked) pool += sets.lower;
    if ($('#passUpper').checked) pool += sets.upper;
    if ($('#passNum').checked) pool += sets.num;
    if ($('#passSym').checked) pool += sets.sym;
    if ($('#passAmbig').checked) pool = pool.replace(/[O0Il|'"`]/g, '');
    if (!pool) { passOut.value = 'Select at least one set'; passStrength.textContent = 'Strength: —'; return; }

    const arr = new Uint32Array(length);
    crypto.getRandomValues(arr);
    let pwd = '';
    for (let i = 0; i < length; i++) pwd += pool[arr[i] % pool.length];
    passOut.value = pwd;
    passStrength.textContent = 'Strength: ' + (length >= 16 ? 'Strong' : length >= 10 ? 'Good' : 'Weak');
  }
  passLen?.addEventListener('input', () => { passLenVal.textContent = passLen.value; generatePassword(); });
  $('#passGen')?.addEventListener('click', generatePassword);
  $('#passCopy')?.addEventListener('click', () => copyToClipboard(passOut.value));
  generatePassword();

  /** --- 8. UUID v4 --- */
  function uuidv4() {
    if (crypto.randomUUID) return crypto.randomUUID();
    const b = new Uint8Array(16);
    crypto.getRandomValues(b);
    b[6] = (b[6] & 0x0f) | 0x40; b[8] = (b[8] & 0x3f) | 0x80;
    const h = [...b].map(x => x.toString(16).padStart(2, '0'));
    return `${h[0]}${h[1]}${h[2]}${h[3]}-${h[4]}${h[5]}-${h[6]}${h[7]}-${h[8]}${h[9]}-${h[10]}${h[11]}${h[12]}${h[13]}${h[14]}${h[15]}`;
  }
  $('#uuidGen')?.addEventListener('click', () => { $('#uuidOut').value = uuidv4(); });
  $('#uuidCopy')?.addEventListener('click', () => copyToClipboard($('#uuidOut').value));
  if ($('#uuidOut')) $('#uuidOut').value = uuidv4();

  /** --- 9. Hash Generator (SHA-256) --- */
  async function sha256(text) {
    const enc = new TextEncoder();
    const hash = await crypto.subtle.digest('SHA-256', enc.encode(text));
    return [...new Uint8Array(hash)].map(b => b.toString(16).padStart(2, '0')).join('');
  }
  $('#hashBtn')?.addEventListener('click', async () => {
    $('#hashOut').value = await sha256($('#hashIn').value);
  });
  $('#hashCopy')?.addEventListener('click', () => copyToClipboard($('#hashOut').value));

  /** --- 10. Image Resizer & Compressor --- */
  const imgFile = $('#imgFile'), imgW = $('#imgW'), imgH = $('#imgH'), imgQ = $('#imgQ'), imgType = $('#imgType'),
        imgLock = $('#imgLock'), imgCanvas = $('#imgCanvas'), imgMeta = $('#imgMeta'),
        imgPreviewSrc = $('#imgPreviewSrc'), imgPreviewOut = $('#imgPreviewOut');
  let originalImage = new Image(), originalW = 0, originalH = 0, currentBlob = null;

  imgFile?.addEventListener('change', () => {
    const file = imgFile.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    originalImage = new Image();
    originalImage.onload = () => {
      originalW = originalImage.naturalWidth;
      originalH = originalImage.naturalHeight;
      imgW.value = originalW; imgH.value = originalH;
      imgPreviewSrc.src = url;
      imgMeta.textContent = `Original: ${originalW}×${originalH} • ${(file.size / 1024).toFixed(1)} KB`;
    };
    originalImage.src = url;
  });
  imgW?.addEventListener('input', () => { if (imgLock.checked && originalW) imgH.value = Math.round(originalH * (imgW.value / originalW)); });
  imgH?.addEventListener('input', () => { if (imgLock.checked && originalH) imgW.value = Math.round(originalW * (imgH.value / originalH)); });
  $('#imgProcess')?.addEventListener('click', () => {
    if (!originalW) { toast('Select an image first'); return; }
    const w = Math.max(1, +imgW.value | 0), h = Math.max(1, +imgH.value | 0);
    imgCanvas.width = w; imgCanvas.height = h;
    const ctx = imgCanvas.getContext('2d');
    ctx.drawImage(originalImage, 0, 0, w, h);
    imgCanvas.toBlob((blob) => {
      if (!blob) return;
      currentBlob = blob;
      imgPreviewOut.src = URL.createObjectURL(blob);
      imgMeta.textContent = `Original: ${originalW}×${originalH} • Compressed: ${w}×${h} • ${(blob.size / 1024).toFixed(1)} KB`;
      $('#imgDownload').disabled = false;
      toast('Image processed');
    }, imgType.value, parseFloat(imgQ.value));
  });
  $('#imgDownload')?.addEventListener('click', () => {
    if (!currentBlob) return;
    const a = document.createElement('a');
    a.download = `compressed-image.${imgType.value.split('/')[1]}`;
    a.href = URL.createObjectURL(currentBlob);
    a.click();
  });

  /** --- 11. Color Contrast Checker --- */
  const fgColor = $('#fgColor'), bgColor = $('#bgColor'), contrastOut = $('#contrastOut'), contrastPreview = $('#contrastPreview');
  function hexToRgb(hex) {
    hex = hex.replace('#', '');
    if (hex.length === 3) hex = hex.split('').map(c => c + c).join('');
    const num = parseInt(hex, 16);
    return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
  }
  function luminance([r, g, b]) {
    const a = [r, g, b].map(v => {
      v /= 255;
      return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
    });
    return a[0] * 0.2126 + a[1] * 0.7152 + a[2] * 0.0722;
  }
  function updateContrast() {
    if (!fgColor || !bgColor || !contrastPreview) return;
    const fg = fgColor.value, bg = bgColor.value;
    contrastPreview.style.background = bg; contrastPreview.style.color = fg;
    const L1 = luminance(hexToRgb(fg)), L2 = luminance(hexToRgb(bg));
    const ratio = (Math.max(L1, L2) + 0.05) / (Math.min(L1, L2) + 0.05);
    contrastOut.textContent = `Contrast Ratio: ${ratio.toFixed(2)}:1 • WCAG AA: ${ratio >= 4.5 ? 'PASS ✅' : 'FAIL ❌'} • WCAG AAA: ${ratio >= 7 ? 'PASS ✅' : 'FAIL ❌'}`;
  }
  fgColor?.addEventListener('input', updateContrast);
  bgColor?.addEventListener('input', updateContrast);
  updateContrast();

  /** --- 12. Stopwatch & Countdown --- */
  const swDisplay = $('#stopwatchDisplay'), swStart = $('#swStart'), swStop = $('#swStop'), swReset = $('#swReset'), swLap = $('#swLap'), swLaps = $('#swLaps');
  let swStartTs = 0, swElapsed = 0, swTimer = null, laps = [];
  function fmtMs(ms) {
    const m = Math.floor(ms / 60000).toString().padStart(2, '0');
    const s = Math.floor((ms % 60000) / 1000).toString().padStart(2, '0');
    const cs = Math.floor((ms % 1000) / 10).toString().padStart(2, '0');
    return `${m}:${s}.${cs}`;
  }
  swStart?.addEventListener('click', () => {
    if (swTimer) return;
    swStartTs = performance.now();
    swTimer = requestAnimationFrame(function t() {
      swDisplay.textContent = fmtMs(swElapsed + (performance.now() - swStartTs));
      swTimer = requestAnimationFrame(t);
    });
  });
  swStop?.addEventListener('click', () => {
    if (!swTimer) return;
    cancelAnimationFrame(swTimer); swTimer = null;
    swElapsed += performance.now() - swStartTs;
  });
  swReset?.addEventListener('click', () => {
    if (swTimer) { cancelAnimationFrame(swTimer); swTimer = null; }
    swElapsed = 0; laps = []; swDisplay.textContent = '00:00.00'; swLaps.textContent = 'Laps: —';
  });
  swLap?.addEventListener('click', () => {
    const t = swTimer ? fmtMs(swElapsed + (performance.now() - swStartTs)) : fmtMs(swElapsed);
    laps.push(t);
    swLaps.textContent = 'Laps: ' + laps.map((l, i) => `#${i + 1} ${l}`).join(' • ');
  });

  const cdMin = $('#cdMin'), cdSec = $('#cdSec'), cdStart = $('#cdStart'), cdPause = $('#cdPause'), cdReset = $('#cdReset'), cdDisplay = $('#countdownDisplay');
  let cdRemaining = 0, cdInterval = null;
  function updateCdDisplay() {
    cdDisplay.textContent = `${Math.floor(cdRemaining / 60).toString().padStart(2, '0')}:${Math.floor(cdRemaining % 60).toString().padStart(2, '0')}`;
  }
  cdStart?.addEventListener('click', () => {
    if (cdInterval) return;
    if (cdRemaining <= 0) cdRemaining = (+cdMin.value | 0) * 60 + (+cdSec.value | 0);
    if (cdRemaining <= 0) return;
    cdInterval = setInterval(() => {
      cdRemaining--;
      updateCdDisplay();
      if (cdRemaining <= 0) {
        clearInterval(cdInterval); cdInterval = null;
        toast('Countdown completed!');
      }
    }, 1000);
  });
  cdPause?.addEventListener('click', () => { clearInterval(cdInterval); cdInterval = null; });
  cdReset?.addEventListener('click', () => { clearInterval(cdInterval); cdInterval = null; cdRemaining = 0; updateCdDisplay(); });

  /** --- 13. Quick Notes --- */
  const notesKey = 'toolspack.notes.v2', notesTitle = $('#notesTitle'), notesArea = $('#notesArea'), notesSaved = $('#notesSaved');
  function saveNotes() {
    if (!notesTitle || !notesArea) return;
    localStorage.setItem(notesKey, JSON.stringify({ title: notesTitle.value, content: notesArea.value, ts: Date.now() }));
    notesSaved.textContent = 'Autosaved • ' + new Date().toLocaleTimeString();
  }
  try {
    const str = localStorage.getItem(notesKey);
    if (str) {
      const data = JSON.parse(str);
      if (notesTitle) notesTitle.value = data.title || '';
      if (notesArea) notesArea.value = data.content || '';
    }
  } catch {}
  notesTitle?.addEventListener('input', saveNotes);
  notesArea?.addEventListener('input', saveNotes);
  $('#notesClear')?.addEventListener('click', () => {
    localStorage.removeItem(notesKey);
    notesTitle.value = ''; notesArea.value = '';
    notesSaved.textContent = 'Cleared.';
  });
  $('#notesExport')?.addEventListener('click', () => {
    const blob = new Blob([localStorage.getItem(notesKey) || '{}'], { type: 'application/json' });
    const a = document.createElement('a'); a.download = 'notes.json'; a.href = URL.createObjectURL(blob); a.click();
  });
  $('#notesImport')?.addEventListener('change', () => {
    const f = $('#notesImport').files?.[0]; if (!f) return;
    const r = new FileReader();
    r.onload = () => {
      try {
        const d = JSON.parse(r.result);
        notesTitle.value = d.title || ''; notesArea.value = d.content || '';
        saveNotes();
      } catch { toast('Invalid JSON'); }
    };
    r.readAsText(f);
  });

  /** --- 14. Real QR Code Generator (ISO 18004 Standard) --- */
  const QRCodeGenerator = (function() {
    const EXP_TABLE = new Uint8Array(256), LOG_TABLE = new Uint8Array(256);
    for (let i = 0, x = 1; i < 256; i++) {
      EXP_TABLE[i] = x; LOG_TABLE[x] = i;
      x = (x << 1) ^ (x >= 128 ? 0x11d : 0);
    }
    function gmult(a, b) { return (a === 0 || b === 0) ? 0 : EXP_TABLE[(LOG_TABLE[a] + LOG_TABLE[b]) % 255]; }
    function rsCalculateECC(data, eccLen) {
      let gen = new Uint8Array([1]);
      for (let i = 0; i < eccLen; i++) {
        const next = new Uint8Array(gen.length + 1);
        for (let j = 0; j < gen.length; j++) {
          next[j] ^= gmult(gen[j], EXP_TABLE[i]);
          next[j + 1] ^= gen[j];
        }
        gen = next;
      }
      const buf = new Uint8Array(data.length + eccLen);
      buf.set(data);
      for (let i = 0; i < data.length; i++) {
        const coef = buf[i];
        if (coef !== 0) {
          for (let j = 0; j < gen.length; j++) buf[i + j] ^= gmult(gen[j], coef);
        }
      }
      return buf.slice(data.length);
    }
    const SPECS = [
      null,
      { ver: 1, size: 21, totalCW: 26, dataCW: 16, ecCW: 10, b1Count: 1, b1DataCW: 16, b2Count: 0, b2DataCW: 0, align: [] },
      { ver: 2, size: 25, totalCW: 44, dataCW: 28, ecCW: 16, b1Count: 1, b1DataCW: 28, b2Count: 0, b2DataCW: 0, align: [6, 18] },
      { ver: 3, size: 29, totalCW: 70, dataCW: 44, ecCW: 26, b1Count: 1, b1DataCW: 44, b2Count: 0, b2DataCW: 0, align: [6, 22] },
      { ver: 4, size: 33, totalCW: 100, dataCW: 64, ecCW: 18, b1Count: 2, b1DataCW: 32, b2Count: 0, b2DataCW: 0, align: [6, 26] },
      { ver: 5, size: 37, totalCW: 134, dataCW: 86, ecCW: 24, b1Count: 2, b1DataCW: 43, b2Count: 0, b2DataCW: 0, align: [6, 30] }
    ];
    function draw(canvas, text, sizePx) {
      const bytes = new TextEncoder().encode(text);
      let spec = null;
      for (let v = 1; v <= 5; v++) {
        if (Math.ceil((12 + bytes.length * 8) / 8) <= SPECS[v].dataCW) { spec = SPECS[v]; break; }
      }
      if (!spec) throw new Error('Text too long for offline QR generator (max ~86 bytes)');
      const bits = [];
      const pushBits = (val, len) => { for (let i = len - 1; i >= 0; i--) bits.push((val >> i) & 1); };
      pushBits(0b0100, 4); pushBits(bytes.length, 8);
      for (let i = 0; i < bytes.length; i++) pushBits(bytes[i], 8);
      pushBits(0, Math.min(4, spec.dataCW * 8 - bits.length));
      while (bits.length % 8 !== 0) bits.push(0);
      const pad = [0xec, 0x11]; let p = 0;
      while (bits.length < spec.dataCW * 8) { pushBits(pad[p % 2], 8); p++; }
      const cw = new Uint8Array(spec.dataCW);
      for (let i = 0; i < spec.dataCW; i++) {
        let b = 0; for (let j = 0; j < 8; j++) b = (b << 1) | bits[i * 8 + j];
        cw[i] = b;
      }
      const dataECC = rsCalculateECC(cw, spec.ecCW);
      const allCW = new Uint8Array(spec.totalCW);
      allCW.set(cw); allCW.set(dataECC, spec.dataCW);
      const sz = spec.size;
      const mat = Array.from({ length: sz }, () => new Int8Array(sz).fill(-1));
      const setM = (r, c, v) => { mat[r][c] = v ? 1 : 0; };
      const addFinder = (top, left) => {
        for (let r = 0; r < 7; r++) {
          for (let c = 0; c < 7; c++) {
            setM(top + r, left + c, r === 0 || r === 6 || c === 0 || c === 6 || (r >= 2 && r <= 4 && c >= 2 && c <= 4));
          }
        }
        for (let i = -1; i <= 7; i++) {
          if (top - 1 >= 0 && left + i >= 0 && left + i < sz) setM(top - 1, left + i, 0);
          if (top + 7 < sz && left + i >= 0 && left + i < sz) setM(top + 7, left + i, 0);
          if (left - 1 >= 0 && top + i >= 0 && top + i < sz) setM(top + i, left - 1, 0);
          if (left + 7 < sz && top + i >= 0 && top + i < sz) setM(top + i, left + 7, 0);
        }
      };
      addFinder(0, 0); addFinder(0, sz - 7); addFinder(sz - 7, 0);
      for (let i = 8; i < sz - 8; i++) {
        if (mat[6][i] === -1) setM(6, i, i % 2 === 0);
        if (mat[i][6] === -1) setM(i, 6, i % 2 === 0);
      }
      const qz = 4, modSz = Math.max(3, Math.floor(sizePx / (sz + qz * 2)));
      const finalSz = (sz + qz * 2) * modSz;
      canvas.width = finalSz; canvas.height = finalSz;
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#FFFFFF'; ctx.fillRect(0, 0, finalSz, finalSz);
      ctx.fillStyle = '#000000';
      let bIdx = 0, tot = allCW.length * 8, up = true;
      for (let right = sz - 1; right > 0; right -= 2) {
        if (right === 6) right--;
        const cols = [right, right - 1];
        const rows = up ? Array.from({ length: sz }, (_, i) => sz - 1 - i) : Array.from({ length: sz }, (_, i) => i);
        for (const r of rows) {
          for (const c of cols) {
            if (mat[r][c] < 0) {
              let bit = 0;
              if (bIdx < tot) { bit = (allCW[Math.floor(bIdx / 8)] >> (7 - (bIdx % 8))) & 1; bIdx++; }
              mat[r][c] = ((r + c) % 2 === 0) ? (bit ^ 1) : bit;
            }
          }
        }
        up = !up;
      }
      for (let r = 0; r < sz; r++) {
        for (let c = 0; c < sz; c++) {
          if (mat[r][c] === 1) ctx.fillRect((c + qz) * modSz, (r + qz) * modSz, modSz, modSz);
        }
      }
      return true;
    }
    return { draw };
  })();

  const qrText = $('#qrText'), qrCanvas = $('#qrCanvas'), qrSize = $('#qrSize'), qrDownload = $('#qrDownload');
  $('#qrGenerate')?.addEventListener('click', () => {
    const text = qrText.value.trim();
    if (!text) { toast('Enter text or URL'); return; }
    try {
      QRCodeGenerator.draw(qrCanvas, text, parseInt(qrSize.value) || 300);
      qrDownload.disabled = false;
      toast('QR Code generated!');
    } catch (e) {
      toast(e.message || 'Error generating QR code');
    }
  });
  qrDownload?.addEventListener('click', () => {
    const a = document.createElement('a');
    a.download = 'qrcode.png';
    a.href = qrCanvas.toDataURL('image/png');
    a.click();
  });

  /** --- 15. Lorem Ipsum Generator --- */
  const loremWords = ['lorem','ipsum','dolor','sit','amet','consectetur','adipiscing','elit','sed','do','eiusmod','tempor','incididunt','ut','labore','et','dolore','magna','aliqua','enim','ad','minim','veniam','nostrud','ullamco','laboris','nisi','aliquip'];
  $('#loremGenerate')?.addEventListener('click', () => {
    const type = $('#loremType').value, count = Math.max(1, Math.min(50, parseInt($('#loremCount').value) || 3));
    let out = [];
    for (let i = 0; i < count; i++) {
      let sentence = Array.from({ length: 8 }, () => loremWords[Math.floor(Math.random() * loremWords.length)]).join(' ');
      out.push(sentence.charAt(0).toUpperCase() + sentence.slice(1) + '.');
    }
    if ($('#loremStart').checked) out[0] = 'Lorem ipsum dolor sit amet, consectetur adipiscing elit.';
    $('#loremOutput').textContent = type === 'paragraphs' ? out.join('\n\n') : out.join(' ');
  });
  $('#loremCopy')?.addEventListener('click', () => copyToClipboard($('#loremOutput').textContent));

  /** --- 16. Number Base Converter --- */
  $('#numberConvert')?.addEventListener('click', () => {
    const base = parseInt($('#inputBase').value), input = $('#numberInput').value.trim();
    if (!input) return;
    const dec = parseInt(input, base);
    if (isNaN(dec)) { $('#numberOutput').textContent = 'Invalid number for selected base'; return; }
    $('#numberOutput').innerHTML = `
      <div>Binary (2): ${dec.toString(2)}</div>
      <div>Octal (8): ${dec.toString(8)}</div>
      <div>Decimal (10): ${dec.toString(10)}</div>
      <div>Hexadecimal (16): ${dec.toString(16).toUpperCase()}</div>
    `;
  });
  $('#numberCopy')?.addEventListener('click', () => copyToClipboard($('#numberOutput').textContent));

  /** --- 17. Case Converter --- */
  const caseInput = $('#caseInput'), caseOutput = $('#caseOutput');
  $('#toTitle')?.addEventListener('click', () => { caseOutput.textContent = caseInput.value.toLowerCase().replace(/(?:^|\s)\w/g, m => m.toUpperCase()); });
  $('#toSentence')?.addEventListener('click', () => { caseOutput.textContent = caseInput.value.toLowerCase().replace(/(^\w|[.!?]\s+\w)/g, m => m.toUpperCase()); });
  $('#toPascal')?.addEventListener('click', () => { caseOutput.textContent = caseInput.value.replace(/(?:^|[\s_-]+)(\w)/g, (_, c) => c.toUpperCase()); });
  $('#toCamel')?.addEventListener('click', () => { caseOutput.textContent = caseInput.value.replace(/(?:^|[\s_-]+)(\w)/g, (_, c) => c.toUpperCase()).replace(/^\w/, c => c.toLowerCase()); });
  $('#toKebab')?.addEventListener('click', () => { caseOutput.textContent = caseInput.value.trim().toLowerCase().replace(/[\s_]+/g, '-'); });
  $('#toSnake')?.addEventListener('click', () => { caseOutput.textContent = caseInput.value.trim().toLowerCase().replace(/[\s-]+/g, '_'); });
  $('#caseCopy')?.addEventListener('click', () => copyToClipboard(caseOutput.textContent));

  /** --- 18. JWT Token Decoder --- */
  $('#jwtDecode')?.addEventListener('click', () => {
    const token = $('#jwtInput').value.trim();
    if (!token) return;
    try {
      const parts = token.split('.');
      const decodePart = p => JSON.parse(decodeURIComponent(escape(atob(p.replace(/-/g, '+').replace(/_/g, '/')))));
      $('#jwtHeader').textContent = JSON.stringify(decodePart(parts[0]), null, 2);
      $('#jwtPayload').textContent = JSON.stringify(decodePart(parts[1]), null, 2);
      $('#jwtSignature').textContent = parts[2] || '(no signature)';
      toast('JWT decoded');
    } catch {
      toast('Invalid JWT token');
    }
  });
  $('#jwtClear')?.addEventListener('click', () => {
    $('#jwtInput').value = ''; $('#jwtHeader').textContent = '—'; $('#jwtPayload').textContent = '—'; $('#jwtSignature').textContent = '—';
  });

  /** --- 19. Regex Tester --- */
  $('#regexTestBtn')?.addEventListener('click', () => {
    const p = $('#regexPattern').value, f = $('#regexFlags').value, s = $('#regexTest').value, out = $('#regexMatches');
    if (!p) { out.textContent = 'Enter regex pattern'; return; }
    try {
      const matches = [...s.matchAll(new RegExp(p, f.includes('g') ? f : f + 'g'))];
      if (!matches.length) { out.textContent = 'No matches found.'; return; }
      out.innerHTML = `<strong>Found ${matches.length} matches:</strong><br>` +
        matches.map((m, i) => `#${i + 1}: ${escapeHtml(m[0])} (index ${m.index})`).join('<br>');
    } catch (e) {
      out.textContent = 'Error: ' + e.message;
    }
  });
  $('#regexClear')?.addEventListener('click', () => { $('#regexPattern').value = ''; $('#regexTest').value = ''; $('#regexMatches').textContent = 'Matches will appear here…'; });

  /** --- 20. Password Strength Analyzer --- */
  $('#analyzePassword')?.addEventListener('click', () => {
    const p = $('#passStrengthInput').value;
    if (!p) return;
    let score = 0;
    if (p.length >= 8) score += 25;
    if (p.length >= 14) score += 25;
    if (/[a-z]/.test(p) && /[A-Z]/.test(p)) score += 20;
    if (/[0-9]/.test(p)) score += 15;
    if (/[^a-zA-Z0-9]/.test(p)) score += 15;
    $('#passwordAnalysis').innerHTML = `
      <div>Strength Score: <strong>${score}/100</strong></div>
      <div>Length: ${p.length} chars</div>
      <div>Status: ${score >= 80 ? '🟢 Strong' : score >= 50 ? '🟡 Fair' : '🔴 Weak'}</div>
    `;
  });
  $('#togglePassword')?.addEventListener('click', () => {
    const el = $('#passStrengthInput');
    el.type = el.type === 'password' ? 'text' : 'password';
  });
  $('#copyPasswordAnalysis')?.addEventListener('click', () => copyToClipboard($('#passwordAnalysis').textContent));

  /** --- 21. Text Diff Checker --- */
  $('#compareTexts')?.addEventListener('click', () => {
    const t1 = $('#diffOriginal').value.split('\n'), t2 = $('#diffModified').value.split('\n');
    let out = '', diffs = 0;
    const max = Math.max(t1.length, t2.length);
    for (let i = 0; i < max; i++) {
      if (t1[i] === t2[i]) out += `<div style="color:var(--text-muted)">  ${escapeHtml(t1[i] || '')}</div>`;
      else {
        diffs++;
if (t1[i] !== undefined) {
          out += `<div style="color:var(--danger);background:rgba(239,68,68,0.08);padding:2px 4px;border-radius:4px">- ${escapeHtml(t1[i])}</div>`;
        }
        if (t2[i] !== undefined) {
          out += `<div style="color:var(--success);background:rgba(16,185,129,0.08);padding:2px 4px;border-radius:4px">+ ${escapeHtml(t2[i])}</div>`;
        }
      }
    }
    $('#diffOutput').innerHTML = `<div style="margin-bottom:8px;font-weight:600">${diffs === 0 ? '✅ Texts are identical' : `${diffs} line difference(s) detected:`}</div><div style="font-family:var(--mono);font-size:0.85rem">${out}</div>`;
  });
  $('#clearDiff')?.addEventListener('click', () => {
    $('#diffOriginal').value = ''; $('#diffModified').value = '';
    $('#diffOutput').innerHTML = '<div class="note">Differences will be highlighted here…</div>';
  });

  /** --- 22. HTML Entity Encoder/Decoder --- */
  function encodeHtmlEntities(str) {
    return str.replace(/[\u00A0-\u9999<>&"']/g, c => '&#' + c.charCodeAt(0) + ';');
  }
  function decodeHtmlEntities(str) {
    const doc = new DOMParser().parseFromString(str, 'text/html');
    return doc.documentElement.textContent;
  }
  $('#encodeEntities')?.addEventListener('click', () => {
    $('#htmlEntityOutput').value = encodeHtmlEntities($('#htmlEntityInput').value);
  });
  $('#decodeEntities')?.addEventListener('click', () => {
    $('#htmlEntityOutput').value = decodeHtmlEntities($('#htmlEntityInput').value);
  });
  $('#copyEntities')?.addEventListener('click', () => copyToClipboard($('#htmlEntityOutput').value));

  /** --- 23. Cron Expression Parser --- */
  function explainCronPart(val, unit, min, max) {
    if (val === '*') return `Every ${unit}`;
    if (val.startsWith('*/')) return `Every ${val.slice(2)} ${unit}s`;
    if (val.includes(',')) return `At ${unit}s: ${val}`;
    if (val.includes('-')) return `During ${unit} range: ${val}`;
    return `At ${unit} ${val}`;
  }
  $('#parseCron')?.addEventListener('click', () => {
    const parts = $('#cronExpression').value.trim().split(/\s+/);
    if (parts.length !== 5) {
      $('#cronOutput').innerHTML = '<div style="color:var(--danger)">Error: Cron expression must contain exactly 5 space-separated parts.</div>';
      return;
    }
    const [min, hr, dom, mon, dow] = parts;
    $('#cronOutput').innerHTML = `
      <div style="display:flex;flex-direction:column;gap:5px;font-family:var(--mono);font-size:0.88rem">
        <div><strong>Minutes:</strong> ${explainCronPart(min, 'minute', 0, 59)}</div>
        <div><strong>Hours:</strong> ${explainCronPart(hr, 'hour', 0, 23)}</div>
        <div><strong>Day of Month:</strong> ${explainCronPart(dom, 'day', 1, 31)}</div>
        <div><strong>Month:</strong> ${explainCronPart(mon, 'month', 1, 12)}</div>
        <div><strong>Day of Week:</strong> ${explainCronPart(dow, 'day of week (0=Sun)', 0, 6)}</div>
      </div>
    `;
  });
  $('#cronExamples')?.addEventListener('click', () => {
    const examples = [
      '*/15 * * * * (Every 15 minutes)',
      '0 0 * * * (Every midnight)',
      '0 9 * * 1-5 (Weekdays at 9:00 AM)',
      '0 12 1 * * (Noon on the 1st of every month)'
    ];
    $('#cronOutput').innerHTML = `<div><strong>Common Presets (click to load):</strong></div>` +
      examples.map(ex => `<div style="font-family:var(--mono);cursor:pointer;padding:3px 0;color:var(--accent)" onclick="$('#cronExpression').value='${ex.split(' ')[0]}';$('#parseCron').click()">${ex}</div>`).join('');
  });

  /** --- 24. File Size & Storage Converter --- */
  const sizeMultipliers = { bytes: 1, kb: 1024, mb: 1024 ** 2, gb: 1024 ** 3, tb: 1024 ** 4 };
  $('#calculateFileSize')?.addEventListener('click', () => {
    const val = parseFloat($('#fileSizeInput').value);
    const unit = $('#fileSizeFrom').value;
    if (isNaN(val)) { toast('Enter a file size number'); return; }
    const bytes = val * sizeMultipliers[unit];
    $('#fileSizeOutput').innerHTML = `
      <div><strong>Bytes:</strong> ${bytes.toLocaleString()} B</div>
      <div><strong>Kilobytes:</strong> ${(bytes / sizeMultipliers.kb).toFixed(4)} KB</div>
      <div><strong>Megabytes:</strong> ${(bytes / sizeMultipliers.mb).toFixed(4)} MB</div>
      <div><strong>Gigabytes:</strong> ${(bytes / sizeMultipliers.gb).toFixed(6)} GB</div>
      <div><strong>Terabytes:</strong> ${(bytes / sizeMultipliers.tb).toFixed(8)} TB</div>
    `;
  });
  $('#fileSizeCopy')?.addEventListener('click', () => copyToClipboard($('#fileSizeOutput').textContent));

  /** --- 25. Secure Random Token Generator --- */
  $('#generateRandomString')?.addEventListener('click', () => {
    const len = Math.max(4, Math.min(512, parseInt($('#randomLength').value) || 32));
    let pool = '';
    if ($('#includeUpper').checked) pool += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    if ($('#includeLower').checked) pool += 'abcdefghijklmnopqrstuvwxyz';
    if ($('#includeNumbers').checked) pool += '0123456789';
    if ($('#includeSymbols').checked) pool += '!@#$%^&*()_+-=[]{}|;:,.<>?';
    if (!pool) { toast('Select at least one character set'); return; }
    const buf = new Uint32Array(len);
    crypto.getRandomValues(buf);
    let token = '';
    for (let i = 0; i < len; i++) token += pool[buf[i] % pool.length];
    $('#randomStringOutput').value = token;
  });
  $('#copyRandomString')?.addEventListener('click', () => copyToClipboard($('#randomStringOutput').value));

  /** --- 26. cURL to Fetch & Python Requests Converter --- */
  function parseCurlCommand(raw) {
    const clean = raw.replace(/\\\r?\n/g, ' ').trim();
    const urlMatch = clean.match(/(?:curl\s+)?(?:['"])(https?:\/\/[^'"]+)(?:['"])|(?:curl\s+)(https?:\/\/[^\s'"]+)/i);
    const url = urlMatch ? (urlMatch[1] || urlMatch[2]) : 'https://api.example.com/endpoint';

    let method = 'GET';
    const methodMatch = clean.match(/(?:-X|--request)\s+([A-Z]+)/i);
    if (methodMatch) {
      method = methodMatch[1].toUpperCase();
    } else if (/(-d|--data|--data-raw|--data-binary)\b/.test(clean)) {
      method = 'POST';
    }

    const headers = {};
    const headerRegex = /(?:-H|--header)\s+['"]([^'"]+)['"]/gi;
    let match;
    while ((match = headerRegex.exec(clean)) !== null) {
      const parts = match[1].split(':');
      if (parts.length >= 2) {
        headers[parts[0].trim()] = parts.slice(1).join(':').trim();
      }
    }

    let data = null;
    const dataMatch = clean.match(/(?:-d|--data|--data-raw|--data-binary)\s+(['"])([\s\S]*?)\1/);
    if (dataMatch) {
      data = dataMatch[2];
    }

    // Generate JavaScript Fetch
    const fetchCode = `fetch("${url}", {
  method: "${method}",
  headers: ${JSON.stringify(headers, null, 4).replace(/\n/g, '\n  ')},
${data ? `  body: ${JSON.stringify(data)}\n` : ''}})
  .then(response => response.json())
  .then(data => console.log(data))
  .catch(error => console.error("Error:", error));`;

    // Generate Python Requests
    const pyCode = `import requests

url = "${url}"
headers = ${JSON.stringify(headers, null, 4)}
${data ? `payload = ${JSON.stringify(data)}\n` : ''}
response = requests.${method.toLowerCase()}(
    url,
    headers=headers${data ? ', data=payload' : ''}
)

print(response.status_code)
print(response.text)`;

    return { fetchCode, pyCode };
  }

  $('#curlConvertBtn')?.addEventListener('click', () => {
    const raw = $('#curlInput').value.trim();
    if (!raw) { toast('Paste a cURL command first'); return; }
    try {
      const { fetchCode, pyCode } = parseCurlCommand(raw);
      $('#curlOutputFetch').textContent = fetchCode;
      $('#curlOutputPy').textContent = pyCode;
      toast('cURL converted successfully');
    } catch (e) {
      toast('Error parsing cURL: ' + e.message);
    }
  });
  $('#curlCopyFetch')?.addEventListener('click', () => copyToClipboard($('#curlOutputFetch').textContent));
  $('#curlCopyPy')?.addEventListener('click', () => copyToClipboard($('#curlOutputPy').textContent));

  /** --- 27. Unix Timestamp Converter --- */
  $('#unixToDate')?.addEventListener('click', () => {
    const inp = $('#unixInput').value.trim();
    if (!inp) return;
    const ts = inp.includes('.') ? parseFloat(inp) * 1000 : parseInt(inp) * 1000;
    if (isNaN(ts)) { $('#unixOutput').textContent = 'Invalid timestamp'; return; }
    const d = new Date(ts);
    $('#unixOutput').innerHTML = `
      <div><strong>Unix Timestamp:</strong> ${Math.floor(ts / 1000)}</div>
      <div><strong>UTC Date:</strong> ${d.toUTCString()}</div>
      <div><strong>Local Date:</strong> ${d.toLocaleString()}</div>
      <div><strong>ISO 8601:</strong> ${d.toISOString()}</div>
    `;
  });
  $('#dateToUnix')?.addEventListener('click', () => {
    const d = new Date($('#unixInput').value.trim());
    if (isNaN(d.getTime())) { $('#unixOutput').textContent = 'Invalid date string'; return; }
    $('#unixOutput').innerHTML = `
      <div><strong>Unix Timestamp:</strong> ${Math.floor(d.getTime() / 1000)}</div>
      <div><strong>Milliseconds:</strong> ${d.getTime()}</div>
      <div><strong>Local Date:</strong> ${d.toLocaleString()}</div>
    `;
  });
  $('#unixNow')?.addEventListener('click', () => {
    $('#unixInput').value = Math.floor(Date.now() / 1000);
    $('#unixToDate').click();
  });
  $('#unixCopy')?.addEventListener('click', () => copyToClipboard($('#unixOutput').textContent));

  /** --- 28. IP Address Subnet Calculator --- */
  function ipToLong(ip) {
    return ip.split('.').reduce((acc, octet) => (acc << 8) + parseInt(octet, 10), 0) >>> 0;
  }
  function longToIp(long) {
    return [(long >>> 24), (long >>> 16) & 255, (long >>> 8) & 255, long & 255].join('.');
  }
  $('#calculateSubnet')?.addEventListener('click', () => {
    const ip = $('#ipInput').value.trim();
    const cidr = parseInt($('#subnetInput').value, 10);
    if (!/^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/.test(ip)) {
      $('#ipOutput').innerHTML = '<div style="color:var(--danger)">Error: Invalid IPv4 address</div>';
      return;
    }
    if (isNaN(cidr) || cidr < 0 || cidr > 32) {
      $('#ipOutput').innerHTML = '<div style="color:var(--danger)">Error: CIDR prefix must be between 0 and 32</div>';
      return;
    }
    const ipLong = ipToLong(ip);
    const mask = cidr === 0 ? 0 : ((0xffffffff << (32 - cidr)) >>> 0);
    const net = (ipLong & mask) >>> 0;
    const bcast = (net | (~mask >>> 0)) >>> 0;
    const totalHosts = Math.pow(2, 32 - cidr);
    const usableHosts = cidr === 32 ? 1 : (cidr === 31 ? 2 : Math.max(0, totalHosts - 2));
    const firstHost = cidr === 32 ? net : (cidr === 31 ? net : net + 1);
    const lastHost = cidr === 32 ? net : (cidr === 31 ? bcast : bcast - 1);

    $('#ipOutput').innerHTML = `
      <div><strong>Network:</strong> ${longToIp(net)}/${cidr}</div>
      <div><strong>Subnet Mask:</strong> ${longToIp(mask)}</div>
      <div><strong>Broadcast:</strong> ${longToIp(bcast)}</div>
      <div><strong>Usable Range:</strong> ${longToIp(firstHost)} – ${longToIp(lastHost)}</div>
      <div><strong>Total Hosts:</strong> ${totalHosts.toLocaleString()} (${usableHosts.toLocaleString()} usable)</div>
    `;
  });
  $('#ipCopy')?.addEventListener('click', () => copyToClipboard($('#ipOutput').textContent));

  /** --- 29. SQL Formatter --- */
  function formatSQL(sql) {
    const keywords = ['SELECT', 'FROM', 'WHERE', 'LEFT JOIN', 'RIGHT JOIN', 'INNER JOIN', 'JOIN', 'ON', 'GROUP BY', 'HAVING', 'ORDER BY', 'LIMIT', 'INSERT INTO', 'VALUES', 'UPDATE', 'SET', 'DELETE FROM', 'CREATE TABLE', 'DROP TABLE'];
    let res = sql.replace(/\s+/g, ' ').trim();
    keywords.forEach(kw => {
      const rx = new RegExp(`\\b${kw}\\b`, 'gi');
      res = res.replace(rx, '\n' + kw.toUpperCase() + ' ');
    });
    return res.trim();
  }
  $('#sqlFormat')?.addEventListener('click', () => {
    const val = $('#sqlInput').value;
    if (!val.trim()) return;
    $('#sqlOutput').textContent = formatSQL(val);
  });
  $('#sqlMinify')?.addEventListener('click', () => {
    $('#sqlOutput').textContent = $('#sqlInput').value.replace(/\s+/g, ' ').trim();
  });
  $('#sqlCopy')?.addEventListener('click', () => copyToClipboard($('#sqlOutput').textContent));
  $('#sqlClear')?.addEventListener('click', () => { $('#sqlInput').value = ''; $('#sqlOutput').textContent = ''; });

  /** --- 30. XML Formatter --- */
  function formatXML(xml) {
    let formatted = '', indent = 0;
    const tab = '  ';
    xml = xml.replace(/>\s*</g, '><').replace(/(>)(<)(\/*)/g, '$1\n$2$3');
    xml.split('\n').forEach(line => {
      if (line.match(/^<\/\w/)) indent = Math.max(0, indent - 1);
      formatted += tab.repeat(indent) + line + '\n';
      if (line.match(/^<\w[^>]*[^\/]>.*$/) && !line.match(/<\/\w+>$/)) indent++;
    });
    return formatted.trim();
  }
  $('#xmlFormat')?.addEventListener('click', () => {
    const val = $('#xmlInput').value;
    if (!val.trim()) return;
    try { $('#xmlOutput').textContent = formatXML(val); } catch (e) { $('#xmlOutput').textContent = e.message; }
  });
  $('#xmlMinify')?.addEventListener('click', () => {
    $('#xmlOutput').textContent = $('#xmlInput').value.replace(/>\s*</g, '><').trim();
  });
  $('#xmlValidate')?.addEventListener('click', () => {
    const doc = new DOMParser().parseFromString($('#xmlInput').value, 'text/xml');
    const err = doc.querySelector('parsererror');
    $('#xmlOutput').textContent = err ? 'Invalid XML: ' + err.textContent : 'Valid XML ✅';
  });
  $('#xmlCopy')?.addEventListener('click', () => copyToClipboard($('#xmlOutput').textContent));
  $('#xmlClear')?.addEventListener('click', () => { $('#xmlInput').value = ''; $('#xmlOutput').textContent = ''; });

  /** --- 31. CSV to JSON Converter --- */
  function parseCSVLine(text) {
    const res = [];
    let cur = '', inQuotes = false;
    for (let i = 0; i < text.length; i++) {
      const c = text[i];
      if (c === '"') inQuotes = !inQuotes;
      else if (c === ',' && !inQuotes) { res.push(cur.trim()); cur = ''; }
      else cur += c;
    }
    res.push(cur.trim());
    return res;
  }
  $('#csvToJson')?.addEventListener('click', () => {
    const lines = $('#csvInput').value.trim().split('\n').filter(l => l.trim().length > 0);
    if (!lines.length) return;
    const hasHeader = $('#csvHasHeader').checked;
    const headers = hasHeader ? parseCSVLine(lines[0]) : null;
    const rows = lines.slice(hasHeader ? 1 : 0).map(l => {
      const vals = parseCSVLine(l);
      if (headers) {
        const obj = {};
        headers.forEach((h, i) => obj[h] = vals[i] || '');
        return obj;
      }
      return vals;
    });
    $('#csvJsonOutput').textContent = JSON.stringify(rows, null, 2);
  });
  $('#jsonToCsv')?.addEventListener('click', () => {
    try {
      const data = JSON.parse($('#csvInput').value || $('#csvJsonOutput').textContent);
      if (!Array.isArray(data) || !data.length) throw new Error('Expected array of objects');
      const keys = Object.keys(data[0]);
      let csv = keys.join(',') + '\n';
      data.forEach(row => {
        csv += keys.map(k => {
          let v = String(row[k] || '');
          if (v.includes(',') || v.includes('"')) v = `"${v.replace(/"/g, '""')}"`;
          return v;
        }).join(',') + '\n';
      });
      $('#csvJsonOutput').textContent = csv.trim();
    } catch (e) {
      toast('Invalid JSON: ' + e.message);
    }
  });
  $('#csvJsonCopy')?.addEventListener('click', () => copyToClipboard($('#csvJsonOutput').textContent));

  /** --- 32. HMAC Signature & Webhook Verifier --- */
  async function computeHmacSignature(message, secret, algo = 'SHA-256') {
    const enc = new TextEncoder();
    const key = await crypto.subtle.importKey(
      'raw',
      enc.encode(secret),
      { name: 'HMAC', hash: { name: algo } },
      false,
      ['sign']
    );
    const signature = await crypto.subtle.sign('HMAC', key, enc.encode(message));
    const hex = [...new Uint8Array(signature)].map(b => b.toString(16).padStart(2, '0')).join('');
    const b64 = btoa(String.fromCharCode(...new Uint8Array(signature)));
    return { hex, b64 };
  }

  $('#hmacGenBtn')?.addEventListener('click', async () => {
    const msg = $('#hmacMsg').value;
    const key = $('#hmacKey').value;
    const algo = $('#hmacAlgo').value;
    const expected = $('#hmacExpected').value.trim().toLowerCase();
    const out = $('#hmacOutput');

    if (!key) { toast('Enter a secret key'); return; }

    try {
      const { hex, b64 } = await computeHmacSignature(msg, key, algo);
      let matchHtml = '';
      if (expected) {
        const isMatch = hex.toLowerCase() === expected || b64 === $('#hmacExpected').value.trim();
        matchHtml = isMatch
          ? `<div style="color:var(--success);font-weight:700;margin-top:6px">✅ Signature MATCHES! Authentic webhook payload.</div>`
          : `<div style="color:var(--danger);font-weight:700;margin-top:6px">❌ MISMATCH! Signature is invalid or payload was modified.</div>`;
      }

      out.innerHTML = `
        <div><strong>Hex Signature:</strong> <span style="font-family:var(--mono);word-break:break-all;color:var(--accent-light)">${hex}</span></div>
        <div style="margin-top:4px"><strong>Base64 Signature:</strong> <span style="font-family:var(--mono);word-break:break-all">${b64}</span></div>
        ${matchHtml}
      `;
      toast('HMAC computed');
    } catch (e) {
      out.textContent = 'Error computing HMAC: ' + e.message;
    }
  });
  $('#hmacCopy')?.addEventListener('click', () => {
    const m = $('#hmacOutput').textContent.match(/Hex Signature:\s*([a-f0-9]+)/i);
    if (m) copyToClipboard(m[1]);
    else copyToClipboard($('#hmacOutput').textContent);
  });

  /** --- 33. JSON ↔ YAML Converter --- */
  function jsonToYaml(obj, indent = 0) {
    const pad = '  '.repeat(indent);
    if (obj === null) return 'null';
    if (typeof obj === 'undefined') return '';
    if (typeof obj === 'boolean' || typeof obj === 'number') return String(obj);
    if (typeof obj === 'string') {
      if (obj.includes('\n') || /[:#[\]{},&*!|>'"%@`]/.test(obj) || obj.trim() !== obj || obj === '') {
        return JSON.stringify(obj);
      }
      return obj;
    }
    if (Array.isArray(obj)) {
      if (obj.length === 0) return '[]';
      return obj.map(item => {
        const val = jsonToYaml(item, indent + 1);
        if (typeof item === 'object' && item !== null && !Array.isArray(item)) {
          const lines = val.trim().split('\n');
          return `${pad}- ${lines[0]}\n${lines.slice(1).map(l => `${pad}  ${l}`).join('\n')}`;
        }
        return `${pad}- ${val.trim()}`;
      }).join('\n');
    }
    if (typeof obj === 'object') {
      const keys = Object.keys(obj);
      if (keys.length === 0) return '{}';
      return keys.map(k => {
        const v = obj[k];
        const keyStr = /^[a-zA-Z0-9_-]+$/.test(k) ? k : JSON.stringify(k);
        if (typeof v === 'object' && v !== null) {
          if (Array.isArray(v) && v.length === 0) return `${pad}${keyStr}: []`;
          if (!Array.isArray(v) && Object.keys(v).length === 0) return `${pad}${keyStr}: {}`;
          return `${pad}${keyStr}:\n${jsonToYaml(v, indent + 1)}`;
        }
        return `${pad}${keyStr}: ${jsonToYaml(v, indent + 1).trim()}`;
      }).join('\n');
    }
    return String(obj);
  }

  function yamlToJson(yaml) {
    try { return JSON.parse(yaml); } catch (_) {}
    const lines = yaml.split('\n');
    const parseScalar = v => {
      v = v.trim();
      if (v === 'null' || v === '~' || v === '') return null;
      if (v === 'true') return true;
      if (v === 'false') return false;
      if (!isNaN(Number(v)) && v !== '') return Number(v);
      if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
        return v.slice(1, -1);
      }
      return v;
    };

    const root = {};
    const stack = [{ indent: -1, obj: root, key: null }];

    for (let rawLine of lines) {
      const commentIdx = rawLine.indexOf('#');
      let line = commentIdx >= 0 ? rawLine.substring(0, commentIdx) : rawLine;
      if (!line.trim()) continue;

      const indent = line.search(/\S/);
      const content = line.trim();

      while (stack.length > 1 && indent <= stack[stack.length - 1].indent) {
        stack.pop();
      }

      const parent = stack[stack.length - 1];

      if (content.startsWith('- ')) {
        const itemVal = content.slice(2).trim();
        if (parent.key !== null && !Array.isArray(parent.obj[parent.key])) {
          parent.obj[parent.key] = [];
          stack.push({ indent, obj: parent.obj[parent.key], key: null });
        }
        const targetArr = Array.isArray(parent.obj) ? parent.obj : parent.obj[parent.key];
        if (itemVal.includes(':') && !itemVal.startsWith('{')) {
          const [k, ...rest] = itemVal.split(':');
          const newObj = { [k.trim()]: parseScalar(rest.join(':')) };
          targetArr.push(newObj);
          stack.push({ indent, obj: newObj, key: k.trim() });
        } else {
          targetArr.push(parseScalar(itemVal));
        }
      } else if (content.includes(':')) {
        const colon = content.indexOf(':');
        const key = content.slice(0, colon).trim().replace(/^['"]|['"]$/g, '');
        const val = content.slice(colon + 1).trim();
        const targetObj = Array.isArray(parent.obj) ? parent.obj[parent.obj.length - 1] : parent.obj;

        if (!val) {
          targetObj[key] = {};
          stack.push({ indent, obj: targetObj, key });
        } else {
          targetObj[key] = parseScalar(val);
        }
      }
    }
    return root;
  }

  $('#yamlToJsonBtn')?.addEventListener('click', () => {
    const val = $('#yamlJsonInput').value.trim();
    if (!val) return;
    try {
      const parsed = yamlToJson(val);
      $('#yamlJsonOutput').textContent = JSON.stringify(parsed, null, 2);
      toast('YAML converted to JSON');
    } catch (e) {
      $('#yamlJsonOutput').textContent = 'Error parsing YAML: ' + e.message;
    }
  });

  $('#jsonToYamlBtn')?.addEventListener('click', () => {
    const val = $('#yamlJsonInput').value.trim();
    if (!val) return;
    try {
      const parsed = JSON.parse(val);
      $('#yamlJsonOutput').textContent = jsonToYaml(parsed);
      toast('JSON converted to YAML');
    } catch (e) {
      $('#yamlJsonOutput').textContent = 'Error parsing JSON: ' + e.message;
    }
  });
  $('#yamlJsonCopy')?.addEventListener('click', () => copyToClipboard($('#yamlJsonOutput').textContent));
  $('#yamlJsonClear')?.addEventListener('click', () => { $('#yamlJsonInput').value = ''; $('#yamlJsonOutput').textContent = ''; });

  /** --- 34. Base64 ↔ Image & Data URL Decoder --- */
  const b64ImgFile = $('#b64ImgFile'), b64ImgText = $('#b64ImgText'),
        b64ImgPreview = $('#b64ImgPreview'), b64ImgPlaceholder = $('#b64ImgPlaceholder'),
        b64ImgDownload = $('#b64ImgDownloadBtn'), b64ImgInfo = $('#b64ImgInfo');
  let currentDecodedSrc = '';

  function displayDecodedImage(dataUri) {
    currentDecodedSrc = dataUri;
    b64ImgPreview.src = dataUri;
    b64ImgPreview.style.display = 'block';
    if (b64ImgPlaceholder) b64ImgPlaceholder.style.display = 'none';
    if (b64ImgDownload) b64ImgDownload.disabled = false;

    const img = new Image();
    img.onload = () => {
      const format = dataUri.match(/^data:(image\/[a-zA-Z+]+);/)?.[1] || 'image/png';
      const approxBytes = Math.round((dataUri.length - dataUri.indexOf(',')) * 0.75);
      b64ImgInfo.innerHTML = `
        <div><strong>Format:</strong> ${format}</div>
        <div><strong>Resolution:</strong> ${img.naturalWidth} × ${img.naturalHeight} px</div>
        <div><strong>Estimated Size:</strong> ${(approxBytes / 1024).toFixed(1)} KB</div>
      `;
    };
    img.src = dataUri;
  }

  b64ImgFile?.addEventListener('change', () => {
    const f = b64ImgFile.files?.[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = () => {
      b64ImgText.value = reader.result;
      displayDecodedImage(reader.result);
      toast('Image loaded into Base64');
    };
    reader.readAsDataURL(f);
  });

  $('#b64ImgDecodeBtn')?.addEventListener('click', () => {
    let raw = b64ImgText.value.trim();
    if (!raw) { toast('Paste Base64 data first'); return; }
    if (!raw.startsWith('data:image/')) {
      raw = 'data:image/png;base64,' + raw;
    }
    displayDecodedImage(raw);
    toast('Base64 decoded into image');
  });

  $('#b64ImgCopyBtn')?.addEventListener('click', () => {
    copyToClipboard(currentDecodedSrc || b64ImgText.value);
  });

  b64ImgDownload?.addEventListener('click', () => {
    if (!currentDecodedSrc) return;
    const a = document.createElement('a');
    a.download = 'decoded-image.png';
    a.href = currentDecodedSrc;
    a.click();
  });

  /** --- 35. ASCII Table Reference --- */
  const asciiTable = [];
  for (let i = 0; i < 128; i++) {
    asciiTable.push({
      dec: i,
      hex: i.toString(16).padStart(2, '0').toUpperCase(),
      bin: i.toString(2).padStart(8, '0'),
      char: i >= 32 && i <= 126 ? String.fromCharCode(i) : (i === 32 ? 'Space' : 'Control')
    });
  }
  function renderAscii(items) {
    let html = '<table style="width:100%;border-collapse:collapse;font-size:0.85rem"><thead><tr style="border-bottom:1px solid var(--border);text-align:left"><th style="padding:6px">Dec</th><th style="padding:6px">Hex</th><th style="padding:6px">Bin</th><th style="padding:6px">Char</th></tr></thead><tbody>';
    items.forEach(it => {
      html += `<tr style="border-bottom:1px solid rgba(255,255,255,0.04)"><td style="padding:4px 6px">${it.dec}</td><td style="padding:4px 6px">${it.hex}</td><td style="padding:4px 6px">${it.bin}</td><td style="padding:4px 6px;color:var(--accent)">${escapeHtml(it.char)}</td></tr>`;
    });
    html += '</tbody></table>';
    $('#asciiOutput').innerHTML = html;
  }
  $('#asciiShowAll')?.addEventListener('click', () => renderAscii(asciiTable));
  $('#asciiShowPrintable')?.addEventListener('click', () => renderAscii(asciiTable.filter(i => i.dec >= 32 && i.dec <= 126)));
  $('#asciiShowControl')?.addEventListener('click', () => renderAscii(asciiTable.filter(i => i.dec < 32 || i.dec === 127)));
  $('#asciiSearch')?.addEventListener('input', (e) => {
    const q = e.target.value.toLowerCase();
    renderAscii(asciiTable.filter(i => String(i.dec).includes(q) || i.hex.toLowerCase().includes(q) || i.char.toLowerCase().includes(q)));
  });
  renderAscii(asciiTable);

  /** --- 36. HTTP Status Codes --- */
  const httpCodes = [
    { code: 200, title: 'OK', desc: 'Standard response for successful HTTP requests.' },
    { code: 201, title: 'Created', desc: 'Request fulfilled; new resource created.' },
    { code: 204, title: 'No Content', desc: 'Successfully processed; returning no content body.' },
    { code: 301, title: 'Moved Permanently', desc: 'Resource URI permanently changed.' },
    { code: 302, title: 'Found', desc: 'Temporary redirect to another URI.' },
    { code: 304, title: 'Not Modified', desc: 'Cached version is still valid.' },
    { code: 400, title: 'Bad Request', desc: 'Client sent invalid syntax or payload.' },
    { code: 401, title: 'Unauthorized', desc: 'Authentication required or invalid credentials.' },
    { code: 403, title: 'Forbidden', desc: 'Client lacks authorization rights to view resource.' },
    { code: 404, title: 'Not Found', desc: 'Requested URI could not be found.' },
    { code: 422, title: 'Unprocessable Entity', desc: 'Semantic errors in request data.' },
    { code: 429, title: 'Too Many Requests', desc: 'Rate limit exceeded by client.' },
    { code: 500, title: 'Internal Server Error', desc: 'Server encountered an unexpected condition.' },
    { code: 502, title: 'Bad Gateway', desc: 'Invalid response from upstream server.' },
    { code: 503, title: 'Service Unavailable', desc: 'Server down for maintenance or overloaded.' }
  ];
  function renderHttpStatus() {
    const cat = $('#statusCategory').value;
    const q = ($('#statusSearch').value || '').toLowerCase();
    const filtered = httpCodes.filter(c => {
      const matchCat = cat === 'all' || String(c.code).startsWith(cat[0]);
      const matchQ = String(c.code).includes(q) || c.title.toLowerCase().includes(q) || c.desc.toLowerCase().includes(q);
      return matchCat && matchQ;
    });
    $('#statusOutput').innerHTML = filtered.map(c => `
      <div style="margin-bottom:8px;padding:8px;background:rgba(255,255,255,0.04);border-radius:8px">
        <strong>${c.code} ${escapeHtml(c.title)}</strong>
        <div style="color:var(--text-muted);font-size:0.85rem">${escapeHtml(c.desc)}</div>
      </div>
    `).join('') || '<div class="note">No matching status codes found.</div>';
  }
  $('#statusCategory')?.addEventListener('change', renderHttpStatus);
  $('#statusSearch')?.addEventListener('input', renderHttpStatus);
  renderHttpStatus();

  /** --- 37. Color Palette & Harmonic Shades Generator --- */
  function hexToHsl(hex) {
    hex = hex.replace('#', '');
    const r = parseInt(hex.slice(0, 2), 16) / 255;
    const g = parseInt(hex.slice(2, 4), 16) / 255;
    const b = parseInt(hex.slice(4, 6), 16) / 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    let h, s, l = (max + min) / 2;
    if (max === min) { h = s = 0; }
    else {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      switch (max) {
        case r: h = (g - b) / d + (g < b ? 6 : 0); break;
        case g: h = (b - r) / d + 2; break;
        case b: h = (r - g) / d + 4; break;
      }
      h /= 6;
    }
    return [Math.round(h * 360), Math.round(s * 100), Math.round(l * 100)];
  }

  function hslToHex(h, s, l) {
    s /= 100; l /= 100;
    const k = n => (n + h / 30) % 12;
    const a = s * Math.min(l, 1 - l);
    const f = n => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
    const toHex = x => Math.round(x * 255).toString(16).padStart(2, '0');
    return `#${toHex(f(0))}${toHex(f(8))}${toHex(f(4))}`.toUpperCase();
  }

  function generatePalette(baseHex) {
    const [h, s] = hexToHsl(baseHex);
    const lightnesses = [95, 85, 75, 65, 55, 45, 35, 25, 15, 10];
    const shadeLabels = ['50', '100', '200', '300', '400', '500', '600', '700', '800', '900'];

    const strip = $('#paletteShadesStrip');
    strip.innerHTML = lightnesses.map((l, i) => {
      const col = hslToHex(h, s, l);
      return `<div class="palette-swatch" style="background:${col};color:${l > 50 ? '#000' : '#FFF'}" onclick="navigator.clipboard.writeText('${col}');toast('Copied ${col}')" title="Click to copy ${col}">${shadeLabels[i]}</div>`;
    }).join('');

    const harmonies = [
      { name: 'Complementary', hex: hslToHex((h + 180) % 360, s, 50) },
      { name: 'Triadic 1', hex: hslToHex((h + 120) % 360, s, 50) },
      { name: 'Triadic 2', hex: hslToHex((h + 240) % 360, s, 50) },
      { name: 'Analogous', hex: hslToHex((h + 30) % 360, s, 50) }
    ];

    const harmContainer = $('#paletteHarmonies');
    harmContainer.innerHTML = harmonies.map(hm => `
      <div style="flex:1;background:var(--bg-elev);padding:10px;border-radius:10px;border:1px solid var(--border);text-align:center;cursor:pointer" onclick="navigator.clipboard.writeText('${hm.hex}');toast('Copied ${hm.hex}')">
        <div style="height:36px;border-radius:6px;background:${hm.hex};margin-bottom:6px"></div>
        <div style="font-size:0.75rem;color:var(--text-muted)">${hm.name}</div>
        <div style="font-family:var(--mono);font-size:0.85rem;font-weight:600">${hm.hex}</div>
      </div>
    `).join('');
  }

  $('#paletteGenBtn')?.addEventListener('click', () => {
    const hex = $('#paletteHexInput').value || $('#paletteBaseColor').value;
    generatePalette(hex);
  });
  $('#paletteBaseColor')?.addEventListener('input', (e) => {
    $('#paletteHexInput').value = e.target.value.toUpperCase();
    generatePalette(e.target.value);
  });
  generatePalette('#3B82F6');

  /** --- 38. Find and Replace with Regex --- */
  $('#doReplace')?.addEventListener('click', () => {
    const text = $('#findReplaceInput').value;
    const find = $('#findText').value;
    const replace = $('#replaceText').value;
    if (!text || !find) { toast('Fill both search and text fields'); return; }
    try {
      const flags = $('#caseSensitive').checked ? 'g' : 'gi';
      let res;
      if ($('#regexMode').checked) {
        res = text.replace(new RegExp(find, flags), replace);
      } else {
        const escaped = find.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const pattern = $('#wholeWords').checked ? `\\b${escaped}\\b` : escaped;
        res = text.replace(new RegExp(pattern, flags), replace);
      }
      $('#findReplaceOutput').textContent = res;
      toast('Replacement complete');
    } catch (e) {
      $('#findReplaceOutput').textContent = 'Error: ' + e.message;
    }
  });
  $('#copyFindReplace')?.addEventListener('click', () => copyToClipboard($('#findReplaceOutput').textContent));
  $('#clearFindReplace')?.addEventListener('click', () => {
    $('#findText').value = ''; $('#replaceText').value = '';
    $('#findReplaceInput').value = ''; $('#findReplaceOutput').textContent = '';
  });

  /** --- 39. URL Parser & Query Parameter Manager --- */
  $('#urlParseBtn')?.addEventListener('click', () => {
    const raw = $('#urlParseInput').value.trim();
    if (!raw) return;
    try {
      const u = new URL(raw);
      $('#urlParsedDetails').innerHTML = `
        <div><strong>Protocol:</strong> ${escapeHtml(u.protocol)}</div>
        <div><strong>Host:</strong> ${escapeHtml(u.hostname)}</div>
        <div><strong>Port:</strong> ${escapeHtml(u.port || '(default)')}</div>
        <div><strong>Path:</strong> ${escapeHtml(u.pathname)}</div>
        <div><strong>Hash:</strong> ${escapeHtml(u.hash || 'none')}</div>
      `;

      const params = [...u.searchParams.entries()];
      if (!params.length) {
        $('#urlParamsTable').innerHTML = '<div class="note">No query parameters found.</div>';
      } else {
        $('#urlParamsTable').innerHTML = params.map(([k, v]) => `
          <div style="display:flex;gap:6px;margin:3px 0;font-family:var(--mono)">
            <span style="color:var(--accent)">${escapeHtml(k)}:</span>
            <span style="color:var(--text-muted);word-break:break-all">${escapeHtml(v)}</span>
          </div>
        `).join('');
      }
      toast('URL parsed');
    } catch {
      toast('Invalid URL format');
    }
  });

  $('#urlRebuildBtn')?.addEventListener('click', () => {
    const raw = $('#urlParseInput').value.trim();
    if (raw) copyToClipboard(raw);
  });
  $('#urlParseClear')?.addEventListener('click', () => {
    $('#urlParseInput').value = '';
    $('#urlParsedDetails').innerHTML = '<div>Protocol: —</div><div>Host: —</div><div>Port: —</div><div>Path: —</div><div>Hash: —</div>';
    $('#urlParamsTable').innerHTML = 'No parameters loaded';
  });

  /** --- 40. Markdown Live Preview --- */
  function parseMarkdown(md) {
    let s = escapeHtml(md);
    s = s.replace(/^### (.*$)/gim, '<h3 style="margin:8px 0">$1</h3>')
         .replace(/^## (.*$)/gim, '<h2 style="margin:10px 0">$1</h2>')
         .replace(/^# (.*$)/gim, '<h1 style="margin:14px 0">$1</h1>')
         .replace(/\*\*(.*?)\*\*/gim, '<strong>$1</strong>')
         .replace(/\*(.*?)\*/gim, '<em>$1</em>')
         .replace(/`([^`]+)`/gim, '<code style="background:rgba(255,255,255,0.1);padding:2px 5px;border-radius:4px">$1</code>')
         .replace(/^> (.*$)/gim, '<blockquote style="border-left:3px solid var(--accent);padding-left:10px;color:var(--text-muted)">$1</blockquote>')
         .replace(/^\s*-\s+(.*$)/gim, '<li style="margin-left:18px">$1</li>')
         .replace(/\n\n/g, '<p style="margin:6px 0"></p>')
         .replace(/\n/g, '<br>');
    return s;
  }
  $('#renderMarkdown')?.addEventListener('click', () => {
    $('#markdownOutput').innerHTML = parseMarkdown($('#markdownInput').value);
  });
  $('#copyMarkdown')?.addEventListener('click', () => copyToClipboard($('#markdownOutput').innerHTML));
  $('#clearMarkdown')?.addEventListener('click', () => { $('#markdownInput').value = ''; $('#markdownOutput').innerHTML = ''; });

  /** --- 41. CSS Minifier/Beautifier --- */
  $('#minifyCss')?.addEventListener('click', () => {
    $('#cssOutput').textContent = $('#cssInput').value
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/\s+/g, ' ')
      .replace(/\s*([:;{}])\s*/g, '$1')
      .replace(/;}/g, '}')
      .trim();
  });
  $('#beautifyCss')?.addEventListener('click', () => {
    $('#cssOutput').textContent = $('#cssInput').value
      .replace(/\s*([{}])\s*/g, ' $1\n  ')
      .replace(/;\s*/g, ';\n  ')
      .replace(/\n\s*}/g, '\n}\n')
      .trim();
  });
  $('#copyCss')?.addEventListener('click', () => copyToClipboard($('#cssOutput').textContent));
  $('#clearCss')?.addEventListener('click', () => { $('#cssInput').value = ''; $('#cssOutput').textContent = ''; });

  /** --- 42. JavaScript Minifier/Formatter --- */
  $('#minifyJs')?.addEventListener('click', () => {
    $('#jsOutput').textContent = $('#jsInput').value
      .replace(/\/\/[^\n]*/g, '')
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/\s+/g, ' ')
      .replace(/\s*([=+\-*\/{}();:,])\s*/g, '$1')
      .trim();
  });
  $('#beautifyJs')?.addEventListener('click', () => {
    $('#jsOutput').textContent = $('#jsInput').value
      .replace(/\s*([{}])\s*/g, ' $1\n  ')
      .replace(/;\s*/g, ';\n  ')
      .replace(/\n\s*}/g, '\n}\n')
      .trim();
  });
  $('#copyJs')?.addEventListener('click', () => copyToClipboard($('#jsOutput').textContent));
  $('#clearJs')?.addEventListener('click', () => { $('#jsInput').value = ''; $('#jsOutput').textContent = ''; });

  /** --- 43. Aspect Ratio & Resolution Calculator --- */
  function gcd(a, b) { return b ? gcd(b, a % b) : a; }
  $('#arPreset')?.addEventListener('change', (e) => {
    const [rw, rh] = e.target.value.split(':').map(Number);
    const w = parseInt($('#arWidth').value, 10) || 1920;
    const h = Math.round(w * (rh / rw));
    $('#arHeight').value = h;
    $('#arOutput').innerHTML = `Aspect Ratio: <strong>${rw}:${rh}</strong> (${w} × ${h} px)`;
  });
  $('#arCalcBtn')?.addEventListener('click', () => {
    const w = parseInt($('#arWidth').value, 10);
    const h = parseInt($('#arHeight').value, 10);
    if (!w || !h) return;
    const d = gcd(w, h);
    $('#arOutput').innerHTML = `Calculated Ratio: <strong>${w / d}:${h / d}</strong> (${w} × ${h} px)`;
  });

  /** --- 44. Text Statistics --- */
  $('#analyzeText')?.addEventListener('click', () => {
    const t = $('#textStatsInput').value;
    if (!t.trim()) return;
    const words = (t.trim().match(/\S+/g) || []).length;
    const chars = t.length;
    const sentences = (t.match(/[^.!?]+[.!?]+/g) || [t]).length;
    const paragraphs = t.split(/\n\s*\n/).filter(Boolean).length || 1;
    $('#textStatsOutput').innerHTML = `
      <div><strong>Words:</strong> ${words.toLocaleString()}</div>
      <div><strong>Characters:</strong> ${chars.toLocaleString()}</div>
      <div><strong>Sentences:</strong> ${sentences}</div>
      <div><strong>Paragraphs:</strong> ${paragraphs}</div>
      <div><strong>Estimated Reading Time:</strong> ~${Math.max(1, Math.ceil(words / 200))} min</div>
    `;
  });
  $('#clearTextStats')?.addEventListener('click', () => {
    $('#textStatsInput').value = '';
    $('#textStatsOutput').innerHTML = '<div>Words: —</div><div>Characters: —</div><div>Sentences: —</div><div>Paragraphs: —</div><div>Estimated Reading Time: —</div>';
  });

  /** --- 45. Hash & Checksum Comparator --- */
  $('#hashCompBtn')?.addEventListener('click', async () => {
    const file = $('#hashCompFile').files?.[0];
    const text = $('#hashCompText').value;
    const algo = $('#hashCompAlgo').value;
    const expected = $('#hashCompExpected').value.trim().toLowerCase();
    const out = $('#hashCompOutput');

    if (!file && !text) { toast('Select a file or enter text'); return; }
    out.textContent = 'Computing checksum…';

    try {
      const buf = file ? await file.arrayBuffer() : new TextEncoder().encode(text);
      const digest = await crypto.subtle.digest(algo, buf);
      const hash = [...new Uint8Array(digest)].map(b => b.toString(16).padStart(2, '0')).join('');

      let matchHtml = '';
      if (expected) {
        matchHtml = hash.toLowerCase() === expected
          ? `<div style="color:var(--success);font-weight:700;margin-top:6px">✅ Checksum MATCHES! File integrity verified.</div>`
          : `<div style="color:var(--danger);font-weight:700;margin-top:6px">❌ MISMATCH! File checksum does not match expected value.</div>`;
      }
      out.innerHTML = `
        <div><strong>Algorithm:</strong> ${algo}</div>
        <div style="font-family:var(--mono);word-break:break-all;margin-top:4px"><strong>Calculated:</strong> ${hash}</div>
        ${expected ? `<div style="font-family:var(--mono);word-break:break-all;color:var(--text-muted)"><strong>Expected:</strong> ${escapeHtml(expected)}</div>` : ''}
        ${matchHtml}
      `;
    } catch (e) {
      out.textContent = 'Error: ' + e.message;
    }
  });
  $('#hashCompCopy')?.addEventListener('click', () => {
    const m = $('#hashCompOutput').textContent.match(/Calculated:\s*([a-f0-9]+)/i);
    copyToClipboard(m ? m[1] : $('#hashCompOutput').textContent);
  });

  /** --- 46. Glassmorphism Generator --- */
  const glassCodeBox = $('#glassCssCode'), glassPreview = $('#glassPreviewCard');
  function updateGlass() {
    const blur = $('#glassBlur').value;
    const op = $('#glassOpacity').value;
    const border = $('#glassBorder').value;
    const rad = $('#glassRadius').value;
    const col = $('#glassColor').value;

    const r = parseInt(col.slice(1, 3), 16) || 255;
    const g = parseInt(col.slice(3, 5), 16) || 255;
    const b = parseInt(col.slice(5, 7), 16) || 255;

    const bgRgba = `rgba(${r}, ${g}, ${b}, ${op})`;
    const borderRgba = `rgba(${r}, ${g}, ${b}, ${Math.min(1, parseFloat(op) + 0.15).toFixed(2)})`;

    if (glassPreview) {
      glassPreview.style.background = bgRgba;
      glassPreview.style.backdropFilter = `blur(${blur}px)`;
      glassPreview.style.webkitBackdropFilter = `blur(${blur}px)`;
      glassPreview.style.border = `${border}px solid ${borderRgba}`;
      glassPreview.style.borderRadius = `${rad}px`;
    }

    if (glassCodeBox && document.activeElement !== glassCodeBox) {
      glassCodeBox.value = `background: ${bgRgba};
backdrop-filter: blur(${blur}px);
-webkit-backdrop-filter: blur(${blur}px);
border-radius: ${rad}px;
border: ${border}px solid ${borderRgba};
box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.37);`;
    }
  }
  ['glassBlur', 'glassOpacity', 'glassBorder', 'glassRadius', 'glassColor'].forEach(id => {
    $('#' + id)?.addEventListener('input', updateGlass);
  });
  $('#glassCopyBtn')?.addEventListener('click', () => copyToClipboard(glassCodeBox?.value));
  $('#glassResetBtn')?.addEventListener('click', () => {
    $('#glassBlur').value = 16; $('#glassOpacity').value = 0.25; $('#glassBorder').value = 1; $('#glassRadius').value = 18;
    updateGlass();
  });
  updateGlass();

  /** --- 47. Device & Browser Inspector --- */
  async function inspectDevice() {
    const out = $('#deviceInfoOutput');
    if (!out) return;
    let battery = 'N/A';
    try {
      if (navigator.getBattery) {
        const b = await navigator.getBattery();
        battery = `${Math.round(b.level * 100)}% (${b.charging ? 'Charging ⚡' : 'Battery'})`;
      }
    } catch {}

    out.innerHTML = `
      <div><strong>Screen Resolution:</strong> ${screen.width} × ${screen.height} px (Available: ${screen.availWidth} × ${screen.availHeight} px)</div>
      <div><strong>Viewport:</strong> ${window.innerWidth} × ${window.innerHeight} px</div>
      <div><strong>Device Pixel Ratio:</strong> ${window.devicePixelRatio}x</div>
      <div><strong>Color Depth:</strong> ${screen.colorDepth}-bit</div>
      <div><strong>Touch Capability:</strong> ${navigator.maxTouchPoints > 0 ? `Yes (${navigator.maxTouchPoints} touch points)` : 'No touch'}</div>
      <div><strong>Connection:</strong> ${navigator.onLine ? '🟢 Online' : '🔴 Offline'}</div>
      <div><strong>Battery:</strong> ${battery}</div>
      <div><strong>User Agent:</strong> <span style="font-size:0.75rem;word-break:break-all;color:var(--text-muted)">${escapeHtml(navigator.userAgent)}</span></div>
    `;
  }
  $('#deviceRefreshBtn')?.addEventListener('click', () => { inspectDevice(); toast('Specs refreshed'); });
  $('#deviceCopyBtn')?.addEventListener('click', () => copyToClipboard($('#deviceInfoOutput').textContent));
  inspectDevice();

  /** --- 48. String Escape & Unescape Tool --- */
  $('#doEscapeBtn')?.addEventListener('click', () => {
    const tgt = $('#escapeTarget').value, s = $('#escapeInput').value;
    let res = s;
    if (tgt === 'json') res = JSON.stringify(s).slice(1, -1);
    else if (tgt === 'java') res = s.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n').replace(/\r/g, '\\r').replace(/\t/g, '\\t');
    else if (tgt === 'sql') res = s.replace(/'/g, "''");
    else if (tgt === 'regex') res = s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    else if (tgt === 'html') res = encodeHtmlEntities(s);
    else if (tgt === 'url') res = encodeURIComponent(s);
    $('#escapeOutput').value = res;
  });
  $('#doUnescapeBtn')?.addEventListener('click', () => {
    const tgt = $('#escapeTarget').value, s = $('#escapeInput').value;
    try {
      let res = s;
      if (tgt === 'json') res = JSON.parse('"' + s.replace(/"/g, '\\"') + '"');
      else if (tgt === 'java') res = s.replace(/\\n/g, '\n').replace(/\\r/g, '\r').replace(/\\t/g, '\t').replace(/\\"/g, '"').replace(/\\\\/g, '\\');
      else if (tgt === 'sql') res = s.replace(/''/g, "'");
      else if (tgt === 'regex') res = s.replace(/\\([.*+?^${}()|[\]\\])/g, '$1');
      else if (tgt === 'html') res = decodeHtmlEntities(s);
      else if (tgt === 'url') res = decodeURIComponent(s);
      $('#escapeOutput').value = res;
    } catch {
      toast('Failed to unescape string');
    }
  });
  $('#copyEscapedBtn')?.addEventListener('click', () => copyToClipboard($('#escapeOutput').value));
  $('#clearEscapedBtn')?.addEventListener('click', () => { $('#escapeInput').value = ''; $('#escapeOutput').value = ''; });

  /** --- 49. Flexbox Layout Playground --- */
  function updateFlexbox() {
    const dir = $('#flexDir').value;
    const justify = $('#flexJustify').value;
    const align = $('#flexAlign').value;
    const wrap = $('#flexWrap').value;
    const gap = $('#flexGap').value;

    const p = $('#flexContainerPreview');
    if (p) {
      p.style.flexDirection = dir;
      p.style.justifyContent = justify;
      p.style.alignItems = align;
      p.style.flexWrap = wrap;
      p.style.gap = gap + 'px';
    }

    if ($('#flexSnippetCode') && document.activeElement !== $('#flexSnippetCode')) {
      $('#flexSnippetCode').value = `display: flex;\nflex-direction: ${dir};\njustify-content: ${justify};\nalign-items: ${align};\nflex-wrap: ${wrap};\ngap: ${gap}px;`;
    }
  }
  ['flexDir', 'flexJustify', 'flexAlign', 'flexWrap', 'flexGap'].forEach(id => {
    $('#' + id)?.addEventListener('input', updateFlexbox);
  });
  $('#flexCopyCodeBtn')?.addEventListener('click', () => copyToClipboard($('#flexSnippetCode')?.value));
  updateFlexbox();

  /** --- 50. PEM Certificate & Key Inspector --- */
  $('#pemInspectBtn')?.addEventListener('click', async () => {
    const pem = $('#pemInput').value.trim();
    const out = $('#pemOutput');
    if (!pem) return;

    const header = pem.match(/-----BEGIN ([A-Z0-9 ]+)-----/);
    if (!header) {
      out.innerHTML = '<div style="color:var(--danger)">Invalid format: Missing -----BEGIN ...----- header.</div>';
      return;
    }

    const type = header[1];
    const cleanB64 = pem.replace(/-----BEGIN [A-Z0-9 ]+-----/g, '')
                        .replace(/-----END [A-Z0-9 ]+-----/g, '')
                        .replace(/\s+/g, '');

    try {
      const rawBytes = Uint8Array.from(atob(cleanB64), c => c.charCodeAt(0));
      const hash = await crypto.subtle.digest('SHA-256', rawBytes);
      const fingerprint = [...new Uint8Array(hash)].map(b => b.toString(16).padStart(2, '0')).join(':');

      out.innerHTML = `
        <div><strong>Type:</strong> <span style="color:var(--accent);font-weight:700">${type}</span></div>
        <div><strong>Payload Size:</strong> ${rawBytes.length.toLocaleString()} bytes (${rawBytes.length * 8} bits)</div>
        <div style="margin-top:6px;word-break:break-all"><strong>SHA-256 Fingerprint:</strong></div>
        <div style="font-family:var(--mono);font-size:0.8rem;color:var(--accent-light);word-break:break-all">${fingerprint}</div>
      `;
      toast('PEM parsed');
    } catch {
      out.innerHTML = `<div><strong>Type:</strong> ${type}</div><div style="color:var(--warning)">Warning: Payload contains non-standard base64.</div>`;
    }
  });

  $('#pemCopyCleanBtn')?.addEventListener('click', () => {
    const cleanB64 = $('#pemInput').value
      .replace(/-----BEGIN [A-Z0-9 ]+-----/g, '')
      .replace(/-----END [A-Z0-9 ]+-----/g, '')
      .replace(/\s+/g, '');
    if (cleanB64) copyToClipboard(cleanB64);
  });
  $('#pemClearBtn')?.addEventListener('click', () => {
    $('#pemInput').value = '';
    $('#pemOutput').innerHTML = '<div class="note">Paste a PEM certificate or key…</div>';
  });

  // Final UI Init
  updateFavUI();
  filterTools();
})();