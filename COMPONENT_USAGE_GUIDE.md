# Component Usage Guide & Style Reference

## 🎨 UI Component Library

Your new component library is located in `src/components/ui/` and consists of 5 reusable, responsive components.

---

## 📦 Card Component

### Purpose
Base container for all card-based content with optional hover effects.

### Basic Usage
```tsx
import { Card } from '@/components/ui';

<Card>
  <h2>My Card Title</h2>
  <p>Card content goes here</p>
</Card>
```

### With Hover Effect
```tsx
<Card hover>
  <div>Click me!</div>
</Card>
```

### Custom Styling
```tsx
<Card className="p-8 bg-gradient-to-br from-blue-50 to-indigo-50">
  <h2>Custom Styled Card</h2>
</Card>
```

### StatCard (Specialized)
```tsx
import { StatCard } from '@/components/ui';
import { Users, TrendingUp } from 'lucide-react';

<StatCard
  icon={<Users className="w-6 h-6 text-indigo-600" />}
  label="Active Users"
  value={234}
  iconBgColor="bg-indigo-100 dark:bg-indigo-900"
/>
```

### StatCard Variants
```tsx
// With different colors
<StatCard icon={<Icon />} label="Success" value={100} iconBgColor="bg-green-100" />
<StatCard icon={<Icon />} label="Error" value={5} iconBgColor="bg-red-100" />
<StatCard icon={<Icon />} label="Warning" value={12} iconBgColor="bg-amber-100" />
<StatCard icon={<Icon />} label="Info" value={45} iconBgColor="bg-blue-100" />
```

---

## 🔘 Button Component

### Purpose
Flexible button component with multiple variants and sizes.

### Variants

#### Primary (Default - Blue Gradient)
```tsx
<Button variant="primary">
  Create Something
</Button>
```

#### Secondary (Gray)
```tsx
<Button variant="secondary">
  Secondary Action
</Button>
```

#### Danger (Red)
```tsx
<Button variant="danger">
  Delete Item
</Button>
```

#### Success (Green)
```tsx
<Button variant="success">
  Confirm
</Button>
```

#### Outline (Bordered)
```tsx
<Button variant="outline">
  Optional Action
</Button>
```

### Sizes

```tsx
<Button size="sm">Small Button</Button>
<Button size="md">Medium Button</Button>
<Button size="lg">Large Button</Button>
```

### With Icons
```tsx
import { PlusCircle, Download } from 'lucide-react';

<Button icon={<PlusCircle className="w-5 h-5" />}>
  Create New
</Button>

<Button icon={<Download className="w-5 h-5" />} size="lg">
  Download Report
</Button>
```

### Loading State
```tsx
const [isLoading, setIsLoading] = useState(false);

<Button loading={isLoading} onClick={handleSubmit}>
  {isLoading ? 'Saving...' : 'Save Changes'}
</Button>
```

### Full Width
```tsx
<Button fullWidth>
  Full Width Button
</Button>
```

### Responsive Button Row
```tsx
<div className="flex gap-3">
  <Button variant="primary" className="flex-1">
    Confirm
  </Button>
  <Button variant="secondary" className="flex-1">
    Cancel
  </Button>
</div>
```

---

## 📝 Input Component

### Purpose
Text input with labels, error states, and focus styling.

### Basic Input
```tsx
import { Input } from '@/components/ui';

<Input
  label="Session Title"
  placeholder="Enter session name"
  value={title}
  onChange={(e) => setTitle(e.target.value)}
/>
```

### Input Types
```tsx
<Input type="text" label="Name" />
<Input type="email" label="Email Address" />
<Input type="password" label="Password" />
<Input type="number" label="Participants" min={1} max={100} />
<Input type="date" label="Start Date" />
```

### With Error State
```tsx
const [error, setError] = useState('');

<Input
  label="Username"
  error={error}
  value={username}
  onChange={(e) => {
    setUsername(e.target.value);
    if (e.target.value.length < 3) {
      setError('Username must be at least 3 characters');
    } else {
      setError('');
    }
  }}
/>
```

### Required Field
```tsx
<Input
  label="Email"
  placeholder="your@email.com"
  required
/>
```

### Disabled State
```tsx
<Input
  label="User ID"
  value={userId}
  disabled
/>
```

