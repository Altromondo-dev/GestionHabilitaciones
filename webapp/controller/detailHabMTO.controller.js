sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/m/MessageBox",
    //utils
    "transener/GestionHabilitaciones/utils/NavigationHelper",
    "transener/GestionHabilitaciones/utils/FormatHelper",
    "transener/GestionHabilitaciones/utils/MessageBoxHelper",
    "transener/GestionHabilitaciones/utils/FileDownloadHelper",
    "transener/GestionHabilitaciones/utils/PrintAndDownloadHelper",
    "transener/GestionHabilitaciones/utils/AppManagementHelper",
    //services
    "transener/GestionHabilitaciones/services/PersonalInternoServices",
    "transener/GestionHabilitaciones/services/RegionServices",
    "transener/GestionHabilitaciones/services/FirmasUsuariosServices",
    "transener/GestionHabilitaciones/services/IntervencionesServices",
    "transener/GestionHabilitaciones/services/HabilitacionServices",
    "transener/GestionHabilitaciones/services/HabTecnicasService",
    "transener/GestionHabilitaciones/services/ComentariosHabilitacionesService",
    "transener/GestionHabilitaciones/services/MotivoCambioEstadoService",
    "transener/GestionHabilitaciones/services/AdjuntosServices"
], function (Controller, MessageBox, NavigationHelper, FormatHelper, MessageBoxHelper, FileDownloadHelper,
    PrintAndDownloadHelper, AppManagementHelper, PersonalInternoServices, RegionServices, FirmasUsuariosServices, IntervencionesServices,
    HabilitacionServices, HabTecnicasService, ComentariosHabilitacionesService,
    MotivoCambioEstadoService, AdjuntosServices) {
    "use strict";
    return Controller.extend("transener.GestionHabilitaciones.controller.detailHabMTO", {
        getBaseURL: function () {
               var appId = this.getOwnerComponent().getManifestEntry("/sap.app/id");

            var appPath = appId.replaceAll(".", "/");
            var appModulePath = jQuery.sap.getModulePath(appPath);

            var jsonModel = sap.ui.getCore().getModel("appCurrentInfo");
            //checks if the model exists
            if (!jsonModel) {
                jsonModel = new sap.ui.model.json.JSONModel();
                jsonModel.setSizeLimit(9999);
                jsonModel.appUrl = appModulePath;
                sap.ui.getCore().setModel(jsonModel, "appCurrentInfo");
                //initilializing = appModulePath; 
                jsonModel.setData({});
            }
            return appModulePath;
        },

        onInit: function () {

            //var cUrl = this.getBaseURL();
            //Modelo con las tareas de mantenimiento
            this.createTaskModel();
            //Modelos de ajuntos y comentarios
            this.loadHabilitacionModel();
            //Modelo con los estados de la habilitación
            this.loadStatusOptionsModel();
            //Modelo para envio de comentarios
            this.createSendCommentModel();
            //Setea modelo con datos del usuario
            this.createModelRecursively();
            //Modelo que setea editable los comentarios
            this.setEditableComments();
        },
        createTaskModel: function () {
            var oModel = new sap.ui.model.json.JSONModel();
            oModel.setData({
                EstSolic: {
                    selected: false,
                    code: "M01"
                },
                EstJefeTraba: {
                    selected: false,
                    code: "M02"
                },
                EstJefeTrabaSupl: {
                    selected: false,
                    code: "M03"
                },
                EstPersonalMant: {
                    selected: false,
                    code: "M04"
                },
                ProtSolic: {
                    selected: false,
                    code: "M05"
                },
                ProtJefeTraba: {
                    selected: false,
                    code: "M06"
                },
                ProtJefeTrabaSupl: {
                    selected: false,
                    code: "M07"
                },
                ProtPersonalMant: {
                    selected: false,
                    code: "M08"
                },
                MedSolic: {
                    selected: false,
                    code: "M09"
                },
                MedJefeTraba: {
                    selected: false,
                    code: "M10"
                },
                MedJefeTrabaSupl: {
                    selected: false,
                    code: "M11"
                },
                MedPersonalMant: {
                    selected: false,
                    code: "M12"
                },
                SisContSolic: {
                    selected: false,
                    code: "M13"
                },
                SisContJefeTraba: {
                    selected: false,
                    code: "14"
                },
                SisContJefeTrabaSupl: {
                    selected: false,
                    code: "M15"
                },
                SisContPersonalMant: {
                    selected: false,
                    code: "M16"
                },
                SisComuSolic: {
                    selected: false,
                    code: "M17"
                },
                SisComuJefeTraba: {
                    selected: false,
                    code: "M18"
                },
                SisComuJefeTrabaSupl: {
                    selected: false,
                    code: "M19"
                },
                SisComuPersonalMant: {
                    selected: false,
                    code: "M20"
                },
                LineaSolic: {
                    selected: false,
                    code: "M21"
                },
                LineaJefeTraba: {
                    selected: false,
                    code: "M22"
                },
                LineaJefeTrabaSupl: {
                    selected: false,
                    code: "M23"
                },
                LineaPersonalMant: {
                    selected: false,
                    code: "M24"
                },
                AdmRedOpSolic: {
                    selected: false,
                    code: "M25"
                },
                AdmRedOpJefeTraba: {
                    selected: false,
                    code: "M26"
                },
                AdmRedOpJefeTrabaSupl: {
                    selected: false,
                    code: "M27"
                },
                AdmRedOpPersonalMant: {
                    selected: false,
                    code: "M28"
                }
            });
            this.getView().setModel(oModel, "TaskSelectionJsonModel");
        },
        loadHabilitacionModel: function () {
            var oModel = new sap.ui.model.json.JSONModel();
            oModel.setProperty("/Busy", true);
            this.getView().setModel(oModel, "HabilitacionModel");
            //Modelo de archivos adjuntos
            var oModelFiles = new sap.ui.model.json.JSONModel();
            oModelFiles.setData({
                Files: []
            });
            this.getView().setModel(oModelFiles, "Files");
            //Modelo de la tab comentarios
            var oModel = new sap.ui.model.json.JSONModel();
            this.getView().setModel(oModel, "ComentariosHabilitacionesModel");
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
        setEditableComments: function () {
            var EditableCommentsModel = new sap.ui.model.json.JSONModel({
                editMode_solicitante: false,
                editMode_segHigiene: false,
                editMode_segPublica: false,
                editMode_gerRegional: false,
                editMode_capacitacion: false,
                editMode_secretaria: false
            });
            this.getView().setModel(EditableCommentsModel, "EditableCommentsModel");
            //Obtengo los roles
            setTimeout(function () {
                var Roles = sap.ui.getCore().getModel("UserJsonModel").getData().User[0].roles;
                //var aModelRoles = AppManagementHelper.getModel("UserJsonModel");
                //var Roles = aModelRoles.getData().roles;
                if (Roles.includes("hab_solicitud_habilitaciones")) {
                    EditableCommentsModel.setProperty("/editMode_solicitante", true);
                } else if (Roles.includes("hab_mto_seg-hig")) {
                    EditableCommentsModel.setProperty("/editMode_segHigiene", true);
                } else if (Roles.includes("hab_mto_seg-pub")) {
                    EditableCommentsModel.setProperty("/editMode_segPublica", true);
                } else if (Roles.includes("hab_mto_ger-reg")) {
                    EditableCommentsModel.setProperty("/editMode_gerRegional", true);
                } else if (Roles.includes("hab_mto_capacitacion")) {
                    EditableCommentsModel.setProperty("/editMode_capacitacion", true);
                } else if (Roles.includes("hab_mto_secretaria")) {
                    EditableCommentsModel.setProperty("/editMode_secretaria", true);
                }
            }, 300);
        },
        createSendCommentModel: function () {
            var oModel = new sap.ui.model.json.JSONModel();
            oModel.setData({
                "ConformidadAgenteComment": "",
                "CapaYEntrenamComment": "",
                "SecretGerenciComment": "",
                "ConfGerReg": "",
                "SeguridadHigieneComment": "",
                "SegPublicaComment": ""
            });
            this.getView().setModel(oModel, "SendCommentModel");
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
        onBack: function () {
            NavigationHelper.back({
                destroy: true
            });
        },
        onDonwloadHabilitacion: function () {
            let oModel = this.getView().getModel("Habilitacion"),
                oModelHabilitacion = this.getView().getModel("HabilitacionModel"),
                claseHabilitacion = oModel.getData()["Clasehab"],
                regionModel = this.getView().getModel("Regiones"),
                taskSelectionModel = this.getView().getModel("TaskSelectionJsonModel"),
                SendCommentModel = this.getView().getModel("SendCommentModel");
            PrintAndDownloadHelper.handlePrintAndDownload(claseHabilitacion, oModel, oModelHabilitacion, regionModel, taskSelectionModel,
                SendCommentModel);
        },
        LoadRegionesModel: function () {
            var Habilitacion = this.getView().getModel("Habilitacion").getData().Empresa;
            var Empresa = Habilitacion === "TRANSENER" ? "100" : "300";
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
        formatDateTime: function (date, time) {
            if (date !== undefined && time !== undefined && date !== null && time !== null) {
                var dateFormat = sap.ui.core.format.DateFormat.getDateTimeInstance({
                    pattern: "dd/MM/yyyy"
                });
                if (time) {
                    var hora = new Date(time.ms);
                    var newHora = new Date(hora.valueOf() + hora.getTimezoneOffset() * 60000);
                    var TimeFormat = sap.ui.core.format.DateFormat.getDateTimeInstance({
                        pattern: "HH:mm"
                    });
                    var newDate = FormatHelper.formatJsonDate(date);
                    return dateFormat.format(newDate) + " " + TimeFormat.format(newHora);
                }
            }
        },
        handleTaskSelection: function () {
            var sTipoHab = this.getView().getModel("Habilitacion").getProperty("/Tipohab");
            var oTaskModel = this.getView().getModel("TaskSelectionJsonModel");
            var oTaskModelData = oTaskModel.getData();
            for (var attr in oTaskModelData) {
                if (oTaskModelData[attr].code === sTipoHab)
                    oTaskModelData[attr].selected = true;
            }
            oTaskModel.refresh(true);
        },
        formatSwitch: function (checkInt) {
            if (typeof (checkInt) !== "undefined") {
                this.LoadRegionesModel();
                this.handleTaskSelection();
                if (checkInt) {
                    this.getView().byId("labelLegajo").setVisible(true);
                    this.getView().byId("inputLegajo").setVisible(true);
                }
            }
            return checkInt;
        },
        validaAjuntos: function (adjuntos) {
            if (adjuntos) {
                if (adjuntos.results.length > 0) {
                    return true;
                } else {
                    return false;
                }
            } else {
                return false;
            }
        },
        // LoadIntervenciones: function (Idhabilitacion) {
        //     if (Idhabilitacion) {
        //         this.getHabilitacion(Idhabilitacion);
        //         IntervencionesServices.loadIntervenciones(Idhabilitacion,
        //             "H0001",
        //             jQuery.proxy(this.SuccessCallBackInt, this),
        //             jQuery.proxy(this.ErrorCallBackInt, this)
        //         );
        //     }
        // },
        LoadIntervenciones: async function (Idhabilitacion) {
            if (Idhabilitacion) {
                try {
                    await this.getHabilitacion(Idhabilitacion);
                } catch (e) {
                    this.getView().getModel("HabilitacionModel").setProperty("/Busy", false);
                    return;
                }
                IntervencionesServices.loadIntervenciones(
                    Idhabilitacion,
                    "H0001",
                    jQuery.proxy(this.SuccessCallBackInt, this),
                    jQuery.proxy(this.ErrorCallBackInt, this)
                );
            }
        },
        SuccessCallBackInt: function (data) {
            var Intervenciones = data.results;
            var oModel = new sap.ui.model.json.JSONModel();
            oModel.setData({
                Intervenciones: Intervenciones
            });
            this.getView().setModel(oModel, "Intervenciones");
            this.onBindingIntervenciones();
            this.loadComments();
            var oModelHabilitacion = this.getView().getModel("HabilitacionModel");
            oModelHabilitacion.setProperty("/Busy", false);
        },
        ErrorCallBackInt: function (error) {
            this.getView().getModel("HabilitacionModel").setProperty("/Busy", false);
        },
    //    getHabilitacion: function (Idhabilitacion) {
    //         var oView = this.getView();
    //          HabilitacionServices.loadHabilitacion(Idhabilitacion, "H0001", oView);
    //     },
    getHabilitacion: function (Idhabilitacion) {
        var oView = this.getView();
        return new Promise((resolve, reject) => {
            HabilitacionServices.loadHabilitacion(Idhabilitacion, "H0001", oView, function (error) {
                if (error) {
                    reject(error); // Si hay un error, rechazamos la promesa
                } else {
                    resolve(); // Resolviendo la promesa cuando se complete la carga
                }
            });
        });
    },
        // Habilitar o no funcionalidad de adjunto por rol
        SaveAttachmentVisibility: function (rol) {
            if (rol) {
                var found = rol.find(element => element.match("hab_mto_secretaria_"));
                if (found) {
                    return true;
                } else {
                    return false;
                }
            } else {
                return false;
            }
        },
        enableOnlyIfStatusDistinctToRevocado: function (Status) {
            if (Status === 'D') {
                return false;
            } else {
                return true;
            }
        },
        onBindingIntervenciones: function () {
            var Intervenciones = this.getView().getModel("Intervenciones").getData().Intervenciones;
            var oDataModel = this.getView().getModel("HabilitacionModel").getData();
            for (var row in Intervenciones) {
                var roles = Intervenciones[row].Rol;
                if (!roles) continue;
                if (roles.includes("hab_solicitud_habilitaciones") ||roles.includes("Mantenimiento_Solicitante") ) {
                    oDataModel.Solicitante_Firma = "data:image/gif;base64," + Intervenciones[row].Firma;
                    oDataModel.Solicitante_Nombre = Intervenciones[row].Nombre;
                    oDataModel.Solicitante_Fecha = FormatHelper.formatJsonDate(Intervenciones[row].Fechaint);
                } else if (roles.includes("hab_mto_seg-hig") || roles.includes("Mantenimiento_SegHigiene")) {
                    oDataModel.SegHigiene_Firma = "data:image/gif;base64," + Intervenciones[row].Firma;
                    oDataModel.SegHigiene_Nombre = Intervenciones[row].Nombre;
                    oDataModel.SegHigiene_Fecha = FormatHelper.formatJsonDate(Intervenciones[row].Fechaint);
                } else if (roles.includes("hab_mto_seg-pub")|| roles.includes("Mantenimiento_SegPublica")) {
                    oDataModel.SegPublica_Firma = "data:image/gif;base64," + Intervenciones[row].Firma;
                    oDataModel.SegPublica_Nombre = Intervenciones[row].Nombre;
                    oDataModel.SegPublica_Fecha = FormatHelper.formatJsonDate(Intervenciones[row].Fechaint);
                } else if (roles.includes("hab_mto_ger-reg")|| roles.includes("Mantenimiento_GerRegional")) {
                    var Habilitacion = this.getView().getModel("Habilitacion").getData();
                    oDataModel.GerRegional_Firma = "data:image/gif;base64," + Intervenciones[row].Firma;
                    oDataModel.GerRegional_Nombre = Intervenciones[row].Nombre;
                    oDataModel.GerRegional_Fecha = FormatHelper.formatJsonDate(Intervenciones[row].Fechaint);
                    oDataModel.GerRegional_Fecha_vencimiento = FormatHelper.formatJsonDate(Habilitacion.Vigencia);
                } else if (roles.includes("hab_mto_capacitacion")|| roles.includes("Mantenimiento_Capacitacion")) {
                    oDataModel.Capacitacion_Firma = "data:image/gif;base64," + Intervenciones[row].Firma;
                    oDataModel.Capacitacion_Nombre = Intervenciones[row].Nombre;
                    oDataModel.Capacitacion_Fecha = FormatHelper.formatJsonDate(Intervenciones[row].Fechaint);
                } else if (roles.includes("hab_mto_secretaria")|| roles.includes("Mantenimiento_Secretaria")) {
                    //punto 1
                    if (Intervenciones[row].Legajo !== '00000000') {
                        oDataModel.Secretaria_Firma = "data:image/gif;base64," + Intervenciones[row].Firma;
                        oDataModel.Secretaria_Nombre = Intervenciones[row].Nombre;
                        oDataModel.Secretaria_Fecha = FormatHelper.formatJsonDate(Intervenciones[row].Fechaint);
                    }
                }
            }
            if (!this.getView().getModel("Habilitacion")) {
                MessageBoxHelper.showAlert("Leer datos Habilitación", "Ha ocurrido un error, intente mas tarde.");
                this.onBack();
            }
            var oModel = this.getView().getModel("HabilitacionModel");
            oModel.setProperty("/Busy", false);
            oModel.updateBindings(true);
        },
        //Habilito secciones del formulario según el rol del usuario
        onEnableRol: function (rol, section) {
            if (!rol) return false;
            if (rol.includes("hab_solicitud_habilitaciones")) {
                return section === 'SolicitanteMto';
            } else if (rol.includes("hab_mto_seg-hig")) {
                return section === 'SegHigiene';
            } else if (rol.includes("hab_mto_seg-pub")) {
                return section === 'SegPublica';
            } else if (rol.includes("hab_mto_ger-reg")) {
                return section === 'GerRegional';
            } else if (rol.includes("hab_mto_capacitacion")) {
                return section === 'cap_entrenamiento';
            }
            return false;
        },
        onEnableRol2: function (rol, Estado, habArea) {
            if (Estado === "D") { //una vez revocada no se puede cambiar el estado
                return false;
            }
            if (rol) {
                if (
                    rol.includes("hab_mto_secretaria_" + habArea) ||
                    rol.includes("hab_mto_ger-reg_" + habArea) ||
                    rol.includes("Mantenimiento_Secretaria_" + habArea) ||
                    rol.includes("Mantenimiento_GerRegional_" + habArea)
                ) {
                    return true;
                } else {
                    return false;
                }
            } else {
                return false;
            }
        },
        onChangeFile: function (oEvent) {
            if (oEvent.getParameters().files.length > 0) {
                var file = oEvent.getParameters().files[0];
                MessageBoxHelper.showConfirm("Adjuntar Archivo", "¿Desea adjuntar este archivo?",
                    jQuery.proxy(this.onPressSaveFile, this, file), jQuery.proxy(this.onPressCancelFile, this)
                );
            }
        },
        onPressSaveFile: function (file) {
            var oModelHabilitacion = this.getView().getModel("HabilitacionModel");
            oModelHabilitacion.setProperty("/Busy", true);
            var oModel = this.getView().getModel("Files");
            var reader = new FileReader();
            sap.ui.getCore().that = this;
            reader.readAsBinaryString(file);
            reader.onload = function () {
                var adjunto = {
                    "Nombre": file.name,
                    "Archivo": btoa(reader.result),
                    "Doctype": file.type,
                    "Rol": "hab_mto_secretaria",
                    "Idadjuntos": ''
                };
                oModel.getData().Files.push(adjunto);
                var that = sap.ui.getCore().that;
                that.SaveIntervencionesFile(adjunto);
                oModel.updateBindings(true);
            };
        },
        onPressCancelFile: function () {
            sap.m.MessageToast.show("Acción cancelada", {
                duration: 3000
            });
        },
        SaveIntervencionesFile: function (Adjunto) {
            var habilitacion = this.getView().getModel("Habilitacion").getData();
            this.Idhabilitacion = habilitacion.Idhabilitacion;
            var date = new Date();
            var hours = date.getHours();
            var minutes = date.getMinutes();
            var seconds = date.getSeconds();
            var time = "PT" + hours + "H" + minutes + "M" + seconds + "S";
            var data = {
                "Nombre": habilitacion.Secretaria_Nombre,
                "Idhabilitacion": habilitacion.Idhabilitacion,
                "Clasehab": "H0001",
                // "Fechacreacion": new Date(),
                "Rol": "hab_mto_secretaria",
                "Fechaint": date,
                "Horaint": time,
                "Accion": "",
                "Usuario": "",
                "Legajo": habilitacion.interno ? habilitacion.legajo : habilitacion.documento
            };
            IntervencionesServices.SaveIntervenciones(data,
                jQuery.proxy(this.successSaveFile, this, Adjunto),
                jQuery.proxy(this.errorsaveFile, this)
            );
        },
        successSaveFile: function (Adjunto, data) {
            Adjunto.Idadjuntos = data.Idadjuntos;
            AdjuntosServices.SaveAdjunto(Adjunto,
                jQuery.proxy(this.onSuccessFileCallback, this),
                jQuery.proxy(this.onErrorFileCallback, this)
            );
        },
        errorsaveFile: function () {
            MessageBox.error("Error al guardar el archivo");
        },
        onSuccessFileCallback: async function (data) {
            await this.LoadIntervenciones(this.Idhabilitacion);
            //punto 2
            sap.m.MessageToast.show('Se Adjuntó con éxito')
        },
        onErrorFileCallback: function (reject, error) {
            MessageBox.error("Error al guardar el archivo");
        },
        //Habilito opciones de cambio de estado segun el rol
        enableStatusOptionsByRolAndLicstat: function () {
            var Roles = this.getView().getModel("UserJsonModelVISTA").getData().User[0].roles;
            //var Roles = AppManagementHelper.getModel("UserJsonModelVISTA").getData().roles;
            var EstadoActual = this.getView().getModel("Habilitacion").getData().Estado;
            //se fija si dentro de los roles tiene Secretaria o Gerente Regional
            var bRolesAutorizados = Roles.some(function (elem) {
                return elem === "hab_mto_secretaria" || elem === "hab_mto_ger-reg";
            });
            if (bRolesAutorizados) {
                if (EstadoActual === "H") { //Si es habilitado
                    this.getView().getModel("StatusOptionsModel").setData({
                        Options: [{
                            key: "D",
                            text: "Revocado"
                        }, {
                            key: "S",
                            text: "Suspendido"
                        }]
                    });
                } else if (EstadoActual === "S") { //Si es suspendido
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
        //Cambiar el estado de la habilitación
        onChangeStatus: function () {
            this.enableStatusOptionsByRolAndLicstat();
            this.oDialog = new sap.m.Dialog({
                title: "Elija el estado de la habilitación",
                afterClose: [this.afterCloseDialog, this],
                buttons: [
                    new sap.m.Button({
                        text: "Cancelar",
                        press: [this.onCloseDialog, this]
                    }),
                    new sap.m.Button({
                        text: "Aceptar",
                        press: [this.onChangeStatusHab, this]
                    })
                ],
                content: [
                    new sap.m.FlexBox({
                        width: "auto",
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
        //Habilitar ingreso de motivo de cambio de estado
        changeStatusMotivoEnabled: function (Status) {
            if (Status !== null && Status !== "" && Status !== undefined) {
                return true;
            } else {
                return false;
            }
        },
        //Cerrar diálogo de cambio de estado
        onCloseDialog: function () {
            this.oDialog.close();
        },
        afterCloseDialog: function () {
            this.oDialog.destroy();
            this.oDialog = null;
        },
        //Cambiar estado de habilitación
        onChangeStatusHab: function () {
            var oDialogModel = this.oDialog.getModel("oDialogModel").getData();
            var oModel = this.getView().getModel("HabilitacionModel");
            var habilitacion = this.getView().getModel("Habilitacion").getData();
            var Empresa = habilitacion.Empresa === "TRANSENER" ? "100" : "300";
            var Roles = this.getView().getModel("UserJsonModelVISTA").getData().User[0].roles;
            const Rol = Roles.find(item =>
                item.includes("hab_mto_ger-reg") || item.includes("hab_mto_secretaria")
            );
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
                jQuery.proxy(this.errorCallbackList, this)
            );
        },
        onErrorCallbackStatus: function (data) {
            MessageBox.error("Error al cambiar el estado");
        },
        //Esto lo comento porque trae errores en las fechas de habilitación
        successCallbackList: function (data) {
            var Habilitaciones = data.results;
            // var dateFormat = sap.ui.core.format.DateFormat.getDateTimeInstance({
            //     pattern: "dd/MM/yyyy"
            // });
            // for (var row in Habilitaciones) {
            //     Habilitaciones[row].VigenciaDate = dateFormat.format(Habilitaciones[row].Vigencia);
            // }
            var viewPath = this.getView().getParent().getParent().getId();
            sap.ui.getCore().byId(viewPath + "--Main").getModel("Habilitaciones").setProperty("/Habilitaciones", Habilitaciones);
        },
        errorCallbackList: function () {
            MessageBox.error("Error al obtener las habilitaciones");
        },
        onSuccessCallbackMotivo: function () {
            var oModel = this.getView().getModel("HabilitacionModel");
            oModel.setProperty("/Busy", false);
            sap.m.MessageToast.show("Se ha cambiado el estado de la habilitación");
            this.loadMotivoCambioEstado();
        },
        onErrorCallbackMotivo: function () {
            var oModel = this.getView().getModel("HabilitacionModel");
            MessageBox.error("Error al guardar el motivo de cambio de estado");
            oModel.setProperty("/Busy", false);
        },
        //Descargo adjuntos
        handleLinkAdjuntoPress: function (oEvent) {
            var Adjunto = oEvent.getSource().getBindingContext("Intervenciones").getObject();
            var binary = atob(Adjunto.Archivo);
            FileDownloadHelper.saveBinaryFile(binary, Adjunto.Doctype, Adjunto.Nombre);
        },
        //Obtiene la lista de comentarios de cambio de estado
        loadMotivoCambioEstado: function () {
            var oModel = this.getView().getModel("HabilitacionModel");
            oModel.setProperty("/Busy", true);
            var oHabilitacion = this.getView().getModel("Habilitacion").getData();
            var Roles = this.getView().getModel("UserJsonModelVISTA").getData().User[0].roles;
            const Rol = Roles.find(item =>
                item.includes("hab_mto_ger-reg") || item.includes("hab_mto_secretaria")
            );
            var filters = {
                "Id": oHabilitacion.Idhabilitacion,
                "Empresa": oHabilitacion.Empresa === "TRANSENER" ? "100" : "300",
                "Clasehab": "H0001",
                "Rol": Rol
            };
            MotivoCambioEstadoService.getMotivo(filters,
                jQuery.proxy(this.successCallbackMotivoList, this),
                jQuery.proxy(this.errorCallbackMotivoList, this)
            );
        },
        successCallbackMotivoList: function (data) {
            var oView = this.getView();
            var oModelHab = oView.getModel("HabilitacionModel");
            oModelHab.setProperty("/Busy", false);
  
            var oMotivoModel = oView.getModel("MotivoCambioEstadoModel");

            if (oMotivoModel) {
             
                oMotivoModel.setData(data);
            } else {   // Si no existe, crear uno nuevo y asignarlo
                oMotivoModel = new sap.ui.model.json.JSONModel(data);
                oView.setModel(oMotivoModel, "MotivoCambioEstadoModel");
            }
        },

        errorCallbackMotivoList: function () {
            var oModelHab = this.getView().getModel("HabilitacionModel");
            oModelHab.setProperty("/Busy", false);
            MessageBox.error("Error al obtener la lista de comentarios de cambio de estado");
        },
        //Boton para editar los comentarios de la habilitación y guardarlos en la tab comentarios
        onSaveComment: function (oEvent) {
            //	var Roles = sap.ui.getCore().getModel("UserJsonModel").getData().User[0].roles;
            var aModelRoles = sap.ui.getCore().getModel("UserJsonModel");
            var Roles = aModelRoles.getData().groups;
            var oContexto = this.getView().getModel("Habilitacion").getData();
            var comment = "";
            var UserCurrentRol = "";
            if (Roles.includes("hab_solicitud_habilitaciones")) {
                comment = this.getView().getModel("SendCommentModel").getData().ConformidadAgenteComment;
                UserCurrentRol = "hab_solicitud_habilitaciones";
            } else if (Roles.includes("hab_mto_seg-hig")) {
                comment = this.getView().getModel("SendCommentModel").getData().SeguridadHigieneComment;
                UserCurrentRol = "hab_mto_seg-hig";
            } else if (Roles.includes("hab_mto_seg-pub")) {
                comment = this.getView().getModel("SendCommentModel").getData().SegPublicaComment;
                UserCurrentRol = "hab_mto_seg-pub";
            } else if (Roles.includes("hab_mto_ger-reg")) {
                comment = this.getView().getModel("SendCommentModel").getData().ConfGerReg;
                UserCurrentRol = "hab_mto_ger-reg";
            } else if (Roles.includes("hab_mto_capacitacion")) {
                comment = this.getView().getModel("SendCommentModel").getData().CapaYEntrenamComment;
                UserCurrentRol = "hab_mto_capacitacion";
            } else if (Roles.includes("hab_mto_secretaria")) {
                comment = this.getView().getModel("SendCommentModel").getData().SecretGerenciComment;
                UserCurrentRol = "hab_mto_secretaria";
            }
            var SaveCommentsPayload = {
                "Idhabilitacion": oContexto.Idhabilitacion,
                "Empresa": oContexto.Empresa === "TRANSENER" ? "100" : "300",
                "Rol": UserCurrentRol,
                "Comentarios": comment,
                "Clasehab": "H0001"
            };
            ComentariosHabilitacionesService.SaveComments(SaveCommentsPayload,
                jQuery.proxy(this.SuccessSaveCommentHab, this),
                jQuery.proxy(this.ErrorSaveCommentHab, this)
            );
        },

        SuccessSaveCommentHab: function () {
            this.loadComments();
            sap.m.MessageToast.show("Comentarios guardados con éxito");
        },

        ErrorSaveCommentHab: function () {
            MessageBox.error("Error al guardar comentarios");
        },
        //Llamo a los comentarios de la habilitación
        loadComments: function () {
            var oModel = this.getView().getModel("HabilitacionModel");
            oModel.setProperty("/Busy", true);
            var oHabilitacion = this.getView().getModel("Habilitacion").getData();
            var filters = {
                "id": oHabilitacion.Idhabilitacion,
                "empresa": oHabilitacion.Empresa === "TRANSENER" ? "100" : "300",
                "Clasehab": "H0001"
            };
            ComentariosHabilitacionesService.getComments(filters,
                jQuery.proxy(this.SuccessGetCommentHab, this),
                jQuery.proxy(this.ErrorGetCommentHab, this)
            );
        },
        SuccessGetCommentHab: function (data) {
            var oModelHab = this.getView().getModel("HabilitacionModel");
            var oModelComentariosTab = this.getView().getModel("ComentariosHabilitacionesModel");
            oModelComentariosTab.setData(data);
            /*var oModel = new sap.ui.model.json.JSONModel();
            oModel.setData(data);
            this.getView().setModel(oModel, "ComentariosHabilitacionesModel");*/
            //Al obtener los comentarios del servicio, se lo asigno al modelo de envio de comentarios para que muestre en el textArea los comentarios ya guardados
            var allCommentsGeted = data.results;
            var oCapaYEntrenamComment = allCommentsGeted.find(comment => {
                return comment.Rol.includes("hab_mto_capacitacion");
            });
            var oSecretGerenciComment = allCommentsGeted.find(comment => {
                return comment.Rol.includes("hab_mto_secretaria");
            });
            var oConformidadAgenteComment = allCommentsGeted.find(comment => {
                return comment.Rol.includes("hab_solicitud_habilitaciones");
            });
            var oConfGerReg = allCommentsGeted.find(comment => {
                return comment.Rol.includes("hab_mto_ger-reg");
            });
            var oSeguridadHigieneComment = allCommentsGeted.find(comment => {
                return comment.Rol.includes("hab_mto_seg-hig");
            });
            var oSegPublicaComment = allCommentsGeted.find(comment => {
                return comment.Rol.includes("hab_mto_seg-pub");
            });
            //Le seteo al modelo de enviar el comentario q ya esta guardado en el servicio para cada rol
            this.getView().getModel("SendCommentModel").getData().CapaYEntrenamComment = oCapaYEntrenamComment === undefined ? '' :
                oCapaYEntrenamComment.Comentarios;
            this.getView().getModel("SendCommentModel").getData().SecretGerenciComment = oSecretGerenciComment === undefined ? '' :
                oSecretGerenciComment.Comentarios;
            this.getView().getModel("SendCommentModel").getData().ConformidadAgenteComment = oConformidadAgenteComment === undefined ? '' :
                oConformidadAgenteComment.Comentarios;
            this.getView().getModel("SendCommentModel").getData().ConfGerReg = oConfGerReg === undefined ? '' : oConfGerReg.Comentarios;
            this.getView().getModel("SendCommentModel").getData().SeguridadHigieneComment = oSeguridadHigieneComment === undefined ? '' :
                oSeguridadHigieneComment.Comentarios;
            this.getView().getModel("SendCommentModel").getData().SegPublicaComment = oSegPublicaComment === undefined ? '' :
                oSegPublicaComment.Comentarios;
            oModelHab.setProperty("/Busy", false);
            //Refresco el modelo para que se actualicen los cuadros de comentarios
            this.getView().getModel("SendCommentModel").refresh(true);
        },
        ErrorGetCommentHab: function (data) {
            var oModelHab = this.getView().getModel("HabilitacionModel");
            oModelHab.setProperty("/Busy", false);
            MessageBox.error("Error al obtener comentarios");
        },
        RolFormatter: function (rol) {
            if (rol.includes("hab_solicitud_habilitaciones")) {
                return "Conformidad del Agente";
            } else if (rol.includes("hab_mto_capacitacion")) {
                return "Capacitacion";
            } else if (rol.includes("hab_mto_seg-hig")) {
                return "Seguridad e Higiene";
            } else if (rol.includes("hab_mto_seg-pub")) {
                return "Seguridad Pública";
            } else if (rol.includes("hab_mto_secretaria")) {
                return "Secretaría";
            } else if (rol.includes("hab_mto_ger-reg")) {
                return "Gerente Regional";
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