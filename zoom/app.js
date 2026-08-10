/* ==========================================================================
   Zoom Workplace Interactive Guide - Main JavaScript (WCAG 2.1 AA Compliant)
   Handles Accessibility Scaling, Interactive Toolbar Simulator, Sliders,
   Quizzes with Immediate Feedback, Privacy Decision Tree, and Glossary Search.
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
  initA11ySettings();
  initTabs();
  initSliders();
  initGlossary();
  initCertificate();
  updateChecklistProgress();
});

/* Helper Function for ARIA Live Region Screen Reader Announcements */
function announceToScreenReader(message) {
  const announcer = document.getElementById('aria-live-announcer');
  if (announcer) {
    announcer.textContent = '';
    setTimeout(() => {
      announcer.textContent = message;
    }, 100);
  }
}

/* ==========================================================================
   1. ACCESSIBILITY SETTINGS (FONT SCALER & CONTRAST THEMES)
   ========================================================================== */
function initA11ySettings() {
  const slider = document.getElementById('font-scaler-slider');
  if (slider) {
    slider.addEventListener('input', (e) => {
      setFontScale(parseFloat(e.target.value));
    });
  }

  // Load saved preferences if available
  const savedScale = localStorage.getItem('emeritus_font_scale');
  if (savedScale) {
    setFontScale(parseFloat(savedScale));
  }

  const savedTheme = localStorage.getItem('emeritus_theme');
  if (savedTheme) {
    const themeSelect = document.getElementById('theme-select');
    if (themeSelect) themeSelect.value = savedTheme;
    changeTheme(savedTheme);
  }
}

function setFontScale(scaleValue) {
  document.documentElement.style.setProperty('--font-scale', scaleValue);
  
  // Update Slider Input & Indicator
  const slider = document.getElementById('font-scaler-slider');
  const indicator = document.getElementById('font-size-indicator');
  if (slider) slider.value = scaleValue;
  if (indicator) indicator.textContent = Math.round(scaleValue * 100) + '%';

  // Update Button Presets
  const btnNorm = document.getElementById('btn-font-normal');
  const btnLarge = document.getElementById('btn-font-large');
  const btnXL = document.getElementById('btn-font-xlarge');

  [btnNorm, btnLarge, btnXL].forEach(b => b && b.classList.remove('active'));
  if (scaleValue <= 1.05 && btnNorm) btnNorm.classList.add('active');
  else if (scaleValue > 1.05 && scaleValue <= 1.25 && btnLarge) btnLarge.classList.add('active');
  else if (scaleValue > 1.25 && btnXL) btnXL.classList.add('active');

  localStorage.setItem('emeritus_font_scale', scaleValue);
  announceToScreenReader(`Text size set to ${Math.round(scaleValue * 100)} percent.`);
}

function changeTheme(themeValue) {
  if (themeValue === 'default') {
    document.documentElement.removeAttribute('data-theme');
  } else {
    document.documentElement.setAttribute('data-theme', themeValue);
  }
  localStorage.setItem('emeritus_theme', themeValue);
  announceToScreenReader(`Contrast theme changed to ${themeValue}.`);
}

/* ==========================================================================
   2. ACCESSIBLE TAB NAVIGATION & SCROLL-TRIGGERED EXPLORATION TRACKING
   ========================================================================== */
let exploredTabIds = [];

function initTabs() {
  const tabList = document.querySelector('.tab-list');
  const tabs = document.querySelectorAll('.tab-button');
  const panels = document.querySelectorAll('.tab-panel');

  if (!tabList) return;

  // Load saved explored tabs
  try {
    const saved = localStorage.getItem('emeritus_explored_tabs');
    if (saved) exploredTabIds = JSON.parse(saved);
  } catch (e) {
    exploredTabIds = [];
  }

  updateExplorationUI();

  // Add Scroll Listener to detect when student scrolls down to explore tab content
  window.addEventListener('scroll', checkTabScrollCompletion, { passive: true });

  // Initial scroll check in case page is already scrolled
  setTimeout(checkTabScrollCompletion, 300);

  tabs.forEach((tab, index) => {
    tab.addEventListener('click', () => {
      activateTab(tab, tabs, panels);
    });

    tab.addEventListener('keydown', (e) => {
      let targetIndex = null;
      if (e.key === 'ArrowRight') targetIndex = (index + 1) % tabs.length;
      else if (e.key === 'ArrowLeft') targetIndex = (index - 1 + tabs.length) % tabs.length;
      else if (e.key === 'Home') targetIndex = 0;
      else if (e.key === 'End') targetIndex = tabs.length - 1;

      if (targetIndex !== null) {
        e.preventDefault();
        tabs[targetIndex].focus();
        activateTab(tabs[targetIndex], tabs, panels);
      }
    });
  });
}

