# PDF Tools Invariants

This document records the durable rules that PDF Tools changes must preserve.

## INV-STARTUP-RECOVERY: Show loading and recoverable startup failures

- **Scope:** Initial browser startup.
- **Rule:** Keep the upload interface client-rendered. Initially show only the saved or system theme's background. If initialization is still pending after 700 ms, show a subtle “Opening PDF Tools…” indicator rather than a full-screen loading page. Reveal an actionable failure message with Retry immediately on initialization failure. Remove startup feedback as soon as initialization succeeds, without an artificial minimum display time. Do not server-render or hydrate the upload interface.
- **Owner:** The frontend HTML startup boundary.
- **Evidence:** Browser checks of fast startup without an indicator, a delayed request crossing the 700 ms threshold, immediate failed-request feedback, retry after restoring the request, and saved/system themes before initialization.
- **Origin:** The user retained client rendering and startup recovery, then explicitly replaced the flashing loading page with a 700 ms delayed indicator and immediate failure feedback when updating PR 7.

## INV-WORKFLOW-RECOVERY: Preserve state across workflow loading

- **Scope:** Browser startup and first entry into a PDF workflow.
- **Rule:** Retain selected files and settings during loading and recovery. A failed workflow request must allow retry without reselecting files; a completion after leaving a workflow must not restore that workflow. Production asset URLs must identify the matching build so an existing tab cannot load incompatible replacement code.
- **Owner:** The Elm workflow state machine and release asset build.
- **Evidence:** Browser checks of failed-request retry and navigation during delayed requests; release smoke checks of versioned Elm, bridge, and CSS assets.
- **Origin:** Preserves the state retention and asset identity requirements of the former deferred Leptos workflows; the main Elm frontend loads its workflow code in one bundle.

## INV-DEV-SERVER-PORT: Keep the inspection server on port 3200

- **Scope:** Local development work on PDF Tools.
- **Rule:** Serve PDF Tools at `http://127.0.0.1:3200` while working so the user can inspect changes.
- **Owner:** The PDF Tools local development workflow.
- **Evidence:** An HTTP request to `http://127.0.0.1:3200` succeeds while the development server is running.
- **Origin:** The user explicitly required PDF Tools to always be served on port 3200 for inspection.

## INV-WORKFLOW-TRANSITION-COHERENCE: Animate workflow contents with their container

- **Scope:** Transitions between PDF Tools operations in the generic workflow workspace.
- **Rule:** When an operation changes the workspace height, the outer card and its internal layout—including the primary action—must move together without content jumping, overlapping, losing settled padding, or blocking interaction. The transition must become immediate when the user prefers reduced motion.
- **Owner:** The generic workflow view and its height-measurement boundary.
- **Evidence:** Exercise growing and shrinking operation changes with `agent-browser` at desktop, laptop, and half-screen viewports, sampling the outer card, controls, and primary-action positions throughout the transition.
- **Origin:** The user explicitly required all workflow contents, including the download button, to move with the animation.

## INV-LOADING-GEOMETRY: Keep transient loading feedback from moving the workspace

- **Scope:** First generic workflow entry, failed-module Retry, and imposition artwork inspection.
- **Rule:** Keep the upload view visible until the first generic workflow is ready, without showing an intermediate short workflow card. Retry must not shrink that loading view before revealing the workflow. Checking replacement artwork must preserve the existing imposition workspace bounds and expose cancellation without inserting a row above its controls.
- **Owner:** The app workflow-loading boundary and inspection feedback view.
- **Evidence:** Agent-browser frame measurements of first upload, failed-module Retry, and repeated artwork replacement, including a delayed inspection and cancellation.
- **Origin:** The user requested fixes for the first-upload stutter and the two matching transition defects found in the subsequent audit.

## INV-HEADER-CONTROL-SIZING: Keep the theme toggle aligned with header buttons

- **Scope:** The PDF Tools application header.
- **Rule:** The visible light/dark switch track must use the same 44-pixel height as the neighboring header buttons, with its active-state thumb inset within that track.
- **Owner:** The application header control styles.
- **Evidence:** Inspect the computed dimensions and containment of the theme toggle track and thumb alongside adjacent header buttons at desktop and mobile widths.
- **Origin:** The user explicitly requested that the light/dark mode toggle be the same size as the buttons for a uniform header.

## INV-BROWSER-VIDEO-CAPTURE: Keep agent-browser video capture available

