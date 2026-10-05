/* Fixed fictional examples only: no prompts or certificate names are persisted. */
document.addEventListener('DOMContentLoaded', () => {
  const prefix = 'ai_security_';
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
    panels.forEach(panel => panel.classList.toggle('active', panel.id === tab.getAttribute('aria-controls')));
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
  // Reading sections earn progress only when their closing discussion is visible after a viewing interval.
  const checkReading = () => {
    if (document.hidden || Date.now() - activatedAt < 4000) return;
    const marker = document.querySelector('.tab-panel.active [data-reading-end]');
    if (!marker) return;
    const rect = marker.getBoundingClientRect();
    if (rect.top >= 0 && rect.bottom <= window.innerHeight) complete('tab-' + marker.dataset.readingEnd);
  };
  window.addEventListener('scroll', checkReading, { passive: true });
  setInterval(checkReading, 1000);
  updateProgress();

  const feedback = (id, correct, message) => {
    const box = document.getElementById(id);
    box.textContent = (correct ? 'Correct. ' : 'Review. ') + message;
  };
  document.getElementById('pii-form').addEventListener('submit', event => {
    event.preventDefault();
    const choices = new FormData(event.currentTarget).getAll('detail');
    const correct = choices.length === 4 && ['name', 'id', 'unique', 'records'].every(value => choices.includes(value));
    feedback('pii-feedback', correct, correct ? 'Remove the identifiers, unique description, and private records. Keep the general study-session preference.' : 'Select the first four details. The 20-minute session preference alone does not identify a person. Remove the unique class description as well as the name.');
    if (correct) complete('tab-pii');
  });
  const prompts = {
    study: {
      risky: 'Upload a named student’s transcript, exam scores, and medical notes to generate a study plan.',
      safe: 'Create a general study plan for an adult learner reviewing introductory cybersecurity. Use 20-minute sessions and offer flexible pacing. Use a fictional example; do not ask for names, student IDs, grades, or medical details. Include a way to check understanding.'
    },
    email: {
      risky: 'Paste a private email thread with student names, addresses, and personal circumstances to write a reply.',
      safe: 'Draft a polite email asking an instructor for clarification about an assignment. Use [INSTRUCTOR], [ASSIGNMENT], and [DATE] placeholders. Do not ask for identifying details. Keep it under 120 words. I will fill in the placeholders outside this AI tool.'
    },
    scam: {
      risky: 'Upload an actual bank message, account details, or a family member’s voice recording and ask AI to certify it is genuine.',
      safe: 'Analyze this fictional message for scam warning signs: "Act now. Buy gift cards and send the codes to keep your account open." Explain the warning signs and suggest how to verify a request through a known official contact method. Do not claim you can confirm the sender’s identity or that a message is safe.'
    },
    health: {
      risky: 'Upload a medical record with a patient’s name, date of birth, insurance ID, and diagnosis.',
      safe: 'Create a general list of questions an adult could ask a healthcare professional about a newly prescribed medicine. Do not ask for medical records or identifying details. Do not diagnose or recommend changing treatment. Remind me to check medication information with a qualified professional.'
    },
    budget: {
      risky: 'Upload real bank statements containing account numbers, transactions, balances, and identifying details.',
      safe: 'Explain a basic monthly budget using entirely fictional income and expense amounts. Include categories for essentials, savings, and discretionary spending. Do not ask for bank statements, account numbers, or identifying details. State that this is an educational example rather than personalized financial advice.'
    }
  };
  const select = document.getElementById('prompt-choice');
  const showPrompt = () => {
    document.getElementById('risky-prompt').textContent = prompts[select.value].risky;
    document.getElementById('safe-prompt').textContent = prompts[select.value].safe;
    document.getElementById('copy-feedback').textContent = '';
  };
  select.addEventListener('change', showPrompt); showPrompt();
  document.getElementById('copy-prompt').addEventListener('click', async () => {
    const box = document.getElementById('copy-feedback');
    try {
      await navigator.clipboard.writeText(prompts[select.value].safe);
      box.textContent = 'Safer prompt copied. Review it before sending.';
    } catch {
      const range = document.createRange(); range.selectNodeContents(document.getElementById('safe-prompt'));
      const selection = window.getSelection(); selection.removeAllRanges(); selection.addRange(range);
      box.textContent = 'Automatic copying is unavailable. The safer prompt is selected; use your browser’s Copy command.';
    }
  });
  document.getElementById('verify-form').addEventListener('submit', event => {
    event.preventDefault(); const data = new FormData(event.currentTarget);
    const correct = data.get('injection') === 'stop' && data.get('scam') === 'verify';
    feedback('verify-feedback', correct, correct ? 'Keep contacts disconnected and reject the embedded request. Verify the caller using a number you already know.' : 'Answer both questions: reject the request to upload contacts, and independently call the relative using a known number. AI cannot guarantee either request is safe.');
    if (correct) complete('tab-verify');
  });
  document.getElementById('ready-form').addEventListener('submit', event => {
    event.preventDefault(); const data = new FormData(event.currentTarget);
    const correct = data.getAll('ready').length === 4 && data.get('final') === 'no';
    feedback('ready-feedback', correct, correct ? 'The checklist is complete. A confidentiality instruction does not replace removing private data or following policy.' : 'Check all four habits and choose No. Remove sensitive information before sending.');
    if (correct) complete('tab-ready');
  });
  document.getElementById('btn-claim-cert').addEventListener('click', () => {
    if (completed.size !== tabs.length) return;
    activate(document.getElementById('tab-ready'));
    certificate.scrollIntoView({ block: 'start' }); document.getElementById('cert-name').focus({ preventScroll: true });
  });
  document.getElementById('cert-display-date').textContent = new Intl.DateTimeFormat('en-US', { dateStyle: 'long' }).format(new Date());
  document.getElementById('cert-name').addEventListener('input', event => {
    document.getElementById('cert-display-name').textContent = event.target.value.trim() || 'Emeritus Student';
  });
  document.getElementById('print-cert').addEventListener('click', () => { if (completed.size === tabs.length) window.print(); });
  document.getElementById('reset-progress').addEventListener('click', () => {
    completed.clear();
    document.querySelectorAll('form').forEach(form => form.reset());
    document.querySelectorAll('.feedback').forEach(box => { box.textContent = ''; });
    document.getElementById('cert-name').value = '';
    document.getElementById('cert-display-name').textContent = 'Emeritus Student';
    activatedAt = Date.now(); updateProgress(); activate(tabs[0]);
    announce('Exploration and activity answers reset. Display preferences are retained.');
  });
});