function activateTab(selectedTab, allTabs, allPanels) {
  allTabs.forEach(t => {
    t.setAttribute('aria-selected', 'false');
    t.setAttribute('tabindex', '-1');
  });

  allPanels.forEach(p => {
    p.classList.remove('active');
  });

  selectedTab.setAttribute('aria-selected', 'true');
  selectedTab.removeAttribute('tabindex');

  const targetPanelId = selectedTab.getAttribute('aria-controls');
  const targetPanel = document.getElementById(targetPanelId);

  if (targetPanel) {
    targetPanel.classList.add('active');

    const cleanTitle = selectedTab.textContent.replace('✅','').trim();
    if (exploredTabIds.includes(selectedTab.id)) {
      announceToScreenReader(`Switched to tab: ${cleanTitle}. (Explored)`);
    } else if (selectedTab.id === 'tab-quizzes') {
      announceToScreenReader(`Switched to tab: ${cleanTitle}. Answer the quiz questions below to earn your module checkmark.`);
    } else {
      announceToScreenReader(`Switched to tab: ${cleanTitle}. Scroll down to read content and earn module checkmark.`);
    }

    // Check if user is already scrolled down enough to complete this tab
    setTimeout(checkTabScrollCompletion, 150);
  }
}

function checkTabScrollCompletion() {
  const activeTab = document.querySelector('.tab-button[aria-selected="true"]');
  if (!activeTab || exploredTabIds.includes(activeTab.id)) return;

  // Checklists & Quizzes tab (tab-quizzes) requires answering quiz questions to earn checkmark!
  if (activeTab.id === 'tab-quizzes') return;

  const targetPanelId = activeTab.getAttribute('aria-controls');
  const panel = document.getElementById(targetPanelId);
  if (!panel) return;

  const scrollY = window.scrollY || window.pageYOffset || 0;
  const panelRect = panel.getBoundingClientRect();

  // Completion trigger: student has scrolled down at least 80px OR panel content top is well inside the viewport
  if (scrollY > 80 || panelRect.top < window.innerHeight * 0.75) {
    exploredTabIds.push(activeTab.id);
    saveExploredTabs();
    updateExplorationUI();

    const cleanTitle = activeTab.textContent.replace('✅','').trim();
    announceToScreenReader(`🎉 Checkmark earned for ${cleanTitle}! Exploration progress updated.`);
  }
}

function markQuizTabCompleted() {
  if (!exploredTabIds.includes('tab-quizzes')) {
    exploredTabIds.push('tab-quizzes');
    saveExploredTabs();
    updateExplorationUI();

    const tabBtn = document.getElementById('tab-quizzes');
    const cleanTitle = tabBtn ? tabBtn.textContent.replace('✅','').trim() : '5. Checklist & Quizzes';
    announceToScreenReader(`🎉 Outstanding! Checkmark earned for ${cleanTitle}! Progress updated.`);
  }
}

function saveExploredTabs() {
  localStorage.setItem('emeritus_explored_tabs', JSON.stringify(exploredTabIds));
}

function updateExplorationUI() {
  const tabs = document.querySelectorAll('.tab-button');
  const totalTabs = tabs.length || 6;
  const countLabel = document.getElementById('exploration-count');
  const percentBadge = document.getElementById('exploration-percent-badge');
  const claimCertBtn = document.getElementById('btn-claim-cert');

  tabs.forEach(tab => {
    if (exploredTabIds.includes(tab.id)) {
      tab.classList.add('explored');
    } else {
      tab.classList.remove('explored');
    }
  });

  const count = exploredTabIds.length;
  const percent = Math.round((count / totalTabs) * 100);

  if (countLabel) countLabel.textContent = `${count} of ${totalTabs} Tabs Explored`;
  if (percentBadge) {
    percentBadge.textContent = `${percent}%`;
    if (percent === 100) {
      percentBadge.style.backgroundColor = '#155724';
      percentBadge.textContent = '100% Completed! 🎉';
    } else {
      percentBadge.style.backgroundColor = '#28a745';
    }
  }

  // Show Claim Certificate Button if quizzes completed or progress >= 50%
  if (claimCertBtn) {
    if (exploredTabIds.includes('tab-quizzes') || percent >= 50) {
      claimCertBtn.style.display = 'inline-flex';
    } else {
      claimCertBtn.style.display = 'none';
    }
  }
}

