/* Backup Your Data: accessibility, meaningful exploration, recovery lab, and assessment. */
const storage = {
  get(key) { try { return localStorage.getItem(`backup_${key}`); } catch { return null; } },
  set(key, value) { try { localStorage.setItem(`backup_${key}`, value); } catch { /* Learning remains available without storage. */ } }
};
let explored = new Set();
let activeSince = Date.now();
let labPracticed = false;
let completionTimer;
let announcementTimer;
const tabIds = ['basics', 'scope', 'windows', 'macos', 'android', 'ios', 'services', 'quizzes'];

function announce(message) {
  const region = document.getElementById('aria-live-announcer');
  clearTimeout(announcementTimer);
  region.textContent = '';
  announcementTimer = setTimeout(() => { region.textContent = message; }, 100);
}
function setFontScale(value) {
  const scale = Math.min(1.4, Math.max(0.9, Number(value) || 1));
  document.documentElement.style.setProperty('--font-scale', scale);
  document.getElementById('font-scaler-slider').value = scale;
  document.getElementById('font-size-indicator').textContent = `${Math.round(scale * 100)}%`;
  document.getElementById('font-scaler-slider').setAttribute('aria-valuetext', `${Math.round(scale * 100)} percent`);
  [['normal', 1], ['large', 1.18], ['xlarge', 1.35]].forEach(([id, preset]) => {
    const button = document.getElementById(`btn-font-${id}`);
    const selected = Math.abs(scale - preset) < 0.001;
    button.classList.toggle('active', selected);
    button.setAttribute('aria-pressed', String(selected));
  });
  storage.set('font_scale', scale);
  checkCompletion();
}
function changeTheme(value) {
  const theme = ['default', 'dark', 'high-contrast-light'].includes(value) ? value : 'default';
  if (theme === 'default') document.documentElement.removeAttribute('data-theme');
  else document.documentElement.dataset.theme = theme;
  document.getElementById('theme-select').value = theme;
  storage.set('theme', theme);
  announce(`Contrast theme: ${theme}.`);
}
function activateTab(id, focus = false) {
  if (!tabIds.includes(id)) return;
  for (const tabId of tabIds) {
    const selected = tabId === id;
    const tab = document.getElementById(`tab-${tabId}`);
    const panel = document.getElementById(`panel-${tabId}`);
    tab.setAttribute('aria-selected', String(selected));
    tab.tabIndex = selected ? 0 : -1;
    panel.classList.toggle('active', selected);
    panel.hidden = !selected;
  }
  activeSince = Date.now();
  clearTimeout(completionTimer);
  completionTimer = setTimeout(checkCompletion, 1400);
  const selectedTab = document.getElementById(`tab-${id}`);
  if (focus) selectedTab.focus();
  if (window.matchMedia('(max-width: 768px)').matches) {
    // Scroll only the tab row horizontally; keep lesson content visible vertically.
    const list = selectedTab.closest('.tab-list');
    list.scrollLeft = selectedTab.offsetLeft - list.offsetLeft;
  }
  document.documentElement.style.setProperty('--nav-height', `${document.querySelector('.main-nav').getBoundingClientRect().height}px`);
  document.getElementById(`panel-${id}`).scrollIntoView({ block: 'start' });
}
function checkCompletion() {
  const tab = document.querySelector('.tab-button[aria-selected="true"]');
  if (!tab) return;
  const id = tab.id.replace('tab-', '');
  if (id === 'quizzes' || explored.has(id) || (id === 'scope' && !labPracticed)) return;
  const end = document.querySelector(`[data-end="${id}"]`).getBoundingClientRect();
  if (Date.now() - activeSince >= 1200 && end.bottom <= window.innerHeight - 12 && end.bottom >= 0) {
    earn(id);
  }
}
function earn(id) {
  if (explored.has(id)) return;
  explored.add(id);
  storage.set('explored', JSON.stringify([...explored]));
  updateProgress();
  announce(`Topic completed. ${explored.size} of ${tabIds.length} tabs explored.`);
}
function updateProgress() {
  for (const id of tabIds) document.getElementById(`tab-${id}`).classList.toggle('explored', explored.has(id));
  const complete = explored.size === tabIds.length;
  document.getElementById('exploration-count').textContent = `${explored.size} of ${tabIds.length} Tabs Explored`;
  document.getElementById('exploration-percent-badge').textContent = complete ? '100% Completed' : `${Math.round(explored.size / tabIds.length * 100)}%`;
  document.getElementById('claim-certificate').hidden = !complete;
  document.getElementById('certificate-section').hidden = !complete;
}
function resetProgress() {
  explored.clear();
  labPracticed = false;
  storage.set('explored', '[]');
  document.getElementById('backup-quiz').reset();
  document.getElementById('backup-lab').reset();
  document.getElementById('lab-result').hidden = true;
  document.getElementById('lab-practice-status').textContent = 'Run at least one scenario, then read to the end to complete this tab.';
  document.querySelectorAll('.question-feedback').forEach(item => { item.hidden = true; item.textContent = ''; });
  document.getElementById('quiz-summary').textContent = "Answer every question correctly to earn this tab's checkmark. You can try again.";
  updateProgress();
  activateTab('basics', true);
  announce('Exploration and quiz completion reset.');
}