### Select Dropdown
```tsx
import { Select } from '@/components/ui';

<Select
  label="Attendance Type"
  value={type}
  onChange={(e) => setType(e.target.value)}
  options={[
    { label: 'Percentage (%)', value: 'percentage' },
    { label: 'Minutes', value: 'minutes' }
  ]}
/>
```

### Form Group
```tsx
<div className="space-y-4">
  <Input label="First Name" />
  <Input label="Last Name" />
  <Input label="Email" type="email" />
  <Select label="Role" options={[...]} />
</div>
```

### Grid Layout Form
```tsx
<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
  <Input label="First Name" />
  <Input label="Last Name" />
  <Input label="Email" type="email" />
  <Input label="Phone" type="tel" />
</div>
```

---

## 📤 FileDropzone Component

### Purpose
Modern drag-and-drop file upload with visual feedback.

### Basic Usage
```tsx
import { FileDropzone } from '@/components/ui';

<FileDropzone
  onFiles={(files) => handleUpload(files)}
/>
```

### Multiple Files
```tsx
<FileDropzone
  onFiles={handleMultipleFiles}
  multiple={true}
  accept="image/*"
/>
```

### Single File Upload
```tsx
<FileDropzone
  onFiles={(files) => handleSingleFile(files[0])}
  multiple={false}
  accept=".pdf"
/>
```

### With Loading State
```tsx
const [loading, setLoading] = useState(false);

<FileDropzone
  onFiles={handleFiles}
  loading={loading}
  disabled={loading}
/>
```

### File Type Restrictions
```tsx
// Images only
<FileDropzone accept="image/*" onFiles={handleImages} />

// Specific image types
<FileDropzone accept=".jpg,.jpeg,.png,.webp" onFiles={handleImages} />

// Documents
<FileDropzone accept=".pdf,.doc,.docx,.xlsx" onFiles={handleDocs} />

// Multiple types
<FileDropzone accept="image/*,.pdf" onFiles={handleFiles} />
```

---

## 🎨 Styling & Tailwind Classes

### Common Classes Used

#### Padding
```tsx
className="p-4"    // All sides: 1rem
className="p-6"    // All sides: 1.5rem
className="px-4 py-2"  // Horizontal & vertical
className="p-6 md:p-8" // Responsive padding
```

#### Spacing
```tsx
className="gap-4"   // Space between items: 1rem
className="space-y-4" // Vertical space: 1rem
className="mb-4"    // Margin bottom: 1rem
className="mt-6"    // Margin top: 1.5rem
```

#### Text & Font
```tsx
className="text-sm"     // Small text
className="text-base"   // Normal text
className="text-lg"     // Large text
className="font-medium" // Medium weight
className="font-bold"   // Bold weight
className="text-gray-600" // Gray color
className="text-white"  // White text
```

#### Colors
```tsx
// Backgrounds
className="bg-indigo-500"    // Primary blue
className="bg-purple-600"    // Secondary purple
className="bg-green-500"     // Success green
className="bg-red-500"       // Error red
className="bg-gray-100"      // Light gray

// Text
className="text-indigo-600"
className="text-green-600"
className="text-red-600"

// Borders
className="border-indigo-200"
className="border-gray-300"
```

#### Grid Layouts
```tsx
// 1 column
className="grid grid-cols-1"

// 2 columns on desktop
className="grid grid-cols-1 md:grid-cols-2"

// 3 columns on desktop
className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3"

// 4 columns on desktop
className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4"
```

#### Flexbox Layouts
```tsx
// Row layout
className="flex gap-4"

// Column layout
className="flex flex-col gap-4"

// Center content
className="flex items-center justify-center"

// Space between
className="flex justify-between"
```

#### Rounded Corners
```tsx
className="rounded"      // 4px
className="rounded-lg"   // 8px
className="rounded-xl"   // 12px
className="rounded-2xl"  // 16px
className="rounded-full" // 9999px (circles)
```

#### Shadows
```tsx
className="shadow-sm"    // Light shadow
className="shadow-md"    // Medium shadow
className="shadow-lg"    // Large shadow
className="shadow-xl"    // Extra large shadow
```

#### Opacity & Transparency
```tsx
className="opacity-50"
className="opacity-75"
className="bg-white bg-opacity-10"  // 10% opaque white
```

