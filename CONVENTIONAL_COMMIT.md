# Conventional Commits

This project follows the [Conventional Commits](https://www.conventionalcommits.org/)
specification to maintain a clear and consistent Git history.

## Format

```text
<type>(<scope>): <description>
```

The scope is optional:

```text
<type>: <description>
```

## Commit Types

| Type       | Description                                       |
| ---------- | ------------------------------------------------- |
| `feat`     | A new feature                                     |
| `fix`      | A bug fix                                         |
| `docs`     | Documentation changes                             |
| `style`    | Formatting or styling changes                     |
| `refactor` | Code restructuring without changing functionality |
| `perf`     | Performance improvements                          |
| `test`     | Adding or updating tests                          |
| `build`    | Build system or dependency changes                |
| `ci`       | CI/CD configuration changes                       |
| `chore`    | Maintenance or miscellaneous tasks                |
| `revert`   | Reverting a previous commit                       |

## Examples

### Features

```text
feat: add user authentication
feat(recovery): add clean date tracking
feat(journal): add mood selection
feat(ai): add recovery companion chat
```

### Bug Fixes

```text
fix: resolve authentication redirect issue
fix(recovery): correct clean day calculation
fix(journal): prevent empty journal entries
```

### Documentation

```text
docs: update project README
docs: add conventional commit guidelines
```

### Refactoring

```text
refactor: simplify authentication service
refactor(ai): extract context builder
```

### Chores

```text
chore: update dependencies
chore(docker): add postgres service
chore: configure husky hooks
```

## Guidelines

- Use lowercase commit types.
- Write descriptions in the imperative present tense.
- Keep the first line concise.
- Do not end the description with a period.
- Use a scope when the change belongs to a specific module.

### Good

```text
feat(recovery): add milestone tracking
fix(auth): resolve invalid session handling
chore: configure lint-staged
```

### Bad

```text
Added recovery feature
fix bug
updated stuff
feat: Added a new feature.
```

## Common Scopes

```text
auth
recovery
journal
mood
ai
content
dashboard
ui
database
docker
```
