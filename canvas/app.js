document.addEventListener('DOMContentLoaded', () => {
  initAccessibilitySettings();
  initTabs();
  initNavigationPractice();
  initNotifications();
  initProfileActivity();
  initReadinessQuiz();
  initGlossary();
  initCertificate();
});

const storageKeys = {
  fontScale: 'canvas_font_scale',
  theme: 'canvas_theme',
  exploredTabs: 'canvas_explored_tabs',
  learnerName: 'canvas_learner_name'
};

let announcerTimer;
let activeTabActivatedAt = Date.now();
let exploredTabIds = [];
let navigationStep = 0;
let selectedPhotoChoice = '';

function readStorage(key) {
  try { return localStorage.getItem(key); } catch (error) { return null; }
}

function writeStorage(key, value) {
  try { localStorage.setItem(key, value); } catch (error) { /* Storage is optional. */ }
}

function announce(message) {
  const announcer = document.getElementById('aria-live-announcer');
  if (!announcer) return;
  clearTimeout(announcerTimer);
  announcer.textContent = '';
  announcerTimer = setTimeout(() => { announcer.textContent = message; }, 80);
}

function setFeedback(element, message, state) {
  if (!element) return;
  element.textContent = message;
  element.classList.add('visible');
  element.classList.toggle('correct', state === 'correct');
  element.classList.toggle('review', state === 'review');
}

function clearFeedback(element) {
  if (!element) return;
  element.textContent = '';
  element.classList.remove('visible', 'correct', 'review');
}

/* Accessibility settings */
function initAccessibilitySettings() {
  const slider = document.getElementById('font-scaler-slider');
  const themeSelect = document.getElementById('theme-select');
  const presetButtons = document.querySelectorAll('[data-font-scale]');

  slider?.addEventListener('input', event => setFontScale(Number(event.target.value)));
  presetButtons.forEach(button => button.addEventListener('click', () => setFontScale(Number(button.dataset.fontScale))));
  themeSelect?.addEventListener('change', event => setTheme(event.target.value));

  const savedScale = Number(readStorage(storageKeys.fontScale));
  setFontScale(savedScale >= 0.9 && savedScale <= 1.4 ? savedScale : 1, false);
  const savedTheme = readStorage(storageKeys.theme);
  setTheme(['default', 'dark', 'high-contrast-light'].includes(savedTheme) ? savedTheme : 'default', false);
}

function setFontScale(scale, shouldAnnounce = true) {
  const normalized = Math.min(1.4, Math.max(0.9, Number(scale) || 1));
  const percent = Math.round(normalized * 100);
  const slider = document.getElementById('font-scaler-slider');
  document.documentElement.style.setProperty('--font-scale', normalized);
  if (slider) {
    slider.value = String(normalized);
    slider.setAttribute('aria-valuetext', `${percent} percent`);
  }
  const indicator = document.getElementById('font-size-indicator');
  if (indicator) indicator.textContent = `${percent}%`;

  let activeScale = 1.35;
  if (normalized <= 1.05) activeScale = 1;
  else if (normalized <= 1.25) activeScale = 1.18;
  document.querySelectorAll('[data-font-scale]').forEach(button => {
    const active = Number(button.dataset.fontScale) === activeScale;
    button.classList.toggle('active', active);
    button.setAttribute('aria-pressed', String(active));
  });
  writeStorage(storageKeys.fontScale, String(normalized));
  if (shouldAnnounce) announce(`Text size set to ${percent} percent.`);
}

function setTheme(theme, shouldAnnounce = true) {
  const labels = { default: 'Default Light', dark: 'High Contrast Dark', 'high-contrast-light': 'High Contrast Black and White' };
  if (theme === 'default') document.documentElement.removeAttribute('data-theme');
  else document.documentElement.setAttribute('data-theme', theme);
  const select = document.getElementById('theme-select');
  if (select) select.value = theme;
  writeStorage(storageKeys.theme, theme);
  if (shouldAnnounce) announce(`Contrast theme changed to ${labels[theme]}.`);
}

