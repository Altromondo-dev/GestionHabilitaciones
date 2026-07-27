sap.ui.define([
    "sap/m/MessageBox",
    "sap/ui/core/mvc/Controller",
    //utils
    "transener/GestionHabilitaciones/utils/NavigationHelper",
    "transener/GestionHabilitaciones/utils/FormatHelper",
    "transener/GestionHabilitaciones/utils/FileDownloadHelper",
    "transener/GestionHabilitaciones/utils/MessageBoxHelper",
    "transener/GestionHabilitaciones/utils/PrintAndDownloadHelper",
    //services
    "transener/GestionHabilitaciones/services/IntervencionesServices",
    "transener/GestionHabilitaciones/services/HabilitacionServices",
    "transener/GestionHabilitaciones/services/RegionServices",
    "transener/GestionHabilitaciones/services/HabTecnicasService",
    "transener/GestionHabilitaciones/services/ComentariosHabilitacionesService",
    "transener/GestionHabilitaciones/services/FirmasUsuariosServices",
    "transener/GestionHabilitaciones/services/AdjuntosServices",
    "transener/GestionHabilitaciones/services/MotivoCambioEstadoService",
    "transener/GestionHabilitaciones/services/TipoHabilitacionServices"
], function (MessageBox, Controller, NavigationHelper, FormatHelper, FileDownloadHelper, MessageBoxHelper, PrintAndDownloadHelper,
    IntervencionesServices, HabilitacionServices, RegionServices, HabTecnicasService, ComentariosHabilitacionesService,
    FirmasUsuariosServices, AdjuntosServices, MotivoCambioEstadoService, TipoHabilitacionServices) {
    "use strict";
    return Controller.extend("transener.GestionHabilitaciones.controller.detailHabPT15", {
     

        onInit: function () {


            //	this.loadUserModel();
            this.loadFuncionesModel();
            this.loadHabilitacionModel();
            this.loadGradoAptitud();
            this.loadStatusOptionsModel();
            this.loadFileModel();
            this.loadFirma();
            this.createSendCommentModel();
            this.createModelRecursively();
        },
        createModelRecursively: function () {
            var that = this;
            if (sap.ui.getCore().getModel("UserJsonModel") === undefined) {
                setTimeout(function () {
                    that.createModelRecursively();
                }, 300);
            } else {
                var data = sap.ui.getCore().getModel("UserJsonModel").getData();
                var UserJsonModelVISTA = new sap.ui.model.json.JSONModel(data);
                that.getView().setModel(UserJsonModelVISTA, "UserJsonModelVISTA");
            }
        },
        onTabSelect: function (oEvent) {
            let sSelectedKey = oEvent.getSource().getSelectedKey();
            if (sSelectedKey === "Estado") {
                this.loadMotivoCambioEstado();
            }
            if (sSelectedKey === "Comentarios") {
                this.loadComments();
            }
        },

        loadFuncionesModel: function () {
            var that = this;
            TipoHabilitacionServices.loadTipoHab(function (data) {
                var oModel = new sap.ui.model.json.JSONModel({
                    Funciones: data.results
                });
                that.getView().setModel(oModel, "Funciones");
            }, function () {});
        },
        loadHabilitacionModel: function () {
            var oModel = new sap.ui.model.json.JSONModel();
            oModel.setProperty("/Busy", true);
            oModel.setSizeLimit(9999);
            this.getView().setModel(oModel, "HabilitacionModel");
        },
        loadGradoAptitud: function () {
            //Issue 290 - Medicina Laboral, "Grado de Aptitud"
            var gradoAptitud = [{
                "Codigo": "",
                "Grado": ""
            }, {
                "Codigo": "A",
                "Grado": "Apto sin preexistencias"
            }, {
                "Codigo": "B",
                "Grado": "Apto con preexistencias"
            }, {
                "Codigo": "C",
                "Grado": "Apto con limitaciones"
            }, {
                "Codigo": "D",
                "Grado": "No Apto"
            }];
            /*var gradoAptitud = [{
                "Codigo": "A",
                "Grado": "Apto sin limitaciones"
            }, {
                "Codigo": "B",
                "Grado": "Apto transitorio sin limitaciones"
            }, {
                "Codigo": "C",
                "Grado": "Apto Limitado"
            }, {
                "Codigo": "D",
                "Grado": " No Apto transitorio"
            }, {
                "Codigo": "E",
                "Grado": "No Apto definitivo"
            }, {
                "Codigo": "F",
                "Grado": "Apto Médico Suspendido"
            }, {
                "Codigo": "SEM",
                "Grado": "Sin exámen Medico"
            }];*/
            var oModel = new sap.ui.model.json.JSONModel();
            oModel.setData({
                gradoAptitud: gradoAptitud
            });
            this.getView().setModel(oModel, "gradoAptitud");
        },
        loadStatusOptionsModel: function () {
            var oModel = new sap.ui.model.json.JSONModel({
                Options: [{
                    key: "H",
                    text: "Habilitado"
                }, {
                    key: "D",
                    text: "Revocado"
                }, {
                    key: "S",
                    text: "Suspendido"
                }]
            });
            this.getView().setModel(oModel, "StatusOptionsModel");
        },
        loadFileModel: function () {
            var oModelFile = new sap.ui.model.json.JSONModel();
            oModelFile.setData({
                Files: []
            });
            this.getView().setModel(oModelFile, "Files");
        },
        loadFirma: function () {
            FirmasUsuariosServices.loadSignature(
                jQuery.proxy(this.onSuccessFirmaCallback, this),
                jQuery.proxy(this.onErrorFirmaCallback, this)
            );
        },
        onSuccessFirmaCallback: function (data) {
            var UserData = new sap.ui.model.json.JSONModel();
            UserData.setData(data);
            this.getView().setModel(UserData, "UserData");
        },
        onErrorFirmaCallback: function (error) {
            MessageBox.error("No se pudo cargar la firma");
        },
        createSendCommentModel: function () {
            var oModel = new sap.ui.model.json.JSONModel();
            oModel.setData({
                "SeguridadHComment": "",
                "GerRegionalComment": "",
                "GestionCalidadComment": "",
                "GestionCalidad2Comment": "",
                "RepDireccionComment": "",
                "CotCotDtComment": ""
            });
            this.getView().setModel(oModel, "SendCommentModel");
        },
        loadComments: function () {
            var oModel = this.getView().getModel("HabilitacionModel");
            oModel.setProperty("/Busy", true);
            var oHabilitacion = this.getView().getModel("Habilitacion").getData();
            var filters = {
                "id": oHabilitacion.Idhabilitacion,
                "empresa": oHabilitacion.Empresa === "TRANSENER" ? "100" : "300",
                "Clasehab": "H0003"
            };
            ComentariosHabilitacionesService.getComments(filters,
                jQuery.proxy(this.SuccessGetComentHabCalback, this),
                jQuery.proxy(this.ErrorGetComentHabCalback, this)
            );
        },
        SuccessGetComentHabCalback: function (data) {
            var oModelHab = this.getView().getModel("HabilitacionModel");
            var oModel = new sap.ui.model.json.JSONModel();
            oModel.setData(data);
            this.getView().setModel(oModel, "ComentariosHabilitacionesModel");
            //Al obtener los comentarios del servicio, se lo asigno al modelo de envio de comentarios para que muestre en el textArea los comentarios ya guardados
            var allCommentsGeted = data.results;
            var oSeguridadHComment = allCommentsGeted.find(comment => {
                return comment.Rol.includes("seguridadH_PT15");
            });
            var oGerRegionalComment = allCommentsGeted.find(comment => {
                return comment.Rol.includes("PT15_GerRegional");
            });
            var oGestionCalidadComment = allCommentsGeted.find(comment => {
                return comment.Rol.includes("Gestion_Calidad_PT15");
            });
            var oGestionCalidad2Comment = allCommentsGeted.find(comment => {
                return comment.Rol.includes("Gestion_Calidad_PT152");
            });
            var oRepDireccionComment = allCommentsGeted.find(comment => {
                return comment.Rol.includes("Rep_Direccion_PT15");
            });
            var oCotCotDtComment = allCommentsGeted.find(comment => {
                return comment.Rol.includes("COT_COTDT_PT15");
            });
            //Le seteo al modelo de enviar el comentario q ya esta guardado en el servicio para cada rol
            this.getView().getModel("SendCommentModel").getData().SeguridadHComment = oSeguridadHComment === undefined ? '' :
                oSeguridadHComment.Comentarios;
            this.getView().getModel("SendCommentModel").getData().GerRegionalComment = oGerRegionalComment === undefined ? '' :
                oGerRegionalComment.Comentarios;
            this.getView().getModel("SendCommentModel").getData().GestionCalidadComment = oGestionCalidadComment === undefined ? '' :
                oGestionCalidadComment.Comentarios;
            this.getView().getModel("SendCommentModel").getData().GestionCalidad2Comment = oGestionCalidad2Comment === undefined ? '' :
                oGestionCalidad2Comment.Comentarios;
            this.getView().getModel("SendCommentModel").getData().RepDireccionComment = oRepDireccionComment === undefined ? '' :
                oRepDireccionComment.Comentarios;
            this.getView().getModel("SendCommentModel").getData().CotCotDtComment = oCotCotDtComment === undefined ? '' :
                oCotCotDtComment.Comentarios;
            oModelHab.setProperty("/Busy", false);
            //Refresco el modelo para que se actualicen los textarea
            this.getView().getModel("SendCommentModel").refresh(true);
        },
        ErrorGetComentHabCalback: function (data) {
            var oModelHab = this.getView().getModel("HabilitacionModel");
            oModelHab.setProperty("/Busy", false);
            MessageBox.error("Error al obtener comentarios");
        },
        onBack: function () {
            NavigationHelper.back({
                destroy: true
            });
        },
        _onDonwloadHabilitacion: function (oEvt) {
            var oModelHabilitacion = this.getView().getModel("Habilitacion").getData(),
                claseHabilitacion = oModelHabilitacion.Clasehab,
                tipoHabilitacion = this.getView().getModel("Funciones").getData().Funciones,
                regionModel = this.getView().getModel("Regiones").getData().Regiones,
                habilitacionModel = this.getView().getModel("HabilitacionModel").getData(),
                GradoAptitud = this.getView().getModel("gradoAptitud").getData().gradoAptitud;
            PrintAndDownloadHelper.handlePrintAndDownload(claseHabilitacion, oModelHabilitacion, tipoHabilitacion, habilitacionModel,
                regionModel, GradoAptitud);
        },
        userCanViewAttachments: function () {
            try {
                return !!this.getView()
                    .getModel("UserJsonModelVISTA")
                    .getData()
                    .User[0]
                    .roles
                    .some(r =>
                        r.includes("seguridadH_PT15") || // Seguridad e Higiene
                        r.includes("SegHigiene") || // Seguridad e Higiene
                        r.includes("Auditor_Externo") || // Auditor Externo
                        r.includes("Aud_Externo_PT15") || // Auditor Externo
                        r.includes("Director_Tecnico") || // Director Técnico
                        r.includes("Rep_Direccion_PT15") || // Representante de la Dirección 
                        r.includes("Gestion_Calidad_PT15") || // Gestión de la Calidad
                        r.includes("Ger_Operaciones") || // Gerencia de Planificación y Operación de la Red
                        r.includes("Ger_Reg_Jefe_COT") || // Gerente Regional / Jefe COT 
                        r.includes("PT15_GerRegional") || // Gerente Regional / Jefe COT 
                        r.includes("Examinadores_PT15") || // Las tres personas designadas como Equipo Examinador			
                        r === "Examinador1" || // Las tres personas designadas como Equipo Examinador
                        r === "Examinador2" || // Las tres personas designadas como Equipo Examinador
                        r === "Examinador3" // Las tres personas designadas como Equipo Examinador
                    );
            } catch (e) {
                return false;
            }
        },
        LoadIntervenciones: async function (Idhabilitacion) {
            try {
                await this.getHabilitacion(Idhabilitacion);
            } catch (e) {
                this.getView().getModel("HabilitacionModel").setProperty("/Busy", false);
                return;
            }
            if (Idhabilitacion) {
                IntervencionesServices.loadIntervenciones(Idhabilitacion,
                    "H0003",
                    jQuery.proxy(this.SuccessCallBackInt, this),
                    jQuery.proxy(this.ErrorCallBackInt, this)
                );
            }
        },
        SuccessCallBackInt: function (data) {
            var Intervenciones = data.results;
            // INI MOD TRNS #100775 - exponer texto de duplicación en el header
            var oDup = Intervenciones.find(function (i) {
                return i.Datosadicionales &&
                       i.Datosadicionales.indexOf("Habilitacion duplicada de la original") === 0;
            });
            this.getView().getModel("HabilitacionModel")
                .setProperty("/TextoDuplicacion", oDup ? oDup.Datosadicionales.replace(" N ", " Nro ") : "");
            // FIN MOD TRNS #100775
            var oModel = new sap.ui.model.json.JSONModel();
            oModel.setData({
                Intervenciones: Intervenciones
            });
            this.getView().setModel(oModel, "Intervenciones");
            this.onBindingIntervenciones();
            //this.loadComments();
            //this.loadMotivoCambioEstado();
        },
        ErrorCallBackInt: function (error) {
            this.getView().getModel("HabilitacionModel").setProperty("/Busy", false);
        },
        getHabilitacion: function (Idhabilitacion) {
            var oView = this.getView();

            return new Promise((resolve, reject) => {
                HabilitacionServices.loadHabilitacion(Idhabilitacion, "H0003", oView, function (error) {
                    if (error) {
                        reject(error); 
                    } else {
                        resolve(); 
                    }
                });
            });
        }
        ,
        onBindingIntervenciones: function () {
            var Intervenciones = this.getView().getModel("Intervenciones").getData().Intervenciones;
            var oDataModel = this.getView().getModel("HabilitacionModel").getData();
            if (!this.getView().getModel("Habilitacion")) {
                MessageBoxHelper.showAlert("Leer datos Habilitación", "Ha ocurrido un error, intente nuevamente.");
                this.onBack();
            }
            var Habilitacion = this.getView().getModel("Habilitacion").getData();
            var ValidateAptoMedico = false;
            for (var row in Intervenciones) {
                var roles = Intervenciones[row].Rol;
                if (roles.includes("SOLICITANTE_PT15")) {
                    oDataModel.Solicitador_Firma = "data:image/png;base64," + Intervenciones[row].Firma;
                    oDataModel.Solicitador_Nombre = Intervenciones[row].Nombre;
                    oDataModel.Solicitador_Fecha = FormatHelper.formatJsonDate(Intervenciones[row].Fechaint);
                } else if (roles.includes("Habilitado_PT15")) {
                    oDataModel.Habilitado_Firma = "data:image/png;base64," + Intervenciones[row].Firma;
                    oDataModel.Habilitado_Nombre = Intervenciones[row].Nombre;
                    oDataModel.Habilitado_Fecha = FormatHelper.formatJsonDate(Intervenciones[row].Fechaint);
                // INI MOD TRNS #XXXXXX - aceptar rol de workflow hab_pt15_* (el sufijo _NNNN lo cubre includes)
                // } else if (roles.includes("COT_COTDT_PT15")) {
                } else if (roles.includes("COT_COTDT_PT15") || roles.includes("hab_pt15_cot")) {
                // FIN MOD TRNS #XXXXXX
                    oDataModel.Capacitador_Firma = "data:image/png;base64," + Intervenciones[row].Firma;
                    oDataModel.Capacitador_Nombre = Intervenciones[row].Nombre;
                    oDataModel.Capacitador_Fecha = FormatHelper.formatJsonDate(Intervenciones[row].Fechaint);
                // INI MOD TRNS #XXXXXX - aceptar rol de workflow hab_pt15_* (el sufijo _NNNN lo cubre includes)
                // } else if (roles.includes("MedicinaLaboral_PT15")) {
                } else if (roles.includes("MedicinaLaboral_PT15") || roles.includes("hab_pt15_med-laboral")) {
                // FIN MOD TRNS #XXXXXX
                    oDataModel.Medicina_Firma = "data:image/png;base64," + Intervenciones[row].Firma;
                    oDataModel.Medicina_Nombre = Intervenciones[row].Nombre;
                    oDataModel.Medicina_Fecha = FormatHelper.formatJsonDate(Intervenciones[row].Fechaint);
                    oDataModel.aptoMedicoVisible = true;
                    ValidateAptoMedico = true;
                    if (Habilitacion.Hab_apmedico_nav && Habilitacion.Hab_apmedico_nav.length > 0) {
                        oDataModel.Gradoap = Habilitacion.Hab_apmedico_nav[0].Gradoap;
                        oDataModel.Medicina_Fecha_vencimiento = FormatHelper.formatJsonDate(Habilitacion.Hab_apmedico_nav[0].Vigencia);
                    }
                    /*	oDataModel.Medicina_Firma = "data:image/png;base64," + Intervenciones[row].Firma;
                        oDataModel.Medicina_Nombre = Intervenciones[row].Nombre;
                        oDataModel.Medicina_Fecha = FormatHelper.formatJsonDate(Intervenciones[row].Fechaint);
                        var Habilitacion = this.getView().getModel("Habilitacion").getData();
                        oDataModel.Gradoap = Habilitacion.Hab_apmedico_nav[0].Gradoap;
                        oDataModel.Medicina_Fecha_vencimiento = FormatHelper.formatJsonDate(Habilitacion.Hab_apmedico_nav[0].Vigencia);
                        oDataModel.Medicina_Fecha_vencimiento_old = FormatHelper.formatJsonDate(Habilitacion.Hab_apmedico_nav[0].Vigencia);
                        ValidateAptoMedico = true;*/
                // INI MOD TRNS #XXXXXX - aceptar rol de workflow hab_pt15_* (el sufijo _NNNN lo cubre includes)
                // } else if (roles.includes("seguridadH_PT15")) {
                } else if (roles.includes("seguridadH_PT15") || roles.includes("hab_pt15_seg-hig")) {
                // FIN MOD TRNS #XXXXXX
                    if (Intervenciones[row].Datosadicionales !== "Examen Reprobado") {
                        oDataModel.SeguridadHigiene_Firma = "data:image/png;base64," + Intervenciones[row].Firma;
                        oDataModel.SeguridadHigiene_Nombre = Intervenciones[row].Nombre;
                        oDataModel.SeguridadHigiene_Fecha = FormatHelper.formatJsonDate(Intervenciones[row].Fechaint);
                        //var Habilitacion = this.getView().getModel("Habilitacion").getData();
                        if (Habilitacion.Hab_SeguridadHigiene_nav[0]) {
                            oDataModel.CountEvaluation = Habilitacion.Hab_SeguridadHigiene_nav[0].Contador;
                            oDataModel.aprobadoCheck = Habilitacion.Hab_SeguridadHigiene_nav[0].Aprobado;
                            oDataModel.SeguridadHigiene_Fecha_examen = FormatHelper.formatJsonDate(Habilitacion.Hab_SeguridadHigiene_nav[0].Vigencia);
                        }
                        if (Intervenciones[row].Datosadicionales != "") { //Pongo esto porque estan explotando licencias...
                            var extraData = JSON.parse(Intervenciones[row].Datosadicionales);
                            oDataModel.SeguridadHigiene_Fecha_Venc = new Date(extraData.SeguridadHigiene_Fecha_Venc);
                            oDataModel.SeguridadHigiene_Observacion = extraData.SeguridadHigiene_Observacion;
                            oDataModel.SeguridadHigiene_Anio_Venc = String(oDataModel.SeguridadHigiene_Fecha_Venc.getFullYear() - oDataModel.SeguridadHigiene_Fecha
                                .getFullYear());
                            //Agrego esto porque no trae bien el termino cuando selecciona mes o dias
                            if (oDataModel.SeguridadHigiene_Fecha_Venc.getMonth() !== oDataModel.SeguridadHigiene_Fecha.getMonth() || oDataModel.SeguridadHigiene_Fecha_Venc
                                .getDate() !== oDataModel.SeguridadHigiene_Fecha.getDate()) {
                                //Difiere el mes o el día? entonces no seleccionó año, seleccionó "Otros"
                                oDataModel.SeguridadHigiene_Anio_Venc = "0";
                            }
                        }
                        if (oDataModel.SeguridadHigiene_Anio_Venc === "0") {
                            var Diferencia = oDataModel.SeguridadHigiene_Fecha_Venc.getTime() - oDataModel.SeguridadHigiene_Fecha.getTime();
                            Diferencia = Math.abs(Diferencia);
                            var Dias = Math.floor(Diferencia / (1000 * 60 * 60 * 24));
                            //Si coincide el día, va el mes
                            if (oDataModel.SeguridadHigiene_Fecha_Venc.getDate() === oDataModel.SeguridadHigiene_Fecha.getDate()) {
                                var oTime = oDataModel.SeguridadHigiene_Fecha_Venc.getMonth() - oDataModel.SeguridadHigiene_Fecha.getMonth();
                                if (oTime < 0) {
                                    oTime = Math.abs(oTime);
                                }
                                oDataModel.SeguridadHigiene_Tiempo_Venc = "Mes";
                                oDataModel.SeguridadHigiene_Cantidad_Venc = oTime;
                            } else {
                                oDataModel.SeguridadHigiene_Tiempo_Venc = "Dia";
                                oDataModel.SeguridadHigiene_Cantidad_Venc = DiasSegHig;
                            }
                        }
                    }
                } else if (roles.includes("Examinador1")) {
                    oDataModel.Examinador1_Nombre = Intervenciones[row].Nombre;
                    oDataModel.Examinador1_Fecha = FormatHelper.formatJsonDate(Intervenciones[row].Fechaint);
                    oDataModel.Examinador1_Firma = "data:image/png;base64," + Intervenciones[row].Firma;
                } else if (roles.includes("Examinador2")) {
                    oDataModel.Examinador2_Nombre = Intervenciones[row].Nombre;
                    oDataModel.Examinador2_Fecha = FormatHelper.formatJsonDate(Intervenciones[row].Fechaint);
                    oDataModel.Examinador2_Firma = "data:image/png;base64," + Intervenciones[row].Firma;
                } else if (roles.includes("Examinador3")) {
                    oDataModel.Examinador3_Nombre = Intervenciones[row].Nombre;
                    oDataModel.Examinador3_Fecha = FormatHelper.formatJsonDate(Intervenciones[row].Fechaint);
                    oDataModel.Examinador3_Firma = "data:image/png;base64," + Intervenciones[row].Firma;
                // INI MOD TRNS #XXXXXX - aceptar rol de workflow hab_pt15_* (el sufijo _NNNN lo cubre includes)
                // } else if (roles.includes("Ger_Reg_Jefe_COT")) {
                } else if (roles.includes("Ger_Reg_Jefe_COT") || roles.includes("hab_pt15_ger-reg-jefe-cot")) {
                // FIN MOD TRNS #XXXXXX
                    oDataModel.Gerente_Reg_Firma = "data:image/png;base64," + Intervenciones[row].Firma;
                    oDataModel.Gerente_Reg_Nombre = Intervenciones[row].Nombre;
                    oDataModel.Gerente_Reg_Fecha = FormatHelper.formatJsonDate(Intervenciones[row].Fechaint);
                    // INI MOD TRNS #XXXXXX - blindar parse: este branch pasa a ejecutarse en vivo tras Edit D
                    // var extraData = JSON.parse(Intervenciones[row].Datosadicionales);
                    // oDataModel.Gerente_Reg_Fecha_Venc = new Date(extraData.Gerente_Reg_Fecha_Venc);
                    // oDataModel.Gerente_Reg_Observacion = extraData.Gerente_Reg_Observacion;
                    var extraDataGR = {};
                    if (Intervenciones[row].Datosadicionales && Intervenciones[row].Datosadicionales.trim() !== "") {
                        extraDataGR = JSON.parse(Intervenciones[row].Datosadicionales);
                    }
                    oDataModel.Gerente_Reg_Fecha_Venc = new Date(extraDataGR.Gerente_Reg_Fecha_Venc);
                    oDataModel.Gerente_Reg_Observacion = extraDataGR.Gerente_Reg_Observacion;
                    // FIN MOD TRNS #XXXXXX
                    oDataModel.Gerente_Reg_Anio_Venc = String(oDataModel.Gerente_Reg_Fecha_Venc.getFullYear() - oDataModel.Gerente_Reg_Fecha.getFullYear());
                    //Agrego esto porque no trae bien el termino cuando selecciona mes o dias
                    if (oDataModel.Gerente_Reg_Fecha_Venc.getMonth() !== oDataModel.Gerente_Reg_Fecha.getMonth() || oDataModel.Gerente_Reg_Fecha_Venc
                        .getDate() !== oDataModel.Gerente_Reg_Fecha.getDate()) {
                        //Difiere el mes o el día? entonces no seleccionó año, seleccionó "Otros"
                        oDataModel.Gerente_Reg_Anio_Venc = "0";
                    }
                    if (oDataModel.Gerente_Reg_Anio_Venc === "0") {
                        var DiferenciaGerReg = oDataModel.Gerente_Reg_Fecha_Venc.getTime() - oDataModel.Gerente_Reg_Fecha.getTime();
                        DiferenciaGerReg = Math.abs(DiferenciaGerReg);
                        var DiasGerReg = Math.floor(DiferenciaGerReg / (1000 * 60 * 60 * 24));
                        if (oDataModel.Gerente_Reg_Fecha_Venc.getDate() === oDataModel.Gerente_Reg_Fecha.getDate()) {
                            //Si coincide el día, va el mes
                            var oTime = oDataModel.Gerente_Reg_Fecha_Venc.getMonth() - oDataModel.Gerente_Reg_Fecha.getMonth();
                            if (oTime < 0) {
                                oTime = Math.abs(oTime);
                            }
                            oDataModel.Gerente_Reg_Tiempo_Venc = "Mes";
                            oDataModel.Gerente_Reg_Cantidad_Venc = oTime;
                        } else {
                            oDataModel.Gerente_Reg_Tiempo_Venc = "Dia";
                            oDataModel.Gerente_Reg_Cantidad_Venc = DiasGerReg;
                        }
                    }
                } else if (roles.includes("Ger_Operaciones")) {
                    oDataModel.Ger_Operaciones_Firma = "data:image/png;base64," + Intervenciones[row].Firma;
                    oDataModel.Ger_Operaciones_Nombre = Intervenciones[row].Nombre;
                    oDataModel.Ger_Operaciones_Fecha = FormatHelper.formatJsonDate(Intervenciones[row].Fechaint);
                    oDataModel.Ger_Operaciones_Fecha_Venc = new Date(JSON.parse(Intervenciones[row].Datosadicionales));
                    var extraData = JSON.parse(Intervenciones[row].Datosadicionales);
                    oDataModel.Ger_Operaciones_Fecha_Venc = new Date(extraData.Ger_Operaciones_Fecha_Venc);
                    oDataModel.Ger_Operaciones_Observacion = extraData.Ger_Operaciones_Observacion;
                    oDataModel.Ger_Operaciones_Anio_Venc = String(oDataModel.Ger_Operaciones_Fecha_Venc.getFullYear() - oDataModel.Ger_Operaciones_Fecha
                        .getFullYear());
                    //Agrego esto porque no trae bien el termino cuando selecciona mes o dias
                    if (oDataModel.Ger_Operaciones_Fecha_Venc.getMonth() !== oDataModel.Ger_Operaciones_Fecha.getMonth() || oDataModel.Ger_Operaciones_Fecha_Venc
                        .getDate() !== oDataModel.Ger_Operaciones_Fecha.getDate()) {
                        //Difiere el mes o el día? entonces no seleccionó año, seleccionó "Otros"
                        oDataModel.Ger_Operaciones_Anio_Venc = "0";
                    }
                    if (oDataModel.Ger_Operaciones_Anio_Venc === "0") {
                        var DiferenciaGerOp = oDataModel.Ger_Operaciones_Fecha_Venc.getTime() - oDataModel.Ger_Operaciones_Fecha.getTime();
                        DiferenciaGerOp = Math.abs(DiferenciaGerOp);
                        var DiasGerOp = Math.floor(DiferenciaGerOp / (1000 * 60 * 60 * 24));
                        if (oDataModel.Ger_Operaciones_Fecha_Venc.getDate() === oDataModel.Ger_Operaciones_Fecha.getDate()) {
                            //Si coincide el día, va el mes
                            var oTime = oDataModel.Ger_Operaciones_Fecha_Venc.getMonth() - oDataModel.Ger_Operaciones_Fecha.getMonth();
                            if (oTime < 0) {
                                oTime = Math.abs(oTime);
                            }
                            oDataModel.Ger_Operaciones_Tiempo_Venc = "Mes";
                            oDataModel.Ger_Operaciones_Cantidad_Venc = oTime;
                        } else {
                            oDataModel.Ger_Operaciones_Tiempo_Venc = "Dia";
                            oDataModel.Ger_Operaciones_Cantidad_Venc = DiasGerOp;
                        }
                    }
                // INI MOD TRNS #XXXXXX - aceptar rol de workflow hab_pt15_* (el sufijo _NNNN lo cubre includes)
                // } else if (roles.includes("Gestion_Calidad_PT152")) {
                } else if (roles.includes("Gestion_Calidad_PT152") || roles.includes("hab_pt15_gest-calidad")) {
                // FIN MOD TRNS #XXXXXX
                    //var Habilitacion = this.getView().getModel("Habilitacion").getData();
                    oDataModel.Gestion_Calidad_Firma = "data:image/png;base64," + Intervenciones[row].Firma;
                    oDataModel.Gestion_Calidad_Nombre = Intervenciones[row].Nombre;
                    oDataModel.Gestion_Calidad_Fecha = FormatHelper.formatJsonDate(Intervenciones[row].Fechaint);
                    oDataModel.Gestion_Calidad_Fecha_Habilitacion = FormatHelper.formatJsonDate(Habilitacion.Vigencia);
                    oDataModel.ObservacionGestionCalidad = Intervenciones[row].Datosadicionales;
                // INI MOD TRNS #XXXXXX - aceptar rol de workflow hab_pt15_* (el sufijo _NNNN lo cubre includes)
                // } else if (roles.includes("Rep_Direccion_PT15")) {
                } else if (roles.includes("Rep_Direccion_PT15") || roles.includes("hab_pt15_rep-direccion")) {
                // FIN MOD TRNS #XXXXXX
                    oDataModel.Rep_Direccion_Firma = "data:image/png;base64," + Intervenciones[row].Firma;
                    oDataModel.Rep_Direccion_Nombre = Intervenciones[row].Nombre;
                    oDataModel.Rep_Direccion_Fecha = FormatHelper.formatJsonDate(Intervenciones[row].Fechaint);
                    oDataModel.Rep_Direccion_Observacion = Intervenciones[row].Datosadicionales;
                // INI MOD TRNS #XXXXXX - aceptar rol de workflow hab_pt15_* (el sufijo _NNNN lo cubre includes)
                // } else if (roles.includes("Direccion_TecnicaPT15")) {
                } else if (roles.includes("Direccion_TecnicaPT15") || roles.includes("hab_pt15_ger-operacion")) {
                // FIN MOD TRNS #XXXXXX
                    //var Habilitacion = this.getView().getModel("Habilitacion").getData();
                    oDataModel.Direccion_Tecnica_Firma = "data:image/png;base64," + Intervenciones[row].Firma;
                    oDataModel.Direccion_Tecnica_Nombre = Intervenciones[row].Nombre;
                    oDataModel.Direccion_Tecnica_Fecha_Vigencia = FormatHelper.formatJsonDate(Habilitacion.Vigencia);
                    oDataModel.Direccion_Tecnica_Fecha = FormatHelper.formatJsonDate(Intervenciones[row].Fechaint);
                    // INI MOD TRNS #XXXXXX - la observacion de Dir. Tecnica llega en JSON del rol hab_pt15_ger-operacion
                    // oDataModel.Direccion_Tecnica_Observacion = Intervenciones[row].Datosadicionales;
                    var extraDataDT = {};
                    if (Intervenciones[row].Datosadicionales && Intervenciones[row].Datosadicionales.trim() !== "") {
                        extraDataDT = JSON.parse(Intervenciones[row].Datosadicionales);
                    }
                    oDataModel.Direccion_Tecnica_Observacion = extraDataDT.Ger_Operaciones_Observacion;
                    // FIN MOD TRNS #XXXXXX
                }
            }
            if (ValidateAptoMedico === false && Habilitacion.Hab_apmedico_nav && Habilitacion.Hab_apmedico_nav.length > 0) {
                oDataModel.aptoMedicoVisible = false;
                oDataModel.Gradoap = Habilitacion.Hab_apmedico_nav[0].Gradoap;
                oDataModel.Medicina_Fecha_vencimiento = FormatHelper.formatJsonDate(Habilitacion.Hab_apmedico_nav[0].Vigencia);
                oDataModel.Medicina_Fecha_vencimiento_old = FormatHelper.formatJsonDate(Habilitacion.Hab_apmedico_nav[0].Vigencia);
            }
            var oModel = this.getView().getModel("HabilitacionModel");
            oModel.updateBindings(true);
            oModel.setProperty("/Busy", false);
            this.LoadRegionesModel();
        },
        ShowButtonStatus: function (estado) {
            if (estado === "N" || estado === "P") {
                return false;
            }
            return true;
        },
        formatDateTime: function (date, time) {
            if (date !== undefined && time !== undefined && date !== null && time !== null) {
                var dateFormat = sap.ui.core.format.DateFormat.getDateTimeInstance({
                    pattern: "dd/MM/yyyy"
                });
                var hora = new Date(time.ms);
                var newHora = new Date(hora.valueOf() + hora.getTimezoneOffset() * 60000);
                var TimeFormat = sap.ui.core.format.DateFormat.getDateTimeInstance({
                    pattern: "HH:mm"
                });
                var newDate = FormatHelper.formatJsonDate(date);
                return dateFormat.format(newDate) + " " + TimeFormat.format(newHora);
            }
        },
        handleLinkAdjuntoPress: function (oEvent) {
            var Adjunto = oEvent.getSource().getBindingContext("Intervenciones").getObject();
            var binary = atob(Adjunto.Archivo);
            FileDownloadHelper.saveBinaryFile(binary, Adjunto.Doctype, Adjunto.Nombre);
        },
        formatSwitch: function (checkInt) {
            if (typeof (checkInt) !== "undefined") {
                if (checkInt) {
                    this.getView().byId("labelLegajo").setVisible(true);
                    this.getView().byId("inputLegajo").setVisible(true);
                } else {
                    this.getView().byId("TitleConfEmpleado").setVisible(false);
                    this.getView().byId("ContentConfEmpleado").setVisible(false);
                }
            }
            return checkInt;
        },
        validaAjuntos: function (adjuntos) {
            if (adjuntos.results.length > 0) {
                return true;
            } else {
                return false;
            }
        },
        LoadRegionesModel: function () {
            var Empresa = this.getView().getModel("Habilitacion").getData().Empresa === "TRANSENER" ? "100" : "300";
            RegionServices.LoadRegiones(Empresa,
                jQuery.proxy(this.onSuccessRegion, this),
                jQuery.proxy(this.onErrorRegion, this)
            );
        },
        onSuccessRegion: function (data) {
            var Regiones = data.results;
            var oModel = new sap.ui.model.json.JSONModel();
            oModel.setData({
                Regiones: Regiones
            });
            this.getView().setModel(oModel, "Regiones");
        },
        onErrorRegion: function (error) {
            MessageBox.error("Error al cargar las regiones");
        },
        enableStatusOptionsByRolAndLicstat: function () {
            var Roles = this.getView().getModel("UserJsonModelVISTA").getData().User[0].roles;
            var EstadoActual = this.getView().getModel("Habilitacion").getData().Estado;
            //se fija si dentro de los roles tiene Director tecnico
            var bRolesAutorizados = Roles.some(function (elem) {
                return elem === "Direccion_TecnicaPT15" || elem === "Director_Tecnico";
            });
            if (bRolesAutorizados) {
                //Si es habilitado
                if (EstadoActual === "H") {
                    this.getView().getModel("StatusOptionsModel").setData({
                        Options: [{
                            key: "D",
                            text: "Revocado"
                        }, {
                            key: "S",
                            text: "Suspendido"
                        }]
                    });
                    //Si es suspendido
                } else if (EstadoActual === "S") {
                    this.getView().getModel("StatusOptionsModel").setData({
                        Options: [{
                            key: "D",
                            text: "Revocado"
                        }, {
                            key: "H",
                            text: "Habilitado"
                        }]
                    });
                }
            }
        },
        onChangeStatus: function () {
            this.enableStatusOptionsByRolAndLicstat();
            this.oDialog = new sap.m.Dialog({
                title: "Elija el estado de la habilitación",
                afterClose: [this.afterCloseDialog, this],
                buttons: [
                    new sap.m.Button({
                        icon: "sap-icon://sys-cancel",
                        tooltip: "Cerrar",
                        text: "Cerrar",
                        press: [this.onCloseDialog, this]
                    }),
                    new sap.m.Button({
                        icon: "sap-icon://save",
                        type: sap.m.ButtonType.Emphasized,
                        tooltip: "Guardar",
                        text: "Guardar",
                        press: [this.onChangeStatusHab, this]
                    })
                ],
                content: [
                    new sap.m.FlexBox({
                        alignContent: sap.m.FlexAlignContent.Center,
                        justifyContent: sap.m.FlexJustifyContent.Center,
                        items: [
                            new sap.m.VBox({
                                items: [
                                    new sap.m.ComboBox({
                                        selectedKey: "{oDialogModel>/status}",
                                        width: "100%",
                                        items: {
                                            path: "StatusOptionsModel>/Options",
                                            template: new sap.ui.core.Item({
                                                key: "{StatusOptionsModel>key}",
                                                text: "{StatusOptionsModel>text}"
                                            })
                                        },
                                        placeholder: "Seleccionar estado"
                                    }),
                                    new sap.m.TextArea({
                                        enabled: {
                                            path: "oDialogModel>/status",
                                            formatter: this.changeStatusMotivoEnabled
                                        },
                                        placeholder: "Motivo del cambio de estado",
                                        rows: 4,
                                        width: "100%",
                                        value: "{oDialogModel>/comment}"
                                    })
                                ]
                            })
                        ]
                    }).addStyleClass("sapUiSmallMargin oDialog")
                ]
            });
            var oModel = new sap.ui.model.json.JSONModel();
            var StatusModel = this.getView().getModel("StatusOptionsModel");
            this.oDialog.setModel(oModel, "oDialogModel");
            this.oDialog.setModel(StatusModel, "StatusOptionsModel");
            this.oDialog.open();
        },
        changeStatusMotivoEnabled: function (Status) {
            if (Status !== null && Status !== "" && Status !== undefined) {
                return true;
            } else {
                return false;
            }
        },
        onChangeStatusHab: function () {
            var oDialogModel = this.oDialog.getModel("oDialogModel").getData();
            var oModel = this.getView().getModel("HabilitacionModel");
            var habilitacion = this.getView().getModel("Habilitacion").getData();
            var Empresa = habilitacion.Empresa === "TRANSENER" ? "100" : "300";
            var Roles = this.getView().getModel("UserJsonModelVISTA").getData().User[0].roles;
            var Rol = Roles.find(element => element === "Director_Tecnico" || element === "Direccion_TecnicaMTO");
            var data = {
                Apellido: habilitacion.Apellido,
                Area: habilitacion.Area,
                Base: habilitacion.Base,
                Clasehab: habilitacion.Clasehab,
                Documento: habilitacion.Documento,
                Empresa: habilitacion.Empresa,
                Empresaext: habilitacion.Empresaext,
                Estado: oDialogModel.status,
                Idhabilitacion: habilitacion.Idhabilitacion,
                Interno: habilitacion.Interno,
                Legajo: habilitacion.Legajo,
                Lote: habilitacion.Lote,
                Mto13: habilitacion.Mto13,
                Mto33: habilitacion.Mto33,
                Mto66: habilitacion.Mto66,
                Mto132: habilitacion.Mto132,
                Mto220: habilitacion.Mto220,
                Mto500: habilitacion.Mto500,
                Nombre: habilitacion.Nombre,
                Puesto: habilitacion.Puesto,
                Tipodoc: habilitacion.Tipodoc,
                Tipohab: habilitacion.Tipohab,
                Vigencia: habilitacion.Vigencia
            };
            //Motivo cambio de estado
            var MotivoCambioData = {
                Clasehab: habilitacion.Clasehab,
                Comentarios: oDialogModel.comment,
                Empresa: Empresa,
                Idhabilitacion: habilitacion.Idhabilitacion,
                Rol: Rol,
                Estado: oDialogModel.status
            };
            this.onCloseDialog();
            oModel.setProperty("/Busy", true);
            //Guardo el nuevo estado en la habilitacion
            HabilitacionServices.saveHabilitacion(data,
                jQuery.proxy(this.onSuccessCallbackStatus, this),
                jQuery.proxy(this.onErrorCallbackStatus, this)
            );
            //Guardo motivo de cambio de estado
            MotivoCambioEstadoService.saveMotivo(MotivoCambioData,
                jQuery.proxy(this.onSuccessCallbackMotivo, this),
                jQuery.proxy(this.onErrorCallbackMotivo, this)
            );
        },
        onSuccessCallbackStatus: function () {
            HabTecnicasService.LoadHabilitaciones(
                jQuery.proxy(this.successCallbackList, this),
                jQuery.proxy(this.errorCallbackList, this),
                [],
                "/HabTecnicas2PT15Set"
            );
        },
        onErrorCallbackStatus: function (data) {
            MessageBox.error("Error al cambiar el estado");
        },
        successCallbackList: function (data) {
            /*var Habilitaciones = data.results;
            var dateFormat = sap.ui.core.format.DateFormat.getDateTimeInstance({
                pattern: "dd/MM/yyyy"
            });
            for (var row in Habilitaciones) {
                Habilitaciones[row].VigenciaDate = dateFormat.format(Habilitaciones[row].Vigencia);
            }
            var viewPath = this.getView().getParent().getParent().getId();
            sap.ui.getCore().byId(viewPath + "--Main").getModel("Habilitaciones").setProperty("/Habilitaciones", Habilitaciones);*/
        },
        errorCallbackList: function () {
            MessageBox.error("Error al obtener las habilitaciones");
        },
        onSuccessCallbackMotivo: function () {
            var oModel = this.getView().getModel("HabilitacionModel");
            oModel.setProperty("/Busy", false);
            sap.m.MessageToast.show("Se ha cambiado el estado de la habilitación");
        },
        onErrorCallbackMotivo: function () {
            var oModel = this.getView().getModel("HabilitacionModel");
            MessageBox.error("Error al guardar el motivo de cambio de estado");
            oModel.setProperty("/Busy", false);
        },
        loadMotivoCambioEstado: function () {
            //Obtiene la lista de comentarios de cambio de estado
            var oModel = this.getView().getModel("HabilitacionModel");
            oModel.setProperty("/Busy", true);
            var oHabilitacion = this.getView().getModel("Habilitacion").getData();
            var Roles = this.getView().getModel("UserJsonModelVISTA").getData().User[0].roles;
            var Rol = Roles.find(element => element === "Director_Tecnico" || element === "Direccion_TecnicaPT15");
            var filters = {
                "Id": oHabilitacion.Idhabilitacion,
                "Empresa": oHabilitacion.Empresa === "TRANSENER" ? "100" : "300",
                "Clasehab": "H0003",
                "Rol": Rol
            };
            MotivoCambioEstadoService.getMotivo(filters,
                jQuery.proxy(this.successCallbackMotivoList, this),
                jQuery.proxy(this.errorCallbackMotivoList, this)
            );
        },
        successCallbackMotivoList: function (data) {
            var oModelHab = this.getView().getModel("HabilitacionModel");
            oModelHab.setProperty("/Busy", false);
            //Agrega los nuevos comentarios al modelo
            var oModel = new sap.ui.model.json.JSONModel();
            oModel.setData(data);
            this.getView().setModel(oModel, "MotivoCambioEstadoModel");
        },
        errorCallbackMotivoList: function () {
            var oModelHab = this.getView().getModel("HabilitacionModel");
            oModelHab.setProperty("/Busy", false);
            MessageBox.error("Error al obtener la lista de comentarios de cambio de estado");
        },
        onEnableChangeStatus: function (rol, Estado) {
            if (Estado === "D" || Estado === "C") { //una vez revocada no se puede cambiar el estado
                return false;
            }
            if (rol) {
                if (
                    rol.includes("Direccion_TecnicaPT15") ||
                    rol.includes("Director_Tecnico")
                ) {
                    return true;
                } else {
                    return false;
                }
            } else {
                return false;
            }
        },
        onEnableRol2: function (rol) {
            if (rol) {
                if (
                    rol.includes("Direccion_TecnicaPT15") ||
                    rol.includes("Director_Tecnico")
                ) {
                    return true;
                } else {
                    return false;
                }
            } else {
                return false;
            }
        },
        onEnableRol3: function (rol, estado) {
            if (!rol) {
                return false;
            }
            if (estado === 'C' || estado === 'D' || estado === 'F' || estado === 'N') {
                return false;
            } else {
                if (rol.includes('MedicinaLaboral_PT15') || rol.includes('Medicina_Laboral')) {
                    return true;
                } else {
                    return false;
                }
            }
        },
        onUpdateData: function (event) {
            // ISSUE 229 - Medicina Laboral, Botones "Editar Datos" y "Cambio de Estado"
            var oModel = this.getView().getModel("HabilitacionModel");
            var habilitacion = this.getView().getModel("Habilitacion").getData();
            var Empresa = habilitacion.Empresa === "TRANSENER" ? "100" : "300";
            var Roles = this.getView().getModel("UserJsonModelVISTA").getData().User[0].roles;
            var Rol = Roles.find(element => element === "Director_Tecnico" || element === "Direccion_TecnicaMTO");
            var estadoNuevo = habilitacion.Estado;
            if (oModel.oData.Gradoap === "A" || oModel.oData.Gradoap === "B" || oModel.oData.Gradoap === "C") {
                if (habilitacion.Estado !== 'S' && habilitacion.Estado !== 'D') {
                    estadoNuevo = 'H';
                }
            } else if (oModel.oData.Gradoap === "D" || oModel.oData.Gradoap === "F" || oModel.oData.Gradoap === "SEM") {
                if (habilitacion.Estado !== 'D') {
                    estadoNuevo = 'S';
                }
            } else if (oModel.oData.Gradoap === "E") {
                estadoNuevo = 'D';
            }
            // valido fecha
            if (oModel.oData.Gradoap === "A" || oModel.oData.Gradoap === "B" || oModel.oData.Gradoap === "C") {
                if (oModel.oData.Medicina_Fecha_vencimiento < oModel.oData.Medicina_Fecha_vencimiento_old) {
                    MessageBox.alert("La fecha de validez debe ser mayor o igual a la actual.", {
                        title: "Error"
                    });
                    return;
                } else {
                    habilitacion.Vigencia = oModel.oData.Medicina_Fecha_vencimiento;
                }
            }
            var data = {
                Apellido: habilitacion.Apellido,
                Area: habilitacion.Area,
                Base: habilitacion.Base,
                Clasehab: habilitacion.Clasehab,
                Documento: habilitacion.Documento,
                Empresa: habilitacion.Empresa,
                Empresaext: habilitacion.Empresaext,
                Estado: estadoNuevo,
                Idhabilitacion: habilitacion.Idhabilitacion,
                Interno: habilitacion.Interno,
                Legajo: habilitacion.Legajo,
                Lote: habilitacion.Lote,
                Mto13: habilitacion.Mto13,
                Mto33: habilitacion.Mto33,
                Mto66: habilitacion.Mto66,
                Mto132: habilitacion.Mto132,
                Mto220: habilitacion.Mto220,
                Mto500: habilitacion.Mto500,
                Nombre: habilitacion.Nombre,
                Puesto: habilitacion.Puesto,
                Tipodoc: habilitacion.Tipodoc,
                Tipohab: habilitacion.Tipohab,
                Vigencia: habilitacion.Vigencia,
                Hab_apmedico_nav: [{
                    "Legajo": habilitacion.Legajo,
                    "Vigencia": oModel.oData.Medicina_Fecha_vencimiento,
                    "Observaciones": "Sin observaciones",
                    "Gradoap": oModel.oData.Gradoap
                }]
            };
            //Motivo cambio de estado
            var MotivoCambioData = {
                Clasehab: habilitacion.Clasehab,
                Comentarios: "Cambio de estado automático por medicina laboral",
                Empresa: Empresa,
                Idhabilitacion: habilitacion.Idhabilitacion,
                Rol: Rol,
                Estado: estadoNuevo
            };
            oModel.setProperty("/Busy", true);
            //Guardo el nuevo estado en la habilitacion
            HabilitacionServices.saveHabilitacion(data,
                jQuery.proxy(this.onSuccessCallbackStatus, this),
                jQuery.proxy(this.onErrorCallbackStatus, this)
            );
            //Guardo motivo de cambio de estado
            MotivoCambioEstadoService.saveMotivo(MotivoCambioData,
                jQuery.proxy(this.onSuccessCallbackMotivo, this),
                jQuery.proxy(this.onErrorCallbackMotivo, this)
            );
        },
        successIntCallback: function (data) {
            var HabilitacionModel = this.getView().getModel("HabilitacionModel").getData();
            var gradoAp = {
                Gradoap: HabilitacionModel.Gradoap,
                Vigencia: HabilitacionModel.Medicina_Fecha_vencimiento,
                Legajo: data.Legajo,
                Observaciones: ""
            };
            IntervencionesServices.updateGradoAp(gradoAp).then(function (res) {
                // CAMBIOS ISSUE 229
                this.onChangeStatusHab();
                // CAMBIOS ISSUE 229
                MessageBox.alert("Los cambios se han guardado correctamente", {
                    title: "Guardado"
                });
            }, function (err) {
                MessageBox.alert("Error al guardar los cambios", {
                    title: "Error"
                });
            });
            var Idadjuntos = data.Idadjuntos;
            this.onSaveFile(Idadjuntos);
        },
        onSaveFile: function (Idadjuntos) {
            var Files = this.getView().getModel("Files").getData().Files;
            if (Files.length > 0) {
                $.each(Files, function (row) {
                    var oFileDate = {
                        "Nombre": Files[row].name,
                        "Archivo": Files[row].binary,
                        "Doctype": Files[row].type,
                        "Rol": "MedicinaLaboral_PT15", //rolId,
                        "Idadjuntos": Idadjuntos
                    };
                    AdjuntosServices.SaveAdjunto(oFileDate);
                });
            }
        },
        errorIntCallback: function () {
            var oModel = this.getModel("HabilitacionModel");
            oModel.setProperty("/Busy", false);
            MessageBoxHelper.showAlert("Aprobar Habilitación", "Ha ocurrido un error, intente mas tarde.");
        },
        onChangeFile: function (oEvent) {
            if (oEvent.getParameters().files.length > 0) {
                var file = oEvent.getParameters().files[0];
                if (file.name.length > 100) {
                    MessageBoxHelper.showAlert("Adjuntar Archivo",
                        "Este archivo posee un nombre demasiado largo, para adjuntar un archivo debe" +
                        " indicar un nombre menor a 100 caracteres");
                    return;
                }
                MessageBoxHelper.showConfirm("Adjuntar Archivo", "¿Desea adjuntar este archivo?",
                    jQuery.proxy(this.onPressSaveFile, this, file)
                );
            }
        },
        onPressSaveFile: function (file) {
            var oModel = this.getView().getModel("Files");
            var reader = new FileReader();
            reader.readAsBinaryString(file);
            reader.onload = function () {
                var FileName = file.name;
                if (FileName.length > 35)
                    FileName = FileName.substr(0, 29) + FileName.substr(FileName.length - 5);
                var adjunto = {
                    name: FileName,
                    binary: btoa(reader.result),
                    type: file.type
                };
                oModel.getData().Files.push(adjunto);
                oModel.updateBindings(true);
            };
        },
        onDownloadAdjunto: function (oEvent) {
            var Adjunto = oEvent.getSource().getBindingContext("Files").getObject();
            var binary = atob(Adjunto.binary);
            FileDownloadHelper.saveBinaryFile(binary, Adjunto.type, Adjunto.name);
        },
        onDeleteAdjunto: function (oEvent) {
            var indice = oEvent.getSource().getBindingContext("Files").getPath();
            var index = indice.replace("/Files/", "");
            var model = this.getView().getModel("Files").getData().Files;
            model.splice(index, 1);
            this.getView().getModel("Files").updateBindings(true);
        },
        onCloseDialog: function () {
            this.oDialog.close();
        },
        afterCloseDialog: function () {
            this.oDialog.destroy();
            this.oDialog = null;
        },
        RolFormatter: function (rol) {
            if (rol.includes("Director_Tecnico")) {
                return "Director Técnico";
            } else if (rol.includes("Direccion_TecnicaPT15")) {
                return "Director Técnico";
            } else {
                return rol;
            }
        },
        StatusFormatter: function (Estado) {
            if (Estado === "H") {
                return "Habilitado";
            } else if (Estado === "D") {
                return "Revocado";
            } else if (Estado === "S") {
                return "Suspendido";
            }
            return Estado;
        }
    });
});