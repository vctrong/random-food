---
name: Modern Culinary Guide
colors:
  surface: '#f8f9ff'
  surface-dim: '#d0dbed'
  surface-bright: '#f8f9ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#eff4ff'
  surface-container: '#e6eeff'
  surface-container-high: '#dee9fc'
  surface-container-highest: '#d9e3f6'
  on-surface: '#121c2a'
  on-surface-variant: '#414751'
  inverse-surface: '#27313f'
  inverse-on-surface: '#eaf1ff'
  outline: '#717782'
  outline-variant: '#c1c7d3'
  surface-tint: '#0060a8'
  primary: '#0060a8'
  on-primary: '#ffffff'
  primary-container: '#5b9eeb'
  on-primary-container: '#00345f'
  inverse-primary: '#a1c9ff'
  secondary: '#9d3c60'
  on-secondary: '#ffffff'
  secondary-container: '#fd8ab0'
  on-secondary-container: '#781f43'
  tertiary: '#3f608a'
  on-tertiary: '#ffffff'
  tertiary-container: '#7c9dcb'
  on-tertiary-container: '#0b345c'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#d3e4ff'
  primary-fixed-dim: '#a1c9ff'
  on-primary-fixed: '#001c38'
  on-primary-fixed-variant: '#004880'
  secondary-fixed: '#ffd9e2'
  secondary-fixed-dim: '#ffb1c7'
  on-secondary-fixed: '#3e001d'
  on-secondary-fixed-variant: '#7f2449'
  tertiary-fixed: '#d3e3ff'
  tertiary-fixed-dim: '#a8c9f9'
  on-tertiary-fixed: '#001c39'
  on-tertiary-fixed-variant: '#254871'
  background: '#f8f9ff'
  on-background: '#121c2a'
  surface-variant: '#d9e3f6'
typography:
  display-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 40px
    fontWeight: '700'
    lineHeight: 48px
    letterSpacing: -0.02em
  display-lg-mobile:
    fontFamily: Plus Jakarta Sans
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 28px
    fontWeight: '700'
    lineHeight: 36px
    letterSpacing: -0.015em
  headline-lg-mobile:
    fontFamily: Plus Jakarta Sans
    fontSize: 24px
    fontWeight: '700'
    lineHeight: 32px
    letterSpacing: -0.01em
  headline-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 22px
    fontWeight: '600'
    lineHeight: 28px
    letterSpacing: -0.01em
  headline-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 18px
    fontWeight: '600'
    lineHeight: 26px
    letterSpacing: -0.005em
  title-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 16px
    fontWeight: '600'
    lineHeight: 24px
  body-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  body-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 13px
    fontWeight: '400'
    lineHeight: 18px
  label-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 13px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.01em
  label-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 11px
    fontWeight: '600'
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
  gutter: 1rem
  gutter-md: 1.5rem
  gutter-lg: 2rem
  margin: 1rem
  margin-md: 1.5rem
  margin-lg: 3rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 1rem
  space-lg: 1.5rem
  space-xl: 2.5rem
---

## Brand & Style

This design system delivers a refined culinary decision engine tailored for modern Vietnamese food culture. The aesthetic bridges high-end lifestyle editorial design with the effortless agility of a polished consumer utility. It avoids cartoonish tropes, playful caricatures, and saturated techno-gradients in favor of authentic food presentation, nuanced warm whites, delicate borders, and structured editorial hierarchy.

The visual language communicates three core sentiments:
1. **Effortless Clarity:** Solving daily meal indecision through clean scanning, crisp micro-copy, and purposeful visual categorization.
2. **Appetizing Elegance:** Cream-tinted undertones and airy surface treatments elevate street food classics alongside modern dining concepts.
3. **Playful Restraint:** Lighthearted interactions expressed via precise spring transitions, tactile pill chips, and crisp status badges rather than juvenile graphic clutter.

## Colors

The palette uses a dual primary engine pairing Cerulean Blue (`#5B9EEB`) and Rosy Coral (`#F07FA5`), grounded by an authoritative Deep Blue (`#23466F`). Warm Cream (`#FFF9F5`) serves as the foundational canvas to reduce stark glare and complement warm food photography, while pure White (`#FFFFFF`) is reserved for raised cards, floating sheets, and active interactive elements.

