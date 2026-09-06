import UIKit
import Capacitor

/**
 Capacitor solo descubre por su cuenta los plugins que llegan como paquete
 (los de node_modules que `cap sync` mete en Package.swift). Los que viven
 dentro de la app, como este, hay que dárselos a mano: sin esta llamada el
 puente responde «plugin is not implemented on ios» y la parte web nunca
 llega a hablar con AuthenticationServices.

 El storyboard apunta a esta clase en vez de a CAPBridgeViewController
 justamente para poder engancharse aquí.
 */
class ViewController: CAPBridgeViewController {
    override func capacitorDidLoad() {
        bridge?.registerPluginInstance(AppleSignInPlugin())
    }
}
