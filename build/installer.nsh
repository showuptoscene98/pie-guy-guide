; electron-builder custom NSIS include
; Adds version to the installer welcome/finish page text

!define MUI_WELCOMEPAGE_TITLE "${PRODUCT_NAME} v${VERSION}"
!define MUI_WELCOMEPAGE_TEXT "Setup will install ${PRODUCT_NAME} v${VERSION} on your computer."

!define MUI_FINISHPAGE_TITLE "${PRODUCT_NAME} v${VERSION} Installed"
!define MUI_FINISHPAGE_TEXT "Click Finish to exit the installer."
