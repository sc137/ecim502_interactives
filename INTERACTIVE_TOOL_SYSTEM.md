# Emeritus Interactive Tool System

This document is the shared design, development, content, and quality reference for Emeritus interactive learning tools. New tools should follow this system unless a documented learning need requires a variation.

The shared implementation is maintained in `templates/` and `shared/`. Tool-specific lessons and activities remain in each tool folder. Existing public URLs and Canvas links stay unchanged.

Implementation references below describe the current code. Requirements and quality checklists are authoring standards to verify for each change, not a claim that every browser or assistive technology has passed a formal audit.

## 1. Goals

Each tool should be:

- easy for learners to open in a browser without installing anything or running a build;
- visually consistent with the other Emeritus tools;
- usable with a mouse, keyboard, touchscreen, screen reader, and enlarged text;
- written in direct, learner-friendly language;
- accurate as of its displayed update date;
- useful as guided instruction and as a later reference.

Consistency applies to the page frame, typography, controls, accessibility behavior, responsive layout, footer, and quality checks. Topic-specific lessons and activities should be adapted to the learning objective.

## 2. Standard File Structure

Create one tool folder directly under the repository root. The builder discovers `*/page.json` at that level:

```text
interactives/
├── README.md
├── INTERACTIVE_TOOL_SYSTEM.md
├── templates/                 # page, header, navigation, tab, footer, slideshow
├── shared/
│   ├── learning.css           # themes, common page frame and components
│   ├── orientation.css        # additional Firefox/Canvas components
│   ├── mobile-accessibility.css # compact controls, mobile menu and table cards
│   ├── ui.js                  # display controls, tabs and mobile section selector
│   └── README.md              # shared implementation notes
├── tools/
│   ├── build.py
│   ├── check.py
│   └── test_build.py           # mobile-table generator regression tests
└── tool-name/
    ├── page.json              # title, sources, navigation, preferences
    ├── content.html           # lesson markup and certificate content
    ├── app.js                 # topic activities and completion rules
    ├── style.css              # topic-specific styles
    └── index.html             # generated, published entry page
```

Requirements:

- Edit `content.html`, `page.json`, and the local activity files; do not hand-edit generated `index.html` files.
- Edit common frame markup in `templates/`; edit shared styles and controls in `shared/`.
- Run `python3 tools/build.py` after changing templates, content, metadata, scripts, or styles. Commit the generated pages together with their sources when publishing is authorized.
- Stylesheets listed in `page.json`, the shared `ui.js`, and the local `app.js` receive content-hash query strings in generated URLs. Rebuild after changing those assets. Images and ordinary content links are not automatically versioned. Already-open previews may still need to be refreshed.
- Run `python3 tools/check.py` and `python3 tools/test_build.py` before publication. `python3 tools/build.py --check` detects stale generated pages without writing files. The check script invokes that freshness check, verifies README entry paths, local asset/anchor paths, unique IDs, and accessible ID references. It does not validate external URLs, lesson facts, rendered CSS, or browser accessibility; check those separately.
- The authoring scripts use Python 3 and its standard library; no Python packages are required. Python is an authoring tool only. The published site is ordinary HTML/CSS/JavaScript and requires no framework, server application, or build at runtime.
- Each public tool remains at its existing folder URL. Keep the shared folder at the same repository level so `../shared/` asset links resolve on GitHub Pages.
- New tools use `page.json` and `content.html` from an existing tool as a starting point. Adapt their metadata, navigation, preference keys, lesson content, and activity rules; build the entry page from the shared template.
- The slideshow uses its own presentation template and local layout while sharing text-size behavior. Do not force a slideshow into the lesson tab layout.
- Avoid adding external dependencies unless they are essential and documented.

### Page configuration and source ownership

`page.json` supplies the page metadata and shared-frame configuration:

