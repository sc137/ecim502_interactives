/* Prompt Examples: local prompt builders, accessibility, exploration, and certificate. */
document.addEventListener('DOMContentLoaded', () => {
  const $ = (selector) => document.querySelector(selector);
  const tabs = [...document.querySelectorAll('.tab-button')];
  const panels = [...document.querySelectorAll('.tab-panel')];
  const examples = [...document.querySelectorAll('.example-panel')];
  const prefix = 'prompt_examples_';
  const storage = {
    read(key, fallback) {
      try { return JSON.parse(localStorage.getItem(prefix + key)) ?? fallback; }
      catch { return fallback; }
    },
    write(key, value) {
      try { localStorage.setItem(prefix + key, JSON.stringify(value)); }
      catch { /* Practice remains available when browser storage is blocked. */ }
    }
  };
  const savedProgress = storage.read('explored_tabs', []);
  const explored = new Set(Array.isArray(savedProgress)
    ? savedProgress.filter(id => tabs.some(tab => tab.id === id)) : []);
  let activatedAt = Date.now();
  let completionTimer;
  let announcementTimer;

  function announce(message) {
    clearTimeout(announcementTimer);
    $('#aria-live-announcer').textContent = '';
    announcementTimer = setTimeout(() => { $('#aria-live-announcer').textContent = message; }, 100);
  }

  // Accessibility controls preserve the shared text presets and theme choices.
  const presets = [1, 1.18, 1.35];
  const presetButtons = ['#btn-font-normal', '#btn-font-large', '#btn-font-xlarge'].map($);
  function setScale(value, speak = true) {
    const scale = Number.isFinite(Number(value)) ? Math.min(1.4, Math.max(0.9, Number(value))) : 1;
    document.documentElement.style.setProperty('--font-scale', scale);
    $('#font-scaler-slider').value = scale;
    const label = `${Math.round(scale * 100)}%`;
    $('#font-size-indicator').textContent = label;
    $('#font-scaler-slider').setAttribute('aria-valuetext', `${Math.round(scale * 100)} percent`);
    presetButtons.forEach((button, i) => {
      const selected = Math.abs(scale - presets[i]) < 0.001;
      button.classList.toggle('active', selected);
      button.setAttribute('aria-pressed', String(selected));
    });
    storage.write('font_scale', scale);
    if (speak) announce(`Text size set to ${label}.`);
  }
  function setTheme(value, speak = true) {
    const theme = ['default', 'dark', 'high-contrast-light'].includes(value) ? value : 'default';
    document.documentElement.dataset.theme = theme;
    $('#theme-select').value = theme;
    storage.write('theme', theme);
    if (speak) announce(`Contrast theme changed to ${$('#theme-select').selectedOptions[0].textContent}.`);
  }
  presetButtons.forEach((button, i) => button.addEventListener('click', () => setScale(presets[i])));
  $('#font-scaler-slider').addEventListener('input', event => setScale(event.target.value));
  $('#theme-select').addEventListener('change', event => setTheme(event.target.value));
  setScale(storage.read('font_scale', 1), false);
  setTheme(storage.read('theme', 'default'), false);

  // Progress requires reaching the panel end; examples also require prompt review.
  function updateProgress() {
    tabs.forEach(tab => tab.classList.toggle('explored', explored.has(tab.id)));
    const percent = Math.round(explored.size / tabs.length * 100);
    $('#exploration-count').textContent = `${explored.size} of ${tabs.length} Tabs Explored`;
    $('#exploration-percent-badge').textContent = percent === 100 ? '100% Completed' : `${percent}%`;
    $('#btn-claim-cert').hidden = percent !== 100;
    if (percent !== 100) $('#certificate-section').hidden = true;
    storage.write('explored_tabs', [...explored]);
  }
  function checkCompletion() {
    const tab = $('.tab-button[aria-selected="true"]');
    if (explored.has(tab.id) || document.hidden || Date.now() - activatedAt < 1200) return;
    const panel = document.getElementById(tab.getAttribute('aria-controls'));
    const end = panel.querySelector('.end-marker').getBoundingClientRect();
    const reviewed = panel.querySelector('.reviewed');
    if (panel.id === 'panel-custom' && !$('#custom-goal').value.trim()) return;
    if (end.top >= 0 && end.bottom <= window.innerHeight && (!reviewed || reviewed.checked)) {
      explored.add(tab.id);
      updateProgress();
      announce(`Completed ${tab.textContent.replace('✅', '').replace('Explored', '').trim()}. Progress updated.`);
    }
  }
  function scheduleCompletion() {
    clearTimeout(completionTimer);
    completionTimer = setTimeout(checkCompletion, 1300);
  }
  function activateTab(tab, moveFocus = false) {
    tabs.forEach(item => {
      const selected = item === tab;
      item.setAttribute('aria-selected', String(selected));
      item.tabIndex = selected ? 0 : -1;
    });
    panels.forEach(panel => panel.classList.toggle('active', panel.id === tab.getAttribute('aria-controls')));
    activatedAt = Date.now();
    if (moveFocus) tab.focus({ preventScroll: true });
    tab.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'instant' });
    const panel = document.getElementById(tab.getAttribute('aria-controls'));
    // Measure the wrapping desktop navigation so enlarged text cannot cover a heading.
    const navOffset = getComputedStyle($('.main-nav')).position === 'sticky' ? $('.main-nav').offsetHeight + 16 : 16;
    panel.style.scrollMarginTop = `${navOffset}px`;
    panel.scrollIntoView({ block: 'start', behavior: 'instant' });
    announce(`Opened ${tab.textContent.replace('✅', '').replace('Explored', '').trim()}.`);
    scheduleCompletion();
  }
  tabs.forEach((tab, index) => {
    tab.addEventListener('click', () => activateTab(tab));
    tab.addEventListener('keydown', event => {
      let next;
      if (event.key === 'ArrowRight') next = (index + 1) % tabs.length;
      if (event.key === 'ArrowLeft') next = (index - 1 + tabs.length) % tabs.length;
      if (event.key === 'Home') next = 0;
      if (event.key === 'End') next = tabs.length - 1;
      if (next !== undefined) { event.preventDefault(); activateTab(tabs[next], true); }
    });
  });
  window.addEventListener('scroll', checkCompletion, { passive: true });
  window.addEventListener('resize', checkCompletion);
  $('#reset-progress').addEventListener('click', () => {
    explored.clear();
    examples.forEach(panel => { panel.querySelector('.reviewed').checked = false; });
    updateProgress();
    activateTab(tabs[0]);
    announce('Exploration reset. All completion badges and review checks cleared.');
  });

  // Share copy and review controls between the examples and the open-ended builder.
  examples.forEach(panel => {
    const output = panel.querySelector('.completed-prompt');
    const isCustom = panel.id === 'panel-custom';
    const base = panel.querySelector('.base-prompt')?.content.textContent.trim();
    const choices = [...panel.querySelectorAll('[data-preference]')];
    const choiceSummaries = choices.map(select => {
      const summary = document.createElement('p');
      summary.className = 'choice-summary';
      summary.setAttribute('aria-hidden', 'true');
      summary.textContent = `Selected: ${select.value}`;
      select.after(summary);
      return summary;
    });
    const status = panel.querySelector('.copy-status');
    const copyButton = panel.querySelector('.copy-prompt');
    const reviewed = panel.querySelector('.reviewed');
    let revision = 0;
    let draftAnnouncementTimer;
    reviewed.checked = explored.has(panel.getAttribute('aria-labelledby'));
    function hasPrompt() { return !isCustom || Boolean($('#custom-goal').value.trim()); }
    function renderCustomPrompt() {
      const value = id => $(`#custom-${id}`).value.trim();
      const sections = [
        ['Goal', value('goal')], ['Background and audience', value('context')],
        ['Limits', value('limits')],
        ['Output format', `${value('format')}. Use plain language, define unfamiliar terms, and include a practical example.`],
        ['Example pattern to follow', value('pattern')], ['Verification', value('verify')]
      ];
      output.textContent = hasPrompt()
        ? sections.filter(([, text]) => text).map(([title, text]) => `${title}:\n${text}`).join('\n\n')
        : 'Enter your question in step 1 to build your completed prompt.';
      copyButton.disabled = !hasPrompt();
      panel.querySelector('.select-prompt').disabled = !hasPrompt();
      reviewed.disabled = !hasPrompt();
      $('#custom-review-hint').textContent = hasPrompt()
        ? 'Review the updated prompt, then check the box to complete this activity.'
        : 'Enter a question in step 1 to enable the review box.';
    }
    function updatePrompt() {
      if (isCustom) {
        renderCustomPrompt();
        if (explored.delete('tab-custom')) updateProgress();
      } else {
        output.textContent = `${base}\n\nAdditional practice preferences:\n${choices.map(select => '- ' + select.value).join('\n')}`;
      }
      choiceSummaries.forEach((summary, index) => { summary.textContent = `Selected: ${choices[index].value}`; });
      revision += 1;
      status.textContent = '';
      reviewed.checked = false;
      clearTimeout(draftAnnouncementTimer);
      draftAnnouncementTimer = setTimeout(() => {
        panel.querySelector('.builder-status').textContent = isCustom
          ? (hasPrompt() ? 'Completed prompt updated. Review it, then copy it.' : 'Enter your question in step 1 to get started.')
          : 'Completed prompt updated. Review the preferences at the end, then copy it.';
      }, 400);
    }
    function selectPrompt() {
      output.focus({ preventScroll: true });
      const range = document.createRange();
      range.selectNodeContents(output);
      const selection = window.getSelection();
      selection.removeAllRanges();
      selection.addRange(range);
    }
    choices.forEach(select => select.addEventListener('change', updatePrompt));
    if (isCustom) {
      panel.querySelectorAll('[data-custom]').forEach(field => field.addEventListener('input', updatePrompt));
      renderCustomPrompt();
      reviewed.checked = false;
    }
    panel.querySelector('.reset-example').addEventListener('click', () => {
      if (isCustom) {
        panel.querySelectorAll('textarea').forEach(field => { field.value = field.defaultValue; });
        $('#custom-format').selectedIndex = 0;
        updatePrompt();
        clearTimeout(draftAnnouncementTimer);
        panel.querySelector('.builder-status').textContent = 'Draft cleared. The suggested format and verification instructions have been restored.';
        return;
      }
      choices.forEach(select => { select.selectedIndex = 0; });
      updatePrompt();
      clearTimeout(draftAnnouncementTimer);
      panel.querySelector('.builder-status').textContent = 'Example choices restored. The completed prompt is ready to copy.';
    });
    panel.querySelector('.select-prompt').addEventListener('click', () => {
      selectPrompt();
      status.textContent = 'Prompt selected. Copy with Command + C on a Mac or Ctrl + C on Windows. On a phone or tablet, choose Copy from the selection menu.';
    });
    copyButton.addEventListener('click', async () => {
      if (!hasPrompt()) return;
      const copiedRevision = revision;
      const text = output.textContent;
      copyButton.disabled = true;
      try {
        if (!navigator.clipboard?.writeText) throw new Error('Clipboard unavailable');
        await navigator.clipboard.writeText(text);
        status.textContent = revision === copiedRevision
          ? 'Copied! Open a service below and paste into its message box.'
          : 'The choices changed while copying. Copy again to use the updated prompt.';
      } catch {
        if (!panel.classList.contains('active')) return;
        selectPrompt();
        status.textContent = 'Automatic copying is unavailable. The prompt is selected: press Command + C on a Mac or Ctrl + C on Windows. On a phone or tablet, choose Copy from the selection menu.';
      } finally {
        copyButton.disabled = !hasPrompt();
      }
    });
    reviewed.addEventListener('change', () => {
      checkCompletion();
      scheduleCompletion();
    });
  });

  // The certificate remains hidden until the complete sequence has been explored.
  const nameInput = $('#student-name-input');
  const savedName = storage.read('student_name', '');
  nameInput.value = typeof savedName === 'string' ? savedName.slice(0, 80) : '';
  function updateName() {
    const name = nameInput.value.trim().slice(0, 80);
    $('#cert-display-name').textContent = name || 'Emeritus Student';
    storage.write('student_name', name);
  }
  nameInput.addEventListener('input', updateName);
  updateName();
  $('#btn-claim-cert').addEventListener('click', () => {
    if (explored.size !== tabs.length) return;
    $('#cert-display-date').textContent = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    $('#certificate-section').hidden = false;
    $('#certificate-section').scrollIntoView({ block: 'start', behavior: 'instant' });
    nameInput.focus({ preventScroll: true });
    announce('Certificate ready. Enter your name, then print or save as PDF.');
  });
  $('#print-certificate').addEventListener('click', () => {
    if (explored.size === tabs.length && !$('#certificate-section').hidden) window.print();
  });
  updateProgress();
  scheduleCompletion();
});
