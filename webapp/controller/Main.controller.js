sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/m/MessageBox",
    "transener/GestionHabilitaciones/services/HabTecnicasService",
    "transener/GestionHabilitaciones/services/HabRangoService",
    "transener/GestionHabilitaciones/services/RegionServices",
    "transener/GestionHabilitaciones/services/TipoHabilitacionServices",
    "transener/GestionHabilitaciones/utils/NavigationHelper",
    "transener/GestionHabilitaciones/utils/MessageBoxHelper",
    "transener/GestionHabilitaciones/utils/FormatHelper",
    "transener/GestionHabilitaciones/services/PuestosServices",
    "transener/GestionHabilitaciones/services/EstacionesServices",
    "transener/GestionHabilitaciones/services/HabilitacionServices",
    "transener/GestionHabilitaciones/utils/DuplicarHabilitacionHelper"
], function (Controller, MessageBox, HabTecnicasService, HabRangoService, RegionServices,
    TipoHabilitacionServices, NavigationHelper, MessageBoxHelper, FormatHelper, PuestosServices, EstacionesServices, HabilitacionServices, DuplicarHabilitacionHelper) {
    "use strict";
    return Controller.extend("transener.GestionHabilitaciones.controller.Main", {

        aboutDialog: null,

        getBaseURL: function () {

         

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
            this.loadFilterModel();
            //this.loadHabilitacionesModel();
            this.loadAllRegiones();
            this.loadTipoHabs();
            this.LoadPuestos();
            this.loadFuncionOptions();
            this.createEstacionesModelForBothEmpresas();
        },

        loadFuncionOptions: function () {
            var oModel = new sap.ui.model.json.JSONModel();
            oModel.setData({});
            this.getView().setModel(oModel, "FuncionOptionsModel");
        },

        LoadPuestos: function () {
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
            sap.ui.getCore().setModel(oModel, "PuestosModel");
        },

        onErrorPuestos: function () {
            MessageBox.error("Error al cargar los puestos");
        },

        loadTipoHabs: function () {
            TipoHabilitacionServices.loadTipoHab(function (data) {
                var model = new sap.ui.model.json.JSONModel({
                    tipoHabs: data.results
                });
                this.getView().setModel(model, "TipoHabsModel");
            }.bind(this), function (err) {
                //no sense in showing an error now
                //alert("Ha habido un error cargando la pagina, si el error persiste informe a un administrador.")
            }, [] /*filters*/);
        },

        loadAllRegiones: function () {
            var that = this;
            RegionServices.loadAllRegiones(
                function (res) {
                    var all = [];
                    res.forEach(function (el) {
                        all = all.concat(el.results);
                    });
                    var oModel = new sap.ui.model.json.JSONModel();
                    oModel.setData({
                        Regiones: all
                    });
                    that.getView().setModel(oModel, "AllRegiones");
                },
                function (err) {
                    MessageBox.error("Error al cargar las regiones");
                }
            );
        },

        formatEstado: function (Estado, Lote) {
            if (Estado === "N") {
                return "Nueva Habilitacion";
            } else if (Estado === "H") {
                return "Habilitado";
            } else if (Estado === "D") {
                return "Revocado";
            } else if (Estado === "S") {
                return "Suspendido";
            } else if (Estado === "P") {
                if (Lote === "") {
                    return "Pendiente Gestion de Calidad";
                } else {
                    return "Pendiente Auditoria Externa";
                }
            } else if (Estado === "C") {
                return "Cancelado";
            } else if (Estado === "F") {
                return "Finalizado";
            }
            return Estado;
        },


        formatRegion: function (code, arr) {
            if (!code) return "";
            if (!arr) return "";
            for (var i = 0; i < arr.length; i++) {
                if (code == arr[i].Codigo) {
                    return arr[i].Region;
                }
            }
            return code;
        },

        formatFechas: function (dDate) {
            if (dDate && typeof dDate !== 'string') {
                let dDateFormat = new Date(dDate);
                let d = new Date(dDateFormat);
                let month = '' + (d.getMonth() + 1);
                let day = '' + d.getDate();
                let year = d.getFullYear();
                if (month.length < 2) month = '0' + month;
                if (day.length < 2) day = '0' + day;
                return [day, month, year].join('/');
            }
            return dDate;
        },

        formatFuncion: function (code, arr) {
            if (!code) return "";
            if (!arr) return code;
            var res = arr.find(function (el) {
                return el.Tipohab === code;
            });
            return (res && res.Descripcion) || code;
        },

        onBackSearch: function (oEvent) {
            var campoTipo = oEvent.getParameters().value;
            if (campoTipo === 'TCT') {
                this.getView().getModel("FuncionOptionsModel").setData({
                    funciones: [{
                        key: 'HC',
                        text: 'HC'
                    }, {
                        key: 'A',
                        text: 'A'
                    }, {
                        key: 'O',
                        text: 'O'
                    }, {
                        key: 'J',
                        text: 'J'
                    }]
                })
            } else if (campoTipo == "") {
                this.getView().getModel("FuncionOptionsModel").setData({});
            } else {
                this.getView().getModel("FuncionOptionsModel").setData({
                    funciones: [{
                        key: "PE1",
                        text: "Jefe de Turno del COT"
                    }, {
                        key: "PE2",
                        text: "Operador de Turno del COT"
                    }, {
                        key: "PE3",
                        text: "Operador de Apoyo del COT"
                    }, {
                        key: "PE4",
                        text: "Operador del Centro Regional"
                    }, {
                        key: "PE5",
                        text: "Técnico de Estaciones Transformadoras"
                    }, {
                        key: "PB1",
                        text: "Jefe de Turno del COTDT"
                    }, {
                        key: "PB2",
                        text: "Operador del COTDT"
                    }, {
                        key: "PB4",
                        text: "Técnico de Estaciones Transformadoras"
                    }]
                })
            }
            this.getView().getModel("BackFiltersModel").refresh(true);
            this.loadHabilitacionesModel();
        },
        loadHabilitacionesModel: function () {
            var oModel = new sap.ui.model.json.JSONModel();
            oModel.setProperty("/Busy", true);
            oModel.setSizeLimit(9999);
            var backFilters = this.getView().getModel("BackFiltersModel").getData();
            var filters = [];
            if (backFilters.Clasehab) {
                filters.push(new sap.ui.model.Filter({
                    path: "Clasehab",
                    operator: sap.ui.model.FilterOperator.EQ,
                    value1: backFilters.Clasehab
                }));
            }
            if (backFilters.Documento) {
                filters.push(new sap.ui.model.Filter({
                    path: "Documento",
                    operator: sap.ui.model.FilterOperator.EQ,
                    value1: backFilters.Documento
                }));
            }
            if (backFilters.Legajo) {
                filters.push(new sap.ui.model.Filter({
                    path: "Legajo",
                    operator: sap.ui.model.FilterOperator.EQ,
                    value1: backFilters.Legajo
                }));
            }
            if (backFilters.Apellido) {
                filters.push(new sap.ui.model.Filter({
                    path: "Apellido",
                    operator: sap.ui.model.FilterOperator.EQ,
                    value1: backFilters.Apellido
                }));
            }
            if (backFilters.Idhabilitacion) {
                filters.push(new sap.ui.model.Filter({
                    path: "Idhabilitacion",
                    operator: sap.ui.model.FilterOperator.EQ,
                    value1: backFilters.Idhabilitacion
                }));
            }
            this.getView().setModel(oModel, "Habilitaciones");
            HabTecnicasService.LoadHabilitaciones(
                jQuery.proxy(this.successCallback, this),
                jQuery.proxy(this.errorCallback, this),
                filters
            );
        },

        successCallback: function (data) {
            var Habilitaciones = data.results;
            var dateFormat = sap.ui.core.format.DateFormat.getDateTimeInstance({
                pattern: "dd/MM/yyyy"
            });
            for (var row in Habilitaciones) {
                var date = Habilitaciones[row].Vigencia;
                if (date) {
                    Habilitaciones[row].VigenciaDate = dateFormat.format(
                        new Date(date.getTime() + date.getTimezoneOffset() * 60 * 1000)
                    );
                } else {
                    Habilitaciones[row].VigenciaDate = "";
                }
                var dateFechaCreacion = Habilitaciones[row].FechaCreacion;
                if (dateFechaCreacion) {
                    Habilitaciones[row].FechaCreacion = dateFormat.format(
                        new Date(dateFechaCreacion.getTime() + dateFechaCreacion.getTimezoneOffset() * 60 * 1000)
                    );
                } else {
                    Habilitaciones[row].FechaCreacion = "";
                }
                var dateVtoApto = Habilitaciones[row].VtoApto;
                if (dateVtoApto) {
                    Habilitaciones[row].VtoApto = dateFormat.format(
                        new Date(dateVtoApto.getTime() + dateVtoApto.getTimezoneOffset() * 60 * 1000)
                    );
                } else {
                    Habilitaciones[row].VtoApto = "";
                }
            }
            this.getView().getModel("Habilitaciones").setProperty("/Habilitaciones", Habilitaciones);
            this.getView().getModel("Habilitaciones").setProperty("/Busy", false);
            this.onSearch();
        },

        errorCallback: function () {
            MessageBox.error("Error al cargar las habilitaciones");
        },

        loadFilterModel: function () {
            var oModel = new sap.ui.model.json.JSONModel();
            this.getView().setModel(oModel, "FiltersModel");
            // Setear Modelo y Valores Iniciales para filtros de Backend
            oModel = new sap.ui.model.json.JSONModel();
            this.getView().setModel(oModel, "BackFiltersModel");

        },

        onSelectHabilitacion: function (oEvent) {
            var SelectedHabilitacion = oEvent.getSource().getBindingContext("Habilitaciones").getObject();
            var oModel = new sap.ui.model.json.JSONModel();
            oModel.setData(SelectedHabilitacion);
            
            switch (SelectedHabilitacion.Clasehab) {
                case "H0001":
                    NavigationHelper.to({
                        pageId: "transener.GestionHabilitaciones.view.Detail.detailHabMTO",
                        model: oModel
                    });
                    break;
                case "H0002":
                    NavigationHelper.to({
                        pageId: "transener.GestionHabilitaciones.view.Detail.detailHabTCT",
                        model: oModel
                    });
                    break;
                case "H0003":
                    NavigationHelper.to({
                        pageId: "transener.GestionHabilitaciones.view.Detail.detailHabPT15",
                        model: oModel
                    });
                    break;
            }
        },

        onBeforeOpenContextMenu: function (oEvent) {
            this._oContextItem = oEvent.getParameter("listItem");
            var oHab = this._oContextItem.getBindingContext("Habilitaciones").getObject();
            var bAllowed = this._canDuplicateRegion(oHab.Area);
            var oItem = this.byId("menuItemDuplicar");
            if (oItem) {
                oItem.setEnabled(bAllowed);
            }
        },

        // Regiones habilitadas del usuario: parte <region> de sus grupos hab_mto_secretaria_<region>.
        // El "mto" del nombre es incidental: esa región habilita duplicar cualquier clase (PT15/MTO/TCT).
        // Los grupos ya están en UserJsonModel (los carga UserService al iniciar); no se llama al IAS.
        _getSecretariaRegions: function () {
            var oModel = sap.ui.getCore().getModel("UserJsonModel");
            var oData = oModel && oModel.getData();
            var aRoles = (oData && oData.User && oData.User[0] && oData.User[0].roles) || [];
            var aRegions = [];
            aRoles.forEach(function (sRole) {
                var aMatch = /^hab_mto_secretaria_(.+)$/i.exec(sRole);
                if (aMatch) {
                    aRegions.push(aMatch[1]);
                }
            });
            return aRegions;
        },

        // La región de la habilitación (campo Area, ej. "1002") debe estar entre las regiones de secretaría del usuario.
        _canDuplicateRegion: function (sArea) {
            return this._getSecretariaRegions().indexOf(String(sArea)) >= 0;
        },

        onDuplicateHab: function () {
            var oHab = this._oContextItem.getBindingContext("Habilitaciones").getObject();

            if (!this._canDuplicateRegion(oHab.Area)) {
                MessageBox.information("Solo podés duplicar habilitaciones de las regiones donde sos secretaría.");
                return;
            }

            // Solo se pueden duplicar habilitaciones en estado "H" (Habilitado).
            if (oHab.Estado !== "H") {
                MessageBox.information("Solo se pueden duplicar habilitaciones en estado Habilitado (H).");
                return;
            }

            // Dirección MR/MB y sociedad destino se DEDUCEN de la sociedad de la original (no las elige el usuario).
            var bOrigenTransener = oHab.Empresa.toUpperCase().indexOf("TRANSENER") >= 0;
            var sNomenclatura = bOrigenTransener ? "MB" : "MR"; // Transener→MB (hacia Transba); Transba→MR (hacia Transener)
            var sDestinoEmpresa = bOrigenTransener ? "TRANSBA" : "TRANSENER";
            var sDestinoBukrs = bOrigenTransener ? "300" : "100";
            var sDireccionTexto = (bOrigenTransener ? "Transener → Transba" : "Transba → Transener") + " (" + sNomenclatura + ")";
            var sPlaceholderId = sNomenclatura === "MR" ? "8888888888" : "7777777777"; // MR→hacia Transener; MB→hacia Transba

            var oDuplicarModel = new sap.ui.model.json.JSONModel({
                Apellido: oHab.Apellido,
                Area: oHab.Area,
                Base: oHab.Base,
                Clasehab: oHab.Clasehab,
                Documento: oHab.Documento,
                Empresa: oHab.Empresa,
                Empresaext: oHab.Empresaext,
                Interno: oHab.Interno,
                Legajo: oHab.Legajo,
                Lote: oHab.Lote,
                Nombre: oHab.Nombre,
                Puesto: oHab.Puesto,
                Tipodoc: oHab.Tipodoc,
                Tipohab: oHab.Tipohab,
                Vigencia: oHab.Vigencia,
                VtoApto: oHab.VtoApto,
                FechaCreacion: oHab.FechaCreacion,
                Estado: oHab.Estado,
                Idhabilitacion: oHab.Idhabilitacion,
                // Campos calculados para la nueva habilitación (destino)
                Nomenclatura: sNomenclatura,
                DestinoEmpresa: sDestinoEmpresa,
                DestinoBukrs: sDestinoBukrs,
                DireccionTexto: sDireccionTexto,
                PlaceholderId: sPlaceholderId,
                NuevaArea: "",
                RegionesDestino: []
            });
            this.getView().setModel(oDuplicarModel, "DuplicarModel");

            // El combo de región solo ofrece regiones de la sociedad DESTINO (Empresa: 100 Transener / 300 Transba),
            // porque la hab duplicada vive en la sociedad opuesta a la original.
            RegionServices.LoadRegiones(sDestinoBukrs,
                function (oResp) {
                    oDuplicarModel.setProperty("/RegionesDestino", (oResp && oResp.results) || []);
                },
                function () {
                    oDuplicarModel.setProperty("/RegionesDestino", []);
                }
            );

            if (!this._oDuplicarDialog) {
                this._oDuplicarDialog = sap.ui.xmlfragment(
                    this.getView().getId(),
                    "transener.GestionHabilitaciones.view.DuplicarHabilitacion",
                    this
                );
                this.getView().addDependent(this._oDuplicarDialog);
            }
            this._oDuplicarDialog.open();
        },

        onNomenclaturaChange: function () {
            // El binding reactivo actualiza el "ID resultante" automáticamente
        },

        onConfirmarDuplicar: function () {
            // Guard de reentrada: evita que un doble click (o doble disparo del press) lance
            // dos veces la cadena de duplicación y cree dos habilitaciones.
            if (this._bDuplicando) {
                return;
            }
            this._bDuplicando = true;
            var oData = this.getView().getModel("DuplicarModel").getData();
            // INI MOD TRNS #XXXXXX - validar Región / Área obligatoria antes de duplicar
            if (!oData.NuevaArea) {
                this._bDuplicando = false;   // liberar el guard: el intento no prosperó
                MessageBox.warning("Debe seleccionar una Región / Área para duplicar.");
                return;
            }
            // FIN MOD TRNS #XXXXXX
            var that = this;
            if (this._oDuplicarDialog) {
                this._oDuplicarDialog.setBusyIndicatorDelay(0);
                this._oDuplicarDialog.setBusy(true);
            }
            DuplicarHabilitacionHelper.duplicar(oData)
                .then(function (oResult) {
                    that._onDuplicarSuccess(oResult.Idhabilitacion);
                })
                .catch(function (err) {
                    that._onDuplicarError(err);
                });
        },

        onCancelarDuplicar: function () {
            this._oDuplicarDialog.close();
        },

        _onDuplicarSuccess: function (sNumeroReal) {
            this._bDuplicando = false;
            if (this._oDuplicarDialog) {
                this._oDuplicarDialog.setBusy(false);
                this._oDuplicarDialog.close();
            }
            MessageBox.success("Habilitación duplicada con éxito. N° " + sNumeroReal);
            this.loadHabilitacionesModel();
        },

        _onDuplicarError: function () {
            this._bDuplicando = false;
            if (this._oDuplicarDialog) {
                this._oDuplicarDialog.setBusy(false);
            }
            MessageBox.error("Error al duplicar la habilitación.");
        },

        formatDate: function (date) {
            var dateFormat = sap.ui.core.format.DateFormat.getDateTimeInstance({
                pattern: "dd/MM/yyyy"
            });
            return dateFormat.format(date);
        },

        onSearch: function () {
            var tblDestinatario = this.getView().byId("tblHabilitaciones").getBinding("items");
            var filtros = this.getView().getModel("FiltersModel").getData();
            var campoTipo = this.getView().getModel("BackFiltersModel").getData().Clasehab;
            var filters = [];
            for (var row in filtros) {
                if (row === "Vigencia") {
                    if (filtros.Vigencia != null) {
                        var dateFormat = sap.ui.core.format.DateFormat.getDateTimeInstance({
                            pattern: "dd/MM/yyyy"
                        });
                        var VigenciaStringed = dateFormat.format(filtros.Vigencia);
                        filters.push(new sap.ui.model.Filter("VigenciaDate", sap.ui.model.FilterOperator.EQ, VigenciaStringed));
                        filters.push(new sap.ui.model.Filter("Estado", sap.ui.model.FilterOperator.NE, "N"));
                    }
                } else if (row === "FechaCreacion") {
                    if (filtros.FechaCreacion != null) {
                        var dateFormat = sap.ui.core.format.DateFormat.getDateTimeInstance({
                            pattern: "dd/MM/yyyy"
                        });
                        var FechaCreacionStringed = dateFormat.format(filtros.FechaCreacion);
                        filters.push(new sap.ui.model.Filter(row, sap.ui.model.FilterOperator.EQ, FechaCreacionStringed));
                    }
                } else if (row === "VtoApto") {
                    if (filtros.VtoApto != null) {
                        var dateFormat = sap.ui.core.format.DateFormat.getDateTimeInstance({
                            pattern: "dd/MM/yyyy"
                        });
                        var VtoAptoStringed = dateFormat.format(filtros.VtoApto);
                        filters.push(new sap.ui.model.Filter(row, sap.ui.model.FilterOperator.EQ, VtoAptoStringed));
                    }
                } else if (row === "Lote") { //Si el campo de Funcion está elegido se fija si el campo Tipo es TCT o PT15/Mantenimiento para filtrar por Lote o por Tipohab respectivamente.
                    if (campoTipo === "H0002") {
                        filters.push(new sap.ui.model.Filter("Lote", sap.ui.model.FilterOperator.Contains, filtros["Lote"]));
                    } else {
                        filters.push(new sap.ui.model.Filter("Tipohab", sap.ui.model.FilterOperator.Contains, filtros["Lote"]));
                    }
                } else {
                    filters.push(new sap.ui.model.Filter(row, sap.ui.model.FilterOperator.Contains, filtros[row]));
                }
            }
            tblDestinatario.filter(filters);
        },

        onSaveLotes: function () {
            var habilitaciones = this.getView().byId("tblHabilitaciones").getSelectedContexts();
            if (habilitaciones.length > 0) {
                var oDataHab = [];
                for (var row in habilitaciones) {
                    var item = habilitaciones[row].getObject();
                    var data = {
                        Legajo: item.Legajo,
                        Clasehab: item.Clasehab,
                        Tipohab: item.Tipohab,
                        Idhabilitacion: item.Idhabilitacion
                    };
                    oDataHab.push(data);
                }
                this.getView().getModel("Habilitaciones").setProperty("/Busy", true);
                HabRangoService.create(oDataHab,
                    jQuery.proxy(this._createODataOnSuccess, this),
                    jQuery.proxy(this._createODataOnError, this)
                );
            } else {
                MessageBoxHelper.showAlert("SaveLote", "SelectLoteError");
            }
        },

        _createODataOnSuccess: function () {
            this.loadHabilitacionesModel();
        },

        _createODataOnError: function () {
            MessageBox.error("Error al crear lotes");
        },
        onAbout: function () {
            if (!this.aboutDialog) {
                this.aboutDialog = new sap.m.Dialog({
                    title: "Acerca de Gestión de Habilitaciones",
                    type: "Message",
                    content: new sap.m.Text({
                        text: "Versión 2.0.25",
                        textAlign: sap.ui.core.TextAlign.Center
                    }),
                    beginButton: new sap.m.Button({
                        text: "Cerrar",
                        press: function () {
                            this.aboutDialog.close();
                        }.bind(this)
                    })
                });
                //to get access to the global model
                this.getView().addDependent(this.resizableDialog);
            }
            this.aboutDialog.open();
        },

        exportTable: function () {
            var contexts = this.getView().byId("tblHabilitaciones").getBinding("items").getCurrentContexts();
            var mant = contexts.map(function (el) {
                return el.getObject();
            });
            var csv = [];
            var header = ["ID de Habilitación", "Estado", "Empresa", "Funcion", "Nombre y Apellido", "Region / Area", "DNI", "Vto Hab.",
                "Inicio de Habilitacion", "Vto. Apto Médico"
            ];
            csv.push(header.join(";"));
            var that = this;
            var tipoHabs = this.getView().getModel("TipoHabsModel").getData().tipoHabs;
            var AllRegiones = this.getView().getModel("AllRegiones").getData().Regiones;
            for (var i = 0; i < mant.length; i++) {
                var oMant = mant[i];
                var cContent = [];
                cContent.push(oMant.Idhabilitacion);
                cContent.push(oMant.Estado);
                cContent.push(oMant.Empresa);
                cContent.push(that.formatFuncion(oMant.Tipohab, tipoHabs));
                cContent.push(oMant.Nombre + " " + oMant.Apellido);
                cContent.push(that.formatRegion(oMant.Area, AllRegiones));
                cContent.push(oMant.Documento);
                cContent.push(oMant.VigenciaDate);
                cContent.push(oMant.FechaCreacion);
                cContent.push(oMant.VtoApto);
                csv.push(cContent.join(";"));
            }
            var csvContent = csv.join("\n");
            var blob = new Blob(['\ufeff' + csvContent], {
                type: 'text/csv;charset=utf-8;'
            });
            var encodedUri = encodeURI(csv);
            var link = document.createElement("a");
            link.setAttribute("target", "_blank");
            var url = URL.createObjectURL(blob);
            link.setAttribute("href", url);
            link.setAttribute("download", "Gestion habilitaciones.xls");
            document.body.appendChild(link); // Required for FF
            link.click();
        },
        formatIsTCT: function (Clasehab) {
            return Clasehab === "H0002";
        },

        formatIsNotTCT: function (Clasehab) {
            return Clasehab !== "H0002";
        },

        formatVisibilityVigencia: function (estado) {
            if (estado === "N" || estado === "C") {
                return false;
            } else {
                return true;
            }
        },

        createEstacionesModelForBothEmpresas: function () {
            EstacionesServices.LoadEstaciones('100',
                jQuery.proxy(this.onSuccessEstacionesTransener, this),
                jQuery.proxy(this.onErrorEstacionesTransener, this)
            );
            EstacionesServices.LoadEstaciones('300',
                jQuery.proxy(this.onSuccessEstacionesTransba, this),
                jQuery.proxy(this.onErrorEstacionesTransba, this)
            );
        },

        onSuccessEstacionesTransener: function (data) {
            var EstacionTransenerModel = data.results;
            var oModel = new sap.ui.model.json.JSONModel();
            var oEstacionModel = this.getView().getModel("EstacionModel");
            oModel.setSizeLimit(99999);
            oModel.setData({
                Estaciones: EstacionTransenerModel
            });
            sap.ui.getCore().setModel(oModel, "EstacionTransenerModel");
            if (!oEstacionModel) { // Si no existe el modelo, crearlo
                this.getView().setModel(oModel, "EstacionModel");
            } else { // Si existe, agregar entradas
                var aEstaciones = oEstacionModel.getProperty("/Estaciones");
                aEstaciones = aEstaciones.concat(EstacionTransenerModel);
                oEstacionModel.setProperty("/Estaciones", aEstaciones);
            }
        },

        onErrorEstacionesTransener: function (error) {
            MessageBox.error("Error al crear el modelo de EstacionTransenerModel");
        },

        onSuccessEstacionesTransba: function (data) {
            var EstacionTransbaModel = data.results;
            var oModel = new sap.ui.model.json.JSONModel();
            var oEstacionModel = this.getView().getModel("EstacionModel");
            oModel.setSizeLimit(99999);
            oModel.setData({
                Estaciones: EstacionTransbaModel
            });
            sap.ui.getCore().setModel(oModel, "EstacionTransbaModel");
            if (!oEstacionModel) { // Si no existe el modelo, crearlo
                this.getView().setModel(oModel, "EstacionModel");
            } else { // Si existe, agregar entradas
                var aEstaciones = oEstacionModel.getProperty("/Estaciones");
                aEstaciones = aEstaciones.concat(EstacionTransbaModel);
                oEstacionModel.setProperty("/Estaciones", aEstaciones);
            }
        },

        onErrorEstacionesTransba: function (error) {
            MessageBox.error("Error al Error al crear el modelo de EstacionTransbaModel");
        },
    });
});