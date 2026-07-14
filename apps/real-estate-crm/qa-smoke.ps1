$routes = @('/login','/','/leads','/pipeline','/projects','/site-visits','/settings','/settings/integrations','/unauthorized')
foreach ($r in $routes) {
  try {
    $resp = Invoke-WebRequest -Uri ("http://localhost:3010" + $r) -UseBasicParsing -TimeoutSec 90
    $markers = ''
    if ($r -eq '/login') {
      $markers = ' signin=' + ($resp.Content -match 'Sign in') + ' fudgeestate=' + ($resp.Content -match 'Fudge Estate')
    }
    Write-Output ("$r => " + $resp.StatusCode + $markers)
  } catch {
    Write-Output ("$r => ERROR: " + $_.Exception.Message)
  }
}
