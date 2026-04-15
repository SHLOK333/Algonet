cd e:\AlgoBharat\algonet
Remove-Item -Force -Recurse .git -ErrorAction SilentlyContinue
git init
git config user.name "shlok333"
git remote add origin https://SHLOK333@github.com/SHLOK333/Algonet.git
git add .
$stagedFiles = @(git diff --name-only --cached)
git reset
$totalFiles = $stagedFiles.Count
Write-Host "Files: $totalFiles"
$chunkSize = [math]::Ceiling($totalFiles / 35.0)

for ($i = 0; $i -lt 35; $i++) {
    $startIndex = $i * $chunkSize
    $endIndex = [math]::Min(($i + 1) * $chunkSize - 1, $totalFiles - 1)
    if ($startIndex -ge $totalFiles) {
        git commit -q --allow-empty -m "chore: structure update part $($i + 1) out of 35"
        continue
    }
    
    $batch = $stagedFiles[$startIndex..$endIndex]
    
    # We write temp.txt avoiding BOM headers with utf8 no bo
    [IO.File]::WriteAllLines("e:\AlgoBharat\algonet\temp.txt", $batch)
    git add --pathspec-from-file=e:\AlgoBharat\algonet\temp.txt
    
    while (Test-Path ".git\index.lock") { Start-Sleep -Milliseconds 100 }
    
    git commit -q -m "feat: project structure and setup part $($i + 1) of 35"
}
Remove-Item e:\AlgoBharat\algonet\temp.txt -ErrorAction SilentlyContinue
git branch -M main
Write-Host "Done!"