- **Scope:** The PDF Tools Nix development shell.
- **Rule:** `nix develop .#pdf-app` must provide both `agent-browser` and `ffmpeg` so browser audit recordings can be finalized without undeclared host tooling.
- **Owner:** The `devShells.<system>.pdf-app` package declaration in the repository flake.
- **Evidence:** Inside `nix develop .#pdf-app`, `agent-browser --version` and `ffmpeg -version` succeed, and a short agent-browser recording can be stopped into a non-empty WebM file.
- **Origin:** The user explicitly required ffmpeg in the project shell for video capture.

## INV-IMPOSITION-RECOVERABLE-PROGRESSION: Keep imposition progression explicit and recoverable

- **Scope:** The browser imposition workflow from artwork selection through output.
- **Rule:** Choosing an imposition mode must preserve that choice without unintended advancement; invalid layout input must not advance; disclosures must not submit; modal focus must remain contained and return to its trigger; and preparation failures must retain per-file removal so the user can recover without restarting. In Edit copy quantities, Apply to all must commit the valid bulk quantity to every page or duplex pair, replace stale individual drafts, close the dialog, and return focus to its opener. Invalid bulk input must not apply or close.
- **Owner:** The imposition workspace state machine and browser view.
- **Evidence:** Frontend model tests plus agent-browser exercises of Repeat, custom-grid disclosure and validation, quantity-dialog keyboard focus, and mixed-file failure recovery.
- **Origin:** The user requested fixes for the audited imposition usability and recovery failures, with imposition as the most important workflow.

## INV-PDF-SELECTION-KNOWN-VALID: Validate selected PDFs before enabling dependent work

- **Scope:** Browser selection and page-range controls for PDF workflows.
- **Rule:** A selected PDF must be proven readable and have an authoritative page count before it becomes active. General document intake must accept readable PDFs with mixed page sizes or orientations. Imposition must retain each page's geometry and resolve finished sizing rather than rejecting artwork solely because pages differ. Page-range controls must reject pages outside that known boundary before submission and explain when a changed source invalidates a retained range; a rejected replacement must preserve the previously valid workspace.
- **Owner:** The generic workspace PDF-preflight boundary and page-selection model, with the server remaining authoritative for untrusted requests.
- **Evidence:** Frontend model tests and agent-browser exercises using corrupt PDFs, valid replacement state, and out-of-range selections.
- **Origin:** The user requested fixes for late corrupt-file and out-of-range failures found in the workflow audit.

## INV-PRINT-OUTPUT-CHOICES: Expose required print geometry and extraction packaging

- **Scope:** Images-to-PDF and Extract Pages workflows and their multipart job contracts.
- **Rule:** Images-to-PDF creates one PDF page per ordered image at its natural 300 DPI size. Its browser workflow does not expose page resizing, orientation, fitting, or margin choices; the server may retain fixed-page request compatibility for existing API clients. Extract Pages must offer individual PDFs, one combined PDF, and bounded page chunks. The browser must expose these choices and the server must independently validate them.
- **Owner:** The generic workflow controls and the `/jobs` conversion and extraction request handlers.
- **Evidence:** Frontend contract tests, backend document and web-handler tests, and successful agent-browser exports for original-size image output plus combined and chunked extraction.
- **Origin:** The user requested fixes for missing image page geometry and extraction packaging discovered in the workflow audit.

## INV-FINISHED-SIZE-FIRST: Express the intended print product before source geometry

- **Scope:** Imposition artwork sizing and placement.
- **Rule:** Accept mixed-size PDF pages and images, but always have the user explicitly define the intended finished dimensions. Keep width and height visible and editable; reusable presets are explicit user-invoked workflow shortcuts, never inferred intent. Do not automatically use original source sizes or apply a preset. Preserve explicitly chosen dimensions across fitting, bleed changes, retries, and replacement; allow manually specified per-piece overrides as a secondary control. Fit preserves proportions and retains all artwork, Fill preserves proportions with deliberate crop positioning and reset, and opt-in Stretch independently scales both axes with a clear distortion explanation. Do not infer customer intent from source geometry or silently shrink oversized artwork.
- **Owner:** Source analysis, imposition requests, and finished-size controls.
- **Evidence:** Mixed-source and odd-aspect-ratio print workflows, exact exported cut sizes, and visible image-sizing assumptions.
- **Origin:** The user regularly receives AI-generated images with unsuitable aspect ratios and approved a finished-size-first mixed-artwork workflow.