function resetExplorationProgress() {
  exploredTabIds = [];
  saveExploredTabs();
  updateExplorationUI();

  const tabs = document.querySelectorAll('.tab-button');
  const panels = document.querySelectorAll('.tab-panel');
  const basicsTab = document.getElementById('tab-basics');

  if (basicsTab) activateTab(basicsTab, tabs, panels);
  announceToScreenReader('Tab exploration progress reset. Scroll down inside any module to earn checkmarks.');
}

/* ==========================================================================
   STUDENT COMPLETION CERTIFICATE & BADGE SYSTEM
   ========================================================================== */
function initCertificate() {
  const dateDisplay = document.getElementById('cert-display-date');
  if (dateDisplay) {
    const today = new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    dateDisplay.textContent = today;
  }

  // Load saved student name
  const savedName = localStorage.getItem('emeritus_student_name');
  if (savedName) {
    const nameInput = document.getElementById('student-name-input');
    if (nameInput) nameInput.value = savedName;
    updateCertificateName(savedName);
  }
}

function updateCertificateName(nameVal) {
  const display = document.getElementById('cert-display-name');
  const clean = nameVal.trim();
  if (display) {
    display.textContent = clean.length > 0 ? clean : 'Emeritus Student';
  }
  localStorage.setItem('emeritus_student_name', clean);
}

function printCertificate() {
  announceToScreenReader('Opening print dialog for your Emeritus Completion Certificate PDF.');
  window.print();
}

function openCertificateSection() {
  const tabs = document.querySelectorAll('.tab-button');
  const panels = document.querySelectorAll('.tab-panel');
  const quizzesTab = document.getElementById('tab-quizzes');

  if (quizzesTab) {
    activateTab(quizzesTab, tabs, panels);
    setTimeout(() => {
      const certSection = document.getElementById('certificate-section');
      if (certSection) {
        certSection.scrollIntoView({ behavior: 'smooth' });
      }
    }, 200);
  }
}

/* ==========================================================================
   3. INTERACTIVE ZOOM TOOLBAR SIMULATOR
   ========================================================================== */
const simState = {
  isMuted: true,
  isVideoOn: false,
  isChatOpen: false,
  isParticipantsOpen: false,
  isShareOpen: false,
  isReactionsOpen: false,
  isCaptionsOn: false,
  isAIOpen: false
};

