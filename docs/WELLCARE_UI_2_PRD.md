# WellCare UI 2.0 — Product Requirements Document

**Status:** Ready for design and implementation planning
**Target branch:** `feature/alpha`
**Primary audience:** Busy adults arranging reliable assistance for parents or loved ones
**Initial language:** English
**Localization:** Required at the React architecture level

## 1. Product intent

WellCare helps people arrange dependable, real-world assistance for loved ones when they cannot be physically present themselves. The UI must communicate human reliability, safety, visibility, and emotional reassurance without presenting WellCare as a hospital, nursing provider, emergency service, or generic gig marketplace.

UI 2.0 will redesign the complete customer, guide, and administrator experience while preserving existing business logic and working flows.

The experience should feel:

- Warm and humane
- Premium but approachable
- Calm, trustworthy, and purposeful
- Modern without resembling a generic SaaS template
- Accessible to both digitally confident adults and older users
- Relevant to an Indian audience without visual stereotypes

## 2. Product principles

### 2.1 Human presence over transactional utility

Copy and imagery should emphasize showing up for someone, staying with them, helping them navigate, and giving their family peace of mind.

### 2.2 Trust must be demonstrated

Safety and reliability should be communicated through clear processes, verified-guide cues, booking visibility, transparent status messages, and reassuring interface behaviour.

### 2.3 Operational clarity

Booking, matching, navigation, cancellation, completion, availability, and approval states must be immediately understandable. Visual polish must never obscure the current state or the next action.

### 2.4 Purposeful motion

Animation should explain hierarchy, reinforce feedback, and add emotional warmth. It must not delay important tasks or make dashboards unstable.

### 2.5 Localization-ready by construction

User-visible copy must not be embedded throughout JSX. Layouts must tolerate longer translated strings, different date and number formats, and future right-to-left support where practical.

## 3. Creative direction

### 3.1 Visual personality

The visual direction combines:

- **Warm premium:** refined typography, generous spacing, rich photography, restrained surfaces, and deliberate composition.
- **Friendly modern:** approachable language, expressive cards, soft geometry, lightweight illustrations, and helpful micro-interactions.
- **Human trust:** authentic scenarios, visible safety signals, clear expectations, and calm feedback.

### 3.2 Reference interpretation

Visilean is a structural and motion reference rather than a visual template. WellCare may adapt the following principles:

- A decisive hero with layered imagery
- Clear transitions between narrative sections
- Alternating text and visual compositions
- Large interface previews
- Audience-specific cards
- Numbered “How It Works” storytelling
- Credibility and testimonial bands
- Editorial blog cards
- A substantial closing CTA and footer
- Restrained scroll reveals and visual accents

WellCare must not copy Visilean’s brand identity, construction imagery, exact compositions, or proprietary assets.

### 3.3 Proposed colour character

Final values will be determined during the design-system implementation and checked for accessible contrast.

- Deep evergreen or forest teal: primary trust colour
- Warm ivory: principal light background
- Muted sage: supporting surfaces and calm states
- Soft coral or amber: warmth, highlights, and selected calls to action
- Charcoal: primary typography
- Semantic green, amber, red, and blue: success, warning, destructive, and informational states

Dark mode must be designed intentionally rather than produced by mechanically inverting the light palette.

### 3.4 Typography

The typography system should provide:

- A distinctive but highly readable display face for public-page storytelling
- A neutral, compact UI face for forms, dashboards, maps, tables, and transactional content
- Fluid responsive sizes using design tokens
- Comfortable body line length and line height
- Complete rendering for future supported languages

Font selection must be compatible with commercial product use and must not prevent later Indian-script localization.

### 3.5 Shape and surface language

- Soft but controlled radii
- Subtle borders instead of excessive shadows
- Layered surfaces for important storytelling moments
- Stronger elevation only for floating controls, dialogs, menus, and active booking elements
- Consistent icon sizing and stroke weight
- No arbitrary gradients or decorative glass effects that reduce legibility

