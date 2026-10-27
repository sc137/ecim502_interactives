/* Only completion and display preferences are saved; device choices and names stay on this page. */
document.addEventListener('DOMContentLoaded', () => {
  const prefix = 'software_updates_';
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
    if (marker.dataset.readingEnd === 'why') complete('tab-why');
    else {
      const button = marker.querySelector('button');
      if (button.disabled) {
        button.disabled = false;
        document.getElementById('status-' + marker.dataset.readingEnd).textContent = 'Ready: select “I reviewed these instructions” to complete this tab.';
      }
    }
  };
  window.addEventListener('scroll', checkReading, { passive: true });
  setInterval(checkReading, 1000);
  updateProgress();
  const sources = {
    windows: 'https://support.microsoft.com/en-gb/windows/deployment/updates-lifecycle/install-windows-updates',
    mac: 'https://support.apple.com/en-us/108382',
    appleMobile: 'https://support.apple.com/en-us/118575',
    android: 'https://support.google.com/android/answer/7680439?hl=en',
    amazon: 'https://www.amazon.com/gp/help/customer/display.html?nodeId=200529680',
    kindle: 'https://www.amazon.com/gp/help/customer/display.html?nodeId=GFAE5G5UGCYA25DW',
    router: 'https://kb.netgear.com/24217/How-do-I-check-for-new-firmware-and-update-my-Nighthawk-router',
    nest: 'https://support.google.com/googlehome/answer/13800967?hl=en',
    iot: 'https://consumer.ftc.gov/articles/securing-your-internet-connected-devices-home'
  };
  const guides = {
    windows: {
      title: 'Windows PC or Windows tablet',
      steps: ['Save your work, back up important files, and connect to reliable internet and power.', 'On Windows 11, open Start → Settings → Windows Update → Check for updates.', 'Install available updates and restart when requested. Reopen Windows Update to check whether anything remains.', 'Keep updates enabled. Review restart scheduling so a needed restart can finish.', 'Update apps through Microsoft Store or their own official update controls. Keep your browser updated too.'],
      note: 'Windows 10 uses Settings → Update & Security → Windows Update. Standard free Windows 10 support ended October 14, 2025. If you still use it, ask Microsoft or a trusted helper about supported upgrade, replacement, or Extended Security Updates options. A Surface running Windows uses Windows Update too.',
      source: 'windows', link: 'Microsoft: install Windows updates'
    },
    mac: {
      title: 'Mac computer',
      steps: ['Save your work and make a current backup. Connect to reliable internet and power.', 'Open the Apple menu → System Settings → General → Software Update. On older versions, look in System Preferences.', 'Install the compatible update offered, following the prompts. Allow the Mac to restart and finish.', 'Review Automatic Updates in Software Update and enable the available automatic security and software update options.', 'Update App Store apps through the App Store. For apps from other developers, use their own update controls. Safari updates are included with macOS updates.'],
      note: 'Use the newest macOS compatible with your Mac. If it cannot receive current security updates, ask Apple or a trusted helper about your options. Let installation finish without closing the lid or turning off the Mac.', source: 'mac', link: 'Apple: update macOS'
    },
    ipad: {
      title: 'iPad',
      steps: ['Back up your iPad, connect to Wi-Fi, and plug it into power.', 'Open Settings → General → Software Update.', 'Install an available compatible update and follow the prompts. You may need the device passcode.', 'Open Automatic Updates on that screen and enable automatic download and installation options.', 'Keep apps updated through the App Store as well.'],
      note: 'iPad uses iPadOS. Update names and availability depend on your model. A restart may be needed.', source: 'appleMobile', link: 'Apple: update iPhone or iPad'
    },
    iphone: {
      title: 'iPhone',
      steps: ['Back up your iPhone, connect to Wi-Fi, and plug it into power.', 'Open Settings → General → Software Update.', 'Install an available compatible update and follow the prompts. You may need the device passcode.', 'Open Automatic Updates on that screen and enable automatic download and installation options.', 'Keep apps updated through the App Store as well.'],
      note: 'iPhone uses iOS. Make time for installation and a possible restart. If your model no longer receives security updates, ask Apple or a trusted helper about a replacement.', source: 'appleMobile', link: 'Apple: update iPhone or iPad'
    },
    android: {
      title: 'Android phone or tablet',
      steps: ['Back up important information, connect to Wi-Fi, and charge the device. Google recommends at least 75% charge before updating.', 'Open Settings. Look for System → Software updates, Software update, or a similar option. You can search Settings for “update.”', 'Check for system and security updates, follow the prompts, and restart if requested.', 'Check the Google Play system update status too, if your device has Google Play. Its location varies by model.', 'Keep apps updated through Google Play or the device’s official app store. Enable automatic updates where offered.'],
      note: 'Menu labels, update timing, and years of support vary by manufacturer, model, and carrier. Use the maker’s support instructions if your menus differ.', source: 'android', link: 'Google: check and update Android'
    },
    fire: {
      title: 'Amazon Fire tablet',
      steps: ['Connect to Wi-Fi and power. Fire tablets can receive software updates automatically while connected to the internet.', 'To check manually, open Settings → Device Options → System Updates. Labels can vary by model.', 'Use the update or check control if offered, and follow the instructions. Allow any restart to finish.', 'Keep apps updated through the Amazon Appstore as well.', 'If updates fail or your menu differs, identify your exact Fire tablet model and use Amazon’s official support guidance.'],
      note: 'A Fire tablet and a Kindle e-reader use different software. Choose the matching product on Amazon’s support page. Do not install a file intended for another model.', source: 'amazon', link: 'Amazon: device software updates'
    },
    kindle: {
      title: 'Kindle e-reader',
      steps: ['Connect the Kindle to Wi-Fi and keep it charged. Kindle software updates normally download automatically over Wi-Fi.', 'Give the device time to receive its update. You do not need to find a manual update file for this lesson.', 'If it does not update, identify the exact model and compare it with Amazon’s Kindle software update guidance.', 'A manual update may require a computer and the correct file for your exact model. Follow Amazon’s instructions or ask a trusted helper.'],
      note: 'A Kindle e-reader is different from a Fire tablet or the Kindle reading app. If you read in the Kindle app on a phone or tablet, update that app through its app store.', source: 'kindle', link: 'Amazon: Kindle automatic and manual updates'
    }
  };
  const routerGuides = {
    own: {
      title: 'A wireless router you manage',
      steps: ['Identify the router’s brand and exact model from its label, official app, or manual.', 'Open the manufacturer’s official app or the administration page described in its manual. Sign in with your router administrator account.', 'Look for Firmware Update, Router Update, or Software Update. Firmware is the software built into a device.', 'Follow the instructions for your model. Enable automatic firmware updates if offered.', 'Plan for a short loss of Wi-Fi. Keep the router powered on and follow the maker’s instructions until the update and restart finish.'],
      note: 'A mesh Wi-Fi system may have several units to update. Some systems update automatically, including Google Nest Wifi. Do not download firmware from an advertisement or a third-party download site.', source: 'router', link: 'NETGEAR example: router firmware updates'
    },
    provider: {
      title: 'A router managed by your internet provider',
      steps: ['Use your provider’s official app, website, or the support number on your bill.', 'Ask whether your router or combined modem/router receives automatic security and firmware updates.', 'Ask whether your current model is still supported and whether you need to take any action.', 'Follow the provider’s directions. Schedule any restart for a time when a brief internet interruption is acceptable.'],
      note: 'Provider-managed equipment may not allow you to install firmware yourself. Confirm the provider’s process instead of uploading a firmware file.', source: 'iot', link: 'FTC: secure your router and connected devices'
    },
    unsure: {
      title: 'Find out who manages your Wi-Fi',
      steps: ['Check whether the Wi-Fi equipment came from your internet provider or was purchased separately.', 'If it came from the provider, ask the provider who handles updates.', 'For a household, shared building, or community network, ask the person or organization that manages it.', 'Ask one useful question: “Does this router still receive security updates, and are they automatic?”'],
      note: 'You can complete this lesson without signing into a router or knowing its administrator password. Ask for help before changing a shared network.', source: 'iot', link: 'FTC: secure your router and connected devices'
    }
  };
  const smartDetails = {
    doorbell: ['Smart doorbell', 'The doorbell may stop sending alerts briefly during an update. Follow the manufacturer’s power or battery instructions.'],
    camera: ['Security camera', 'Recording or live view may pause during an update. Choose a suitable time and check the camera afterward.'],
    garage: ['Smart garage door opener', 'Follow the manufacturer’s safety directions and keep the doorway clear. Keep your normal remote or another way to operate the door available.'],
    lock: ['Smart door lock', 'Follow the manufacturer’s battery requirements and keep a physical key or another supported entry method available. Check normal operation afterward.'],
    other: ['Other smart home device', 'Smart TVs, thermostats, speakers, printers, and appliances may also need updates. Check each device’s manufacturer guidance.']
  };
  const smartGuide = choice => ({
    title: smartDetails[choice][0],
    steps: ['Update the manufacturer’s official phone app through your app store.', 'Open that app and select your device. Look in Settings, Device Information, or a similar area for firmware or software status.', 'Check the manufacturer’s instructions for your exact model. Some devices update automatically; others need approval or a nearby phone or hub.', 'Keep the device and any required hub connected and adequately powered. Follow the prompts and allow the update to finish.', 'Enable automatic updates if offered. Check whether the manufacturer still supports the device.'],
    note: smartDetails[choice][1] + ' Updating the phone app does not by itself prove that the device’s firmware is current.',
    source: 'iot', link: 'FTC: update connected devices and their apps'
  });
  document.querySelectorAll('[data-device]').forEach(select => {
    select.addEventListener('change', () => {
      const key = select.dataset.device;
      const container = document.getElementById('instructions-' + key);
      const status = document.getElementById('status-' + key);
      activatedAt = Date.now();
      container.replaceChildren();
      container.hidden = !select.value;
      status.textContent = '';
      if (!select.value) return;
      if (select.value === 'none') {
        const text = document.createElement('p');
        text.textContent = 'None selected. This tab counts toward completion. You can return and choose a device whenever you need these instructions.';
        container.append(text);
        complete('tab-' + key);
        status.textContent = 'Section complete: None selected.';
        return;
      }
      const guide = key === 'routers' ? routerGuides[select.value] : key === 'iot' ? smartGuide(select.value) : guides[select.value];
      // Only fixed, developer-authored guide content is inserted as markup.
      container.innerHTML = `<h3 class="subsection-heading">${guide.title}</h3><ol>${guide.steps.map(step => `<li>${step}</li>`).join('')}</ol><div class="callout-box info">${guide.note}</div><p><a href="${sources[guide.source]}">${guide.link}</a></p>${key === 'routers' && select.value === 'own' ? `<p><a href="${sources.nest}">Google: Nest Wifi automatic updates</a></p>` : ''}<div class="panel-end" data-reading-end="${key}"><p>Review these steps, then mark this section complete. You do not have to install an update now.</p><button type="button" class="btn-primary" disabled>I reviewed these instructions</button></div>`;
      status.textContent = `${guide.title} instructions displayed. Read to the end to enable the review button.`;
      container.querySelector('button').addEventListener('click', () => {
        complete('tab-' + key);
        status.textContent = 'Section complete. You can change the selection to view more instructions.';
        announce('Section complete. You can change the selection to view more instructions.');
      });
    });
  });

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
    document.querySelectorAll('[data-device]').forEach(select => { select.value = ''; select.dispatchEvent(new Event('change')); });
    document.querySelectorAll('.feedback').forEach(box => { box.textContent = ''; });
    quizSummary.textContent = '0 of 5 questions complete';
    document.getElementById('cert-name').value = '';
    document.getElementById('cert-display-name').textContent = 'Emeritus Student';
    updateProgress(); activate(tabs[0]);
    announce('Exploration, selections, and knowledge answers reset. Display preferences are retained.');
  });
});