/* Illustrative outcomes assume a completed clean backup from yesterday. */
const backupScopes = {
  documents: { count: 1, summary: 'Documents only: other personal folders, other users, apps, and the operating system are outside this backup.' },
  home: { count: 3, summary: 'Home folder: this user’s personal files are included. Other users, installed apps, and the operating system need separate recovery.' },
  full: { count: 5, summary: 'Full machine: this model includes all users, apps, and the operating system. Real recovery needs a supported image, compatible hardware, and recovery tools.' }
};
const sampleItems = ['Letters in Documents', 'Family photos in Pictures', 'Class project on Desktop', 'Another user’s files', 'Operating system and installed apps'];
const recoveryPlans = {
  same: {
    failure: [false, 'No surviving backup in this model: the original and backup were on the failed drive.'],
    loss: [false, 'No surviving backup: the backup left with the device.'],
    malware: [false, 'No clean reachable copy: ransomware encrypted the original and the backup folder.']
  },
  connected: {
    failure: [true, 'The external drive survives an internal-drive failure. Included files can be recovered from yesterday’s copy.'],
    loss: [false, 'No surviving backup: the device and nearby external drive were taken together.'],
    malware: [false, 'No clean backup in this scenario: ransomware reached the connected drive, and this plan keeps no earlier versions.']
  },
  offline: {
    failure: [true, 'The disconnected external drive survives. Included files can be recovered from yesterday’s copy.'],
    loss: [false, 'Being disconnected did not protect the nearby drive from the same theft or loss.'],
    malware: [true, 'The disconnected drive was out of reach during infection and contains yesterday’s clean backup.']
  },
  '321': {
    failure: [true, 'The independent local and offsite copies survive. Recover included data from yesterday’s completed backup.'],
    loss: [true, 'The nearby drive was lost too, but the offsite cloud backup survives. Recover included data after regaining account access.'],
    malware: [true, 'The offline copy and protected clean cloud history provide recovery options in this model. Choose a version from before infection.']
  }
};
function runLab(event) {
  event.preventDefault();
  const scope = backupScopes[document.getElementById('backup-scope').value];
  const planId = document.getElementById('backup-plan').value;
  const eventId = document.getElementById('backup-event').value;
  const [survives, outcome] = recoveryPlans[planId][eventId];
  document.getElementById('lab-outcome').textContent = outcome;
  document.getElementById('lab-scope-summary').textContent = scope.summary;
  const coverage = document.getElementById('lab-coverage');
  coverage.replaceChildren();
  sampleItems.forEach((item, index) => {
    const li = document.createElement('li');
    li.textContent = `${item} — ${index >= scope.count ? 'Not included in this scope' : survives ? 'Recoverable in this model' : 'Included, but no surviving clean copy'}`;
    coverage.append(li);
  });
  document.getElementById('lab-next-step').textContent = eventId === 'malware'
    ? 'Before recovery, isolate the infected device and get help cleaning or rebuilding it. Restore a known clean version; an image made after infection can carry malware. Backups do not prevent stolen data from being exposed.'
    : 'Changes since yesterday’s backup are not included. More frequent successful backups reduce that gap. Restore to a safe device and verify your files.';
  document.getElementById('lab-result').hidden = false;
  document.getElementById('lab-practice-status').textContent = 'Scenario tested. Compare another choice, then read to the end to earn this tab’s checkmark.';
  labPracticed = true;
  announce(outcome + ' ' + scope.summary);
  checkCompletion();
}

