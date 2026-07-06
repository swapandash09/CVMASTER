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
  const templateGalleryOverlay = $('templateGalleryOverlay');
  const templateGalleryGrid = $('templateGalleryGrid');
  const sectionOrderList = $('sectionOrderList');
  const dispPhoto = $('dispPhoto');

  const STORAGE_KEY = 'cvmaster_resume_v1';
  const LAYOUTS = ['modern', 'elegant', 'minimal', 'creative', 'compact', 'umber', 'classic', 'scrapbook', 'sunny', 'bold', 'blossom', 'timeline'];

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
    photoSize: 130,
    textSize: 100,
    photoData: null,
    sectionOrder: ['summary', 'experience', 'education', 'cert'],
    textOverrides: {}
  };

  // ---------- Field <-> Display bindings ----------
  const BINDINGS = [
    { input: 'nameInput', targets: ['dispName', 'dispNameElegant'], fallback: 'YOUR NAME', fit: true },
    { input: 'jobInput', targets: ['dispJob', 'dispJobElegant'], fallback: 'PROFESSIONAL TITLE', fit: true },
    { input: 'fatherInput', targets: ['dispFather', 'dispFatherEl'], fallback: 'Name' },
    { input: 'dobInput', targets: ['dispDOB', 'dispDOBEl'], fallback: '--/--/--' },
    { input: 'phoneInput', targets: ['dispPhone', 'dispPhoneEl'], fallback: '+91 ...' },
    { input: 'emailInput', targets: ['dispEmail', 'dispEmailEl'], fallback: 'email@example.com', fit: true },
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
    if (el.dataset.manualSize === 'true') return;
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
      if (el.dataset.manualSize === 'true') return;
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
    if (typeof highlightActiveTemplateCard === 'function') highlightActiveTemplateCard();
    if (typeof updateCurrentTemplateLabel === 'function') updateCurrentTemplateLabel();
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
    } else if (prop === 'size') {
      state.photoSize = value;
      root.style.setProperty('--photo-size', value + 'px');
    }
    persist();
  };

  window.setTextSize = function (value) {
    value = Number(value);
    state.textSize = value;
    root.style.setProperty('--content-zoom', value / 100);
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
    const tagSize = state.textOverrides && state.textOverrides.tags;
    targets.forEach((id) => {
      const container = $(id);
      if (!container) return;
      container.innerHTML = '';
      items.forEach((it) => {
        const span = document.createElement('span');
        span.className = 'tag editable-text';
        span.textContent = it;
        if (tagSize) {
          span.style.fontSize = tagSize + 'px';
          span.dataset.manualSize = 'true';
        }
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

  window.generateSummaryAI = function () {
    const role = ($('roleInput').value || $('jobInput').value || 'professional').trim();
    const skillsRaw = ($('skillsInput').value || '').split(',').map((s) => s.trim()).filter(Boolean);
    const skillPhrase = skillsRaw.length ? skillsRaw.slice(0, 3).join(', ') : 'a strong, adaptable skill set';
    const templates = [
      'Motivated ' + role + ' with hands-on experience and a track record of delivering reliable results. Skilled in ' + skillPhrase + ', with a strong focus on teamwork, learning, and getting things done efficiently.',
      'Detail-oriented ' + role + ' who brings ' + skillPhrase + ' to every project. Known for a proactive attitude, clear communication, and a commitment to continuous improvement.',
      'Result-driven ' + role + ' with practical expertise in ' + skillPhrase + '. Adept at managing priorities, solving problems quickly, and contributing positively to team goals.'
    ];
    const text = templates[Math.floor(Math.random() * templates.length)];
    const el = $('summaryInput');
    el.value = text;
    el.dispatchEvent(new Event('input'));
    showToast('AI summary generated', 'success', 'wand-magic-sparkles');
  };

  const SKILL_LIBRARY = {
    default: ['Communication', 'Teamwork', 'Time Management', 'Problem Solving', 'MS Office'],
    developer: ['JavaScript', 'HTML/CSS', 'Git', 'Problem Solving', 'REST APIs', 'SQL'],
    designer: ['Figma', 'Adobe Photoshop', 'UI/UX Design', 'Typography', 'Prototyping'],
    sales: ['Negotiation', 'CRM Software', 'Lead Generation', 'Client Relations', 'Target Achievement'],
    marketing: ['Social Media Marketing', 'SEO', 'Content Writing', 'Google Analytics', 'Campaign Planning'],
    teacher: ['Lesson Planning', 'Classroom Management', 'Communication', 'Curriculum Design', 'Mentoring'],
    accountant: ['Tally', 'GST Filing', 'Excel', 'Bookkeeping', 'Financial Reporting'],
    manager: ['Team Leadership', 'Project Planning', 'Budgeting', 'Decision Making', 'Stakeholder Management']
  };
  window.generateSkillsAI = function () {
    const role = ($('roleInput').value || $('jobInput').value || '').trim().toLowerCase();
    let picked = SKILL_LIBRARY.default;
    if (role.includes('develop') || role.includes('engineer') || role.includes('programmer')) picked = SKILL_LIBRARY.developer;
    else if (role.includes('design')) picked = SKILL_LIBRARY.designer;
    else if (role.includes('sale')) picked = SKILL_LIBRARY.sales;
    else if (role.includes('market')) picked = SKILL_LIBRARY.marketing;
    else if (role.includes('teach') || role.includes('professor') || role.includes('faculty')) picked = SKILL_LIBRARY.teacher;
    else if (role.includes('account') || role.includes('finance')) picked = SKILL_LIBRARY.accountant;
    else if (role.includes('manager') || role.includes('lead') || role.includes('head')) picked = SKILL_LIBRARY.manager;

    const el = $('skillsInput');
    const existing = el.value.split(',').map((s) => s.trim()).filter(Boolean);
    const merged = Array.from(new Set(existing.concat(picked))).slice(0, 8);
    el.value = merged.join(', ');
    el.dispatchEvent(new Event('input'));
    showToast('AI skill suggestions added', 'success', 'wand-magic-sparkles');
  };

  window.generateCertAI = function () {
    const role = ($('roleInput').value || $('jobInput').value || '').trim();
    const suggestions = [
      'Certificate in Computer Applications (CCC/ADCA)',
      'Diploma in ' + (role || 'Professional Skills'),
      'Tally Prime with GST Certification',
      'Basic Spoken English & Communication Skills Course'
    ];
    const el = $('certInput');
    el.value = suggestions.slice(0, 2).join('\n');
    el.dispatchEvent(new Event('input'));
    showToast('AI certificate suggestions added', 'success', 'wand-magic-sparkles');
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

  // ================= TEMPLATE GALLERY =================
  const TEMPLATE_LIBRARY = [
    { key: 'modern', label: 'Modern', a: '#2c3e50', b: '#ffffff', style: 'split' },
    { key: 'elegant', label: 'Elegant', a: '#2c3e50', b: '#f8f9fa', style: 'topbar' },
    { key: 'minimal', label: 'Minimal', a: '#f4f4f4', b: '#ffffff', style: 'topbar' },
    { key: 'creative', label: 'Creative', a: '#2c3e50', b: '#f1f5f9', style: 'topbar' },
    { key: 'compact', label: 'Compact', a: '#ffffff', b: '#ffffff', style: 'topbar' },
    { key: 'umber', label: 'Umber', a: '#f3ede3', b: '#2b2420', style: 'split' },
    { key: 'classic', label: 'Classic', a: '#ffffff', b: '#ffffff', style: 'topbar' },
    { key: 'scrapbook', label: 'Scrapbook', a: '#faf3e6', b: '#f4a6c1', style: 'topbar' },
    { key: 'sunny', label: 'Sunny', a: '#ffe4ec', b: '#d6336c', style: 'topbar' },
    { key: 'bold', label: 'Bold', a: '#ffffff', b: '#e91e8c', style: 'split' },
    { key: 'blossom', label: 'Blossom', a: '#f8a8c4', b: '#ffffff', style: 'split' },
    { key: 'timeline', label: 'Timeline', a: '#f1f2f4', b: '#ffffff', style: 'split' }
  ];

  function buildTemplateGallery() {
    if (!templateGalleryGrid || templateGalleryGrid.dataset.built) return;
    TEMPLATE_LIBRARY.forEach((t) => {
      const card = document.createElement('div');
      card.className = 'tmpl-card';
      card.dataset.key = t.key;

      const swatch = document.createElement('div');
      swatch.className = 'tmpl-swatch' + (t.style === 'topbar' ? ' tmpl-topbar' : '');
      const a = document.createElement('div');
      a.className = 'tmpl-swatch-a';
      a.style.background = t.a;
      const b = document.createElement('div');
      b.className = 'tmpl-swatch-b';
      b.style.background = t.b;
      swatch.appendChild(a);
      swatch.appendChild(b);

      const name = document.createElement('div');
      name.className = 'tmpl-name';
      name.textContent = t.label;

      card.appendChild(swatch);
      card.appendChild(name);
      card.addEventListener('click', () => {
        window.setLayout(t.key, null);
        highlightActiveTemplateCard();
        closeTemplateGallery();
        showToast(t.label + ' template applied', 'success', 'palette');
      });
      templateGalleryGrid.appendChild(card);
    });
    templateGalleryGrid.dataset.built = 'true';
  }

  function highlightActiveTemplateCard() {
    if (!templateGalleryGrid) return;
    templateGalleryGrid.querySelectorAll('.tmpl-card').forEach((c) => {
      c.classList.toggle('active', c.dataset.key === state.layout);
    });
  }

  window.openTemplateGallery = function () {
    buildTemplateGallery();
    highlightActiveTemplateCard();
    templateGalleryOverlay.style.display = 'flex';
  };
  window.closeTemplateGallery = function () {
    templateGalleryOverlay.style.display = 'none';
  };

  function updateCurrentTemplateLabel() {
    const el = $('currentTemplateName');
    if (!el) return;
    const t = TEMPLATE_LIBRARY.find((x) => x.key === state.layout);
    el.textContent = t ? t.label : state.layout;
  }

  window.cycleTemplate = function (dir) {
    const idx = TEMPLATE_LIBRARY.findIndex((t) => t.key === state.layout);
    const nextIdx = (idx + dir + TEMPLATE_LIBRARY.length) % TEMPLATE_LIBRARY.length;
    const next = TEMPLATE_LIBRARY[nextIdx];
    window.setLayout(next.key, null);
    showToast(next.label + ' template applied', 'success', 'palette');
  };

  // ================= CLICK-TO-RESIZE TEXT INSPECTOR =================
  const textInspector = $('textInspector');
  const tiLabel = $('tiLabel');
  const tiSlider = $('tiSlider');
  let activeTextKey = null;
  let activeTextEls = [];

  const EDITABLE_MAP = [
    { key: 'name', selector: '#dispName, #dispNameElegant', label: 'Name' },
    { key: 'job', selector: '#dispJob, #dispJobElegant', label: 'Job Title' },
    { key: 'heading', selector: '.main-title', label: 'Section Headings' },
    { key: 'body', selector: '#dispSummary, #dispDesc, #dispCert, .job-role, #dispComp, #dispDegree, #dispUni', label: 'Body Text' },
    { key: 'tags', selector: '.tag', label: 'Skills & Tags' }
  ];

  function initEditableText() {
    EDITABLE_MAP.forEach((m) => {
      resumePaper.querySelectorAll(m.selector).forEach((el) => el.classList.add('editable-text'));
    });
    resumePaper.addEventListener('click', (e) => {
      for (const m of EDITABLE_MAP) {
        const hit = e.target.closest(m.selector);
        if (hit) {
          e.stopPropagation();
          openTextInspector(m);
          return;
        }
      }
    });
    document.addEventListener('click', (e) => {
      if (textInspector.classList.contains('show') && !textInspector.contains(e.target) && !e.target.closest('#resumePaper')) {
        closeTextInspector();
      }
    });
  }

  function openTextInspector(m) {
    activeTextKey = m.key;
    activeTextEls = Array.from(resumePaper.querySelectorAll(m.selector));
    document.querySelectorAll('.editable-text').forEach((el) => el.classList.remove('ti-active'));
    activeTextEls.forEach((el) => el.classList.add('ti-active'));
    tiLabel.textContent = m.label;
    const current = state.textOverrides[m.key] || Math.round(parseFloat(getComputedStyle(activeTextEls[0]).fontSize)) || 14;
    tiSlider.value = current;
    textInspector.classList.add('show');
  }

  window.closeTextInspector = function () {
    textInspector.classList.remove('show');
    document.querySelectorAll('.editable-text').forEach((el) => el.classList.remove('ti-active'));
    activeTextKey = null;
    activeTextEls = [];
  };

  window.setEditableTextSize = function (value) {
    if (!activeTextKey) return;
    value = Number(value);
    state.textOverrides[activeTextKey] = value;
    activeTextEls.forEach((el) => {
      el.style.fontSize = value + 'px';
      el.dataset.manualSize = 'true';
    });
    persist();
  };

  window.nudgeTextSize = function (delta) {
    if (!tiSlider) return;
    const val = Math.min(48, Math.max(8, Number(tiSlider.value) + delta));
    tiSlider.value = val;
    window.setEditableTextSize(val);
  };

  function applyTextOverrides() {
    EDITABLE_MAP.forEach((m) => {
      const val = state.textOverrides[m.key];
      if (val === undefined) return;
      resumePaper.querySelectorAll(m.selector).forEach((el) => {
        el.style.fontSize = val + 'px';
        el.dataset.manualSize = 'true';
      });
    });
  }

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
      photoSize: state.photoSize,
      textSize: state.textSize,
      photoData: state.photoData,
      sectionOrder: state.sectionOrder,
      textOverrides: state.textOverrides,
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
    if (data.photoSize !== undefined && $('photoSizeSlider')) $('photoSizeSlider').value = data.photoSize;
    if (data.textSize !== undefined && $('textSizeSlider')) $('textSizeSlider').value = data.textSize;
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
      updateCurrentTemplateLabel();
      highlightActiveTemplateCard();
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
    if (data.photoSize !== undefined) {
      state.photoSize = data.photoSize;
      root.style.setProperty('--photo-size', data.photoSize + 'px');
    }
    if (data.textSize !== undefined) {
      state.textSize = data.textSize;
      root.style.setProperty('--content-zoom', data.textSize / 100);
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

    if (data.textOverrides) {
      state.textOverrides = data.textOverrides;
      applyTextOverrides();
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

  // ================= JPG EXPORT (4K quality) =================
  window.downloadJPG = function () {
    const el = $('resumePaper');
    const nameVal = ($('nameInput').value || 'Resume').trim().replace(/[^a-z0-9\-_ ]/gi, '') || 'Resume';

    if (typeof html2canvas === 'undefined') {
      showToast('Image engine failed to load, check your connection', 'error', 'triangle-exclamation');
      return;
    }

    loadingOverlay.style.display = 'flex';

    const prevTransform = previewWrapper.style.transform;
    previewWrapper.style.transform = 'none';
    el.classList.add('pdf-exporting');

    setTimeout(() => {
      html2canvas(el, {
        scale: 4, // near-4K resolution
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        scrollX: 0,
        scrollY: 0,
        windowWidth: el.scrollWidth,
        windowHeight: el.scrollHeight
      })
        .then((canvas) => {
          const link = document.createElement('a');
          link.download = nameVal + '_CV.jpg';
          link.href = canvas.toDataURL('image/jpeg', 1.0);
          document.body.appendChild(link);
          link.click();
          link.remove();

          loadingOverlay.style.display = 'none';
          previewWrapper.style.transform = prevTransform;
          el.classList.remove('pdf-exporting');
          showToast('High quality JPG downloaded', 'success', 'file-image');
        })
        .catch((err) => {
          loadingOverlay.style.display = 'none';
          previewWrapper.style.transform = prevTransform;
          el.classList.remove('pdf-exporting');
          showToast('JPG export failed, please try again', 'error', 'triangle-exclamation');
          console.error('JPG export error:', err);
        });
    }, 80);
  };

  // ================= INIT =================
  function init() {
    initFieldBindings();
    initPhotoUpload();
    initReorder();
    initEditableText();
    refreshAllDisplays();

    // Apply initial CSS custom properties from default state
    root.style.setProperty('--photo-zoom', state.photoZoom / 100);
    root.style.setProperty('--photo-x', state.photoX + '%');
    root.style.setProperty('--photo-y', state.photoY + '%');
    root.style.setProperty('--photo-radius', state.photoRadius + '%');
    root.style.setProperty('--photo-border', state.photoBorder + 'px');
    root.style.setProperty('--photo-size', state.photoSize + 'px');
    root.style.setProperty('--content-zoom', state.textSize / 100);

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

  // ---------- PWA: register service worker ----------
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('service-worker.js').catch(() => {
        /* offline support unavailable (e.g. running from file://) — app still works normally */
      });
    });
  }
})();