#### Hover & Transitions
```tsx
className="hover:bg-gray-100"       // Hover state
className="transition-all duration-200"  // Smooth animation
className="hover:shadow-lg"  // Hover with shadow

// Responsive hover
className="hover:scale-105"       // Grows on hover
className="hover:translate-y-1"   // Moves up on hover
```

---

## 🎭 Dark Mode Classes

All components support dark mode out of the box:

```tsx
className="bg-white dark:bg-gray-800"
className="text-gray-900 dark:text-white"
className="border-gray-200 dark:border-gray-700"
className="hover:bg-gray-50 dark:hover:bg-gray-700"
```

---

## 📋 Complete Form Example

```tsx
import { useState } from 'react';
import { Card, Button, Input, Select, FileDropzone } from '@/components/ui';

export function CompleteForm() {
  const [formData, setFormData] = useState({
    title: '',
    duration: 60,
    type: 'percentage',
    minValue: 75
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    setLoading(true);
    try {
      // API call
      console.log('Submitting:', formData);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Create Session
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            Fill in the details and upload files
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Session Title"
            placeholder="Enter title"
            value={formData.title}
            onChange={(e) => 
              setFormData({ ...formData, title: e.target.value })
            }
            required
          />
          <Input
            label="Duration (minutes)"
            type="number"
            placeholder="60"
            value={formData.duration}
            onChange={(e) => 
              setFormData({ ...formData, duration: Number(e.target.value) })
            }
            min={1}
          />
        </div>

        <Select
          label="Attendance Type"
          value={formData.type}
          onChange={(e) => 
            setFormData({ ...formData, type: e.target.value })
          }
          options={[
            { label: 'Percentage (%)', value: 'percentage' },
            { label: 'Minutes', value: 'minutes' }
          ]}
        />

        <Input
          label="Minimum Attendance"
          type="number"
          value={formData.minValue}
          onChange={(e) => 
            setFormData({ ...formData, minValue: Number(e.target.value) })
          }
        />

        <FileDropzone onFiles={(files) => console.log(files)} />

        <Button
          variant="primary"
          fullWidth
          loading={loading}
          onClick={handleSubmit}
        >
          Create Session
        </Button>
      </div>
    </Card>
  );
}
```

---

## 🎬 Animation Examples

### Fade In on Mount
```tsx
import { motion } from 'framer-motion';

<motion.div
  initial={{ opacity: 0 }}
  animate={{ opacity: 1 }}
  transition={{ duration: 0.5 }}
>
  Content
</motion.div>
```

### Scale on Hover
```tsx
<motion.div
  whileHover={{ scale: 1.02 }}
  whileTap={{ scale: 0.98 }}
>
  Interactive element
</motion.div>
```

### Staggered Animation
```tsx
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 }
};

<motion.div variants={containerVariants}>
  {items.map((item) => (
    <motion.div key={item.id} variants={itemVariants}>
      {item.content}
    </motion.div>
  ))}
</motion.div>
```

---

## 💾 How to Extend

### Create a New Component
```tsx
// src/components/ui/Avatar.tsx
import React from 'react';

interface AvatarProps {
  name: string;
  size?: 'sm' | 'md' | 'lg';
}

export const Avatar: React.FC<AvatarProps> = ({ name, size = 'md' }) => {
  const sizeClass = {
    sm: 'w-8 h-8',
    md: 'w-12 h-12',
    lg: 'w-16 h-16'
  }[size];

  return (
    <div
      className={`${sizeClass} rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm`}
    >
      {name.charAt(0).toUpperCase()}
    </div>
  );
};
```

### Export from index.ts
```tsx
// src/components/ui/index.ts
export { Card, StatCard } from './Card';
export { Button } from './Button';
export { Input, Select } from './Input';
export { FileDropzone } from './FileDropzone';
export { Avatar } from './Avatar'; // New component
```

### Use in Components
```tsx
import { Avatar } from './ui';

<Avatar name="John Doe" size="lg" />
```

---

## 🎓 Best Practices

1. **Always use the component library** for consistency
2. **Use Tailwind classes** instead of inline CSS
3. **Keep components small** and focused
4. **Reuse components** across the app
5. **Test responsive** on mobile, tablet, desktop
6. **Check dark mode** compatibility
7. **Use proper spacing** (gap, margin, padding)
8. **Maintain color palette** (indigo, purple, green, red, gray)

---

This guide covers everything you need to work with the new component system! 🚀
