Add-Type -AssemblyName System.Drawing

$src = "d:\Moxie\front-end\src\assets\images\new_watches\chatgpt_orange.png"
$img = [System.Drawing.Bitmap]::FromFile($src)

Write-Output "Image size: $($img.Width) x $($img.Height)"

# In chatgpt_orange.png (1226 x 1283):
# Top section has "PROVIDED WATCH IMAGES (USE THESE 5 ONLY)"
# The 5 images are roughly arranged horizontally around Y: 115 to 270.
# Let's find the bounding box for Image 5 (Orange)
# Image 5 is approximately from X: 1090 to 1195, Y: 140 to 275.
# Let's crop a test region around Image 5:
$cropRect = [System.Drawing.Rectangle]::FromLTRB(1090, 140, 1195, 275)
$cropBmp = $img.Clone($cropRect, $img.PixelFormat)
$cropBmp.Save("d:\Moxie\front-end\src\assets\images\new_watches\test_orange.png", [System.Drawing.Imaging.ImageFormat]::Png)

$cropBmp.Dispose()
$img.Dispose()
Write-Output "Saved test_orange.png"
