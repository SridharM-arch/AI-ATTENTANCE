# 🎨 Design Tokens & Tailwind Reference

## Color Palette

### Primary Colors
```
Indigo:    #4F46E5  (Primary brand color)
Purple:    #7C3AED  (Accent / Secondary)
```

### Status Colors
```
Success:   #10B981  (Green - Completed, Active)
Error:     #EF4444  (Red - Failed, Danger)
Warning:   #F59E0B  (Amber - Warning, Caution)
Info:      #3B82F6  (Blue - Information)
```

### Neutral Colors
```
White:     #FFFFFF
Gray:      #F9FAFB, #F3F4F6, #E5E7EB, #D1D5DB, #9CA3AF, #6B7280, #4B5563, #374151, #1F2937, #111827
```

### Gradients Used
```
Primary:   from-indigo-500 to-purple-600
Success:   from-green-500 to-teal-600
Error:     from-red-500 to-red-600
Info:      from-blue-500 to-indigo-600
```

---

## Spacing Scale

### Padding
```
p-0    = 0px
p-1    = 0.25rem (4px)
p-2    = 0.5rem  (8px)
p-3    = 0.75rem (12px)
p-4    = 1rem    (16px)     ← Most common
p-6    = 1.5rem  (24px)     ← Used in cards
p-8    = 2rem    (32px)
```

### Gaps (Flex/Grid)
```
gap-1  = 0.25rem (4px)
gap-2  = 0.5rem  (8px)
gap-3  = 0.75rem (12px)
gap-4  = 1rem    (16px)     ← Most common
gap-6  = 1.5rem  (24px)     ← Between sections
gap-8  = 2rem    (32px)
```

### Margins
```
m-0    = 0px
m-1-4  = 0.25rem (4px)
m-2    = 0.5rem  (8px)
m-4    = 1rem    (16px)
mb-4   = margin-bottom: 1rem
mt-6   = margin-top: 1.5rem
```

---

## Typography Scale

### Font Sizes
```
text-xs    = 0.75rem  (12px)  - Small labels
text-sm    = 0.875rem (14px)  - Secondary text
text-base  = 1rem     (16px)  - Body text
text-lg    = 1.125rem (18px)  - Subheadings
text-xl    = 1.25rem  (20px)  - Card titles
text-2xl   = 1.5rem   (24px)  - Section titles
text-3xl   = 1.875rem (30px)  - Page titles
```

### Font Weights
```
font-normal = 400  - Body text
font-medium = 500  - Labels, secondary headers
font-semibold = 600 - Card titles
font-bold   = 700  - Headers
```

### Font Families
```
font-sans    = Manrope    (Body text)
font-display = Space Grotesk (Headers)
```

---

## Border Radius Scale

```
rounded      = 0.25rem (4px)   - Subtle
rounded-lg   = 0.5rem  (8px)   - Small cards
rounded-xl   = 0.75rem (12px)  - Main cards
rounded-2xl  = 1rem    (16px)  - Large cards
rounded-full = 9999px          - Circles
```

---

## Shadow Scale

```
shadow-sm  = 0 1px 2px rgba(0,0,0,0.05)      - Subtle
shadow-md  = 0 4px 6px rgba(0,0,0,0.1)       - Normal
shadow-lg  = 0 10px 15px rgba(0,0,0,0.1)     - Hover state
shadow-xl  = 0 20px 25px rgba(0,0,0,0.1)     - Large
```

---

## Responsive Breakpoints

```
Mobile:    < 640px   (default / 1 column)
Tablet:    ≥ 640px   (2 columns) - sm
iPad:      ≥ 768px   (2-3 cols)  - md
Desktop:   ≥ 1024px  (3-4 cols)  - lg
Wide:      ≥ 1280px  (Full)      - xl
```

### Usage Examples
```tsx
// Default mobile, then 2 cols on tablet, 3 on desktop
className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3"

// Default hidden, show on desktop
className="hidden lg:block"

// Full width on mobile, 50% on desktop
className="w-full md:w-1/2"
```

---

## Component Sizes

### Button Sizes
```
size-sm   = px-3 py-2 text-sm
size-md   = px-4 py-2.5 text-base    ← Default
size-lg   = px-6 py-3 text-lg
```

### Icon Sizes
```
w-4 h-4   = 16px × 16px   - Small icons
w-5 h-5   = 20px × 20px   - Standard
w-6 h-6   = 24px × 24px   - Large
w-8 h-8   = 32px × 32px   - XL
w-12 h-12 = 48px × 48px   - Avatar size
```

### Card Sizes
```
min-h-screen    = Full viewport height
px-6            = Card horizontal padding
py-8            = Card vertical padding
max-w-7xl       = Max container width (80rem)
```

---

## Animation Settings

### Duration
```
duration-100 = 100ms   - Quick
duration-200 = 200ms   - Standard
duration-300 = 300ms   - Smooth
duration-500 = 500ms   - Slow
```

### Easing
```
ease-linear      = Constant speed
ease-in          = Slow start
ease-out         = Slow end
ease-in-out      = Slow start & end
```

