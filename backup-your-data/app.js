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
  updateLabSelection();
  document.getElementById('lab-result').hidden = true;
  document.getElementById('lab-practice-status').textContent = 'Test at least one plan, then read to the end to earn this tab’s checkmark.';
  document.querySelectorAll('.question-feedback').forEach(item => { item.hidden = true; item.textContent = ''; });
  document.getElementById('quiz-summary').textContent = "Answer every question correctly to earn this tab's checkmark. You can try again.";
  updateProgress();
  activateTab('basics', true);
  announce('Exploration and quiz completion reset.');
}

/* Illustrative outcomes assume a completed clean backup from yesterday. */
const backupScopes = {
  documents: { count: 1, summary: 'Documents only: files in other folders, other people’s files, apps, and the operating system are not saved.' },
  home: { count: 3, summary: 'Home folder: your personal files are saved. Other people’s files, installed apps, and the operating system are not saved.' },
  full: { count: 5, summary: 'Full machine: this activity saves all users’ files, apps, and the operating system. In real life, you need a backup tool and recovery instructions that work with your computer.' }
};
const sampleItems = ['Letters in Documents', 'Family photos in Pictures', 'Class project on Desktop', 'Another user’s files', 'Operating system and installed apps'];
const recoveryPlans = {
  same: {
    failure: [false, 'You cannot get these files back from this backup. The original files and the backup were on the same broken drive.'],
    loss: [false, 'You cannot use this backup. It was on the device that was lost.'],
    malware: [false, 'You cannot use this backup. Ransomware locked both the original files and the backup folder.']
  },
  connected: {
    failure: [true, 'The external drive still works after the computer’s drive breaks. You can bring back the saved files from yesterday’s backup.'],
    loss: [false, 'You cannot use this backup. The device and the nearby backup drive were lost together.'],
    malware: [false, 'You cannot use this backup. Ransomware locked files on the connected drive. This plan kept no older copies.']
  },
  offline: {
    failure: [true, 'The disconnected drive still works. You can bring back the saved files from yesterday’s backup.'],
    loss: [false, 'Disconnecting the drive did not protect it from theft or loss. It was beside the device, and both were lost.'],
    malware: [true, 'Ransomware could not reach the disconnected drive. It holds yesterday’s backup, made before the attack.']
  },
  '321': {
    failure: [true, 'The separate drive and the cloud backup are still available. You can bring back the saved files from yesterday’s backup.'],
    loss: [true, 'The nearby drive was lost too. The cloud backup is still available away from home. Sign in to bring back the saved files.'],
    malware: [true, 'The disconnected drive and the protected older cloud copies are still usable in this activity. Choose a copy from before the ransomware attack.']
  }
};
const labPlanDescriptions = {
  same: 'Your backup is another folder on the same computer drive.',
  connected: 'The external backup drive stays connected. It keeps only the newest copy.',
  offline: 'The external backup drive is disconnected, but it stays beside the device.',
  '321': 'You have a disconnected backup drive and a cloud backup away from home. The cloud backup keeps older copies.'
};
const labEventDescriptions = {
  failure: 'The computer’s internal drive breaks.',
  loss: 'The device and the backup drive beside it are lost or stolen together.',
  malware: 'Ransomware locks every copy it can reach.'
};
function updateLabSelection() {
  document.getElementById('lab-result').hidden = true;
  const scopeSelect = document.getElementById('backup-scope');
  const plan = document.getElementById('backup-plan').value;
  const event = document.getElementById('backup-event').value;
  document.getElementById('lab-selection-summary').textContent =
    `Your selected plan: ${scopeSelect.selectedOptions[0].textContent}. ${labPlanDescriptions[plan]} What goes wrong: ${labEventDescriptions[event]}`;
}

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
    li.textContent = `${item} — ${index >= scope.count ? 'Not saved by this choice' : survives ? 'Can be brought back in this activity' : 'Was saved, but this backup cannot be used now'}`;
    coverage.append(li);
  });
  document.getElementById('lab-next-step').textContent = eventId === 'malware'
    ? 'Before restoring, disconnect the affected device from the internet and other devices. Get help removing the malware or reinstalling the operating system. Use a backup from before the attack. A backup cannot undo the exposure of information that was stolen.'
    : 'Files created or changed after yesterday’s backup were not saved. Backing up more often helps you lose less recent work. Bring your files back to a safe device, then open them to check.';
  document.getElementById('lab-result').hidden = false;
  document.getElementById('lab-practice-status').textContent = 'Plan tested. Try changing one choice and test again. Then read to the end to earn this tab’s checkmark.';
  labPracticed = true;
  announce(outcome + ' ' + scope.summary);
  checkCompletion();
}

const quizData = [
  {
    "answer": 1,
    "explanation": "Keep your original and two backups. Use two kinds of storage, and keep at least one copy away from home."
  },
  {
    "answer": 2,
    "explanation": "You can bring back only files that were saved. Check photos, Desktop files, and other folders too."
  },
  {
    "answer": 0,
    "explanation": "Malware can damage connected backups too. Keep a disconnected or protected copy from before the attack."
  },
  {
    "answer": 2,
    "explanation": "A separate location reduces the chance that one event destroys every copy."
  },
  {
    "answer": 1,
    "explanation": "Check when the last backup finished. Practice bringing back a file before something goes wrong."
  },
  {
    "answer": 1,
    "explanation": "Saving more files does not make a damaged backup safe. You need a usable copy from before the malware attack."
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
  document.getElementById('backup-lab').addEventListener('change', updateLabSelection);
  updateLabSelection();
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
