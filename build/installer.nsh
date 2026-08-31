!macro customInstall
  WriteRegStr HKCU "Software\Classes\SystemFileAssociations\.pdf\shell\LitePDF" "" "使用 LitePDF 打开"
  WriteRegStr HKCU "Software\Classes\SystemFileAssociations\.pdf\shell\LitePDF" "MUIVerb" "使用 LitePDF 打开"
  WriteRegStr HKCU "Software\Classes\SystemFileAssociations\.pdf\shell\LitePDF" "Icon" "$INSTDIR\LitePDF.exe,0"
  WriteRegStr HKCU "Software\Classes\SystemFileAssociations\.pdf\shell\LitePDF\command" "" '"$INSTDIR\LitePDF.exe" "%1"'
  WriteRegStr HKCU "Software\Classes\.pdf\shell\LitePDF" "" "使用 LitePDF 打开"
  WriteRegStr HKCU "Software\Classes\.pdf\shell\LitePDF" "MUIVerb" "使用 LitePDF 打开"
  WriteRegStr HKCU "Software\Classes\.pdf\shell\LitePDF" "Icon" "$INSTDIR\LitePDF.exe,0"
  WriteRegStr HKCU "Software\Classes\.pdf\shell\LitePDF\command" "" '"$INSTDIR\LitePDF.exe" "%1"'
  WriteRegStr HKCU "Software\LitePDF\Capabilities" "ApplicationName" "LitePDF"
  WriteRegStr HKCU "Software\LitePDF\Capabilities" "ApplicationDescription" "轻量、专注的多标签 PDF 阅读器"
  WriteRegStr HKCU "Software\LitePDF\Capabilities\FileAssociations" ".pdf" "LitePDF.pdf"
  WriteRegStr HKCU "Software\RegisteredApplications" "LitePDF" "Software\LitePDF\Capabilities"
!macroend

!macro customUnInstall
  DeleteRegKey HKCU "Software\Classes\SystemFileAssociations\.pdf\shell\LitePDF"
  DeleteRegKey HKCU "Software\Classes\.pdf\shell\LitePDF"
  DeleteRegValue HKCU "Software\RegisteredApplications" "LitePDF"
  DeleteRegKey HKCU "Software\LitePDF"
  DeleteRegKey HKCU "Software\Classes\Applications\LitePDF.exe"
!macroend
