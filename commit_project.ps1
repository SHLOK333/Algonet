$ErrorActionPreference = "Stop"

cd e:\AlgoBharat\algonet
git init
git remote add origin https://github.com/SHLOK333/Algonet.git

# Gather all files excluding .git
$allFiles = Get-ChildItem -Recurse -File | Where-Object { $_.FullName -notmatch '\\.git\\' } | Select-Object -ExpandProperty FullName
$totalFiles = $allFiles.Count

if ($totalFiles -lt 35) {
    Write-Host "Not enough files ($totalFiles) to split into 35 commits realistically, but we will do our best."
    $chunkSize = 1
} else {
    $chunkSize = [math]::Ceiling($totalFiles / 35.0)
}

$commitCount = 0

for ($i = 0; $i -lt 35; $i++) {
    $startIndex = $i * $chunkSize
    $endIndex = [math]::Min(($i + 1) * $chunkSize - 1, $totalFiles - 1)
    
    if ($startIndex -ge $totalFiles) {
        # If we run out of files, create empty commits to reach exactly 35 if requested.
        git commit --allow-empty -m "chore: structure update part $($i + 1) out of 35"
        $commitCount++
        continue
    }
    
    $batch = $allFiles[$startIndex..$endIndex]
    foreach ($file in $batch) {
        git add $file
    }
    
    git commit -m "feat: project structure and setup part $($i + 1) of 35"
    $commitCount++
}

git branch -M main
Write-Host "Successfully generated $commitCount commits. Ready to push."
# We will do the push separately so the user can verify, or we can push it now.
git push -u origin main
