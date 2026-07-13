---
name: Intellectual Archival
colors:
  surface: '#f7f9fe'
  surface-dim: '#d7dadf'
  surface-bright: '#f7f9fe'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f1f4f8'
  surface-container: '#ebeef3'
  surface-container-high: '#e5e8ed'
  surface-container-highest: '#e0e3e7'
  on-surface: '#181c1f'
  on-surface-variant: '#444651'
  inverse-surface: '#2d3134'
  inverse-on-surface: '#eef1f6'
  outline: '#757682'
  outline-variant: '#c5c5d3'
  surface-tint: '#4059aa'
  primary: '#00236f'
  on-primary: '#ffffff'
  primary-container: '#1e3a8a'
  on-primary-container: '#90a8ff'
  inverse-primary: '#b6c4ff'
  secondary: '#5c5f60'
  on-secondary: '#ffffff'
  secondary-container: '#dee0e1'
  on-secondary-container: '#606364'
  tertiary: '#262b31'
  on-tertiary: '#ffffff'
  tertiary-container: '#3c4148'
  on-tertiary-container: '#a8adb5'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#dce1ff'
  primary-fixed-dim: '#b6c4ff'
  on-primary-fixed: '#00164e'
  on-primary-fixed-variant: '#264191'
  secondary-fixed: '#e1e3e4'
  secondary-fixed-dim: '#c4c7c8'
  on-secondary-fixed: '#191c1d'
  on-secondary-fixed-variant: '#444748'
  tertiary-fixed: '#dee3eb'
  tertiary-fixed-dim: '#c2c7cf'
  on-tertiary-fixed: '#171c22'
  on-tertiary-fixed-variant: '#42474e'
  background: '#f7f9fe'
  on-background: '#181c1f'
  surface-variant: '#e0e3e7'
typography:
  display-lg:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
    letterSpacing: -0.02em
  headline-md:
    fontFamily: Inter
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
    letterSpacing: -0.01em
  body-lg:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '300'
    lineHeight: 26px
    letterSpacing: '0'
  body-base:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
    letterSpacing: '0'
  body-bold:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '600'
    lineHeight: 24px
    letterSpacing: '0'
  label-caps:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
    letterSpacing: 0.05em
  caption:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
    letterSpacing: '0'
  micro:
    fontFamily: Inter
    fontSize: 11px
    fontWeight: '500'
    lineHeight: 14px
    letterSpacing: 0.02em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  unit: 4px
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 32px
  margin-mobile: 20px
  margin-desktop: 40px
  gutter: 16px
  max-width: 512px
---

## Brand & Style

This design system is built on the philosophy of a **"Two-Level Flat Layout,"** creating a serene, focused sanctuary for readers. It draws heavily from **Minimalism** and modern editorial design, prioritizing cognitive ease and typographic clarity over decorative effects.

The brand personality is intellectual, organized, and deeply reliable. It avoids the visual noise of shadows and heavy borders, instead establishing hierarchy through a sophisticated interplay of paper-like textures and high-contrast ink colors. The emotional response is one of calm focus—a digital extension of a physical library. 

Key stylistic principles include:
- **Surface Contrast:** Elevation is achieved solely through color-blocking (white cards on cool grey canvases).
- **Physicality:** Layouts mimic high-end stationery and book layouts, utilizing specific aspect ratios (2:3 for covers) and margin-aligned "spine" lines.
- **Precision:** A strict 4px/8px grid ensures mathematical harmony across all views.

## Colors

The palette is rooted in the **Flat Navy** aesthetic, designed to evoke the permanence of ink on paper and the reliability of archival systems.

- **Primary (Classic Navy):** Used for core CTAs, active states, and essential focal points. It represents the "active" layer of the intellect.
- **Secondary (Paper Grey):** The foundational canvas color. It is a cool, desaturated grey that reduces eye strain compared to pure white.
- **Tertiary (Ink Black):** Reserved for primary typography. It has a slight cool cast to maintain harmony with the Navy accents while ensuring maximum readability.
- **Neutral (Slate Ink):** Used for metadata, secondary information, and borders.

