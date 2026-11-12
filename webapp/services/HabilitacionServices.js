sap.ui.define([
    "transener/GestionHabilitaciones/services/oDataServices",
], function (oDataServices) {
    "use strict";
    return {
        // INI MOD TRNS #PT-99 - estados que cuentan como licencia otorgada para determinar el Tipo
        // (Habilitacion / Rehabilitacion). Misma lista que cargahabpt15.
        // INI MOD TRNS #PT22.1 - se saca "D" (Revocado). La tarjeta lo pide explicitamente:
        // "Historial solo con 'Revocado' (no cuenta segun la reunion): se marca 'Habilitacion'".
        // La lista tiene que seguir siendo IDENTICA a la de cargahabpt15/services/HabilitacionServices.js:
        // si una cambia y la otra no, el Tipo del alta y el del detalle dejan de coincidir.
        // ESTADOS_OTORGADOS: ["H", "D", "S", "X", "Y", "Z", "F"],
        ESTADOS_OTORGADOS: ["H", "S", "X", "Y", "Z", "F"],
        // FIN MOD TRNS #PT22.1

        // Licencias PT15 del legajo en la empresa, SIN $expand (GET_ENTITYSET). Funcion y Estado se
        // filtran en el front: el backend ignora esos filtros.
        // Legajo es la unica key de Habtecnicas2PT15, asi que todas las filas del legajo comparten
        // clave en la cache del ODataModel. Por eso (1) se lee con una instancia propia del modelo,
        // para no pisar el registro que ya muestra el detalle, y (2) las filas se toman del body crudo.
        loadLicenciasLegajoPT15: function (sLegajo, sEmpresa, onSuccessCallback, onErrorCallback) {
            if (!this._oModelLicenciasPT15) {
                this._oModelLicenciasPT15 = new sap.ui.model.odata.v2.ODataModel(
                    oDataServices.getModel().sServiceUrl, { useBatch: false });
            }
            this._oModelLicenciasPT15.read("/Habtecnicas2PT15Set", {
                filters: [
                    new sap.ui.model.Filter("Legajo", sap.ui.model.FilterOperator.EQ, sLegajo),
                    new sap.ui.model.Filter("Clasehab", sap.ui.model.FilterOperator.EQ, "H0003"),
                    new sap.ui.model.Filter("Empresa", sap.ui.model.FilterOperator.EQ, sEmpresa)
                ],
                success: function (oData, oResponse) {
                    var aModelo = (oData && oData.results) || [],
                        aCrudas = aModelo;
                    try {
                        aCrudas = JSON.parse(oResponse.body).d.results || aModelo;
                    } catch (e) { /* sin body: se usan las filas del modelo */ }
                    // Diagnostico: si el modelo colapsa filas por la key, los Id no coinciden.
                    var fnIds = function (a) { return a.map(function (h) { return h.Idhabilitacion; }).join(","); };
                    if (fnIds(aModelo) !== fnIds(aCrudas)) {
                        console.warn("PT-99: filas colapsadas por la key Legajo", fnIds(aModelo), "vs", fnIds(aCrudas));
                    }
                    onSuccessCallback(aCrudas);
                },
                error: onErrorCallback
            });
        },
        // FIN MOD TRNS #PT-99

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
        },

        // PT15 escribe el registro maestro en Habtecnicas2PT15Set (MTO/TCT usan HabTecnicas2Set via saveHabilitacion).
        saveHabilitacionPT15: function (data, onSuccessCallback, onErrorCallback) {
            var odataModel = oDataServices.getModel();
            odataModel.create("/Habtecnicas2PT15Set", data, {
                success: onSuccessCallback,
                error: onErrorCallback
            });
        },

        // Lee el registro completo de la habilitación original (HabTecnicas2Set por Idhabilitacion + Clasehab real)
        // para construir una copia idéntica. Usa el MISMO $expand que loadHabilitacion (el read del detalle,
        // que sí devuelve datos): en este servicio el GET_ENTITYSET no devuelve filas sin el $expand.
        // Los hijos expandidos se descartan al armar el POST (las navs van vacías).
        readOriginal: function (idHabilitacion, claseHab, onSuccessCallback, onErrorCallback) {
            var odataModel = oDataServices.getModel();
            odataModel.read("/HabTecnicas2Set", {
                filters: [
                    new sap.ui.model.Filter("Idhabilitacion", sap.ui.model.FilterOperator.EQ, idHabilitacion),
                    new sap.ui.model.Filter("Clasehab", sap.ui.model.FilterOperator.EQ, claseHab)
                ],
                urlParameters: {
                    "$expand": "Hab_apmedico_nav,Hab_SeguridadPublica_nav,Hab_SeguridadHigiene_nav,Hab_CETCT_nav,Hab_DesMantenimiento_nav"
                },
                success: onSuccessCallback,
                error: onErrorCallback
            });
        },

        // INI MOD TRNS #PT16 - variantes solo para PT15 (H0003). loadHabilitacion y readOriginal quedan
        // como estaban para MTO/TCT. El apto de PT15 viene en Hab_apmedicoPT15_nav (objeto o null).
        loadHabilitacionPT15: function (idHabilitacion, oView, callback) {
            // El modelo de navegación contiene la fila seleccionada del listado.
            var oSeleccionModel = oView.getModel();
            var oSeleccion = oSeleccionModel && oSeleccionModel.getData();
            if (!oSeleccion || oSeleccion.Idhabilitacion !== idHabilitacion
                || oSeleccion.Clasehab !== "H0003"
                || oSeleccion.Legajo === undefined || oSeleccion.Legajo === null
                || String(oSeleccion.Legajo).trim() === "") {
                if (callback) callback(new Error("No se pudo identificar la persona de la habilitación seleccionada."));
                return;
            }
            var sLegajoSeleccionado = String(oSeleccion.Legajo);
            var odataModel = oDataServices.getModel();
            odataModel.read("/Habtecnicas2PT15Set", {
                filters: [
                    new sap.ui.model.Filter("Idhabilitacion", sap.ui.model.FilterOperator.EQ, idHabilitacion),
                    new sap.ui.model.Filter("Clasehab", sap.ui.model.FilterOperator.EQ, "H0003"),
                    new sap.ui.model.Filter("Legajo", sap.ui.model.FilterOperator.EQ, sLegajoSeleccionado)
                ],
                urlParameters: {
                    "$expand": "Hab_apmedicoPT15_nav,Hab_SeguridadPublica_nav,Hab_SeguridadHigiene_nav,Hab_CETCT_nav,Hab_DesMantenimiento_nav"
                },
                success: function (data) {
                    var oHab = data.results && data.results[0];
                    // Comprobar la identidad antes de cargar los datos en la pantalla.
                    if (oHab && (oHab.Idhabilitacion !== idHabilitacion
                        || oHab.Clasehab !== "H0003"
                        || String(oHab.Legajo) !== sLegajoSeleccionado)) {
                        if (callback) callback(new Error("El detalle recibido no corresponde a la persona seleccionada."));
                        return;
                    }
                    this.onSuccessCallback(oView, callback, data);
                }.bind(this),
                error: jQuery.proxy(this.onErrorCallback, this, callback)
            });
        },

        readOriginalPT15: function (idHabilitacion, onSuccessCallback, onErrorCallback) {
            var odataModel = oDataServices.getModel();
            odataModel.read("/Habtecnicas2PT15Set", {
                filters: [
                    new sap.ui.model.Filter("Idhabilitacion", sap.ui.model.FilterOperator.EQ, idHabilitacion),
                    new sap.ui.model.Filter("Clasehab", sap.ui.model.FilterOperator.EQ, "H0003")
                ],
                urlParameters: {
                    "$expand": "Hab_apmedicoPT15_nav,Hab_SeguridadPublica_nav,Hab_SeguridadHigiene_nav,Hab_CETCT_nav,Hab_DesMantenimiento_nav"
                },
                success: onSuccessCallback,
                error: onErrorCallback
            });
        }
        // FIN MOD TRNS #PT16
    };
});