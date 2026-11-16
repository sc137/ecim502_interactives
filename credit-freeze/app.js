/* Safe educational simulation. All learner state lives only in this page. */
document.addEventListener('DOMContentLoaded', () => {
  const $ = id => document.getElementById(id);
  const tabs = [...document.querySelectorAll('[role="tab"]')];
  const panels = [...document.querySelectorAll('[role="tabpanel"]')];
  const completed = new Set();
  const frozen = new Set();
  let active = 'basics';
  let activatedAt = Date.now();
  let thawStep = 0;
  let thawPracticed = false;
  let readingTimer;
  const announce = message => { $('aria-live-announcer').textContent = message; };

  function refreshProgress() {
    tabs.forEach(tab => tab.classList.toggle('explored', completed.has(tab.id)));
    $('exploration-count').textContent = `${completed.size} of ${tabs.length} Tabs Explored`;
    $('btn-claim-cert').hidden = completed.size !== tabs.length;
    if (completed.size !== tabs.length) $('certificate-section').hidden = true;
  }
  function complete(key) {
    if (completed.has(`tab-${key}`)) return;
    completed.add(`tab-${key}`);
    refreshProgress();
    announce('Section completed. Exploration progress updated.');
  }
  function checkReading() {
    if (active === 'quizzes' || document.hidden || Date.now() - activatedAt < 1200) return;
    if (active === 'freeze' && frozen.size < 3) return;
    if (active === 'thaw' && !thawPracticed) return;
    const rect = $(`panel-${active}`).getBoundingClientRect();
    if (rect.bottom <= innerHeight - 16 && rect.bottom > 0) complete(active);
  }
  function activate(index, focus = false) {
    active = tabs[index].id.slice(4);
    activatedAt = Date.now();
    tabs.forEach((tab, i) => {
      tab.setAttribute('aria-selected', String(i === index));
      tab.tabIndex = i === index ? 0 : -1;
      panels[i].hidden = i !== index;
      panels[i].classList.toggle('active', i === index);
    });
    if (focus) tabs[index].focus({ preventScroll: true });
    tabs[index].scrollIntoView({ block: 'nearest', inline: 'nearest' });
    panels[index].scrollIntoView({ block: 'start', behavior: 'instant' });
    clearTimeout(readingTimer);
    readingTimer = setTimeout(checkReading, 1300);
  }
  tabs.forEach((tab, index) => {
    tab.addEventListener('click', () => activate(index));
    tab.addEventListener('keydown', event => {
      const targets = { ArrowRight: (index + 1) % tabs.length, ArrowLeft: (index + tabs.length - 1) % tabs.length, Home: 0, End: tabs.length - 1 };
      if (event.key in targets) { event.preventDefault(); activate(targets[event.key], true); }
    });
  });
  window.addEventListener('scroll', checkReading, { passive: true });
  window.addEventListener('resize', checkReading);
  readingTimer = setTimeout(checkReading, 1300);

  function setFontScale(value) {
    const scale = Math.max(.9, Math.min(1.4, Number(value) || 1));
    document.documentElement.style.setProperty('--font-scale', scale);
    $('font-scaler-slider').value = scale;
    $('font-scaler-slider').setAttribute('aria-valuetext', `${Math.round(scale * 100)} percent`);
    $('font-size-indicator').textContent = `${Math.round(scale * 100)}%`;
    [1, 1.18, 1.35].forEach((preset, index) => {
      const button = $(['btn-font-normal', 'btn-font-large', 'btn-font-xlarge'][index]);
      const selected = Math.abs(scale - preset) < .001;
      button.setAttribute('aria-pressed', String(selected));
      button.classList.toggle('active', selected);
    });
    announce(`Text size ${Math.round(scale * 100)} percent.`);
  }
  [1, 1.18, 1.35].forEach((scale, index) => $(['btn-font-normal', 'btn-font-large', 'btn-font-xlarge'][index]).addEventListener('click', () => setFontScale(scale)));
  $('font-scaler-slider').addEventListener('input', event => setFontScale(event.target.value));
  $('theme-select').addEventListener('change', event => {
    document.documentElement.dataset.theme = event.target.value;
    announce(`Contrast theme: ${event.target.selectedOptions[0].textContent}.`);
  });
  setFontScale(1);

  document.querySelectorAll('[data-freeze]').forEach(button => button.addEventListener('click', () => {
    frozen.add(button.dataset.freeze);
    $(`status-${button.dataset.freeze}`).textContent = 'Practice status: frozen (simulation only)';
    button.disabled = true;
    $('freeze-feedback').textContent = `${frozen.size} of 3 fictional reports frozen.${frozen.size === 3 ? ' Each required a separate request. Continue to the end of the section.' : ' Contact the remaining fictional bureaus separately.'}`;
    checkReading();
  }));
  const thawStates = [
    ['Before Tuesday: Equifax frozen; Experian frozen; TransUnion frozen.', 'Schedule Tuesday-only Experian lift'],
    ['Scheduled: all three remain frozen until Tuesday. Experian lift has a Tuesday end date.', 'Advance to Tuesday credit check'],
    ['Tuesday: Experian temporarily lifted; Equifax and TransUnion remain frozen. The lender can check Experian.', 'Advance past end date and verify'],
    ['After Tuesday: verified Experian frozen again. Equifax and TransUnion remain frozen. Practice complete.', 'Practice complete']
  ];
  function renderThaw() {
    $('thaw-status').textContent = thawStates[thawStep][0];
    $('thaw-next').textContent = thawStates[thawStep][1];
    $('thaw-next').disabled = thawStep === 3;
  }
  $('thaw-next').addEventListener('click', () => {
    thawStep = Math.min(3, thawStep + 1);
    if (thawStep === 3) thawPracticed = true;
    renderThaw(); checkReading();
  });
  $('thaw-reset').addEventListener('click', () => { thawStep = 0; renderThaw(); });

  const answers = ['1', '0', '1', '1'];
  const explanations = [
    'Freeze Equifax, Experian, and TransUnion separately. Only fraud alerts use one-bureau notification.',
    'Lift only the bureau(s) needed for the legitimate check and verify the freeze returns afterward.',
    'End unexpected contact and verify independently. Freezes are free; do not share verification codes.',
    'Monitoring detects selected activity. It cannot prevent all fraud or guarantee reimbursement.'
  ];
  $('knowledge-check').addEventListener('submit', event => {
    event.preventDefault();
    let correct = 0;
    answers.forEach((answer, index) => {
      const selected = document.querySelector(`input[name="q${index}"]:checked`);
      const passed = selected?.value === answer;
      if (passed) correct++;
      $(`feedback-${index}`).hidden = false;
      $(`feedback-${index}`).textContent = `${passed ? 'Correct.' : selected ? 'Review.' : 'Choose an answer.'} ${explanations[index]}`;
    });
    $('quiz-result').textContent = `${correct} of 4 correct. ${correct === 4 ? 'Knowledge checks complete.' : 'Review the feedback and try again.'}`;
    if (correct === 4) complete('quizzes');
  });
  $('reset-progress').addEventListener('click', () => {
    completed.clear(); frozen.clear(); thawStep = 0; thawPracticed = false;
    document.querySelectorAll('[data-freeze]').forEach(button => {
      button.disabled = false;
      $(`status-${button.dataset.freeze}`).textContent = 'Practice status: not frozen';
    });
    $('freeze-feedback').textContent = 'Practice freezing each of the three fictional reports.';
    renderThaw();
    $('knowledge-check').reset();
    answers.forEach((_, index) => { $(`feedback-${index}`).hidden = true; });
    $('quiz-result').textContent = '';
    refreshProgress(); activate(0, true);
    announce('Exploration, practice activities, and quiz answers reset.');
  });
  $('btn-claim-cert').addEventListener('click', () => {
    if (completed.size !== tabs.length) return;
    $('certificate-section').hidden = false;
    $('certificate-date').textContent = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    $('certificate-section').focus();
    $('certificate-section').scrollIntoView({ block: 'start' });
  });
  $('print-certificate').addEventListener('click', () => window.print());
  refreshProgress();
});
