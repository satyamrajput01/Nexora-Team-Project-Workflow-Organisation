# Nexora – Team Project & Workflow Organization

A high-conversion, accessible, responsive product landing page and legal suite for **Nexora**, a SaaS productivity platform designed to help modern teams organize projects, track daily tasks, and coordinate workflows in one clear workspace.

---

## Project Scope & Disclosures

> **Important Scope Notice:**  
> This is an **entirely frontend-only demonstration project** built without a backend server, database, authentication system, or email service.  
> - **Form Submissions:** The interactive modal form performs client-side validation only (verifying email format and required fields directly in the browser).
> - **No Account Creation:** Submitting the form does not create an account, generate user credentials, or dispatch confirmation/verification emails.
> - **No Data Transmission or Storage:** No user data is transmitted across a network, persisted to a remote database, or stored in browser storage.
> - **Student Demonstration:** Created and maintained by Satyam Rajput for educational and portfolio demonstration purposes.

---

## Key Features

1. **Structured Project Organization:** Hierarchical workspace layouts with milestones, checklists, and Kanban board views.
2. **Interactive Workspace Demo:** Built with semantic HTML, featuring working view switcher tabs (with full keyboard ARIA navigation) and interactive checklist items with live progress calculation.
3. **Dynamic Pricing Switcher:** Accessible monthly vs. annual billing toggle with mathematically verified savings indicators ($12/mo vs $10/mo for Pro; $24/mo vs $20/mo for Team).
4. **Accessible FAQ Accordion:** ARIA-compliant expandable answers respecting user motion preferences.
5. **Interactive Client-Side Modal:** Accessible registration dialog with client-side RFC validation, keyboard focus management, and explicit demo notices.
6. **Dedicated Legal Suite:** Visually consistent, responsive pages for Privacy Policy (`privacy.html`) and Terms of Service (`terms.html`) detailing maintainer information and data handling disclosures.

---

## Technologies Used

- **Markup:** Semantic HTML5 (`header`, `nav`, `main`, `section`, `article`, `footer`, `dialog`, `button`, `label`)
- **Styling:** CSS3 & Tailwind CSS v4 with responsive layouts and `@media (prefers-reduced-motion: reduce)` support
- **Scripting:** Modular Vanilla TypeScript with zero runtime framework overhead
- **Vector Assets:** Accessible SVG icons with descriptive labels
- **Bundler & Build Tool:** Vite 8 configured for multi-page static bundling with relative paths (`base: './'`)

---

## Installation & Local Setup

### Prerequisites
- Node.js (v18.0.0 or higher recommended)
- npm (v9.0.0 or higher)

### Setup Commands
```bash
# 1. Clone repository and install dependencies
npm install

# 2. Start local Vite development server (port 3000)
npm run dev

# 3. Open in browser
# Navigate to http://localhost:3000
```

---

## Testing & Build Commands

```bash
# Run TypeScript type check (strict mode)
npm run lint

# Run automated 69-point static QA assertion suite
npm test

# Run full Playwright Chromium visual & responsive QA suite
npm run test:visual

# Compile static production distribution bundle
npm run build

# Preview production build locally
npm run build
```

---

## Design System Summary

- **Palette (60-30-10 Rule):**
  - **Dominant Canvas (60%):** Slate 50 (`#F8FAFC`) background field
  - **Surfaces & Cards (30%):** Pure White (`#FFFFFF`) cards and Slate 100 (`#F1F5F9`) wells
  - **Brand Accent (10%):** Deep Teal (`#0F766E`) for primary interactive CTAs, focus indicators, and active states
  - **Typography & Borders:** High-contrast Slate 900 headings, readable Slate 700 body text, and Slate 200 hairline borders
- **Typography Scale:** System font stack (`system-ui, -apple-system, sans-serif`) with fluid clamp scaling (`clamp(2rem, 4vw, 3.25rem)`) and tabular numerals for pricing and statistics.
- **Accessibility & Responsiveness:** Fully tested across 320px, 375px, 768px, and 1440px viewports with `:focus-visible` outlines, ARIA roles, and keyboard navigation.
