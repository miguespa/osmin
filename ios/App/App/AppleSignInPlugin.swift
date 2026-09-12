import Foundation
import Capacitor
import AuthenticationServices

/**
 Puente mínimo a «Sign in with Apple».

 Existe porque el WebView no puede hacer el OAuth de Apple por su cuenta: esa
 navegación sale del contenedor y iOS la abre en Safari, así que la sesión se
 quedaría en el navegador y la app nunca se enteraría. Con esto la hoja la pinta
 el sistema, y a la parte web solo le llega el `identityToken` que Clerk canjea
 con la estrategia `oauth_token_apple`.

 No se usa `@capacitor-community/apple-sign-in` porque su Package.swift fija
 capacitor-swift-pm en la 7.x y este proyecto va por la 8.5.1: SPM no puede
 resolver las dos a la vez.

 El `nonce` es OBLIGATORIO aunque Clerk no lo haya generado. Aquí se creía lo
 contrario —que un nonce ajeno rompería la validación— y por eso se omitía; era
 el motivo del `403 authorization_invalid` al canjear el token. Clerk no lo
 compara con nada: lo exige como clave anti-replay, para que cada token valga
 una sola vez. Lo mismo hacen su hook oficial de Expo, su SDK de iOS y el resto
 de integraciones que funcionan. Si vuelve a quitarse, el canje deja de valer.
 */
@objc(AppleSignInPlugin)
public class AppleSignInPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "AppleSignInPlugin"
    public let jsName = "AppleSignIn"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "authorize", returnType: CAPPluginReturnPromise)
    ]

    /// La autorización responde por delegado, mucho después de volver de
    /// `authorize`, así que hay que guardar la llamada para resolverla entonces.
    private var pendingCall: CAPPluginCall?

    @objc func authorize(_ call: CAPPluginCall) {
        call.keepAlive = true
        pendingCall = call

        DispatchQueue.main.async {
            let request = ASAuthorizationAppleIDProvider().createRequest()
            request.requestedScopes = [.fullName, .email]
            request.nonce = UUID().uuidString

            let controller = ASAuthorizationController(authorizationRequests: [request])
            controller.delegate = self
            controller.presentationContextProvider = self
            controller.performRequests()
        }
    }

    private func resolvePending(_ block: (CAPPluginCall) -> Void) {
        guard let call = pendingCall else { return }
        pendingCall = nil
        block(call)
    }
}

extension AppleSignInPlugin: ASAuthorizationControllerDelegate {
    public func authorizationController(controller: ASAuthorizationController,
                                        didCompleteWithAuthorization authorization: ASAuthorization) {
        resolvePending { call in
            guard
                let credential = authorization.credential as? ASAuthorizationAppleIDCredential,
                let tokenData = credential.identityToken,
                let identityToken = String(data: tokenData, encoding: .utf8)
            else {
                call.reject("Apple no devolvio un identity token", "no_identity_token")
                return
            }

            // El nombre y el correo solo llegan la primera vez que este Apple ID
            // autoriza la app; en adelante vienen vacios. El correo viaja ademas
            // dentro del token, que es de donde lo saca Clerk.
            call.resolve([
                "identityToken": identityToken,
                "user": credential.user,
                "email": credential.email ?? "",
                "givenName": credential.fullName?.givenName ?? "",
                "familyName": credential.fullName?.familyName ?? ""
            ])
        }
    }

    public func authorizationController(controller: ASAuthorizationController,
                                        didCompleteWithError error: Error) {
        resolvePending { call in
            // Cerrar la hoja es una salida normal, no un fallo: la parte web lo
            // distingue por este codigo para no ensenar un error.
            if let authError = error as? ASAuthorizationError, authError.code == .canceled {
                call.reject("Autorizacion cancelada", "canceled")
            } else {
                // El texto de ASAuthorizationError casi nunca dice nada util;
                // el codigo numerico si (1000 sin cuenta, 1004 fallo del servidor...).
                let ns = error as NSError
                call.reject("\(ns.domain) \(ns.code): \(error.localizedDescription)", "authorization_failed")
            }
        }
    }
}

extension AppleSignInPlugin: ASAuthorizationControllerPresentationContextProviding {
    public func presentationAnchor(for controller: ASAuthorizationController) -> ASPresentationAnchor {
        return self.bridge?.viewController?.view.window ?? ASPresentationAnchor()
    }
}