**Functional Colors:**
- **Surface:** Pure white (#FFFFFF) is used for all card-based elements to create an "embedded" look against the grey background.
- **Destructive:** A deep, saturated red (#B82525) for high-stakes actions like deletions.

## Typography

The typography system is designed to mimic professional book typesetting. **Inter** is the primary driver, chosen for its exceptional legibility and systematic weight distribution.

- **Prose Content:** Uses a "light" weight (300) with a "relaxed" line height (approx 1.6x) to ensure comfortable long-form reading of extracted book quotes.
- **Editorial Headings:** Utilize "semibold" weights with "tight" letter spacing to create an authoritative, condensed appearance.
- **Labels:** Small-scale text (11px-12px) uses medium weights to maintain stroke visibility on mobile screens.

For multilingual support, the system fallback should prioritize **Pretendard** for Korean and **Noto Sans JP** for Japanese to maintain the same geometric humanist aesthetic.

## Layout & Spacing

This design system uses a **mobile-first, narrow-viewport strategy**. It is optimized for a single vertical column with a strict maximum width of 512px to maintain a focused reading experience even on larger screens.

- **Grid:** A fluid 4-column grid for mobile, shifting to a 12-column grid within the fixed-width container for desktop.
- **Rhythm:** All spacing is derived from a 4px base unit. 20px (px-5) is the standard horizontal safety margin for page content.
- **Verticality:** Sections are separated by generous gaps (24px or 32px) to provide "breathing room" between disparate blocks of information.
- **Viewport Locking:** To simulate a native app feel, the main layout uses a "fixed-chrome" model where the header and navigation are pinned, and the content scrolls independently with `overscroll-contain`.

## Elevation & Depth

The design explicitly avoids shadows and blurs to maintain a "pure" digital paper aesthetic. 

- **Tonal Layers:** All depth is created by placing white surfaces (`#FFFFFF`) on top of the Paper Grey background (`#F0F2F3`). 
- **Subtle Outlines:** In specific instances where a card is placed on another white surface (e.g., nested inputs), use a 1px low-contrast border in Paper Grey (#DEE2E3).
- **Interactive Feedback:** Rather than rising "off" the page with shadows, elements respond to touch by compressing. Use a 2% scale reduction (`scale-98`) and subtle background color shifts for active states.

## Shapes

The shape language is modern and "soft-geometric." 

- **Containers:** Standard cards and containers use a **1rem (16px)** radius to feel approachable and friendly.
- **Large Widgets:** Feature highlights (like the Daily Quote) use an exaggerated **1.5rem (24px)** radius to distinguish them as special content.
- **Utility Elements:** Buttons and interactive pills often use **full rounding** or large radii to signify touchability.
- **Book Covers:** Maintain a strict rectangularity with very minor rounding (4px) to preserve the silhouette of a physical book.

## Components

### Buttons
- **Primary:** Solid Classic Navy background, white text, 52px height for mobile ergonomics. 16px corner radius.
- **Secondary/Pill:** 1px hair-line border (#DEE2E3) or light grey background. Fully rounded (pill) shape.

### Cards & Book Showcases
- **Quote Card:** Pure white, no shadow, 16px radius, 20px internal padding.
- **Book Showcase:** Strict 2:3 aspect ratio. For empty states, use a white surface with a 2px vertical navy line on the extreme left margin to simulate a book spine.

### OCR Sentence Selector
- Individual sentences are wrapped in wide buttons with 12px rounding.
- **Selected State:** Classic Navy tint background (10-20% opacity) with a solid navy circular checkbox icon on the left.
- **Unselected State:** 1px Paper Grey border, muted grey text.

### Navigation
- **Bottom Bar:** Fixed position, pure white background. Active states are indicated by a 24px wide horizontal navy bar floating 8px above the icon.

### Input Fields
- **Editorial Style:** For simple forms, use a borderless input with a single 1px bottom hairline that darkens to Classic Navy on focus.
- **Textareas:** Contained within a white card; no internal borders; 16px font size to prevent mobile browser auto-zoom.