- `head_title` and `description`: browser title and description metadata.
- `title`: the lesson-page heading.
- `updated` and `sources`: footer update date and author-controlled source-link HTML for lesson pages.
- `stylesheets`: ordered relative paths. Lesson pages load `../shared/learning.css`, optionally `../shared/orientation.css`, their own `style.css`, and finally `../shared/mobile-accessibility.css`.
- `navigation.tabs`: section entries containing `id`, `panel`, `label`, and an optional `badge_id`. Keep their IDs consistent with `content.html` and the local activity code.
- `navigation.percent`, `navigation.claim`, and `navigation.reset`: whether to include the desktop percentage badge, plus the existing tool-specific claim/reset button markup and hooks. These HTML values are trusted authoring content, not learner input.
- `settings.preferences.font` and `.theme`: optional tool-specific storage keys. `encoding: "json"` preserves Prompt Examples’ existing storage format. Missing keys disable persistence for those display preferences.
- `layout: "slideshow"`: selects the separate slideshow template. Its `content.html` owns its presentation header, slide navigation, and disclosures; its settings also identify the alternate slider, indicator, and announcement IDs.

The shared templates generate lesson headers, navigation, tab markup, and footers. Each lesson’s `content.html` contains its `<main>`, sections, activities, and certificate markup. Certificate content and gating remain local responsibilities; there is no shared certificate HTML template. Do not add a second header, navigation bar, footer, or shared-script tag to lesson content.

Edit common themes and reusable components in `shared/learning.css`. Firefox and Canvas additionally use `shared/orientation.css`; neither tool should import the other tool’s stylesheet. Keep topic-specific overrides in the local stylesheet. Rebuild after editing any CSS or JavaScript so the generated asset URLs stay current.

## 3. Standard Page Architecture

The shared lesson-page template uses this order. The slideshow is a documented presentation-layout exception:

1. Skip-to-content link.
2. Screen-reader announcement region.
3. Header with title, Emeritus Institute student subtitle, and accessibility controls.
4. Section navigation with exploration progress and reset control (desktop tabs; mobile dropdown).
5. Main content containing one panel per section.
6. Completion certificate content within that main content, placed according to the tool’s activity design.
7. Footer with attribution, sources/support, and update date.
8. Shared display-control script followed by local activity JavaScript at the end of the body.

### Header

The header should contain:

- a descriptive `<h1>`, normally **[Topic] Interactive**, without adding “Guide”; established descriptive names such as **Software Update Checklist** and the slideshow title are exceptions;
- the subtitle **An interactive learning tool for Emeritus Institute students.**;
- a desktop text-size slider (hidden at widths up to 768px);
- Normal, Large, and Extra Large presets;
- Default Light, High Contrast Dark, and High Contrast B&W themes.

Mobile theme labels are shortened to **Light theme**, **Dark theme**, and **B&W theme**. The underlying theme values and available choices are unchanged.

Do not place decorative emoji in the header.

### Navigation

Use a semantic tab interface on desktop and a native section selector on mobile:

- `<nav>` with a useful accessible label;
- `<ul role="tablist">`;
- one `<button role="tab">` per panel;
- `aria-selected`, `aria-controls`, and roving `tabindex`;
- matching `<section role="tabpanel">` elements with `aria-labelledby`.

Keyboard behavior must support:

- Left and Right Arrow to move between tabs;
- Home to select the first tab;
- End to select the last tab;
- normal Tab navigation into panel controls.

Do not use decorative emoji in tab labels, the exploration summary, reset controls, or certificate-claim controls. The one exception is the completion badge: after a tab has actually been completed, display a visible `✅` and provide **Explored** as screen-reader-only text. Do not display the word **Explored** visually in the tab.

Use this badge structure consistently:

```html
<span class="tab-check-badge" id="check-tab-example">
  <span aria-hidden="true">✅</span><span class="sr-only"> Explored</span>
</span>
```

