# Design System: REVOO (Premium iOS 26 Aesthetic)

This document serves as the "Source of Truth" for the visual language and design-code of the REVOO project. It is intended for designers and developers to ensure consistency across all guest-facing and admin interfaces.

## 1. Visual Theme & Atmosphere
The design follows a **"Premium iOS 26"** aesthetic, characterized by:
- **Atmosphere:** Warm, inviting, and high-end. It balances professional utility with a "boutique" feel.
- **Glassmorphism:** Heavy use of Gaussian-blurred backgrounds, translucent layers, and subtle inner glows to create depth without clutter.
- **Soft Geometry:** Extremely rounded corners (pill-shaped buttons, 24px+ radius for cards) to convey friendliness and modern mobile-first design.
- **Micro-Animations:** Fluid, physics-based transitions (Framer Motion) and "breathing" elements (like the energy flow in the battery).

## 2. Color Palette & Roles

### Core Neutrals
*   **Warm Cream (#FFF2E2 / #FFF8E1):** Used for the primary background of the REVOO Guest App. It provides a softer, more premium contrast than pure white.
*   **Deep Sea Blue (#1A2B3D):** The primary brand color for high-contrast elements, headers, and primary buttons in the Admin/Owner panels.
*   **Soft Charcoal (#4E342E):** Used for primary text and iconography to maintain readability while fitting the warm theme.

### Semantic & Luxury Colors (Loyalty Tiers)
*   **Energy Red (#FF3131):** 10% Tier (Low/Base). Represents a "low charge" or starting state.
*   **Vibrant Orange (#FF8800):** 25% Tier (Regular). A warm, energetic mid-tier color.
*   **Golden Sun (#FFD700):** 50% Tier (VIP). Represents high value and luxury.
*   **Emerald Glow (#00FF41):** 100% Tier (Super VIP/Max). Represents a fully "charged" loyalty status.

## 3. Typography Rules
*   **Font Family:** `Inter` or `System Default` (Apple/Android).
*   **Weights:** 
    *   **Headline:** Black (900) or Bold (800) for maximum impact.
    *   **Body:** Medium (500) or Semi-Bold (600) for high legibility on mobile.
*   **Letter Spacing:** Wide tracking (1px to 2px) for uppercase labels to enhance the premium feel.

## 4. Key Components

### The "Energy Pulse" Battery (`PngBattery.jsx`)
A custom-built 3D-skeuomorphic battery that visualizes loyalty status:
*   **Inner Glow:** Each state (10%, 25%, 50%, 100%) has a distinct radial gradient glow that "bleeds" behind the battery.
*   **Liquid Flow:** A horizontal "energy wave" that sweeps across the segments.
*   **Segment Animation:** 14 discrete segments that "pulse" with a brightness filter and slight scale increase (1.02x).
*   **Sparkles:** Floating white "energy bubbles" that rise and fade when at high tiers (50%/100%).

### Timeline Block
*   **Visuals:** Horizontal dashed lines or step-indicators.
*   **Labels:** "Within 1 day", "Any other time".
*   **Footer:** A motivational text block (e.g., *"Чем чаще ты посещаешь, тем выше ВИП статус и награда!"*) in a centered, italicized, or soft-colored style.

## 5. Layout Principles
*   **Safe Areas:** Mobile screens (iPhone 15/16/17) must ensure the "Get My Reward" or primary CTA is always visible without overlapping other elements.
*   **Padding:** Generous whitespace (24px to 40px) between major sections.
*   **Floating Elements:** Buttons and cards should appear to "float" over the background using `softShadow` (diffused, low-opacity black/brown shadows).
