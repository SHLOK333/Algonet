Remove-Item -Force -Recurse .git -ErrorAction SilentlyContinue
git init
git remote add origin https://github.com/SHLOK333/Algonet.git
git add .
$stagedFiles = @(git diff --name-only --cached)
git reset
$totalFiles = $stagedFiles.Count
Write-Host "Total eligible files: $totalFiles"
if ($totalFiles -eq 0) { Write-Host "No files!"; exit }
$chunkSize = [math]::Ceiling($totalFiles / 35.0)

for ($i = 0; $i -lt 35; $i++) {
    $startIndex = $i * $chunkSize
    $endIndex = [math]::Min(($i + 1) * $chunkSize - 1, $totalFiles - 1)
    
    if ($startIndex -ge $totalFiles) {
        git commit --allow-empty -m "chore: structure update part $($i + 1) out of 35"
        continue
    }
    
    $batch = $stagedFiles[$startIndex..$endIndex]
    foreach ($file in $batch) {
        git add $file
    }
    
    git commit -m "feat: project structure and setup part $($i + 1) of 35"
}

git branch -M main
# Assuming the user has git credentials set up
git push -u -f origin main
