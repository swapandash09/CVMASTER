/* ======================================================
   CV MASTER — script.js
   Full app logic: layout/theme/photo controls, live preview
   binding, drag-drop section reorder, save/load (localStorage),
   AI-assist text, and high-quality multi-page PDF export.
   ====================================================== */
(function () {
  'use strict';

  const $ = (id) => document.getElementById(id);
  const root = document.documentElement;

  // ---------- Core element refs ----------
  const resumePaper = $('resumePaper');
  const borderOverlay = $('borderOverlay');
  const previewWrapper = $('previewWrapper');
  const zoomLabel = $('zoomLabel');
  const loadingOverlay = $('loadingOverlay');
  const toastContainer = $('toast-container');
  const modalOverlay = $('modalOverlay');
  const modalTitle = $('modalTitle');
  const modalContent = $('modalContent');
  const sectionOrderList = $('sectionOrderList');
  const dispPhoto = $('dispPhoto');

  const STORAGE_KEY = 'cvmaster_resume_v1';
  const LAYOUTS = ['modern', 'elegant', 'minimal', 'creative', 'compact'];

  let currentZoom = 0.7;

  const state = {
    layout: 'modern',
    font: 'poppins',
    border: 'none',
    primary: '#2c3e50',
    secondary: '#34495e',
    photoBorderColor: 'rgba(255,255,255,0.3)',
    photoZoom: 100,
    photoX: 50,
    photoY: 20,
    photoRadius: 50,
    photoBorder: 5,
    photoData: null,
    sectionOrder: ['summary', 'experience', 'education', 'cert']
  };

  // ---------- Field <-> Display bindings ----------
  const BINDINGS = [
    { input: 'nameInput', targets: ['dispName', 'dispNameElegant'], fallback: 'YOUR NAME', fit: true },
    { input: 'jobInput', targets: ['dispJob', 'dispJobElegant'], fallback: 'PROFESSIONAL TITLE', fit: true },
    { input: 'fatherInput', targets: ['dispFather', 'dispFatherEl'], fallback: 'Name' },
    { input: 'dobInput', targets: ['dispDOB', 'dispDOBEl'], fallback: '--/--/--' },
    { input: 'phoneInput', targets: ['dispPhone', 'dispPhoneEl'], fallback: '+91 ...' },
    { input: 'emailInput', targets: ['dispEmail', 'dispEmailEl'], fallback: 'email@example.com' },
    { input: 'addrInput', targets: ['dispAddr', 'dispAddrEl'], fallback: 'Address' },
    { input: 'summaryInput', targets: ['dispSummary'], fallback: 'A dedicated professional with a passion for delivering quality results.' },
    { input: 'compInput', targets: ['dispComp'], fallback: 'Company Name' },
    { input: 'roleInput', targets: ['dispRole'], fallback: 'Job Role' },
    { input: 'startInput', targets: ['dispStart'], fallback: '2022' },
    { input: 'endInput', targets: ['dispEnd'], fallback: 'Present' },
    { input: 'descInput', targets: ['dispDesc'], fallback: 'Responsibilities...' },
    { input: 'degreeInput', targets: ['dispDegree'], fallback: 'Degree Name' },
    { input: 'uniInput', targets: ['dispUni'], fallback: 'University Name' },
    { input: 'yearInput', targets: ['dispYear'], fallback: '2024' },
    { input: 'certInput', targets: ['dispCert'], fallback: 'Details here...' }
  ];
  const TAG_BINDINGS = [
    { input: 'skillsInput', targets: ['dispSkills', 'dispSkillsEl'] },
    { input: 'langInput', targets: ['dispLang', 'dispLangEl'] }
  ];
  const ALL_INPUT_IDS = BINDINGS.map((b) => b.input).concat(TAG_BINDINGS.map((b) => b.input));

  // ---------- Toast ----------
  function showToast(msg, type, icon) {
    type = type || 'info';
    icon = icon || 'circle-info';
    const t = document.createElement('div');
    t.className = 'toast' + (type === 'success' ? ' success' : '');
    const iconEl = document.createElement('i');
    iconEl.className = 'fa-solid fa-' + icon;
    const span = document.createElement('span');
    span.textContent = msg;
    t.appendChild(iconEl);
    t.appendChild(span);
    toastContainer.appendChild(t);
    setTimeout(() => {
      t.style.transition = 'opacity .3s, transform .3s';
      t.style.opacity = '0';
      t.style.transform = 'translateX(20px)';
      setTimeout(() => t.remove(), 300);
    }, 2600);
  }

  // ---------- Active-button helper ----------
  function activateAmong(selector, btn) {
    if (!btn) return;
    document.querySelectorAll(selector).forEach((b) => b.classList.remove('active'));
    btn.classList.add('active');
  }

  // ---------- Auto-fit text ----------
  function fitText(el) {
    if (!el || el.offsetParent === null) return;
    if (!el.dataset.baseSize) {
      el.dataset.baseSize = parseFloat(getComputedStyle(el).fontSize);
    }
    const base = parseFloat(el.dataset.baseSize);
    el.style.fontSize = base + 'px';
    let guard = 0;
    while (el.scrollWidth > el.clientWidth + 1 && parseFloat(el.style.fontSize) > 11 && guard < 50) {
      el.style.fontSize = parseFloat(el.style.fontSize) - 1 + 'px';
      guard++;
    }
  }
  function fitAllText() {
    document.querySelectorAll('.auto-fit-text').forEach(fitText);
  }
  function resetFitBase() {
    document.querySelectorAll('.auto-fit-text').forEach((el) => {
      delete el.dataset.baseSize;
      el.style.fontSize = '';
    });
  }

  // ================= LAYOUT / FONT / BORDER =================
  window.setLayout = function (layout, btn) {
    resumePaper.classList.remove(...LAYOUTS);
    resumePaper.classList.add(layout);
    state.layout = layout;
    activateAmong('[onclick^="setLayout("]', btn);
    resetFitBase();
    requestAnimationFrame(fitAllText);
    persist();
  };

  window.setFont = function (font, btn) {
    state.font = font;
    root.style.setProperty('--font-head', font === 'serif' ? "'Playfair Display', serif" : "'Poppins', sans-serif");
    root.style.setProperty('--font-body', font === 'serif' ? "'Poppins', sans-serif" : "'Poppins', sans-serif");
    activateAmong('[onclick^="setFont("]', btn);
    requestAnimationFrame(fitAllText);
    persist();
  };

  window.setBorder = function (border, btn) {
    state.border = border;
    borderOverlay.className = 'border-overlay' + (border !== 'none' ? ' b-' + border : '');
    activateAmong('[onclick^="setBorder("]', btn);
    persist();
  };

  // ================= COLOR THEME =================
  window.setTheme = function (primary, secondary) {
    state.primary = primary;
    state.secondary = secondary;
    root.style.setProperty('--primary', primary);
    root.style.setProperty('--secondary', secondary);
    persist();
  };

  function shadeColor(hex, percent) {
    hex = hex.replace('#', '');
    if (hex.length === 3) hex = hex.split('').map((c) => c + c).join('');
    const num = parseInt(hex, 16);
    const t = percent < 0 ? 0 : 255;
    const p = Math.abs(percent) / 100;
    const R = (num >> 16) & 0xff;
    const G = (num >> 8) & 0xff;
    const B = num & 0xff;
    const newR = Math.round((t - R) * p) + R;
    const newG = Math.round((t - G) * p) + G;
    const newB = Math.round((t - B) * p) + B;
    return '#' + (0x1000000 + newR * 0x10000 + newG * 0x100 + newB).toString(16).slice(1);
  }

  window.setCustomTheme = function (color) {
    window.setTheme(color, shadeColor(color, -12));
  };

  // ================= PHOTO STUDIO =================
  window.setPhotoBorderColor = function (color) {
    state.photoBorderColor = color;
    root.style.setProperty('--photo-border-color', color);
    persist();
  };

  window.adjustPhoto = function (value, type) {
    value = Number(value);
    if (type === 'zoom') {
      state.photoZoom = value;
      root.style.setProperty('--photo-zoom', value / 100);
    } else if (type === 'x') {
      state.photoX = value;
      root.style.setProperty('--photo-x', value + '%');
    } else if (type === 'y') {
      state.photoY = value;
      root.style.setProperty('--photo-y', value + '%');
    }
    persist();
  };

  window.updatePhotoStyle = function (prop, value) {
    value = Number(value);
    if (prop === 'radius') {
      state.photoRadius = value;
      root.style.setProperty('--photo-radius', value + '%');
    } else if (prop === 'border') {
      state.photoBorder = value;
      root.style.setProperty('--photo-border', value + 'px');
    }
    persist();
  };

  function initPhotoUpload() {
    const input = $('photoInput');
    if (!input) return;
    input.addEventListener('change', function (e) {
      const file = e.target.files && e.target.files[0];
      if (!file) return;
      if (!file.type.startsWith('image/')) {
        showToast('Please choose a valid image file', 'error', 'triangle-exclamation');
        return;
      }
      const reader = new FileReader();
      reader.onload = function (ev) {
        dispPhoto.src = ev.target.result;
        state.photoData = ev.target.result;
        persist();
        showToast('Photo updated', 'success', 'check');
      };
      reader.readAsDataURL(file);
    });
  }

  // ================= TEXT FIELD BINDING =================
  function renderTags(value, targets) {
    const items = value.split(',').map((s) => s.trim()).filter(Boolean);
    targets.forEach((id) => {
      const container = $(id);
      if (!container) return;
      container.innerHTML = '';
      items.forEach((it) => {
        const span = document.createElement('span');
        span.className = 'tag';
        span.textContent = it;
        container.appendChild(span);
      });
    });
  }

  function applyBinding(b) {
    const el = $(b.input);
    if (!el) return;
    const val = el.value.trim() ? el.value : b.fallback;
    b.targets.forEach((id) => {
      const t = $(id);
      if (t) t.textContent = val;
    });
    if (b.fit) requestAnimationFrame(() => b.targets.forEach((id) => fitText($(id))));
  }

  function refreshAllDisplays() {
    BINDINGS.forEach(applyBinding);
    TAG_BINDINGS.forEach((b) => renderTags($(b.input) ? $(b.input).value : '', b.targets));
  }

  function initFieldBindings() {
    BINDINGS.forEach((b) => {
      const el = $(b.input);
      if (!el) return;
      el.addEventListener('input', () => {
        applyBinding(b);
        persist();
      });
    });
    TAG_BINDINGS.forEach((b) => {
      const el = $(b.input);
      if (!el) return;
      el.addEventListener('input', () => {
        renderTags(el.value, b.targets);
        persist();
      });
    });
  }

  // ================= AI WRITE (offline template assist) =================
  window.generateAI = function () {
    const role = ($('roleInput').value || 'Professional').trim();
    const comp = ($('compInput').value || 'the company').trim();
    const templates = [
      'Worked as a ' + role + ' at ' + comp + ', handling daily operations, improving process efficiency, and collaborating with cross-functional teams to achieve business goals.',
      'As a ' + role + ' at ' + comp + ', delivered consistent results by managing key responsibilities, meeting deadlines, and contributing to overall team performance.',
      'Responsible for core ' + role + ' duties at ' + comp + ', including planning, execution, and quality control, while maintaining strong communication with stakeholders.',
      'Contributed as a ' + role + ' at ' + comp + ' by streamlining workflows, supporting team objectives, and consistently meeting performance targets.'
    ];
    const text = templates[Math.floor(Math.random() * templates.length)];
    const el = $('descInput');
    el.value = text;
    el.dispatchEvent(new Event('input'));
    showToast('AI description generated', 'success', 'wand-magic-sparkles');
  };

  // ================= SECTION DRAG & DROP REORDER =================
  function reorderListDOM(order) {
    if (!sectionOrderList) return;
    order.forEach((key) => {
      const li = sectionOrderList.querySelector('li[data-key="' + key + '"]');
      if (li) sectionOrderList.appendChild(li);
    });
  }

  function applySectionOrder() {
    const order = Array.from(sectionOrderList.children).map((li) => li.dataset.key);
    state.sectionOrder = order;
    const container = document.querySelector('.right-pad');
    if (container) {
      order.forEach((key) => {
        const sec = $('section-' + key);
        if (sec) container.appendChild(sec);
      });
    }
    persist();
  }

  function initReorder() {
    if (!sectionOrderList) return;
    let dragEl = null;
    sectionOrderList.querySelectorAll('li').forEach((li) => {
      li.addEventListener('dragstart', () => {
        dragEl = li;
        li.classList.add('dragging');
      });
      li.addEventListener('dragend', () => {
        li.classList.remove('dragging');
        sectionOrderList.querySelectorAll('li').forEach((x) => x.classList.remove('drag-over'));
      });
      li.addEventListener('dragover', (e) => {
        e.preventDefault();
        if (li !== dragEl) li.classList.add('drag-over');
      });
      li.addEventListener('dragleave', () => li.classList.remove('drag-over'));
      li.addEventListener('drop', (e) => {
        e.preventDefault();
        li.classList.remove('drag-over');
        if (!dragEl || dragEl === li) return;
        const items = Array.from(sectionOrderList.children);
        const fromIdx = items.indexOf(dragEl);
        const toIdx = items.indexOf(li);
        if (fromIdx < toIdx) li.after(dragEl);
        else li.before(dragEl);
        applySectionOrder();
        showToast('Section order updated', 'success', 'arrows-up-down');
      });
    });
  }

  // ================= ZOOM =================
  window.zoom = function (delta) {
    currentZoom = Math.min(1.2, Math.max(0.3, +(currentZoom + delta).toFixed(2)));
    previewWrapper.style.transform = 'scale(' + currentZoom + ')';
    zoomLabel.textContent = Math.round(currentZoom * 100) + '%';
  };

  // ================= MODAL =================
  const MODALS = {
    privacy: {
      title: 'Privacy Policy',
      body: 'Your resume data is processed entirely in your browser. Nothing is uploaded to a server. Use "Save" to keep a private copy in this browser\u2019s local storage on this device, and "Reset" any time to erase it completely.'
    },
    about: {
      title: 'About CV Master',
      body: 'CV Master is a free, browser-based resume builder. Choose a layout, colors, photo styling, and section order, then export a print-ready, high quality PDF \u2014 all without leaving this page.'
    }
  };
  window.openModal = function (type) {
    const m = MODALS[type];
    if (!m) return;
    modalTitle.textContent = m.title;
    modalContent.textContent = m.body;
    modalOverlay.style.display = 'flex';
  };
  window.closeModal = function () {
    modalOverlay.style.display = 'none';
  };

  // ================= SAVE / LOAD (localStorage) =================
  function collectState() {
    const fields = {};
    ALL_INPUT_IDS.forEach((id) => {
      const el = $(id);
      if (el) fields[id] = el.value;
    });
    return {
      layout: state.layout,
      font: state.font,
      border: state.border,
      primary: state.primary,
      secondary: state.secondary,
      photoBorderColor: state.photoBorderColor,
      photoZoom: state.photoZoom,
      photoX: state.photoX,
      photoY: state.photoY,
      photoRadius: state.photoRadius,
      photoBorder: state.photoBorder,
      photoData: state.photoData,
      sectionOrder: state.sectionOrder,
      fields: fields
    };
  }

  let persistTimer = null;
  function persist() {
    clearTimeout(persistTimer);
    persistTimer = setTimeout(() => {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(collectState()));
      } catch (e) {
        /* storage unavailable or full — fail silently */
      }
    }, 250);
  }

  function syncControlPositions(data) {
    if (data.photoZoom !== undefined && $('zoomSlider')) $('zoomSlider').value = data.photoZoom;
    if (data.photoRadius !== undefined && $('radiusSlider')) $('radiusSlider').value = data.photoRadius;
    if (data.photoX !== undefined && $('moveXSlider')) $('moveXSlider').value = data.photoX;
    if (data.photoY !== undefined && $('moveYSlider')) $('moveYSlider').value = data.photoY;
    if (data.photoBorder !== undefined && $('borderThickSlider')) $('borderThickSlider').value = data.photoBorder;
    if (data.primary && $('customThemePicker')) $('customThemePicker').value = data.primary;
    if (data.photoBorderColor && $('customPhotoBorderPicker') && data.photoBorderColor.startsWith('#')) {
      $('customPhotoBorderPicker').value = data.photoBorderColor;
    }
  }

  function applyState(data) {
    if (!data) return;

    if (data.fields) {
      Object.keys(data.fields).forEach((id) => {
        const el = $(id);
        if (el) el.value = data.fields[id];
      });
    }

    if (data.layout && LAYOUTS.includes(data.layout)) {
      resumePaper.classList.remove(...LAYOUTS);
      resumePaper.classList.add(data.layout);
      state.layout = data.layout;
      resetFitBase();
      activateAmong('[onclick^="setLayout("]', document.querySelector('[onclick="setLayout(\'' + data.layout + '\', this)"]'));
    }

    if (data.font) {
      state.font = data.font;
      root.style.setProperty('--font-head', data.font === 'serif' ? "'Playfair Display', serif" : "'Poppins', sans-serif");
      activateAmong('[onclick^="setFont("]', document.querySelector('[onclick="setFont(\'' + data.font + '\', this)"]'));
    }

    if (data.border !== undefined) {
      state.border = data.border;
      borderOverlay.className = 'border-overlay' + (data.border !== 'none' ? ' b-' + data.border : '');
      activateAmong('[onclick^="setBorder("]', document.querySelector('[onclick="setBorder(\'' + data.border + '\', this)"]'));
    }

    if (data.primary) {
      state.primary = data.primary;
      state.secondary = data.secondary || data.primary;
      root.style.setProperty('--primary', state.primary);
      root.style.setProperty('--secondary', state.secondary);
    }

    if (data.photoBorderColor) {
      state.photoBorderColor = data.photoBorderColor;
      root.style.setProperty('--photo-border-color', data.photoBorderColor);
    }
    if (data.photoZoom !== undefined) {
      state.photoZoom = data.photoZoom;
      root.style.setProperty('--photo-zoom', data.photoZoom / 100);
    }
    if (data.photoX !== undefined) {
      state.photoX = data.photoX;
      root.style.setProperty('--photo-x', data.photoX + '%');
    }
    if (data.photoY !== undefined) {
      state.photoY = data.photoY;
      root.style.setProperty('--photo-y', data.photoY + '%');
    }
    if (data.photoRadius !== undefined) {
      state.photoRadius = data.photoRadius;
      root.style.setProperty('--photo-radius', data.photoRadius + '%');
    }
    if (data.photoBorder !== undefined) {
      state.photoBorder = data.photoBorder;
      root.style.setProperty('--photo-border', data.photoBorder + 'px');
    }
    if (data.photoData) {
      state.photoData = data.photoData;
      dispPhoto.src = data.photoData;
    }

    syncControlPositions(data);
    refreshAllDisplays();

    if (data.sectionOrder && data.sectionOrder.length === 4) {
      state.sectionOrder = data.sectionOrder;
      reorderListDOM(data.sectionOrder);
      applySectionOrder();
    }

    requestAnimationFrame(fitAllText);
  }

  window.saveResume = function () {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(collectState()));
      showToast('Resume saved on this device', 'success', 'circle-check');
    } catch (e) {
      showToast('Could not save — storage unavailable', 'error', 'triangle-exclamation');
    }
  };

  window.loadResume = function () {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      showToast('No saved resume found on this device', 'error', 'circle-exclamation');
      return;
    }
    try {
      applyState(JSON.parse(raw));
      showToast('Resume loaded', 'success', 'folder-open');
    } catch (e) {
      showToast('Saved data could not be read', 'error', 'triangle-exclamation');
    }
  };

  window.clearResume = function () {
    if (!confirm('Reset all resume data and settings? This cannot be undone.')) return;
    localStorage.removeItem(STORAGE_KEY);
    location.reload();
  };

  // ================= PDF EXPORT (high quality, multi-page) =================
  window.downloadPDF = function () {
    const el = $('resumePaper');
    const nameVal = ($('nameInput').value || 'Resume').trim().replace(/[^a-z0-9\-_ ]/gi, '') || 'Resume';

    loadingOverlay.style.display = 'flex';

    // Reset preview zoom so export always captures the true, un-scaled A4 box
    const prevTransform = previewWrapper.style.transform;
    previewWrapper.style.transform = 'none';

    // Strip shadow / decorative overlay tint that would otherwise get
    // captured as extra transparent padding around the page (this was
    // the cause of the page not filling the A4 sheet perfectly)
    el.classList.add('pdf-exporting');

    const opt = {
      margin: 0,
      filename: nameVal + '_CV.pdf',
      image: { type: 'jpeg', quality: 1 },
      html2canvas: {
        scale: 4,               // near-4K resolution per A4 page
        useCORS: true,
        allowTaint: true,
        letterRendering: true,
        backgroundColor: '#ffffff',
        scrollX: 0,
        scrollY: 0,
        windowWidth: el.scrollWidth,
        windowHeight: el.scrollHeight
      },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait', compress: true },
      pagebreak: { mode: ['css', 'legacy'], avoid: ['.avoid-break', '.job-card', '.edu-card', '.section-block'] }
    };

    const cleanup = () => {
      loadingOverlay.style.display = 'none';
      previewWrapper.style.transform = prevTransform;
      el.classList.remove('pdf-exporting');
    };

    // Give the browser a tick to apply the reset transform/class before capture
    setTimeout(() => {
      html2pdf()
        .set(opt)
        .from(el)
        .save()
        .then(() => {
          cleanup();
          showToast('High quality A4 PDF downloaded', 'success', 'file-pdf');
        })
        .catch((err) => {
          cleanup();
          showToast('PDF export failed, please try again', 'error', 'triangle-exclamation');
          console.error('PDF export error:', err);
        });
    }, 80);
  };

  // ================= INIT =================
  function init() {
    initFieldBindings();
    initPhotoUpload();
    initReorder();
    refreshAllDisplays();

    // Apply initial CSS custom properties from default state
    root.style.setProperty('--photo-zoom', state.photoZoom / 100);
    root.style.setProperty('--photo-x', state.photoX + '%');
    root.style.setProperty('--photo-y', state.photoY + '%');
    root.style.setProperty('--photo-radius', state.photoRadius + '%');
    root.style.setProperty('--photo-border', state.photoBorder + 'px');

    // Set initial zoom transform
    previewWrapper.style.transform = 'scale(' + currentZoom + ')';

    // Auto-load any previously saved resume for this browser
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      try {
        applyState(JSON.parse(raw));
      } catch (e) {
        /* ignore corrupt saved data */
      }
    }

    fitAllText();
    window.addEventListener('resize', fitAllText);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
