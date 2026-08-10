document.addEventListener('DOMContentLoaded', () => {
  initAccessibilitySettings();
  initTabs();
  initTimeline();
  initEngineActivity();
  initDeviceInstructions();
  initAssignmentCheck();
  initGlossary();
  initCertificate();
});

const storageKeys = {
  fontScale: 'firefox_font_scale',
  theme: 'firefox_theme',
  exploredTabs: 'firefox_explored_tabs',
  learnerName: 'firefox_learner_name'
};

let announcerTimer;
let activeTabActivatedAt = Date.now();
let exploredTabIds = [];
let assignmentQuizPassed = false;
let selectedDevice = '';
let selectedBrowserCardId = '';

function readStorage(key) {
  try {
    return localStorage.getItem(key);
  } catch (error) {
    return null;
  }
}

function writeStorage(key, value) {
  try {
    localStorage.setItem(key, value);
  } catch (error) {
    // The tool remains fully usable when browser storage is unavailable.
  }
}

function announce(message) {
  const announcer = document.getElementById('aria-live-announcer');
  if (!announcer) return;

  clearTimeout(announcerTimer);
  announcer.textContent = '';
  announcerTimer = setTimeout(() => {
    announcer.textContent = message;
  }, 80);
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

  slider?.addEventListener('input', event => {
    setFontScale(Number(event.target.value));
  });

  presetButtons.forEach(button => {
    button.addEventListener('click', () => {
      setFontScale(Number(button.dataset.fontScale));
    });
  });

  themeSelect?.addEventListener('change', event => {
    setTheme(event.target.value);
  });

  const savedScale = Number(readStorage(storageKeys.fontScale));
  setFontScale(savedScale >= 0.9 && savedScale <= 1.4 ? savedScale : 1, false);

  const savedTheme = readStorage(storageKeys.theme);
  const validThemes = ['default', 'dark', 'high-contrast-light'];
  setTheme(validThemes.includes(savedTheme) ? savedTheme : 'default', false);
}

function setFontScale(scale, shouldAnnounce = true) {
  const normalizedScale = Math.min(1.4, Math.max(0.9, Number(scale) || 1));
  const percent = Math.round(normalizedScale * 100);
  const slider = document.getElementById('font-scaler-slider');
  const indicator = document.getElementById('font-size-indicator');
  const presetButtons = document.querySelectorAll('[data-font-scale]');

  document.documentElement.style.setProperty('--font-scale', normalizedScale);
  if (slider) {
    slider.value = String(normalizedScale);
    slider.setAttribute('aria-valuetext', `${percent} percent`);
  }
  if (indicator) indicator.textContent = `${percent}%`;

  let activeScale = 1.35;
  if (normalizedScale <= 1.05) activeScale = 1;
  else if (normalizedScale <= 1.25) activeScale = 1.18;

  presetButtons.forEach(button => {
    const isActive = Number(button.dataset.fontScale) === activeScale;
    button.classList.toggle('active', isActive);
    button.setAttribute('aria-pressed', String(isActive));
  });

  writeStorage(storageKeys.fontScale, String(normalizedScale));
  if (shouldAnnounce) announce(`Text size set to ${percent} percent.`);
}

function setTheme(theme, shouldAnnounce = true) {
  const themeSelect = document.getElementById('theme-select');
  const labels = {
    default: 'Default Light',
    dark: 'High Contrast Dark',
    'high-contrast-light': 'High Contrast Black and White'
  };

  if (theme === 'default') document.documentElement.removeAttribute('data-theme');
  else document.documentElement.setAttribute('data-theme', theme);

  if (themeSelect) themeSelect.value = theme;
  writeStorage(storageKeys.theme, theme);
  if (shouldAnnounce) announce(`Contrast theme changed to ${labels[theme]}.`);
}