The shared runtime synchronizes the mobile section selector with the same activation callbacks as desktop tabs. Mobile panels are labeled regions; desktop panels retain their tabpanel roles. Resizing preserves the current section. The reset action invokes the tool’s existing reset control. Previous is disabled at the first section and Next at the last; these controls do not wrap. Choosing a section or using Previous/Next focuses the selected panel. Desktop tab-keyboard navigation keeps focus on the selected tab.

Keep the entire `.tab-check-badge` hidden until the tab earns completion. This prevents the visually hidden status from entering the tab's accessible name before completion.

### Main Content

Every panel starts with one `<h2 class="section-heading">`. Use `<h3>` and `<h4>` in a logical hierarchy below it.

Reusable panel types include:

- concept overview or basics;
- safe practice simulator;
- timeline or comparison activity;
- privacy, safety, or decision evaluator;
- readiness checklist and knowledge checks;
- searchable glossary.

Not every tool needs every panel type. Select activities that support the topic rather than filling a fixed quota.

### Footer

Keep the footer format consistent:

1. Professor Sable / Emeritus Institute attribution link.
2. A topic-specific primary-source or official-support statement.
3. `Last Updated: M/D/YY`.

Update the date whenever substantive content, behavior, or source information changes.

## 4. Visual Design System

### Typography

Use the system font stack defined in `shared/learning.css`:

```css
-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif
```

Shared type rules:

- lesson base size: 20 pixels at 100%;
- line height: 1.6;
- text presets: 100%, 118%, and 135%;
- adjustable range: 90% through 140%;
- strong, visible heading hierarchy;
- comfortable line lengths and spacing.

The slideshow is a presentation-layout exception: it uses a 16-pixel scaled root, larger responsive presentation text, an Arial-based font stack, and a 1.45 body line height in its local stylesheet. It shares the 100%/118%/135% presets but does not offer the lesson contrast selector.

Do not reduce the lesson base text size to fit more content. Improve layout and wrapping instead.

### Color Tokens

Preserve CSS custom properties rather than inserting new colors throughout the page. The main tokens cover:

- page and card backgrounds;
- navigation and primary blue;
- main and muted text;
- borders and focus indicators;
- success, warning, danger, and information states;
- default, dark, and high-contrast-light themes.

Pair foreground and background tokens correctly: use `--text-on-primary` on `--primary-blue`, and `--text-nav` on `--bg-nav`. Do not assume white text will remain readable when a dark theme makes an accent background lighter.

New lesson components must use these tokens and remain readable in all three themes. Do not rely on color alone to communicate state.

### Components

Reuse existing classes for:

- section and subsection headings;
- information cards and card grids;
- information, warning, danger, and success callouts;
- data tables and responsive table containers;
- primary and accessibility buttons;
- sliders and output regions;
- quizzes and feedback;
- progress bars;
- glossary cards;
- simulator controls;
- certificate layout.

Prefer reusable classes over inline styles when adding or revising components.

### Emoji Policy

Use emoji sparingly. They should provide instructional meaning, not routine decoration.

Do not use decorative emoji in:

- the page header;
- tab labels;
- exploration and reset controls;
- certificate-claim controls;
- product-name tables;
- caution or transparency headings.

The sole routine UI exception is the `✅` tab-completion badge described under Navigation. Hide that checkmark from assistive technology with `aria-hidden="true"` and pair it with screen-reader-only **Explored** text. Do not use emoji as the only label for a control or status.

## 5. Accessibility Requirements

Accessibility is part of the base system, not a later enhancement.

### Structure and Navigation

- Include a visible-on-focus skip link.
- Use one `<h1>` and a logical heading hierarchy.
- Use semantic buttons, labels, lists, tables, captions, and landmarks.
- Keep focus indicators visible in every theme.
- Maintain generous click and touch targets, generally at least 44 by 44 pixels.
- Avoid keyboard traps and hover-only information.

### Dynamic Controls

- Use `aria-pressed` for toggle or preset buttons.
- Update accessible labels when a control changes action or state.
- Add `aria-valuetext` when a slider's numeric value represents a named choice.
- Keep `aria-selected` and `tabindex` synchronized for tabs.
- Announce meaningful results through the shared polite live region.
- Do not leave visually hidden status text in a control's accessible name when that status is false.

