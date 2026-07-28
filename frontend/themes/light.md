---
name: Technical Precision Light
colors:
  surface: '#fcf8ff'
  surface-dim: '#dbd8e4'
  surface-bright: '#fcf8ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f5f2fe'
  surface-container: '#efecf8'
  surface-container-high: '#e9e6f3'
  surface-container-highest: '#e4e1ed'
  on-surface: '#1b1b23'
  on-surface-variant: '#464554'
  inverse-surface: '#303038'
  inverse-on-surface: '#f2effb'
  outline: '#767586'
  outline-variant: '#c7c4d7'
  surface-tint: '#494bd6'
  primary: '#4648d4'
  on-primary: '#ffffff'
  primary-container: '#6063ee'
  on-primary-container: '#fffbff'
  inverse-primary: '#c0c1ff'
  secondary: '#565e74'
  on-secondary: '#ffffff'
  secondary-container: '#dae2fd'
  on-secondary-container: '#5c647a'
  tertiary: '#904900'
  on-tertiary: '#ffffff'
  tertiary-container: '#b55d00'
  on-tertiary-container: '#fffbff'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#e1e0ff'
  primary-fixed-dim: '#c0c1ff'
  on-primary-fixed: '#07006c'
  on-primary-fixed-variant: '#2f2ebe'
  secondary-fixed: '#dae2fd'
  secondary-fixed-dim: '#bec6e0'
  on-secondary-fixed: '#131b2e'
  on-secondary-fixed-variant: '#3f465c'
  tertiary-fixed: '#ffdcc5'
  tertiary-fixed-dim: '#ffb783'
  on-tertiary-fixed: '#301400'
  on-tertiary-fixed-variant: '#703700'
  background: '#fcf8ff'
  on-background: '#1b1b23'
  surface-variant: '#e4e1ed'
typography:
  display-lg:
    fontFamily: Geist
    fontSize: 48px
    fontWeight: '600'
    lineHeight: '1.1'
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
    letterSpacing: '0'
  body-md:
    fontFamily: Geist
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
    letterSpacing: '0'
  body-sm:
    fontFamily: Geist
    fontSize: 12px
    fontWeight: '400'
    lineHeight: 18px
    letterSpacing: '0'
  code-md:
    fontFamily: JetBrains Mono
    fontSize: 13px
    fontWeight: '400'
    lineHeight: 20px
    letterSpacing: '0'
  label-caps:
    fontFamily: Geist
    fontSize: 11px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.05em
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
  xl: 32px
  container-max: 1440px
  gutter: 16px
---

## Brand & Style

This design system is engineered for developer tools and technical platforms where clarity, density, and precision are paramount. The brand personality is clinical and high-performance, evoking the feel of a professional integrated development environment (IDE) or a sophisticated telemetry dashboard. 

The design style is **Minimalist-Technical**, prioritizing content and data over decorative elements. It utilizes a restrained light-mode palette to reduce cognitive load while maintaining an "engineering-grade" aesthetic through rigid structural alignment, monospaced accents, and systematic hierarchy. The emotional response should be one of control, reliability, and absolute transparency.

## Colors

The color system is built on a "Paper-to-Ink" philosophy, utilizing a crisp **#F8FAFC** background to provide a neutral canvas for data. 

- **Primary Accent:** Indigo-Violet (#6366F1) is used sparingly for primary actions, active states, and focus indicators, ensuring interactive elements are immediately identifiable.
- **Neutrals:** A scale of Slate grays handles the structural hierarchy. Text is set in high-contrast #0F172A for maximum legibility.
- **Status Colors:** Success (Green), Running (Amber), and Failure (Red) use high-saturation values to ensure critical system states penetrate the neutral background.
- **Borders:** A consistent #E2E8F0 is used for hair-line borders to define containers without adding visual weight.

## Typography

The typography system relies on **Geist** for its neutral, Swiss-inspired precision and excellent legibility in high-density interfaces. 

- **Primary Hierarchy:** Headlines use tighter tracking and semi-bold weights to anchor page sections.
- **Data & Metadata:** **JetBrains Mono** is introduced for any data-driven strings, IDs, or code snippets, reinforcing the technical nature of the tool.
- **Density:** Body text is optimized at 14px to allow for high information density without sacrificing readability.
- **Labels:** Small caps with increased letter-spacing are used for table headers and section overviews to differentiate structural labels from user data.

## Layout & Spacing

This design system uses a strict **4px baseline grid**. All spacing increments must be multiples of 4, ensuring mathematical harmony across the UI.

- **Grid Model:** A 12-column fluid grid is used for main content areas, with a fixed 240px or 280px sidebar for navigation.
- **Gutters:** Standardized 16px gutters keep elements separated while maintaining high density.
- **Adaptation:** On mobile devices, sidebars collapse into "Drawers," and horizontal padding reduces from 32px to 16px. Desktop layouts prioritize horizontal space to allow for side-by-side code/data views.
- **Padding:** Internal component padding should favor the "compact" side of the scale (e.g., 8px vertical, 12px horizontal for buttons).

## Elevation & Depth

In this "Technical Precision" system, depth is communicated through **Tonal Layering** and **Hairline Borders** rather than traditional shadows.

- **Level 0 (Background):** #F8FAFC - The base canvas.
- **Level 1 (Surface):** #FFFFFF - Primary containers, cards, and sidebar blocks. Defined by a 1px solid border (#E2E8F0).
- **Level 2 (Interaction):** Subtle 2px "Soft Blur" shadows (0 2px 4px rgba(0,0,0,0.05)) are only permitted on floating elements like dropdown menus, tooltips, and modals to lift them off the grid.
- **Dividers:** Use 1px solid #E2E8F0 for all internal divisions. Avoid using color shifts for depth where a border can achieve the same clarity.

## Shapes

The shape language is "Soft-Geometric." While the design feels rigid, 4px corner radii are applied to all interactive elements to prevent the UI from feeling hostile or overly sharp.

- **Standard (4px):** Applied to buttons, input fields, cards, and checkboxes.
- **Large (8px):** Reserved for larger containers or modal windows.
- **Circles:** Used exclusively for status indicators, user avatars, and icon buttons.

## Components

- **Buttons:** Primary buttons use #6366F1 with white text. Secondary buttons use a #FFFFFF fill with #E2E8F0 borders and #0F172A text. "Ghost" buttons are reserved for utility actions in toolbars.
- **Inputs:** Fields use #FFFFFF backgrounds with a 1px #E2E8F0 border. On focus, the border transitions to #6366F1 with a subtle 2px indigo glow. Labels are always positioned above the field in Geist SemiBold 12px.
- **Chips/Badges:** Technical badges use a light gray fill (#F1F5F9) with JetBrains Mono text. Status-specific badges (e.g., "Success") use a 10% opacity version of their status color for the background and 100% opacity for the text.
- **Lists/Tables:** Rows should have a fixed height (e.g., 40px for compact, 56px for standard). Use #F8FAFC for zebra-striping or hover states.
- **Monospace Blocks:** Any code or log output must be contained in a #0F172A (Dark Slate) block even in light mode, to maintain "syntax highlighting" familiarity for developers.
- **Data Visualizations:** Use the Indigo primary as the main data series, with high-contrast status colors for outliers or errors.