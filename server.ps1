# ==============================================================================
# Локальный веб-сервер для проекта "Умная Теплица"
# Не требует сторонних программ (использует встроенный .NET HttpListener)
# ==============================================================================

[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
try { $Host.UI.RawUI.WindowTitle = "Умная Теплица - Локальный сервер" } catch {}

# Определение рабочей папки проекта
$rootDir = Split-Path -Parent $MyInvocation.MyCommand.Definition
if (-not $rootDir) { $rootDir = (Get-Location).Path }
Set-Location $rootDir

# Подбор свободного порта
$port = 8080
$listener = $null
$started = $false

for ($i = 0; $i -lt 15; $i++) {
    $currentPort = $port + $i
    try {
        $tempListener = New-Object System.Net.HttpListener
        $tempListener.Prefixes.Add("http://localhost:$currentPort/")
        $tempListener.Start()
        $listener = $tempListener
        $port = $currentPort
        $started = $true
        break
    } catch {
        if ($tempListener) { $tempListener.Close() }
    }
}

if (-not $started) {
    Write-Host "[ОШИБКА] Не удалось открыть порт для локального сервера." -ForegroundColor Red
    Write-Host "Попробуйте закрыть другие программы или перезапустить компьютер." -ForegroundColor Yellow
    Read-Host "Нажмите Enter для выхода"
    exit 1
}

$baseUrl = "http://localhost:$port"

Write-Host ""
Write-Host "====================================================================" -ForegroundColor Green
Write-Host "   ЛОКАЛЬНЫЙ СЕРВЕР УСПЕШНО ЗАПУЩЕН!" -ForegroundColor Green
Write-Host "====================================================================" -ForegroundColor Green
Write-Host ""
Write-Host "  [1] Главная страница (Полный сайт): $baseUrl/index.html" -ForegroundColor Yellow
Write-Host "  [2] 3D Модель (Отдельный экран):    $baseUrl/model3d.html" -ForegroundColor Cyan
Write-Host "  [3] Галерея и Видео:                $baseUrl/gallery.html" -ForegroundColor Cyan
Write-Host "  [4] О проекте:                      $baseUrl/about.html" -ForegroundColor Cyan
Write-Host ""
Write-Host "  Открываем полный сайт в вашем браузере..." -ForegroundColor White
Write-Host "  (Чтобы остановить сервер, просто закройте это окно)" -ForegroundColor DarkGray
Write-Host "--------------------------------------------------------------------" -ForegroundColor DarkGray
Write-Host ""

# Открытие страницы сайта в браузере
try {
    Start-Process "$baseUrl/index.html"
} catch {
    Write-Host "Перейдите по ссылке: $baseUrl/index.html" -ForegroundColor Yellow
}

# Таблица типов контента
$mimeTypes = @{
    ".html" = "text/html; charset=utf-8"
    ".htm"  = "text/html; charset=utf-8"
    ".css"  = "text/css; charset=utf-8"
    ".js"   = "application/javascript; charset=utf-8"
    ".json" = "application/json; charset=utf-8"
    ".png"  = "image/png"
    ".jpg"  = "image/jpeg"
    ".jpeg" = "image/jpeg"
    ".svg"  = "image/svg+xml"
    ".gif"  = "image/gif"
    ".glb"  = "model/gltf-binary"
    ".gltf" = "model/gltf+json"
    ".obj"  = "text/plain; charset=utf-8"
    ".mtl"  = "text/plain; charset=utf-8"
    ".mp4"  = "video/mp4"
    ".webm" = "video/webm"
    ".ico"  = "image/x-icon"
}

# Цикл обработки запросов
try {
    while ($listener.IsListening) {
        $context = $listener.GetContext()
        $request = $context.Request
        $response = $context.Response

        # CORS заголовки для WebGL/Three.js
        $response.AddHeader("Access-Control-Allow-Origin", "*")
        $response.AddHeader("Access-Control-Allow-Methods", "GET, HEAD, OPTIONS")
        $response.AddHeader("Access-Control-Allow-Headers", "*")

        if ($request.HttpMethod -eq "OPTIONS") {
            $response.StatusCode = 204
            $response.Close()
            continue
        }

        # Путь к файлу
        $rawPath = $request.Url.LocalPath.TrimStart('/')
        $decodedPath = [System.Uri]::UnescapeDataString($rawPath)
        
        if ([string]::IsNullOrWhiteSpace($decodedPath)) {
            $decodedPath = "index.html"
        }

        $localFilePath = Join-Path $rootDir ($decodedPath -replace '/', '\')

        if (Test-Path $localFilePath -PathType Leaf) {
            $ext = [System.IO.Path]::GetExtension($localFilePath).ToLower()
            $mime = "application/octet-stream"
            if ($mimeTypes.ContainsKey($ext)) {
                $mime = $mimeTypes[$ext]
            }

            $response.ContentType = $mime
            $response.StatusCode = 200

            $fs = $null
            try {
                $fs = [System.IO.File]::Open($localFilePath, [System.IO.FileMode]::Open, [System.IO.FileAccess]::Read, [System.IO.FileShare]::ReadWrite)
                $response.ContentLength64 = $fs.Length
                if ($request.HttpMethod -ne "HEAD") {
                    $fs.CopyTo($response.OutputStream)
                }
                $fileSize = $fs.Length
                
                $color = if ($ext -in @(".glb", ".gltf", ".obj", ".mtl", ".png")) { "Yellow" } else { "DarkGray" }
                $sizeMb = [Math]::Round($fileSize / 1MB, 2)
                $sizeDisplay = if ($sizeMb -ge 1) { "$sizeMb MB" } else { "$([Math]::Round($fileSize / 1KB, 1)) KB" }
                Write-Host "  -> [200 OK] $decodedPath ($sizeDisplay)" -ForegroundColor $color
            } catch {
                $response.StatusCode = 500
                Write-Host "  -> [500 Ошибка чтения] $decodedPath ($($_.Exception.Message))" -ForegroundColor Red
            } finally {
                if ($fs) { $fs.Dispose() }
            }
        } else {
            $response.StatusCode = 404
            $msg = [System.Text.Encoding]::UTF8.GetBytes("404 Not Found: $decodedPath")
            $response.ContentType = "text/plain; charset=utf-8"
            $response.ContentLength64 = $msg.Length
            if ($request.HttpMethod -ne "HEAD") {
                $response.OutputStream.Write($msg, 0, $msg.Length)
            }
            Write-Host "  -> [404 Не найдено] $decodedPath" -ForegroundColor Magenta
        }

        $response.Close()
    }
} finally {
    if ($listener) {
        $listener.Stop()
        $listener.Close()
    }
}