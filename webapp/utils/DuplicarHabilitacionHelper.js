sap.ui.define([
	"transener/GestionHabilitaciones/services/IntervencionesServices",
	"transener/GestionHabilitaciones/services/FirmasUsuariosServices",
	"transener/GestionHabilitaciones/services/HabilitacionServices"
], function (IntervencionesServices, FirmasUsuariosServices, HabilitacionServices) {
	"use strict";

	// Configuración por clase REAL de la habilitación original (columna Clasehab del listado).
	// - rolInt: Rol enviado en la intervención del duplicado.
	// - codigoMarca: Clasehab enviado en habtécnicas (código-marca de duplicación; el backend lo traduce).
	// - isPT15: PT15 usa entidades propias (IntervencionesPT15Set/Habtecnicas2PT15Set) y replica la firma del solicitante original.
	var CLASS_CONFIG = {
		"H0001": { rolInt: "SOLICITANTE_MANTENIMIENTO", codigoMarca: "H0005", isPT15: false },   // MTO
		"H0002": { rolInt: "SOLICITANTE_TCT", codigoMarca: "H0006", isPT15: false },             // TCT
		"H0003": { rolInt: "SOLICITANTE_PT15", codigoMarca: "H0004", isPT15: true }              // PT15
	};

	return {

		/**
		 * Orquestación del duplicado (SIN workflow, SIN adjuntos). Solo aplica a habilitaciones ya habilitadas.
		 * Orden runtime (no transaccional, cada POST independiente):
		 *   leer intervenciones original → resolver solicitante (firma PT15) → leer registro completo
		 *   → POST intervención (nº real) → POST habtécnicas (Estado "H").
		 * @param {object} oData datos del DuplicarModel (fila original + campos calculados de destino)
		 * @returns {Promise<{Idhabilitacion:string}>}
		 */
		duplicar: function (oData) {
			var that = this;
			var oCfg = CLASS_CONFIG[oData.Clasehab];
			if (!oCfg) {
				return Promise.reject(new Error("Clase de habilitación no soportada: " + oData.Clasehab));
			}
			var oCtx = { oData: oData, oCfg: oCfg };
			return this._loadOriginalIntervenciones(oData, oCfg)
				.then(function (aInt) {
					return that._resolveSolicitante(aInt, oCfg);
				})
				.then(function (oSolic) {
					oCtx.oSolic = oSolic;
					return that._readOriginal(oData);
				})
				.then(function (oFull) {
					oCtx.oFullOriginal = oFull;
					return that._saveIntervencion(oData, oCfg, oCtx.oSolic, oFull);
				})
				.then(function (oResp) {
					oCtx.Idhabilitacion = oResp.Idhabilitacion;  // nº real generado por el backend
					return that._saveHabtecnicas(oCtx);
				})
				.then(function () {
					return { Idhabilitacion: oCtx.Idhabilitacion };
				});
		},

		/**
		 * A partir de las intervenciones ya leídas, toma la más antigua (por Fechaint+Horaint) para
		 * obtener el Usuario de sistema del solicitante original, y (solo PT15) su firma.
		 * @returns {Promise<{Usuario:string, Firma:string, UserName:string}>}
		 */
		_resolveSolicitante: function (aInt, oCfg) {
			var that = this;
			var oOldest = this._pickOldestIntervencion(aInt);
			var oSolic = { Usuario: oOldest ? (oOldest.Usuario || "") : "", Firma: "", UserName: "" };
			if (oCfg.isPT15 && oSolic.Usuario) {
				return this._loadFirma(oSolic.Usuario).then(function (oFirma) {
					oSolic.Firma = (oFirma && oFirma.Firma) || "";
					oSolic.UserName = (oFirma && oFirma.UserName) || "";
					return oSolic;
				}).catch(function () {
					// Si falla la firma, no bloquear: se manda la intervención sin firma.
					return oSolic;
				});
			}
			return Promise.resolve(oSolic);
		},

		_loadOriginalIntervenciones: function (oData, oCfg) {
			return new Promise(function (resolve) {
				var onOk = function (oResp) { resolve((oResp && oResp.results) || []); };
				// Sin filas / error → devolver []: la intervención se creará sin firma (no bloquear el flujo).
				var onErr = function () { resolve([]); };
				if (oCfg.isPT15) {
					IntervencionesServices.loadIntervencionesPT15ByHab(oData.Idhabilitacion, oData.Clasehab, onOk, onErr);
				} else {
					IntervencionesServices.loadIntervenciones(oData.Idhabilitacion, oData.Clasehab, onOk, onErr);
				}
			});
		},

		// La fila MÁS ANTIGUA es la del solicitante original que abrió la habilitación.
		// El backend devuelve las filas en orden DESCENDENTE (la más reciente primero), así que NO se
		// puede tomar la primera: ordenamos ascendente por Fechaint Y Horaint combinados (puede haber
		// varias filas el mismo día) y tomamos [0] = la más antigua.
		_pickOldestIntervencion: function (aInt) {
			if (!aInt || !aInt.length) {
				return null;
			}
			var that = this;
			return aInt.slice().sort(function (a, b) {
				return that._intSortKey(a) - that._intSortKey(b);
			})[0];
		},

		// Clave de orden = ms de Fechaint (Edm.DateTime → Date) + ms de Horaint (Edm.Time → {ms}).
		_intSortKey: function (oInt) {
			var t = 0;
			if (oInt.Fechaint) {
				t += (oInt.Fechaint instanceof Date) ? oInt.Fechaint.getTime() : new Date(oInt.Fechaint).getTime();
			}
			if (oInt.Horaint && typeof oInt.Horaint === "object" && oInt.Horaint.ms != null) {
				t += oInt.Horaint.ms;
			}
			return t;
		},

		_loadFirma: function (sUsuario) {
			return new Promise(function (resolve, reject) {
				FirmasUsuariosServices.loadSignatureByUser(sUsuario, resolve, reject);
			});
		},

		_saveIntervencion: function (oData, oCfg, oSolic, oFull) {
			var oPayload = this._buildIntervencionPayload(oData, oCfg, oSolic, oFull);
			return new Promise(function (resolve, reject) {
				if (oCfg.isPT15) {
					IntervencionesServices.SaveIntervencionPT15(oPayload, resolve, reject);
				} else {
					IntervencionesServices.SaveIntervenciones(oPayload, resolve, reject);
				}
			});
		},

		_buildIntervencionPayload: function (oData, oCfg, oSolic, oFull) {
			var oNow = new Date();
			var sHora = "PT" + oNow.getHours() + "H" + oNow.getMinutes() + "M" + oNow.getSeconds() + "S";
			var oPayload = {
				"Idhabilitacion": oData.PlaceholderId,          // "8888888888" (MR) | "7777777777" (MB); el backend genera el nº real con prefijo
				"Datosadicionales": oData.Idhabilitacion,       // nº de la original → el backend genera un comentario automático
				"Fechacreacion": oNow,
				"Rol": oCfg.rolInt,
				"Clasehab": oData.Clasehab,                     // clase REAL (H0001/H0002/H0003), no el código-marca
				"Fechaint": oNow,
				"Horaint": sHora,
				"Accion": "",
				"Usuario": "",                                  // lo rellena el backend con sy-uname
				// Legajo desde el registro completo (HabTecnicas2Set), la fuente confiable: el listado (oData)
				// puede traer Interno/Legajo inconsistentes y hacía caer al Documento por error.
				"Legajo": oFull.Interno ? oFull.Legajo : oFull.Documento,
				"Nombre": ""
			};
			if (oCfg.isPT15) {
				// PT15: firma y nombre del solicitante ORIGINAL; Empresa = sociedad destino.
				oPayload.Nombre = oSolic.UserName || oFull.Nombre || "";
				oPayload.Firma = oSolic.Firma || "";
				oPayload.Empresa = oData.DestinoEmpresa;
			}
			return oPayload;
		},

		// ---- Paso 2: Habtécnicas (registro maestro, copia del registro completo original) ----

		_readOriginal: function (oData) {
			return new Promise(function (resolve, reject) {
				HabilitacionServices.readOriginal(oData.Idhabilitacion, oData.Clasehab,
					function (oResp) {
						var oRec = oResp && oResp.results && oResp.results[0];
						if (!oRec) {
							reject(new Error("No se encontró la habilitación original " + oData.Idhabilitacion));
							return;
						}
						resolve(oRec);
					},
					function (err) { reject(err); }
				);
			});
		},

		_saveHabtecnicas: function (oCtx) {
			var oPayload = this._buildHabtecnicasPayload(oCtx);
			return new Promise(function (resolve, reject) {
				if (oCtx.oCfg.isPT15) {
					HabilitacionServices.saveHabilitacionPT15(oPayload, resolve, reject);
				} else {
					HabilitacionServices.saveHabilitacion(oPayload, resolve, reject);
				}
			});
		},

		_buildHabtecnicasPayload: function (oCtx) {
			return oCtx.oCfg.isPT15
				? this._buildHabtecnicasPayloadPT15(oCtx)
				: this._buildHabtecnicasPayloadFull(oCtx);
		},

		// PT15 escribe en Habtecnicas2PT15Set. Se usa la MISMA lista de campos que el alta de cargahabpt15
		// (SaveHabilitacionService) para no enviar campos que esa entidad no acepta (Puesto/Base/Mto*/VtoApto/…).
		// Los valores salen del registro completo original; los overrides de duplicación son:
		// Idhabilitacion (nuevo), Clasehab (código-marca H0004), Empresa (destino), Area (región elegida), Estado ("H").
		// Vigencia se CONSERVA. La copia solo aplica a habilitaciones ya habilitadas → nace en "H" (sin workflow).
		_buildHabtecnicasPayloadPT15: function (oCtx) {
			var oData = oCtx.oData;
			var oFull = oCtx.oFullOriginal;
			return {
				"Idhabilitacion": oCtx.Idhabilitacion,
				"Clasehab": oCtx.oCfg.codigoMarca,
				"Tipohab": oFull.Tipohab,
				"Interno": oFull.Interno,
				"Apellido": oFull.Apellido,
				"Nombre": oFull.Nombre,
				"Tipodoc": oFull.Tipodoc,
				"Documento": oFull.Documento,
				"Legajo": oFull.Legajo,
				"Vigencia": oFull.Vigencia,
				"Estado": "H",
				"Area": oData.NuevaArea,
				"Empresaext": oFull.Empresaext,
				"Lote": oFull.Lote || "",
				"Empresa": oData.DestinoEmpresa,
				"Hab_apmedico_nav": [],
				"Hab_SeguridadPublica_nav": [],
				"Hab_SeguridadHigiene_nav": [],
				"Hab_CETCT_nav": [],
				"Hab_DesMantenimiento_nav": [],
				"Hab_Intervenciones_nav": []
			};
		},

		// MTO/TCT leen y escriben la MISMA entidad (HabTecnicas2Set) → copia completa fiel del registro
		// original (preserva Puesto/Base/Mto*/etc.), salvo los overrides de duplicación. FechaCreacion NO
		// se envía (la pone el backend); las nav properties van vacías. Estado "H" (hab ya habilitada).
		_buildHabtecnicasPayloadFull: function (oCtx) {
			var oData = oCtx.oData;
			var data = Object.assign({}, oCtx.oFullOriginal);
			delete data.__metadata;
			delete data.FechaCreacion;
			this._stripDeferred(data);
			data.Idhabilitacion = oCtx.Idhabilitacion;   // nº real del Paso 1
			data.Clasehab = oCtx.oCfg.codigoMarca;       // H0005 | H0006
			data.Empresa = oData.DestinoEmpresa;         // sociedad opuesta
			data.Area = oData.NuevaArea;                 // región elegida por el usuario
			data.Estado = "H";                           // la copia solo aplica a habilitadas → nace en "H"
			// data.Vigencia: se conserva la de la original (viene en oFullOriginal)
			data.Hab_apmedico_nav = [];
			data.Hab_SeguridadPublica_nav = [];
			data.Hab_SeguridadHigiene_nav = [];
			data.Hab_CETCT_nav = [];
			data.Hab_DesMantenimiento_nav = [];
			data.Hab_Intervenciones_nav = [];
			return data;
		},

		// Elimina propiedades de navegación no expandidas ({__deferred:{...}}) para no ensuciar el POST.
		_stripDeferred: function (data) {
			Object.keys(data).forEach(function (sKey) {
				var v = data[sKey];
				if (v && typeof v === "object" && v.__deferred) {
					delete data[sKey];
				}
			});
		}
	};
});
