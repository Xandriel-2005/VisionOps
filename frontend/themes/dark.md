---
name: Technical Precision
colors:
  surface: '#10131a'
  surface-dim: '#10131a'
  surface-bright: '#363940'
  surface-container-lowest: '#0b0e14'
  surface-container-low: '#191c22'
  surface-container: '#1d2026'
  surface-container-high: '#272a31'
  surface-container-highest: '#32353c'
  on-surface: '#e1e2eb'
  on-surface-variant: '#c7c4d7'
  inverse-surface: '#e1e2eb'
  inverse-on-surface: '#2e3037'
  outline: '#908fa0'
  outline-variant: '#464554'
  surface-tint: '#c0c1ff'
  primary: '#c0c1ff'
  on-primary: '#1000a9'
  primary-container: '#8083ff'
  on-primary-container: '#0d0096'
  inverse-primary: '#494bd6'
  secondary: '#c4c6d0'
  on-secondary: '#2d3038'
  secondary-container: '#464951'
  on-secondary-container: '#b6b8c1'
  tertiary: '#c3c6d1'
  on-tertiary: '#2c3038'
  tertiary-container: '#8d919a'
  on-tertiary-container: '#262a32'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#e1e0ff'
  primary-fixed-dim: '#c0c1ff'
  on-primary-fixed: '#07006c'
  on-primary-fixed-variant: '#2f2ebe'
  secondary-fixed: '#e0e2ec'
  secondary-fixed-dim: '#c4c6d0'
  on-secondary-fixed: '#191c22'
  on-secondary-fixed-variant: '#44474e'
  tertiary-fixed: '#dfe2ed'
  tertiary-fixed-dim: '#c3c6d1'
  on-tertiary-fixed: '#181c23'
  on-tertiary-fixed-variant: '#43474f'
  background: '#10131a'
  on-background: '#e1e2eb'
  surface-variant: '#32353c'
typography:
  display-lg:
    fontFamily: Geist
    fontSize: 48px
    fontWeight: '600'
    lineHeight: 56px
    letterSpacing: -0.02em
  headline-md:
    fontFamily: Geist
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
    letterSpacing: -0.01em
  headline-sm:
    fontFamily: Geist
    fontSize: 18px
    fontWeight: '500'
    lineHeight: 24px
  body-md:
    fontFamily: Geist
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  body-sm:
    fontFamily: Geist
    fontSize: 13px
    fontWeight: '400'
    lineHeight: 18px
  mono-label:
    fontFamily: JetBrains Mono
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
    letterSpacing: 0.02em
  mono-data:
    fontFamily: JetBrains Mono
    fontSize: 13px
    fontWeight: '400'
    lineHeight: 18px
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  base: 4px
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 40px
  gutter: 16px
  margin: 24px
---

## Brand & Style
The design system is engineered for high-density data visualization and machine learning orchestration. It adopts a **Corporate Modern** aesthetic with a lean toward **Minimalist Developer-Centric** interfaces. The visual narrative centers on clarity, low cognitive load, and "mechanical" precision, mirroring the rigorous nature of computer vision model training.

The interface prioritizes content and metrics over decorative elements. It utilizes subtle borders, dark depth layering, and intentional typography to guide engineers through complex workflows. The emotional response is one of reliability, speed, and high-tech utility, drawing inspiration from industry-leading developer tools.

## Colors
The palette is built on a "Deep Slate" foundation to minimize eye strain during long-form engineering sessions. 

- **Foundation:** The primary canvas uses a near-black slate. Surfaces are layered using slightly lighter shades to establish hierarchy without relying on heavy shadows.
- **Accents:** A technical blue-violet is used sparingly for primary actions, progress indicators, and active states.
- **Status:** Semantics are critical. Success, running, and failed states use high-vibrancy tones to ensure they are immediately scannable against the dark backdrop.
- **Borders:** A refined secondary neutral is used for structural definition, keeping the interface crisp and organized.

## Typography
Typography is the primary driver of the information architecture. 

- **Geist (Sans):** Used for all navigational elements, headers, and standard body text. It provides a clean, modern, and highly legible experience.
- **JetBrains Mono (Monospace):** Reserved for technical data, model IDs, logs, performance metrics (mAP, Loss, Accuracy), and code snippets.
- **Scale:** Font sizes are kept relatively small to accommodate high-density dashboards, but legibility is maintained through generous line heights and tight tracking on headings.

## Layout & Spacing
The layout follows a **Fluid Grid** system designed for 1440px viewports but scaling down to mobile gracefully.

- **Grid Model:** 12-column grid for main dashboards. Sidebar navigation is fixed at 240px, while the main content area expands.
- **Rhythm:** A 4px baseline grid ensures perfect alignment of icons, labels, and input fields.
- **Density:** High-density layouts are encouraged for monitoring views, while documentation and settings pages utilize more whitespace (`xl` spacing) for focus.
- **Mobile:** On mobile, the 12-column grid collapses to a single column, and horizontal margins are reduced to 16px.

## Elevation & Depth
Elevation in this dark-mode-first system is achieved through **Tonal Layers** and **Low-Contrast Outlines** rather than traditional shadows.

1.  **Level 0 (Background):** Base color (#0B0E14) for the application backdrop.
2.  **Level 1 (Surfaces):** Cards and sidebar backgrounds (#1C1F26).
3.  **Level 2 (Interactive):** Hover states and modals, often using a subtle border (#2D3139) to define edges.
4.  **Shadows:** When necessary (e.g., floating menus), use sharp, high-opacity black shadows (15-20%) with zero spread to maintain the crisp, engineering aesthetic.

## Shapes
The shape language is **Soft** but disciplined. 

A 0.25rem (4px) border radius is the standard for almost all components—buttons, inputs, and tags. This slight rounding takes the "edge" off the brutalist structure while maintaining a serious, professional tone. Larger containers like cards may use up to 0.5rem (8px) for better visual separation.

## Components
Consistent component behavior ensures the platform feels like a cohesive toolset.

- **Buttons:** Primary buttons use the accent color with white text. Secondary buttons are outlined with #2D3139. Ghost buttons are used for utility actions in toolbars.
- **Input Fields:** Darker than the surface they sit on, with a 1px border. On focus, the border transitions to the primary accent color with a subtle 2px outer glow.
- **Status Chips:** Small, condensed labels using JetBrains Mono. They feature a low-opacity background of the status color (e.g., 10% Green) and a solid dot indicator.
- **Cards:** No shadows. Defined by a 1px border (#2D3139) and a slightly elevated background color (#1C1F26).
- **Data Tables:** Border-bottom separation only. Row hover states use a subtle lightening of the background. Metrics within cells should always use the Monospace font.
- **Navigation:** Vertical sidebar with icons on the left. Active states are indicated by a vertical 2px line on the far left edge and a subtle text color shift.