## INV-FIT-BLEED-PARITY: Fitting and bleed must preserve deliberate framing

- **Scope:** Imposition preview and exported PDFs.
- **Rule:** Separate fitting artwork into its finished cut frame from extending artwork to add bleed. Preserve the chosen normalized crop position within the expanded bleed frame and show any additional edge loss, rather than promising fixed cut-relative landmarks. Preview and export must use the same placement plan, including each piece's source identity, cut rectangle, rotation, fitting, and clipping. A larger grid slot must never become a smaller piece's cut size. Duplex fronts and backs must remain registered.
- **Owner:** Layout planning, preview rendering, and PDF export.
- **Evidence:** Asymmetric labeled artwork with near-edge marks, contain/cover positioning, bleed toggles, mixed-size cuts, and duplex output checks.
- **Origin:** The user reported that Scale to add bleed crops strangely when converting odd-sized artwork into Letter flyers, making imposition unusable.

## INV-ORIENTATION-DISCOVERABILITY: Keep orientation out of advanced settings

- **Scope:** Imposition setup and preview.
- **Rule:** Make finished-size Portrait/Landscape and impression placement Auto/Upright/Quarter-turn easy to select without expanding Advanced. Distinguish these two concepts, update the preview and sheet counts immediately, and retain duplex registration.
- **Owner:** Imposition controls and placement planning.
- **Evidence:** Desktop and half-screen browser workflows, keyboard access, and output orientation checks.
- **Origin:** The user explicitly requested easier impression-orientation selection and approved prominent orientation controls.

## INV-ARTWORK-CONTEXTS: Keep impose contexts explicit and bounded

- **Scope:** Imposition setup, the workspace toolbar, the Artwork inspector, and responsive sheet preview layout.
- **Rule:** Provide three keyboard-operable rail contexts: Setup, Artwork, and Preview. Setup owns the four production steps Size, Sheet, Arrangement, and Bleed. Keep global Fit/Fill/Stretch and impression orientation in the in-flow workspace toolbar, with an override badge and conditional Position entry point. Put crop positioning, nine anchors, fine-tune sliders, mixed-artwork scope, source details, reset, and sticky Done in the bounded Artwork rail. Guides and Fit-sheet/100% zoom remain available in Preview. Persistent artwork controls must remain outside the sheet. A temporary item context menu may appear over it for the requested per-artwork actions.
- **Evidence:** Agent-browser checks at 1366 × 768 and 800 × 900, keyboard rail traversal, bounded rail/footer geometry, direct one-page quantity, More-menu safety, crop and reset interactions, guide/zoom controls, and downloaded-PDF geometry parity.
- **Origin:** The redesign supersedes the prior floating Artwork disclosure invariant.

## INV-IMPOSE-TRANSITION-POLISH: Coordinate workflow frame and contents

- **Scope:** Entering and leaving Impose, including first deferred load and Retry.
- **Rule:** Keep the frame and workflow contents visually coordinated, without an intermediate collapsed card, clipped primary actions, or late layout jumps. Avoid restarting animations on resize-observer feedback. Rapid switching must not resurrect a departed workflow. Reduced motion must remain immediate, and loading/recovery must not discard files or settings.
- **Evidence:** Before/after real-browser frame traces for cold/warm entry, exit, rapid reversal, delayed/failed loading, Retry, and reduced motion. The `workspace_animation` browser acceptance check samples header, card, and action bounds during returns to PDF to images and Extract pages at desktop, laptop, and half-screen sizes to detect overshoot and late corrections.
- **Origin:** The user requested polishing the animations when switching into Impose.

## INV-IMPOSE-SETUP-STABILITY: Keep setup navigation in place

- **Scope:** Switching steps and scrolling controls in the imposition setup view.
- **Rule:** Keep Continue and the final download action on the right and Back on the left. Adding Back or switching between Size, Sheet, Arrangement, and Bleed must preserve the setup navigation, scrolling-region, and footer bounds at a fixed viewport. Additional controls and Saved work must scroll within the setup panel rather than displacing navigation. Newly selected steps start at the top of their controls while retaining form values. Keyboard focus must not move the surrounding page.
- **Owner:** The Elm imposition setup view and its layout styles.
- **Evidence:** The `setup_geometry` browser acceptance check samples rendered frames during step changes, rapid reversal, and rail scrolling at desktop, short-screen, tablet, and mobile widths. The `setup_tabs` check exercises keyboard navigation and preserves validation and drafts.
- **Origin:** The user required stable right-side Continue and left-side Back buttons, a shorter Sheet tab label, and fixes plus regression tests for jitter when switching tabs and moving around the page.

