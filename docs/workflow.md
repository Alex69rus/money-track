# Development Workflow

> This document defines the development workflow for implementing tasks from [tasklist.md](./tasklist.md) based on the architecture in [vision.md](../vision.md).

## 🔄 Iteration Workflow

### 1. Before Starting Iteration
- [ ] Review current iteration tasks in [tasklist.md](./tasklist.md)
- [ ] Update progress table: set status to 🔄 In Progress, add start date
- [ ] Confirm iteration scope and deliverables

### 2. Planning Phase
- [ ] **Propose solution** with code segments and file structure
- [ ] Show key code snippets for main components
- [ ] Reference [conventions.md](../conventions.md) compliance
- [ ] **Wait for approval** before implementation

### 3. Implementation Phase
- [ ] Implement approved solution exactly as agreed
- [ ] Follow [conventions.md](../conventions.md) rules strictly
- [ ] Test functionality meets iteration **Test** criteria
- [ ] Mark individual tasks as completed ✅ in tasklist.md

### 4. Completion Phase
- [ ] **Wait for confirmation** that iteration works correctly
- [ ] Update progress table: set status to ✅ Complete, add end date
- [ ] **Make git commit** with clear message
- [ ] **Get approval** before moving to next iteration

## 📋 Task Rules

### DO
- Follow [tasklist.md](./tasklist.md) order strictly
- Implement only agreed features from current iteration
- Test each iteration thoroughly before completion
- Update progress table after each iteration
- Wait for explicit approval at each checkpoint

### DON'T
- Skip ahead to future iterations
- Add features not in current iteration scope
- Implement without prior approval
- Commit without confirmation
- Move to next iteration without explicit permission

## 🎯 Checkpoint Process

```
Plan → Approve → Implement → Test → Confirm → Commit → Next
```

Each arrow requires explicit confirmation before proceeding.

## 📝 Commit Format

```
feat: complete iteration X - [feature name]

- Implemented [main deliverables]
- Tested: [test criteria met]
- Updated progress in tasklist.md
```

## 🚫 Blockers

If blocked:
- [ ] Mark iteration as ❌ Blocked in progress table
- [ ] Document blocker in Notes column
- [ ] Wait for resolution before continuing