/* Tabs and progress */
function initTabs() {
  const tabs = Array.from(document.querySelectorAll('.tab-button'));
  const panels = Array.from(document.querySelectorAll('.tab-panel'));
  const saved = readStorage(storageKeys.exploredTabs);

  try {
    exploredTabIds = saved ? JSON.parse(saved) : [];
  } catch (error) {
    exploredTabIds = [];
  }

  const validTabIds = new Set(tabs.map(tab => tab.id));
  exploredTabIds = Array.isArray(exploredTabIds)
    ? Array.from(new Set(exploredTabIds)).filter(id => validTabIds.has(id))
    : [];

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
    const isSelected = tab === selectedTab;
    tab.setAttribute('aria-selected', String(isSelected));
    tab.setAttribute('tabindex', isSelected ? '0' : '-1');
  });

  panels.forEach(panel => panel.classList.remove('active'));
  const panel = document.getElementById(selectedTab.getAttribute('aria-controls'));
  if (!panel) return;

  panel.classList.add('active');
  activeTabActivatedAt = Date.now();
  selectedTab.scrollIntoView({ block: 'nearest', inline: 'center' });
  panel.scrollIntoView({ block: 'start' });

  const title = cleanTabTitle(selectedTab);
  const directions = getTabDirections(selectedTab.id);
  announce(`Switched to ${title}. ${directions}`);
  setTimeout(checkReadingCompletion, 1200);
}

function cleanTabTitle(tab) {
  return tab.textContent.replace('✅', '').replace('Explored', '').replace(/\s+/g, ' ').trim();
}

function getTabDirections(tabId) {
  if (tabId === 'tab-families') return 'Complete the matching activity to earn this section checkmark.';
  if (tabId === 'tab-install') return 'Choose a device and complete the review checklist.';
  if (tabId === 'tab-assignment') return 'Complete the assignment checklist and answer all questions correctly.';
  return 'Read to the end of the section to earn its checkmark.';
}

function checkReadingCompletion() {
  const activeTab = document.querySelector('.tab-button[aria-selected="true"]');
  if (!activeTab || exploredTabIds.includes(activeTab.id)) return;

  const readingTabs = new Set(['tab-basics', 'tab-history', 'tab-glossary']);
  if (!readingTabs.has(activeTab.id)) return;

  const panel = document.getElementById(activeTab.getAttribute('aria-controls'));
  if (!panel) return;

  const hasViewedLongEnough = Date.now() - activeTabActivatedAt >= 1000;
  const hasReachedEnd = panel.getBoundingClientRect().bottom <= window.innerHeight - 24;
  if (hasViewedLongEnough && hasReachedEnd) markTabComplete(activeTab.id);
}

function markTabComplete(tabId) {
  if (exploredTabIds.includes(tabId)) return;
  const tab = document.getElementById(tabId);
  if (!tab) return;

  exploredTabIds.push(tabId);
  saveProgress();
  updateProgressUI();
  announce(`${cleanTabTitle(tab)} completed. Progress updated.`);
}

function saveProgress() {
  writeStorage(storageKeys.exploredTabs, JSON.stringify(exploredTabIds));
}

function updateProgressUI() {
  const tabs = Array.from(document.querySelectorAll('.tab-button'));
  const count = exploredTabIds.length;
  const percent = tabs.length ? Math.round((count / tabs.length) * 100) : 0;
  const countLabel = document.getElementById('exploration-count');
  const percentBadge = document.getElementById('exploration-percent-badge');
  const completionSummary = document.getElementById('completion-summary');
  const claimCertificate = document.getElementById('claim-certificate');
  const certificateSection = document.getElementById('certificate-section');

  tabs.forEach(tab => tab.classList.toggle('explored', exploredTabIds.includes(tab.id)));
  if (countLabel) countLabel.textContent = `${count} of ${tabs.length} Tabs Explored`;
  if (percentBadge) {
    percentBadge.textContent = percent === 100 ? '100% Completed' : `${percent}%`;
    percentBadge.style.backgroundColor = percent === 100 ? '#155724' : '#176b2c';
  }

  if (completionSummary) completionSummary.hidden = percent !== 100;
  if (claimCertificate) claimCertificate.hidden = percent !== 100;
  if (certificateSection) certificateSection.hidden = percent !== 100;
}

function resetProgress() {
  exploredTabIds = [];
  assignmentQuizPassed = false;
  selectedDevice = '';
  saveProgress();

  document.querySelectorAll('.install-review-check, .assignment-check').forEach(input => {
    input.checked = false;
  });
  document.querySelectorAll('#assignment-quiz input[type="radio"]').forEach(input => {
    input.checked = false;
  });
  resetEngineMatches(false);
  document.querySelectorAll('.device-button').forEach(button => {
    button.classList.remove('active');
    button.setAttribute('aria-pressed', 'false');
  });
  document.querySelectorAll('[data-device-panel]').forEach(panel => {
    panel.hidden = true;
  });

  const installReview = document.getElementById('install-review');
  const devicePrompt = document.getElementById('device-prompt');
  if (installReview) installReview.hidden = true;
  if (devicePrompt) devicePrompt.hidden = false;

  clearFeedback(document.getElementById('engine-match-feedback'));
  clearFeedback(document.getElementById('install-review-feedback'));
  clearFeedback(document.getElementById('assignment-feedback'));
  updateProgressUI();

  const tabs = Array.from(document.querySelectorAll('.tab-button'));
  const panels = Array.from(document.querySelectorAll('.tab-panel'));
  const firstTab = document.getElementById('tab-basics');
  if (firstTab) activateTab(firstTab, tabs, panels);
  announce('Exploration progress and learning checks were reset.');
}