## INV-ARTWORK-FIRST-OPEN-STABILITY: Position Artwork before opening

- **Scope:** The first Artwork opening in each imposition workflow.
- **Rule:** Opening Artwork must display its final viewport-bounded position from the first frame, without moving the panel, trigger, toolbar, or workspace afterward. Keep native pointer and keyboard disclosure behavior.
- **Owner:** The Artwork disclosure styles and browser popover positioning boundary.
- **Evidence:** The `artwork_first_open` browser acceptance check samples fresh-workflow first openings at desktop, short-screen, tablet, and mobile sizes; `setup_tabs` covers keyboard disclosure activation.
- **Origin:** The user reported jitter only on the first Artwork opening and required a fix with regression protection.

## INV-IMPOSE-PREVIEW-CONTROLS: Keep cut paths visible and the toolbar simple

- **Scope:** The imposition sheet preview and workspace toolbar.
- **Rule:** Always show cut paths without a guide toggle. Do not display separate cut-line, bleed-line, or gutter overlays. Keep cut paths discernible over light and dark artwork, with a small fixed screen stroke while zooming. Keep artwork, zoom, sheet status, and duplex side controls consolidated into a single row, with adjacent Previous sheet and Next sheet buttons at the far right and horizontal scrolling where needed to preserve reachability on narrow screens. Do not collapse the setup scrolling region.
- **Owner:** The Elm SVG preview, workspace toolbar, and responsive styles.
- **Evidence:** The `preview_toolbar` browser acceptance check exercises always-visible cut paths, absence of guide toggles and other overlays, multi-sheet navigation, zoom, duplex side switching, and stable toolbar bounds; `responsive` covers control containment and narrow-screen reachability.
- **Origin:** The user required a single-row toolbar, then simplified the guides to always-visible Cut paths with no toggle or separate Cut lines.

## INV-ARTWORK-ROTATION: Rotate individual artwork before fitting

- **Scope:** Imposition canvas item actions, artwork settings, layout planning, and PDF output.
- **Rule:** Right-clicking a populated canvas item opens an extensible action menu for that artwork page. Support independent quarter-turn rotations and reset, with keyboard access and an equivalent control in Artwork. Apply the rotation before fitting to the chosen finished size, to every copy of the selected page only. Keep other artwork, finished cuts, quantities, bleed geometry, and duplex registration intact; preview and export must agree. Retain rotation in saved job settings and default older settings to zero.
- **Owner:** Elm artwork overrides and the Rust page plan/export boundary.
- **Evidence:** Model checks of page scope and preserved settings, Rust geometry/rotation checks, and the `artwork_rotation` browser acceptance check covering mixed orientations, menu interaction, preview, and downloaded output.
- **Origin:** The user requested independent rotation through a canvas right-click menu so portrait and landscape example artwork can share an impose workflow.

## INV-CANVAS-SPACE: Keep production-count copy out of the canvas

- **Scope:** Imposition sheet preview.
- **Rule:** Do not reserve a bottom canvas section for pieces-per-sheet, sheet count, pieces-produced, or extra-piece summary text. Keep the released space available for inspecting artwork; retain actionable production warnings in setup.
- **Owner:** The imposition preview and setup views.
- **Evidence:** Browser inspection of the preview region without a summary strip and with a sheet filling its available height.
- **Origin:** The user explicitly requested removing the bottom production-count section to make more space in the canvas.

## INV-IMPRESSION-SELECTION: Make the selected impression clear

- **Scope:** Selecting, focusing, and opening actions for an impression on the impose canvas.
- **Rule:** Indicate the selected impression with a clearly visible outline at its finished cut, distinct from cut paths and readable over light and dark artwork. Keep its stroke at a modest fixed screen width while zooming. Selection must not obscure artwork or show the browser's large SVG focus ring. Keep keyboard focus discernible and indicate only the selected impression, including when multiple copies share a page and while its right-click rotation menu is open.
- **Owner:** The Elm impression selection state and SVG preview styles.
- **Evidence:** Browser checks of click, keyboard focus, open context menu and dismissal, repeated copies, and zoom; screenshots confirm a clear cut-bound indicator without artwork obstruction.
- **Origin:** The user initially requested a very small selection indicator, then requested a more obvious indication of the impression selected for right-click rotation after simplifying the guides to always-visible cut paths.