### Content and Feedback

- Write link text that describes its destination.
- Identify links that open a new tab.
- Pair color-coded feedback with explicit words such as Correct, Review, Warning, or Completed.
- Give actionable quiz feedback, not only a score.
- Provide table captions and column or row scopes.
- Ensure generated or changing content remains readable at 135% text and browser zoom.

Do not describe a tool as formally WCAG conformant without an appropriate conformance audit. The design target is WCAG 2.1 AA usability.

## 6. Responsive and Mobile Rules

The main breakpoint is 768 pixels.

At mobile widths:

- the title group sits above the compact, two-column accessibility controls;
- load `../shared/mobile-accessibility.css` after the local stylesheet to omit the font slider on mobile while preserving Normal, Large, Extra Large, and contrast controls;
- controls wrap without creating page-level horizontal overflow;
- the main navigation is not sticky;
- JavaScript-enabled lesson pages use a labeled section dropdown, Previous/Next controls, and a section counter;
- Reset exploration is an action in that mobile dropdown;
- progress is shortened to “Explored X/Y” on mobile;
- text-size presets and the theme picker use a two-column layout (Normal/Large, then Extra Large/Theme);
- desktop retains the keyboard-accessible tab row; JavaScript is required for section switching, assessments, progress, and certificates; without it, initially visible lesson content and links remain readable, but the visible tab buttons do not become working navigation;
- selecting a section positions its panel near the top;
- simple read-only tables are generated as single-column mobile cards from the same source data; desktop retains the semantic table;
- tables that cannot be safely converted remain tables; authors must supply a keyboard-accessible scrolling wrapper for them;
- simulator controls wrap into usable touch targets;
- text enlargement must not push controls offscreen.

The desktop tab row may wrap or scroll according to the lesson stylesheet. The page itself must not overflow horizontally. Do not use a tall sticky mobile menu that covers lesson content.

Minimum mobile verification:

- 320 by 844 and 390 by 844 pixels at both Normal and Extra Large text;
- no page-level horizontal overflow;
- no offscreen buttons, inputs, links, or selects;
- navigation scrolls out of view with the page.

### Source tables and mobile cards

Author one semantic `<table class="emeritus-table">` in `content.html`, with a caption, explicit `<thead>` and `<tbody>`, and consistent column counts. The first cell in each body row becomes that mobile card’s title; the remaining cells become labeled details using the column headings. Desktop keeps the original table. At widths up to 768 pixels, the card view is shown and the original table is hidden. Only one reading view is exposed at a time, and the cards do not require JavaScript.

The current generator converts simple read-only comparison tables. It leaves tables unchanged when they lack the required header/body structure, have inconsistent columns or merged cells, contain nested tables or form controls, or contain IDs inside cell content. It does not generate interactive duplicate controls. Keep complex tables in a `.data-table-container` with `tabindex="0"`, `role="region"`, and a caption-linked accessible name; the mobile stylesheet provides a minimum table width for contained horizontal scrolling. The generator does not add those wrapper semantics automatically.

Edit the source table, not the generated card markup. Rebuilding updates both views. `tools/test_build.py` covers simple conversion, link preservation, and safe fallback for interactive, merged, ID-bearing, and inconsistent cells.

## 7. Exploration, Assessment, and Certificates

Progress must represent meaningful learner activity.

- Opening a tab does not mark it explored.
- Reading sections require the tool’s viewing interval and end-of-content condition. Practice sections may also require simulations, review confirmations, or other tasks. Those conditions belong to the local activity code.
- A quiz panel is completed only after all required knowledge checks are answered correctly.
- Blank or incorrect submissions provide feedback but do not award completion.
- The certificate claim control appears only at 100% completion.
- Selecting **Claim Certificate** opens or focuses the certificate and, where present, its optional personalization controls. Credit Freeze offers an optional certificate name or nickname kept only in page memory, with “Emeritus Student” as the blank-field default.
- Reset Exploration clears earned exploration and current quiz-completion state.
- Saved progress is filtered to valid tab identifiers before use.

