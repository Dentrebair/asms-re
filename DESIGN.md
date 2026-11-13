# ASMS-ROUNAQH Design Direction

The locked system for the public site. Every page shares it; change it on purpose. Built with the Hallmark design skill (redesign, full depth, brand kept). The admin panel (`/admin`) keeps its own look.

## Atmosphere

An established Chennai property and construction business: warm, grounded, premium and accountable. Editorial rather than marketplace-like. Avoid artificial urgency, unsupported social proof and overly glossy luxury cues.

## System

- Genre: editorial · Shape of the home page: Photographic (a Ledge hero: the photograph as a tall field, the headline on a paper plate at its base)
- Theme: brand · Axes: light paper / grotesk sans / warm accent · Posture: committed (the forest green carries the services rows, closing bands, plates and the footer; gold stays a signal)
- Other routes: Banner heroes on `/properties`, `/products`, `/contact`; `/properties/[slug]` keeps the Indian-portal detail layout.

## Tokens

`app/tokens.css` is the source of truth (OKLCH). The roles:

- Paper: ivory `oklch(97% 0.009 85)` (was `#F8F5EF`), paper-2 `oklch(93.5% 0.016 86)` (was `#EEE9DE`), paper-3 for loading washes.
- Ink: green-tinted near-black `oklch(23% 0.03 172)`; ink-2 and muted for secondary text and field edges.
- Field: brand green `oklch(33% 0.054 174)` (was `#103F34`), field-2 `oklch(27% 0.043 178)` (was `#092E27`), with their own on-field inks.
- Accent: antique gold `oklch(68% 0.12 76)`, a touch lighter than `#AD792A` so dark text on it reaches 4.5:1; accent-ink is near-black green. Light gold on green: `oklch(80% 0.1 82)`.
- Focus: a darker gold ring on paper, a light gold ring on green (`--color-focus`, `--color-focus-on-field`).
- Type: Albert Sans 600 for display and the wordmark, Manrope 400 and 700 for body, labels and controls. Three weights in all.
- Shape: card radius 16px, inner radius 10px, pills only for controls and tags; hairlines (`--color-rule`) instead of card borders.
- Spacing, type scale, easings, durations and z levels are the scaffold's, in `tokens.css`. Every padding, margin and gap uses a `--space-*` token.

## Controls

- Primary: gold fill, near-black text, pill, 48px tall. One filled primary per screen.
- Secondary: outlined (`btn--quiet`) or a typographic link with an underline that turns gold on hover. No arrows in labels.
- Inputs: 48px, constant 1px border in the muted ink, an inset outline for focus that appears instantly.

## Copy and labels

- Labels, captions, tags and nav links are Manrope, a step smaller, sentence case, never tracked capitals. No eyebrows above headings: a heading names its own section.
- No middle-dot strings, no em or en dashes in copy (the brand is written ASMS-ROUNAQH with a non-breaking hyphen), no italic accent words in headings.
- Never invent a metric, quote or logo. Missing facts are dashed text slots (`.fill`), two a page at most.

## Motion

Calm. Colour and underline changes on hover; one highlight run in the home page's pinned listing sheet. Under reduced motion everything ends at once.

## Guardrails

- Use genuine business photographs when supplied; clearly label all temporary imagery and sample data. Library photographs are credited in the footer.
- Present price, area, location and document status with equal visual weight.
- Use green as the trust anchor and gold only as an accent.
- Maintain 44px minimum touch targets and visible keyboard focus.
- Forms never show a success message without a real request behind them.

## Exports

`app/tokens.css` (Tailwind v4 `@theme static` block plus `:root`) and `app/base.css` in this project. Tailwind, DTCG or shadcn blocks can be added here on request.