/* Tabs and meaningful completion */
function initTabs() {
  const tabs = Array.from(document.querySelectorAll('.tab-button'));
  const panels = Array.from(document.querySelectorAll('.tab-panel'));
  try { exploredTabIds = JSON.parse(readStorage(storageKeys.exploredTabs) || '[]'); } catch (error) { exploredTabIds = []; }
  const validIds = new Set(tabs.map(tab => tab.id));
  exploredTabIds = Array.isArray(exploredTabIds) ? [...new Set(exploredTabIds)].filter(id => validIds.has(id)) : [];

  tabs.forEach((tab, index) => {
    tab.addEventListener('click', () => activateTab(tab, tabs, panels));
    tab.addEventListener('keydown', event => {
      let targetIndex = null;
      if (event.key === 'ArrowRight') targetIndex = (index + 1) % tabs.length;
      if (event.key === 'ArrowLeft') targetIndex = (index - 1 + tabs.length) % tabs.length;
      if (event.key === 'Home') targetIndex = 0;
      if (event.key === 'End') targetIndex = tabs.length - 1;
      if (targetIndex === null) return;
      event.preventDefault();
      tabs[targetIndex].focus();
      activateTab(tabs[targetIndex], tabs, panels);
    });
  });

  document.getElementById('reset-progress')?.addEventListener('click', resetProgress);
  window.addEventListener('scroll', checkReadingCompletion, { passive: true });
  window.addEventListener('resize', checkReadingCompletion, { passive: true });
  updateProgressUI();
  setTimeout(checkReadingCompletion, 1200);
}

function activateTab(selectedTab, tabs, panels) {
  tabs.forEach(tab => {
    const selected = tab === selectedTab;
    tab.setAttribute('aria-selected', String(selected));
    tab.setAttribute('tabindex', selected ? '0' : '-1');
  });
  panels.forEach(panel => panel.classList.remove('active'));
  const panel = document.getElementById(selectedTab.getAttribute('aria-controls'));
  if (!panel) return;
  panel.classList.add('active');
  activeTabActivatedAt = Date.now();
  selectedTab.scrollIntoView({ block: 'nearest', inline: 'center' });
  panel.scrollIntoView({ block: 'start' });
  announce(`Switched to ${cleanTabTitle(selectedTab)}. ${getTabDirections(selectedTab.id)}`);
  setTimeout(checkReadingCompletion, 1200);
}

function cleanTabTitle(tab) {
  return tab.textContent.replace('✅', '').replace('Explored', '').replace(/\s+/g, ' ').trim();
}

function getTabDirections(tabId) {
  const directions = {
    'tab-navigation': 'Complete all six navigation tasks.',
    'tab-notifications': 'Choose each preference and complete the review confirmations.',
    'tab-profile': 'Choose a photo type and complete all privacy and submission confirmations.',
    'tab-readiness': 'Answer every question correctly.'
  };
  return directions[tabId] || 'Read to the end of the section to earn its checkmark.';
}

function checkReadingCompletion() {
  const activeTab = document.querySelector('.tab-button[aria-selected="true"]');
  if (!activeTab || exploredTabIds.includes(activeTab.id)) return;
  if (!new Set(['tab-basics', 'tab-glossary']).has(activeTab.id)) return;
  const panel = document.getElementById(activeTab.getAttribute('aria-controls'));
  if (!panel) return;
  const viewedLongEnough = Date.now() - activeTabActivatedAt >= 1000;
  const reachedEnd = panel.getBoundingClientRect().bottom <= window.innerHeight - 24;
  if (viewedLongEnough && reachedEnd) markTabComplete(activeTab.id);
}

function markTabComplete(tabId) {
  if (exploredTabIds.includes(tabId) || !document.getElementById(tabId)) return;
  exploredTabIds.push(tabId);
  writeStorage(storageKeys.exploredTabs, JSON.stringify(exploredTabIds));
  updateProgressUI();
  announce(`${cleanTabTitle(document.getElementById(tabId))} completed. Progress updated.`);
}

function updateProgressUI() {
  const tabs = Array.from(document.querySelectorAll('.tab-button'));
  const count = exploredTabIds.length;
  const percent = tabs.length ? Math.round((count / tabs.length) * 100) : 0;
  tabs.forEach(tab => tab.classList.toggle('explored', exploredTabIds.includes(tab.id)));
  const countLabel = document.getElementById('exploration-count');
  const badge = document.getElementById('exploration-percent-badge');
  if (countLabel) countLabel.textContent = `${count} of ${tabs.length} Tabs Explored`;
  if (badge) {
    badge.textContent = percent === 100 ? '100% Completed' : `${percent}%`;
    badge.style.backgroundColor = percent === 100 ? '#155724' : '#176b2c';
  }
  const claimCertificate = document.getElementById('claim-certificate');
  const completionSummary = document.getElementById('completion-summary');
  const certificateSection = document.getElementById('certificate-section');
  if (claimCertificate) claimCertificate.hidden = percent !== 100;
  if (completionSummary) completionSummary.hidden = percent !== 100;
  if (certificateSection && percent !== 100) certificateSection.hidden = true;
  if (claimCertificate && percent !== 100) claimCertificate.setAttribute('aria-expanded', 'false');
}