### Color Tokens & Roles
- **Canvas Base:** `#FFF9F5` (Warm Cream canvas backdrop)
- **Surface Level 1 (Cards, Sheets):** `#FFFFFF` (Pure white for high foreground contrast)
- **Primary Accent:** `#5B9EEB` (Main actions, primary filters, decision triggers)
- **Primary Soft Tint:** `#EAF4FF` (Selected filter backgrounds, secondary buttons, blue badge containers)
- **Secondary Accent:** `#F07FA5` (Favorite actions, discovery prompts, sweet/dessert tags)
- **Secondary Soft Tint:** `#FFF0F5` (Delicate highlights, love-reactions, subtle chip fills)
- **Deep Anchor:** `#23466F` (Headers, active navigation states, authoritative CTA text)
- **Text Primary:** `#1F2937` (High-legibility charcoal for body text and primary labels)
- **Text Secondary:** `#6B7280` (Muted captions, metadata, opening hours, distances)
- **Border Subtle:** `#E5E7EB` (Clean 1px separation lines and ghost borders)
- **Success:** `#54B889` (Open now, verified restaurants, healthy options)
- **Warning / Alert:** `#F4C95D` (Price levels, trending indicators, spicy/dietary notices)

Maintain an intentional 85/15 ratio: 85% of views must remain clean neutrals, soft tints, and food imagery, leaving vibrant blue and pink accents exclusively for interactive cues and focal decision states.

## Typography

Plus Jakarta Sans is selected across all scales for its balanced geometry, crisp modern terminals, and native support for complex Vietnamese diacritical marks (tone markers like dấu hỏi, dấu ngã, dấu nặng, and combining accents on ă, â, ê, ô, ơ, ư).

### Typographic Guidelines
- **Diacritics Clearance:** Line-height values are calibrated to prevent vertical clipping on stacked tone markers (e.g., `ổ`, `ở`, `ế`). Never set line heights tighter than 1.25x on display scales or 1.4x on body text.
- **Visual Weight:** Reserve `700` (Bold) strictly for top-level prompts (`display-lg`, `headline-lg`), `600` (SemiBold) for restaurant names and interactive labels, and `400` (Regular) for descriptions and contextual reviews.
- **Numeric Rhythm:** Currency representations (e.g., `45.000 ₫`) and ratings (`4.8 ★`) utilize tabular numerals within `label-md` and `title-md` for strict layout alignment in list cards.

## Layout & Spacing

The layout follows a fluid 12-column grid system on desktop, an 8-column layout on tablets, and a 4-column structure on mobile devices. A strict 4px / 8px baseline rhythm governs element padding, card separations, and vertical stacks.

### Responsive Breakpoints & Margin Rules
- **Mobile (< 640px):** 4 columns, `gutter: 1rem (16px)`, `margin: 1rem (16px)`. Modals convert into bottom sheets. Card collections scroll horizontally with peek-ahead margins.
- **Tablet (640px - 1024px):** 8 columns, `gutter-md: 1.5rem (24px)`, `margin-md: 1.5rem (24px)`. Two-column card grids for food categories and recommendation streams.
- **Desktop (> 1024px):** 12 columns, max-width container of `1200px` centered, `gutter-lg: 2rem (32px)`, `margin-lg: 3rem (48px)`. Three or four-column layouts for dish discovery and restaurant cards.

## Elevation & Depth

Visual depth is achieved through clean white elevated surfaces over the Warm Cream canvas, reinforced by delicate chromatic shadows rather than harsh black tints. Borders provide structure, preventing elements from dissolving into low-contrast surfaces.

### Surface Hierarchy & Depth Levels
- **Level 0 (Canvas Base):** `#FFF9F5` background, no shadow, no border.
- **Level 1 (Cards, Input Fields, Badges):** `#FFFFFF` surface, `1px solid #E5E7EB`, accompanied by a warm ambient shadow: `0 1px 3px rgba(31, 41, 55, 0.04), 0 4px 12px rgba(35, 70, 111, 0.03)`.
- **Level 2 (Hover States, Active Filter Pills, Popovers):** `#FFFFFF` surface, `1px solid rgba(91, 158, 235, 0.25)`, elevated by `0 4px 6px -1px rgba(35, 70, 111, 0.05), 0 10px 24px -3px rgba(35, 70, 111, 0.08)`.
- **Level 3 (Modals, Randomizer Dial, Floating Action Triggers):** `#FFFFFF` surface, crisp border `1px solid #E5E7EB`, floating on `0 20px 35px -5px rgba(35, 70, 111, 0.12), 0 8px 16px -4px rgba(31, 41, 55, 0.04)`.
- **Backdrop Overlay:** `rgba(35, 70, 111, 0.35)` with an `8px` blur for dialogs, focusing optical weight directly on the decision cards.

