sap.ui.define([
	"transener/GestionHabilitaciones/services/oDataServices"
], function (oDataServices) {
	"use strict";

	return {

		entitySet: "/IntervencionesSet",

		loadIntervenciones: function (Idhabilitacion, claseHab, onSuccessCallback, onErrorCallback) {
			var odataModel = oDataServices.getModel();
			odataModel.read("/IntervencionesSet", {
				filters: [
					new sap.ui.model.Filter("Idhabilitacion", sap.ui.model.FilterOperator.EQ, Idhabilitacion),
					new sap.ui.model.Filter("Clasehab", sap.ui.model.FilterOperator.EQ, claseHab)
				],
				urlParameters: {
					"$expand": "AdjuntosSet"
				},
				success: onSuccessCallback,
				error: onErrorCallback
			});

		},

		updateGradoAp: function (aptoMedico, success, error) {
			//TODO modificar la habilitacion tambien?
			return new Promise(function (resolve, reject) {
				var path = "/AptoMedico2Set('" + aptoMedico.Legajo + "')";
				var oDataModel = oDataServices.getModel();
				oDataModel.update(path, aptoMedico, {
					success: function(response) {
						if(success) success(response);
						resolve(response);
					},
					error: function(err) {
						if(error) error(err);
						reject(err);
					}
				});
			});
		},
		
		
		SaveIntervenciones : function(data,onSuccessCallback, onErrorCallback) {
			var odataModel = oDataServices.getModel();
			odataModel.create("/IntervencionesSet", data,{
				success: onSuccessCallback,
				error: onErrorCallback
			});
		},

		// PT15: la entidad de intervención es IntervencionesPT15Set (a diferencia de MTO/TCT que usan IntervencionesSet)
		SaveIntervencionPT15 : function(data, onSuccessCallback, onErrorCallback) {
			var odataModel = oDataServices.getModel();
			odataModel.create("/IntervencionesPT15Set", data, {
				success: onSuccessCallback,
				error: onErrorCallback
			});
		},

		// Lee las intervenciones PT15 de una habilitación filtrando por Idhabilitacion + Clasehab
		// (el backend no filtra por rol). Se usa para resolver el solicitante original (firma) y copiar adjuntos.
		loadIntervencionesPT15ByHab : function(Idhabilitacion, claseHab, onSuccessCallback, onErrorCallback) {
			var odataModel = oDataServices.getModel();
			odataModel.read("/IntervencionesPT15Set", {
				filters: [
					new sap.ui.model.Filter("Idhabilitacion", sap.ui.model.FilterOperator.EQ, Idhabilitacion),
					new sap.ui.model.Filter("Clasehab", sap.ui.model.FilterOperator.EQ, claseHab)
				],
				urlParameters: {
					"$expand": "AdjuntosSet"
				},
				success: onSuccessCallback,
				error: onErrorCallback
			});
		}

	};
});