function resetProgress() {
  exploredTabIds = [];
  navigationStep = 0;
  selectedPhotoChoice = '';
  writeStorage(storageKeys.exploredTabs, '[]');
  resetNavigationPractice(false);
  document.querySelectorAll('input[type="checkbox"], input[type="radio"]').forEach(input => { input.checked = false; });
  document.querySelectorAll('[data-notification]').forEach(select => { select.value = ''; });
  document.querySelectorAll('[data-photo-choice]').forEach(button => button.setAttribute('aria-pressed', 'false'));
  ['notification-feedback', 'photo-choice-feedback', 'profile-feedback', 'readiness-feedback'].forEach(id => clearFeedback(document.getElementById(id)));
  updateProgressUI();
  const tabs = Array.from(document.querySelectorAll('.tab-button'));
  const panels = Array.from(document.querySelectorAll('.tab-panel'));
  activateTab(document.getElementById('tab-basics'), tabs, panels);
  announce('Exploration progress and learning activities were reset.');
}

/* Global Navigation practice */
const navigationTasks = [
  { destination: 'dashboard', task: 'Where would you go to see activity across your courses?', title: 'Dashboard', text: 'The Dashboard is the Canvas landing page and can summarize activity across current courses.' },
  { destination: 'courses', task: 'Where would you look for a course that is not shown as a favorite?', title: 'Courses', text: 'Courses includes an All Courses link for viewing your course list.' },
  { destination: 'calendar', task: 'Where would you compare dated items across courses?', title: 'Calendar', text: 'Calendar combines dated items from courses you can access.' },
  { destination: 'inbox', task: 'Where would you read or send a Canvas Conversation?', title: 'Inbox', text: 'Inbox is Canvas Conversations, the course messaging system.' },
  { destination: 'account', task: 'Where would you begin to change notifications or your profile photo?', title: 'Account', text: 'Account opens Notifications, Settings, and other user choices available at your institution.' },
  { destination: 'help', task: 'Where would you find support choices provided by your institution?', title: 'Help', text: 'Help displays the support resources configured for your Canvas account.' }
];

function initNavigationPractice() {
  document.querySelectorAll('.canvas-nav-button').forEach(button => button.addEventListener('click', () => checkNavigationChoice(button)));
  document.getElementById('restart-navigation')?.addEventListener('click', () => resetNavigationPractice());
  renderNavigationTask();
}

function checkNavigationChoice(button) {
  const task = navigationTasks[navigationStep];
  const feedback = document.getElementById('navigation-feedback');
  if (!task) return;
  document.querySelectorAll('.canvas-nav-button').forEach(item => item.classList.remove('current'));
  button.classList.add('current');

  if (button.dataset.destination !== task.destination) {
    setFeedback(feedback, 'Review: That item has a different purpose. Read the prompt and try another Global Navigation item.', 'review');
    announce('That item has a different purpose. Try another navigation item.');
    return;
  }

  button.classList.add('visited');
  document.getElementById('navigation-result-title').textContent = task.title;
  document.getElementById('navigation-result-text').textContent = task.text;
  setFeedback(feedback, `Correct: ${task.text}`, 'correct');
  navigationStep += 1;
  if (navigationStep === navigationTasks.length) {
    document.getElementById('navigation-task').textContent = 'Practice complete: You found all six destinations.';
    markTabComplete('tab-navigation');
    return;
  }
  setTimeout(renderNavigationTask, 650);
}

function renderNavigationTask() {
  const task = navigationTasks[navigationStep];
  const taskElement = document.getElementById('navigation-task');
  if (taskElement && task) taskElement.textContent = `Task ${navigationStep + 1} of ${navigationTasks.length}: ${task.task}`;
  document.querySelectorAll('.canvas-nav-button').forEach(button => button.classList.remove('current'));
  clearFeedback(document.getElementById('navigation-feedback'));
}

