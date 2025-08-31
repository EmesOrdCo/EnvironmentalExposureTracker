Write-Host "Starting Environmental Exposure Tracker..." -ForegroundColor Green
Write-Host ""
Write-Host "This will start the Expo development server." -ForegroundColor Yellow
Write-Host "Make sure you have Expo Go installed on your device." -ForegroundColor Yellow
Write-Host ""
Write-Host "Press any key to continue..." -ForegroundColor Cyan
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
npx expo start