## 4. Brand identity

### 4.1 Temporary logo

Create a temporary symbol-plus-wordmark identity for WellCare.

The symbol should suggest:

- Companionship
- Safe movement
- Protection
- Dependable human presence

Avoid:

- Medical crosses
- Hospital symbolism
- Generic heart-in-hand marks
- Visual similarity to established healthcare or insurance brands
- Detailed shapes that fail at favicon size

The identity must include:

- Horizontal wordmark
- Compact symbol
- Light-background variant
- Dark-background variant
- Favicon
- Appropriate accessible text alternatives

### 4.2 Imagery

Initial landing-page and editorial imagery may be AI-generated.

Rules:

- Illustrative guide and user stories must be identified as sample content.
- Generated people must never be represented as real WellCare customers or guides.
- Scenarios should feel grounded in everyday Indian life.
- Imagery should show companionship, errands, appointments, mobility, waiting, and reassurance.
- Avoid hospital-heavy imagery, helpless portrayals of older adults, staged corporate handshakes, or exaggerated emotional distress.

## 5. Information architecture

### 5.1 Public navigation

Recommended order:

1. Home
2. How It Works
3. About Us
4. Know Our Guides
5. Blogs

Actions:

- Primary: Find trusted help
- Secondary: Become a WellCare Guide
- User authentication entry
- Theme toggle
- Future locale selector

“How It Works” remains an anchored landing-page section for this phase.

### 5.2 Mobile navigation

Public mobile navigation should use a compact header with:

- Logo
- Theme control
- Authentication-aware primary action
- Accessible menu button
- Drawer or sheet containing navigation and guide CTA

The existing permanent public bottom navigation should not be retained unless usability testing demonstrates a clear need.

### 5.3 Application navigation

Customer, guide, and admin portals should have distinct navigation shells because their priorities differ. Authentication state must remain isolated between customer, guide, and admin contexts.

## 6. Landing page

### 6.1 Hero

The hero must immediately explain the emotional and practical problem:

> You cannot always be there in person. WellCare helps someone dependable be there for your loved one.

Requirements:

- Primary CTA: **Find trusted help**
- Secondary CTA: **Become a WellCare Guide**
- A visual storyboard showing the customer, their loved one, and the guide relationship
- Clear statement that WellCare provides real human assistance
- Trust indicators without unsupported numerical claims
- Responsive composition that remains understandable without animation
- Future-ready space for App Store and Play Store actions

### 6.2 Trust introduction

Communicate the foundations of trust:

- Guide verification
- Transparent booking states
- Real-time journey visibility
- Safety-first product decisions
- Human support and accountability

Claims must reflect implemented functionality. Aspirational features must not be presented as currently available.

### 6.3 How It Works

A three- or four-step visual sequence:

1. Tell us where help is needed
2. Choose now or schedule ahead
3. Get matched with a suitable guide
4. Stay informed throughout the assistance

The sequence should support scroll-driven reveals while remaining fully readable in reduced-motion mode.

### 6.4 Feature promotion

Promote critical capabilities with alternating feature compositions or carefully varied cards:

- Instant assistance
- Scheduled booking
- Route-aware fare estimation
- Real-time navigation and status
- Real human waiting assistance
- Safety-first matching and verification
- Booking visibility for family members

Use real interface previews after the application redesign is complete. Temporary mockups may be used during the landing-page implementation.

### 6.5 Built for Trust

Include:

- Trust-focused content cards
- A prominent video placeholder
- Poster image and clear play affordance
- Space for a future YouTube embed
- Captions/transcript affordance for the eventual video
- No autoplay with sound

### 6.6 Everyday impact stories

Present short, emotionally grounded sample stories showing how WellCare can help:

- A daughter arranging accompaniment for a parent’s appointment
- A son arranging help with an important errand while working in another city
- A person receiving patient waiting and navigation assistance