function resetNavigationPractice(shouldAnnounce = true) {
  navigationStep = 0;
  document.querySelectorAll('.canvas-nav-button').forEach(button => button.classList.remove('visited', 'current'));
  const title = document.getElementById('navigation-result-title');
  const text = document.getElementById('navigation-result-text');
  if (title) title.textContent = 'Select a navigation item';
  if (text) text.textContent = 'Feedback will appear here. You can safely try again after an incorrect choice.';
  renderNavigationTask();
  if (shouldAnnounce) announce('Navigation practice restarted.');
}

/* Notification plan */
function initNotifications() {
  document.getElementById('notification-form')?.addEventListener('submit', event => {
    event.preventDefault();
    const selects = Array.from(document.querySelectorAll('[data-notification]'));
    const checks = Array.from(document.querySelectorAll('.notification-check'));
    const feedback = document.getElementById('notification-feedback');
    if (selects.some(select => !select.value)) {
      setFeedback(feedback, 'Review: Choose a frequency for all five notification types.', 'review');
      announce('Choose a frequency for every notification type.');
      return;
    }
    if (!checks.every(check => check.checked)) {
      setFeedback(feedback, 'Review: Complete all three confirmations before applying this plan in Canvas.', 'review');
      announce('Complete all three notification confirmations.');
      return;
    }
    const immediateCount = selects.filter(select => select.value === 'Notify immediately').length;
    const offCount = selects.filter(select => select.value === 'Notifications off').length;
    setFeedback(feedback, `Completed: Your practice plan includes ${immediateCount} immediate and ${offCount} off setting${offCount === 1 ? '' : 's'}. Review whether this balance helps you notice important course activity without overload.`, 'correct');
    markTabComplete('tab-notifications');
  });
}

/* Profile choice and checklist */
function initProfileActivity() {
  document.querySelectorAll('[data-photo-choice]').forEach(button => {
    button.addEventListener('click', () => {
      selectedPhotoChoice = button.dataset.photoChoice;
      document.querySelectorAll('[data-photo-choice]').forEach(item => item.setAttribute('aria-pressed', String(item === button)));
      setFeedback(document.getElementById('photo-choice-feedback'), `Selected: ${selectedPhotoChoice}. This choice meets the assignment when the image is appropriate and you are comfortable sharing it with the class.`, 'correct');
      updateProfileCompletion();
    });
  });
  document.querySelectorAll('.profile-check').forEach(check => check.addEventListener('change', updateProfileCompletion));
}

function updateProfileCompletion() {
  const checks = Array.from(document.querySelectorAll('.profile-check'));
  const feedback = document.getElementById('profile-feedback');
  const completedCount = checks.filter(check => check.checked).length;
  if (selectedPhotoChoice && checks.every(check => check.checked)) {
    setFeedback(feedback, 'Completed: You selected a comfortable image type and reviewed the upload, privacy, and submission steps.', 'correct');
    markTabComplete('tab-profile');
  } else {
    setFeedback(feedback, `Review progress: Select one image type and complete all four confirmations. ${completedCount} of 4 confirmations completed.`, 'review');
  }
}

/* Readiness quiz */
function initReadinessQuiz() {
  document.getElementById('readiness-quiz')?.addEventListener('submit', event => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const answers = [data.get('q1'), data.get('q2'), data.get('q3'), data.get('q4')];
    const correct = ['account', 'override', 'choice', 'details'];
    const feedback = document.getElementById('readiness-feedback');
    if (answers.some(answer => answer === null)) {
      setFeedback(feedback, 'Review: Answer all four questions before checking your work.', 'review');
      announce('Answer all four questions before checking your work.');
      return;
    }
    const score = answers.filter((answer, index) => answer === correct[index]).length;
    if (score === correct.length) {
      setFeedback(feedback, 'Correct: You are ready to navigate Canvas, manage notifications, choose a profile image, and verify the assignment submission.', 'correct');
      markTabComplete('tab-readiness');
    } else {
      setFeedback(feedback, `Review: ${score} of 4 answers are correct. Revisit the related guide sections and try again.`, 'review');
      announce(`${score} of 4 answers are correct. Review and try again.`);
    }
  });
}

