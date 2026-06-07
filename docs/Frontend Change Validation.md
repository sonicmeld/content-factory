## Frontend Change Validation

This section applies ONLY when a sprint modifies:

* React components
* Pages
* Layouts
* UI widgets
* TypeScript files
* Vite frontend code

Mandatory validation before marking a sprint as completed:

```bash
cd frontend
npx tsc --noEmit
```

Requirements:

* 0 TypeScript errors
* 0 unused imports
* 0 unused variables
* 0 unresolved component references
* 0 missing icon/component imports

Examples of failures that must be fixed before push:

* TS6133 (unused imports)
* TS2304 (cannot find name)
* TS2307 (cannot find module)
* TS2322 (type mismatch)

Do not rely solely on successful local rendering.

Compilation validation is mandatory.