/* Browser history timeline */
const timelineEvents = [
  {
    year: '1990',
    title: 'WorldWideWeb, the first browser-editor',
    description: 'Tim Berners-Lee wrote the first web browser and editor at CERN on a NeXT computer. It was later renamed Nexus to avoid confusion with the World Wide Web itself.',
    importance: 'The earliest browser could both view and edit web documents.'
  },
  {
    year: '1991',
    title: 'Web software reaches a wider audience',
    description: 'The line-mode browser was released first to a limited audience and then on central CERN machines. Web project files were also made available over the internet.',
    importance: 'The web began moving beyond its original development computer and CERN team.'
  },
  {
    year: '1993',
    title: 'Mosaic helps popularize graphical browsing',
    description: 'NCSA released Mosaic for common computer platforms. Its graphical approach made the growing web easier for many more people to explore.',
    importance: 'A broadly available graphical browser helped the web reach a mainstream audience.'
  },
  {
    year: '1994–1995',
    title: 'Netscape enters the early commercial web',
    description: 'Marc Andreessen and colleagues formed Mosaic Communications, later renamed Netscape. Netscape Navigator became a major early commercial browser.',
    importance: 'Browsers became central products in the rapidly expanding public web.'
  },
  {
    year: 'Late 1990s',
    title: 'Internet Explorer becomes dominant',
    description: 'Microsoft bundled Internet Explorer with Windows and competed directly with Netscape during the period often called the browser wars.',
    importance: 'Browser distribution and operating-system integration shaped which browser many people used.'
  },
  {
    year: '2003–2004',
    title: 'Safari and Firefox expand browser choice',
    description: 'Apple released Safari in 2003. Mozilla released Firefox 1.0 in November 2004, offering a new independent, open-source browser choice.',
    importance: 'The period reestablished meaningful competition among major browsers.'
  },
  {
    year: '2008',
    title: 'Google Chrome launches',
    description: 'Google released Chrome with a focus on speed, security, and a multi-process design. Chrome initially used WebKit as its rendering engine.',
    importance: 'Chrome grew into the foundation for today’s large Chromium browser family.'
  },
  {
    year: '2013',
    title: 'Chromium introduces Blink',
    description: 'The Chromium project announced Blink, a rendering engine based on WebKit. The project cited growing architectural complexity as a reason for the change.',
    importance: 'Blink and WebKit became separate engines with related origins.'
  },
  {
    year: '2020',
    title: 'The Chromium-based Microsoft Edge becomes available',
    description: 'Microsoft released the stable version of its rebuilt Edge browser on January 15, 2020. The new Edge was based on the Chromium open-source project.',
    importance: 'Another major browser joined the Chromium family, increasing Blink’s reach.'
  }
];

function initTimeline() {
  const buttons = Array.from(document.querySelectorAll('.timeline-button'));
  buttons.forEach((button, index) => {
    button.addEventListener('click', () => showTimelineEvent(index));
    button.addEventListener('keydown', event => {
      if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) return;
      event.preventDefault();
      const direction = ['ArrowRight', 'ArrowDown'].includes(event.key) ? 1 : -1;
      const nextIndex = (index + direction + buttons.length) % buttons.length;
      buttons[nextIndex].focus();
      showTimelineEvent(nextIndex);
    });
  });
}

function showTimelineEvent(index) {
  const event = timelineEvents[index];
  const buttons = document.querySelectorAll('.timeline-button');
  if (!event) return;

  buttons.forEach((button, buttonIndex) => {
    const isActive = buttonIndex === index;
    button.classList.toggle('active', isActive);
    button.setAttribute('aria-pressed', String(isActive));
  });

  document.getElementById('timeline-year').textContent = event.year;
  document.getElementById('timeline-title').textContent = event.title;
  document.getElementById('timeline-description').textContent = event.description;
  document.getElementById('timeline-importance').textContent = `Why it matters: ${event.importance}`;
  announce(`${event.year}: ${event.title}.`);
}

