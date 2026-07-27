sap.ui.define([
	"transener/GestionHabilitaciones/services/oDataServices"
], function(oDataServices) {
	"use strict";

	return {
        
		loadSignature : function(onSuccessCallback, onErrorCallback) {
			var odataModel = oDataServices.getModel();
			odataModel.read("/FirmasUsuariosSet('')",{
				success: onSuccessCallback,
				error: onErrorCallback
			});
		},

		// Lee la firma de un usuario de sistema concreto (ej. "VIALEPAB") por key.
		// Se usa para replicar en el duplicado la firma del solicitante ORIGINAL (no la del usuario logueado).
		loadSignatureByUser : function(sUsuario, onSuccessCallback, onErrorCallback) {
			var odataModel = oDataServices.getModel();
			odataModel.read("/FirmasUsuariosSet('" + sUsuario + "')", {
				success: onSuccessCallback,
				error: onErrorCallback
			});
		}
	};
});