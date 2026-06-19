sap.ui.define([
    "transener/GestionHabilitaciones/services/oDataServices",
], function (oDataServices) {
    "use strict";
    return {
        loadHabilitacion: function (idHabilitacion, claseHab, oView, callback) {
            var odataModel = oDataServices.getModel();
            odataModel.read("/HabTecnicas2Set", {
                filters: [
                    new sap.ui.model.Filter("Idhabilitacion", sap.ui.model.FilterOperator.EQ, idHabilitacion),
                    new sap.ui.model.Filter("Clasehab", sap.ui.model.FilterOperator.EQ, claseHab)
                ],
                urlParameters: {
                    "$expand": "Hab_apmedico_nav,Hab_SeguridadPublica_nav,Hab_SeguridadHigiene_nav,Hab_CETCT_nav,Hab_DesMantenimiento_nav"
                },
                success: jQuery.proxy(this.onSuccessCallback, this, oView, callback),
                error: jQuery.proxy(this.onErrorCallback, this, callback)
            });
        },
        onSuccessCallback: function (oView, callback, data) {
            var Habilitacion = data.results[0];
            if (!Habilitacion) {
                if (callback) callback(new Error("Sin datos"));
                return;
            }
            Habilitacion.Hab_apmedico_nav = Habilitacion.Hab_apmedico_nav ? Habilitacion.Hab_apmedico_nav.results : [];
            Habilitacion.Hab_SeguridadHigiene_nav = Habilitacion.Hab_SeguridadHigiene_nav ? Habilitacion.Hab_SeguridadHigiene_nav.results : [];
            Habilitacion.Hab_CETCT_nav = Habilitacion.Hab_CETCT_nav ? Habilitacion.Hab_CETCT_nav.results : [];
            delete Habilitacion.metadata;
            var oModel = new sap.ui.model.json.JSONModel();
            oModel.setData(Habilitacion);
            oView.setModel(oModel, "Habilitacion");
            var oModelT = new sap.ui.model.json.JSONModel();
            var TensionModel = oModelT.getData();
            TensionModel.Tension = [];
            TensionModel.Tension.push({
                "Tension": ""
            });
            if (Habilitacion.Lote === "HC") {
                TensionModel.Tension.push({
                    "Tension": 'HC'
                });
            }
            if (Habilitacion.Mto500 === true) {
                TensionModel.Tension.push({
                    "Tension": '500'
                });
            }
            if (Habilitacion.Mto132 === true) {
                TensionModel.Tension.push({
                    "Tension": '132'
                });
            }
            if (Habilitacion.Mto220 === true) {
                TensionModel.Tension.push({
                    "Tension": '220'
                });
            }
            if (Habilitacion.Mto66 === true) {
                TensionModel.Tension.push({
                    "Tension": '66'
                });
            }
            if (Habilitacion.Mto33 === true) {
                TensionModel.Tension.push({
                    "Tension": '33'
                });
            }
            if (Habilitacion.Mto13 === true) {
                TensionModel.Tension.push({
                    "Tension": '330'
                });
            }
            oModelT.refresh();
            oView.setModel(oModelT, "TensionModel");

            var oPristineModel = new sap.ui.model.json.JSONModel();

            var HabilitacionClon = Object.assign({}, Habilitacion);

            oPristineModel.setData(HabilitacionClon);
            oView.setModel(oPristineModel, "PristineModel");
            if (callback) callback();
        },
        onErrorCallback: function (callback, error) {
            if (callback) callback(error);
        },
        saveHabilitacion: function (data, onSuccessCallback, onErrorCallback) {
            var odataModel = oDataServices.getModel();
            odataModel.create("/HabTecnicas2Set", data, {
                success: onSuccessCallback,
                error: onErrorCallback
            });
        }
    };
});