sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/m/MessageBox",
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
    "transener/GestionHabilitaciones/services/EstacionesServices",
    "transener/GestionHabilitaciones/services/TareasTCTService",
    "transener/GestionHabilitaciones/services/GestionTareasTCTService",
    "transener/GestionHabilitaciones/services/TipoHabilitacionServices",
    "transener/GestionHabilitaciones/services/UserService",
    "transener/GestionHabilitaciones/services/PuestosServices",
    "transener/GestionHabilitaciones/services/FirmasUsuariosServices",
    "transener/GestionHabilitaciones/services/AdjuntosServices",
    "transener/GestionHabilitaciones/services/MotivoCambioEstadoService",
    "transener/GestionHabilitaciones/services/PersonalInternoServices"
], function (Controller, MessageBox, NavigationHelper, FormatHelper, FileDownloadHelper, MessageBoxHelper,
    PrintAndDownloadHelper, IntervencionesServices, HabilitacionServices, RegionServices, HabTecnicasService,
    EstacionesServices, TareasTCTService, GestionTareasTCTService, TipoHabilitacionServices,
    UserService, PuestosServices, FirmasUsuariosServices, AdjuntosServices, MotivoCambioEstadoService, PersonalInternoServices) {
    "use strict";
    return Controller.extend("transener.GestionHabilitaciones.controller.detailHabTCT", {
        getBaseURL: function () {

            debugger;

            var appId = this.getOwnerComponent().getManifestEntry("/sap.app/id");

            //var appId = this.getManifestEntry("/sap.app/id");
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

            var cUrl = this.getBaseURL();
            this.getUser();
            this.loadHabilitacionModel();
            this.loadGradoAptitud();
            this.loadStatusOptionsModel();
            this.createFilesModel();
            this.onLoadTareasModel();
            this.loadPuestos();
            this.loadFirma();
        },
        onTabSelect: function (oEvent) {
            let sSelectedKey = oEvent.getSource().getSelectedKey();
            if (sSelectedKey === "Estado") {
                this.loadMotivoCambioEstado();
            }
        },
        armarDatos: function (datos) {

            debugger;

            var aGroupsTemporal = datos[0].groups;

            var aGroups = aGroupsTemporal.map(function (fila) {
                return fila.display;
            });

            var aUserData = {
                firstname: datos[0].displayName,
                lastname: datos[0].displayName,
                email: datos[0].emails[0].value,
                name: datos[0].emails[0].value,
                displayName: datos[0].displayName,
                groups: aGroups
            };
            return aUserData;
        },

        getUser: function (successCallback, errorCallback) {
            /*	
            var path = this._servicePathPrefix + this._servicePath + "?multiValuesAsArrays=true";
            jQuery.ajax(path, {
                method: "GET",
                success: successCallback,
                error: errorCallback
            });
            */

            const url = sap.ui.getCore().getModel("appCurrentInfo").appUrl + "/user-api/currentUser";

            var oModel = new sap.ui.model.json.JSONModel();
            var mock = {
                firstname: "Dummy",
                lastname: "User",
                email: "dummy.user@com",
                name: "dummy.user@com",
                displayName: "Dummy User (dummy.user@com)",
                groups: ["Mantenimiento_GerRegional",
                    "Examinadores_PT15",
                    "Selector_evaluadores_PT15",
                    "seguridadH_PT15",
                    "Rep_Direccion_PT15",
                    "MedicinaLaboral_PT15",
                    "Gestion_Calidad_PT152",
                    "Direccion_TecnicaPT15",
                    "Auditor_Externo",
                    "Gestion_habilitaciones",
                    "Solicitante_PT15",
                    "Mantenimiento_Secretaria",
                    "Director_Tecnico",
                    "Ger_Operaciones",
                    "Aprobacion_Habilitaciones"
                ]
            };

            oModel.loadData(url);
            var that = this;
            oModel.dataLoaded()
                .then(() => {
                    //check if data has been loaded
                    //for local testing, set mock data
                    if (oModel.getData().email) {

                        var cUrl = sap.ui.getCore().getModel("appCurrentInfo").appUrl + '/IAS/scim/Users?filter=emails.value eq "' + oModel.getData().email + '"'

                        //Llamar a API del IAS
                        $.ajax({

                            type: "GET",
                            contentType: "application/scim+json",
                            url: cUrl,
                            xhrFields: { withCredentials: false },
                            dataType: "json",
                            async: false,

                            success: function (data, textStatus, jqXHR) {

                                //window.alert("success");
                                console.log("It works");
                                var oModelUser = new sap.ui.model.json.JSONModel();
                                oModelUser.setData(data.Resources);

                                debugger;
                                var aDatosUsuario = that.armarDatos(data.Resources);

                                oModel.setData(aDatosUsuario);
                                //								oView.getView().setModel(oModel, "users");
                                sap.ui.getCore().setModel(oModel, "UserJsonModel");
                            },
                            error: function (data, xhr, textStatus) {
                                console.log(data);
                                console.log(xhr);
                                console.log(textStatus);
                                debugger;
                                window.alert("error");
                            }
                        });
                        // Fin llamar a API del IAS
                    }
                    else {
                        oModel.setData(mock);
                    }
                    // this.setModel(oModel, "userInfo");  
                })
                .catch(() => {
                    oModel.setData(mock);
                });
        },

        loadHabilitacionModel: function () {
            var oModel = new sap.ui.model.json.JSONModel();
            //oModel.setProperty("/Busy", true);
            this.getView().setModel(oModel, "HabilitacionModel");
        },
        loadGradoAptitud: function () {
            var gradoAptitud = [{
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
                "Codigo": "SEM",
                "Grado": "Sin examen Medico"
            }];
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
        createFilesModel: function () {
            var oModelFile = new sap.ui.model.json.JSONModel();
            oModelFile.setData({
                Files: []
            });
            this.getView().setModel(oModelFile, "Files");
        },
        onLoadTareasModel: function () {
            TareasTCTService.LoadTareas(
                jQuery.proxy(this.onSuccessCallbackTareas, this),
                jQuery.proxy(this.onErrorCallbackTareas, this)
            );
        },
        onSuccessCallbackTareas: function (data) {
            var TareasModel = data.results.sort((a, b) => a.Codigo - b.Codigo);
            var oModel = new sap.ui.model.json.JSONModel();
            oModel.setData({
                TareasModel: TareasModel
            });
            this.getView().setModel(oModel, "TareasModel");
        },
        onErrorCallbackTareas: function () {
            MessageBox.error("Error al obtener las tareas");
        },
        loadPuestos: function () {
            PuestosServices.LoadPuestos(
                jQuery.proxy(this.onSuccessPuestos, this),
                jQuery.proxy(this.onErrorPuestos, this)
            );
        },
        onSuccessPuestos: function (data) {
            var PuestosModel = data.results;
            var oModel = new sap.ui.model.json.JSONModel();
            oModel.setData({
                PuestosModel: PuestosModel
            });
            this.getView().setModel(oModel, "PuestosModel");
        },
        onErrorPuestos: function () {
            MessageBox.error("Error al cargar los puestos");
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
        onErrorFirmaCallback: function () {
            MessageBox.error("No se pudo cargar la firma");
        },
        loadTipoHab: function () {
            var that = this;
            var Habilitacion = this.getView().getModel("Habilitacion").getData().Empresa;
            var Empresa = Habilitacion === "TRANSENER" ? "100" : "300";
            TipoHabilitacionServices.loadTipoHab(
                function (data) {
                    var filtered = data.results.filter(function (row) {
                        return row.Tipohab[0] === "T";
                    });
                    var model = new sap.ui.model.json.JSONModel({
                        TipoHab: filtered
                    });
                    that.getView().setModel(model, "TipoHab");
                },
                jQuery.proxy(that.onErrorTipoHab, that), [
                new sap.ui.model.Filter({
                    path: "Empresa",
                    operator: sap.ui.model.FilterOperator.EQ,
                    value1: Empresa
                })
            ]
            );
        },
        _onLoadEstaciones: function () {
            var Habilitacion = this.getView().getModel("Habilitacion").getData().Empresa;
            var Empresa = Habilitacion === "TRANSENER" ? "100" : "300";
            EstacionesServices.LoadEstaciones(Empresa,
                jQuery.proxy(this.onSuccessEstaciones, this),
                jQuery.proxy(this.onErrorEstaciones, this)
            );
        },
        onSuccessEstaciones: function (data) {
            var EstacionModel = data.results;
            var oModel = new sap.ui.model.json.JSONModel();
            oModel.setSizeLimit(99999);
            oModel.setData({
                EstacionModel: EstacionModel
            });
            this.getView().setModel(oModel, "EstacionModel");
        },
        onErrorEstaciones: function () {
            MessageBox.error("Error al cargar Estaciones y/o Bases");
        },
        /*LoadTipoHabModel: function (clase, tension) {
            var filters = [];
            filters.push(new sap.ui.model.Filter({
                path: "Clase",
                operator: sap.ui.model.FilterOperator.EQ,
                value1: clase
            }));
            filters.push(new sap.ui.model.Filter({
                path: "Nivtenini",
                operator: sap.ui.model.FilterOperator.EQ,
                value1: tension
            }));
            TipoHabilitacionServices.LoadTipoHabilitaciones(filters,
                jQuery.proxy(this.onSuccessTipoHab, this),
                jQuery.proxy(this.onErrorTipoHab, this)
            );
        },*/
        /*onSuccessTipoHab: function (data) {
            var TipoHabilitaciones = data.results;
            var oModel = new sap.ui.model.json.JSONModel();
            TipoHabilitaciones.map(function (el, index) {
                el.index = "" + index;
            });
            oModel.setData({
                TipoHabilitaciones: TipoHabilitaciones
            });
            this.getView().setModel(oModel, "TipoHabilitaciones");
        },*/
        LoadIntervenciones: function (Idhabilitacion) {
            //var oModel = this.getView().getModel("HabilitacionModel");
            //oModel.setProperty("/Busy", true);
            sap.ui.core.BusyIndicator.show();
            if (Idhabilitacion) {
                this.getHabilitacion(Idhabilitacion);
                IntervencionesServices.loadIntervenciones(Idhabilitacion,
                    "H0002",
                    jQuery.proxy(this.SuccessCallBackInt, this),
                    jQuery.proxy(this.ErrorCallBackInt, this)
                );
            }
        },
        SuccessCallBackInt: function (data) {
            //var oModel = this.getView().getModel("HabilitacionModel");
            //oModel.setProperty("/Busy", true);
            var Intervenciones = data.results;
            var oModel = new sap.ui.model.json.JSONModel();
            oModel.setData({
                Intervenciones: Intervenciones
            });
            this.getView().setModel(oModel, "Intervenciones");
            this.onBindingIntervenciones();
        },
        ErrorCallBackInt: function (error) {
            MessageBox.error("Error al cargar las intervenciones");
        },
        onBindingIntervenciones: function () {
            var Intervenciones = this.getView().getModel("Intervenciones").getData().Intervenciones;
            var oDataModel = this.getView().getModel("HabilitacionModel").getData();
            var oModel = this.getView().getModel("HabilitacionModel");
            var that = this;
            if (!this.getView().getModel("Habilitacion")) {
                MessageBoxHelper.showAlert("Leer datos de habilitación", "Ha ocurrido un error, intente nuevamente.");
                sap.ui.core.BusyIndicator.hide();
                return;
                //No funciona esto en PRD
                //this.onBack();
            } else {
                var sModel = this.getView().getModel("Habilitacion").getData();
            }
            //Obtengo fecha nacimiento
            var getFechaNac = new Promise(function (resolve, reject) {
                var oLegajo = that.getView().getModel("Habilitacion").getData().Legajo;
                PersonalInternoServices.LoadSearch(oLegajo, resolve, reject);
            });
            getFechaNac.then(function (data) {
                if (data.results.length !== 0) {
                    var oFechaNac = data.results[0].FechaNac;
                    that.getView().getModel("Habilitacion").setProperty("/FechaNac", oFechaNac);
                } else {
                    sap.m.MessageToast.show("No se encuentra la fecha de nacimiento");
                }
            });
            //Esto estaba dando errores en PRD - 4/8/2022
            /*setTimeout(function () {
                var oHabilitacion = that.getView().getModel("Habilitacion").getData();
                oDataModel.Lote = oHabilitacion.Lote;
                //Obtengo fecha nacimiento
                that.getFechaNac();
                oModel.refresh(true);
            }, 1000);*/
            for (var row in Intervenciones) {
                var roles = Intervenciones[row].Rol;
                if (roles.includes("HAB_TCT_HABILITADO")) {
                    oDataModel.Habilitado_Firma = "data:image/gif;base64," + Intervenciones[row].Firma;
                    oDataModel.Habilitado_Nombre = Intervenciones[row].Nombre;
                    oDataModel.Habilitado_Fecha = FormatHelper.formatJsonDate(Intervenciones[row].Fechaint);
                } else if (roles.includes("HAB_TCT_SUPERVISOR")) {
                    oDataModel.Capacitacion_Firma = "data:image/gif;base64," + Intervenciones[row].Firma;
                    oDataModel.Capacitacion_Nombre = Intervenciones[row].Nombre;
                    if (sModel.Hab_CETCT_nav.length > 0) {
                        oDataModel.FechaCapacitacion = FormatHelper.formatJsonDate(sModel.Hab_CETCT_nav[0].FechaCapacitacion);
                        oDataModel.Vencimiento = FormatHelper.formatJsonDate(sModel.Hab_CETCT_nav[0].Vencimiento);
                        //oDataModel.TipoHab = sModel.Hab_CETCT_nav[0].Tipohab;
                        //oDataModel.Tension = sModel.Hab_CETCT_nav[0].Tension;
                        //oDataModel.Clase = sModel.Hab_CETCT_nav[0].Clase;
                    }
                    //Esto ya no se usa, lo comento 3/8/2022
                    //this.LoadTipoHabModel(oDataModel.Clase, oDataModel.Tension);
                } else if (roles.includes("HAB_TCT_MED-LABORAL")) {
                    oDataModel.Medico_Firma = "data:image/gif;base64," + Intervenciones[row].Firma;
                    oDataModel.Medico_Observacion = Intervenciones[row].Datosadicionales;
                    if (sModel.Hab_apmedico_nav.length > 0) {
                        oDataModel.Medico_Fecha = FormatHelper.formatJsonDate(sModel.Hab_apmedico_nav[0].Vigencia);
                        oDataModel.Grado_aptitud = sModel.Hab_apmedico_nav[0].Gradoap;
                    }
                } else if (roles.includes("HAB_TCT_SEG-HIG")) {
                    oDataModel.Seg_higiene_Firma = "data:image/gif;base64," + Intervenciones[row].Firma;
                    oDataModel.Seg_higiene_Observacion = Intervenciones[row].Datosadicionales;
                    //ISSUE 263 - TcT Seguridad e Higiene, Fecha de vencimiento.
                    //oDataModel.Seg_higiene_Fecha = FormatHelper.formatJsonDate(Intervenciones[row].Fechacreacion);
                    if (sModel.Hab_SeguridadHigiene_nav.length > 0) {
                        oDataModel.Seg_higiene_Fecha = FormatHelper.formatJsonDate(sModel.Hab_SeguridadHigiene_nav[0].Vigencia);
                    }
                } else if (roles.includes("HAB_TCT_GER-REG")) {
                    oDataModel.Gerente_Firma = "data:image/gif;base64," + Intervenciones[row].Firma;
                    oDataModel.Gerente_Fecha = FormatHelper.formatJsonDate(sModel.Vigencia);
                    oDataModel.Gerente_Nombre = Intervenciones[row].Nombre;
                }
            }
            oDataModel.Lote = sModel.Lote;
            //ISSUE 263 - TcT Seguridad e Higiene, Fecha de vencimiento.
            if (sModel.Lote === "ON" || sModel.Lote === "JN") {
                this.getView().byId("datePickerLineas").setVisible(false);
            } else if (sModel.Lote === "HC") {
                this.getView().byId("datePickerEstTrans").setVisible(false);
            }
            oModel.updateBindings(true);
            oModel.refresh(true);
            sap.ui.core.BusyIndicator.hide();
            //oModel.setProperty("/Busy", false);
        },
        getHabilitacion: function (Idhabilitacion) {
            var oView = this.getView();
            var that = this;
            HabilitacionServices.loadHabilitacion(Idhabilitacion, "H0002", oView, function () {
                that._onLoadEstaciones();
                that.onLoadTareasAssing();
                that.loadTipoHab.bind(that)();
            });
        },
        formatPuesto: function (Puesto) {
            var data = sap.ui.getCore().getModel("PuestosModel").getData().PuestosModel;
            for (var i = 0; i < data.length; i++) {
                if (data[i].Tipo === Puesto) {
                    return data[i].Descripcion;
                }
            }
        },
        formatBase: function (Base) {
            var Empresa = this.getView().getModel("Habilitacion") ? this.getView().getModel("Habilitacion").getData().Empresa : '';
            if (Empresa === 'TRANSENER') {
                var Bases = sap.ui.getCore().getModel("EstacionTransenerModel") ? sap.ui.getCore().getModel("EstacionTransenerModel").getData().Estaciones :
                    '';
            } else { //TRANSBA
                var Bases = sap.ui.getCore().getModel("EstacionTransbaModel") ? sap.ui.getCore().getModel("EstacionTransbaModel").getData().Estaciones :
                    '';
            }
            //Fix para que no rompa cuando no trae datos el servicio de las bases (EstacionesSet) 12/10/21
            if (Bases.length !== 0) {
                var aSelectedBase = Bases.filter((item) => {
                    return item.Codigo === Base;
                });
                var oSelectedBase = aSelectedBase[0];
                return oSelectedBase.Codigo + " - " + oSelectedBase.Descripcion;
            } else {
                return Base;
            }
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
        formatterClase: function (rol, estado) {
            if (rol.includes("HAB_TCT_SUPERVISOR") && estado === 'H') { //Si es supervisor_TCT y el estado es "Habilitado"
                return true;
            } else {
                return false;
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
        },
        claseHabilitacionFormatter: function (intervencion, habilitacion) {
            if (intervencion.Lote) {
                if (intervencion.Lote === "HC") {
                    return "HC";
                }
                if (intervencion.Lote === "TEJ") {
                    return "TEJ";
                }
                if (intervencion.Lote === "TEO") {
                    return "TEO";
                }
                if (intervencion.Lote === "TEA") {
                    return "TEA";
                }
                if (intervencion.Lote === "A") {
                    return "A";
                }
                if (intervencion.Lote === "O") {
                    return "O";
                }
                if (intervencion.Lote === "J") {
                    return "J";
                }
                if (intervencion.Lote === "ON") {
                    return "ON";
                }
                if (intervencion.Lote === "JN") {
                    return "JN";
                }
                var count = 0;
                var found = "";
                if (habilitacion.Mto33) {
                    count++;
                    found = "33";
                }
                if (habilitacion.Mto66) {
                    count++;
                    found = "66";
                }
                if (habilitacion.Mto132) {
                    count++;
                    found = "132";
                }
                if (habilitacion.Mto220) {
                    count++;
                    found = "220";
                }
                if (habilitacion.Mto13) {
                    count++;
                    found = "330";
                }
                if (habilitacion.Mto500) {
                    count++;
                    found = "500";
                }
                if (count !== 1) return "";
                return intervencion.Clase + " - " + found;
            }
            return "";
        },
        //Reemplacé esto por una promise dentro de onBindingIntervenciones
        /*getFechaNac: function () {
            var oLegajo = this.getView().getModel("Habilitacion").getData().Legajo;
            PersonalInternoServices.LoadSearch(oLegajo,
                jQuery.proxy(this.SuccessFechaNac, this),
                jQuery.proxy(this.ErrorFechaNac, this)
            );
        },
        SuccessFechaNac: function (data) {
            var oFechaNac = data.results[0].FechaNac;
            if (oFechaNac !== undefined && oFechaNac !== null) {
                this.getView().getModel("Habilitacion").setProperty("/FechaNac", oFechaNac);
            }
        },
        ErrorFechaNac: function () {
            sap.m.MessageToast.show("Error al cargar la fecha de nacimiento");
        },*/
        enableStatusOptionsByRolAndLicstat: function () {
            var Roles = this.getView().getModel("UserJsonModelVISTA").getData().User[0].roles;
            var EstadoActual = this.getView().getModel("Habilitacion").getData().Estado;
            //se fija si dentro de los roles tiene Supervisor o Gerente Regional
            var bRolEsDirectorTecnico = Roles.some(function (elem) {
                return elem === "HAB_TCT_SUPERVISOR" || elem === "HAB_TCT_GER-REG";
            });
            if (bRolEsDirectorTecnico) {
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
        onCloseDialog: function () {
            this.oDialog.close();
        },
        afterCloseDialog: function () {
            this.oDialog.destroy();
            this.oDialog = null;
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
            var Lote = oModel.getData().Lote ? oModel.getData().Lote : habilitacion.Lote;
            var Empresa = habilitacion.Empresa === "TRANSENER" ? "100" : "300";
            var Roles = this.getView().getModel("UserJsonModelVISTA").getData().User[0].roles;
            var Rol = Roles.find(element => element === "HAB_TCT_SUPERVISOR" || element === "HAB_TCT_GER-REG");
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
                Lote: Lote,
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
        onErrorCallbackStatus: function () {
            MessageBox.error("Error al cambiar el estado de la habilitación");
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
            MessageBox.error("Error al obtener la lista de habilitaciones");
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
            var Rol = Roles.find(element => element === "HAB_TCT_SUPERVISOR" || element === "HAB_TCT_GER-REG");
            var filters = {
                "Id": oHabilitacion.Idhabilitacion,
                "Empresa": oHabilitacion.Empresa === "TRANSENER" ? "100" : "300",
                "Clasehab": "H0002",
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
                    rol.includes("HAB_TCT_GER-REG") ||
                    rol.includes("HAB_TCT_SUPERVISOR")
                ) {
                    return true;
                } else {
                    return false;
                }
            } else {
                return false;
            }
        },
        handleLinkAdjuntoPress: function (oEvent) {
            var Adjunto = oEvent.getSource().getBindingContext("Intervenciones").getObject();
            var binary = atob(Adjunto.Archivo);
            FileDownloadHelper.saveBinaryFile(binary, Adjunto.Doctype, Adjunto.Nombre);
        },
        validaAjuntos: function (adjuntos) {
            var archivos = adjuntos.results;
            for (var row in archivos) {
                if (archivos[row].Nombre === "imagen_perfil.jpeg") {
                    this.getView().getModel("HabilitacionModel").getData().ImgPerfil = "data:image/gif;base64," + archivos[row].Archivo;
                }
            }
            if (adjuntos.results.length > 0) {
                if (adjuntos.results[0].Complementario) {
                    return false;
                } else {
                    return true;
                }
            } else {
                return false;
            }
        },
        onSaveTarea: function () {
            var habilitacionData = this.getView().getModel("HabilitacionModel").getData();
            var Tarea = habilitacionData.Tarea;
            var Clase = habilitacionData.Lote ? habilitacionData.Lote : "";
            var TipoHabilitacion = Clase + "-" + habilitacionData.Tension;
            var legajo = this.getView().getModel("Habilitacion").getData().Legajo;
            var puesto = this.getView().getModel("Habilitacion").getData().Puesto;
            if (Tarea === "" || typeof (Tarea) === "undefined") {
                MessageBoxHelper.showAlert("AgregarTarea", "ErrorTarea");
                return false;
            }
            var oModel = this.getView().getModel("HabilitacionModel");
            oModel.setProperty("/Busy", true);
            var data = {
                "Legajo": legajo,
                "Tarea": Tarea,
                "Puesto": puesto,
                "TipoHabilitacion": TipoHabilitacion,
                "Tension": habilitacionData.Tension
            };
            GestionTareasTCTService.SaveAssignTarea(data,
                jQuery.proxy(this.successSaveCallbackTareasAssing, this),
                jQuery.proxy(this.errorSaveCallbackTareasAssing, this)
            );
        },
        addTaskEnabled: function (Lote, Tarea, Tension) {
            if (Lote !== "" && Lote !== null && Tarea !== "" && Tarea !== null && Tension !== "" && Tension !== null) {
                return true;
            } else {
                return false;
            }
        },
        onLoadTareasAssing: function () {
            var habilitacion = this.getView().getModel("Habilitacion").getData();
            var legajo = habilitacion.Legajo;
            var puesto = habilitacion.Puesto;
            var TipoHabilitacion = habilitacion.Lote ? habilitacion.Lote : "";
            GestionTareasTCTService.LoadTareasAssing(legajo, puesto, TipoHabilitacion,
                jQuery.proxy(this.successCallbackTareasAssing, this),
                jQuery.proxy(this.errorCallbackTareasAssing, this)
            );
        },
        successCallbackTareasAssing: function (data) {
            var res = data.results;
            var obj = {
                Tareas500: [],
                Tareas330: [],
                Tareas220: [],
                Tareas132: [],
                Tareas66: [],
                Tareas33: [],
                otrasTareas: []
            };
            res.forEach(function (tarea) {
                if (obj["Tareas" + tarea.Tension]) {
                    obj["Tareas" + tarea.Tension].push(tarea);
                } else {
                    obj.otrasTareas.push(tarea);
                }
            });
            var oModel = new sap.ui.model.json.JSONModel();
            oModel.setData(obj);
            this.getView().setModel(oModel, "TareasAssingModel");
            var Model = this.getView().getModel("HabilitacionModel");
            Model.setProperty("/Busy", false);
        },
        errorCallbackTareasAssing: function () {
            MessageBox.error("Error al asignar las tareas");
        },
        successSaveCallbackTareasAssing: function () {
            this.onLoadTareasAssing();
        },
        errorSaveCallbackTareasAssing: function () {
            MessageBoxHelper.showAlert("AgregarTarea", "ErrorSave");
        },
        getTareaDescription: function (id) {
            var TareasModel = this.getView().getModel("TareasModel").getData().TareasModel;
            for (var row in TareasModel) {
                if (TareasModel[row].Codigo === id) {
                    return TareasModel[row].Descripcion;
                }
            }
        },
        onDeleteTarea: function (oEvent) {
            var tarea = oEvent.getSource().getBindingContext("TareasAssingModel").getObject();
            var oModel = this.getView().getModel("HabilitacionModel");
            oModel.setProperty("/Busy", true);
            GestionTareasTCTService.removeTarea(tarea,
                jQuery.proxy(this.successDeleteTarea, this),
                jQuery.proxy(this.errorDeleteTarea, this)
            );
        },
        successDeleteTarea: function () {
            this.onLoadTareasAssing();
        },
        errorDeleteTarea: function () {
            MessageBox.error("Error al borrar la tarea");
        },
        onEnableRol2: function (rol) {
            if (rol) {
                if (
                    rol.includes("Director_Tecnico") ||
                    rol.includes("HAB_TCT_GER-REG") ||
                    rol.includes("HAB_TCT_SUPERVISOR")
                ) {
                    return true;
                } else {
                    return false;
                }
            } else {
                return false;
            }
        },
        onChangeTension: function () {
            var oModel = this.getView().getModel("HabilitacionModel");
            var habilitacion = this.getView().getModel("Habilitacion").getData();
            var data = {
                Apellido: habilitacion.Apellido,
                Area: habilitacion.Area,
                Base: habilitacion.Base,
                Clasehab: habilitacion.Clasehab,
                Documento: habilitacion.Documento,
                Empresa: habilitacion.Empresa,
                Empresaext: habilitacion.Empresaext,
                Estado: habilitacion.Estado,
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
            oModel.setProperty("/Busy", true);
            HabilitacionServices.saveHabilitacion(data,
                jQuery.proxy(this.onSuccessCallbackTension, this),
                jQuery.proxy(this.onErrorCallbackTension, this)
            );
        },
        onSuccessCallbackTension: function () {
            var oModel = this.getView().getModel("HabilitacionModel");
            oModel.setProperty("/Busy", false);
            MessageBox.success("Los valores de tensión han sido actualizados.");
        },
        onErrorCallbackTension: function () {
            var oModel = this.getView().getModel("HabilitacionModel");
            oModel.setProperty("/Busy", false);
            MessageBox.error("Ha ocurrido un error al cambiar los valores de tensión.");
        },
        onChangeClase: function () {
            var oModel = this.getView().getModel("HabilitacionModel");
            var pristine = this.getView().getModel("PristineModel").getData();
            var data = {
                Apellido: pristine.Apellido,
                Area: pristine.Area,
                Base: pristine.Base,
                Clasehab: pristine.Clasehab,
                Documento: pristine.Documento,
                Empresa: pristine.Empresa,
                Empresaext: pristine.Empresaext,
                Estado: pristine.Estado,
                Idhabilitacion: pristine.Idhabilitacion,
                Interno: pristine.Interno,
                Legajo: pristine.Legajo,
                Lote: oModel.getData().Lote,
                Mto13: pristine.Mto13,
                Mto33: pristine.Mto33,
                Mto66: pristine.Mto66,
                Mto132: pristine.Mto132,
                Mto220: pristine.Mto220,
                Mto500: pristine.Mto500,
                Nombre: pristine.Nombre,
                Puesto: pristine.Puesto,
                Tipodoc: pristine.Tipodoc,
                Tipohab: pristine.Tipohab,
                Vigencia: pristine.Vigencia
            };
            oModel.setProperty("/Busy", true);
            HabilitacionServices.saveHabilitacion(data,
                jQuery.proxy(this.onSuccessCallbackClase, this),
                jQuery.proxy(this.onErrorCallbackClase, this)
            );
        },
        onSuccessCallbackClase: function () {
            var oModel = this.getView().getModel("HabilitacionModel");
            oModel.setProperty("/Busy", false);
            MessageBox.success("El valor de la clase ha sido actualizado.");
        },
        onErrorCallbackClase: function () {
            var oModel = this.getView().getModel("HabilitacionModel");
            oModel.setProperty("/Busy", false);
            MessageBox.error("Hubo un error al actualizar el valor de la clase.");
        },
        onChangePuestoYBase: function () {
            var oModel = this.getView().getModel("HabilitacionModel");
            var pristine = this.getView().getModel("PristineModel").getData();
            var habilitacion = this.getView().getModel("Habilitacion").getData();
            var data = {
                Apellido: pristine.Apellido,
                Area: pristine.Area,
                Base: habilitacion.Base,
                Clasehab: pristine.Clasehab,
                Documento: pristine.Documento,
                Empresa: pristine.Empresa,
                Empresaext: pristine.Empresaext,
                Estado: pristine.Estado,
                Idhabilitacion: pristine.Idhabilitacion,
                Interno: pristine.Interno,
                Legajo: pristine.Legajo,
                Lote: pristine.Lote,
                Mto13: pristine.Mto13,
                Mto33: pristine.Mto33,
                Mto66: pristine.Mto66,
                Mto132: pristine.Mto132,
                Mto220: pristine.Mto220,
                Mto500: pristine.Mto500,
                Nombre: pristine.Nombre,
                Puesto: habilitacion.Puesto,
                Tipodoc: pristine.Tipodoc,
                Tipohab: pristine.Tipohab,
                Vigencia: pristine.Vigencia
            };
            oModel.setProperty("/Busy", true);
            HabilitacionServices.saveHabilitacion(data,
                jQuery.proxy(this.onSuccessCallbackPuestoBase, this),
                jQuery.proxy(this.onErrorCallbackPuestoBase, this)
            );
        },
        onSuccessCallbackPuestoBase: function () {
            var oModel = this.getView().getModel("HabilitacionModel");
            oModel.setProperty("/Busy", false);
            MessageBox.success("El valor del puesto/base ha sido actualizado.");
        },
        onErrorCallbackPuestoBase: function () {
            var oModel = this.getView().getModel("HabilitacionModel");
            oModel.setProperty("/Busy", false);
            MessageBox.error("Ha ocurrido un error al actualizar el valor del puesto/base.");
        },
        selectClaseCapacitacion: function () {
            var habilitacion = this.getView().getModel("HabilitacionModel").getData();
            if (habilitacion.Clase === "HC" || habilitacion.Clase === "TEJ" || habilitacion.Clase === "TEO" || habilitacion.Clase === "TEA") {
                //Oculto la tabla de tensiones
                this.getView().byId("tensionTable").setVisible(false);
            } else {
                this.getView().byId("tensionTable").setVisible(true);
            }
        },
        onEnablePuestoYBase: function (rol, Estado) {
            if (Estado === "D") { //una vez revocada no se puede cambiar el estado
                return false;
            }
            if (rol) {
                if (
                    rol.includes("HAB_TCT_SUPERVISOR")
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
        onSaveAttachment: function () {
            var FirmaUser = this.getView().getModel("UserData").getData().Firma;
            var date = new Date();
            var hours = date.getHours();
            var minutes = date.getMinutes();
            var seconds = date.getSeconds();
            var time = "PT" + hours + "H" + minutes + "M" + seconds + "S";
            var oHab = this.getView().getModel("Habilitacion").getData();
            var data = {
                "Accion": "",
                "Clasehab": "H0002",
                "Fechacreacion": new Date(),
                "Fechaint": date,
                "Firma": FirmaUser,
                "Horaint": time,
                "Idhabilitacion": oHab.Idhabilitacion,
                "Legajo": oHab.Interno ? oHab.Legajo : oHab.Documento,
                "Nombre": "",
                "Rol": "HAB_TCT_SUPERVISOR",
                "Usuario": ""
            };
            IntervencionesServices.SaveIntervenciones(data,
                jQuery.proxy(this.successIntCallback, this),
                jQuery.proxy(this.errorIntCallback, this)
            );
        },
        successIntCallback: function (data) {
            var Idadjuntos = data.Idadjuntos;
            this.onSaveFile(Idadjuntos);
        },
        errorIntCallback: function () {
            var oModel = this.getModel("HabilitacionModel");
            oModel.setProperty("/Busy", false);
            MessageBoxHelper.showAlert("Aprobar Habilitación", "Ha ocurrido un error, intente mas tarde.");
        },
        onSaveFile: function (Idadjuntos) {
            var Files = this.getView().getModel("Files").getData().Files;
            var that = this;
            if (Files.length > 0) {
                $.each(Files, function (row) {
                    var oFileDate = {
                        "Nombre": Files[row].name,
                        "Archivo": Files[row].binary,
                        "Doctype": Files[row].type,
                        "Rol": "HAB_TCT_SUPERVISOR",
                        "Idadjuntos": Idadjuntos,
                        "Complementario": true
                    };
                    AdjuntosServices.SaveAdjunto(oFileDate,
                        jQuery.proxy(that.successSaveAdjunto, that),
                        jQuery.proxy(that.errorSaveAdjunto, that)
                    );
                });
            }
        },
        successSaveAdjunto: function (data) {
            MessageBoxHelper.showAlert("Exito!", "Se adjuntó el archivo correctamente.");
            this.refreshIntervencionesModel();
        },
        errorSaveAdjunto: function (error) {
            MessageBoxHelper.showAlert("Error!", "Hubo un error al adjuntar archivos.");
        },
        refreshIntervencionesModel: function () {
            var Idhabilitacion = this.getView().getModel("Habilitacion").getData().Idhabilitacion;
            IntervencionesServices.loadIntervenciones(Idhabilitacion, "H0002",
                jQuery.proxy(this.SuccessRefreshIntervencionesModel, this),
                jQuery.proxy(this.ErrorRefreshIntervencionesModel, this)
            );
        },
        SuccessRefreshIntervencionesModel: function (data) {
            this.getView().getModel("Intervenciones").getData().Intervenciones = data.results;
            this.getView().getModel("Intervenciones").refresh(true);
        },
        ErrorRefreshIntervencionesModel: function (error) {
            MessageBox.error("Error al volver a cargar las intervenciones para refrescar el modelo");
        },
        _onDonwloadHabilitacion: function () {
            var oModelHabilitacion = this.getView().getModel("Habilitacion").getData(),
                claseHabilitacion = oModelHabilitacion.Clasehab,
                Roles = this.getView().getModel("UserJsonModelVISTA").getData().User[0].roles,
                habilitacionModel = this.getView().getModel("HabilitacionModel").getData(),
                EstadoActual = oModelHabilitacion.Estado,
                oTipoHabilitacion = this.claseHabilitacionFormatter(Roles, EstadoActual);
            var customData = {
                BaseDescription: this.formatBase(oModelHabilitacion.Base),
                GradoApitud: this.getView().getModel("gradoAptitud").getData().gradoAptitud,
                ClaseHabilitacion: this.getView().byId("INPUT_CLASE_HABIL").getValue(),
                FechaCapacitacion: this.getView().byId("INPUT_FECHA_CAPAC").getDateValue(),
                FechaVencimiento: this.getView().byId("INPUT_FECHA_VENC").getDateValue(),
                Lote: this.getView().byId("INPUT_LOTE").getValue()
            };
            PrintAndDownloadHelper.handlePrintAndDownload(claseHabilitacion, oModelHabilitacion, oTipoHabilitacion, habilitacionModel,
                customData);
        },
        SaveAttachmentVisibility: function (rol) {
            if (rol) {
                if (rol.includes("HAB_TCT_SUPERVISOR")) {
                    return true;
                } else {
                    return false;
                }
            } else {
                return false;
            }
        },
        SaveAttachmentEnabled: function (Files) {
            if (Files.length > 0) {
                return true;
            } else {
                return false;
            }
        },
        showCoomplementaryAttachments: function (File) {
            if (File.results.length > 0) {
                if (File.results[0].Complementario) {
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
        RolFormatter: function (rol) {
            if (rol.includes("HAB_TCT_SUPERVISOR")) {
                return "Supervisor";
            } else if (rol.includes("HAB_TCT_GER-REG")) {
                return "Gerente Regional";
            } else {
                return rol;
            }
        },
        onBack: function () {
            NavigationHelper.back({
                destroy: true
            });
        }
    });
}); sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/m/MessageBox",
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
    "transener/GestionHabilitaciones/services/EstacionesServices",
    "transener/GestionHabilitaciones/services/TareasTCTService",
    "transener/GestionHabilitaciones/services/GestionTareasTCTService",
    "transener/GestionHabilitaciones/services/TipoHabilitacionServices",
    "transener/GestionHabilitaciones/services/UserService",
    "transener/GestionHabilitaciones/services/PuestosServices",
    "transener/GestionHabilitaciones/services/FirmasUsuariosServices",
    "transener/GestionHabilitaciones/services/AdjuntosServices",
    "transener/GestionHabilitaciones/services/MotivoCambioEstadoService",
    "transener/GestionHabilitaciones/services/PersonalInternoServices"
], function (Controller, MessageBox, NavigationHelper, FormatHelper, FileDownloadHelper, MessageBoxHelper,
    PrintAndDownloadHelper, IntervencionesServices, HabilitacionServices, RegionServices, HabTecnicasService,
    EstacionesServices, TareasTCTService, GestionTareasTCTService, TipoHabilitacionServices,
    UserService, PuestosServices, FirmasUsuariosServices, AdjuntosServices, MotivoCambioEstadoService, PersonalInternoServices) {
    "use strict";
    return Controller.extend("transener.GestionHabilitaciones.controller.detailHabTCT", {
        onInit: function () {
            this.getUser();
            this.loadHabilitacionModel();
            this.loadGradoAptitud();
            this.loadStatusOptionsModel();
            this.createFilesModel();
            this.onLoadTareasModel();
            this.loadPuestos();
            this.loadFirma();
        },
        onTabSelect: function (oEvent) {
            let sSelectedKey = oEvent.getSource().getSelectedKey();
            if (sSelectedKey === "Estado") {
                this.loadMotivoCambioEstado();
            }
        },
        armarDatos: function (datos) {

            debugger;

            var aGroupsTemporal = datos[0].groups;

            var aGroups = aGroupsTemporal.map(function (fila) {
                return fila.display;
            });

            var aUserData = {
                firstname: datos[0].displayName,
                lastname: datos[0].displayName,
                email: datos[0].emails[0].value,
                name: datos[0].emails[0].value,
                displayName: datos[0].displayName,
                groups: aGroups
            };
            return aUserData;
        },

        getUser: function (successCallback, errorCallback) {
            /*	
            var path = this._servicePathPrefix + this._servicePath + "?multiValuesAsArrays=true";
            jQuery.ajax(path, {
                method: "GET",
                success: successCallback,
                error: errorCallback
            });
            */

            const url = sap.ui.getCore().getModel("appCurrentInfo").appUrl + "/user-api/currentUser";

            var oModel = new sap.ui.model.json.JSONModel();
            var mock = {
                firstname: "Dummy",
                lastname: "User",
                email: "dummy.user@com",
                name: "dummy.user@com",
                displayName: "Dummy User (dummy.user@com)",
                groups: ["Mantenimiento_GerRegional",
                    "Examinadores_PT15",
                    "Selector_evaluadores_PT15",
                    "seguridadH_PT15",
                    "Rep_Direccion_PT15",
                    "MedicinaLaboral_PT15",
                    "Gestion_Calidad_PT152",
                    "Direccion_TecnicaPT15",
                    "Auditor_Externo",
                    "Gestion_habilitaciones",
                    "Solicitante_PT15",
                    "Mantenimiento_Secretaria",
                    "Director_Tecnico",
                    "Ger_Operaciones",
                    "Aprobacion_Habilitaciones"
                ]
            };

            oModel.loadData(url);
            var that = this;
            oModel.dataLoaded()
                .then(() => {
                    //check if data has been loaded
                    //for local testing, set mock data
                    if (oModel.getData().email) {

                        var cUrl = sap.ui.getCore().getModel("appCurrentInfo").appUrl + '/IAS/scim/Users?filter=emails.value eq "' + oModel.getData().email + '"'

                        //Llamar a API del IAS
                        $.ajax({

                            type: "GET",
                            contentType: "application/scim+json",
                            url: cUrl,
                            xhrFields: { withCredentials: false },
                            dataType: "json",
                            async: false,

                            success: function (data, textStatus, jqXHR) {

                                //window.alert("success");
                                console.log("It works");
                                var oModelUser = new sap.ui.model.json.JSONModel();
                                oModelUser.setData(data.Resources);

                                debugger;
                                var aDatosUsuario = that.armarDatos(data.Resources);

                                oModel.setData(aDatosUsuario);
                                //								oView.getView().setModel(oModel, "users");
                                sap.ui.getCore().setModel(oModel, "UserJsonModel");
                            },
                            error: function (data, xhr, textStatus) {
                                console.log(data);
                                console.log(xhr);
                                console.log(textStatus);
                                debugger;
                                window.alert("error");
                            }
                        });
                        // Fin llamar a API del IAS
                    }
                    else {
                        oModel.setData(mock);
                    }
                    // this.setModel(oModel, "userInfo");  
                })
                .catch(() => {
                    oModel.setData(mock);
                });
        },

        loadHabilitacionModel: function () {
            var oModel = new sap.ui.model.json.JSONModel();
            //oModel.setProperty("/Busy", true);
            this.getView().setModel(oModel, "HabilitacionModel");
        },
        loadGradoAptitud: function () {
            var gradoAptitud = [{
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
                "Codigo": "SEM",
                "Grado": "Sin examen Medico"
            }];
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
        createFilesModel: function () {
            var oModelFile = new sap.ui.model.json.JSONModel();
            oModelFile.setData({
                Files: []
            });
            this.getView().setModel(oModelFile, "Files");
        },
        onLoadTareasModel: function () {
            TareasTCTService.LoadTareas(
                jQuery.proxy(this.onSuccessCallbackTareas, this),
                jQuery.proxy(this.onErrorCallbackTareas, this)
            );
        },
        onSuccessCallbackTareas: function (data) {
            var TareasModel = data.results.sort((a, b) => a.Codigo - b.Codigo);
            var oModel = new sap.ui.model.json.JSONModel();
            oModel.setData({
                TareasModel: TareasModel
            });
            this.getView().setModel(oModel, "TareasModel");
        },
        onErrorCallbackTareas: function () {
            MessageBox.error("Error al obtener las tareas");
        },
        loadPuestos: function () {
            PuestosServices.LoadPuestos(
                jQuery.proxy(this.onSuccessPuestos, this),
                jQuery.proxy(this.onErrorPuestos, this)
            );
        },
        onSuccessPuestos: function (data) {
            var PuestosModel = data.results;
            var oModel = new sap.ui.model.json.JSONModel();
            oModel.setData({
                PuestosModel: PuestosModel
            });
            this.getView().setModel(oModel, "PuestosModel");
        },
        onErrorPuestos: function () {
            MessageBox.error("Error al cargar los puestos");
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
        onErrorFirmaCallback: function () {
            MessageBox.error("No se pudo cargar la firma");
        },
        loadTipoHab: function () {
            var that = this;
            var Habilitacion = this.getView().getModel("Habilitacion").getData().Empresa;
            var Empresa = Habilitacion === "TRANSENER" ? "100" : "300";
            TipoHabilitacionServices.loadTipoHab(
                function (data) {
                    var filtered = data.results.filter(function (row) {
                        return row.Tipohab[0] === "T";
                    });
                    var model = new sap.ui.model.json.JSONModel({
                        TipoHab: filtered
                    });
                    that.getView().setModel(model, "TipoHab");
                },
                jQuery.proxy(that.onErrorTipoHab, that), [
                new sap.ui.model.Filter({
                    path: "Empresa",
                    operator: sap.ui.model.FilterOperator.EQ,
                    value1: Empresa
                })
            ]
            );
        },
        _onLoadEstaciones: function () {
            var Habilitacion = this.getView().getModel("Habilitacion").getData().Empresa;
            var Empresa = Habilitacion === "TRANSENER" ? "100" : "300";
            EstacionesServices.LoadEstaciones(Empresa,
                jQuery.proxy(this.onSuccessEstaciones, this),
                jQuery.proxy(this.onErrorEstaciones, this)
            );
        },
        onSuccessEstaciones: function (data) {
            var EstacionModel = data.results;
            var oModel = new sap.ui.model.json.JSONModel();
            oModel.setSizeLimit(99999);
            oModel.setData({
                EstacionModel: EstacionModel
            });
            this.getView().setModel(oModel, "EstacionModel");
        },
        onErrorEstaciones: function () {
            MessageBox.error("Error al cargar Estaciones y/o Bases");
        },
        /*LoadTipoHabModel: function (clase, tension) {
            var filters = [];
            filters.push(new sap.ui.model.Filter({
                path: "Clase",
                operator: sap.ui.model.FilterOperator.EQ,
                value1: clase
            }));
            filters.push(new sap.ui.model.Filter({
                path: "Nivtenini",
                operator: sap.ui.model.FilterOperator.EQ,
                value1: tension
            }));
            TipoHabilitacionServices.LoadTipoHabilitaciones(filters,
                jQuery.proxy(this.onSuccessTipoHab, this),
                jQuery.proxy(this.onErrorTipoHab, this)
            );
        },*/
        /*onSuccessTipoHab: function (data) {
            var TipoHabilitaciones = data.results;
            var oModel = new sap.ui.model.json.JSONModel();
            TipoHabilitaciones.map(function (el, index) {
                el.index = "" + index;
            });
            oModel.setData({
                TipoHabilitaciones: TipoHabilitaciones
            });
            this.getView().setModel(oModel, "TipoHabilitaciones");
        },*/
        LoadIntervenciones: function (Idhabilitacion) {
            //var oModel = this.getView().getModel("HabilitacionModel");
            //oModel.setProperty("/Busy", true);
            sap.ui.core.BusyIndicator.show();
            if (Idhabilitacion) {
                this.getHabilitacion(Idhabilitacion);
                IntervencionesServices.loadIntervenciones(Idhabilitacion,
                    "H0002",
                    jQuery.proxy(this.SuccessCallBackInt, this),
                    jQuery.proxy(this.ErrorCallBackInt, this)
                );
            }
        },
        SuccessCallBackInt: function (data) {
            //var oModel = this.getView().getModel("HabilitacionModel");
            //oModel.setProperty("/Busy", true);
            var Intervenciones = data.results;
            var oModel = new sap.ui.model.json.JSONModel();
            oModel.setData({
                Intervenciones: Intervenciones
            });
            this.getView().setModel(oModel, "Intervenciones");
            this.onBindingIntervenciones();
        },
        ErrorCallBackInt: function (error) {
            MessageBox.error("Error al cargar las intervenciones");
        },
        onBindingIntervenciones: function () {
            var Intervenciones = this.getView().getModel("Intervenciones").getData().Intervenciones;
            var oDataModel = this.getView().getModel("HabilitacionModel").getData();
            var oModel = this.getView().getModel("HabilitacionModel");
            var that = this;
            if (!this.getView().getModel("Habilitacion")) {
                MessageBoxHelper.showAlert("Leer datos de habilitación", "Ha ocurrido un error, intente nuevamente.");
                sap.ui.core.BusyIndicator.hide();
                return;
                //No funciona esto en PRD
                //this.onBack();
            } else {
                var sModel = this.getView().getModel("Habilitacion").getData();
            }
            //Obtengo fecha nacimiento
            var getFechaNac = new Promise(function (resolve, reject) {
                var oLegajo = that.getView().getModel("Habilitacion").getData().Legajo;
                PersonalInternoServices.LoadSearch(oLegajo, resolve, reject);
            });
            getFechaNac.then(function (data) {
                if (data.results.length !== 0) {
                    var oFechaNac = data.results[0].FechaNac;
                    that.getView().getModel("Habilitacion").setProperty("/FechaNac", oFechaNac);
                } else {
                    sap.m.MessageToast.show("No se encuentra la fecha de nacimiento");
                }
            });
            //Esto estaba dando errores en PRD - 4/8/2022
            /*setTimeout(function () {
                var oHabilitacion = that.getView().getModel("Habilitacion").getData();
                oDataModel.Lote = oHabilitacion.Lote;
                //Obtengo fecha nacimiento
                that.getFechaNac();
                oModel.refresh(true);
            }, 1000);*/
            for (var row in Intervenciones) {
                var roles = Intervenciones[row].Rol;
                if (roles.includes("HAB_TCT_HABILITADO")) {
                    oDataModel.Habilitado_Firma = "data:image/gif;base64," + Intervenciones[row].Firma;
                    oDataModel.Habilitado_Nombre = Intervenciones[row].Nombre;
                    oDataModel.Habilitado_Fecha = FormatHelper.formatJsonDate(Intervenciones[row].Fechaint);
                } else if (roles.includes("HAB_TCT_SUPERVISOR")) {
                    oDataModel.Capacitacion_Firma = "data:image/gif;base64," + Intervenciones[row].Firma;
                    oDataModel.Capacitacion_Nombre = Intervenciones[row].Nombre;
                    if (sModel.Hab_CETCT_nav.length > 0) {
                        oDataModel.FechaCapacitacion = FormatHelper.formatJsonDate(sModel.Hab_CETCT_nav[0].FechaCapacitacion);
                        oDataModel.Vencimiento = FormatHelper.formatJsonDate(sModel.Hab_CETCT_nav[0].Vencimiento);
                        //oDataModel.TipoHab = sModel.Hab_CETCT_nav[0].Tipohab;
                        //oDataModel.Tension = sModel.Hab_CETCT_nav[0].Tension;
                        //oDataModel.Clase = sModel.Hab_CETCT_nav[0].Clase;
                    }
                    //Esto ya no se usa, lo comento 3/8/2022
                    //this.LoadTipoHabModel(oDataModel.Clase, oDataModel.Tension);
                } else if (roles.includes("HAB_TCT_MED-LABORAL")) {
                    oDataModel.Medico_Firma = "data:image/gif;base64," + Intervenciones[row].Firma;
                    oDataModel.Medico_Observacion = Intervenciones[row].Datosadicionales;
                    if (sModel.Hab_apmedico_nav.length > 0) {
                        oDataModel.Medico_Fecha = FormatHelper.formatJsonDate(sModel.Hab_apmedico_nav[0].Vigencia);
                        oDataModel.Grado_aptitud = sModel.Hab_apmedico_nav[0].Gradoap;
                    }
                } else if (roles.includes("HAB_TCT_SEG-HIG")) {
                    oDataModel.Seg_higiene_Firma = "data:image/gif;base64," + Intervenciones[row].Firma;
                    oDataModel.Seg_higiene_Observacion = Intervenciones[row].Datosadicionales;
                    //ISSUE 263 - TcT Seguridad e Higiene, Fecha de vencimiento.
                    //oDataModel.Seg_higiene_Fecha = FormatHelper.formatJsonDate(Intervenciones[row].Fechacreacion);
                    if (sModel.Hab_SeguridadHigiene_nav.length > 0) {
                        oDataModel.Seg_higiene_Fecha = FormatHelper.formatJsonDate(sModel.Hab_SeguridadHigiene_nav[0].Vigencia);
                    }
                } else if (roles.includes("HAB_TCT_GER-REG")) {
                    oDataModel.Gerente_Firma = "data:image/gif;base64," + Intervenciones[row].Firma;
                    oDataModel.Gerente_Fecha = FormatHelper.formatJsonDate(sModel.Vigencia);
                    oDataModel.Gerente_Nombre = Intervenciones[row].Nombre;
                }
            }
            oDataModel.Lote = sModel.Lote;
            //ISSUE 263 - TcT Seguridad e Higiene, Fecha de vencimiento.
            if (sModel.Lote === "ON" || sModel.Lote === "JN") {
                this.getView().byId("datePickerLineas").setVisible(false);
            } else if (sModel.Lote === "HC") {
                this.getView().byId("datePickerEstTrans").setVisible(false);
            }
            oModel.updateBindings(true);
            oModel.refresh(true);
            sap.ui.core.BusyIndicator.hide();
            //oModel.setProperty("/Busy", false);
        },
        getHabilitacion: function (Idhabilitacion) {
            var oView = this.getView();
            var that = this;
            HabilitacionServices.loadHabilitacion(Idhabilitacion, "H0002", oView, function () {
                that._onLoadEstaciones();
                that.onLoadTareasAssing();
                that.loadTipoHab.bind(that)();
            });
        },
        formatPuesto: function (Puesto) {
            var data = sap.ui.getCore().getModel("PuestosModel").getData().PuestosModel;
            for (var i = 0; i < data.length; i++) {
                if (data[i].Tipo === Puesto) {
                    return data[i].Descripcion;
                }
            }
        },
        formatBase: function (Base) {
            var Empresa = this.getView().getModel("Habilitacion") ? this.getView().getModel("Habilitacion").getData().Empresa : '';
            if (Empresa === 'TRANSENER') {
                var Bases = sap.ui.getCore().getModel("EstacionTransenerModel") ? sap.ui.getCore().getModel("EstacionTransenerModel").getData().Estaciones :
                    '';
            } else { //TRANSBA
                var Bases = sap.ui.getCore().getModel("EstacionTransbaModel") ? sap.ui.getCore().getModel("EstacionTransbaModel").getData().Estaciones :
                    '';
            }
            //Fix para que no rompa cuando no trae datos el servicio de las bases (EstacionesSet) 12/10/21
            if (Bases.length !== 0) {
                var aSelectedBase = Bases.filter((item) => {
                    return item.Codigo === Base;
                });
                var oSelectedBase = aSelectedBase[0];
                return oSelectedBase.Codigo + " - " + oSelectedBase.Descripcion;
            } else {
                return Base;
            }
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
        formatterClase: function (rol, estado) {
            if (rol.includes("HAB_TCT_SUPERVISOR") && estado === 'H') { //Si es supervisor_TCT y el estado es "Habilitado"
                return true;
            } else {
                return false;
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
        },
        claseHabilitacionFormatter: function (intervencion, habilitacion) {
            if (intervencion.Lote) {
                if (intervencion.Lote === "HC") {
                    return "HC";
                }
                if (intervencion.Lote === "TEJ") {
                    return "TEJ";
                }
                if (intervencion.Lote === "TEO") {
                    return "TEO";
                }
                if (intervencion.Lote === "TEA") {
                    return "TEA";
                }
                if (intervencion.Lote === "A") {
                    return "A";
                }
                if (intervencion.Lote === "O") {
                    return "O";
                }
                if (intervencion.Lote === "J") {
                    return "J";
                }
                if (intervencion.Lote === "ON") {
                    return "ON";
                }
                if (intervencion.Lote === "JN") {
                    return "JN";
                }
                var count = 0;
                var found = "";
                if (habilitacion.Mto33) {
                    count++;
                    found = "33";
                }
                if (habilitacion.Mto66) {
                    count++;
                    found = "66";
                }
                if (habilitacion.Mto132) {
                    count++;
                    found = "132";
                }
                if (habilitacion.Mto220) {
                    count++;
                    found = "220";
                }
                if (habilitacion.Mto13) {
                    count++;
                    found = "330";
                }
                if (habilitacion.Mto500) {
                    count++;
                    found = "500";
                }
                if (count !== 1) return "";
                return intervencion.Clase + " - " + found;
            }
            return "";
        },
        //Reemplacé esto por una promise dentro de onBindingIntervenciones
        /*getFechaNac: function () {
            var oLegajo = this.getView().getModel("Habilitacion").getData().Legajo;
            PersonalInternoServices.LoadSearch(oLegajo,
                jQuery.proxy(this.SuccessFechaNac, this),
                jQuery.proxy(this.ErrorFechaNac, this)
            );
        },
        SuccessFechaNac: function (data) {
            var oFechaNac = data.results[0].FechaNac;
            if (oFechaNac !== undefined && oFechaNac !== null) {
                this.getView().getModel("Habilitacion").setProperty("/FechaNac", oFechaNac);
            }
        },
        ErrorFechaNac: function () {
            sap.m.MessageToast.show("Error al cargar la fecha de nacimiento");
        },*/
        enableStatusOptionsByRolAndLicstat: function () {
            var Roles = this.getView().getModel("UserJsonModelVISTA").getData().User[0].roles;
            var EstadoActual = this.getView().getModel("Habilitacion").getData().Estado;
            //se fija si dentro de los roles tiene Supervisor o Gerente Regional
            var bRolEsDirectorTecnico = Roles.some(function (elem) {
                return elem === "HAB_TCT_SUPERVISOR" || elem === "HAB_TCT_GER-REG";
            });
            if (bRolEsDirectorTecnico) {
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
        onCloseDialog: function () {
            this.oDialog.close();
        },
        afterCloseDialog: function () {
            this.oDialog.destroy();
            this.oDialog = null;
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
            var Lote = oModel.getData().Lote ? oModel.getData().Lote : habilitacion.Lote;
            var Empresa = habilitacion.Empresa === "TRANSENER" ? "100" : "300";
            var Roles = this.getView().getModel("UserJsonModelVISTA").getData().User[0].roles;
            var Rol = Roles.find(element => element === "HAB_TCT_SUPERVISOR" || element === "HAB_TCT_GER-REG");
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
                Lote: Lote,
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
        onErrorCallbackStatus: function () {
            MessageBox.error("Error al cambiar el estado de la habilitación");
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
            MessageBox.error("Error al obtener la lista de habilitaciones");
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
            var Rol = Roles.find(element => element === "HAB_TCT_SUPERVISOR" || element === "HAB_TCT_GER-REG");
            var filters = {
                "Id": oHabilitacion.Idhabilitacion,
                "Empresa": oHabilitacion.Empresa === "TRANSENER" ? "100" : "300",
                "Clasehab": "H0002",
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
                    rol.includes("HAB_TCT_GER-REG") ||
                    rol.includes("HAB_TCT_SUPERVISOR")
                ) {
                    return true;
                } else {
                    return false;
                }
            } else {
                return false;
            }
        },
        handleLinkAdjuntoPress: function (oEvent) {
            var Adjunto = oEvent.getSource().getBindingContext("Intervenciones").getObject();
            var binary = atob(Adjunto.Archivo);
            FileDownloadHelper.saveBinaryFile(binary, Adjunto.Doctype, Adjunto.Nombre);
        },
        validaAjuntos: function (adjuntos) {
            var archivos = adjuntos.results;
            for (var row in archivos) {
                if (archivos[row].Nombre === "imagen_perfil.jpeg") {
                    this.getView().getModel("HabilitacionModel").getData().ImgPerfil = "data:image/gif;base64," + archivos[row].Archivo;
                }
            }
            if (adjuntos.results.length > 0) {
                if (adjuntos.results[0].Complementario) {
                    return false;
                } else {
                    return true;
                }
            } else {
                return false;
            }
        },
        onSaveTarea: function () {
            var habilitacionData = this.getView().getModel("HabilitacionModel").getData();
            var Tarea = habilitacionData.Tarea;
            var Clase = habilitacionData.Lote ? habilitacionData.Lote : "";
            var TipoHabilitacion = Clase + "-" + habilitacionData.Tension;
            var legajo = this.getView().getModel("Habilitacion").getData().Legajo;
            var puesto = this.getView().getModel("Habilitacion").getData().Puesto;
            if (Tarea === "" || typeof (Tarea) === "undefined") {
                MessageBoxHelper.showAlert("AgregarTarea", "ErrorTarea");
                return false;
            }
            var oModel = this.getView().getModel("HabilitacionModel");
            oModel.setProperty("/Busy", true);
            var data = {
                "Legajo": legajo,
                "Tarea": Tarea,
                "Puesto": puesto,
                "TipoHabilitacion": TipoHabilitacion,
                "Tension": habilitacionData.Tension
            };
            GestionTareasTCTService.SaveAssignTarea(data,
                jQuery.proxy(this.successSaveCallbackTareasAssing, this),
                jQuery.proxy(this.errorSaveCallbackTareasAssing, this)
            );
        },
        addTaskEnabled: function (Lote, Tarea, Tension) {
            if (Lote !== "" && Lote !== null && Tarea !== "" && Tarea !== null && Tension !== "" && Tension !== null) {
                return true;
            } else {
                return false;
            }
        },
        onLoadTareasAssing: function () {
            var habilitacion = this.getView().getModel("Habilitacion").getData();
            var legajo = habilitacion.Legajo;
            var puesto = habilitacion.Puesto;
            var TipoHabilitacion = habilitacion.Lote ? habilitacion.Lote : "";
            GestionTareasTCTService.LoadTareasAssing(legajo, puesto, TipoHabilitacion,
                jQuery.proxy(this.successCallbackTareasAssing, this),
                jQuery.proxy(this.errorCallbackTareasAssing, this)
            );
        },
        successCallbackTareasAssing: function (data) {
            var res = data.results;
            var obj = {
                Tareas500: [],
                Tareas330: [],
                Tareas220: [],
                Tareas132: [],
                Tareas66: [],
                Tareas33: [],
                otrasTareas: []
            };
            res.forEach(function (tarea) {
                if (obj["Tareas" + tarea.Tension]) {
                    obj["Tareas" + tarea.Tension].push(tarea);
                } else {
                    obj.otrasTareas.push(tarea);
                }
            });
            var oModel = new sap.ui.model.json.JSONModel();
            oModel.setData(obj);
            this.getView().setModel(oModel, "TareasAssingModel");
            var Model = this.getView().getModel("HabilitacionModel");
            Model.setProperty("/Busy", false);
        },
        errorCallbackTareasAssing: function () {
            MessageBox.error("Error al asignar las tareas");
        },
        successSaveCallbackTareasAssing: function () {
            this.onLoadTareasAssing();
        },
        errorSaveCallbackTareasAssing: function () {
            MessageBoxHelper.showAlert("AgregarTarea", "ErrorSave");
        },
        getTareaDescription: function (id) {
            var TareasModel = this.getView().getModel("TareasModel").getData().TareasModel;
            for (var row in TareasModel) {
                if (TareasModel[row].Codigo === id) {
                    return TareasModel[row].Descripcion;
                }
            }
        },
        onDeleteTarea: function (oEvent) {
            var tarea = oEvent.getSource().getBindingContext("TareasAssingModel").getObject();
            var oModel = this.getView().getModel("HabilitacionModel");
            oModel.setProperty("/Busy", true);
            GestionTareasTCTService.removeTarea(tarea,
                jQuery.proxy(this.successDeleteTarea, this),
                jQuery.proxy(this.errorDeleteTarea, this)
            );
        },
        successDeleteTarea: function () {
            this.onLoadTareasAssing();
        },
        errorDeleteTarea: function () {
            MessageBox.error("Error al borrar la tarea");
        },
        onEnableRol2: function (rol) {
            if (rol) {
                if (
                    rol.includes("Director_Tecnico") ||
                    rol.includes("HAB_TCT_GER-REG") ||
                    rol.includes("HAB_TCT_SUPERVISOR")
                ) {
                    return true;
                } else {
                    return false;
                }
            } else {
                return false;
            }
        },
        onChangeTension: function () {
            var oModel = this.getView().getModel("HabilitacionModel");
            var habilitacion = this.getView().getModel("Habilitacion").getData();
            var data = {
                Apellido: habilitacion.Apellido,
                Area: habilitacion.Area,
                Base: habilitacion.Base,
                Clasehab: habilitacion.Clasehab,
                Documento: habilitacion.Documento,
                Empresa: habilitacion.Empresa,
                Empresaext: habilitacion.Empresaext,
                Estado: habilitacion.Estado,
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
            oModel.setProperty("/Busy", true);
            HabilitacionServices.saveHabilitacion(data,
                jQuery.proxy(this.onSuccessCallbackTension, this),
                jQuery.proxy(this.onErrorCallbackTension, this)
            );
        },
        onSuccessCallbackTension: function () {
            var oModel = this.getView().getModel("HabilitacionModel");
            oModel.setProperty("/Busy", false);
            MessageBox.success("Los valores de tensión han sido actualizados.");
        },
        onErrorCallbackTension: function () {
            var oModel = this.getView().getModel("HabilitacionModel");
            oModel.setProperty("/Busy", false);
            MessageBox.error("Ha ocurrido un error al cambiar los valores de tensión.");
        },
        onChangeClase: function () {
            var oModel = this.getView().getModel("HabilitacionModel");
            var pristine = this.getView().getModel("PristineModel").getData();
            var data = {
                Apellido: pristine.Apellido,
                Area: pristine.Area,
                Base: pristine.Base,
                Clasehab: pristine.Clasehab,
                Documento: pristine.Documento,
                Empresa: pristine.Empresa,
                Empresaext: pristine.Empresaext,
                Estado: pristine.Estado,
                Idhabilitacion: pristine.Idhabilitacion,
                Interno: pristine.Interno,
                Legajo: pristine.Legajo,
                Lote: oModel.getData().Lote,
                Mto13: pristine.Mto13,
                Mto33: pristine.Mto33,
                Mto66: pristine.Mto66,
                Mto132: pristine.Mto132,
                Mto220: pristine.Mto220,
                Mto500: pristine.Mto500,
                Nombre: pristine.Nombre,
                Puesto: pristine.Puesto,
                Tipodoc: pristine.Tipodoc,
                Tipohab: pristine.Tipohab,
                Vigencia: pristine.Vigencia
            };
            oModel.setProperty("/Busy", true);
            HabilitacionServices.saveHabilitacion(data,
                jQuery.proxy(this.onSuccessCallbackClase, this),
                jQuery.proxy(this.onErrorCallbackClase, this)
            );
        },
        onSuccessCallbackClase: function () {
            var oModel = this.getView().getModel("HabilitacionModel");
            oModel.setProperty("/Busy", false);
            MessageBox.success("El valor de la clase ha sido actualizado.");
        },
        onErrorCallbackClase: function () {
            var oModel = this.getView().getModel("HabilitacionModel");
            oModel.setProperty("/Busy", false);
            MessageBox.error("Hubo un error al actualizar el valor de la clase.");
        },
        onChangePuestoYBase: function () {
            var oModel = this.getView().getModel("HabilitacionModel");
            var pristine = this.getView().getModel("PristineModel").getData();
            var habilitacion = this.getView().getModel("Habilitacion").getData();
            var data = {
                Apellido: pristine.Apellido,
                Area: pristine.Area,
                Base: habilitacion.Base,
                Clasehab: pristine.Clasehab,
                Documento: pristine.Documento,
                Empresa: pristine.Empresa,
                Empresaext: pristine.Empresaext,
                Estado: pristine.Estado,
                Idhabilitacion: pristine.Idhabilitacion,
                Interno: pristine.Interno,
                Legajo: pristine.Legajo,
                Lote: pristine.Lote,
                Mto13: pristine.Mto13,
                Mto33: pristine.Mto33,
                Mto66: pristine.Mto66,
                Mto132: pristine.Mto132,
                Mto220: pristine.Mto220,
                Mto500: pristine.Mto500,
                Nombre: pristine.Nombre,
                Puesto: habilitacion.Puesto,
                Tipodoc: pristine.Tipodoc,
                Tipohab: pristine.Tipohab,
                Vigencia: pristine.Vigencia
            };
            oModel.setProperty("/Busy", true);
            HabilitacionServices.saveHabilitacion(data,
                jQuery.proxy(this.onSuccessCallbackPuestoBase, this),
                jQuery.proxy(this.onErrorCallbackPuestoBase, this)
            );
        },
        onSuccessCallbackPuestoBase: function () {
            var oModel = this.getView().getModel("HabilitacionModel");
            oModel.setProperty("/Busy", false);
            MessageBox.success("El valor del puesto/base ha sido actualizado.");
        },
        onErrorCallbackPuestoBase: function () {
            var oModel = this.getView().getModel("HabilitacionModel");
            oModel.setProperty("/Busy", false);
            MessageBox.error("Ha ocurrido un error al actualizar el valor del puesto/base.");
        },
        selectClaseCapacitacion: function () {
            var habilitacion = this.getView().getModel("HabilitacionModel").getData();
            if (habilitacion.Clase === "HC" || habilitacion.Clase === "TEJ" || habilitacion.Clase === "TEO" || habilitacion.Clase === "TEA") {
                //Oculto la tabla de tensiones
                this.getView().byId("tensionTable").setVisible(false);
            } else {
                this.getView().byId("tensionTable").setVisible(true);
            }
        },
        onEnablePuestoYBase: function (rol, Estado) {
            if (Estado === "D") { //una vez revocada no se puede cambiar el estado
                return false;
            }
            if (rol) {
                if (
                    rol.includes("HAB_TCT_SUPERVISOR")
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
        onSaveAttachment: function () {
            var FirmaUser = this.getView().getModel("UserData").getData().Firma;
            var date = new Date();
            var hours = date.getHours();
            var minutes = date.getMinutes();
            var seconds = date.getSeconds();
            var time = "PT" + hours + "H" + minutes + "M" + seconds + "S";
            var oHab = this.getView().getModel("Habilitacion").getData();
            var data = {
                "Accion": "",
                "Clasehab": "H0002",
                "Fechacreacion": new Date(),
                "Fechaint": date,
                "Firma": FirmaUser,
                "Horaint": time,
                "Idhabilitacion": oHab.Idhabilitacion,
                "Legajo": oHab.Interno ? oHab.Legajo : oHab.Documento,
                "Nombre": "",
                "Rol": "HAB_TCT_SUPERVISOR",
                "Usuario": ""
            };
            IntervencionesServices.SaveIntervenciones(data,
                jQuery.proxy(this.successIntCallback, this),
                jQuery.proxy(this.errorIntCallback, this)
            );
        },
        successIntCallback: function (data) {
            var Idadjuntos = data.Idadjuntos;
            this.onSaveFile(Idadjuntos);
        },
        errorIntCallback: function () {
            var oModel = this.getModel("HabilitacionModel");
            oModel.setProperty("/Busy", false);
            MessageBoxHelper.showAlert("Aprobar Habilitación", "Ha ocurrido un error, intente mas tarde.");
        },
        onSaveFile: function (Idadjuntos) {
            var Files = this.getView().getModel("Files").getData().Files;
            var that = this;
            if (Files.length > 0) {
                $.each(Files, function (row) {
                    var oFileDate = {
                        "Nombre": Files[row].name,
                        "Archivo": Files[row].binary,
                        "Doctype": Files[row].type,
                        "Rol": "HAB_TCT_SUPERVISOR",
                        "Idadjuntos": Idadjuntos,
                        "Complementario": true
                    };
                    AdjuntosServices.SaveAdjunto(oFileDate,
                        jQuery.proxy(that.successSaveAdjunto, that),
                        jQuery.proxy(that.errorSaveAdjunto, that)
                    );
                });
            }
        },
        successSaveAdjunto: function (data) {
            MessageBoxHelper.showAlert("Exito!", "Se adjuntó el archivo correctamente.");
            this.refreshIntervencionesModel();
        },
        errorSaveAdjunto: function (error) {
            MessageBoxHelper.showAlert("Error!", "Hubo un error al adjuntar archivos.");
        },
        refreshIntervencionesModel: function () {
            var Idhabilitacion = this.getView().getModel("Habilitacion").getData().Idhabilitacion;
            IntervencionesServices.loadIntervenciones(Idhabilitacion, "H0002",
                jQuery.proxy(this.SuccessRefreshIntervencionesModel, this),
                jQuery.proxy(this.ErrorRefreshIntervencionesModel, this)
            );
        },
        SuccessRefreshIntervencionesModel: function (data) {
            this.getView().getModel("Intervenciones").getData().Intervenciones = data.results;
            this.getView().getModel("Intervenciones").refresh(true);
        },
        ErrorRefreshIntervencionesModel: function (error) {
            MessageBox.error("Error al volver a cargar las intervenciones para refrescar el modelo");
        },
        _onDonwloadHabilitacion: function () {
            var oModelHabilitacion = this.getView().getModel("Habilitacion").getData(),
                claseHabilitacion = oModelHabilitacion.Clasehab,
                Roles = this.getView().getModel("UserJsonModelVISTA").getData().User[0].roles,
                habilitacionModel = this.getView().getModel("HabilitacionModel").getData(),
                EstadoActual = oModelHabilitacion.Estado,
                oTipoHabilitacion = this.claseHabilitacionFormatter(Roles, EstadoActual);
            var customData = {
                BaseDescription: this.formatBase(oModelHabilitacion.Base),
                GradoApitud: this.getView().getModel("gradoAptitud").getData().gradoAptitud,
                ClaseHabilitacion: this.getView().byId("INPUT_CLASE_HABIL").getValue(),
                FechaCapacitacion: this.getView().byId("INPUT_FECHA_CAPAC").getDateValue(),
                FechaVencimiento: this.getView().byId("INPUT_FECHA_VENC").getDateValue(),
                Lote: this.getView().byId("INPUT_LOTE").getValue()
            };
            PrintAndDownloadHelper.handlePrintAndDownload(claseHabilitacion, oModelHabilitacion, oTipoHabilitacion, habilitacionModel,
                customData);
        },
        SaveAttachmentVisibility: function (rol) {
            if (rol) {
                if (rol.includes("HAB_TCT_SUPERVISOR")) {
                    return true;
                } else {
                    return false;
                }
            } else {
                return false;
            }
        },
        SaveAttachmentEnabled: function (Files) {
            if (Files.length > 0) {
                return true;
            } else {
                return false;
            }
        },
        showCoomplementaryAttachments: function (File) {
            if (File.results.length > 0) {
                if (File.results[0].Complementario) {
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
        RolFormatter: function (rol) {
            if (rol.includes("HAB_TCT_SUPERVISOR")) {
                return "Supervisor";
            } else if (rol.includes("HAB_TCT_GER-REG")) {
                return "Gerente Regional";
            } else {
                return rol;
            }
        },
        onBack: function () {
            NavigationHelper.back({
                destroy: true
            });
        }
    });
});