Use tool-specific storage keys. Display-preference keys are configured under `settings.preferences` in `page.json`; existing keys are retained so saved preferences survive consolidation. Activity progress and learner-name policies remain in the local `app.js`. Credit Freeze has an empty preferences object and writes nothing to browser storage. Do not introduce global progress or personal-data storage through the shared runtime.

Full-sequence Emeritus interactive tools should include a completion certificate unless the course requirements explicitly exclude it. The certificate should:

- use the standard **Claim Certificate** control without decorative emoji;
- display **Intermediate Life & Technology Integration** at the top of the printable certificate;
- display the certificate attribution on two lines: **Professor Sable**, then **Emeritus Institute**;
- remain unavailable until exploration reaches 100%;
- if a name field is appropriate for the lesson, insert its value safely using `textContent`, never unsanitized `innerHTML`; privacy-sensitive tools may omit the field entirely;
- display the award date;
- support printing or saving as a PDF;
- print the certificate without the surrounding navigation, lesson, or form controls.

## 8. Content and Accuracy Standards

### Research

- Verify time-sensitive claims against current primary or official sources.
- Prefer official product documentation, release notes, standards, laws, or institutional guidance.
- Record the review date in the footer.
- Recheck product names, availability, account requirements, platform limitations, and administrator-controlled settings.
- Distinguish related products rather than treating renamed, bundled, and add-on products as equivalent.

### Wording

- Use plain language and define unfamiliar terms.
- State when availability depends on plan, platform, administrator settings, permissions, or usage credits.
- Avoid absolute statements when behavior depends on settings.
- Do not imply that personal notes, summaries, or recordings are automatically shared unless the source confirms it.
- Avoid presenting legal, medical, privacy, or compliance guidance as a universal rule. Direct learners to applicable organizational policy, notice, consent, and legal requirements.
- Review every quiz answer whenever source content changes.

### Source Support

The footer should link to the most authoritative support location. For rapidly changing topics, consider adding source links near the relevant content as well.

## 9. JavaScript Conventions

- Lesson scripts initialize topic behavior from one `DOMContentLoaded` handler. The slideshow uses an immediate initializer at the end of the already-rendered page. In both layouts, shared `ui.js` loads before the local script and initializes display controls from the generated settings.
- Reuse `EmeritusUI.bindTabs(tabs, activate)` for click and Arrow/Home/End behavior. Each local activation callback retains its own completion timing and panel rules.
- Keep functions grouped by feature with clear section comments.
- Store shared interaction state in small, named objects or variables.
- Check for required elements before updating them.
- Keep accessible state and visual state synchronized in the same function.
- Use `textContent` for plain text. Use `innerHTML` only for controlled, developer-authored markup.
- Never insert unsanitized learner input with `innerHTML`.
- Keep topic data, such as glossary entries and decision scenarios, in structured arrays or objects.
- Avoid external JavaScript dependencies for features that can be implemented directly.

## 10. Build Workflow for a New Tool

1. Define the audience, learning objectives, and required activities.
2. Create the new folder using an existing tool’s `page.json`, `content.html`, and local activity files. Choose the shared lesson template or the slideshow template.
3. Update `page.json` titles, description, source/date metadata, section definitions, button hooks, stylesheet paths, and preference keys. Update matching IDs, activity/progress keys, and topic-specific classes or comments in the lesson files.
4. Select only the panel types that support the learning objectives.
5. Research current primary sources before writing time-sensitive content.
6. Adapt examples, simulations, decision scenarios, quizzes, and glossary entries.
7. Confirm that every quiz answer matches the instructional content and current sources.
8. Adapt and verify the completion certificate title, description, date, personalization, and print layout.
9. Update the source links and last-updated date in `page.json`, then run `python3 tools/build.py`.
10. Add the tool link to the root `README.md`.
11. Run `python3 tools/check.py` and `python3 tools/test_build.py`, then complete the browser and release checklist below. Publish generated entry pages, templates, sources, and assets together when authorized. Content and metadata edits require regenerated entry pages; CSS/JS edits also require a rebuild to refresh the versioned asset URLs.