function toggleSimControl(control) {
  const drawerTitle = document.getElementById('sim-drawer-title');
  const drawerBody = document.getElementById('sim-drawer-body');
  const statusBanner = document.getElementById('sim-status');
  const avatar = document.getElementById('sim-avatar');

  // Toggle State & Highlight Active Button
  if (control === 'mute') {
    simState.isMuted = !simState.isMuted;
    const btn = document.getElementById('sim-btn-mute');
    const label = document.getElementById('sim-label-mute');

    if (simState.isMuted) {
      btn.classList.add('danger-state');
      label.textContent = 'Unmute';
      drawerTitle.innerHTML = '🎤 Microphone Status: MUTED';
      drawerBody.innerHTML = `
        <p><strong>What happened:</strong> Your microphone is turned off. Other participants cannot hear background sounds from your room.</p>
        <p><strong>Classroom Tip:</strong> Keep yourself muted during lectures unless called upon by your instructor. To quickly speak on laptops, hold down your <strong>Spacebar</strong> to temporarily unmute!</p>
      `;
    } else {
      btn.classList.remove('danger-state');
      label.textContent = 'Mute';
      drawerTitle.innerHTML = '🎤 Microphone Status: UNMUTED (Live)';
      drawerBody.innerHTML = `
        <p><strong>What happened:</strong> Your microphone is active and live! Everyone in class can hear your voice.</p>
        <p><strong>Classroom Tip:</strong> Speak clearly toward your device. Remember to click 'Mute' again as soon as you finish speaking.</p>
      `;
    }
  }

  else if (control === 'video') {
    simState.isVideoOn = !simState.isVideoOn;
    const btn = document.getElementById('sim-btn-video');
    const label = document.getElementById('sim-label-video');

    if (simState.isVideoOn) {
      btn.classList.remove('danger-state');
      label.textContent = 'Stop Video';
      avatar.style.background = '#28a745';
      avatar.innerHTML = '📷';
      drawerTitle.innerHTML = '📹 Camera Status: VIDEO ON';
      drawerBody.innerHTML = `
        <p><strong>What happened:</strong> Your camera is turned on. Your video stream is now visible to class participants.</p>
        <p><strong>Privacy Tip:</strong> Check your room lighting and background before turning video on. You can choose a virtual background in Zoom settings if preferred.</p>
      `;
    } else {
      btn.classList.add('danger-state');
      label.textContent = 'Start Video';
      avatar.style.background = '#0a4f70';
      avatar.innerHTML = 'ES';
      drawerTitle.innerHTML = '📹 Camera Status: VIDEO OFF';
      drawerBody.innerHTML = `
        <p><strong>What happened:</strong> Your camera is turned off. Classmates see your initials or profile picture instead of video.</p>
        <p><strong>Emeritus Note:</strong> It is completely fine to turn video off if you need to step away or conserve internet bandwidth!</p>
      `;
    }
  }

  else if (control === 'participants') {
    simState.isParticipantsOpen = !simState.isParticipantsOpen;
    drawerTitle.innerHTML = '👥 Participants Panel';
    drawerBody.innerHTML = `
      <p><strong>What it does:</strong> Opens a side panel listing everyone in the Zoom meeting room, including the host, co-hosts, and fellow students.</p>
      <p><strong>Useful Features:</strong> You can see who is currently speaking, find your own name to check your mute status, or rename yourself if needed.</p>
    `;
  }

  else if (control === 'chat') {
    simState.isChatOpen = !simState.isChatOpen;
    drawerTitle.innerHTML = '💬 In-Meeting Chat';
    drawerBody.innerHTML = `
      <p><strong>What it does:</strong> Opens the meeting chat panel where you can type messages, post questions, or receive web links shared by the instructor.</p>
      <p><strong>Classroom Tip:</strong> Check whether your chat message is set to <em>"Everyone"</em> or a private message to a specific person before hitting Send!</p>
    `;
  }

  else if (control === 'share') {
    drawerTitle.innerHTML = '🖥️ Share Screen Options';
    drawerBody.innerHTML = `
      <p><strong>What it does:</strong> Opens a menu letting you present a document, presentation, browser window, or your whole screen to the class.</p>
      <p><strong>Privacy Tip:</strong> Select a <em>specific application window</em> (like a document or PDF) rather than "Entire Screen" to avoid showing personal emails or open tabs.</p>
    `;
  }

  else if (control === 'reactions') {
    drawerTitle.innerHTML = '✋ Reactions & Raise Hand';
    drawerBody.innerHTML = `
      <p><strong>What it does:</strong> Lets you raise your virtual hand or send quick visual emojis (thumbs up, applause, heart) without interrupting the spoken lecture.</p>
      <p><strong>Classroom Tip:</strong> When you raise your hand, your video box moves to the top of the instructor's screen so they know you have a question!</p>
    `;
  }

  else if (control === 'captions') {
    simState.isCaptionsOn = !simState.isCaptionsOn;
    drawerTitle.innerHTML = 'CC Live Closed Captions';
    drawerBody.innerHTML = `
      <p><strong>What it does:</strong> Displays live spoken words as written text subtitles across the bottom of your Zoom meeting screen.</p>
      <p><strong>Emeritus Benefit:</strong> Live captions make it much easier to follow class discussions, especially in noisy environments or if audio is soft.</p>
    `;
  }

  else if (control === 'ai') {
    drawerTitle.innerHTML = '✨ ZoomMate / AI Companion';
    drawerBody.innerHTML = `
      <p><strong>What it does:</strong> Zoom's built-in AI assistant. In meetings where enabled by the host, ZoomMate can summarize discussion points or answer questions like "What did I miss?".</p>
      <p><strong>Privacy Check:</strong> Remember that AI Companion features capture meeting transcript context. Check with your class host regarding AI usage expectations.</p>
    `;
  }

  // Update Status Banner
  statusBanner.textContent = `Microphone: ${simState.isMuted ? 'Muted' : 'UNMUTED'} • Camera: ${simState.isVideoOn ? 'ON' : 'Off'} • Captions: ${simState.isCaptionsOn ? 'ON' : 'Off'}`;
  announceToScreenReader(drawerTitle.textContent);
}

/* ==========================================================================
   4. SLIDERS CONTROLLERS
   ========================================================================== */
function initSliders() {
  updateDeviceView(1);
  updateTimelineView(4);
  updateConfidenceView(3);
}

