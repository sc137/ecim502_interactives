/* Common display controls and keyboard navigation. Lesson state stays in each tool. */
(() => {
  'use strict';
  const settings = JSON.parse(document.getElementById('tool-settings')?.textContent || '{}');
  const preferences = settings.preferences || {};
  const themes = ['default', 'dark', 'high-contrast-light'];
  const slider = document.getElementById(settings.sliderId || 'font-scaler-slider');
  const indicator = document.getElementById(settings.indicatorId || 'font-size-indicator');
  const themeSelect = document.getElementById('theme-select');
  const presetButtons = [...document.querySelectorAll('[data-font-scale]')];
  let announcementTimer;

  function announce(message) {
    const region = document.getElementById(settings.announcerId || 'aria-live-announcer');
    if (!region) return;
    clearTimeout(announcementTimer);
    region.textContent = '';
    announcementTimer = setTimeout(() => { region.textContent = message; }, 80);
  }
  function read(key, fallback) {
    if (!key) return fallback;
    try {
      const value = localStorage.getItem(key);
      return value === null ? fallback : preferences.encoding === 'json' ? JSON.parse(value) : value;
    } catch { return fallback; }
  }
  function write(key, value) {
    if (!key) return;
    try { localStorage.setItem(key, preferences.encoding === 'json' ? JSON.stringify(value) : String(value)); }
    catch { /* The tool works without saved display preferences. */ }
  }
  function setFontScale(value, speak = true) {
    const scale = Math.min(1.4, Math.max(0.9, Number(value) || 1));
    const percent = Math.round(scale * 100);
    document.documentElement.style.setProperty('--font-scale', scale);
    if (slider) {
      slider.value = String(scale);
      slider.setAttribute('aria-valuetext', `${percent} percent`);
    }
    if (indicator) indicator.textContent = `${percent}%`;
    presetButtons.forEach(button => {
      const selected = Math.abs(scale - Number(button.dataset.fontScale)) < 0.001;
      button.classList.toggle('active', selected);
      button.setAttribute('aria-pressed', String(selected));
    });
    write(preferences.font, scale);
    if (speak) announce(`Text size set to ${percent} percent.`);
    document.dispatchEvent(new CustomEvent('emeritus:textsizechange', { detail: { scale } }));
  }
  function setTheme(value, speak = true) {
    const theme = themes.includes(value) ? value : 'default';
    if (theme === 'default') document.documentElement.removeAttribute('data-theme');
    else document.documentElement.dataset.theme = theme;
    if (themeSelect) themeSelect.value = theme;
    write(preferences.theme, theme);
    if (speak) announce(`Contrast theme changed to ${themeSelect?.selectedOptions[0]?.textContent || theme}.`);
  }
  const mobileLayout = window.matchMedia('(max-width: 768px)');
  const themeLabels = themeSelect ? [...themeSelect.options].map(option => option.textContent) : [];
  function updateThemeLabels() {
    if (!themeSelect) return;
    [...themeSelect.options].forEach((option, index) => {
      option.textContent = mobileLayout.matches ? option.dataset.mobileLabel || themeLabels[index] : themeLabels[index];
    });
  }
  updateThemeLabels();
  mobileLayout.addEventListener('change', updateThemeLabels);

  function initSectionMenu(tabs, activate) {
    const nav = tabs[0]?.closest('.main-nav');
    const menu = nav?.querySelector('.mobile-section-menu');
    if (!menu) return;
    const list = nav.querySelector('.tab-list');
    const select = nav.querySelector('#section-menu');
    const previous = nav.querySelector('#section-previous');
    const next = nav.querySelector('#section-next');
    const position = nav.querySelector('#section-position');
    const count = nav.querySelector('#exploration-count');
    const compact = nav.querySelector('#compact-exploration-count');
    const reset = nav.querySelector('.btn-reset-progress');
    const claim = nav.querySelector('.btn-claim-certificate');
    const panels = tabs.map(tab => document.getElementById(tab.getAttribute('aria-controls')));
    const originalIndexes = panels.map(panel => panel.getAttribute('tabindex'));
    nav.classList.add('has-section-menu');

    function sync() {
      const active = Math.max(0, tabs.findIndex(tab => tab.getAttribute('aria-selected') === 'true'));
      if (select.value !== tabs[active].id) select.value = tabs[active].id;
      previous.disabled = active === 0;
      next.disabled = active === tabs.length - 1;
      select.setAttribute('aria-controls', panels[active].id);
      position.textContent = `Section ${active + 1} of ${tabs.length}`;
      tabs.forEach((tab, index) => {
        const badge = tab.querySelector('.tab-check-badge');
        const explored = tab.classList.contains('explored') || (badge && !badge.hidden && getComputedStyle(badge).display !== 'none');
        const label = tab.textContent.replace('✅', '').replace('Explored', '').replace(/\s+/g, ' ').trim() + (explored ? ' — explored' : '');
        const option = select.options[index];
        if (option.textContent !== label) option.textContent = label;
      });
      const numbers = count.textContent.match(/(\d+)\s+of\s+(\d+)/);
      const label = numbers ? `Explored ${numbers[1]}/${numbers[2]}` : count.textContent;
      if (compact.textContent !== label) compact.textContent = label;
      nav.classList.toggle('has-certificate', !!claim && !claim.hidden && getComputedStyle(claim).display !== 'none');
    }
    function layout() {
      menu.hidden = !mobileLayout.matches;
      list.hidden = mobileLayout.matches;
      panels.forEach((panel, index) => {
        panel.setAttribute('role', mobileLayout.matches ? 'region' : 'tabpanel');
        if (!mobileLayout.matches) {
          if (originalIndexes[index] === null) panel.removeAttribute('tabindex');
          else panel.setAttribute('tabindex', originalIndexes[index]);
        }
      });
      sync();
    }
    function open(index) {
      activate(tabs[index]);
      sync();
      const panel = panels[index];
      if (!panel.hasAttribute('tabindex')) panel.tabIndex = -1;
      panel.focus({ preventScroll: true });
      panel.scrollIntoView({ block: 'start', behavior: 'instant' });
    }
    select.addEventListener('change', () => {
      if (select.value === '__reset__') {
        reset.click();
        sync();
        select.focus({ preventScroll: true });
      } else {
        const index = tabs.findIndex(tab => tab.id === select.value);
        if (index >= 0) open(index);
      }
    });
    previous.addEventListener('click', () => open(Math.max(0, tabs.findIndex(tab => tab.getAttribute('aria-selected') === 'true') - 1)));
    next.addEventListener('click', () => open(Math.min(tabs.length - 1, tabs.findIndex(tab => tab.getAttribute('aria-selected') === 'true') + 1)));
    const observer = new MutationObserver(sync);
    tabs.forEach(tab => {
      observer.observe(tab, { attributes: true, attributeFilter: ['aria-selected', 'class'] });
      const badge = tab.querySelector('.tab-check-badge');
      if (badge) observer.observe(badge, { attributes: true, attributeFilter: ['hidden', 'style'] });
    });
    observer.observe(count, { childList: true, characterData: true, subtree: true });
    if (claim) observer.observe(claim, { attributes: true, attributeFilter: ['hidden', 'style'] });
    mobileLayout.addEventListener('change', layout);
    layout();
  }

  function bindTabs(items, activate) {
    const tabs = Array.from(items);
    tabs.forEach((tab, index) => {
      tab.addEventListener('click', () => activate(tab));
      tab.addEventListener('keydown', event => {
        const targets = { ArrowRight: (index + 1) % tabs.length, ArrowLeft: (index + tabs.length - 1) % tabs.length, Home: 0, End: tabs.length - 1 };
        if (!(event.key in targets)) return;
        event.preventDefault();
        const target = tabs[targets[event.key]];
        target.focus({ preventScroll: true });
        activate(target);
      });
    });
    initSectionMenu(tabs, activate);
  }

  window.EmeritusUI = Object.freeze({ setFontScale, setTheme, bindTabs });
  if (slider) {
    slider.addEventListener('input', event => setFontScale(event.target.value));
    presetButtons.forEach(button => button.addEventListener('click', () => setFontScale(button.dataset.fontScale)));
    setFontScale(read(preferences.font, 1), false);
  }
  if (themeSelect) {
    themeSelect.addEventListener('change', event => setTheme(event.target.value));
    setTheme(read(preferences.theme, 'default'), false);
  }
})();
