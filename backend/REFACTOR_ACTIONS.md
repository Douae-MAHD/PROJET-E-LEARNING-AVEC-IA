# Refactor Actions

## Commands to move legacy files to archive (PowerShell)

Run from repository root (Windows PowerShell):

```powershell
# create archive dir
mkdir backend\.archive

# move legacy routes and middleware
Move-Item backend\routes backend\.archive\routes -Force
Move-Item backend\middleware backend\.archive\middleware -Force

# move one-off test scripts
Move-Item backend\Test backend\.archive\Test -Force
Move-Item backend\TEST_GEMINI_MODELS.js backend\.archive\ -Force
Move-Item backend\VERIFIER_GEMINI.js backend\.archive\ -Force

# optional: move scripts
Move-Item backend\scripts backend\.archive\scripts -Force

```

## Files suggested for deletion after verification

- backend/Test/* (all test/debug scripts)
- backend/TEST_GEMINI_MODELS.js
- backend/VERIFIER_GEMINI.js
- backend/scripts/* (ad-hoc scripts moved to .archive)
- any temp files in backend root (e.g., *.log)

Verify the application fully using the new `src/` endpoints before removing archives.