// Device View Slider (1: Desktop, 2: Mobile, 3: Web App)
function updateDeviceView(val) {
  const label = document.getElementById('device-slider-label');
  const output = document.getElementById('device-slider-output');
  if (!output) return;

  if (val == 1) {
    label.textContent = '1. Desktop App (Windows / Mac)';
    output.innerHTML = `
      <div style="font-size: 1.15rem; font-weight: bold; color: var(--primary-blue); margin-bottom: 8px;">
        💻 Desktop App (Windows & Mac) — Recommended for Class
      </div>
      <p><strong>Best for:</strong> Full class participation, multi-tasking, comfortable screen sharing, and continuous toolbar visibility.</p>
      <ul>
        <li><strong>Toolbar Layout:</strong> Full control toolbar stays visible at the bottom of your window.</li>
        <li><strong>Key Features:</strong> Easy gallery view of classmates, dual-monitor support, full audio/video settings.</li>
        <li><strong>Emeritus Tip:</strong> Recommended for primary class sessions on laptops or desktop computers.</li>
      </ul>
    `;
  } else if (val == 2) {
    label.textContent = '2. Mobile App (iPhone, iPad, Android)';
    output.innerHTML = `
      <div style="font-size: 1.15rem; font-weight: bold; color: var(--primary-blue); margin-bottom: 8px;">
        📱 Mobile App (Smartphones & Tablets) — On-the-Go Access
      </div>
      <p><strong>Best for:</strong> Joining class while traveling, portable video viewing, or quick text chat checking.</p>
      <ul>
        <li><strong>Toolbar Behavior:</strong> Control buttons automatically hide when the screen is still to save space.</li>
        <li><strong>How to show buttons:</strong> Simply <em>tap the center of your screen once</em> to bring controls back!</li>
        <li><strong>Emeritus Tip:</strong> Rotate your phone horizontally (landscape mode) to see a larger view of shared slides.</li>
      </ul>
    `;
  } else if (val == 3) {
    label.textContent = '3. Web App (Browser Zoom)';
    output.innerHTML = `
      <div style="font-size: 1.15rem; font-weight: bold; color: var(--primary-blue); margin-bottom: 8px;">
        🌐 Web App (Browser-Based Zoom) — Backup Access
      </div>
      <p><strong>Best for:</strong> Joining quickly when you cannot install the Zoom desktop app or are using a public computer.</p>
      <ul>
        <li><strong>Access Method:</strong> Opens directly inside Chrome, Safari, or Edge without downloading files.</li>
        <li><strong>Limitations:</strong> Some advanced features (such as custom virtual backgrounds or multi-screen sharing) may be limited.</li>
        <li><strong>Emeritus Tip:</strong> Great to know as a backup option if your main app ever needs an update emergency!</li>
      </ul>
    `;
  }
  announceToScreenReader(`Device view set to ${label.textContent}`);
}

// Timeline Slider (2020 - 2026)
function updateTimelineView(val) {
  const label = document.getElementById('timeline-year-label');
  const output = document.getElementById('timeline-slider-output');
  if (!output) return;

  if (val == 1) {
    label.textContent = '2020: Basic Video Meetings';
    output.innerHTML = `
      <div style="font-size: 1.15rem; font-weight: bold; color: var(--primary-blue); margin-bottom: 8px;">
        📹 2020: The Video Meeting Era
      </div>
      <p>Zoom was primarily used for live audio/video video conferencing, chat rooms, and screen sharing during remote learning.</p>
    `;
  } else if (val == 2) {
    label.textContent = '2022: Whiteboards & Team Chat';
    output.innerHTML = `
      <div style="font-size: 1.15rem; font-weight: bold; color: var(--primary-blue); margin-bottom: 8px;">
        🎨 2022: Collaboration Beyond Meetings
      </div>
      <p>Zoom introduced persistent digital Whiteboards and expanded Team Chat, allowing group planning and brainstorming to continue after meetings ended.</p>
    `;
  } else if (val == 3) {
    label.textContent = '2024: AI Companion 1.0';
    output.innerHTML = `
      <div style="font-size: 1.15rem; font-weight: bold; color: var(--primary-blue); margin-bottom: 8px;">
        🤖 2024: The Launch of AI Companion
      </div>
      <p>Zoom introduced AI Companion to automatically generate meeting summaries, capture action items, and draft chat responses for users.</p>
    `;
  } else if (val == 4) {
    label.textContent = '2026: Zoom Workplace & Agentic AI';
    output.innerHTML = `
      <div style="font-size: 1.15rem; font-weight: bold; color: var(--primary-blue); margin-bottom: 8px;">
        ✨ 2026: Zoom Workplace AI Productivity Suite
      </div>
      <p>Zoom transforms into a complete AI-supported workplace featuring <strong>ZoomMate</strong>, <strong>My Notes</strong>, <strong>Zoom Canvas</strong>, <strong>Slides</strong>, <strong>Sheets</strong>, and <strong>Paper</strong>—turning meeting conversations directly into actionable documents, slides, and workflows.</p>
    `;
  }
  announceToScreenReader(`Timeline set to ${label.textContent}`);
}

