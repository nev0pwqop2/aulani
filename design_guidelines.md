# Roblox Staff Portal - Design Guidelines

## Design Approach

**Selected Approach**: Custom Gaming/Tech Portal Design  
Drawing inspiration from modern gaming platforms (Discord, Steam, Roblox itself) and enterprise admin panels (Linear, Vercel Dashboard) to create a professional yet engaging staff management interface.

**Core Principles**:
- Gaming-inspired aesthetics with enterprise functionality
- Clear hierarchy for complex approval workflows
- Efficient data scanning for admin users
- Professional yet approachable for staff members

---

## Typography System

**Primary Font**: Inter (via Google Fonts CDN)
- Headings: 600-700 weight
- Body: 400-500 weight
- Captions/Labels: 500 weight

**Type Scale**:
- Page Headers: text-3xl (30px)
- Section Titles: text-xl (20px)
- Card Titles: text-lg (18px)
- Body Text: text-base (16px)
- Labels/Meta: text-sm (14px)
- Micro Text: text-xs (12px)

---

## Layout System

**Spacing Primitives**: Tailwind units of 2, 4, 6, and 8
- Component padding: p-4 to p-6
- Section spacing: gap-6 to gap-8
- Card margins: m-4
- Button padding: px-6 py-3

**Container Strategy**:
- Sidebar: Fixed width 256px (w-64)
- Main content: max-w-7xl with px-6
- Form containers: max-w-2xl for optimal readability
- Admin tables: Full width with horizontal scroll on mobile

**Grid Layouts**:
- Dashboard cards: grid-cols-1 md:grid-cols-2 lg:grid-cols-3
- Request history: Single column table layout
- Admin filters: grid-cols-2 md:grid-cols-4

---

## Component Library

### Navigation (Sidebar)

**Structure**:
- Logo/branding at top (h-16)
- Navigation links with icons (Heroicons)
- Active state with accent border-l-4
- Sticky positioning with full viewport height
- Collapsible on tablet (hamburger menu)

**Items**:
- Dashboard, Request Transfer, Request LOA, Request History, Admin Panel (role-based)

### Topbar

**Layout**: Horizontal flex justify-between
- Left: Breadcrumbs or page title
- Right: "Welcome, [Username]" + Logout button
- Height: h-16
- Border bottom separator

### Dashboard Cards

**Quick Action Cards**:
- Rounded-xl corners
- Shadow-md elevation
- Icon + Title + Description + CTA button
- Hover: shadow-lg transition
- 2-column grid on desktop

**Recent Requests Table**:
- Striped rows for readability
- Status badges (rounded-full px-3 py-1)
- Minimal borders
- Hover row highlight
- 5-7 recent items max

### Forms

**Input Fields**:
- Rounded-lg borders
- Focus ring with accent
- Label above input (text-sm font-medium)
- Helper text below (text-xs)
- Consistent height: h-12

**Dropdowns**:
- Custom styled select with chevron icon
- Department/Sub-department cascading logic
- Multi-level hierarchy display

**Date Pickers**:
- Calendar popup interface
- Clear visual feedback for selected dates
- Start/End date validation

**Buttons**:
- Primary: Solid with accent, rounded-lg, px-6 py-3
- Secondary: Bordered with transparent bg
- Destructive: Red variant for reject actions
- Disabled state: Reduced opacity

### Request Cards

**Display Format**:
- Header: Request type + Status badge
- Body: Key details in grid layout
- Footer: Timestamp + Action buttons (for admins)
- Expandable accordion for full details
- Border-l-4 accent for request type categorization

### Admin Panel

**Filter Bar**:
- Sticky top positioning
- Multi-select dropdowns for departments, status, date ranges
- "Clear all" and "Apply filters" buttons
- Compact horizontal layout

**Request Queue Table**:
- Sortable columns (Date, User, Type, Department, Status)
- Batch action checkboxes
- Inline approve/reject buttons
- Quick view modal for details
- Pagination at bottom (showing 20 per page)

### Notification Menu

**Position**: Fixed bottom-right corner
- Bell icon with badge count
- Slide-up panel (max-h-96 overflow-scroll)
- Individual notification cards with:
  - Icon representing action type
  - Title + brief message
  - Timestamp (relative: "2 hours ago")
  - Read/unread indicator (dot)
  - Click to navigate to request details
- "Mark all as read" option
- Dismissible with X button

### Verification Page

**Layout**: Centered card (max-w-md)
- Step indicator (1. Enter username → 2. Add code → 3. Verify)
- Large code display with copy button
- Instructions with Roblox icon
- "Verify" CTA button
- Re-generate code option
- Countdown timer for expiration

---

## Animations

**Minimal, Purposeful Motion**:
- Page transitions: 200ms fade-in
- Sidebar toggle: 300ms slide transform
- Notification appearance: Slide-up from bottom (300ms)
- Button hover: 150ms scale subtle lift
- Card hover: Shadow transition (200ms)
- **NO** scroll-triggered animations
- **NO** auto-playing carousels or marquees

---

## Icons

**Library**: Heroicons (via CDN)
- Navigation: outline style
- Actions: solid style for emphasis
- Status indicators: Badge shapes with mini icons
- Department icons: Custom placeholder comments for future implementation

---

## Accessibility

- Semantic HTML throughout (`<nav>`, `<main>`, `<table>`)
- ARIA labels for icon-only buttons
- Focus visible states on all interactive elements
- Keyboard navigation support (Tab, Enter, Escape)
- High contrast for status indicators
- Form validation with clear error messages
- Screen reader announcements for notification updates

---

## Responsive Behavior

**Desktop (1024px+)**: Full sidebar + main content  
**Tablet (768-1023px)**: Collapsible sidebar, adjusted grid columns  
**Mobile (<768px)**: Hidden sidebar (hamburger), stacked layouts, horizontal scroll for tables

**Breakpoint Strategy**:
- Base: Mobile-first single column
- md: Tablet 2-column grids
- lg: Desktop 3-column grids + expanded layouts

---

## Images

**Not Required**: This is a data-driven admin portal. No hero images or decorative imagery needed. Focus on iconography and data visualization.

**Potential Visual Elements**:
- Roblox logo in sidebar header
- User avatars (fetched from Roblox API) in topbar and request cards
- Department/role badges as SVG icons