/* Glossary */
const glossaryTerms = [
  { term: 'Account', definition: 'The Global Navigation area for personal settings, notifications, files, profile options when enabled, and logout.' },
  { term: 'Assignment Enhancements', definition: 'An alternate Canvas assignment interface that can change the placement or wording of submission controls.' },
  { term: 'Canvas Student app', definition: 'Instructure’s mobile app for students. Its layout and push-notification behavior differ from browser Canvas.' },
  { term: 'Course Navigation', definition: 'The menu of tools inside one course, such as Modules, Assignments, Discussions, and Grades. The instructor controls which links are visible.' },
  { term: 'Dashboard', definition: 'The Canvas landing page, which can summarize current courses and activity in several available views.' },
  { term: 'Global Navigation', definition: 'The menu available throughout Canvas for Account, Dashboard, Courses, Calendar, Inbox, History, Help, and institution-added tools.' },
  { term: 'Inbox', definition: 'Canvas Conversations, used for course messages. It is separate from a personal email inbox.' },
  { term: 'Module', definition: 'An instructor-organized sequence of course pages, files, discussions, quizzes, and assignments.' },
  { term: 'Notification', definition: 'A message Canvas sends to a confirmed contact method when a supported course or account event occurs.' },
  { term: 'Profile', definition: 'A Canvas feature that can show information about a user to others in their courses when enabled by the institution.' },
  { term: 'Profile picture', definition: 'The image or avatar shown with your Canvas identity. The ability to change it is controlled separately by the institution.' },
  { term: 'Push notification', definition: 'A mobile-device alert from the Canvas Student app. Canvas supports immediate push delivery or off, not daily or weekly push summaries.' },
  { term: 'Submission comment', definition: 'A comment connected to submitted work, often used by an instructor for feedback or questions.' },
  { term: 'To Do list', definition: 'A Canvas reminder list for upcoming or recent items. It supports planning but does not replace full course and assignment instructions.' }
];

function initGlossary() {
  const search = document.getElementById('glossary-search-input');
  renderGlossary(glossaryTerms);
  search?.addEventListener('input', event => {
    const query = event.target.value.trim().toLowerCase();
    renderGlossary(glossaryTerms.filter(item => item.term.toLowerCase().includes(query) || item.definition.toLowerCase().includes(query)));
  });
}

function renderGlossary(terms) {
  const container = document.getElementById('glossary-card-container');
  const count = document.getElementById('glossary-result-count');
  if (!container) return;
  container.replaceChildren();
  if (count) count.textContent = `${terms.length} ${terms.length === 1 ? 'term' : 'terms'} shown.`;
  if (!terms.length) {
    const message = document.createElement('p');
    message.textContent = 'No glossary terms match that search. Try a shorter word.';
    container.appendChild(message);
    return;
  }
  terms.forEach(item => {
    const card = document.createElement('article');
    const heading = document.createElement('h3');
    const definition = document.createElement('p');
    card.className = 'glossary-card';
    heading.textContent = item.term;
    definition.textContent = item.definition;
    card.append(heading, definition);
    container.appendChild(card);
  });
}

/* Completion certificate */
function initCertificate() {
  const nameInput = document.getElementById('student-name-input');
  const date = document.getElementById('cert-display-date');
  const savedName = readStorage(storageKeys.learnerName) || '';
  if (date) date.textContent = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  if (nameInput) {
    nameInput.value = savedName;
    updateCertificateName(savedName);
    nameInput.addEventListener('input', event => updateCertificateName(event.target.value));
  }
  document.getElementById('claim-certificate')?.addEventListener('click', openCertificateSection);
  document.getElementById('print-certificate')?.addEventListener('click', () => window.print());
}

function updateCertificateName(name) {
  const cleanName = name.trim();
  const display = document.getElementById('cert-display-name');
  if (display) display.textContent = cleanName || 'Emeritus Student';
  writeStorage(storageKeys.learnerName, cleanName);
}

function openCertificateSection() {
  const tabs = Array.from(document.querySelectorAll('.tab-button'));
  const panels = Array.from(document.querySelectorAll('.tab-panel'));
  const glossaryTab = document.getElementById('tab-glossary');
  const certificateSection = document.getElementById('certificate-section');
  const claimCertificate = document.getElementById('claim-certificate');
  if (!glossaryTab || !certificateSection) return;
  certificateSection.hidden = false;
  claimCertificate?.setAttribute('aria-expanded', 'true');
  activateTab(glossaryTab, tabs, panels);
  setTimeout(() => {
    const nameInput = document.getElementById('student-name-input');
    if (!nameInput) return;
    nameInput.scrollIntoView({ block: 'center' });
    nameInput.focus({ preventScroll: true });
    announce('Certificate section opened. Enter your name to personalize it.');
  }, 180);
}