// Self-Assessment Confidence Slider
function updateConfidenceView(val) {
  const label = document.getElementById('confidence-rating-label');
  const output = document.getElementById('confidence-slider-output');
  if (!output) return;

  const ratings = [
    { title: "Level 1: Curious Beginner", desc: "You are getting started! Focus on joining class links, unmuting your microphone, and practicing with the Toolbar Simulator in Tab 2." },
    { title: "Level 2: Basic User", desc: "You comfortably join meetings and mute/unmute. Practice using In-Meeting Chat and raising your virtual hand under Reactions." },
    { title: "Level 3: Moderate Comfort", desc: "You know meeting controls well! Now explore the Before Class Checklist and check out device differences between mobile and desktop." },
    { title: "Level 4: Advanced Learner", desc: "You are ready to explore What's New! Check out Zoom Workplace tools like Whiteboards, Clips, and how My Notes captures class key takeaways." },
    { title: "Level 5: Tech Savvy Leader", desc: "Awesome! You understand Zoom AI privacy guidelines, Zoom Canvas, and can help fellow Emeritus classmates troubleshoot their controls!" }
  ];

  const current = ratings[val - 1];
  label.textContent = current.title;
  output.innerHTML = `
    <div style="font-size: 1.15rem; font-weight: bold; color: var(--primary-blue); margin-bottom: 8px;">
      🌟 Recommended Focus for You: ${current.title}
    </div>
    <p>${current.desc}</p>
  `;
  announceToScreenReader(`Confidence level set to ${current.title}`);
}

/* ==========================================================================
   5. SCENARIO AI PRIVACY EVALUATOR
   ========================================================================== */
function evaluateScenario(scenKey) {
  const btns = document.querySelectorAll('.scenario-btn');
  btns.forEach(b => b.classList.remove('selected'));

  const activeBtn = document.getElementById(`scen-${scenKey}`);
  if (activeBtn) activeBtn.classList.add('selected');

  const output = document.getElementById('scenario-evaluation-result');
  if (!output) return;

  const scenarios = {
    class: {
      title: "🎓 Emeritus Classroom Discussion",
      badge: "<span style='background:#d4edda; color:#155724; padding:6px 12px; border-radius:6px; font-weight:bold;'>✅ Recommended (With Instructor Guidance)</span>",
      capture: "Audio transcript, lecture notes, shared slides, chat questions.",
      access: "Class members, instructor, or meeting host.",
      advice: "AI summaries (ZoomMate / My Notes) are very helpful for reviewing complex lectures. Ensure the instructor has enabled AI Companion for the class session."
    },
    health: {
      title: "🩺 Private Doctor / Healthcare Consultation",
      badge: "<span style='background:#f8d7da; color:#721c24; padding:6px 12px; border-radius:6px; font-weight:bold;'>🔴 Privacy Caution: Turn OFF AI Notes</span>",
      capture: "Sensitive personal medical details, symptoms, prescriptions.",
      access: "Potentially saved to cloud transcripts or third-party AI processing.",
      advice: "Do NOT enable AI Companion, My Notes, or recording during private telehealth visits without explicit doctor/patient HIPAA privacy consent."
    },
    group: {
      title: "👥 Student Group Project & Study Session",
      badge: "<span style='background:#d4edda; color:#155724; padding:6px 12px; border-radius:6px; font-weight:bold;'>✅ Highly Useful for Action Items</span>",
      capture: "Group brainstorming, sticky notes, task assignments, meeting outline.",
      access: "All group project members.",
      advice: "Great scenario to use <strong>Zoom Canvas</strong> or <strong>My Notes</strong>! AI can automatically turn your group brainstorming into a shared document or task list."
    },
    family: {
      title: "🏡 Family Chat / Personal Friendship Call",
      badge: "<span style='background:#fff3cd; color:#856404; padding:6px 12px; border-radius:6px; font-weight:bold;'>⚠️ Check Participant Comfort First</span>",
      capture: "Personal family news, photos, casual conversation.",
      access: "Family members present in call.",
      advice: "Ask family members if they are comfortable before turning on AI summaries or recording. Casual calls rarely require AI transcripts."
    }
  };

  const data = scenarios[scenKey];
  output.innerHTML = `
    <div style="margin-bottom: 12px;">${data.badge}</div>
    <h4 style="margin-top:0; color: var(--primary-blue); font-size: 1.25rem;">${data.title}</h4>
    <p><strong>What AI Captures:</strong> ${data.capture}</p>
    <p><strong>Who Sees Output:</strong> ${data.access}</p>
    <div class="callout-box info" style="margin-top:12px; padding:14px;">
      <strong>Emeritus Student Guidance:</strong> ${data.advice}
    </div>
  `;
  announceToScreenReader(`Evaluated scenario for ${data.title}`);
}