Each placeholder story must be clearly marked as illustrative until replaced with genuine, consented testimonials.

### 6.7 Guide opportunity

Position guide work as meaningful, flexible earning:

- Monetize time, local familiarity, patience, and emotional intelligence
- Help people with dignity
- Work with flexibility
- Join a safety-conscious platform

Avoid language that trivializes care work or promises unsupported earnings.

### 6.8 Blog preview

Include:

- Editorial heading and short description
- Three or more responsive article cards
- Dummy thumbnails
- Category, title, metadata, and excerpt
- Clear placeholder state
- “View all articles” action

Blog publishing and CMS functionality are outside the current functional scope.

### 6.9 Closing CTA

Reinforce both sides of the marketplace:

- Customer: Find trusted help
- Guide: Make your time and empathy meaningful

The section should transition naturally into the footer.

### 6.10 Footer

The footer should be professional, minimal, and comprehensive.

Suggested groups:

- Product: How It Works, Book a Guide, Safety
- Company: About Us, Know Our Guides, Careers placeholder
- Resources: Blogs, Help placeholder, Contact placeholder
- For Guides: Become a Guide, Guide Sign In
- Legal: Privacy, Terms, Accessibility placeholders
- Brand statement, copyright, theme control, and social placeholders

Do not publish fake addresses, certifications, phone numbers, or social accounts.

## 7. Public supporting pages

### 7.1 About Us

Sections:

- Mission
- Problem being solved
- Why WellCare exists
- Product principles
- Safety and dignity commitments
- Dual customer/guide CTA

### 7.2 Know Our Guides

Sections:

- Guide community introduction
- Selection and verification explanation
- Sample guide-story cards
- Individual story presentation
- Guide application CTA

Sample identities must be visibly labelled as illustrative.

### 7.3 Blogs

For UI 2.0:

- Blog listing page
- Search/filter presentation if useful
- Article-card system
- Article-detail presentation using mock content
- Responsive editorial typography

CMS, authoring, and publication workflows remain out of scope.

## 8. Authentication

### 8.1 Customer authentication

Redesign:

- Sign-in
- Registration
- Phone verification
- Validation and errors
- Loading and success states
- Authentication-aware redirection

### 8.2 Guide authentication

Redesign:

- Guide sign-in
- Multi-part guide registration
- Document upload states
- Submission confirmation
- Pending approval
- Rejected application
- Recovery or next-step guidance

### 8.3 Authentication presentation

Use a responsive split or editorial composition where space allows:

- Form-focused primary area
- Product benefit, trust cue, or human story
- Clear switching between customer and guide entry points
- Minimal distraction on small screens

### 8.4 OTP input component

This phase changes the UI component and input behaviour, not the OTP provider or verification backend.

Required behaviour:

- Edit any individual digit
- Cursor and focus remain predictable
- Backspace clears the current value and navigates naturally
- Arrow keys move between digits
- Pasting a complete six-digit code fills all slots
- Pasting partial valid input behaves sensibly
- Non-numeric characters are rejected
- Mobile numeric keyboard is requested
- Focus does not jump to the first digit after completion
- Complete code can be selected and replaced
- Accessible labels and error association
- Resend countdown, expiry, loading, success, and error states

## 9. Customer booking experience

All current booking capabilities must remain functional.

### 9.1 Booking entry

- Clear choice between instant and scheduled assistance
- Explain the operational difference without technical terminology
- Obvious current selection
- Progressive disclosure to reduce cognitive load

### 9.2 Booking details

- Assistance type
- Pickup and destination
- Date and time where applicable
- Notes or contextual information
- Route and fare information
- Review before confirmation

### 9.3 Location and fare

- Clear autocomplete states
- Map and route hierarchy
- Loading and fallback states
- Fare breakdown that distinguishes estimates from final values
- Error recovery without losing completed form data