const quizData = [
  {
    "answer": 1,
    "explanation": "Count the original plus two backups, use different storage media, and keep at least one copy away from home."
  },
  {
    "answer": 2,
    "explanation": "A backup can recover only what it actually included. Check photos, Desktop files, and other locations."
  },
  {
    "answer": 0,
    "explanation": "Malware can attack reachable copies. Keep an isolated copy and clean earlier versions."
  },
  {
    "answer": 2,
    "explanation": "A separate location reduces the chance that one event destroys every copy."
  },
  {
    "answer": 1,
    "explanation": "Check successful backup dates and practice restoring before a real loss occurs."
  },
  {
    "answer": 1,
    "explanation": "Scope and safety are different. An infected image or a reachable destroyed backup will not solve the problem."
  }
];
function checkQuiz(event) {
  event.preventDefault();
  let correct = 0;
  const form = event.currentTarget;
  quizData.forEach((question, index) => {
    const selected = form.querySelector(`input[name="q${index}"]:checked`);
    const passed = Boolean(selected && Number(selected.value) === question.answer);
    if (passed) correct++;
    const feedback = document.getElementById(`feedback-${index}`);
    feedback.hidden = false;
    feedback.className = `question-feedback ${passed ? 'correct' : 'incorrect'}`;
    feedback.textContent = `${passed ? 'Correct.' : selected ? 'Review.' : 'Choose an answer.'} ${question.explanation}`;
  });
  const summary = `${correct} of ${quizData.length} correct. ${correct === quizData.length ? 'Knowledge check completed.' : 'Review the feedback and try again.'}`;
  document.getElementById('quiz-summary').textContent = summary;
  if (correct === quizData.length) earn('quizzes');
  announce(summary);
}
function updateCertificateName(value) {
  const name = value.trim().slice(0, 80);
  document.getElementById('cert-display-name').textContent = name || 'Emeritus Student';
  storage.set('student_name', name);
}
function printCertificate() {
  if (explored.size === tabIds.length) window.print();
}
function openCertificate() {
  if (explored.size !== tabIds.length) return;
  activateTab('quizzes');
  document.getElementById('certificate-section').scrollIntoView({ block: 'start' });
  document.getElementById('student-name-input').focus({ preventScroll: true });
}

document.addEventListener('DOMContentLoaded', () => {
  try {
    const saved = JSON.parse(storage.get('explored') || '[]');
    if (Array.isArray(saved)) explored = new Set(saved.filter(id => tabIds.includes(id)));
  } catch { explored = new Set(); }
  setFontScale(storage.get('font_scale') || 1);
  changeTheme(storage.get('theme') || 'default');
  updateProgress();
  document.getElementById('font-scaler-slider').addEventListener('input', event => setFontScale(event.target.value));
  for (const [index, id] of tabIds.entries()) {
    const tab = document.getElementById(`tab-${id}`);
    tab.addEventListener('click', () => activateTab(id));
    tab.addEventListener('keydown', event => {
      let target;
      if (event.key === 'ArrowRight') target = (index + 1) % tabIds.length;
      if (event.key === 'ArrowLeft') target = (index - 1 + tabIds.length) % tabIds.length;
      if (event.key === 'Home') target = 0;
      if (event.key === 'End') target = tabIds.length - 1;
      if (target !== undefined) { event.preventDefault(); activateTab(tabIds[target], true); }
    });
  }
  window.addEventListener('scroll', checkCompletion, { passive: true });
  window.addEventListener('resize', checkCompletion);
  completionTimer = setTimeout(checkCompletion, 1400);
  document.getElementById('backup-lab').addEventListener('submit', runLab);
  document.getElementById('backup-quiz').addEventListener('submit', checkQuiz);
  document.getElementById('reset-progress').addEventListener('click', resetProgress);
  document.getElementById('claim-certificate').addEventListener('click', openCertificate);
  document.querySelectorAll('.readiness-check').forEach(box => box.addEventListener('change', () => {
    const checked = document.querySelectorAll('.readiness-check:checked').length;
    const message = `${checked} of 5 planning steps checked. This checklist is for your own planning and is not graded.`;
    document.getElementById('checklist-status').textContent = message;
    announce(message);
  }));
  const name = storage.get('student_name') || '';
  document.getElementById('student-name-input').value = name;
  updateCertificateName(name);
  document.getElementById('cert-display-date').textContent = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
});
