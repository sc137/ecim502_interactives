/* Only completion and display preferences are saved; lab settings and names stay on this page. */
document.addEventListener('DOMContentLoaded', () => {
  const prefix = 'drive_sharing_';
  const tabs = [...document.querySelectorAll('[role="tab"]')];
  const panels = [...document.querySelectorAll('[role="tabpanel"]')];
  const validIds = tabs.map(tab => tab.id);
  const read = key => { try { return localStorage.getItem(prefix + key); } catch { return null; } };
  const save = (key, value) => { try { localStorage.setItem(prefix + key, value); } catch { /* Practice still works when storage is unavailable. */ } };
  let completed;
  try { completed = JSON.parse(read('progress') || '[]'); } catch { completed = []; }
  completed = new Set(Array.isArray(completed) ? completed.filter(id => validIds.includes(id)) : []);
  let activatedAt = Date.now();
  const announce = message => { document.getElementById('aria-live-announcer').textContent = message; };
  const certificate = document.getElementById('certificate-section');
  const setScale = value => {
    const scale = Math.min(1.4, Math.max(0.9, Number(value) || 1));
    document.documentElement.style.setProperty('--font-scale', scale);
    document.getElementById('font-scaler-slider').value = scale;
    document.getElementById('font-scaler-slider').setAttribute('aria-valuetext', `${Math.round(scale * 100)} percent`);
    document.getElementById('font-size-indicator').textContent = `${Math.round(scale * 100)}%`;
    document.querySelectorAll('[data-scale]').forEach(button => {
      const selected = Math.abs(Number(button.dataset.scale) - scale) < 0.001;
      button.setAttribute('aria-pressed', String(selected));
      button.classList.toggle('active', selected);
    });
    save('font', String(scale));
  };
  const setTheme = value => {
    const theme = ['default', 'dark', 'high-contrast-light'].includes(value) ? value : 'default';
    document.documentElement.dataset.theme = theme;
    document.getElementById('theme-select').value = theme;
    save('theme', theme);
  };
  setScale(read('font'));
  setTheme(read('theme'));
  document.getElementById('font-scaler-slider').addEventListener('input', event => setScale(event.target.value));
  document.querySelectorAll('[data-scale]').forEach(button => button.addEventListener('click', () => setScale(button.dataset.scale)));
  document.getElementById('theme-select').addEventListener('change', event => setTheme(event.target.value));

  const updateProgress = () => {
    tabs.forEach(tab => {
      const badge = document.getElementById('check-' + tab.id);
      badge.hidden = !completed.has(tab.id);
      badge.style.display = completed.has(tab.id) ? 'inline-flex' : 'none';
    });
    document.getElementById('exploration-count').textContent = `${completed.size} of ${tabs.length} Tabs Explored`;
    document.getElementById('exploration-percent-badge').textContent = `${Math.round(completed.size / tabs.length * 100)}%`;
    const ready = completed.size === tabs.length;
    document.getElementById('btn-claim-cert').hidden = !ready;
    certificate.hidden = !ready;
    document.body.classList.toggle('certificate-ready', ready);
    save('progress', JSON.stringify([...completed]));
  };
  const complete = id => {
    if (completed.has(id)) return;
    completed.add(id);
    updateProgress();
    announce(`${document.getElementById(id).childNodes[0].textContent.trim()} completed. ${completed.size} of ${tabs.length} sections complete.`);
  };
  const activate = tab => {
    tabs.forEach(item => { item.setAttribute('aria-selected', String(item === tab)); item.tabIndex = item === tab ? 0 : -1; });
    panels.forEach(panel => {
      const selected = panel.id === tab.getAttribute('aria-controls');
      panel.classList.toggle('active', selected); panel.hidden = !selected;
    });
    activatedAt = Date.now();
    tab.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    if (window.matchMedia('(max-width: 768px)').matches) document.getElementById(tab.getAttribute('aria-controls')).scrollIntoView({ block: 'start' });
  };
  tabs.forEach((tab, index) => {
    tab.addEventListener('click', () => activate(tab));
    tab.addEventListener('keydown', event => {
      const targets = { ArrowRight: (index + 1) % tabs.length, ArrowLeft: (index + tabs.length - 1) % tabs.length, Home: 0, End: tabs.length - 1 };
      if (!(event.key in targets)) return;
      event.preventDefault();
      const next = tabs[targets[event.key]];
      activate(next); next.focus();
    });
  });
  // Completion requires reaching the end after a viewing interval, not just opening a tab.
  const checkReading = () => {
    if (document.hidden || Date.now() - activatedAt < 4000) return;
    const panel = document.querySelector('.tab-panel.active');
    const marker = panel.querySelector('[data-reading-end]');
    if (!marker) return;
    const rect = marker.getBoundingClientRect();
    if (rect.top < 0 || rect.bottom > window.innerHeight) return;
    complete('tab-' + marker.dataset.readingEnd);
  };
  window.addEventListener('scroll', checkReading, { passive: true });
  setInterval(checkReading, 1000);
  updateProgress();
  // Fictional sharing practice; no Google account or document data is requested.
  const labAccess = document.getElementById('lab-access');
  const labRole = document.getElementById('lab-role');
  let publicChecked = false;
  let restrictedChecked = false;
  const privacyCorrect = new Set();
  const updateLab = () => {
    const audience = { restricted: 'Only people who already have access can open this file. Copying its link does not grant access.', school: 'People in the school or organization may be able to open it, depending on administrator settings.', anyone: 'Anyone receiving or forwarded this link can open it.' };
    const role = { viewer: 'Viewer: read without editing.', commenter: 'Commenter: leave comments or suggestions.', editor: 'Editor: change the content; sharing abilities depend on settings.' };
    document.getElementById('lab-preview').textContent = audience[labAccess.value] + ' Selected link role: ' + role[labRole.value] + (labAccess.value === 'restricted' ? ' With Restricted, each added person keeps their separately assigned role.' : '');
    document.getElementById('lab-feedback').textContent = '';
  };
  [labAccess, labRole].forEach(select => select.addEventListener('change', updateLab));
  updateLab();
  document.getElementById('check-lab').addEventListener('click', () => {
    const feedback = document.getElementById('lab-feedback');
    if (!publicChecked) {
      if (labAccess.value !== 'anyone' || labRole.value !== 'viewer') {
        feedback.textContent = 'Review: for this low-risk class checklist, choose Anyone with the link and Viewer, then check again. Restricted needs individual access; Editor allows changes.';
        return;
      }
      publicChecked = true;
      feedback.textContent = 'Correct. Classmates can read the checklist by link without editing. Now change General access to Restricted and check again.';
    } else if (labAccess.value === 'restricted') {
      restrictedChecked = true;
      feedback.textContent = 'Correct. Public link access is closed. In a real file, also review directly added people and inherited folder access.';
      complete('tab-practice');
    } else {
      feedback.textContent = 'Next: change General access to Restricted and check again to practice closing public access.';
    }
    document.getElementById('lab-summary').textContent = `${Number(publicChecked) + Number(restrictedChecked)} of 2 lab tasks complete`;
  });
  document.querySelectorAll('[data-choice]').forEach(button => button.addEventListener('click', () => {
    const card = button.closest('[data-case]');
    const feedback = card.querySelector('.feedback');
    if (button.dataset.choice !== card.dataset.answer) {
      feedback.textContent = 'Review: ' + feedback.dataset.explanation + ' Try the other choice.';
      return;
    }
    feedback.textContent = 'Correct. ' + feedback.dataset.explanation;
    privacyCorrect.add(card.dataset.case);
    card.querySelectorAll('button').forEach(item => { item.disabled = true; });
    document.getElementById('privacy-summary').textContent = `${privacyCorrect.size} of 3 privacy choices complete`;
    if (privacyCorrect.size === 3) complete('tab-privacy');
  }));
  document.querySelectorAll('.assignment-check').forEach(input => input.addEventListener('change', () => {
    document.getElementById('assignment-summary').textContent = `${document.querySelectorAll('.assignment-check:checked').length} of 5 personal steps checked`;
  }));
  if (completed.has('tab-practice')) document.getElementById('lab-summary').textContent = 'Lab completed in a previous visit. You may practice again.';
  if (completed.has('tab-privacy')) document.getElementById('privacy-summary').textContent = 'Privacy choices completed in a previous visit. You may practice again.';

  const correctQuestions = new Set();
  const quizSummary = document.getElementById('quiz-summary');
  if (completed.has('tab-knowledge')) quizSummary.textContent = 'All 5 questions completed in a previous visit. You may practice again.';
  document.querySelectorAll('.knowledge-question').forEach(form => {
    form.addEventListener('submit', event => {
      event.preventDefault();
      const answer = new FormData(form).get('q' + form.dataset.question);
      const box = document.getElementById('feedback-q' + form.dataset.question);
      if (answer === null) {
        box.textContent = 'Choose an answer, then select Check answer. You can try as often as needed.';
        return;
      }
      if (answer !== form.dataset.answer) {
        box.textContent = 'Not quite. Correct answer: ' + box.dataset.explanation + ' Select that answer and check again.';
        return;
      }
      correctQuestions.add(form.dataset.question);
      box.textContent = 'Correct. ' + box.dataset.explanation;
      form.querySelector('fieldset').disabled = true;
      form.querySelector('button').disabled = true;
      quizSummary.textContent = `${correctQuestions.size} of 5 questions complete`;
      if (correctQuestions.size === 5) {
        complete('tab-knowledge');
        quizSummary.textContent = 'All 5 questions complete. Review any unfinished topic tabs to unlock your certificate.';
      }
    });
  });
  document.getElementById('btn-claim-cert').addEventListener('click', () => {
    if (completed.size !== tabs.length) return;
    activate(document.getElementById('tab-knowledge'));
    certificate.scrollIntoView({ block: 'start' });
    document.getElementById('cert-name').focus({ preventScroll: true });
  });
  document.getElementById('cert-display-date').textContent = new Intl.DateTimeFormat('en-US', { dateStyle: 'long' }).format(new Date());
  document.getElementById('cert-name').addEventListener('input', event => {
    document.getElementById('cert-display-name').textContent = event.target.value.trim() || 'Emeritus Student';
  });
  document.getElementById('print-cert').addEventListener('click', () => { if (completed.size === tabs.length) window.print(); });
  document.getElementById('reset-progress').addEventListener('click', () => {
    completed.clear(); correctQuestions.clear();
    document.querySelectorAll('form').forEach(form => {
      form.reset(); form.querySelector('fieldset').disabled = false; form.querySelector('button').disabled = false;
    });
    publicChecked = false; restrictedChecked = false; privacyCorrect.clear();
    labAccess.value = 'restricted'; labRole.value = 'viewer'; updateLab();
    document.querySelectorAll('.privacy-card button').forEach(button => { button.disabled = false; });
    document.querySelectorAll('.assignment-check').forEach(input => { input.checked = false; });
    document.getElementById('lab-summary').textContent = '0 of 2 lab tasks complete';
    document.getElementById('privacy-summary').textContent = '0 of 3 privacy choices complete';
    document.getElementById('assignment-summary').textContent = '0 of 5 personal steps checked';
    document.querySelectorAll('.feedback').forEach(box => { box.textContent = ''; });
    quizSummary.textContent = '0 of 5 questions complete';
    document.getElementById('cert-name').value = '';
    document.getElementById('cert-display-name').textContent = 'Emeritus Student';
    updateProgress(); activate(tabs[0]);
    announce('Exploration, selections, and knowledge answers reset. Display preferences are retained.');
  });
});