### 9.4 Confirmation and payment

- Booking summary
- Payment status and retry states
- Clear distinction between scheduled confirmation and active matching
- Next-step messaging

### 9.5 Finding a guide

- Reserved for bookings actively released to dispatch
- Reassuring progress messaging
- Cancellation action where business rules allow it
- Timeout and no-guide-found states
- Must not visually imply active matching for a future scheduled booking that has not been released

### 9.6 Active booking

- Guide information
- Current booking state
- Navigation and location information
- Safety and contact actions supported by the product
- Cancellation or support affordances according to booking rules
- Completion and rating transition

### 9.7 Scheduled booking state

Before the future dispatch-engine enhancement, the UI must accurately reflect the backend’s current state. The visual system should already support:

- Scheduled and awaiting release
- Released for matching
- Guide assigned
- Guide en route
- Assistance active
- Completed
- Cancelled
- Dispatch delayed or failed

The dispatch engine itself remains a separate task after UI 2.0.

## 10. Customer dashboard

### 10.1 Dashboard shell

- Professional responsive navigation
- Clear page title and user context
- Theme toggle
- Strong active-state treatment
- Mobile-friendly primary actions

### 10.2 Overview

Prioritize:

- Current or upcoming booking
- Book assistance
- Scheduled bookings
- Recent activity
- Safety/help entry
- Useful account completion prompts

Avoid decorative metrics that do not help the customer make a decision.

### 10.3 Booking cards

Cards must communicate:

- Instant or scheduled
- Date and time
- Assistance type
- Locations
- Guide and assignment state
- Price/payment state
- Current status
- Primary available action

### 10.4 Customer profile

Redesign the profile as a structured account experience:

- Identity and contact information
- Verified phone status
- Saved information supported by the model
- Profile editing
- Security/session actions
- Clear destructive-action treatment

Do not invent fields unsupported by the current data model.

## 11. Guide portal

### 11.1 Guide dashboard shell

- Distinct professional identity from the customer portal
- Availability control with unmistakable state
- Incoming-request visibility
- Current assistance
- Earnings or activity information only where supported
- Profile and approval status

### 11.2 Incoming request

The request experience must remain urgent without becoming alarming:

- Clear customer need and locations
- Time-sensitive progress indicator
- Accept and decline actions
- Safe disabled/loading states preventing duplicate responses
- Accessible audio and visual notification treatment

Scheduled requests released by the backend must look identical to normal “now” requests, as required by the product model.

### 11.3 Active assistance

- Customer and trip information
- Navigation actions
- State transitions
- Completion controls
- Cancellation notifications
- Strong confirmation for irreversible actions

### 11.4 Guide profile and editing

- Identity and profile image
- Skills and service information
- Documents and verification state
- Availability-relevant information
- Edit, validation, upload, progress, and error states
- Clear explanation when approval is pending or changes require review

## 12. Admin portal

Admin is desktop-first, with basic tablet support.

### 12.1 Admin login

- Purpose-built secure presentation
- Password visibility control
- Loading, error, lockout, and session-expiry states where supported
- No customer marketing navigation

### 12.2 Admin shell

- Persistent desktop navigation
- Clear module titles
- Session/logout action
- High information density without visual clutter

### 12.3 Dashboard and tables

Redesign existing modules and tables with:

- Summary cards based on real data
- Search and filters where supported
- Status filters and badges
- Sorting where supported
- Pagination
- Loading skeletons
- Empty states
- Error recovery
- Row actions
- Confirmation dialogs
- Responsive overflow handling
- Sticky headings where useful

Admin functionality and permissions must not be expanded silently during the visual redesign.

## 13. Global component system

Create or standardize reusable components for:

