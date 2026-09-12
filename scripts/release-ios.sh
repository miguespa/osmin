#!/usr/bin/env bash
#
# Compila, firma y sube un build de Osmin a App Store Connect.
#
#   ./scripts/release-ios.sh
#
# Antes de lanzarlo, sube CURRENT_PROJECT_VERSION (y MARKETING_VERSION si toca)
# en ios/App/App.xcodeproj/project.pbxproj: App Store Connect rechaza un número
# de build repetido.
#
# Requisitos, todos fuera del repo:
#   - Certificado «Apple Distribution» en el llavero. Se crea desde
#     Xcode → Settings → Accounts → Manage Certificates → + → Apple Distribution.
#   - Clave de App Store Connect API en ~/.appstoreconnect/private_keys/.
#   - Perfil «Osmin App Store CLI» instalado. Si falta, lo regenera
#     scripts/provision-ios.py.
#
# Por qué NO se usa `xcodebuild -exportArchive`: esa orden vuelve a firmar la
# app, y firmar desde la línea de comandos exige que la clave privada tenga a
# codesign en su lista de permisos del llavero, cosa que pide la contraseña del
# llavero. El .app que sale del archivado YA está firmado con el certificado de
# distribución y el perfil de App Store, así que empaquetar el .ipa a mano es
# equivalente y no necesita contraseña de nadie.
set -euo pipefail

TEAM_ID="UB47925VHA"
BUNDLE_ID="es.osmin.app"
PROFILE_NAME="Osmin App Store CLI"

# Identificadores, no secretos: el secreto es el .p8, que vive en el HOME.
API_KEY_ID="${ASC_KEY_ID:-5T8ZYK27Z2}"
API_ISSUER_ID="${ASC_ISSUER_ID:-26efc604-4193-4d22-9ef5-d9731b5b72b2}"
API_KEY_PATH="$HOME/.appstoreconnect/private_keys/AuthKey_${API_KEY_ID}.p8"

REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT

paso() { printf '\n\033[1m▸ %s\033[0m\n' "$1"; }

[[ -f "$API_KEY_PATH" ]] || { echo "Falta la clave de API en $API_KEY_PATH"; exit 1; }
security find-identity -v -p codesigning | grep -q "Apple Distribution: .*($TEAM_ID)" \
  || { echo "No hay certificado «Apple Distribution» en el llavero"; exit 1; }

paso "Bundle web (vite lee .env.production.local por sí solo)"
cd "$REPO"
npm run build:native

paso "Sincronizando el proyecto iOS"
npx cap sync ios

paso "Archivando con firma de distribución"
# Firma manual a propósito: la automática resuelve siempre a «Apple Development»
# y falla, porque este equipo no tiene dispositivos registrados con los que
# generar un perfil de desarrollo.
xcodebuild -project "$REPO/ios/App/App.xcodeproj" -scheme App \
  -configuration Release -destination 'generic/platform=iOS' \
  -archivePath "$WORK/Osmin.xcarchive" \
  CODE_SIGN_STYLE=Manual \
  CODE_SIGN_IDENTITY="Apple Distribution" \
  PROVISIONING_PROFILE_SPECIFIER="$PROFILE_NAME" \
  DEVELOPMENT_TEAM="$TEAM_ID" \
  archive

APP="$WORK/Osmin.xcarchive/Products/Applications/App.app"
VERSION="$(/usr/libexec/PlistBuddy -c 'Print :CFBundleShortVersionString' "$APP/Info.plist")"
BUILD="$(/usr/libexec/PlistBuddy -c 'Print :CFBundleVersion' "$APP/Info.plist")"

paso "Empaquetando Osmin $VERSION ($BUILD)"
mkdir -p "$WORK/ipa/Payload"
cp -R "$APP" "$WORK/ipa/Payload/"
IPA="$WORK/Osmin-$VERSION-$BUILD.ipa"
(cd "$WORK/ipa" && zip -qry "$IPA" Payload)

paso "Validando contra App Store Connect"
xcrun altool --validate-app -f "$IPA" -t ios \
  --apiKey "$API_KEY_ID" --apiIssuer "$API_ISSUER_ID"

paso "Subiendo"
xcrun altool --upload-app -f "$IPA" -t ios \
  --apiKey "$API_KEY_ID" --apiIssuer "$API_ISSUER_ID"

printf '\n\033[1mOsmin %s (%s) subido.\033[0m Tarda unos minutos en aparecer en TestFlight.\n' \
  "$VERSION" "$BUILD"
