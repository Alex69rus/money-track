# shadcn + Tailwind v4 Playbook

This document applies the `shadcn` skill to `frontend_new`.

## Setup Sequence

1. Ensure app exists with Vite + React + TypeScript.
2. Initialize shadcn in `frontend_new` using project package runner.
3. Refresh project context when needed:
   - `npx shadcn@latest info --json`
4. Before implementing any component:
   - `npx shadcn@latest docs <component>`

## Mandatory Rules

- Use existing shadcn components before custom markup.
- Use semantic tokens and variants, not raw color utility values.
- Use `gap-*`; do not use `space-x-*` or `space-y-*`.
- Use `size-*` for equal width/height.
- Use `truncate` for one-line clipping.
- Use `cn()` for conditional classes.
- Do not manually set z-index on dialog/sheet/popover stacks.
- Keep required composition:
  - `DialogTitle`/`SheetTitle`/`DrawerTitle` required.
  - `TabsTrigger` inside `TabsList`.
  - `AvatarFallback` required.
  - List items inside their corresponding groups.

## Forms and Inputs

- Build forms with shadcn field primitives.
- Use accessible labels and validation semantics.
- For selector flows (category/tags), enforce explicit confirmation actions.
- Use `AlertDialog` for destructive confirmations (delete/reset).

## Preferred Component Inventory

Core shell:
- `Button`
- `Card`
- `Tabs`
- `Separator`
- `Badge`
- `Skeleton`
- `Alert`
- `ScrollArea`

Transactional surfaces:
- `Dialog` or `Sheet`
- `AlertDialog`
- `Command` (for searchable selectors)
- `Input`
- `Textarea`
- `Select`
- `Popover`

Analytics surfaces:
- `Card`
- `Chart` (if installed) or approved chart wrapper
- `Tabs` (range presets if needed)

Feedback:
- `sonner` for toast notifications
- inline `Alert` for error-with-retry states

## Registry Hygiene

- Do not assume registry when user asks for a component/block; require explicit registry name.
- After adding third-party registry items, verify import aliases and composition correctness.
- If updating existing components, preview with `--dry-run` and `--diff` before applying.

## Tailwind v4 Notes

- Keep tokens in the global Tailwind CSS file configured by shadcn.
- Avoid custom CSS unless a clear Telegram viewport/safe-area need exists.
- Prefer utility classes and component variants over ad hoc CSS files.
