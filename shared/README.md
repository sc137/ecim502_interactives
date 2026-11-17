# Shared learning-tool foundation

`templates/` owns the common static page, header, navigation, tab markup, and footer. `tools/build.py` combines those templates with each tool’s `page.json` and `content.html` to generate its existing `index.html`. The slideshow has a separate presentation template.

`learning.css` owns the lesson themes, typography, page frame, common cards, controls, feedback, and certificate styles. `orientation.css` adds components shared by Firefox and Canvas. Topic-specific rules remain in the local `style.css`; Canvas no longer imports another tool’s stylesheet.

`ui.js` owns text-size controls, contrast controls, Arrow/Home/End tab bindings, and the mobile section dropdown with Previous/Next, compact exploration counts, and reset action. Desktop keeps tabs; mobile exposes section content as labeled regions. Both views use the same local activation and reset callbacks. It loads before the local activity script. Existing tool-specific preference keys and encoding are supplied in `page.json`. Storage failures are handled as optional persistence failures. An empty preferences object means no preference storage; Credit Freeze uses this mode. The shared runtime never stores learner names, quiz answers, or activity progress.

Tool-specific scripts retain completion rules, reset behavior, simulations, quizzes, certificates, and any existing progress/name storage policy. No activity is completed simply by the shared tab binding.

Simple read-only source tables are rendered as semantic tables on desktop and labeled single-column cards on mobile. The generator declines to duplicate complex tables or cells with IDs/controls; those retain scrolling tables. Only one visual reading view is exposed at a time.

Shared CSS/JS and local asset links include content hashes. Rebuilding after asset changes prevents a fresh page from loading an outdated cached stylesheet or script.

## Editing and checking

1. Edit the shared template/assets or a tool’s source files.
2. Run `python3 tools/build.py` after changing markup, metadata, scripts, or styles.
3. Run `python3 tools/check.py`, then the browser checks appropriate to the change.
4. Publish sources and generated entry pages together only when authorized.

The published site needs no framework, Python runtime, package installation, or dynamic template requests. Shared asset URLs are relative to each tool’s folder and work under the GitHub Pages repository path. Existing Canvas links remain unchanged. This repository is deployed as one website; individual tool downloads are not a requirement.