### Transitions
```
transition-all           = Animate all properties
transition-colors        = Animate color changes
transition-transform     = Animate scale/translate
duration-200             = 200ms animation
```

---

## Dark Mode Classes

All dark mode classes follow this pattern:

```tsx
// Light mode / Dark mode
className="bg-white dark:bg-gray-800"
className="text-gray-900 dark:text-white"
className="border-gray-200 dark:border-gray-700"
className="hover:bg-gray-50 dark:hover:bg-gray-700"
```

---

## Common Component Classes

### Card Base
```tsx
className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-200 dark:border-gray-700 shadow-sm"
```

### Button Primary
```tsx
className="bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white"
```

### Input Base
```tsx
className="px-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
```

### Stat Card Icon Background
```tsx
className="p-3 rounded-xl bg-indigo-100 dark:bg-indigo-900"
```

### Badge / Status
```tsx
className="px-3 py-1 rounded-full text-xs font-semibold bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400"
```

---

## Hover & Interaction States

### Scale Transforms
```tsx
whileHover={{ scale: 1.02 }}  // Grows 2%
whileHover={{ scale: 1.05 }}  // Grows 5%
whileTap={{ scale: 0.98 }}    // Shrinks on click
```

### Translate Transforms
```tsx
whileHover={{ y: -4 }}        // Lifts 4px
whileHover={{ x: 2 }}         // Moves right 2px
```

### Opacity Changes
```tsx
hover:opacity-80               // 80% opacity on hover
hover:opacity-90               // 90% opacity on hover
```

### Color Changes
```tsx
hover:bg-gray-100              // Subtle background change
hover:text-indigo-600          // Text color on hover
```

---

## Layout Patterns

### Centered Container
```tsx
<div className="max-w-7xl mx-auto px-6">
  {/* Content automatically centered with padding */}
</div>
```

### Grid with Responsive Columns
```tsx
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
  {/* Items */}
</div>
```

### Flex with Gap
```tsx
<div className="flex gap-4">
  {/* Items with consistent spacing */}
</div>
```

### Stacked Form Inputs
```tsx
<div className="space-y-4">
  <Input label="First" />
  <Input label="Second" />
  {/* Consistent vertical spacing */}
</div>
```

---

## Z-Index Scale

```
z-0     = 0       - Behind content
z-10    = 10      - Default
z-20    = 20      - Modals
z-30    = 30      - Dropdowns
z-40    = 40      - Fixed elements
z-50    = 50      - Sticky header
```

Used in HostDashboard:
```tsx
className="sticky top-0 z-50 bg-white"  // Header stays on top
```

---

## Performance Considerations

### CSS Properties That Trigger Repaints
```
❌ Avoid: width, height, left, right, top, bottom
✅ Use: transform: translateX(), scale()

❌ Avoid: background-color changes frequently
✅ Use: opacity changes with transition
```

### Optimized Animations
```tsx
// Uses GPU acceleration
transform: translate3d()
transform: scale()
transform: rotateZ()
opacity: 0-1

// Avoid these (cause repaints)
left, right, top, bottom
width, height
inline values
```

---

## Accessibility (A11y)

### Focus Styles
```tsx
focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent
```

### Color Contrast
```
Text on backgrounds maintained ≥ 4.5:1 contrast
Icons with backgrounds always have sufficient contrast
Form labels always present for inputs
```

### Touch Targets
```tsx
min-h-44px  // Buttons have minimum 44px height
min-w-44px  // Buttons have minimum 44px width
```

---

## File Structure Reference

```
src/
├── components/
│   ├── ui/
│   │   ├── Button.tsx      - Variant: primary/secondary/danger/success/outline
│   │   ├── Card.tsx        - Regular + StatCard variants
│   │   ├── Input.tsx       - Input + Select components
│   │   ├── FileDropzone.tsx - Drag & drop
│   │   └── index.ts        - Exports all
│   ├── HostDashboard.tsx   - Main dashboard (redesigned)
│   └── [others]
├── index.css               - Global styles + CSS variables
└── tailwind.config.js      - Tailwind configuration

root/
├── QUICK_START_GUIDE.md
├── REDESIGN_COMPLETE.md
├── COMPONENT_USAGE_GUIDE.md
└── DESIGN_TOKENS.md (this file)
```

---

## Quick Copy & Paste Recipes

### Stat Card Row
```tsx
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
  <StatCard icon={<Icon />} label="Label" value={0} />
</div>
```

### Form with Submit
```tsx
<Card>
  <div className="space-y-6">
    <Input label="Title" />
    <Button variant="primary" fullWidth>
      Submit
    </Button>
  </div>
</Card>
```

### Responsive Grid
```tsx
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
  {/* Cards */}
</div>
```

### Sticky Header
```tsx
<header className="sticky top-0 z-50 bg-white dark:bg-gray-800 border-b">
  {/* Header content */}
</header>
```

---

This guide serves as your design system reference! Use these tokens consistently throughout your app. 🎨
