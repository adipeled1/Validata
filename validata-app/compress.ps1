Add-Type -AssemblyName System.Drawing
$image = [System.Drawing.Image]::FromFile("src\app\icon.png")
$size = New-Object System.Drawing.Size(600, 600)
$bmp = New-Object System.Drawing.Bitmap($image, $size)
$bmp.Save("src\app\opengraph-image.jpg", [System.Drawing.Imaging.ImageFormat]::Jpeg)
$bmp.Save("src\app\twitter-image.jpg", [System.Drawing.Imaging.ImageFormat]::Jpeg)
$image.Dispose()
$bmp.Dispose()
Write-Host "Done"
