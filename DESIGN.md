# Frontend design notes

## Brief and baseline

- Audience: people reviewing hospital video, including a public-sector demonstration audience.
- Main task: choose a recording, provide an LLM Foundry token, review AI-assisted observations beside the video, and export findings.
- Confirmed constraints: keep the existing one-page workflow and use neutral branding. Do not use WBD branding.
- Baseline inspected: the existing `index.html`, `script.js`, and the published Hospital Video Analytics page.
- Preserve: local video playback, frame sampling, Foundry token entry, status feedback, finding timestamps, and export/clear actions.
- Replace: Bootstrap presentation, oversized centered title, branded footer and favicon, and generic side-by-side cards.

## Direction

- Color: cool mist `#F3F7F6`, white `#FFFFFF`, deep ink `#193235`, slate `#607579`, clinical teal `#147A73`, and signal red `#A94235` for findings.
- Type: system sans stack for legibility and fast loading; medium-weight compact headings and plain sentence-case labels.
- Layout: task-first workspace with video and source controls on the left, findings on the right, and the latest analyzed frame below the player. Stack the workspace on smaller screens.
- Principles: keep the video central, make AI observations easy to scan, disclose that frames go to LLM Foundry, and describe outputs as observations requiring human review.
- Homepage copy: "Review a hospital recording." Supporting line: "AI-assisted observations appear beside the video for a person to review." Primary action: "Choose a video", which opens the file picker. There is no secondary CTA.

## Sources and asset decisions

- Product content: existing page and `README.md`; treated as current product content, not as a visual identity guide.
- Neutral identity: no client logo or brand palette was supplied. No WBD assets, Gramener mark, generated images, or new UI library are used.
- Visual catalog lookup: `https://designeer.xyz/llms-full.txt` was attempted but was not accessible from the available web tool. The redesign therefore uses native HTML controls and custom CSS.

## Iteration record

- Baseline: centered Bootstrap heading, warning banner, two equal-width panels, large empty footer, and a results box with raw markdown markers.
- Current pass: replaced that structure with a compact neutral header, concise task introduction, visible demo notice, responsive 7/5 review workspace, purposeful empty states, finding count, and human-review note. Preserved the IDs used by the video and analysis flow.
- Desktop preview review: removed an unstyled default SVG fill from the empty-state mark, delayed native video controls until a file is selected, and kept the player at a consistent 16:9 ratio on narrow screens.
- Visual review question: does the video remain the focal point while findings stay readable at desktop and mobile widths?
- Feedback: pending.
- Open questions: none blocking implementation. Confirm the preferred product name if "Hospital video review" should be replaced before release.
