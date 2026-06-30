Add-Type -AssemblyName System.windows.forms
$f = New-Object System.Windows.Forms.FolderBrowserDialog
$f.Description = "Select a project folder"
$f.ShowNewFolderButton = $true
$form = New-Object System.Windows.Forms.Form
$form.TopMost = $true
if ($f.ShowDialog($form) -eq 'OK') {
    Write-Output $f.SelectedPath
}
