# Agent Skills Specification Notes

Use this file when editing this skill itself.

Source: https://agentskills.io/specification

## Required SKILL.md Frontmatter

- `name`: lowercase letters, numbers, hyphens; max 64 chars; must match folder name.
- `description`: non-empty, max 1024 chars, should state both capabilities and trigger contexts.

Optional fields exist in the spec (`license`, `compatibility`, `metadata`, `allowed-tools`) but include them only if needed.

## Recommended Structure

- Keep `SKILL.md` concise and procedural.
- Keep `SKILL.md` under 500 lines.
- Move large details to `references/` and link from `SKILL.md` with explicit "read this when..." guidance.
- Keep references one level deep from `SKILL.md`.

## Resource Directories

- `scripts/`: executable deterministic helpers.
- `references/`: docs to load only when needed.
- `assets/`: templates/static files used in outputs.

## Validation

Validate after edits:

```bash
python3 /Users/akukharev/.codex/skills/.system/skill-creator/scripts/quick_validate.py /Users/akukharev/.codex/skills/telegram-mini-app
```
