// --- 1. NOTIFICATIONS ---
function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    let icon = type === 'success' ? 'fa-circle-check' : 'fa-circle-info';
    toast.innerHTML = `<i class="fa-solid ${icon}"></i> <span>${message}</span>`;
    container.appendChild(toast);
    setTimeout(() => { toast.style.opacity = '0'; setTimeout(() => toast.remove(), 300); }, 3000);
}

// --- 2. MODAL SYSTEM ---
function openModal(type) {
    const overlay = document.getElementById('modalOverlay');
    const title = document.getElementById('modalTitle');
    const content = document.getElementById('modalContent');
    overlay.style.display = 'flex';
    if(type === 'privacy') {
        title.innerText = 'Privacy Policy';
        content.innerHTML = '<p>Your data is stored locally in your browser. No data is uploaded.</p>';
    } else {
        title.innerText = 'About CV Master';
        content.innerHTML = '<p>Developed by <strong>Swapan</strong>. Premium Resume Builder.</p>';
    }
}
function closeModal() { document.getElementById('modalOverlay').style.display = 'none'; }

// --- 3. ZOOM ---
let zoomVal = 0.7; // Start 70%
if(window.innerWidth < 900) zoomVal = 0.5;
function zoom(diff) {
    zoomVal += diff;
    if(zoomVal < 0.3) zoomVal = 0.3;
    document.getElementById('previewWrapper').style.transform = `scale(${zoomVal})`;
    document.getElementById('zoomLabel').innerText = Math.round(zoomVal*100) + '%';
}
document.getElementById('previewWrapper').style.transform = `scale(${zoomVal})`;

