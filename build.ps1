
# 1. Clean existing public folder
if (Test-Path "public") { Remove-Item -Recurse -Force "public" }

# 2. Define subpath
$subpath = "app/vision-board-2026"
$targetDir = "public/$subpath"

# 3. Create target directory
New-Item -ItemType Directory -Force -Path $targetDir | Out-Null
New-Item -ItemType Directory -Force -Path "$targetDir/css" | Out-Null
New-Item -ItemType Directory -Force -Path "$targetDir/js" | Out-Null

# 4. Copy files
Copy-Item "index.html" "$targetDir/"
Copy-Item "css/*" "$targetDir/css/" -Recurse
Copy-Item "js/*" "$targetDir/js/" -Recurse

Write-Host "Build Complete! Files ready in public/$subpath"
Write-Host "You can now run: firebase deploy"
