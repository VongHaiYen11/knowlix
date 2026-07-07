# UI Development Guidelines

These guidelines define the UI development standards for this project. The goal is to keep the codebase consistent, reusable, maintainable, and visually coherent.

---

# Core Principles

When implementing any UI:

1. Consistency is more important than creativity.
2. Reuse existing components whenever possible.
3. Follow the design system.
4. Build responsive layouts by default.
5. Keep components small and maintainable.
6. Separate presentation from business logic.

---

# Design System

## Never hardcode design values

Avoid hardcoded values for:

- colors
- spacing
- border radius
- typography
- shadows
- transitions

Instead, always use values defined by the design system.

Good

```tsx
className="bg-primary text-primary-foreground border-border"
```

or

```ts
colors.light.primary
```

Bad

```tsx
className="bg-[#5e7d63]"
```

If a required color or token does not exist, add it to the theme instead of introducing arbitrary values.

---

# Theme Usage

All UI colors must come from the shared theme.

Never introduce one-off colors unless absolutely necessary.

Prefer semantic colors instead of visual colors.

Good

```
primary
secondary
accent
destructive
muted
background
foreground
border
card
```

Bad

```
green
blue
gray500
yellow200
```

---

# Component Reuse

Before creating any component:

1. Check the existing `components/` directory.
2. Reuse an existing component if possible.
3. Extend an existing component instead of duplicating it.

Common reusable components include:

- Button
- Card
- Badge
- Dialog
- Alert
- EmptyState
- ConfirmationDialog
- SearchInput
- PageHeader
- LoadingSpinner
- Skeleton
- DropdownMenu

Do not create multiple versions of the same component unless there is a strong reason.

---

# Shared Components

Any UI pattern used more than once should become a reusable component.

Examples:

Instead of

```
DeleteModal
ArchiveModal
LogoutModal
```

Prefer

```
ConfirmationDialog
```

Instead of

```
EmptyWiki
EmptyLibrary
EmptyChat
```

Prefer

```
<EmptyState />
```

---

# Responsive Design

Every screen must support:

- Mobile
- Tablet
- Desktop

Never build desktop-only layouts.

Prefer responsive utilities over fixed widths.

Example

```tsx
grid-cols-1 md:grid-cols-2 xl:grid-cols-3
```

Avoid

```tsx
style={{ width: 1200 }}
```

---

# Layout

Pages should use consistent spacing.

Avoid random margins.

Use shared spacing utilities.

Prefer

```
space-y-6
gap-4
gap-6
container
max-w-...
```

Keep alignment consistent across the application.

---

# Component Size

Keep files reasonably small.

Recommended:

- under 200 lines → ideal
- 200–350 lines → acceptable
- over 350 lines → consider refactoring
- over 500 lines → should be split

Large pages should be divided into smaller sections.

Example

```
Settings/

    index.tsx

    AccountSection.tsx

    PasswordSection.tsx

    AppearanceSection.tsx

    ModelSection.tsx
```

instead of

```
Settings.tsx
```

with hundreds of lines.

---

# Folder Structure

Organize components by feature whenever possible.

Example

```
pages/

    settings/

        index.tsx

        components/

            AccountSection.tsx

            PasswordSection.tsx

            ThemeSelector.tsx
```

instead of putting every component into a global folder.

Only place components inside the global `components/` folder if they are reusable across multiple features.

---

# Business Logic

UI components should primarily render UI.

Move business logic into:

- hooks
- services
- utilities

Good

```tsx
const { updateProfile } = useProfile()
```

Avoid

```tsx
const handleSave = async () => {
    ...
}
```

if the logic is large or reusable.

---

# State Management

Keep state as close as possible to where it is used.

Avoid unnecessary prop drilling.

Use Context only when state is truly shared.

---

# Naming

Components

```
PageHeader
SettingsCard
LibraryGrid
```

Hooks

```
useAuth
useTheme
useSearch
```

Utilities

```
formatDate
parseMarkdown
chunkText
```

Avoid vague names like

```
Helper
Utils
Data
Thing
Component1
```

---

# Accessibility

Every interactive component should support:

- keyboard navigation
- focus states
- proper labels
- aria attributes where appropriate

Never remove focus outlines unless replacing them with an accessible alternative.

---

# Visual Consistency

New screens should match existing patterns.

Do not introduce:

- new spacing systems
- new typography
- new border radius
- new button styles
- new shadows

Consistency across the application is more important than making a single page unique.

---

# Before Creating New UI

Always ask:

- Does this component already exist?
- Can I reuse an existing component?
- Am I introducing duplicate code?
- Does this follow the design system?
- Is it responsive?
- Is the file becoming too large?
- Should this be extracted into a reusable component?

---

# Pull Request Checklist

Before submitting UI changes:

- [ ] No hardcoded colors
- [ ] Uses theme tokens
- [ ] Reuses existing components
- [ ] Responsive on mobile and desktop
- [ ] No duplicated UI
- [ ] Components are reasonably small
- [ ] Business logic separated from presentation
- [ ] Accessibility considered
- [ ] Naming follows project conventions

---

# Philosophy

A good UI is:

- consistent
- predictable
- reusable
- responsive
- accessible
- easy to maintain

Prefer improving the existing design system over introducing one-off solutions.