/* ==========================================================================
   6. CHECKLIST & QUIZZES LOGIC
   ========================================================================== */
function updateChecklistProgress() {
  const checkboxes = document.querySelectorAll('.chk-readiness');
  const total = checkboxes.length;
  let checkedCount = 0;

  checkboxes.forEach(c => {
    if (c.checked) checkedCount++;
  });

  const percentage = Math.round((checkedCount / total) * 100);
  const percentLabel = document.getElementById('checklist-percent');
  const barFill = document.getElementById('checklist-bar-fill');
  const congrats = document.getElementById('checklist-congrats');

  if (percentLabel) percentLabel.textContent = `${percentage}% Ready`;
  if (barFill) {
    barFill.style.width = `${percentage}%`;
    barFill.setAttribute('aria-valuenow', percentage);
  }

  if (congrats) {
    if (percentage === 100) {
      congrats.style.display = 'block';
      announceToScreenReader('Congratulations! You are 100 percent ready for class!');
    } else {
      congrats.style.display = 'none';
    }
  }
}

// Grading Quiz 1 (Zoom Basics)
function gradeQuiz1() {
  const opt1 = document.getElementById('q1-opt1').checked; // Correct
  const opt2 = document.getElementById('q1-opt2').checked; // Correct
  const opt3 = document.getElementById('q1-opt3').checked; // Incorrect
  const opt4 = document.getElementById('q1-opt4').checked; // Correct

  const feedback = document.getElementById('quiz-1-feedback');
  if (!feedback) return;

  feedback.style.display = 'block';

  // Mark Quiz & Checklist tab as completed when quiz is answered
  markQuizTabCompleted();

  if (opt1 && opt2 && !opt3 && opt4) {
    feedback.className = 'quiz-feedback-box correct';
    feedback.innerHTML = `
      🎉 <strong>Spot on! Excellent Job!</strong> (Score: 100%)
      <br>• Options A, B, and D are all correct!
      <br>• Option C is incorrect because keeping yourself unmuted causes background noise for the class.
    `;
    announceToScreenReader('Quiz 1 completed with 100 percent correct score. Tab checkmark earned!');
  } else {
    feedback.className = 'quiz-feedback-box incorrect';
    feedback.innerHTML = `
      💡 <strong>Review Feedback:</strong>
      <br>• <strong>Option A is Correct:</strong> Zoom Workplace includes chat, whiteboards, notes, and clips.
      <br>• <strong>Option B is Correct:</strong> Tapping a mobile screen brings controls back.
      <br>• <strong>Option C is False:</strong> You should stay MUTED when not speaking.
      <br>• <strong>Option D is Correct:</strong> Raising your virtual hand lets you ask questions politely.
    `;
    announceToScreenReader('Quiz 1 submitted. Review feedback on screen. Tab checkmark earned!');
  }
}

// Grading Quiz 2 (What's New & AI Safety)
function gradeQuiz2() {
  const opt1 = document.getElementById('q2-opt1').checked; // Correct
  const opt2 = document.getElementById('q2-opt2').checked; // Correct
  const opt3 = document.getElementById('q2-opt3').checked; // Incorrect
  const opt4 = document.getElementById('q2-opt4').checked; // Correct

  const feedback = document.getElementById('quiz-2-feedback');
  if (!feedback) return;

  feedback.style.display = 'block';

  // Mark Quiz & Checklist tab as completed when quiz is answered
  markQuizTabCompleted();

  if (opt1 && opt2 && !opt3 && opt4) {
    feedback.className = 'quiz-feedback-box correct';
    feedback.innerHTML = `
      🎉 <strong>Perfect Score! Outstanding AI Awareness!</strong> (Score: 100%)
      <br>• Options A, B, and D are all correct!
      <br>• Option C is false because private medical visits require strict privacy & consent.
    `;
    announceToScreenReader('Quiz 2 completed with 100 percent correct score. Tab checkmark earned!');
  } else {
    feedback.className = 'quiz-feedback-box incorrect';
    feedback.innerHTML = `
      💡 <strong>Review Feedback:</strong>
      <br>• <strong>Option A is Correct:</strong> ZoomMate & AI Companion refer to Zoom's AI assistant.
      <br>• <strong>Option B is Correct:</strong> Zoom Canvas builds visual documents from notes.
      <br>• <strong>Option C is False:</strong> Do NOT enable AI on private medical appointments without consent.
      <br>• <strong>Option D is Correct:</strong> Always double-check AI summaries for accuracy.
    `;
    announceToScreenReader('Quiz 2 submitted. Review feedback on screen. Tab checkmark earned!');
  }
}

