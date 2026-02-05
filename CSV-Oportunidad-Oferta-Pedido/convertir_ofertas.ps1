$inputPath  = "ofertas-pedidos-oportunidades.txt"
$outputPath = "clientes.json"

# Leer líneas, limpiar, quitar ';;', quitar comillas y espacios raros
$lines = Get-Content -LiteralPath $inputPath -Encoding UTF8

$names = $lines |
  ForEach-Object { $_ -replace ';;$', '' } |       # quitar ;; al final
  ForEach-Object { $_.Trim() } |                   # trim
  ForEach-Object { $_ -replace '[\u200B-\u200D\uFEFF]', '' } |  # quitar zero-width chars
  Where-Object { $_ -ne "" } |                     # quitar vacíos
  Sort-Object -Unique                              # ordenar y únicos

# Convertir a JSON (array de strings)
$names | ConvertTo-Json -Depth 2 | Out-File -LiteralPath $outputPath -Encoding UTF8

Write-Host "OK -> Generado: $outputPath"
Write-Host ("Total clientes: " + $names.Count)