/* Engine matching */
function initEngineActivity() {
  const cards = document.querySelectorAll('.browser-card');
  const targets = document.querySelectorAll('.engine-target');
  const placementButtons = document.querySelectorAll('.engine-drop-button');

  cards.forEach(card => {
    card.addEventListener('click', () => selectBrowserCard(card.dataset.browser));
    card.addEventListener('dragstart', event => {
      selectedBrowserCardId = card.dataset.browser;
      updateBrowserCardSelection();
      card.classList.add('dragging');
      event.dataTransfer.effectAllowed = 'move';
      event.dataTransfer.setData('text/plain', card.dataset.browser);
    });
    card.addEventListener('dragend', () => {
      card.classList.remove('dragging');
      targets.forEach(target => target.classList.remove('drag-over'));
    });
  });

  targets.forEach(target => {
    target.addEventListener('dragover', event => {
      event.preventDefault();
      event.dataTransfer.dropEffect = 'move';
      target.classList.add('drag-over');
    });
    target.addEventListener('dragleave', event => {
      if (!target.contains(event.relatedTarget)) target.classList.remove('drag-over');
    });
    target.addEventListener('drop', event => {
      event.preventDefault();
      target.classList.remove('drag-over');
      const browserId = event.dataTransfer.getData('text/plain') || selectedBrowserCardId;
      placeBrowserCard(browserId, target.dataset.engineTarget);
    });
  });

  placementButtons.forEach(button => {
    button.addEventListener('click', () => {
      if (!selectedBrowserCardId) {
        announce(`Select a browser card before placing it with ${button.dataset.engine}.`);
        return;
      }
      placeBrowserCard(selectedBrowserCardId, button.dataset.engine);
    });
  });

  document.getElementById('reset-engine-matches')?.addEventListener('click', () => resetEngineMatches());
  document.getElementById('engine-match-form')?.addEventListener('submit', gradeEngineMatches);
}

function selectBrowserCard(browserId) {
  selectedBrowserCardId = selectedBrowserCardId === browserId ? '' : browserId;
  updateBrowserCardSelection();

  if (!selectedBrowserCardId) {
    announce('Browser card selection cleared.');
    return;
  }

  const card = document.querySelector(`[data-browser="${selectedBrowserCardId}"]`);
  announce(`${card?.dataset.label || 'Browser card'} selected. Choose an engine and activate Place Here.`);
}

function updateBrowserCardSelection() {
  document.querySelectorAll('.browser-card').forEach(card => {
    const isSelected = card.dataset.browser === selectedBrowserCardId;
    card.setAttribute('aria-pressed', String(isSelected));
  });
}

function placeBrowserCard(browserId, engine) {
  const card = document.querySelector(`[data-browser="${browserId}"]`);
  const destination = document.querySelector(`[data-engine-list="${engine}"]`);
  if (!card || !destination) return;

  destination.appendChild(card);
  card.dataset.assignment = engine;
  card.setAttribute('aria-label', `${card.dataset.label}. Currently matched with ${engine}. Activate to select and move.`);
  selectedBrowserCardId = '';
  updateBrowserCardSelection();
  clearFeedback(document.getElementById('engine-match-feedback'));
  announce(`${card.dataset.label} placed with ${engine}.`);
}

function resetEngineMatches(shouldAnnounce = true) {
  const pool = document.getElementById('browser-card-pool');
  if (!pool) return;

  document.querySelectorAll('.browser-card').forEach(card => {
    pool.appendChild(card);
    delete card.dataset.assignment;
    card.removeAttribute('aria-label');
    card.classList.remove('dragging');
    card.setAttribute('aria-pressed', 'false');
  });
  document.querySelectorAll('.engine-target').forEach(target => target.classList.remove('drag-over'));
  selectedBrowserCardId = '';
  clearFeedback(document.getElementById('engine-match-feedback'));
  if (shouldAnnounce) announce('Browser matches reset. All cards returned to the browser card area.');
}

