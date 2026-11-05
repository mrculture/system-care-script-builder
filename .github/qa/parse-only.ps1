param([Parameter(Mandatory=$true)][string]$Path)
# Parse generated text only. Never invoke or dot-source the supplied file.
$tokens = $null
$parseErrors = $null
$null = [System.Management.Automation.Language.Parser]::ParseFile($Path, [ref]$tokens, [ref]$parseErrors)
if ($parseErrors.Count -gt 0) {
  $parseErrors | ForEach-Object { Write-Error $_.Message }
  exit 1
}