/* ==========================================================================
   7. TERMINOLOGY GLOSSARY & SEARCH
   ========================================================================== */
const glossaryData = [
  { term: "Zoom Workplace", def: "Zoom's integrated platform combining video meetings, team chat, whiteboards, notes, docs, clips, and AI tools into one connected workspace.", tip: "Think of Zoom Workplace as the full umbrella app, with video calls being just one feature." },
  { term: "ZoomMate / AI Companion", def: "Zoom's built-in artificial intelligence assistant designed to summarize meetings, catch you up on missed points, and answer search queries.", tip: "Look for the spark icon ✨ in Zoom to access AI Companion features." },
  { term: "My Notes", def: "An AI note-taking tool that captures notes, key takeaways, and action items from Zoom meetings, mobile calls, and external platforms.", tip: "My Notes helps you keep class takeaways organized in one personal place." },
  { term: "Zoom Canvas", def: "An AI-powered collaborative workspace that transforms conversation notes into interactive documents, tables, and wikis.", tip: "Great for group study projects where everyone can build a document together." },
  { term: "Zoom Clips", def: "Short recorded screen or video messages that can be shared with classmates without needing a live meeting.", tip: "Use Clips when you want to show a quick screen update or explanation." },
  { term: "Zoom Slides", def: "A tool within Zoom AI Productivity Suite that generates presentation slides from meeting transcripts or typed prompts.", tip: "Can export directly to Microsoft PowerPoint files." },
  { term: "Zoom Sheets", def: "An AI spreadsheet tool that lets you organize, clean, and ask natural language questions about data tables.", tip: "Useful for managing class budgets, rosters, or schedules." },
  { term: "Zoom Paper", def: "A polished document editing workspace that imports and exports Word and Google Docs files.", tip: "Helps you turn class meeting notes into a finished written essay or report." },
  { term: "Agentic Search", def: "Broad search across your Zoom content, web sources, and connected cloud services (like Google Drive or OneDrive).", tip: "Allows you to ask Zoom questions like 'Find the meeting notes from last Tuesday'." },
  { term: "Voice Translator", def: "A feature in Zoom providing live spoken audio translation across supported languages during meetings.", tip: "Helps students follow along when presentations are given in different languages." },
  { term: "Whiteboard", def: "A digital drawing and planning board with sticky notes, shapes, and drawing tools for live brainstorming.", tip: "Instructors often use whiteboards for group diagram exercises." },
  { term: "Live Captions (CC)", def: "Real-time subtitles displayed across the screen during a meeting.", tip: "Always turn on CC if you find spoken audio hard to hear clearly." }
];

function initGlossary() {
  renderGlossary('');
}

function filterGlossary(searchTerm) {
  renderGlossary(searchTerm);
}

function renderGlossary(searchTerm) {
  const container = document.getElementById('glossary-card-container');
  if (!container) return;

  const term = searchTerm.toLowerCase().trim();
  const filtered = glossaryData.filter(item => 
    item.term.toLowerCase().includes(term) || 
    item.def.toLowerCase().includes(term) ||
    item.tip.toLowerCase().includes(term)
  );

  if (filtered.length === 0) {
    container.innerHTML = `<p style="grid-column: 1/-1; text-align: center; font-size: 1.1rem; color: var(--text-muted);">No matching Zoom terms found. Try searching for "Canvas", "Notes", or "Mute".</p>`;
    return;
  }

  container.innerHTML = filtered.map(item => `
    <article class="term-card">
      <h4>${item.term}</h4>
      <p>${item.def}</p>
      <div style="background: rgba(10,79,112,0.06); padding: 10px; border-radius: 6px; border-left: 4px solid var(--primary-blue); font-size: 0.95rem; margin-top: 10px;">
        💡 <strong>Emeritus Tip:</strong> ${item.tip}
      </div>
    </article>
  `).join('');
}