## Shapes

The design system employs a refined `12px - 20px` corner radius spectrum (`roundedness: 2`). This provides a modern, tactile feel without the cartoonish aesthetic of exaggerated 32px pill cards.

### Radius Application Guidelines
- **Input Fields, Compact Buttons, Badges:** `8px - 10px` (`rounded-md`) for crisp utility.
- **Standard Action Buttons, Category Chips:** `9999px` (Full pill) to emphasize tap affordance and playful discovery.
- **Content Cards, Dish Previews, Bottom Sheets:** `16px` (`rounded-lg`) for structural elegance and balanced perimeter framing.
- **Modals, Floating Decision Prompts, Hero Banners:** `20px` (`rounded-xl`) to establish high-level focus and soften large viewport components.
- **Food Photography Containers:** Must match outer card radius minus the padding gap, or share the card's native `16px` with top-corner clipping (`rounded-t-2xl`).

## Components

### Buttons
- **Primary Action ("Ăn Món Này", "Quay Ngay"):** Background `#5B9EEB`, label text `#FFFFFF` (`label-md`), full pill shape (`rounded-full`), height `44px`, padding `0 20px`. Hover: `#4A8CD8`, shadow `0 4px 12px rgba(91, 158, 235, 0.28)`.
- **Secondary Discovery Action ("Gợi ý khác"):** Background `#FFF0F5`, text `#F07FA5`, border `1px solid rgba(240, 127, 165, 0.2)`. Hover: background `#FFE2EC`.
- **Ghost / Neutral:** Transparent background, text `#23466F`, hover background `#EAF4FF`.

### Chips & Filter Tags
- **Default State:** Background `#FFFFFF`, border `1px solid #E5E7EB`, text `#1F2937`, padding `6px 14px`, border-radius `9999px`.
- **Active State:** Background `#EAF4FF`, border `1px solid #5B9EEB`, text `#23466F`, font weight `600`.
- **Mood / Cuisine Badges:** Subtle pill containers with `label-sm` text. E.g., `Món Nước` (Soft Blue fill), `Ăn Vặt` (Soft Pink fill), `Healthy` (Success tint `#EAF7F1` with `#54B889` text).

### Cards (Dish & Venue)
- **Structure:** Surface `#FFFFFF`, border `1px solid #E5E7EB`, border radius `16px`, overflow hidden.
- **Image Treatment:** Aspect ratio `16:10` or `4:3`, sharp object-fit cover, subtle inset gradient overlay at bottom edge for contrast.
- **Metadata Layout:** Dish title in `title-md` (`#1F2937`), price bracket in `label-md` (`#23466F`), location/distance in `body-sm` (`#6B7280`). Include a top-right floating favorite icon button (white circle with `#F07FA5` icon).

### Decision Modals ("Hôm Nay Ăn Gì?" Roulette / Randomizer)
- **Shell:** Centered modal on desktop (`max-width: 480px`), bottom sheet on mobile. Border radius `20px`, surface `#FFFFFF`.
- **Header:** Editorial title `headline-md` centered with subtle supportive subtitle in `body-md` (`#6B7280`).
- **Interactive Stage:** High-resolution food showcase card with smooth slot-machine or carousel transition effect.
- **Footer Actions:** Full-width primary CTA with subtle micro-scale animation on click (`active:scale-98`).

### Input Fields & Search Bars
- **Container:** Height `48px`, background `#FFFFFF`, border `1px solid #E5E7EB`, radius `12px`, padding `0 16px`.
- **Focus State:** Border `#5B9EEB`, ring `3px solid rgba(91, 158, 235, 0.15)`.
- **Icons:** Search and clear icons in `#6B7280`, transitioning to `#23466F` upon active input.

### Checkboxes & Segmented Controls
- **Segmented Tabs:** Background `#F3F4F6`, padding `4px`, radius `12px`. Active indicator pill in `#FFFFFF` with `0 2px 6px rgba(31, 41, 55, 0.06)`, text `#23466F`.
- **Checkboxes:** Size `20px`, radius `6px`, border `1.5px solid #E5E7EB`. Checked: background `#5B9EEB`, checkmark `#FFFFFF`.