## 11. Required Quality Checklist

### Content

- [ ] Title, metadata, audience language, and topic terminology are correct.
- [ ] Time-sensitive claims were checked against current primary sources.
- [ ] Account, platform, permission, and availability limits are stated.
- [ ] Quiz answers match the reviewed source material.
- [ ] Glossary searches return results for the examples suggested to learners.
- [ ] Footer source/support link and last-updated date are current.

### Interaction

- [ ] Every tab opens the correct panel.
- [ ] Arrow, Home, and End keys work in the tab list.
- [ ] Opening a tab alone does not award completion.
- [ ] Reading completion and any required practice/review conditions award exploration correctly.
- [ ] Blank and incorrect quizzes do not award completion.
- [ ] Required correct quizzes do award completion.
- [ ] Claim Certificate appears only at 100% and opens the certificate section.
- [ ] Optional certificate personalization, award date, and print/save layout work correctly; generic certificates do not require a name.
- [ ] Reset Exploration behaves as labeled.

### Accessibility

- [ ] Skip link, landmarks, headings, labels, and table captions are present.
- [ ] Focus remains visible in every theme.
- [ ] Dynamic labels, `aria-pressed`, `aria-selected`, and `aria-valuetext` remain accurate.
- [ ] Hidden completion labels are not announced before completion.
- [ ] Completed tabs show only a visible `✅` badge while exposing **Explored** to screen readers.
- [ ] Feedback and progress changes are announced appropriately.
- [ ] Information is not communicated by color or emoji alone.

### Responsive Layout

- [ ] Desktop layout is readable and keyboard usable.
- [ ] Mobile navigation is a compact, non-sticky section dropdown with working Previous/Next, boundary states, section counter, and reset action.
- [ ] Switching between desktop and mobile preserves the selected section and the appropriate tabpanel/region roles.
- [ ] Mobile progress uses “Explored X/Y”; Normal/Large and Extra Large/Theme occupy two control rows.
- [ ] The page has no horizontal overflow at 320 and 390 pixels wide.
- [ ] Normal and Extra Large text have no offscreen controls.
- [ ] Converted tables show labeled single-column cards on mobile and semantic tables on desktop.
- [ ] Unconverted tables stay readable and keyboard-scrollable inside their containers.

### Technical and Release Checks

- [ ] JavaScript syntax passes `node --check`.
- [ ] Browser console has no errors or warnings during core interactions.
- [ ] `git diff --check` passes.
- [ ] `python3 tools/check.py` passes (generated pages, README paths, IDs, accessible references, and local assets).
- [ ] `python3 tools/test_build.py` passes (mobile-table conversion and safe fallbacks).
- [ ] Only intended files are included in the commit.
- [ ] The live URL works after publishing.
- [ ] The root README contains the new tool link.

## 12. Maintaining This System

Update this document when a shared design decision changes. Do not silently let individual tools drift from the system.

When one tool produces a better shared pattern:

1. verify the pattern on desktop, mobile, keyboard, and enlarged text;
2. document the decision here;
3. update the shared template, stylesheet, or control implementation;
4. apply the improvement to other tools when practical.

Topic content will change frequently. The shared system should remain stable, documented, and reusable.

## 13. Privacy-Sensitive Lessons

For identity and financial topics, use fictional states instead of replicas asking for identity details. Do not collect or persist sensitive learner information. An optional certificate display name may be used without requesting sensitive identity details. Credit Freeze keeps the optional display name, practice, and progress only in page memory and clears them on reset or reload; no real requests are sent. Verify bureau links and phone numbers against each bureau’s own site.