function gradeEngineMatches(event) {
  event.preventDefault();
  const cards = Array.from(document.querySelectorAll('.browser-card'));
  const feedback = document.getElementById('engine-match-feedback');
  const unmatched = cards.filter(card => !card.dataset.assignment);
  const incorrect = cards.filter(card => card.dataset.assignment && card.dataset.assignment !== card.dataset.answer);

  if (unmatched.length) {
    setFeedback(feedback, `Review: Place all four browser cards before checking. ${unmatched.length} ${unmatched.length === 1 ? 'card remains' : 'cards remain'}.`, 'review');
    announce('Place every browser card before checking your matches.');
    return;
  }

  if (incorrect.length) {
    setFeedback(feedback, 'Review: At least one match needs another look. Remember the iPhone and iPad exception.', 'review');
    announce('At least one engine match needs another look.');
    return;
  }

  setFeedback(feedback, 'Correct: Chrome uses Blink, Safari uses WebKit, Firefox desktop and Android use Gecko, and Firefox on iPhone and iPad uses WKWebKit.', 'correct');
  markTabComplete('tab-families');
}

/* Device-specific installation */
function initDeviceInstructions() {
  const buttons = document.querySelectorAll('.device-button');
  const reviewChecks = document.querySelectorAll('.install-review-check');

  buttons.forEach(button => {
    button.addEventListener('click', () => selectDevice(button.dataset.device));
  });

  reviewChecks.forEach(check => check.addEventListener('change', updateInstallReview));
}

function selectDevice(device) {
  selectedDevice = device;
  const buttons = document.querySelectorAll('.device-button');
  const panels = document.querySelectorAll('[data-device-panel]');
  const review = document.getElementById('install-review');
  const prompt = document.getElementById('device-prompt');

  buttons.forEach(button => {
    const isActive = button.dataset.device === device;
    button.classList.toggle('active', isActive);
    button.setAttribute('aria-pressed', String(isActive));
  });
  panels.forEach(panel => {
    panel.hidden = panel.dataset.devicePanel !== device;
  });
  document.querySelectorAll('.install-review-check').forEach(check => {
    check.checked = false;
  });

  if (review) review.hidden = false;
  if (prompt) prompt.hidden = true;
  clearFeedback(document.getElementById('install-review-feedback'));

  const selectedPanel = document.querySelector(`[data-device-panel="${device}"]`);
  const title = selectedPanel?.querySelector('h3')?.textContent || 'Device instructions';
  announce(`${title} displayed. Review the instructions and confirmation checklist.`);
}

function updateInstallReview() {
  const checks = Array.from(document.querySelectorAll('.install-review-check'));
  const checkedCount = checks.filter(check => check.checked).length;
  const feedback = document.getElementById('install-review-feedback');

  if (!selectedDevice) return;
  if (checkedCount === checks.length) {
    setFeedback(feedback, 'Completed: You reviewed the requirements, official source, and instructions for your device.', 'correct');
    markTabComplete('tab-install');
  } else {
    setFeedback(feedback, `Review progress: ${checkedCount} of ${checks.length} confirmations completed.`, 'review');
  }
}

/* Assignment readiness and quiz */
function initAssignmentCheck() {
  document.querySelectorAll('.assignment-check').forEach(check => {
    check.addEventListener('change', updateAssignmentCompletion);
  });

  document.getElementById('assignment-quiz')?.addEventListener('submit', event => {
    event.preventDefault();
    gradeAssignmentQuiz();
  });
}

function gradeAssignmentQuiz() {
  const form = document.getElementById('assignment-quiz');
  const feedback = document.getElementById('assignment-feedback');
  if (!form) return;

  const data = new FormData(form);
  const answers = [data.get('question-1'), data.get('question-2'), data.get('question-3')];
  const correctAnswers = ['official', 'site', 'exception'];

  if (answers.some(answer => answer === null)) {
    assignmentQuizPassed = false;
    setFeedback(feedback, 'Review: Answer all three questions before checking your work.', 'review');
    announce('Answer all three questions before checking your work.');
    return;
  }

  const correctCount = answers.filter((answer, index) => answer === correctAnswers[index]).length;
  assignmentQuizPassed = correctCount === correctAnswers.length;

  if (assignmentQuizPassed) {
    setFeedback(feedback, 'Correct: You identified the official download source, the privacy-safe screenshot, and the Firefox iOS engine exception.', 'correct');
  } else {
    setFeedback(feedback, `Review: ${correctCount} of 3 answers are correct. Revisit the installation, screenshot, and browser-family guidance, then try again.`, 'review');
  }

  updateAssignmentCompletion();
}

