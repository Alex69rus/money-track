# ADR-002: Development Principles

## Status
Accepted

## Context
We need delivery principles that preserve speed and simplicity while keeping behavior reliable.

## Decision
Core principles:
- KISS
- YAGNI
- MVP first
- No premature optimization
- Convention over configuration
- Fail fast

Development practices:
- Small, reviewable slices
- Explicit checks before merge (`ruff`, `mypy`, `pytest` where applicable)
- Follow framework conventions (FastAPI/Piccolo and React/TypeScript)
- Keep docs aligned with current runtime architecture

## Rationale
- Small slices reduce rollback risk.
- Convention-based code stays easier to maintain.
- Typed, tested paths reduce regressions in API behavior.

## Consequences
- Faster iteration with predictable quality gates.
- Lower overhead than heavyweight process frameworks.

## Date
2026-03-20
