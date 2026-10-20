sap.ui.define([
    "transener/GestionHabilitaciones/services/oDataServices"
], function (oDataServices) {
    "use strict";

    return {

        // Maestro de puestos de PT15. Es el mismo set que usan cargahabpt15 (alta) y
        // habilitacionespt15 (bandeja de My Inbox) para armar el combo Funcion.
        // Empresa llega como nombre ("TRANSENER" / "TRANSBA"), no como sociedad numerica.
        LoadPuestosAreas: function (empresa, onSuccessCallback, onErrorCallback) {
            var odataModel = oDataServices.getModel();
            odataModel.read("/PuestoAreaPT15Set", {
                filters: [
                    new sap.ui.model.Filter("Empresa", sap.ui.model.FilterOperator.EQ, empresa)
                ],
                success: onSuccessCallback,
                error: onErrorCallback
            });
        }
    };
});