function updateAssignmentCompletion() {
  const checks = Array.from(document.querySelectorAll('.assignment-check'));
  const checklistComplete = checks.length > 0 && checks.every(check => check.checked);

  if (checklistComplete && assignmentQuizPassed) {
    markTabComplete('tab-assignment');
  }
}

/* Completion certificate */
function initCertificate() {
  const nameInput = document.getElementById('student-name-input');
  const dateDisplay = document.getElementById('cert-display-date');
  const savedName = readStorage(storageKeys.learnerName) || '';

  if (dateDisplay) {
    dateDisplay.textContent = new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }

  if (nameInput) {
    nameInput.value = savedName;
    updateCertificateName(savedName, false);
    nameInput.addEventListener('input', event => updateCertificateName(event.target.value));
  }

  document.getElementById('claim-certificate')?.addEventListener('click', openCertificateSection);
  document.getElementById('print-certificate')?.addEventListener('click', printCertificate);
}

function updateCertificateName(name, shouldAnnounce = false) {
  const cleanName = name.trim();
  const display = document.getElementById('cert-display-name');
  if (display) display.textContent = cleanName || 'Emeritus Student';
  writeStorage(storageKeys.learnerName, cleanName);
  if (shouldAnnounce) announce('Certificate name updated.');
}

function openCertificateSection() {
  const tabs = Array.from(document.querySelectorAll('.tab-button'));
  const panels = Array.from(document.querySelectorAll('.tab-panel'));
  const assignmentTab = document.getElementById('tab-assignment');
  if (!assignmentTab) return;

  activateTab(assignmentTab, tabs, panels);
  setTimeout(() => {
    const heading = document.getElementById('certificate-heading');
    if (!heading) return;
    heading.setAttribute('tabindex', '-1');
    heading.scrollIntoView({ block: 'start' });
    heading.focus({ preventScroll: true });
    announce('Certificate section opened. Enter your name to personalize it.');
  }, 180);
}

function printCertificate() {
  announce('Opening the print dialog for the completion certificate.');
  window.print();
}

/* Glossary */
const glossaryTerms = [
  { term: 'Address bar', definition: 'The field near the top of a browser where you can enter a web address or search.' },
  { term: 'Blink', definition: 'The rendering engine used by Chromium-based browsers such as Chrome and the desktop version of Edge.' },
  { term: 'Bookmark', definition: 'A saved link that makes it easier to return to a web page.' },
  { term: 'Browser', definition: 'An application that retrieves, interprets, and displays websites.' },
  { term: 'Chromium', definition: 'An open-source browser project used as the foundation for Chrome, Edge, Brave, Opera, Vivaldi, and other browsers.' },
  { term: 'Download', definition: 'A file copied from the internet to your device.' },
  { term: 'Gecko', definition: 'Mozilla’s rendering engine, used by Firefox on desktop computers and Android devices.' },
  { term: 'JavaScript engine', definition: 'The browser component that runs JavaScript instructions. Examples include V8, JavaScriptCore, and SpiderMonkey.' },
  { term: 'Mozilla account', definition: 'An account used to access Mozilla services, including Firefox Sync.' },
  { term: 'Rendering engine', definition: 'The browser component that interprets page structure and styles and turns them into the page you see.' },
  { term: 'Search engine', definition: 'A website or service that helps find web pages. It is not the same thing as a web browser.' },
  { term: 'SpiderMonkey', definition: 'The JavaScript and WebAssembly engine used by Mozilla Firefox.' },
  { term: 'Sync', definition: 'A Firefox feature that can securely synchronize selected bookmarks, passwords, history, and other data across signed-in devices.' },
  { term: 'Tab', definition: 'A browser workspace that holds one open web page inside a browser window.' },
  { term: 'V8', definition: 'The JavaScript engine used by Chromium-based browsers.' },
  { term: 'WebKit', definition: 'A web rendering engine used by Safari and Apple web technology.' },
  { term: 'WKWebKit', definition: 'Apple’s framework for displaying web content inside apps, including Firefox on iPhone and iPad.' }
];

function initGlossary() {
  const search = document.getElementById('glossary-search-input');
  renderGlossary(glossaryTerms);
  search?.addEventListener('input', event => {
    const query = event.target.value.trim().toLowerCase();
    const matches = glossaryTerms.filter(item =>
      item.term.toLowerCase().includes(query) || item.definition.toLowerCase().includes(query)
    );
    renderGlossary(matches);
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
