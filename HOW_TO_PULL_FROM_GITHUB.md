# How to Pull from GitHub

Since Git isn't in your PATH, here are several ways to pull from GitHub:

## Option 1: GitHub Desktop (Easiest)

If you have GitHub Desktop installed:

1. **Open GitHub Desktop**
2. **Select your repository** (offsetX)
3. Click **"Fetch origin"** or **"Pull origin"** button at the top
4. If there are updates, you'll see a notification
5. Click **"Pull origin"** to download the latest changes

## Option 2: Add Git to PATH (Recommended for Terminal)

### Find Git Installation

Git is likely installed but not in PATH. Common locations:
- `C:\Program Files\Git\bin\git.exe`
- `C:\Program Files (x86)\Git\bin\git.exe`
- `C:\Users\YourName\AppData\Local\Programs\Git\bin\git.exe`

### Add to PATH Temporarily (Current Session)

```powershell
# Find git first
$gitPath = "C:\Program Files\Git\bin"
if (Test-Path "$gitPath\git.exe") {
    $env:Path += ";$gitPath"
    git pull origin main
}
```

### Add to PATH Permanently

1. Press `Win + X` and select **"System"**
2. Click **"Advanced system settings"**
3. Click **"Environment Variables"**
4. Under **"System variables"**, find and select **"Path"**, then click **"Edit"**
5. Click **"New"** and add: `C:\Program Files\Git\bin`
6. Click **"OK"** on all dialogs
7. **Restart your terminal** for changes to take effect

Then you can use:
```powershell
git pull origin main
```

## Option 3: Use Full Path to Git

If you know where Git is installed:

```powershell
# Example (adjust path if different)
& "C:\Program Files\Git\bin\git.exe" pull origin main
```

## Option 4: PowerShell Script to Pull

Create a script that finds and uses Git:

```powershell
# Save as pull-from-github.ps1
$gitPaths = @(
    "C:\Program Files\Git\bin\git.exe",
    "C:\Program Files (x86)\Git\bin\git.exe",
    "$env:LOCALAPPDATA\Programs\Git\bin\git.exe"
)

$gitExe = $null
foreach ($path in $gitPaths) {
    if (Test-Path $path) {
        $gitExe = $path
        break
    }
}

if ($gitExe) {
    Write-Host "Found Git at: $gitExe" -ForegroundColor Green
    & $gitExe pull origin main
} else {
    Write-Host "Git not found. Please use GitHub Desktop or install Git." -ForegroundColor Red
}
```

## What Pull Does

When you pull from GitHub, it:
1. **Fetches** the latest commits from the remote repository
2. **Merges** them with your local branch
3. **Updates** your working directory with the latest files

## Before Pulling

⚠️ **Warning**: If you have uncommitted local changes, Git might refuse to pull or you might get merge conflicts.

### Check Your Status First

```powershell
# If git is in PATH
git status

# Or with full path
& "C:\Program Files\Git\bin\git.exe" status
```

### If You Have Uncommitted Changes

**Option A: Commit them first**
```powershell
git add .
git commit -m "Save local changes"
git pull origin main
```

**Option B: Stash them temporarily**
```powershell
git stash
git pull origin main
git stash pop  # Reapply your changes after pull
```

## Quick Pull Command (Once Git is in PATH)

```powershell
# From project root
git pull origin main
```

This will:
- Download latest changes from GitHub
- Merge them with your local code
- Update all files automatically

## Troubleshooting

### "Your branch is behind 'origin/main'"
This means there are updates on GitHub. Just pull:
```powershell
git pull origin main
```

### Merge Conflicts
If you get conflicts:
1. Git will mark conflicted files
2. Open them and look for `<<<<<<<`, `=======`, `>>>>>>>` markers
3. Resolve conflicts manually
4. Stage resolved files: `git add .`
5. Complete merge: `git commit`

### "Please commit your changes or stash them"
You have uncommitted changes. Either:
- Commit them first (see above)
- Or stash them: `git stash` then `git pull`

## Recommended Workflow

1. **Before starting work**: `git pull origin main`
2. **Make your changes**
3. **Commit**: `git add .` then `git commit -m "Description"`
4. **Push**: `git push origin main`

This keeps your local code in sync with GitHub!





