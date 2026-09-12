#!/usr/bin/env python3
"""Crea (o rehace) el perfil de aprovisionamiento de App Store de Osmin.

    python3 scripts/provision-ios.py

Solo hace falta cuando el perfil no existe o cuando se ha creado un certificado
de distribución nuevo: un perfil lista los certificados que admite, así que el
anterior deja de valer en cuanto cambia el certificado.

Lo hace contra la App Store Connect API en vez de por Xcode porque la firma
automática de Xcode resuelve siempre a «Apple Development», y este equipo no
tiene dispositivos registrados con los que generar un perfil de desarrollo.

Requiere PyJWT y la clave de API en ~/.appstoreconnect/private_keys/.
"""
import base64
import hashlib
import json
import os
import pathlib
import plistlib
import re
import subprocess
import sys
import time
import urllib.error
import urllib.request

import jwt

TEAM_ID = "UB47925VHA"
BUNDLE_ID = "es.osmin.app"
PROFILE_NAME = "Osmin App Store CLI"

KEY_ID = os.environ.get("ASC_KEY_ID", "5T8ZYK27Z2")
ISSUER_ID = os.environ.get("ASC_ISSUER_ID", "26efc604-4193-4d22-9ef5-d9731b5b72b2")
KEY_PATH = pathlib.Path.home() / ".appstoreconnect/private_keys" / f"AuthKey_{KEY_ID}.p8"

PROFILES_DIR = pathlib.Path.home() / "Library/Developer/Xcode/UserData/Provisioning Profiles"


def api(path, method="GET", body=None):
    """Una llamada a la API, con un JWT recién hecho: caducan a los 20 minutos."""
    token = jwt.encode(
        {"iss": ISSUER_ID, "iat": int(time.time()), "exp": int(time.time()) + 600,
         "aud": "appstoreconnect-v1"},
        KEY_PATH.read_text(), algorithm="ES256", headers={"kid": KEY_ID, "typ": "JWT"},
    )
    req = urllib.request.Request(
        "https://api.appstoreconnect.apple.com" + path, method=method,
        headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"},
        data=json.dumps(body).encode() if body else None,
    )
    try:
        with urllib.request.urlopen(req) as r:
            return json.load(r) if r.status != 204 else None
    except urllib.error.HTTPError as e:
        sys.exit(f"HTTP {e.code} en {method} {path}\n{e.read().decode()[:800]}")


def certificado_del_llavero():
    """El certificado del portal que corresponde a la clave privada que tenemos.

    Emparejar por huella y no por fecha evita el fallo silencioso de firmar
    contra un certificado del que ya no está la clave privada, que es
    exactamente lo que dejó este proyecto bloqueado una vez.
    """
    salida = subprocess.run(["security", "find-identity", "-v", "-p", "codesigning"],
                            capture_output=True, text=True).stdout
    local = re.search(r'([0-9A-F]{40}) "Apple Distribution', salida)
    if not local:
        sys.exit("No hay certificado «Apple Distribution» en el llavero.\n"
                 "Créalo en Xcode → Settings → Accounts → Manage Certificates → + ")
    huella = local.group(1).upper()

    for c in api("/v1/certificates?limit=200")["data"]:
        if c["attributes"]["certificateType"] not in ("DISTRIBUTION", "IOS_DISTRIBUTION"):
            continue
        der = base64.b64decode(c["attributes"]["certificateContent"])
        if hashlib.sha1(der).hexdigest().upper() == huella:
            return c
    sys.exit(f"El certificado del llavero ({huella}) no está en el portal.")


def main():
    if not KEY_PATH.exists():
        sys.exit(f"Falta la clave de API en {KEY_PATH}")

    cert = certificado_del_llavero()
    print(f"certificado: {cert['id']} (caduca {cert['attributes']['expirationDate']})")

    bundle = next(b for b in api("/v1/bundleIds?limit=200")["data"]
                  if b["attributes"]["identifier"] == BUNDLE_ID)

    for p in api("/v1/profiles?limit=200")["data"]:
        if p["attributes"]["name"] == PROFILE_NAME:
            api(f"/v1/profiles/{p['id']}", method="DELETE")
            print("perfil anterior borrado")

    perfil = api("/v1/profiles", "POST", {"data": {
        "type": "profiles",
        "attributes": {"name": PROFILE_NAME, "profileType": "IOS_APP_STORE"},
        "relationships": {
            "bundleId": {"data": {"id": bundle["id"], "type": "bundleIds"}},
            "certificates": {"data": [{"id": cert["id"], "type": "certificates"}]},
        },
    }})["data"]

    contenido = base64.b64decode(perfil["attributes"]["profileContent"])
    plist = plistlib.loads(
        subprocess.run(["security", "cms", "-D"], input=contenido, capture_output=True).stdout)

    PROFILES_DIR.mkdir(parents=True, exist_ok=True)
    destino = PROFILES_DIR / f"{plist['UUID']}.mobileprovision"
    destino.write_bytes(contenido)

    entitlements = plist["Entitlements"]
    print(f"perfil «{PROFILE_NAME}» instalado en {destino}")
    print(f"  caduca: {perfil['attributes']['expirationDate']}")
    print(f"  app id: {entitlements.get('application-identifier')}")
    if "com.apple.developer.applesignin" not in entitlements:
        print("  AVISO: el perfil no trae Sign in with Apple. Revisa la capacidad "
              "del App ID en el portal antes de compilar.")


if __name__ == "__main__":
    main()