// --- 4. LAYOUT ---
function setLayout(name, btn) {
    document.getElementById('resumePaper').className = 'resume-paper ' + name;
    document.querySelectorAll('.tool-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    showToast(`Layout: ${name}`, 'info');
}

// --- 5. BORDER OVERLAY (DYNAMIC) ---
function setBorder(type, btn) {
    const borderLayer = document.getElementById('borderOverlay');
    borderLayer.className = 'border-overlay'; // clear old
    if(type !== 'none') {
        borderLayer.classList.add('b-' + type);
    }
    document.querySelectorAll('.border-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    showToast(`${type} border active`, 'success');
}

// --- 6. COLORS & FONTS ---
function setTheme(p, s) {
    document.documentElement.style.setProperty('--primary', p);
    document.documentElement.style.setProperty('--secondary', s);
    showToast('Theme Updated', 'success');
}
function setCustomTheme(hex) {
    document.documentElement.style.setProperty('--primary', hex);
    document.documentElement.style.setProperty('--secondary', hex);
}
function setFont(type, btn) {
    if(type === 'poppins') {
        document.documentElement.style.setProperty('--font-head', "'Poppins', sans-serif");
        document.documentElement.style.setProperty('--font-body', "'Poppins', sans-serif");
    } else if (type === 'serif') {
        document.documentElement.style.setProperty('--font-head', "'Playfair Display', serif");
        document.documentElement.style.setProperty('--font-body', "'Playfair Display', serif");
    } else if (type === 'lato') {
        document.documentElement.style.setProperty('--font-head', "'Lato', sans-serif");
        document.documentElement.style.setProperty('--font-body', "'Lato', sans-serif");
    }
    btn.parentNode.querySelectorAll('.tool-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    showToast('Font Style Updated', 'success');
}

// --- 7. PHOTO ---
function adjustPhoto(val, axis) {
    if(axis === 'zoom') {
        document.documentElement.style.setProperty('--photo-zoom', val / 100);
    } else if (axis === 'x') {
        document.documentElement.style.setProperty('--photo-x', val + '%');
    } else if (axis === 'y') {
        document.documentElement.style.setProperty('--photo-y', val + '%');
    }
}
function updatePhotoStyle(type, val) {
    if(type === 'radius') document.documentElement.style.setProperty('--photo-radius', val + '%');
    if(type === 'border') document.documentElement.style.setProperty('--photo-border', val + 'px');
}
function setPhotoBorderColor(color) {
    document.documentElement.style.setProperty('--photo-border-color', color);
}
document.getElementById('photoInput').addEventListener('change', (e) => {
    if(e.target.files[0]) {
        document.getElementById('dispPhoto').src = URL.createObjectURL(e.target.files[0]);
        showToast('Photo Uploaded', 'success');
    }
});

// --- 8. AI & BINDING ---
function generateAI() {
    const editor = document.getElementById('descInput');
    editor.value = "Generating...";
    setTimeout(() => {
        editor.value = "Highly skilled professional with a proven track record. Expert in strategic planning and execution. Committed to delivering high-quality results.";
        editor.dispatchEvent(new Event('input'));
        showToast('AI Generated', 'success');
    }, 800);
}

function bind(id, targets) {
    const el = document.getElementById(id);
    if(el) {
        el.addEventListener('input', (e) => {
            targets.forEach(t => {
                const targetEl = document.getElementById(t);
                if(targetEl) targetEl.innerText = e.target.value;
            });
        });
    }
}

bind('nameInput', ['dispName', 'dispNameElegant']);
bind('jobInput', ['dispJob', 'dispJobElegant']);
bind('phoneInput', ['dispPhone', 'dispPhoneEl']);
bind('addrInput', ['dispAddr', 'dispAddrEl']);
bind('fatherInput', ['dispFather', 'dispFatherEl']);
bind('dobInput', ['dispDOB', 'dispDOBEl']);
bind('certInput', ['dispCert']);
bind('compInput', ['dispComp']);
bind('roleInput', ['dispRole']);
bind('descInput', ['dispDesc']);
bind('degreeInput', ['dispDegree']);
bind('uniInput', ['dispUni']);
bind('yearInput', ['dispYear']);
bind('aiEditor', ['dispSummary']);

// --- SMART TEXT SCALING ---
function autoScaleText(inputId, targetIds, maxChars) {
    document.getElementById(inputId).addEventListener('input', function(e) {
        const val = e.target.value;
        const len = val.length;
        const targets = targetIds.map(id => document.getElementById(id));
        targets.forEach(el => {
            el.innerText = val;
            if(len > maxChars + 15) el.style.fontSize = '0.6em';
            else if(len > maxChars + 8) el.style.fontSize = '0.75em';
            else if(len > maxChars) el.style.fontSize = '0.85em';
            else el.style.fontSize = '';
        });
    });
}
autoScaleText('emailInput', ['dispEmail', 'dispEmailEl'], 20);
autoScaleText('nameInput', ['dispName', 'dispNameElegant'], 15);
autoScaleText('jobInput', ['dispJob', 'dispJobElegant'], 20);

// --- TAGS ---
function createTags(inputId, targets) {
    document.getElementById(inputId).addEventListener('input', (e) => {
        const val = e.target.value;
        targets.forEach(targetId => {
            const box = document.getElementById(targetId);
            if(box) {
                box.innerHTML = '';
                val.split(',').forEach(txt => {
                    if(txt.trim()) {
                        let s = document.createElement('span');
                        s.className = 'tag';
                        s.innerText = txt.trim();
                        box.appendChild(s);
                    }
                });
            }
        });
    });
}
createTags('skillsInput', ['dispSkills', 'dispSkillsEl']);
createTags('langInput', ['dispLang', 'dispLangEl']); 

// --- DIRECT PDF ---
function downloadPDF() {
    const element = document.getElementById('resumePaper');
    const loading = document.getElementById('loadingOverlay');
    loading.style.display = 'flex';
    const oldTransform = element.style.transform;
    element.style.transform = 'scale(1)'; 

    const opt = {
        margin: 0,
        filename: 'My_Resume.pdf',
        image: { type: 'jpeg', quality: 1.0 },
        html2canvas: { scale: 4, useCORS: true, logging: false, scrollY: 0 },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
        pagebreak: { mode: ['avoid-all', 'css', 'legacy'] }
    };

    html2pdf().set(opt).from(element).save().then(() => {
        element.style.transform = oldTransform;
        loading.style.display = 'none';
        showToast('PDF Downloaded!', 'success');
    });
}