- Brand logo
- Public and application navigation
- Theme toggle
- Locale-ready navigation control
- Buttons
- Inputs and text areas
- OTP input
- Selects and autocomplete
- Cards and status cards
- Booking cards
- Status badges
- Tables and pagination
- Dialogs, drawers, and sheets
- Toasts
- Empty states
- Error states
- Skeletons and progress indicators
- Image and video placeholders
- Section headers
- Editorial cards
- Page containers and responsive grids

### 13.1 Buttons

Required variants:

- Primary
- Secondary
- Outline
- Quiet/ghost
- Destructive
- Link
- Icon-only

All variants need hover, pressed, focus-visible, loading, disabled, and dark-mode states. Touch targets must remain usable on mobile.

### 13.2 Toast system

Use one global toast system rather than competing implementations.

Required variants:

- Success
- Error
- Warning
- Informational
- Persistent/actionable where necessary

Requirements:

- Entrance and exit animation
- Reduced-motion fallback
- Accessible live-region behaviour
- Optional action
- Dismiss action
- Mobile-safe placement
- No duplicate toast storms
- Clear handling of long localized strings

## 14. Motion system

### 14.1 Public pages

Permitted motion:

- Section reveal
- Staggered cards
- Image masks or gentle parallax
- Floating decorative elements
- Story-step transitions
- Number and credibility reveals using truthful data only
- CTA feedback

### 14.2 Application pages

Motion should be quieter:

- Route/page transitions
- Tab and filter changes
- Card state transitions
- Dialog/drawer movement
- Booking status changes
- Toasts and loading feedback

### 14.3 Motion constraints

- Critical content cannot depend on animation
- Respect `prefers-reduced-motion`
- Avoid scroll hijacking
- Avoid constant decorative movement near forms
- Avoid long animation before an action becomes available
- No layout shift caused by delayed animation initialization

## 15. Theme system

- Support light, dark, and system preference
- Persist the user’s selection
- Avoid an incorrect-theme flash during application startup
- Expose the toggle on public and authenticated user-facing surfaces
- Make maps, charts, inputs, dialogs, and toasts theme-aware
- Ensure semantic states remain distinguishable in both themes

## 16. React localization architecture

Localization is not required to ship with multiple languages during UI 2.0, but the implementation must be translation-ready.

### 16.1 Requirements

- Use a centralized React internationalization layer
- Store English strings in namespaced locale resources
- Do not introduce new hard-coded user-visible strings in page JSX
- Organize namespaces by domain, for example:
  - `common`
  - `navigation`
  - `landing`
  - `auth`
  - `booking`
  - `customer`
  - `guide`
  - `admin`
  - `errors`
- Use interpolation rather than string concatenation
- Use pluralization rules for counts
- Format dates, times, numbers, currency, and relative time through locale-aware helpers
- Keep backend status values separate from translated labels
- Provide fallback to English
- Permit lazy loading of locale resources later
- Keep route URLs stable unless a future localization strategy explicitly changes them

### 16.2 Layout requirements

- Controls must tolerate text expansion
- Avoid fixed-width buttons based on English labels
- Avoid truncating critical status or error text
- Cards and navigation must reflow safely
- Components should not assume left-to-right icon placement where avoidable
- Decorative imagery must not contain essential English text

### 16.3 Content governance

- Translation keys should express meaning rather than copy position
- Placeholder/testimonial labels must also be localized
- Validation messages should come from the shared translation layer
- Server errors should map to stable client translation keys where possible

## 17. Accessibility

Target WCAG 2.2 AA practices throughout the redesign.

Requirements include:

- Keyboard-operable navigation and workflows
- Visible focus
- Semantic headings and landmarks
- Accessible labels, descriptions, and errors
- Sufficient colour contrast
- Minimum practical touch-target sizing
- No colour-only status communication
- Screen-reader announcements for asynchronous states
- Reduced-motion support
- Captions/transcript path for video
- Meaningful image alternatives
- Decorative images hidden from assistive technology
- Focus management for dialogs, drawers, route changes, and OTP entry

## 18. Responsive behaviour

### 18.1 Public/customer/guide

