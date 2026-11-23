/* Fictional practice only. All state stays in this open page; no storage or network. */
document.addEventListener('DOMContentLoaded', () => {
  const $ = id => document.getElementById(id);
  const tabList = document.querySelector('.tab-list');
  const sectionNav = tabList.closest('.main-nav');
  const lessonTabs = [...tabList.querySelectorAll('[role="tab"]')];
  const lessonCount = lessonTabs.length;
  const certificateTabItem = $('certificate-tab-template').content.firstElementChild.cloneNode(true);
  const certificateTab = certificateTabItem.querySelector('[role="tab"]');
  const tabs = [...lessonTabs, certificateTab];
  const panels = tabs.map(tab => $(tab.getAttribute('aria-controls')));
  const sectionMenu = $('section-menu');
  const sectionOptions = sectionMenu.querySelector('optgroup');
  const certificateOption = new Option(certificateTab.textContent, certificateTab.id);
  const mobileLayout = matchMedia('(max-width: 768px)');
  const completed = new Set();
  const privacyPassed = new Set();
  const casesPassed = new Set();
  const data = {"cases": [["family-new-number", "Someone with your niece’s name asks for urgent money from an unfamiliar chat.", ["Call your niece using a number you already have before doing anything.", "Trust the familiar name and send money.", "Call the number supplied in the request."], 0, "A name, photo, or encrypted chat is not proof of identity. Verify using a known number, not one in the request."], ["fake-support", "A message claiming to be Signal Support demands your registration code to keep your account open.", ["Reply with only the last digits.", "Do not reply or share the code. Report/block and use official support if needed.", "Share the code if the logo looks official."], 1, "Use verification codes only in the real in-app registration flow. Signal staff do not initiate an exchangeable support chat or ask for codes."], ["safety-change", "A one-to-one chat shows a changed safety number just before you share something sensitive.", ["Ignore it because encryption is enabled.", "Assume the contact was definitely hacked.", "Pause and verify through a known channel or in person; compare safety numbers if appropriate."], 2, "A reinstall or new phone can cause a change. Verify independently before sending. A matching safety number checks the connection; establish who the contact is separately."], ["optional-group", "A small club’s invitation link gets forwarded outside the club.", ["Require admin approval for joins by link; reset or disable the widely shared link.", "Assume anyone with the link is a known member.", "Post the link publicly to fix it."], 0, "Links can be forwarded. Admin approval helps control joins; share invitations directly with intended members."]], "quiz": [["Can Signal send a private Signal message to someone who only uses ordinary SMS?", ["Yes", "No", "Yes, if you have their number"], 1, "Both people need Signal. SMS is a different service."], ["Which setting controls whether someone can start a Signal chat by looking up your number?", ["Who can see my number?", "Who can find me by my number?", "Disappearing messages"], 1, "Discovery controls lookup by number. Visibility controls what people you chat with can see."], ["What should you do if a chat asks for your Signal registration code?", ["Share it if the logo looks official", "Send only the last digits", "Do not share it; report/block a suspicious request"], 2, "Never share the code. Use it only in the actual in-app registration flow."], ["What can the recipient still do with a disappearing message?", ["Save a record, such as by photographing the screen", "Nothing once a timer is set", "Always recover it from Signal Support"], 0, "A timer is not copy protection. It applies to new messages after the setting changes."], ["A contact’s safety number changed before you send something sensitive. What is the best next step?", ["Send it because the chat is encrypted", "Verify the contact independently before sending", "Assume their account was definitely hacked"], 1, "A change can be routine. Confirm with your contact through a trusted method before sending."]]};
  let active = tabs[0];
  let activatedAt = Date.now();
  let connectStep = 0;
  let setupStep = 0;
  let announcementTimer;
  function announce(message) {
    clearTimeout(announcementTimer);
    $('aria-live-announcer').textContent = '';
    announcementTimer = setTimeout(() => { $('aria-live-announcer').textContent = message; }, 80);
  }
  function progress() {
    lessonTabs.forEach(tab => {
      const badge = $('check-' + tab.id);
      badge.hidden = !completed.has(tab.id);
      badge.style.display = completed.has(tab.id) ? 'inline-flex' : 'none';
    });
    $('exploration-count').textContent = `${completed.size} of ${lessonCount} Tabs Explored`;
    $('exploration-percent-badge').textContent = `${Math.round(completed.size / lessonCount * 100)}%`;
    const eligible = completed.size === lessonCount;
    $('certificate-section').hidden = !eligible;
    if (eligible && !certificateTab.isConnected) {
      tabList.append(certificateTabItem);
      sectionOptions.append(certificateOption);
      $('certificate-date').textContent = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    } else if (!eligible) {
      if (active === certificateTab) activate(lessonTabs.at(-1));
      certificateTabItem.remove();
      certificateOption.remove();
    }
    syncNavigation();
  }
  function complete(key) {
    const id = 'tab-' + key;
    if (completed.has(id)) return;
    completed.add(id);
    progress();
    announce(`Section completed. ${completed.size} of ${lessonCount} sections complete.`);
  }
  function activate(tab) {
    active = tab;
    activatedAt = Date.now();
    tabs.forEach((item, i) => {
      const selected = item === tab;
      item.setAttribute('aria-selected', String(selected));
      item.tabIndex = selected ? 0 : -1;
      panels[i].hidden = !selected;
      panels[i].classList.toggle('active', selected);
    });
    syncNavigation();
  }

  function availableTabs() {
    return certificateTab.isConnected ? tabs : lessonTabs;
  }
  function syncNavigation() {
    const available = availableTabs();
    const index = available.indexOf(active);
    const showClaimShortcut = certificateTab.isConnected && active !== certificateTab;
    $('btn-claim-cert').hidden = !showClaimShortcut;
    sectionNav.classList.toggle('has-certificate', showClaimShortcut);
    sectionMenu.value = active.id;
    sectionMenu.setAttribute('aria-controls', active.getAttribute('aria-controls'));
    $('section-previous').disabled = index === 0;
    $('section-next').disabled = index === available.length - 1;
    $('section-position').textContent = `Section ${index + 1} of ${available.length}`;
    $('compact-exploration-count').textContent = `Explored ${completed.size}/${lessonCount}`;
    available.forEach((tab, i) => {
      const label = tab.firstChild.textContent.trim() + (completed.has(tab.id) ? ' — explored' : '');
      if (sectionOptions.children[i].textContent !== label) sectionOptions.children[i].textContent = label;
    });
  }
  function openMobileSection(tab) {
    activate(tab);
    const panel = $(tab.getAttribute('aria-controls'));
    panel.focus({ preventScroll: true });
    panel.scrollIntoView({ block: 'start', behavior: 'instant' });
  }
  function setSectionLayout() {
    document.querySelector('.mobile-section-menu').hidden = !mobileLayout.matches;
    tabList.hidden = mobileLayout.matches;
    panels.forEach(panel => panel.setAttribute('role', mobileLayout.matches ? 'region' : 'tabpanel'));
  }
  sectionNav.classList.add('has-section-menu');
  mobileLayout.addEventListener('change', setSectionLayout);
  setSectionLayout();
  tabs.forEach(tab => {
    tab.addEventListener('click', () => activate(tab));
    tab.addEventListener('keydown', event => {
      const available = availableTabs();
      const index = available.indexOf(tab);
      const targets = {
        ArrowLeft: (index + available.length - 1) % available.length,
        ArrowRight: (index + 1) % available.length,
        Home: 0,
        End: available.length - 1
      };
      if (!Object.hasOwn(targets, event.key)) return;
      event.preventDefault();
      const target = available[targets[event.key]];
      target.focus({ preventScroll: true });
      activate(target);
    });
  });
  sectionMenu.addEventListener('change', () => {
    if (sectionMenu.value === '__reset__') {
      $('reset-progress').click();
      sectionMenu.focus({ preventScroll: true });
      return;
    }
    const tab = availableTabs().find(item => item.id === sectionMenu.value);
    if (tab) openMobileSection(tab);
  });
  $('section-previous').addEventListener('click', () => {
    const available = availableTabs();
    openMobileSection(available[Math.max(0, available.indexOf(active) - 1)]);
  });
  $('section-next').addEventListener('click', () => {
    const available = availableTabs();
    openMobileSection(available[Math.min(available.length - 1, available.indexOf(active) + 1)]);
  });
  function checkReading() {
    if (active.id !== 'tab-basics' || document.hidden || Date.now() - activatedAt < 4000) return;
    const rect = $('basics-end').getBoundingClientRect();
    if (rect.top >= 0 && rect.bottom <= innerHeight) complete('basics');
  }
  window.addEventListener('scroll', checkReading, { passive: true });
  setInterval(checkReading, 500);

  function showPracticeFeedback(feedback, message, correct) {
    feedback.className = `quiz-feedback-box ${correct ? 'correct' : 'incorrect'}`;
    feedback.replaceChildren();
    if (correct) {
      const check = document.createElement('span');
      check.className = 'feedback-check';
      check.setAttribute('aria-hidden', 'true');
      check.textContent = '✓ ';
      feedback.append(check);
    }
    feedback.append(document.createTextNode(message));
    feedback.focus({ preventScroll: true });
    feedback.scrollIntoView({ block: 'nearest', behavior: 'instant' });
  }
  const setupSteps = [
    {
      prompt: 'Where should you get the real Signal app?',
      choices: ['Use Signal’s official download page or the device’s official app store', 'Use a download link in an unexpected message'],
      explanation: 'Use an official source to avoid look-alike apps.'
    },
    {
      prompt: 'Which number can you use for the phone-number setup practiced here?',
      choices: ['Use a number you control that can receive a text or call', 'Use a number you cannot receive messages or calls on'],
      explanation: 'You need access to the number to receive the verification code.'
    },
    {
      prompt: 'Where does the verification code belong?',
      choices: ['Enter the code only in Signal’s registration screen', 'Send the code to someone claiming to be Signal Support'],
      explanation: 'The code confirms access to your number. Never share it with another person.'
    },
    {
      prompt: 'What is a safe choice for your profile display name?',
      choices: ['Choose a name or nickname; a last name and photo are optional', 'Assume a profile name proves someone’s identity'],
      explanation: 'The display name helps people recognize a chat, but different people can use the same name.'
    },
    {
      prompt: 'How should you handle your Signal PIN?',
      choices: ['Keep the PIN private; it is separate from the verification code', 'Share the PIN in a chat so someone else can keep it for you'],
      explanation: 'A Signal PIN helps recover profile information and settings. It is not a chat backup or your phone’s unlock code.'
    }
  ];
  function renderSetup() {
    const finished = setupStep === setupSteps.length;
    $('setup-step').textContent = finished ? 'Completed: 5 of 5 account setup decisions.' : `Account setup ${setupStep + 1} of 5. ${setupSteps[setupStep].prompt} Choose a button below.`;
    $('connect-practice').hidden = !finished;
    $('setup-controls').replaceChildren();
    if (finished) return;
    const step = setupSteps[setupStep];
    step.choices.forEach((label, index) => {
      const button = document.createElement('button');
      button.type = 'button'; button.className = 'btn-primary'; button.textContent = label;
      button.addEventListener('click', () => {
        const correct = index === 0;
        let message;
        if (correct) {
          setupStep++;
          renderSetup();
          message = setupStep === setupSteps.length
            ? `Question ${setupStep}: Correct. ${step.explanation} Completed: all five account setup decisions. No real account was created. Next: choose “New Message” in the Ernie practice below.`
            : `Question ${setupStep}: Correct. ${step.explanation} Next: answer question ${setupStep + 1} below.`;
        } else {
          message = `Question ${setupStep + 1}: Review. ${step.explanation} Next: choose “${step.choices[0]}” below.`;
        }
        showPracticeFeedback($('setup-feedback'), message, correct);
        announce(message);
      });
      $('setup-controls').append(button);
    });
  }
  renderSetup();

  const connectSteps = [
    ['Start a new conversation.', ['New Message']],
    ['Choose how to locate Ernie.', ['Find by Username', 'Use a similar-looking display name']],
    ['Use the trusted information Ernie sent.', ['Select the exact username Ernie shared', 'Select a similar-looking display name']],
    ['Check the recipient and read the sample message.', ['Send practice message request']],
    ['Connection practice completed. Nothing was sent.', []]
  ];
  const practiceExchanges = [
    ['Hi, Ernie! Glad we could connect.', 'Hi! Glad we found each other.'],
    ['Hello, Ernie! How’s your day going?', 'Pretty well, thanks! How about yours?'],
    ['Hi, Ernie! Thanks for sharing your username.', 'You’re welcome! Good to hear from you.'],
    ['Hey, Ernie! Are you still up for coffee?', 'Yes! Saturday morning works for me.'],
    ['Hi, Ernie! How did your garden turn out?', 'The tomatoes are finally ripe! Thanks for asking.']
  ];
  let currentExchange;
  let exchangeTimer;
  function choosePracticeExchange() {
    const choices = practiceExchanges.filter(exchange => exchange !== currentExchange);
    currentExchange = choices[Math.floor(Math.random() * choices.length)];
    const [greeting, reply] = currentExchange;
    $('connect-greeting').textContent = greeting;
    $('connect-reply').textContent = reply;
  }
  function renderConnect() {
    clearTimeout(exchangeTimer);
    const followup = completed.has('tab-connect');
    const replied = connectStep === 4;
    const preview = $('connect-preview');
    const showExchange = $('connect-show-exchange');
    $('connect-followup-actions').hidden = !replied;
    showExchange.hidden = true;
    if (replied) {
      exchangeTimer = setTimeout(() => {
        preview.hidden = true;
        showExchange.hidden = false;
      }, 12000);
    }
    preview.hidden = connectStep < 3;
    $('connect-reply-line').hidden = !replied;
    const [prompt, choices] = connectSteps[connectStep];
    $('connect-step').textContent = replied ? 'Completed: 4 of 4 practice steps.' : followup
      ? 'Review the new greeting to Ernie, then send the practice message.'
      : `Step ${connectStep + 1} of 4. ${prompt} Choose a button below.`;
    $('connect-controls').replaceChildren();
    const actions = followup && connectStep === 3 ? ['Send practice message'] : choices;
    actions.forEach((label, index) => {
      const button = document.createElement('button');
      button.type = 'button'; button.className = 'btn-primary'; button.textContent = label;
      button.addEventListener('click', () => {
        const correct = index === 0;
        const feedback = $('connect-feedback');
        let message;
        if (!correct) {
          const nextChoice = connectStep === 1 ? 'Find by Username' : 'Select the exact username Ernie shared';
          message = `Review. Display names are not unique. Next: choose “${nextChoice}” below to use the username Ernie shared through a trusted channel.`;
        } else {
          connectStep++;
          if (connectStep === 3) choosePracticeExchange();
          renderConnect();
          message = [
            '',
            'Correct. New Message opens a new conversation. Next: choose “Find by Username” below.',
            'Correct. Find by Username uses the exact username your friend shared. Next: choose “Select the exact username Ernie shared” below.',
            'Correct. You selected the exact username Ernie shared. Review the sample message, then choose “Send practice message request” below.',
            'Completed. Ernie accepted your practice request and replied below. Nothing was sent. Try another message or open “3. Practice Privacy Settings”.'
          ][connectStep];
        }
        message = followup ? 'Ernie replied to your practice message below. Nothing was sent.'
          : `Connection step ${correct ? connectStep : connectStep + 1}: ${message}`;
        showPracticeFeedback(feedback, message, correct);
        if (connectStep === 4) complete('connect');
        announce(message + (connectStep === 4 ? ` ${completed.size} of ${lessonCount} sections complete.` : ''));
      });
      $('connect-controls').append(button);
    });
  }
  $('connect-show-exchange').addEventListener('click', () => {
    const preview = $('connect-preview');
    preview.hidden = false;
    preview.focus();
    $('connect-show-exchange').hidden = true;
  });
  $('connect-try-another').addEventListener('click', () => {
    connectStep = 3;
    choosePracticeExchange();
    $('connect-feedback').textContent = '';
    renderConnect();
    $('connect-step').focus();
  });
  renderConnect();

  const goals = [
    ['A longtime friend has your number. Let them find you by number without displaying it to people who have not saved it.', 'Your friend can look you up by number. Hiding it in Signal does not erase it from their contacts.'],
    ['Use a username to connect with someone you just met. Keep them from finding you by phone number.', 'New contacts cannot look you up by number. Share the exact username or its link privately.'],
    ['Keep future practice messages from accumulating in this chat.', 'The timer applies to new messages. A recipient can still save a copy, including a photograph of the screen.']
  ];
  goals.forEach(([goal], index) => {
    const card = document.createElement('div'); card.className = 'info-card';
    const heading = document.createElement('h3'); heading.textContent = `Goal ${index + 1}`;
    const text = document.createElement('p'); text.textContent = goal;
    const button = document.createElement('button'); button.type = 'button'; button.className = 'btn-primary'; button.textContent = `Check goal ${index + 1}`;
    const feedback = document.createElement('p'); feedback.id = `goal-feedback-${index}`; feedback.tabIndex = -1;
    button.addEventListener('click', () => {
      const see = $('see-number').value, find = $('find-number').value;
      const correct = [see === 'nobody' && find === 'everybody', see === 'nobody' && find === 'nobody' && $('share-username').value === 'exact', $('chat-timer').value !== 'off'][index];
      feedback.className = `quiz-feedback-box ${correct ? 'correct' : 'incorrect'}`;
      feedback.textContent = correct ? 'Correct. ' + goals[index][1] : 'Review. ' + ['Set visibility to Nobody and discovery to Everybody, then check again.', 'Set both number settings to Nobody and choose to share the exact username privately, then check again.', 'Choose a disappearing-message timer for this chat, then check again.'][index];
      if (correct) privacyPassed.add(index);
      $('privacy-progress').textContent = `${privacyPassed.size} of 3 goals completed. Completed goals remain earned while you practice other settings.`;
      feedback.focus({ preventScroll: true });
      if (privacyPassed.size === 3) complete('privacy'); else announce(feedback.textContent);
    });
    card.append(heading, text, button, feedback); $('privacy-goals').append(card);
  });
  function settingsState(event) {
    let adjustment = '';
    if ($('find-number').value === 'nobody' && $('see-number').value === 'everybody') {
      if (event?.target.id === 'see-number') {
        $('find-number').value = 'everybody';
        adjustment = 'Discovery changed to Everybody because visibility is Everybody. ';
      } else {
        $('see-number').value = 'nobody';
        adjustment = 'Visibility changed to Nobody because discovery is Nobody. ';
      }
    }
    $('settings-state').textContent = `${adjustment}Current: see number — ${$('see-number').selectedOptions[0].textContent}; find by number — ${$('find-number').selectedOptions[0].textContent}; chat timer — ${$('chat-timer').selectedOptions[0].textContent}.`;
    if (event) announce($('settings-state').textContent);
  }
  ['see-number', 'find-number', 'share-username', 'chat-timer'].forEach(id => $(id).addEventListener('change', settingsState));
  settingsState();

  function feedback(name, answer, explanation) {
    const selected = document.querySelector(`input[name="${name}"]:checked`);
    const correct = selected?.value === String(answer);
    const result = $('feedback-' + name);
    result.hidden = false;
    result.tabIndex = -1;
    result.className = `quiz-feedback-box ${correct ? 'correct' : 'incorrect'}`;
    result.textContent = `${correct ? 'Correct.' : selected ? 'Review.' : 'Choose an answer.'} ${explanation}`;
    document.querySelectorAll(`input[name="${name}"]`).forEach(input => input.setAttribute('aria-describedby', result.id));
    return correct;
  }
  data.cases.forEach(([key, , , answer, explanation]) => {
    $('case-' + key).addEventListener('submit', event => {
      event.preventDefault();
      if (feedback(key, answer, explanation)) casesPassed.add(key); else casesPassed.delete(key);
      $('choices-progress').textContent = `${casesPassed.size} of ${data.cases.length} cases completed.`;
      $('feedback-' + key).focus({ preventScroll: true });
      if (casesPassed.size === data.cases.length) complete('choices');
      else { completed.delete('tab-choices'); progress(); announce($('feedback-' + key).textContent); }
    });
    $('case-' + key).addEventListener('change', () => {
      casesPassed.delete(key); completed.delete('tab-choices'); progress();
      $('choices-progress').textContent = `${casesPassed.size} of ${data.cases.length} cases completed. Check the revised choice.`;
      $('feedback-' + key).hidden = true;
      $('feedback-' + key).textContent = '';
      document.querySelectorAll(`input[name="${key}"]`).forEach(input => input.removeAttribute('aria-describedby'));
      announce('Choice changed. Check the revised case again.');
    });
  });
  const callPractice = $('call-link-practice');
  callPractice.addEventListener('submit', event => {
    event.preventDefault();
    const correct = feedback('call-link', 'app', 'Use the Signal app to join. The web page cannot connect you as a guest, and a call link works without joining a group chat.');
    $('feedback-call-link').focus();
    if (correct) complete('calls');
  });
  callPractice.addEventListener('change', () => {
    completed.delete('tab-calls');
    progress();
    $('feedback-call-link').hidden = true;
    callPractice.querySelectorAll('input').forEach(input => input.removeAttribute('aria-describedby'));
  });
  $('knowledge-check').addEventListener('submit', event => {
    event.preventDefault();
    const correct = data.quiz.reduce((count, [, , answer, explanation], index) => count + Number(feedback('q' + index, answer, explanation)), 0);
    $('quiz-result').textContent = `${correct} of 5 correct. ${correct === 5 ? 'Knowledge check passed.' : 'Review the feedback and try again.'}`;
    $('quiz-result').focus({ preventScroll: true });
    if (correct === 5) complete('knowledge');
    else { completed.delete('tab-knowledge'); progress(); }
    announce($('quiz-result').textContent + ` ${completed.size} of ${lessonCount} sections complete.`);
  });
  $('knowledge-check').addEventListener('change', event => {
    completed.delete('tab-knowledge'); progress();
    const result = $('feedback-' + event.target.name);
    result.hidden = true;
    result.textContent = '';
    document.querySelectorAll(`input[name="${event.target.name}"]`).forEach(input => input.removeAttribute('aria-describedby'));
    $('quiz-result').textContent = 'Answer changed. Check Answers again to earn this section.';
    announce($('quiz-result').textContent);
  });
  $('btn-claim-cert').addEventListener('click', () => {
    if (!certificateTab.isConnected) return;
    activate(certificateTab);
    const name = $('cert-name');
    name.focus({ preventScroll: true });
    name.scrollIntoView({ block: 'center', behavior: 'instant' });
  });
  $('cert-name').addEventListener('input', event => {
    $('cert-display-name').textContent = event.target.value.trim() || 'Emeritus Student';
  });
  $('print-certificate').addEventListener('click', () => { if (completed.size === lessonCount) window.print(); });
  $('reset-progress').addEventListener('click', () => {
    completed.clear(); privacyPassed.clear(); casesPassed.clear(); connectStep = 0; setupStep = 0;
    currentExchange = undefined;
    document.querySelectorAll('form').forEach(form => form.reset());
    document.querySelectorAll('[id^="feedback-"]').forEach(result => { result.hidden = true; result.textContent = ''; });
    document.querySelectorAll('input[type="radio"][aria-describedby]').forEach(input => input.removeAttribute('aria-describedby'));
    document.querySelectorAll('[id^="goal-feedback-"]').forEach(result => { result.textContent = ''; result.className = ''; });
    $('see-number').value = 'nobody'; $('find-number').value = 'everybody'; $('share-username').value = 'none'; $('chat-timer').value = 'off';
    $('connect-feedback').textContent = ''; $('setup-feedback').textContent = ''; $('quiz-result').textContent = ''; $('certificate-date').textContent = '';
    $('cert-name').value = '';
    $('cert-display-name').textContent = 'Emeritus Student';
    $('privacy-progress').textContent = '0 of 3 goals completed.'; $('choices-progress').textContent = '0 of 4 cases completed.';
    renderSetup(); renderConnect(); settingsState(); progress(); activate(tabs[0]);
    if (!matchMedia('(max-width: 768px)').matches) tabs[0].focus({ preventScroll: true });
    announce('Exploration, practice choices, feedback, and certificate reset.');
  });
  progress();
});