Design and verify at:

- Small mobile
- Large mobile
- Tablet
- Laptop
- Wide desktop

Layouts must be content-driven rather than tied only to a few fixed device widths.

### 18.2 Admin

- Desktop-first
- Basic tablet usability
- Horizontal overflow allowed for complex tables when necessary
- Phone layout is not a release blocker

## 19. Performance

- Keep the booking path responsive on mid-range mobile devices
- Optimize generated imagery and provide responsive sizes
- Lazy-load below-the-fold media
- Avoid autoplaying heavy video
- Prevent layout shift by reserving media dimensions
- Code-split large public and portal routes where useful
- Keep animation GPU-friendly
- Do not make the application dependent on animation libraries for basic usability

## 20. Content rules

- Initial experience is English
- Architecture must support later localization
- Guide and customer stories are explicitly illustrative placeholders
- Blog content is mock editorial content
- Do not publish invented testimonials as genuine
- Do not publish unsupported safety, verification, availability, earnings, or performance claims
- Keep terminology consistent across public pages, portals, notifications, and booking states

## 21. Current route coverage

The existing application audit identifies these routes and states for redesign:

### Public/customer

- `/`
- `/about`
- `/guides`
- `/verify-phone`
- `/book`
- `/dashboard`
- `/booking-confirmation/:bookingId`
- `/finding-guide/:bookingId`
- Not-found state

### Guide

- `/guide/login`
- `/guide/register`
- `/guide/pending-approval`
- `/guide/rejected`
- `/guide/dashboard`
- `/guide/edit-profile`
- Incoming booking popup
- Active booking state
- Booking cancellation notification

### Admin

- `/admin/login`
- `/admin`

### New public routes anticipated by the PRD

- `/blogs`
- `/blogs/:slug`

Final route naming should be confirmed during implementation planning without breaking existing deep links.

## 22. Out of scope for UI 2.0

- MSG91 production OTP integration
- Scheduled-booking dispatch engine redesign
- Native Android or iOS applications
- Real blog CMS
- Real testimonial ingestion
- New admin permissions or backend modules
- Unsupported analytics or business metrics
- Backend data-model expansion solely to fill visual space

## 23. Delivery sequence

Recommended implementation order:

1. Design tokens, themes, typography, motion utilities, and localization foundation
2. Logo, favicon, global buttons, forms, toasts, navigation, and layout primitives
3. Landing page and public supporting pages
4. Customer authentication and OTP component
5. Customer booking flow and transitional states
6. Customer dashboard and profile
7. Guide authentication, approval states, dashboard, and profile
8. Admin login, shell, metrics, and tables
9. Responsive, accessibility, localization-readiness, dark-mode, and motion audit
10. End-to-end regression verification

## 24. Acceptance criteria

UI 2.0 is ready for product review when:

- Every existing route and operational state has an intentional light and dark presentation
- Public pages clearly explain WellCare to the primary audience
- Customer and guide calls to action are distinct and compelling
- Existing booking and authentication behaviour remains functional
- Scheduled bookings are not visually misrepresented as active dispatch before release
- OTP input meets the interaction requirements in this document
- Customer and guide dashboards prioritize active and upcoming work
- Admin tables support real loading, empty, error, and populated states
- One global toast system is used
- Theme preference persists without disruptive flashing
- New user-visible copy uses the localization layer
- Layouts tolerate longer translated strings
- Key workflows are keyboard accessible
- Reduced-motion mode is usable
- Mobile customer and guide flows are complete
- Admin is usable on supported desktop and tablet widths
- Generated/sample content is transparently labelled
- No unsupported product claims have been introduced
- Build, automated tests, and targeted browser checks pass

## 25. Post-implementation review

After the first complete UI 2.0 pass, the product owner will perform two additional review cycles and provide visual, content, and usability feedback. Those cycles may refine presentation but should not silently expand the backend scope.
