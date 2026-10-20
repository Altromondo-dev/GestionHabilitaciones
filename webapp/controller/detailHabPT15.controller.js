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
    "transener/GestionHabilitaciones/services/TipoHabilitacionServices",
    // INI MOD TRNS #PT-98 - maestro de puestos para el combo Funcion
    "transener/GestionHabilitaciones/services/PuestoAreaPT15Services"
    // FIN MOD TRNS #PT-98
], function (MessageBox, Controller, NavigationHelper, FormatHelper, FileDownloadHelper, MessageBoxHelper, PrintAndDownloadHelper,
    IntervencionesServices, HabilitacionServices, RegionServices, HabTecnicasService, ComentariosHabilitacionesService,
    FirmasUsuariosServices, AdjuntosServices, MotivoCambioEstadoService, TipoHabilitacionServices, PuestoAreaPT15Services) {
    "use strict";
    return Controller.extend("transener.GestionHabilitaciones.controller.detailHabPT15", {

        // INI MOD TRNS #PT-18 - estados en los que se permite editar las secciones de PT15.
        // Definicion funcional: N (Nueva Habilitacion), P (Pendiente Gestion de Calidad),
        // H (Habilitado) y S (Suspendido). Quedan bloqueados C (Cancelado), D (Revocado)
        // y F (Finalizado). Es la MISMA lista para las cinco secciones; si alguna necesita
        // otra, parametrizar por seccion a partir de aca.
        ESTADOS_EDITABLES_PT15: ["N", "P", "H", "S"],
        // FIN MOD TRNS #PT-18

        onInit: function () {


            //	this.loadUserModel();
            // INI MOD TRNS #PT-18 - fila vigente por rol (clave de _CLASIFICACION_ROLES -> fila de
            // IntervencionesSet). La recarga onBindingIntervenciones; se inicializa aca para que un
            // error de lectura no deje datos de otra habilitacion.
            this._oIntervencionesVigentes = {};
            // FIN MOD TRNS #PT-18
            // INI MOD TRNS #PT-98 - estado del maestro de puestos (combo Funcion)
            this._bPuestosFuncionesPedidos = false;
            this._aPuestosFunciones = null;
            // FIN MOD TRNS #PT-98
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
                // INI MOD TRNS #PT-98 - si el maestro de puestos llego antes que TipoHabSet,
                // el setModel de arriba lo pisaria. Se vuelve a mezclar.
                that._mergePuestosEnFunciones(that._aPuestosFunciones);
                // FIN MOD TRNS #PT-98
            }, function () {});
        },

        // INI MOD TRNS #PT-98 - El combo Funcion resuelve Habilitacion>/Tipohab contra los keys del
        // modelo "Funciones": si ninguno coincide, el ComboBox se renderiza vacio. cargahabpt15 dejo
        // de usar los codigos de TipoHabSet y ahora graba en Tipohab el codigo de puesto de
        // PuestoAreaPT15Set, con lo cual las licencias nuevas se veian con la Funcion en blanco
        // (mismo sintoma que se corrigio en habilitacionespt15, la bandeja de My Inbox).
        // Se lee el mismo maestro y se mezcla con TipoHabSet, que queda como fallback para las
        // habilitaciones viejas que ya tienen grabado un codigo de los de antes.
        LoadPuestosFunciones: function () {
            if (this._bPuestosFuncionesPedidos) {
                return;
            }
            var oHabilitacion = this.getView().getModel("Habilitacion");
            var sEmpresa = oHabilitacion && oHabilitacion.getProperty("/Empresa");
            if (!sEmpresa) {
                return;
            }
            this._bPuestosFuncionesPedidos = true;
            PuestoAreaPT15Services.LoadPuestosAreas(sEmpresa,
                jQuery.proxy(this.onSuccessPuestosFunciones, this),
                jQuery.proxy(this.onErrorPuestosFunciones, this)
            );
        },

        onSuccessPuestosFunciones: function (oData) {
            var aPuestos = (oData && oData.results) || [],
                aFunciones = [],
                oVistos = {};
            aPuestos.forEach(function (row) {
                if (row.Puesto && !oVistos[row.Puesto]) {
                    oVistos[row.Puesto] = true;
                    // El combo usa Tipohab/Descripcion como key/text (ver detailHabPT15.view.xml).
                    aFunciones.push({
                        Tipohab: row.Puesto,
                        Descripcion: this._toDisplayCase(row.PuestoTxt)
                    });
                }
            }, this);
            this._aPuestosFunciones = aFunciones;
            this._mergePuestosEnFunciones(aFunciones);
        },

        onErrorPuestosFunciones: function () {
            // Se deja TipoHabSet como fallback; permitir reintentar en la proxima carga.
            this._bPuestosFuncionesPedidos = false;
            console.error("No se pudo cargar el maestro de puestos (PuestoAreaPT15Set) para el combo Función.");
        },

        _mergePuestosEnFunciones: function (aPuestos) {
            if (!aPuestos || !aPuestos.length) {
                return;
            }
            var oModel = this.getView().getModel("Funciones");
            if (!oModel) {
                return;
            }
            var aFunciones = aPuestos.slice(),
                oVistos = {};
            aFunciones.forEach(function (oPuesto) {
                oVistos[oPuesto.Tipohab] = true;
            });
            // Se conservan los codigos viejos que el maestro de puestos ya no devuelve.
            ((oModel.getData() || {}).Funciones || []).forEach(function (oLegacy) {
                if (oLegacy && !oVistos[oLegacy.Tipohab]) {
                    oVistos[oLegacy.Tipohab] = true;
                    aFunciones.push(oLegacy);
                }
            });
            oModel.setData({
                Funciones: aFunciones
            });
        },

        // Mismo criterio de capitalizacion que cargahabpt15 y habilitacionespt15, para que el texto
        // de la Funcion se vea igual en el alta, en la bandeja y aca.
        _toDisplayCase: function (sText) {
            if (!sText) {
                return "";
            }

            var oLowerWords = {
                "a": true, "al": true, "ante": true, "bajo": true, "con": true, "contra": true,
                "de": true, "del": true, "desde": true, "durante": true, "e": true, "el": true,
                "en": true, "entre": true, "hacia": true, "hasta": true, "la": true, "las": true,
                "lo": true, "los": true, "o": true, "para": true, "por": true, "segun": true,
                "según": true, "sin": true, "sobre": true, "tras": true, "u": true, "un": true,
                "una": true, "unas": true, "unos": true, "y": true
            };
            var oAcronyms = {
                "ARO": true, "COT": true, "COTDT": true, "EETT": true, "ET": true, "GBA": true,
                "LAT": true, "NEA": true, "NOA": true, "PT15": true, "SAP": true
            };

            return sText.toString().replace(/\s+/g, " ").trim().split(" ").map(function (sWord, iIndex) {
                var sClean = sWord.replace(/^[^A-Za-zÁÉÍÓÚÜÑáéíóúüñ0-9]+|[^A-Za-zÁÉÍÓÚÜÑáéíóúüñ0-9]+$/g, "");
                if (!sClean) {
                    return sWord;
                }
                var sLowerClean = sClean.toLocaleLowerCase("es-AR");
                var sUpperClean = sClean.toLocaleUpperCase("es-AR");
                var bAcronymGroup = sUpperClean.split(/[\/-]/).every(function (sPart) {
                    return oAcronyms[sPart];
                });

                if (bAcronymGroup || /\d/.test(sClean) || /^[A-Za-zÁÉÍÓÚÜÑ](\.[A-Za-zÁÉÍÓÚÜÑ])+\.?$/.test(sClean)) {
                    return sWord.replace(sClean, sUpperClean);
                }
                if (iIndex > 0 && oLowerWords[sLowerClean]) {
                    return sWord.replace(sClean, sLowerClean);
                }
                return sWord.replace(sClean, sLowerClean.replace(/(^|[\/.\-])([a-záéíóúüñ])/g, function (sMatch, sSeparator, sLetter) {
                    return sSeparator + sLetter.toLocaleUpperCase("es-AR");
                }));
            }).join(" ");
        },
        // FIN MOD TRNS #PT-98

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
            // INI MOD TRNS #PT-18 - reset ANTES del read: si la lectura falla (o tarda), ninguna seccion
            // puede quedar habilitada con la intervencion vigente de otra habilitacion.
            this._oIntervencionesVigentes = {};
            this.getView().getModel("HabilitacionModel")
                .setProperty("/IntervencionVigente", this._mapaIntervencionVigente({}));
            // FIN MOD TRNS #PT-18
            try {
                await this.getHabilitacion(Idhabilitacion);
            } catch (e) {
                this.getView().getModel("HabilitacionModel").setProperty("/Busy", false);
                return;
            }
            // INI MOD TRNS #PT-98 - recien aca el modelo Habilitacion ya tiene Empresa, que es
            // el filtro del maestro de puestos.
            this.LoadPuestosFunciones();
            // FIN MOD TRNS #PT-98
            // INI MOD TRNS #PT-98 - Fecha de Inicio de la Habilitacion (solo lectura) en la seccion GPOR.
            // Si Habtecnicas2PT15Set no expone FechaCreacion, el campo quedaria vacio sin dar error, asi
            // que se completa desde la fila seleccionada del listado (que la trae de HabTecnicasSet).
            this._resolverFechaInicioHab();
            // FIN MOD TRNS #PT-98
            if (Idhabilitacion) {
                IntervencionesServices.loadIntervenciones(Idhabilitacion,
                    "H0003",
                    jQuery.proxy(this.SuccessCallBackInt, this),
                    jQuery.proxy(this.ErrorCallBackInt, this)
                );
            }
        },
        // INI MOD TRNS #PT-98 - deja /FechaCreacion como objeto Date para el DatePicker de GPOR.
        _resolverFechaInicioHab: function () {
            var oModel = this.getView().getModel("HabilitacionModel");
            if (!oModel) {
                return;
            }
            var vFecha = oModel.getProperty("/FechaCreacion");
            if (vFecha instanceof Date) {
                // Misma correccion de huso que el resto de las fechas de OData.
                oModel.setProperty("/FechaCreacion", FormatHelper.formatJsonDate(vFecha));
                return;
            }
            if (!vFecha) {
                // La fila del listado ya la trae formateada como dd/MM/yyyy (ver Main.controller).
                var oSeleccion = this.getView().getModel();
                vFecha = oSeleccion && oSeleccion.getProperty("/FechaCreacion");
            }
            if (typeof vFecha === "string" && vFecha) {
                var oParsed = sap.ui.core.format.DateFormat.getDateTimeInstance({
                    pattern: "dd/MM/yyyy"
                }).parse(vFecha);
                oModel.setProperty("/FechaCreacion", oParsed || null);
                return;
            }
            oModel.setProperty("/FechaCreacion", null);
        },
        // FIN MOD TRNS #PT-98
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
                // INI MOD TRNS #PT16 - PT15 se lee de Habtecnicas2PT15Set (con Hab_apmedicoPT15_nav)
                // HabilitacionServices.loadHabilitacion(Idhabilitacion, "H0003", oView, function (error) {
                HabilitacionServices.loadHabilitacionPT15(Idhabilitacion, oView, function (error) {
                // FIN MOD TRNS #PT16
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
            // INI MOD TRNS #PT-27 - defensa en profundidad: try/catch/finally para que una excepcion en el procesamiento no deje el busy colgado
            var oModel = this.getView().getModel("HabilitacionModel");
            try {
            // INI MOD TRNS #PT-18 - editar SOBRESCRIBE la intervencion vigente del rol: por rol hay como
            // mucho UNA fila viva, y ya no se guarda historial. Si el backend devolviera varias (datos
            // previos a este cambio), se toma la MAS RECIENTE por Fechaint+Horaint con desempate explicito.
            // // INI MOD TRNS #PT-18 - cada edicion de un rol crea una intervencion NUEVA (nunca se sobrescribe),
            // // asi que por rol puede haber N filas. La vista muestra la MAS RECIENTE; el resto es historial.
            // // El maximo se calcula explicitamente por Fechaint+Horaint, sin depender del orden de llegada.
            // var oAgrupado = this._agruparUltimaPorRol(Intervenciones);
            // oModel.setProperty("/HistorialPorRol", oAgrupado.historial);
            // // Fechacreacion forma parte de la PK de ZTAB_APROB_HAB: al crear una intervencion nueva hay que
            // // reenviar LA MISMA de las filas existentes de esta habilitacion, no la fecha de hoy.
            // oDataModel.Fechacreacion = this._resolverFechacreacion(Intervenciones);
            // Intervenciones = oAgrupado.ultimas;
            var oAgrupado = this._agruparUltimaPorRol(Intervenciones);
            // De aca salen la PK que se sobrescribe y la fecha base del termino de cada seccion.
            this._oIntervencionesVigentes = oAgrupado.vigentes;
            // Sin intervencion vigente de su rol, la seccion queda bloqueada (ver formatters onEnable*).
            oModel.setProperty("/IntervencionVigente", this._mapaIntervencionVigente(oAgrupado.vigentes));
            Intervenciones = oAgrupado.ultimas;
            // FIN MOD TRNS #PT-18
            // INI MOD TRNS #PT-18 - SOLO Seguridad e Higiene. Su seccion se edita exista o no una
            // intervencion vigente, asi que hay que separar las dos fuentes:
            //  - lo que sale de la INTERVENCION (termino, observacion, firmante) se limpia cuando no
            //    hay ninguna, para que no queden los valores del render anterior;
            //  - lo que sale de la HABILITACION (Hab_SeguridadHigiene_nav) se lee SIEMPRE.
            // El orden importa: primero la limpieza, despues la nav.
            this._limpiarSegHigSinIntervencion(oDataModel, !!oAgrupado.vigentes.SEG_HIG);
            this._cargarSegHigDesdeNav(oDataModel, Habilitacion);
            // FIN MOD TRNS #PT-18
            for (var row in Intervenciones) {
                var roles = Intervenciones[row].Rol;
                if (roles.includes("SOLICITANTE_PT15")) {
                    oDataModel.Solicitador_Firma = "data:image/png;base64," + Intervenciones[row].Firma;
                    // INI MOD TRNS PT-98 - la firma se muestra como el usuario corto de SAP (ej. AZCOIFER),
                    // que el backend graba en Usuario con sy-uname al registrar la intervencion.
                    oDataModel.Solicitador_Usuario = Intervenciones[row].Usuario || "";
                    // FIN MOD TRNS PT-98
                    oDataModel.Solicitador_Nombre = Intervenciones[row].Nombre;
                    oDataModel.Solicitador_Fecha = FormatHelper.formatJsonDate(Intervenciones[row].Fechaint);
                } else if (roles.includes("Habilitado_PT15")) {
                    oDataModel.Habilitado_Firma = "data:image/png;base64," + Intervenciones[row].Firma;
                    // INI MOD TRNS PT-98 - la firma se muestra como el usuario corto de SAP (ej. AZCOIFER),
                    // que el backend graba en Usuario con sy-uname al registrar la intervencion.
                    oDataModel.Habilitado_Usuario = Intervenciones[row].Usuario || "";
                    // FIN MOD TRNS PT-98
                    oDataModel.Habilitado_Nombre = Intervenciones[row].Nombre;
                    oDataModel.Habilitado_Fecha = FormatHelper.formatJsonDate(Intervenciones[row].Fechaint);
                // INI MOD TRNS #XXXXXX - aceptar rol de workflow hab_pt15_* (el sufijo _NNNN lo cubre includes)
                // } else if (roles.includes("COT_COTDT_PT15")) {
                } else if (roles.includes("COT_COTDT_PT15") || roles.includes("hab_pt15_cot")) {
                // FIN MOD TRNS #XXXXXX
                    oDataModel.Capacitador_Firma = "data:image/png;base64," + Intervenciones[row].Firma;
                    // INI MOD TRNS PT-98 - la firma se muestra como el usuario corto de SAP (ej. AZCOIFER),
                    // que el backend graba en Usuario con sy-uname al registrar la intervencion.
                    oDataModel.Capacitador_Usuario = Intervenciones[row].Usuario || "";
                    // FIN MOD TRNS PT-98
                    oDataModel.Capacitador_Nombre = Intervenciones[row].Nombre;
                    oDataModel.Capacitador_Fecha = FormatHelper.formatJsonDate(Intervenciones[row].Fechaint);
                // INI MOD TRNS #XXXXXX - aceptar rol de workflow hab_pt15_* (el sufijo _NNNN lo cubre includes)
                // } else if (roles.includes("MedicinaLaboral_PT15")) {
                } else if (roles.includes("MedicinaLaboral_PT15") || roles.includes("hab_pt15_med-laboral")) {
                // FIN MOD TRNS #XXXXXX
                    // INI MOD TRNS #PT16 - la seccion de Medicina sale del apto (_cargarAptoMedico), no de la intervencion
                    /* oDataModel.Medicina_Firma = "data:image/png;base64," + Intervenciones[row].Firma;
                    oDataModel.Medicina_Nombre = Intervenciones[row].Nombre;
                    oDataModel.Medicina_Fecha = FormatHelper.formatJsonDate(Intervenciones[row].Fechaint);
                    oDataModel.aptoMedicoVisible = true;
                    ValidateAptoMedico = true;
                    if (Habilitacion.Hab_apmedico_nav && Habilitacion.Hab_apmedico_nav.length > 0) {
                        oDataModel.Gradoap = Habilitacion.Hab_apmedico_nav[0].Gradoap;
                        oDataModel.Medicina_Fecha_vencimiento = FormatHelper.formatJsonDate(Habilitacion.Hab_apmedico_nav[0].Vigencia);
                    } */
                    // FIN MOD TRNS #PT16
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
                    // INI MOD TRNS #27.2 DEF-001 - misma regla que habilitacionespt15/Main.controller.js:
                    // (a) el guard "Examen Reprobado" descartaba la intervencion de reprobacion entera
                    //     (firma, nombre, fecha, contador y radios): la seccion C) quedaba en blanco.
                    // (b) APROBADO se persiste vacio tanto para "No" como para "sin responder", asi que
                    //     un examen reprobado se distingue por APROBADO vacio + CONTADOR > 0. La regla
                    //     anterior (bEvaluado: APROBADO no vacio) dejaba los dos radios sin tildar.
                    // (c) firma/nombre/fecha solo se asignan si la intervencion trae firma, para que una
                    //     intervencion sin firma no pise a otra que si la tiene.
                    // (d) la fecha de examen se muestra exista o no aprobacion; el parseo de vencimiento
                    //     queda condicionado a aprobado (la intervencion de reprobacion no trae
                    //     SeguridadHigiene_Fecha_Venc: daba Invalid Date / NaN).
                    // if (Intervenciones[row].Datosadicionales !== "Examen Reprobado") {
                    //     oDataModel.SeguridadHigiene_Firma = "data:image/png;base64," + Intervenciones[row].Firma;
                    //     oDataModel.SeguridadHigiene_Nombre = Intervenciones[row].Nombre;
                    //     oDataModel.SeguridadHigiene_Fecha = FormatHelper.formatJsonDate(Intervenciones[row].Fechaint);
                    //     //var Habilitacion = this.getView().getModel("Habilitacion").getData();
                    //     if (Habilitacion.Hab_SeguridadHigiene_nav[0]) {
                    //         oDataModel.CountEvaluation = Habilitacion.Hab_SeguridadHigiene_nav[0].Contador;
                    //         // INI MOD TRNS #XXXXXX - tildar "No" cuando el examen no esta aprobado.
                    //         // Antes solo se seteaba aprobadoCheck: con Aprobado = false los dos radios
                    //         // quedaban sin tilde y el examen reprobado se veia como "sin evaluar".
                    //         // oDataModel.aprobadoCheck = Habilitacion.Hab_SeguridadHigiene_nav[0].Aprobado;
                    //         var vAprobado = Habilitacion.Hab_SeguridadHigiene_nav[0].Aprobado;
                    //         var bEvaluado = (vAprobado !== undefined && vAprobado !== null && vAprobado !== "");
                    //         oDataModel.aprobadoCheck = (vAprobado === true || vAprobado === "true" || vAprobado === "X");
                    //         oDataModel.reprobadoCheck = bEvaluado && !oDataModel.aprobadoCheck;
                    //         // FIN MOD TRNS #XXXXXX
                    //         oDataModel.SeguridadHigiene_Fecha_examen = FormatHelper.formatJsonDate(Habilitacion.Hab_SeguridadHigiene_nav[0].Vigencia);
                    //     }
                    if (Intervenciones[row].Firma) {
                        oDataModel.SeguridadHigiene_Firma = "data:image/png;base64," + Intervenciones[row].Firma;
                        // INI MOD TRNS PT-98 - la firma se muestra como el usuario corto de SAP (ej. AZCOIFER),
                        // que el backend graba en Usuario con sy-uname al registrar la intervencion.
                        oDataModel.SeguridadHigiene_Usuario = Intervenciones[row].Usuario || "";
                        // FIN MOD TRNS PT-98
                        oDataModel.SeguridadHigiene_Nombre = Intervenciones[row].Nombre;
                        oDataModel.SeguridadHigiene_Fecha = FormatHelper.formatJsonDate(Intervenciones[row].Fechaint);
                    }
                    // INI MOD TRNS #PT-18 - la lectura de Hab_SeguridadHigiene_nav se mudo FUERA de este
                    // branch, a _cargarSegHigDesdeNav (se llama antes del for). Motivo: este branch solo
                    // corre si hay una intervencion vigente de SEG_HIG, y Aprobado / Contador / Vigencia /
                    // Calificacion viven en la HABILITACION, no en la intervencion: se deben leer igual.
                    // Aca se reusa lo que _cargarSegHigDesdeNav ya dejo en el modelo.
                    // // var oSegHig = (Habilitacion.Hab_SeguridadHigiene_nav && Habilitacion.Hab_SeguridadHigiene_nav.length > 0) ?
                    // //     Habilitacion.Hab_SeguridadHigiene_nav[0] : null;
                    // // oDataModel.CountEvaluation = oSegHig ? Number(oSegHig.Contador) || 0 : 0;
                    // // oDataModel.SeguridadHigiene_Calificacion = ... (ver _cargarSegHigDesdeNav)
                    // // var bAprobado = !!oSegHig && (oSegHig.Aprobado === true || oSegHig.Aprobado === "X");
                    // // oDataModel.aprobadoCheck = bAprobado;
                    // // oDataModel.reprobadoCheck = !!oSegHig && !bAprobado && oDataModel.CountEvaluation > 0;
                    // // if (oSegHig) {
                    // //     oDataModel.SeguridadHigiene_Fecha_examen = FormatHelper.formatJsonDate(oSegHig.Vigencia);
                    // // }
                    var bAprobado = !!oDataModel.aprobadoCheck;
                    // FIN MOD TRNS #PT-18
                    // INI MOD TRNS #PT16 - ************************************************************
                    // OJO: los calculos de respaldo del termino (abajo) usaban oDataModel.SeguridadHigiene_Fecha,
                    // que solo se asigna si la intervencion trae Firma (punto (c) de arriba). Con una
                    // intervencion sin firma quedaba undefined y .getFullYear()/.getTime() cortaban la carga
                    // del detalle (T000000073). Se calcula con el Fechaint de la propia intervencion, que es
                    // el mismo valor que SeguridadHigiene_Fecha cuando hay firma.
                    var oFechaBaseSegHig = FormatHelper.formatJsonDate(Intervenciones[row].Fechaint);
                    // FIN MOD TRNS #PT16 - ************************************************************
                    if (bAprobado) {
                        if (Intervenciones[row].Datosadicionales != "") { //Pongo esto porque estan explotando licencias...
                            var extraData = JSON.parse(Intervenciones[row].Datosadicionales);
                            oDataModel.SeguridadHigiene_Fecha_Venc = new Date(extraData.SeguridadHigiene_Fecha_Venc);
                            oDataModel.SeguridadHigiene_Observacion = extraData.SeguridadHigiene_Observacion;
                            // INI MOD TRNS #TP-64 - leer el término real persistido (extraData.SeguridadHigiene_Anio_Venc)
                            // en vez de "adivinarlo" comparando fechas: esa comparación confundía cualquier
                            // múltiplo exacto de 12 meses (ej. 96 meses = 8 años) con un término de año fijo.
                            // El cálculo por fechas queda solo como fallback para intervenciones guardadas
                            // antes de este fix, que no tienen el término persistido.
                            // oDataModel.SeguridadHigiene_Anio_Venc = String(oDataModel.SeguridadHigiene_Fecha_Venc.getFullYear() - oDataModel.SeguridadHigiene_Fecha
                            //     .getFullYear());
                            // //Agrego esto porque no trae bien el termino cuando selecciona mes o dias
                            // if (oDataModel.SeguridadHigiene_Fecha_Venc.getMonth() !== oDataModel.SeguridadHigiene_Fecha.getMonth() || oDataModel.SeguridadHigiene_Fecha_Venc
                            //     .getDate() !== oDataModel.SeguridadHigiene_Fecha.getDate()) {
                            //     //Difiere el mes o el día? entonces no seleccionó año, seleccionó "Otros"
                            //     oDataModel.SeguridadHigiene_Anio_Venc = "0";
                            // }
                            if (extraData.SeguridadHigiene_Anio_Venc !== undefined) {
                                oDataModel.SeguridadHigiene_Anio_Venc = extraData.SeguridadHigiene_Anio_Venc;
                            // INI MOD TRNS #PT16 - ********** OJO: base = Fechaint (ver oFechaBaseSegHig) **********
                            // } else {
                            //     oDataModel.SeguridadHigiene_Anio_Venc = String(oDataModel.SeguridadHigiene_Fecha_Venc.getFullYear() - oDataModel.SeguridadHigiene_Fecha
                            //         .getFullYear());
                            //     //Agrego esto porque no trae bien el termino cuando selecciona mes o dias
                            //     if (oDataModel.SeguridadHigiene_Fecha_Venc.getMonth() !== oDataModel.SeguridadHigiene_Fecha.getMonth() || oDataModel.SeguridadHigiene_Fecha_Venc
                            //         .getDate() !== oDataModel.SeguridadHigiene_Fecha.getDate()) {
                            //         //Difiere el mes o el día? entonces no seleccionó año, seleccionó "Otros"
                            //         oDataModel.SeguridadHigiene_Anio_Venc = "0";
                            //     }
                            // }
                            } else if (oFechaBaseSegHig) {
                                oDataModel.SeguridadHigiene_Anio_Venc = String(oDataModel.SeguridadHigiene_Fecha_Venc.getFullYear() - oFechaBaseSegHig
                                    .getFullYear());
                                //Agrego esto porque no trae bien el termino cuando selecciona mes o dias
                                if (oDataModel.SeguridadHigiene_Fecha_Venc.getMonth() !== oFechaBaseSegHig.getMonth() || oDataModel.SeguridadHigiene_Fecha_Venc
                                    .getDate() !== oFechaBaseSegHig.getDate()) {
                                    //Difiere el mes o el día? entonces no seleccionó año, seleccionó "Otros"
                                    oDataModel.SeguridadHigiene_Anio_Venc = "0";
                                }
                            }
                            // FIN MOD TRNS #PT16 - ****************************************************************
                            // FIN MOD TRNS #TP-64
                        }
                        if (oDataModel.SeguridadHigiene_Anio_Venc === "0") {
                            // INI MOD TRNS #TP-64 - leer Cantidad_Venc/Tiempo_Venc directo de Datosadicionales
                            // en vez de reconstruirlos por diferencia de fechas. El cálculo viejo (abajo, ahora
                            // fallback) solo usaba "oTime" -el resto del mes dentro del año- sin sumar los años
                            // completos transcurridos: por eso, p.ej., 97 meses se mostraba como "1".
                            if (typeof extraData !== "undefined" && extraData.SeguridadHigiene_Cantidad_Venc !== undefined && extraData.SeguridadHigiene_Tiempo_Venc) {
                                oDataModel.SeguridadHigiene_Cantidad_Venc = extraData.SeguridadHigiene_Cantidad_Venc;
                                oDataModel.SeguridadHigiene_Tiempo_Venc = extraData.SeguridadHigiene_Tiempo_Venc;
                            // INI MOD TRNS #PT16 - ********** OJO: base = Fechaint (ver oFechaBaseSegHig) **********
                            // } else {
                            } else if (oFechaBaseSegHig) {
                                // Fallback para intervenciones guardadas antes de este fix
                                // var Diferencia = oDataModel.SeguridadHigiene_Fecha_Venc.getTime() - oDataModel.SeguridadHigiene_Fecha.getTime();
                                var Diferencia = oDataModel.SeguridadHigiene_Fecha_Venc.getTime() - oFechaBaseSegHig.getTime();
                                Diferencia = Math.abs(Diferencia);
                                var Dias = Math.floor(Diferencia / (1000 * 60 * 60 * 24));
                                //Si coincide el día, va el mes
                                // if (oDataModel.SeguridadHigiene_Fecha_Venc.getDate() === oDataModel.SeguridadHigiene_Fecha.getDate()) {
                                //     var oTime = oDataModel.SeguridadHigiene_Fecha_Venc.getMonth() - oDataModel.SeguridadHigiene_Fecha.getMonth();
                                //     var anios = oDataModel.SeguridadHigiene_Fecha_Venc.getFullYear() - oDataModel.SeguridadHigiene_Fecha.getFullYear();
                                if (oDataModel.SeguridadHigiene_Fecha_Venc.getDate() === oFechaBaseSegHig.getDate()) {
                                    var oTime = oDataModel.SeguridadHigiene_Fecha_Venc.getMonth() - oFechaBaseSegHig.getMonth();
                                    var anios = oDataModel.SeguridadHigiene_Fecha_Venc.getFullYear() - oFechaBaseSegHig.getFullYear();
                                // FIN MOD TRNS #PT16 - ****************************************************************
                                    oDataModel.SeguridadHigiene_Tiempo_Venc = "Mes";
                                    oDataModel.SeguridadHigiene_Cantidad_Venc = oTime + anios * 12;
                                } else {
                                    oDataModel.SeguridadHigiene_Tiempo_Venc = "Dia";
                                    // INI MOD TRNS #PT-27 - DiasSegHig no estaba declarada, la variable correcta es Dias
                                    // oDataModel.SeguridadHigiene_Cantidad_Venc = DiasSegHig;
                                    oDataModel.SeguridadHigiene_Cantidad_Venc = Dias;
                                    // FIN MOD TRNS #PT-27
                                }
                            }
                            // FIN MOD TRNS #TP-64
                        }
                    }
                    // FIN MOD TRNS #27.2 DEF-001
                } else if (roles.includes("Examinador1")) {
                    oDataModel.Examinador1_Nombre = Intervenciones[row].Nombre;
                    oDataModel.Examinador1_Fecha = FormatHelper.formatJsonDate(Intervenciones[row].Fechaint);
                    oDataModel.Examinador1_Firma = "data:image/png;base64," + Intervenciones[row].Firma;
                    // INI MOD TRNS PT-98 - la firma se muestra como el usuario corto de SAP (ej. AZCOIFER),
                    // que el backend graba en Usuario con sy-uname al registrar la intervencion.
                    oDataModel.Examinador1_Usuario = Intervenciones[row].Usuario || "";
                    // FIN MOD TRNS PT-98
                } else if (roles.includes("Examinador2")) {
                    oDataModel.Examinador2_Nombre = Intervenciones[row].Nombre;
                    oDataModel.Examinador2_Fecha = FormatHelper.formatJsonDate(Intervenciones[row].Fechaint);
                    oDataModel.Examinador2_Firma = "data:image/png;base64," + Intervenciones[row].Firma;
                    // INI MOD TRNS PT-98 - la firma se muestra como el usuario corto de SAP (ej. AZCOIFER),
                    // que el backend graba en Usuario con sy-uname al registrar la intervencion.
                    oDataModel.Examinador2_Usuario = Intervenciones[row].Usuario || "";
                    // FIN MOD TRNS PT-98
                } else if (roles.includes("Examinador3")) {
                    oDataModel.Examinador3_Nombre = Intervenciones[row].Nombre;
                    oDataModel.Examinador3_Fecha = FormatHelper.formatJsonDate(Intervenciones[row].Fechaint);
                    oDataModel.Examinador3_Firma = "data:image/png;base64," + Intervenciones[row].Firma;
                    // INI MOD TRNS PT-98 - la firma se muestra como el usuario corto de SAP (ej. AZCOIFER),
                    // que el backend graba en Usuario con sy-uname al registrar la intervencion.
                    oDataModel.Examinador3_Usuario = Intervenciones[row].Usuario || "";
                    // FIN MOD TRNS PT-98
                // INI MOD TRNS #XXXXXX - aceptar rol de workflow hab_pt15_* (el sufijo _NNNN lo cubre includes)
                // } else if (roles.includes("Ger_Reg_Jefe_COT")) {
                } else if (roles.includes("Ger_Reg_Jefe_COT") || roles.includes("hab_pt15_ger-reg-jefe-cot")) {
                // FIN MOD TRNS #XXXXXX
                    oDataModel.Gerente_Reg_Firma = "data:image/png;base64," + Intervenciones[row].Firma;
                    // INI MOD TRNS PT-98 - la firma se muestra como el usuario corto de SAP (ej. AZCOIFER),
                    // que el backend graba en Usuario con sy-uname al registrar la intervencion.
                    oDataModel.Gerente_Reg_Usuario = Intervenciones[row].Usuario || "";
                    // FIN MOD TRNS PT-98
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
                    // INI MOD TRNS #PT-18 - leer el TERMINO realmente persistido, con el mismo patron que
                    // #TP-64 aplico en Seguridad e Higiene. Antes el termino se re-derivaba comparando
                    // fechas y Anio/Cantidad/Tiempo no se guardaban en ningun lado. El calculo por
                    // diferencia de fechas queda como fallback para las intervenciones ya grabadas.
                    if (extraDataGR.Gerente_Reg_Anio_Venc !== undefined) {
                        oDataModel.Gerente_Reg_Anio_Venc = extraDataGR.Gerente_Reg_Anio_Venc;
                    } else {
                        oDataModel.Gerente_Reg_Anio_Venc = String(oDataModel.Gerente_Reg_Fecha_Venc.getFullYear() - oDataModel.Gerente_Reg_Fecha.getFullYear());
                        //Agrego esto porque no trae bien el termino cuando selecciona mes o dias
                        if (oDataModel.Gerente_Reg_Fecha_Venc.getMonth() !== oDataModel.Gerente_Reg_Fecha.getMonth() || oDataModel.Gerente_Reg_Fecha_Venc
                            .getDate() !== oDataModel.Gerente_Reg_Fecha.getDate()) {
                            //Difiere el mes o el día? entonces no seleccionó año, seleccionó "Otros"
                            oDataModel.Gerente_Reg_Anio_Venc = "0";
                        }
                    }
                    if (oDataModel.Gerente_Reg_Anio_Venc === "0") {
                        if (extraDataGR.Gerente_Reg_Cantidad_Venc !== undefined && extraDataGR.Gerente_Reg_Tiempo_Venc) {
                            oDataModel.Gerente_Reg_Cantidad_Venc = extraDataGR.Gerente_Reg_Cantidad_Venc;
                            oDataModel.Gerente_Reg_Tiempo_Venc = extraDataGR.Gerente_Reg_Tiempo_Venc;
                        } else {
                            // Fallback para intervenciones guardadas antes de este fix.
                            // OJO: oTime no suma los anios completos transcurridos (mismo sintoma que
                            // #TP-64 corrigio en Seguridad e Higiene). Se deja como estaba: en cuanto la
                            // intervencion se guarda una vez con el termino persistido, esta rama muere.
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
                    }
                    // FIN MOD TRNS #PT-18
                } else if (roles.includes("Ger_Operaciones")) {
                    oDataModel.Ger_Operaciones_Firma = "data:image/png;base64," + Intervenciones[row].Firma;
                    // INI MOD TRNS PT-98 - la firma se muestra como el usuario corto de SAP (ej. AZCOIFER),
                    // que el backend graba en Usuario con sy-uname al registrar la intervencion.
                    oDataModel.Ger_Operaciones_Usuario = Intervenciones[row].Usuario || "";
                    // FIN MOD TRNS PT-98
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
                    // INI MOD TRNS PT-98 - la firma se muestra como el usuario corto de SAP (ej. AZCOIFER),
                    // que el backend graba en Usuario con sy-uname al registrar la intervencion.
                    oDataModel.Gestion_Calidad_Usuario = Intervenciones[row].Usuario || "";
                    // FIN MOD TRNS PT-98
                    oDataModel.Gestion_Calidad_Nombre = Intervenciones[row].Nombre;
                    oDataModel.Gestion_Calidad_Fecha = FormatHelper.formatJsonDate(Intervenciones[row].Fechaint);
                    oDataModel.Gestion_Calidad_Fecha_Habilitacion = FormatHelper.formatJsonDate(Habilitacion.Vigencia);
                    oDataModel.ObservacionGestionCalidad = Intervenciones[row].Datosadicionales;
                // INI MOD TRNS #XXXXXX - aceptar rol de workflow hab_pt15_* (el sufijo _NNNN lo cubre includes)
                // } else if (roles.includes("Rep_Direccion_PT15")) {
                } else if (roles.includes("Rep_Direccion_PT15") || roles.includes("hab_pt15_rep-direccion")) {
                // FIN MOD TRNS #XXXXXX
                    oDataModel.Rep_Direccion_Firma = "data:image/png;base64," + Intervenciones[row].Firma;
                    // INI MOD TRNS PT-98 - la firma se muestra como el usuario corto de SAP (ej. AZCOIFER),
                    // que el backend graba en Usuario con sy-uname al registrar la intervencion.
                    oDataModel.Rep_Direccion_Usuario = Intervenciones[row].Usuario || "";
                    // FIN MOD TRNS PT-98
                    oDataModel.Rep_Direccion_Nombre = Intervenciones[row].Nombre;
                    oDataModel.Rep_Direccion_Fecha = FormatHelper.formatJsonDate(Intervenciones[row].Fechaint);
                    oDataModel.Rep_Direccion_Observacion = Intervenciones[row].Datosadicionales;
                // INI MOD TRNS #XXXXXX - aceptar rol de workflow hab_pt15_* (el sufijo _NNNN lo cubre includes)
                // } else if (roles.includes("Direccion_TecnicaPT15")) {
                } else if (roles.includes("Direccion_TecnicaPT15") || roles.includes("hab_pt15_ger-operacion")) {
                // FIN MOD TRNS #XXXXXX
                    //var Habilitacion = this.getView().getModel("Habilitacion").getData();
                    oDataModel.Direccion_Tecnica_Firma = "data:image/png;base64," + Intervenciones[row].Firma;
                    // INI MOD TRNS PT-98 - la firma se muestra como el usuario corto de SAP (ej. AZCOIFER),
                    // que el backend graba en Usuario con sy-uname al registrar la intervencion.
                    oDataModel.Direccion_Tecnica_Usuario = Intervenciones[row].Usuario || "";
                    // FIN MOD TRNS PT-98
                    oDataModel.Direccion_Tecnica_Nombre = Intervenciones[row].Nombre;
                    oDataModel.Direccion_Tecnica_Fecha_Vigencia = FormatHelper.formatJsonDate(Habilitacion.Vigencia);
                    oDataModel.Direccion_Tecnica_Fecha = FormatHelper.formatJsonDate(Intervenciones[row].Fechaint);
                    // INI MOD TRNS #XXXXXX - la observacion de Dir. Tecnica llega en JSON del rol hab_pt15_ger-operacion
                    // oDataModel.Direccion_Tecnica_Observacion = Intervenciones[row].Datosadicionales;
                    var extraDataDT = {};
                    if (Intervenciones[row].Datosadicionales && Intervenciones[row].Datosadicionales.trim() !== "") {
                        // INI MOD TRNS #PT16 - el rechazo desde el Inbox graba la observacion como texto plano
                        // (no JSON); JSON.parse lanzaba SyntaxError y cortaba la carga del detalle.
                        // extraDataDT = JSON.parse(Intervenciones[row].Datosadicionales);
                        try {
                            extraDataDT = JSON.parse(Intervenciones[row].Datosadicionales) || {};
                        } catch (oErrParse) {
                            extraDataDT = { Ger_Operaciones_Observacion: Intervenciones[row].Datosadicionales };
                        }
                        // FIN MOD TRNS #PT16
                    }
                    oDataModel.Direccion_Tecnica_Observacion = extraDataDT.Ger_Operaciones_Observacion;
                    // FIN MOD TRNS #XXXXXX
                }
            }
            // INI MOD TRNS #PT16
            /* if (ValidateAptoMedico === false && Habilitacion.Hab_apmedico_nav && Habilitacion.Hab_apmedico_nav.length > 0) {
                oDataModel.aptoMedicoVisible = false;
                oDataModel.Gradoap = Habilitacion.Hab_apmedico_nav[0].Gradoap;
                oDataModel.Medicina_Fecha_vencimiento = FormatHelper.formatJsonDate(Habilitacion.Hab_apmedico_nav[0].Vigencia);
                oDataModel.Medicina_Fecha_vencimiento_old = FormatHelper.formatJsonDate(Habilitacion.Hab_apmedico_nav[0].Vigencia);
            } */
            this._cargarAptoMedico();
            // FIN MOD TRNS #PT16
            oModel.updateBindings(true);
            } catch (oException) {
                console.error("### TRNS onBindingIntervenciones - excepcion procesando Intervenciones", oException);
                MessageBox.error("Ha ocurrido un error al procesar los datos de la habilitación. Intente nuevamente.");
            } finally {
                oModel.setProperty("/Busy", false);
                this.LoadRegionesModel();
            }
            // FIN MOD TRNS #PT-27
        },

        // INI MOD TRNS #PT-18 - agrupado de intervenciones por rol
        // Misma clasificacion (y el MISMO orden de evaluacion) que la cadena if/else de
        // onBindingIntervenciones: el match es por substring y hay prefijos que se solapan
        // (p.ej. "Ger_Operaciones" vs "hab_pt15_ger-operacion"), asi que el orden importa.
        _CLASIFICACION_ROLES: [
            { clave: "SOLICITANTE", patrones: ["SOLICITANTE_PT15"] },
            { clave: "HABILITADO", patrones: ["Habilitado_PT15"] },
            { clave: "COT", patrones: ["COT_COTDT_PT15", "hab_pt15_cot"] },
            { clave: "MED_LABORAL", patrones: ["MedicinaLaboral_PT15", "hab_pt15_med-laboral"] },
            { clave: "SEG_HIG", patrones: ["seguridadH_PT15", "hab_pt15_seg-hig"] },
            { clave: "EXAMINADOR1", patrones: ["Examinador1"] },
            { clave: "EXAMINADOR2", patrones: ["Examinador2"] },
            { clave: "EXAMINADOR3", patrones: ["Examinador3"] },
            { clave: "GER_REG", patrones: ["Ger_Reg_Jefe_COT", "hab_pt15_ger-reg-jefe-cot"] },
            { clave: "GER_OPERACIONES", patrones: ["Ger_Operaciones"] },
            { clave: "GEST_CALIDAD", patrones: ["Gestion_Calidad_PT152", "hab_pt15_gest-calidad"] },
            { clave: "REP_DIRECCION", patrones: ["Rep_Direccion_PT15", "hab_pt15_rep-direccion"] },
            { clave: "DIRECCION_TECNICA", patrones: ["Direccion_TecnicaPT15", "hab_pt15_ger-operacion"] }
        ],

        _claveDeRol: function (sRol) {
            if (!sRol) { return null; }
            var oMatch = this._CLASIFICACION_ROLES.find(function (oCfg) {
                return oCfg.patrones.some(function (sPatron) {
                    return sRol.indexOf(sPatron) !== -1;
                });
            });
            return oMatch ? oMatch.clave : null;
        },

        // INI MOD TRNS #PT-18 - Horaint puede llegar como objeto Edm.Time ({ms}, que es lo que
        // deserializa el ODataModel V2) o como string ISO 8601 "PThhHmmMssS". Se normaliza a
        // milisegundos del dia en los dos casos; cualquier otra cosa devuelve null (null = sin dato,
        // NO 0: un 0 se confundiria con medianoche y haria match contra cualquier fila sin hora).
        _horaintAMs: function (vHoraint) {
            if (vHoraint === null || vHoraint === undefined) { return null; }
            if (typeof vHoraint === "object") {
                return (vHoraint.ms === null || vHoraint.ms === undefined) ? null : Number(vHoraint.ms);
            }
            var aPartes = /^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+(?:\.\d+)?)S)?$/.exec(String(vHoraint).trim());
            if (!aPartes) { return null; }
            return (Number(aPartes[1] || 0) * 3600 +
                    Number(aPartes[2] || 0) * 60 +
                    Math.floor(Number(aPartes[3] || 0))) * 1000;
        },

        // La suma Fechaint + Horaint es correcta porque en IntervencionesSet Fechaint viene a
        // medianoche (solo fecha) y la hora va aparte en Horaint.
        // // Clave de orden = ms de Fechaint (Edm.DateTime -> Date) + ms de Horaint (Edm.Time -> {ms}).
        // _claveOrdenIntervencion: function (oInt) {
        //     var t = 0;
        //     if (oInt.Fechaint) {
        //         t += (oInt.Fechaint instanceof Date) ? oInt.Fechaint.getTime() : new Date(oInt.Fechaint).getTime();
        //     }
        //     if (oInt.Horaint && typeof oInt.Horaint === "object" && oInt.Horaint.ms != null) {
        //         t += oInt.Horaint.ms;
        //     }
        //     return t;
        // },
        _claveOrdenIntervencion: function (oInt) {
            var t = 0;
            if (oInt.Fechaint) {
                t += (oInt.Fechaint instanceof Date) ? oInt.Fechaint.getTime() : new Date(oInt.Fechaint).getTime();
            }
            var iHora = this._horaintAMs(oInt.Horaint);
            if (iHora !== null) {
                t += iHora;
            }
            return t;
        },

        // Comparador DESC con desempate EXPLICITO: Array.prototype.sort no garantiza estabilidad ante
        // empate, asi que sin esto la fila "vigente" dependeria del orden en que el backend devuelve
        // las filas. Horaint tiene resolucion de segundo: un empate real solo puede darse entre dos
        // intervenciones del MISMO rol grabadas en el mismo segundo. El criterio (Usuario y despues
        // Rol, descendente) es arbitrario pero DETERMINISTICO: ante los mismos datos, siempre la misma.
        _compararIntervencionesDesc: function (a, b) {
            var iDif = this._claveOrdenIntervencion(b) - this._claveOrdenIntervencion(a);
            if (iDif !== 0) { return iDif; }
            iDif = String(b.Usuario || "").localeCompare(String(a.Usuario || ""));
            if (iDif !== 0) { return iDif; }
            return String(b.Rol || "").localeCompare(String(a.Rol || ""));
        },
        // FIN MOD TRNS #PT-18

        // INI MOD TRNS #PT-18 - con la sobrescritura ya no hay historial por rol: cada rol tiene como
        // mucho UNA intervencion vigente, que es la que se edita. Se devuelve { ultimas, vigentes },
        // donde vigentes es el mapa clave de _CLASIFICACION_ROLES -> fila a sobrescribir.
        // // Devuelve { ultimas: [fila mas reciente de cada rol], historial: { clave: [filas DESC] } }.
        // // _agruparUltimaPorRol: function (aInt) {
        // //     var that = this;
        // //     var oHistorial = {};
        // //     (aInt || []).forEach(function (oInt) {
        // //         var sClave = that._claveDeRol(oInt.Rol);
        // //         if (!sClave) { return; }
        // //         if (!oHistorial[sClave]) { oHistorial[sClave] = []; }
        // //         oHistorial[sClave].push(oInt);
        // //     });
        // //     var aUltimas = [];
        // //     Object.keys(oHistorial).forEach(function (sClave) {
        // //         oHistorial[sClave].sort(function (a, b) {
        // //             return that._claveOrdenIntervencion(b) - that._claveOrdenIntervencion(a);
        // //         });
        // //         aUltimas.push(oHistorial[sClave][0]);
        // //     });
        // //     return { ultimas: aUltimas, historial: oHistorial };
        // // },
        // Las filas cuyo Rol no matchea ninguna clave se descartan (la cadena if/else tampoco las usa).
        _agruparUltimaPorRol: function (aInt) {
            var that = this;
            var oPorClave = {};
            (aInt || []).forEach(function (oInt) {
                var sClave = that._claveDeRol(oInt.Rol);
                if (!sClave) { return; }
                if (!oPorClave[sClave]) { oPorClave[sClave] = []; }
                oPorClave[sClave].push(oInt);
            });
            var aUltimas = [];
            var oVigentes = {};
            Object.keys(oPorClave).forEach(function (sClave) {
                oPorClave[sClave].sort(jQuery.proxy(that._compararIntervencionesDesc, that));
                oVigentes[sClave] = oPorClave[sClave][0];
                aUltimas.push(oPorClave[sClave][0]);
            });
            return { ultimas: aUltimas, vigentes: oVigentes };
        },

        // Mapa clave -> booleano que publica onBindingIntervenciones en
        // HabilitacionModel>/IntervencionVigente. Los formatters de seccion lo reciben como un part mas
        // del binding; por eso se inicializan TODAS las claves: si el path no existe, el binding no se
        // revalua cuando llegan las intervenciones y la seccion quedaria bloqueada para siempre.
        _mapaIntervencionVigente: function (oVigentes) {
            var oMapa = {};
            this._CLASIFICACION_ROLES.forEach(function (oCfg) {
                oMapa[oCfg.clave] = false;
            });
            Object.keys(oVigentes || {}).forEach(function (sClave) {
                oMapa[sClave] = true;
            });
            return oMapa;
        },

        // INI MOD TRNS #PT-18 - SOLO Seguridad e Higiene. Aprobado, Contador, Vigencia (fecha de examen)
        // y Calificacion salen de Hab_SeguridadHigiene_nav, que es parte de la HABILITACION: se leen
        // haya o no intervencion vigente de SEG_HIG.
        _cargarSegHigDesdeNav: function (oDataModel, Habilitacion) {
            var oSegHig = (Habilitacion && Habilitacion.Hab_SeguridadHigiene_nav &&
                           Habilitacion.Hab_SeguridadHigiene_nav.length > 0) ?
                Habilitacion.Hab_SeguridadHigiene_nav[0] : null;
            oDataModel.CountEvaluation = oSegHig ? Number(oSegHig.Contador) || 0 : 0;
            // La vista no muestra Calificacion, pero el backend graba ZTAB_SEGHIGIENE con un MODIFY de
            // la nav tal cual llega y reemplaza la fila entera: si no se reenvia, se pierde. Se guarda
            // en el modelo SOLO para devolverla igual. Calificacion es Edm.Byte: con "" Gateway falla la
            // conversion, asi que sin valor numerico queda undefined y el guardado NO manda la
            // propiedad (ver onGuardarSegHig).
            oDataModel.SeguridadHigiene_Calificacion =
                (oSegHig && oSegHig.Calificacion !== undefined && oSegHig.Calificacion !== null &&
                 oSegHig.Calificacion !== "" && !isNaN(Number(oSegHig.Calificacion))) ?
                    Number(oSegHig.Calificacion) : undefined;
            var bAprobado = !!oSegHig && (oSegHig.Aprobado === true || oSegHig.Aprobado === "X");
            oDataModel.aprobadoCheck = bAprobado;
            oDataModel.reprobadoCheck = !!oSegHig && !bAprobado && oDataModel.CountEvaluation > 0;
            // Sin fila de nav no hay fecha de examen. Antes quedaba el valor que hubiera en el modelo.
            oDataModel.SeguridadHigiene_Fecha_examen = oSegHig ?
                FormatHelper.formatJsonDate(oSegHig.Vigencia) : null;
        },

        // SOLO Seguridad e Higiene: sin intervencion vigente de SEG_HIG, los campos que salen de la
        // INTERVENCION no tienen de donde leerse. Antes la seccion quedaba bloqueada y no importaba;
        // ahora es editable, asi que hay que dejarla en blanco en vez de mostrar lo que haya quedado.
        // Aprobado / reprobado / Fecha_examen / Contador NO se tocan aca: salen de la nav
        // (ver _cargarSegHigDesdeNav, que corre despues).
        _limpiarSegHigSinIntervencion: function (oDataModel, bVigente) {
            if (bVigente) { return; }
            oDataModel.SeguridadHigiene_Anio_Venc = "";
            oDataModel.SeguridadHigiene_Cantidad_Venc = "";
            oDataModel.SeguridadHigiene_Tiempo_Venc = "";
            oDataModel.SeguridadHigiene_Observacion = "";
            oDataModel.SeguridadHigiene_Fecha_Venc = null;
            oDataModel.SeguridadHigiene_Nombre = "";
            oDataModel.SeguridadHigiene_Fecha = null;
            oDataModel.SeguridadHigiene_Firma = "";
            oDataModel.SeguridadHigiene_Usuario = "";
        },
        // FIN MOD TRNS #PT-18

        // INI MOD TRNS #PT-18 - REACTIVADA, y SOLO para el ALTA de la primera intervencion de Seguridad
        // e Higiene (_crearPrimeraIntervencion). En la sobrescritura sigue sin usarse: ahi Fechacreacion
        // sale TAL CUAL de la fila leida de IntervencionesPT15Set.
        // Fechacreacion es parte de la PK de ZTAB_APROB_HAB y la comparten todas las filas de esta
        // habilitacion: al crear una fila nueva hay que reenviar LA MISMA, no la fecha de hoy.
        //
        // OJO: las filas tienen que venir de IntervencionesPT15Set, NO del modelo "Intervenciones"
        // (IntervencionesSet). Ese set devuelve Fechacreacion a medianoche UTC (verificado en QAS:
        // /Date(1790640000000)/); el create de IntervencionesPT15Set la convierte con sy-zonlo (UTC-3)
        // y la grabaria con el DIA ANTERIOR, distinta de la del resto de las filas.
        //
        // Como todas las filas de la habilitacion comparten Fechacreacion, alcanza con la primera que
        // la traiga: por eso ya no hace falta el sort por _claveOrdenIntervencion que tenia 0bf831e
        // (que ademas no aplica a este set, donde Fechaint ya incluye la hora).
        // // Fechacreacion de la habilitacion: la comparten todas las filas de ZTAB_APROB_HAB de esta
        // // habilitacion. Se toma de la fila mas reciente que la traiga; si ninguna la trae, hoy.
        // _resolverFechacreacion: function (aInt) {
        //     var that = this;
        //     var aConFecha = (aInt || []).filter(function (oInt) {
        //         return !!oInt.Fechacreacion;
        //     });
        //     if (!aConFecha.length) { return new Date(); }
        //     aConFecha.sort(function (a, b) {
        //         return that._claveOrdenIntervencion(b) - that._claveOrdenIntervencion(a);
        //     });
        //     return aConFecha[0].Fechacreacion;
        // },
        _resolverFechacreacion: function (aFilasPT15) {
            var oConFecha = (aFilasPT15 || []).find(function (oFila) {
                return !!oFila.Fechacreacion;
            });
            return oConFecha ? oConFecha.Fechacreacion : new Date();
        },
        // FIN MOD TRNS #PT-18

        // INI MOD TRNS #PT16 - seccion de Medicina a partir del apto (Hab_apmedicoPT15_nav, objeto o null).
        // Que apto llega lo decide el backend segun el estado de la licencia; si viene null, los campos van en blanco.
        // Fecha = apto.Fecha; Aclaracion y Firma = FirmasUsuariosSet('<apto.Usuario>'); sin Usuario, en blanco.
        _cargarAptoMedico: function () {
            var that = this;
            var oModel = this.getView().getModel("HabilitacionModel");
            var oDataModel = oModel.getData();
            var Habilitacion = this.getView().getModel("Habilitacion").getData();
            var oApto = Habilitacion ? Habilitacion.Hab_apmedicoPT15_nav : null;
            if (!oApto || oApto.__deferred) {
                oApto = null;
            }
            oDataModel.Gradoap = oApto && oApto.GradoAp ? oApto.GradoAp : "";
            oDataModel.Medicina_Fecha_vencimiento = oApto && oApto.Vigencia ? FormatHelper.formatJsonDate(oApto.Vigencia) : null;
            oDataModel.Medicina_Fecha_vencimiento_old = oDataModel.Medicina_Fecha_vencimiento;
            oDataModel.Medicina_Nombre = "";
            oDataModel.Medicina_Firma = "";
            // INI MOD TRNS PT-98 - el usuario corto del apto es la key de FirmasUsuariosSet
            oDataModel.Medicina_Usuario = "";
            // FIN MOD TRNS PT-98
            oDataModel.Medicina_Fecha = null;
            var sUsuario = oApto && oApto.Usuario ? oApto.Usuario : "";
            this._sUsuarioFirmaApto = sUsuario;
            if (!sUsuario) {
                return;
            }
            oDataModel.Medicina_Fecha = oApto.Fecha ? FormatHelper.formatJsonDate(oApto.Fecha) : null;
            // INI MOD TRNS PT-98
            oDataModel.Medicina_Usuario = sUsuario;
            // FIN MOD TRNS PT-98
            FirmasUsuariosServices.loadSignatureByUser(sUsuario, function (data) {
                if (that._sUsuarioFirmaApto !== sUsuario) {
                    return;
                }
                oDataModel.Medicina_Nombre = data.UserName || "";
                oDataModel.Medicina_Firma = that._formatFirma(data.Firma, data.FirmaType);
                oModel.updateBindings(true);
            }, function () {
                // Sin firma registrada para el usuario: aclaracion y firma quedan en blanco
            });
        },
        // Imagen de la firma segun FirmaType ("image/png" o "png"); sin tipo, el png que se usaba antes
        _formatFirma: function (sFirma, sFirmaType) {
            if (!sFirma) {
                return "";
            }
            var sMime = "image/png";
            if (sFirmaType) {
                sMime = sFirmaType.indexOf("/") > -1 ? sFirmaType : "image/" + sFirmaType.toLowerCase();
            }
            return "data:" + sMime + ";base64," + sFirma;
        },
        // FIN MOD TRNS #PT16
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
        // INI MOD TRNS PT-98 - el logo de la sociedad se resolvia con src="/img/<Empresa>.png": una ruta
        // absoluta desde la raiz del servidor, que fuera de local da 404 y deja el encabezado vacio.
        // Se resuelve contra el namespace de la app, igual que en cargahabpt15/habilitacionespt15.
        // Empresa no viene normalizada (Main.controller la compara con indexOf), asi que se busca por
        // contenido y no por igualdad; si no se reconoce, se devuelve undefined y la imagen no se pinta.
        formatLogoSociedad: function (sEmpresa) {
            if (!sEmpresa) {
                return undefined;
            }
            var sNorm = String(sEmpresa).toUpperCase();
            var sLogo = sNorm.indexOf("TRANSENER") >= 0 ? "TRANSENER" :
                (sNorm.indexOf("TRANSBA") >= 0 ? "TRANSBA" : "");
            if (!sLogo) {
                return undefined;
            }
            return sap.ui.require.toUrl("transener/GestionHabilitaciones/img/") + sLogo + ".png";
        },
        // FIN MOD TRNS PT-98
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
            // Una intervención sin archivos puede devolver AdjuntosSet = null.
            // El formatter se ejecuta al refrescar el modelo, antes de cerrar el busy.
            return !!(adjuntos && Array.isArray(adjuntos.results) && adjuntos.results.length > 0);
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
                // INI MOD TRNS #PT16 - sin vigencia de cabecera: el backend conserva la grabada
                // Vigencia: habilitacion.Vigencia
                Vigencia: null
                // FIN MOD TRNS #PT16
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
            // INI MOD TRNS #PT16 - POST plano (sin navs) a Habtecnicas2PT15Set, a proposito: el create plano
            // tiene la logica de cambio de estado de PT15
            // HabilitacionServices.saveHabilitacion(data,
            HabilitacionServices.saveHabilitacionPT15(data,
            // FIN MOD TRNS #PT16
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
        // INI MOD TRNS #XXXXXX - edicion por rol PT15
        _normalizarRoles: function (vRoles) {
            if (!vRoles) { return []; }
            if (Array.isArray(vRoles)) { return vRoles; }
            if (typeof vRoles === "string") { return [vRoles]; }
            return [];
        },

        _normalizarUO: function (vUO) {
            if (vUO === null || vUO === undefined) { return ""; }
            return String(vUO).trim();
        },

        // INI MOD TRNS #PT-18 - los resolvers devuelven el LITERAL del grupo de IAS (no un booleano):
        // ese string es el que se guarda en el campo ROL de la intervencion, tal cual, con sufijo de region.
        _resolverRolGlobal: function (vRoles, aNombres) {
            var aRoles = this._normalizarRoles(vRoles);
            var sMatch = aNombres.find(function (s) {
                return aRoles.indexOf(s) !== -1;   // match EXACTO
            });
            return sMatch || null;
        },

        _resolverRolRegional: function (vRoles, sPrefijo, vUO, aLegacy) {
            var aRoles  = this._normalizarRoles(vRoles);
            var sUO     = this._normalizarUO(vUO);
            var sEsperado = sPrefijo + "_" + sUO;

            if (aRoles.indexOf(sEsperado) !== -1) {
                return sEsperado;
            }

            // Fallback tolerante a ceros a la izquierda / padding
            if (sUO) {
                var sSinCeros = sPrefijo + "_" + sUO.replace(/^0+/, "");
                if (aRoles.indexOf(sSinCeros) !== -1) {
                    return sSinCeros;
                }
            }

            // Roles legacy sin region (compatibilidad hacia atras)
            if (aLegacy && aLegacy.length) {
                return this._resolverRolGlobal(aRoles, aLegacy);
            }

            return null;
        },

        // INI MOD TRNS #PT-18 - originales de 3dc9b09 (los borro 0bf831e al introducir los resolvers
        // que devuelven el literal del rol). Se restauran comentados, con su console.log de diagnostico.
        // _tieneRolGlobal: function (vRoles, aNombres) {
        //     var aRoles = this._normalizarRoles(vRoles);
        //     return aNombres.some(function (s) {
        //         return aRoles.indexOf(s) !== -1;   // match EXACTO
        //     });
        // },
        //
        // _tieneRolRegional: function (vRoles, sPrefijo, vUO, aLegacy) {
        //     var aRoles  = this._normalizarRoles(vRoles);
        //     var sUO     = this._normalizarUO(vUO);
        //     var sEsperado = sPrefijo + "_" + sUO;
        //
        //     var bMatch = aRoles.indexOf(sEsperado) !== -1;
        //
        //     // Fallback tolerante a ceros a la izquierda / padding
        //     if (!bMatch && sUO) {
        //         var sUOsinCeros = sUO.replace(/^0+/, "");
        //         bMatch = aRoles.indexOf(sPrefijo + "_" + sUOsinCeros) !== -1;
        //     }
        //
        //     // Roles legacy sin region (compatibilidad hacia atras)
        //     if (!bMatch && aLegacy && aLegacy.length) {
        //         bMatch = this._tieneRolGlobal(aRoles, aLegacy);
        //     }
        //
        //     console.log("### TRNS-DIAG regional | prefijo:", sPrefijo,
        //                 "| UO:", JSON.stringify(sUO),
        //                 "| esperado:", sEsperado,
        //                 "| roles:", JSON.stringify(aRoles),
        //                 "| match:", bMatch);
        //     return bMatch;
        // },
        // FIN MOD TRNS #PT-18
        _tieneRolGlobal: function (vRoles, aNombres) {
            return this._resolverRolGlobal(vRoles, aNombres) !== null;
        },

        _tieneRolRegional: function (vRoles, sPrefijo, vUO, aLegacy) {
            return this._resolverRolRegional(vRoles, sPrefijo, vUO, aLegacy) !== null;
        },
        // FIN MOD TRNS #PT-18

        // INI MOD TRNS #PT-18 - definicion funcional cerrada: lista de PERMITIDOS (ver
        // ESTADOS_EDITABLES_PT15 al tope). Antes era una lista de bloqueados heredada de
        // onEnableRol3 que incluia "N", y "N" es el estado en el que corre todo el workflow:
        // eso dejaba las cinco secciones de solo lectura justo cuando hay que cargarlas.
        // Cambio de comportamiento: con Estado vacio o desconocido ahora devuelve false
        // (antes true). Ningun camino del frontend produce un Estado vacio; la unica ventana
        // en que llega undefined es antes de que cargue el modelo Habilitacion, y se corrige
        // sola cuando HabilitacionServices hace setModel y revalua los bindings.
        // _estadoPermiteEdicion: function (vEstado) {
        //     // PENDIENTE DEFINICION FUNCIONAL (Ivan): misma regla que
        //     // onEnableRol3. Si alguna seccion necesita otra lista,
        //     // parametrizar aca.
        //     var aBloqueados = ["C", "D", "F", "N"];
        //     return aBloqueados.indexOf(this._normalizarUO(vEstado)) === -1;
        // },
        _estadoPermiteEdicion: function (vEstado) {
            return this.ESTADOS_EDITABLES_PT15.indexOf(this._normalizarUO(vEstado)) !== -1;
        },
        // FIN MOD TRNS #PT-18

        // INI MOD TRNS #PT-18 - ademas del rol y del estado, GER_REG, GEST_CALIDAD y REP_DIRECCION
        // exigen que exista una intervencion VIGENTE de ese rol: si el rol todavia no intervino, no hay
        // fila que sobrescribir. Dos excepciones: Medicina Laboral (no escribe intervencion: su dato
        // vive en la habilitacion) y Seguridad e Higiene (si no hay intervencion vigente, el guardado
        // la da de ALTA; ver onGuardarSegHig / _crearPrimeraIntervencion).
        // Original de este bloque, cuando las cuatro exigian vigencia:
        // // ademas del rol y del estado, las CUATRO secciones que editan una intervencion exigen que
        // // exista una intervencion VIGENTE de ese rol: si el rol todavia no intervino, no hay fila
        // // que sobrescribir. Medicina Laboral es la excepcion (no escribe intervencion: su dato vive
        // // en la habilitacion), asi que onEnableMedLaboral no cambia.
        // bVigente llega como un part mas del binding: HabilitacionModel>/IntervencionVigente/<CLAVE>.
        // La "vigencia" se evalua por CLAVE de _CLASIFICACION_ROLES, no por igualdad del literal del
        // rol: una intervencion cargada por el workflow (hab_pt15_seg-hig_1234) habilita la seccion
        // al usuario con el rol legacy equivalente (seguridadH_PT15) y viceversa.

        // GLOBALES (sin region)
        onEnableMedLaboral: function (vRoles, vEstado) {
            if (!this._estadoPermiteEdicion(vEstado)) { return false; }
            return this._tieneRolGlobal(vRoles,
                ["hab_pt15_med-laboral", "MedicinaLaboral_PT15", "Medicina_Laboral"]);
        },

        // onEnableRepDireccion: function (vRoles, vEstado) {
        //     if (!this._estadoPermiteEdicion(vEstado)) { return false; }
        //     return this._tieneRolGlobal(vRoles,
        //         ["hab_pt15_rep-direccion", "Rep_Direccion_PT15"]);
        // },
        onEnableRepDireccion: function (vRoles, vEstado, bVigente) {
            if (!bVigente) { return false; }
            if (!this._estadoPermiteEdicion(vEstado)) { return false; }
            return this._tieneRolGlobal(vRoles,
                ["hab_pt15_rep-direccion", "Rep_Direccion_PT15"]);
        },

        // REGIONALES (requieren UO)
        // onEnableSegHig: function (vRoles, vUO, vEstado) {
        //     if (!this._estadoPermiteEdicion(vEstado)) { return false; }
        //     return this._tieneRolRegional(vRoles, "hab_pt15_seg-hig", vUO,
        //         ["seguridadH_PT15"]);
        // },
        // INI MOD TRNS #PT-18 - Seguridad e Higiene ya NO exige intervencion vigente: sin ella el
        // guardado da de alta la intervencion. Se conservan rol, region y ESTADOS_EDITABLES_PT15.
        // La vista sigue pasando HabilitacionModel>/IntervencionVigente/SEG_HIG como 4to part en los 13
        // bindings de la seccion: queda SIN EFECTO (JS ignora el argumento sobrante) y se deja tal cual
        // para no tocar la vista. El part de mas no molesta: solo fuerza una revaluacion extra.
        // // onEnableSegHig: function (vRoles, vUO, vEstado, bVigente) {
        // //     if (!bVigente) { return false; }
        // //     if (!this._estadoPermiteEdicion(vEstado)) { return false; }
        // //     return this._tieneRolRegional(vRoles, "hab_pt15_seg-hig", vUO,
        // //         ["seguridadH_PT15"]);
        // // },
        onEnableSegHig: function (vRoles, vUO, vEstado) {
            if (!this._estadoPermiteEdicion(vEstado)) { return false; }
            return this._tieneRolRegional(vRoles, "hab_pt15_seg-hig", vUO,
                ["seguridadH_PT15"]);
        },

        // onEnableGerReg: function (vRoles, vUO, vEstado) {
        //     if (!this._estadoPermiteEdicion(vEstado)) { return false; }
        //     return this._tieneRolRegional(vRoles, "hab_pt15_ger-reg-jefe-cot", vUO,
        //         ["Ger_Reg_Jefe_COT", "PT15_GerRegional"]);
        // },
        onEnableGerReg: function (vRoles, vUO, vEstado, bVigente) {
            if (!bVigente) { return false; }
            if (!this._estadoPermiteEdicion(vEstado)) { return false; }
            return this._tieneRolRegional(vRoles, "hab_pt15_ger-reg-jefe-cot", vUO,
                ["Ger_Reg_Jefe_COT", "PT15_GerRegional"]);
        },

        // onEnableGestCalidad: function (vRoles, vUO, vEstado) {
        //     if (!this._estadoPermiteEdicion(vEstado)) { return false; }
        //     return this._tieneRolRegional(vRoles, "hab_pt15_gest-calidad", vUO,
        //         ["Gestion_Calidad_PT152", "Gestion_Calidad_PT15"]);
        // },
        // TODO fuera de alcance PT-18: el legacy "Gestion_Calidad_PT15" se acepta aca y en
        // _rolDeSeccion, pero la cadena if/else de onBindingIntervenciones solo matchea
        // "Gestion_Calidad_PT152", asi que una intervencion con ese rol exacto no se muestra.
        onEnableGestCalidad: function (vRoles, vUO, vEstado, bVigente) {
            if (!bVigente) { return false; }
            if (!this._estadoPermiteEdicion(vEstado)) { return false; }
            return this._tieneRolRegional(vRoles, "hab_pt15_gest-calidad", vUO,
                ["Gestion_Calidad_PT152", "Gestion_Calidad_PT15"]);
        },
        // FIN MOD TRNS #PT-18

        // ELIMINADA TRNS #PT-18 - onEnableGuardar habilitaba el boton unico del footer si el usuario
        // podia editar AL MENOS una seccion. Ahora hay un boton por seccion con su propio formatter.
        // Original de 3dc9b09, restaurado comentado:
        // // Habilita el boton Guardar si el usuario puede editar
        // // AL MENOS una seccion
        // onEnableGuardar: function (vRoles, vUO, vEstado) {
        //     return this.onEnableMedLaboral(vRoles, vEstado)
        //         || this.onEnableRepDireccion(vRoles, vEstado)
        //         || this.onEnableSegHig(vRoles, vUO, vEstado)
        //         || this.onEnableGerReg(vRoles, vUO, vEstado)
        //         || this.onEnableGestCalidad(vRoles, vUO, vEstado);
        // },

        onChangeDateSeguridadHigiene: function (oEvent) {
            console.log("### TRNS-DIAG onChangeDateSeguridadHigiene (stub)",
                        oEvent.getSource().getSelectedKey());
        },
        onChangeTimeSeguridadHigiene: function (oEvent) {
            console.log("### TRNS-DIAG onChangeTimeSeguridadHigiene (stub)",
                        oEvent.getSource().getSelectedKey());
        },
        // INI MOD TRNS #XXXXXX - mantener excluyentes los dos radios de Aprobado (Seguridad e Higiene).
        // Cada uno esta bindeado a una propiedad distinta del modelo, asi que hay que apagar
        // la otra a mano; si no, el estado del modelo queda inconsistente con lo que se ve.
        onSelectApprobate: function (oEvent) {
            if (!oEvent.getSource().getSelected()) { return; }
            var oModel = this.getView().getModel("HabilitacionModel");
            oModel.setProperty("/aprobadoCheck", true);
            oModel.setProperty("/reprobadoCheck", false);
        },
        // INI MOD TRNS #PT-18 - original de 3dc9b09 (stub), restaurado comentado
        // onSelectReprobate: function (oEvent) {
        //     console.log("### TRNS-DIAG onSelectReprobate (stub)");
        // },
        // FIN MOD TRNS #PT-18
        onSelectReprobate: function (oEvent) {
            if (!oEvent.getSource().getSelected()) { return; }
            var oModelRep = this.getView().getModel("HabilitacionModel");
            oModelRep.setProperty("/aprobadoCheck", false);
            oModelRep.setProperty("/reprobadoCheck", true);
        },
        // FIN MOD TRNS #XXXXXX
        onChangeDateGerRegional: function (oEvent) {
            console.log("### TRNS-DIAG onChangeDateGerRegional (stub)",
                        oEvent.getSource().getSelectedKey());
        },
        onChangeTimeGerRegional: function (oEvent) {
            console.log("### TRNS-DIAG onChangeTimeGerRegional (stub)",
                        oEvent.getSource().getSelectedKey());
        },
        // FIN MOD TRNS #XXXXXX

        // INI MOD TRNS #PT-18 - guardado por seccion
        // Cada seccion resuelve el literal del grupo de IAS del usuario (con sufijo de region cuando
        // corresponde). Ese string es el que va al campo ROL de la intervencion.
        _rolDeSeccion: function (sSeccion) {
            var vRoles = this.getView().getModel("UserJsonModelVISTA").getData().User[0].roles;
            var vUO = this.getView().getModel("Habilitacion").getData().Area;
            switch (sSeccion) {
            case "MED_LABORAL":
                return this._resolverRolGlobal(vRoles,
                    ["hab_pt15_med-laboral", "MedicinaLaboral_PT15", "Medicina_Laboral"]);
            case "REP_DIRECCION":
                return this._resolverRolGlobal(vRoles,
                    ["hab_pt15_rep-direccion", "Rep_Direccion_PT15"]);
            case "SEG_HIG":
                return this._resolverRolRegional(vRoles, "hab_pt15_seg-hig", vUO,
                    ["seguridadH_PT15"]);
            case "GER_REG":
                return this._resolverRolRegional(vRoles, "hab_pt15_ger-reg-jefe-cot", vUO,
                    ["Ger_Reg_Jefe_COT", "PT15_GerRegional"]);
            case "GEST_CALIDAD":
                return this._resolverRolRegional(vRoles, "hab_pt15_gest-calidad", vUO,
                    ["Gestion_Calidad_PT152", "Gestion_Calidad_PT15"]);
            default:
                return null;
            }
        },

        // INI MOD TRNS #PT-18 - SOBRESCRITURA de la intervencion vigente del rol.
        // UPDATE_ENTITY del backend lanza not_implemented, pero un POST a IntervencionesPT15Set con la
        // PK de una fila EXISTENTE no da de alta: el backend toma la fila de la base y reemplaza SOLO
        // Datosadicionales. Usuario, Firma, Nombre, Accion, Legajo e Idadjuntos se conservan desde la
        // base, y no se registra quien corrigio. Con cualquier otra PK hace un alta normal.
        //
        // OJO: la PK NO se puede armar con lo que devuelve IntervencionesSet (lo que lee la vista). Ahi
        // Fechaint viene SOLO fecha, a medianoche UTC, y la hora va aparte en Horaint; la escritura
        // espera Fechaint con fecha + hora. Reenviar ese Fechaint daria de alta una fila nueva. Por eso
        // se releen las filas de IntervencionesPT15Set y se busca la que coincide con la vigente en
        // Rol + Usuario + Horaint, normalizando Horaint a milisegundos de los dos lados.
        //
        // // UPDATE_ENTITY del backend lanza not_implemented: TODO guardado de intervencion va por create().
        // // El backend pisa Usuario con sy-uname y genera un Idadjuntos por cada create (aca se ignora:
        // // estos handlers no suben archivos). La unicidad de la fila la dan Fechaint + Horaint.
        // _crearIntervencion: function (sRol, sDatosadicionales, fnOk, fnError) {
        //     var oHab = this.getView().getModel("Habilitacion").getData();
        //     var oDatos = this.getView().getModel("HabilitacionModel").getData();
        //     var oUserData = this.getView().getModel("UserData");
        //     var oUser = oUserData ? oUserData.getData() : {};
        //     var oAhora = new Date();
        //     var oPayload = {
        //         "Idhabilitacion": oHab.Idhabilitacion,
        //         "Clasehab": "H0003",
        //         "Legajo": oHab.Interno ? oHab.Legajo : oHab.Documento,
        //         "Fechacreacion": oDatos.Fechacreacion || oAhora,
        //         "Rol": sRol,
        //         "Fechaint": oAhora,
        //         "Horaint": "PT" + oAhora.getHours() + "H" + oAhora.getMinutes() + "M" + oAhora.getSeconds() + "S",
        //         "Datosadicionales": sDatosadicionales || "",
        //         "Firma": (oUser && oUser.Firma) || "",
        //         "Nombre": (oUser && oUser.UserName) || "",
        //         "Empresa": oHab.Empresa,
        //         "Accion": "",
        //         "Usuario": ""
        //     };
        //     IntervencionesServices.SaveIntervencionPT15(oPayload, fnOk, fnError);
        // },
        // INI MOD TRNS #PT-18 - ALTA de la PRIMERA intervencion de una seccion. Hoy la usa SOLO
        // Seguridad e Higiene: GER_REG, GEST_CALIDAD y REP_DIRECCION siguen siendo solo sobrescritura y
        // quedan bloqueadas si el rol no intervino. Es _crearIntervencion de 0bf831e con cuatro cambios:
        //  (1) recibe la SECCION y resuelve el literal del rol con _rolDeSeccion (ya validado no-nulo
        //      por _iniciarGuardado);
        //  (2) recibe la Fechaint ya calculada, para que la fila y la base del termino se graben con el
        //      MISMO instante (ver onGuardarSegHig);
        //  (3) Fechacreacion se resuelve releyendo IntervencionesPT15Set (el MISMO read que usa
        //      _sobrescribirIntervencion), no desde el modelo "Intervenciones": ver _resolverFechacreacion;
        //  (4) si ese read falla, se aborta ANTES del create, con el mismo patron que la sobrescritura.
        // La PK (Rol + Fechaint + Horaint de ahora) no puede colisionar con una fila existente, asi que
        // esto es siempre un alta y nunca la sobrescritura encubierta que hace el backend ante PK igual.
        // El backend pisa Usuario con sy-uname; Firma y Nombre del payload son los que registran QUIEN
        // firmo, y por eso van los del usuario logueado (UserData).
        _crearPrimeraIntervencion: function (sSeccion, sDatosadicionales, oFechaInt, fnOk, fnError) {
            var that = this;
            var oHab = this.getView().getModel("Habilitacion").getData();
            var oUserData = this.getView().getModel("UserData");
            var oUser = oUserData ? oUserData.getData() : {};
            // Mismo filtro que la lectura: Idhabilitacion + Clasehab (literal 'H0003').
            IntervencionesServices.loadIntervencionesPT15ByHab(oHab.Idhabilitacion, "H0003", function (data) {
                var aFilas = (data && data.results) || [];
                var oPayload = {
                    "Idhabilitacion": oHab.Idhabilitacion,
                    "Clasehab": "H0003",
                    "Legajo": oHab.Interno ? oHab.Legajo : oHab.Documento,
                    "Fechacreacion": that._resolverFechacreacion(aFilas),
                    "Rol": that._rolDeSeccion(sSeccion),
                    "Fechaint": oFechaInt,
                    "Horaint": "PT" + oFechaInt.getHours() + "H" + oFechaInt.getMinutes() + "M" + oFechaInt.getSeconds() + "S",
                    "Datosadicionales": sDatosadicionales || "",
                    "Firma": (oUser && oUser.Firma) || "",
                    "Nombre": (oUser && oUser.UserName) || "",
                    "Empresa": oHab.Empresa,
                    "Accion": "",
                    "Usuario": ""
                };
                IntervencionesServices.SaveIntervencionPT15(oPayload, fnOk, fnError);
            }, function (oError) {
                that._abortarAltaIntervencion(
                    "No se pudieron leer las intervenciones para registrar la intervención. " +
                    "No se guardó ningún cambio.",
                    "error leyendo IntervencionesPT15Set", { seccion: sSeccion, error: oError });
            });
        },
        // FIN MOD TRNS #PT-18
        _sobrescribirIntervencion: function (sSeccion, oCambios, fnOk, fnError) {
            var that = this;
            var oHab = this.getView().getModel("Habilitacion").getData();
            var oVigente = (this._oIntervencionesVigentes || {})[sSeccion];
            if (!oVigente) {
                this._abortarSobrescritura("No hay una intervención vigente de este rol para modificar. " +
                    "No se guardó ningún cambio.",
                    "la seccion no tiene intervencion vigente", { seccion: sSeccion });
                return;
            }
            var iHoraVigente = this._horaintAMs(oVigente.Horaint);
            if (iHoraVigente === null) {
                this._abortarSobrescritura("No se pudo determinar la hora de la intervención vigente. " +
                    "No se guardó ningún cambio.",
                    "Horaint de la intervencion vigente ilegible",
                    { seccion: sSeccion, horaint: oVigente.Horaint });
                return;
            }
            // Mismo filtro que la lectura: Idhabilitacion + Clasehab (literal 'H0003').
            IntervencionesServices.loadIntervencionesPT15ByHab(oHab.Idhabilitacion, "H0003", function (data) {
                var aFilas = (data && data.results) || [];
                var aMatch = aFilas.filter(function (oFila) {
                    return oFila.Rol === oVigente.Rol &&
                           String(oFila.Usuario || "") === String(oVigente.Usuario || "") &&
                           that._horaintAMs(oFila.Horaint) === iHoraVigente;
                });
                if (aMatch.length !== 1) {
                    that._abortarSobrescritura(
                        "No se pudo identificar de forma unívoca la intervención a modificar. " +
                        "No se guardó ningún cambio.",
                        "resolucion de PK sin resultado o ambigua",
                        { seccion: sSeccion, rol: oVigente.Rol, usuario: oVigente.Usuario,
                          horaintMs: iHoraVigente, coincidencias: aMatch.length,
                          filasLeidas: aFilas.length, filas: aFilas });
                    return;
                }
                var oFila = aMatch[0];
                var sDatosadicionales;
                try {
                    sDatosadicionales = that._componerDatosadicionales(oFila.Datosadicionales, oCambios);
                } catch (oErrDatos) {
                    that._abortarSobrescritura(
                        "Los datos guardados de esta sección no tienen un formato válido. " +
                        "No se guardó ningún cambio.",
                        "Datosadicionales vigente no es JSON valido",
                        { seccion: sSeccion, error: oErrDatos, datosadicionales: oFila.Datosadicionales });
                    return;
                }
                // PK TAL CUAL viene de IntervencionesPT15Set. Firma, Nombre, Legajo, Idadjuntos y Accion
                // NO se mandan a proposito: el backend los conserva desde la base.
                var oPayload = {
                    "Idhabilitacion": oFila.Idhabilitacion,
                    "Clasehab": oFila.Clasehab,
                    "Fechacreacion": oFila.Fechacreacion,
                    "Rol": oFila.Rol,
                    "Usuario": oFila.Usuario,
                    "Fechaint": oFila.Fechaint,
                    "Datosadicionales": sDatosadicionales
                };
                IntervencionesServices.SaveIntervencionPT15(oPayload, fnOk, fnError);
            }, function (oError) {
                that._abortarSobrescritura(
                    "No se pudieron leer las intervenciones para identificar el registro a modificar. " +
                    "No se guardó ningún cambio.",
                    "error leyendo IntervencionesPT15Set", { seccion: sSeccion, error: oError });
            });
        },

        // Corta el guardado ANTES de postear: apaga el busy, deja el detalle en consola y avisa.
        _abortarSobrescritura: function (sMensaje, sDetalle, oDetalle) {
            console.error("### TRNS #PT-18 sobrescritura de intervencion - " + sDetalle, oDetalle);
            this.getView().getModel("HabilitacionModel").setProperty("/Busy", false);
            MessageBox.error(sMensaje);
        },

        // INI MOD TRNS #PT-18 - idem para el ALTA (_crearPrimeraIntervencion): corta ANTES del create,
        // apaga el busy, deja el detalle en consola y avisa.
        _abortarAltaIntervencion: function (sMensaje, sDetalle, oDetalle) {
            console.error("### TRNS #PT-18 alta de intervencion - " + sDetalle, oDetalle);
            this.getView().getModel("HabilitacionModel").setProperty("/Busy", false);
            MessageBox.error(sMensaje);
        },
        // FIN MOD TRNS #PT-18

        // JSON (SegHig, GerReg): se parte del Datosadicionales VIGENTE de la fila de IntervencionesPT15Set
        // y se mergean SOLO las claves editadas, con los nombres exactos que lee onBindingIntervenciones.
        // Todo lo demas se conserva: las claves de #TP-64 y las que escribe el workflow (p.ej.
        // seguridadH_PT15_examen). Texto plano (Gestion de Calidad, Verif. Jefatura): se reemplaza entero.
        // Si el valor vigente deberia ser JSON y no parsea, lanza y el llamador NO guarda.
        _componerDatosadicionales: function (sVigente, oCambios) {
            if (oCambios.tipo === "texto") {
                return oCambios.texto || "";
            }
            var oBase = {};
            var sTrim = (sVigente || "").trim();
            if (sTrim !== "") {
                oBase = JSON.parse(sTrim);   // SyntaxError -> lo captura el llamador
                if (!oBase || typeof oBase !== "object" || Array.isArray(oBase)) {
                    throw new Error("Datosadicionales no es un objeto JSON");
                }
            }
            Object.keys(oCambios.claves).forEach(function (sClave) {
                oBase[sClave] = oCambios.claves[sClave];
            });
            return JSON.stringify(oBase);
        },

        // Mensaje del backend cuando el create falla. Los errores de IntervencionesPT15Set ahora llegan
        // como error HTTP (antes devolvia 201 vacio), asi que se muestra el texto real y no uno generico.
        _mensajeErrorBackend: function (oError) {
            try {
                var oCuerpo = JSON.parse(oError.responseText);
                var sMsg = oCuerpo && oCuerpo.error && oCuerpo.error.message &&
                           (oCuerpo.error.message.value || oCuerpo.error.message);
                if (sMsg) { return String(sMsg); }
            } catch (oErrParse) {
                // responseText vacio o no-JSON: se cae al mensaje generico
            }
            return (oError && (oError.message || oError.statusText)) || "";
        },

        // Recalculo del vencimiento a partir del TERMINO editado. Es el inverso del calculo que hace
        // onBindingIntervenciones al leer: termino "1"/"2"/"3" = N anios sobre la misma fecha, termino
        // "0" (Otros) = Cantidad + Tiempo ("Dia" o "Mes"). Asi lo guardado vuelve a leerse como el
        // mismo termino que eligio el usuario.
        // Base del término confirmada por la referente funcional: fecha de la intervención original.
        // Fin de mes: se ajusta al último día del mes destino (supuesto, pendiente de confirmación funcional).
        _calcularFechaVenc: function (oFechaBase, sAnioVenc, vCantidad, sTiempo) {
            if (!oFechaBase || isNaN(oFechaBase.getTime())) { return null; }
            var iAnios = parseInt(sAnioVenc, 10);
            if (!isNaN(iAnios) && iAnios > 0) {
                return this._sumarMeses(oFechaBase, iAnios * 12);
            }
            var iCantidad = parseInt(vCantidad, 10);
            if (isNaN(iCantidad) || iCantidad <= 0) { return null; }
            if (sTiempo === "Mes") {
                return this._sumarMeses(oFechaBase, iCantidad);
            }
            if (sTiempo === "Dia") {
                var oVenc = new Date(oFechaBase.getTime());
                oVenc.setDate(oVenc.getDate() + iCantidad);
                return oVenc;
            }
            return null;
        },

        // Suma meses conservando el dia del mes, sin el desborde de setMonth: si el dia no existe en el
        // mes destino se usa el ULTIMO dia de ese mes (31/01 + 1 mes = 28 o 29/02; 31/03 + 1 mes = 30/04;
        // 29/02 + 12 meses = 28/02). Conserva la hora de la fecha base.
        _sumarMeses: function (oFechaBase, iMeses) {
            var iDia = oFechaBase.getDate();
            var oVenc = new Date(oFechaBase.getTime());
            oVenc.setDate(1);                                  // evita el desborde al cambiar de mes
            oVenc.setMonth(oVenc.getMonth() + iMeses);
            // Ultimo dia del mes destino: dia 0 del mes siguiente
            var iUltimoDia = new Date(oVenc.getFullYear(), oVenc.getMonth() + 1, 0).getDate();
            oVenc.setDate(Math.min(iDia, iUltimoDia));
            return oVenc;
        },

        // Fecha base del termino: el Fechaint de la intervencion vigente de la seccion, con el mismo
        // ajuste de timezone que aplica la lectura. La sobrescritura NO cambia Fechaint, asi que al
        // releer la base es la misma y el termino redondea.
        _fechaBaseTermino: function (sSeccion) {
            var oVigente = (this._oIntervencionesVigentes || {})[sSeccion];
            if (!oVigente || !oVigente.Fechaint) { return null; }
            return FormatHelper.formatJsonDate(oVigente.Fechaint);
        },

        // Corta el guardado cuando el termino elegido no permite calcular un vencimiento: Fecha_Venc
        // NUNCA se persiste en null (la lectura hace new Date(null) -> 01/01/1970).
        _abortarTerminoInvalido: function () {
            this.getView().getModel("HabilitacionModel").setProperty("/Busy", false);
            MessageBox.error("El término de vencimiento está incompleto o es inválido. " +
                "No se guardó ningún cambio.");
        },
        // FIN MOD TRNS #PT-18

        // Valida que el usuario tenga rol para la seccion y prende el busy. Devuelve el literal del rol o null.
        _iniciarGuardado: function (sSeccion, sNombreSeccion) {
            var sRol = this._rolDeSeccion(sSeccion);
            if (!sRol) {
                MessageBox.error("No tiene un rol habilitado para guardar " + sNombreSeccion + ".");
                return null;
            }
            this.getView().getModel("HabilitacionModel").setProperty("/Busy", true);
            return sRol;
        },

        _onGuardarOk: function () {
            sap.m.MessageToast.show("Los cambios se han guardado correctamente");
            this.LoadIntervenciones(this.getView().getModel("Habilitacion").getData().Idhabilitacion);
        },

        // INI MOD TRNS #PT-18 - mostrar el mensaje del backend cuando viene
        // _onGuardarError: function (sNombreSeccion, oError) {
        //     this.getView().getModel("HabilitacionModel").setProperty("/Busy", false);
        //     MessageBox.error("No se pudieron guardar los cambios de " + sNombreSeccion + ". Intente nuevamente.");
        // },
        _onGuardarError: function (sNombreSeccion, oError) {
            this.getView().getModel("HabilitacionModel").setProperty("/Busy", false);
            console.error("### TRNS #PT-18 error guardando " + sNombreSeccion, oError);
            var sBackend = this._mensajeErrorBackend(oError);
            MessageBox.error("No se pudieron guardar los cambios de " + sNombreSeccion + "." +
                (sBackend ? "\n\n" + sBackend : " Intente nuevamente."));
        },
        // FIN MOD TRNS #PT-18

        // INI MOD TRNS #PT-18 - el guardado de la habilitacion de PT15 va a Habtecnicas2PT15Set (antes
        // Seguridad e Higiene escribia a HabTecnicas2Set y leia de Habtecnicas2PT15Set). El create es un
        // deep insert con la nav que toque; el llamador pone Vigencia en null y agrega SOLO su nav.
        // // Campos de la habilitacion que se reenvian tal cual en los create() sobre HabTecnicas2Set
        // // (el guardado de la habilitacion es un create con deep insert de la nav entity que toque).
        // FIN MOD TRNS #PT-18
        _datosHabilitacionBase: function (sEstado) {
            var habilitacion = this.getView().getModel("Habilitacion").getData();
            return {
                Apellido: habilitacion.Apellido,
                Area: habilitacion.Area,
                Base: habilitacion.Base,
                Clasehab: habilitacion.Clasehab,
                Documento: habilitacion.Documento,
                Empresa: habilitacion.Empresa,
                Empresaext: habilitacion.Empresaext,
                Estado: sEstado,
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
        },

        // INI MOD TRNS #PT-18 - Medicina Laboral: Grado de aptitud + Fecha de vencimiento del apto.
        // NO escribe intervencion: su dato vive en la habilitacion (Hab_apmedicoPT15_nav) y es la UNICA
        // seccion que recalcula el estado y escribe MotivoCambioEstado. Por eso tampoco exige
        // intervencion vigente (es la excepcion de la definicion funcional).
        // // --- Medicina Laboral: Grado de aptitud + Fecha de vencimiento del apto medico ---
        // // UNICA seccion que toca el recalculo de estado, Hab_apmedico_nav y MotivoCambioEstado.
        // // Datosadicionales va vacio a proposito: el dato vive en Hab_apmedico_nav y duplicarlo en el
        // // JSON bifurcaria el dato respecto del print de PT15 y del resto de la app.
        // FIN MOD TRNS #PT-18
        onGuardarMedLaboral: function () {
            var oModel = this.getView().getModel("HabilitacionModel");
            var habilitacion = this.getView().getModel("Habilitacion").getData();
            var Empresa = habilitacion.Empresa === "TRANSENER" ? "100" : "300";
            var Roles = this.getView().getModel("UserJsonModelVISTA").getData().User[0].roles;
            // FUERA DE ALCANCE PT-18: este find busca Direccion_TecnicaMTO en un controller PT15,
            // con lo que Rol queda undefined para un usuario de Medicina Laboral. Se deja como esta.
            var Rol = Roles.find(element => element === "Director_Tecnico" || element === "Direccion_TecnicaMTO");
            // INI MOD TRNS #PT16 - el apto exige grado. El rol ya lo valida _iniciarGuardado (MED_LABORAL).
            if (!oModel.oData.Gradoap) {
                MessageBox.alert("Debe ingresar el grado de aptitud.", {
                    title: "Error"
                });
                return;
            }
            // FIN MOD TRNS #PT16
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
            // MOD TRNS #PT16: con _cargarAptoMedico, Medicina_Fecha_vencimiento_old queda siempre
            // seteado desde el apto vigente, asi que esta comparacion ahora si valida.
            if (oModel.oData.Gradoap === "A" || oModel.oData.Gradoap === "B" || oModel.oData.Gradoap === "C") {
                if (oModel.oData.Medicina_Fecha_vencimiento < oModel.oData.Medicina_Fecha_vencimiento_old) {
                    MessageBox.alert("La fecha de validez debe ser mayor o igual a la actual.", {
                        title: "Error"
                    });
                    return;
                // INI MOD TRNS #PT16 - el vencimiento del apto ya no pisa la vigencia de la licencia
                /* } else {
                    habilitacion.Vigencia = oModel.oData.Medicina_Fecha_vencimiento; */
                // FIN MOD TRNS #PT16
                }
            }
            var sRol = this._iniciarGuardado("MED_LABORAL", "Medicina Laboral");
            if (!sRol) { return; }
            var data = this._datosHabilitacionBase(estadoNuevo);
            // INI MOD TRNS #PT16 - sin vigencia de cabecera; el apto va por Hab_apmedicoPT15_nav (objeto).
            // Las demas navs van en [] para que el POST sea siempre deep (el backend no graba nada con ellas).
            /* data.Hab_apmedico_nav = [{
                "Legajo": habilitacion.Legajo,
                "Vigencia": oModel.oData.Medicina_Fecha_vencimiento,
                "Observaciones": "Sin observaciones",
                "Gradoap": oModel.oData.Gradoap
            }]; */
            data.Vigencia = null;
            data.Hab_apmedicoPT15_nav = {
                "Empresa": habilitacion.Empresa,
                "ClaseHab": "H0003",
                "Legajo": habilitacion.Legajo,
                "GradoAp": oModel.oData.Gradoap,
                "Vigencia": oModel.oData.Medicina_Fecha_vencimiento,
                "Observaciones": "Sin observaciones"
            };
            data.Hab_SeguridadPublica_nav = [];
            data.Hab_SeguridadHigiene_nav = [];
            data.Hab_CETCT_nav = [];
            data.Hab_DesMantenimiento_nav = [];
            data.Hab_Intervenciones_nav = [];
            // FIN MOD TRNS #PT16
            //Motivo cambio de estado
            var MotivoCambioData = {
                Clasehab: habilitacion.Clasehab,
                Comentarios: "Cambio de estado automático por medicina laboral",
                Empresa: Empresa,
                Idhabilitacion: habilitacion.Idhabilitacion,
                Rol: Rol,
                Estado: estadoNuevo
            };
            // INI MOD TRNS #PT-18 - sin create de intervencion. Las dos escrituras van en paralelo y el
            // detalle se recarga SOLO si las dos terminan bien.
            // // this._crearIntervencion(sRol, "", function () {
            // //     //Guardo el nuevo estado en la habilitacion
            // //     // INI MOD TRNS #PT16 - POST deep a Habtecnicas2PT15Set
            // //     // HabilitacionServices.saveHabilitacion(data,
            // //     HabilitacionServices.saveHabilitacionPT15(data,
            // //     // FIN MOD TRNS #PT16
            // //         jQuery.proxy(this.onSuccessCallbackStatus, this),
            // //         jQuery.proxy(this.onErrorCallbackStatus, this)
            // //     );
            // //     //Guardo motivo de cambio de estado
            // //     MotivoCambioEstadoService.saveMotivo(MotivoCambioData,
            // //         jQuery.proxy(this.onSuccessCallbackMotivoMedLaboral, this),
            // //         jQuery.proxy(this.onErrorCallbackMotivo, this)
            // //     );
            // // }.bind(this), jQuery.proxy(this._onGuardarError, this, "Medicina Laboral"));
            this._iPendientesMedLaboral = 2;
            this._bErrorMedLaboral = false;
            //Guardo el nuevo estado en la habilitacion (POST deep a Habtecnicas2PT15Set, ver #PT16)
            HabilitacionServices.saveHabilitacionPT15(data,
                jQuery.proxy(this._onPasoMedLaboralOk, this),
                jQuery.proxy(this._onPasoMedLaboralError, this, "el apto médico")
            );
            //Guardo motivo de cambio de estado
            MotivoCambioEstadoService.saveMotivo(MotivoCambioData,
                jQuery.proxy(this._onPasoMedLaboralOk, this),
                jQuery.proxy(this._onPasoMedLaboralError, this, "el motivo de cambio de estado")
            );
        },

        // Recarga del detalle encadenada a que terminen BIEN las dos escrituras. Si alguna falla, se
        // muestra el error y NO se recarga como si estuviera todo guardado.
        // NOTA: el backend del guardado de la habilitacion hoy no propaga los errores de
        // Z_SCP_HABILITACION_PT15 y puede responder OK sin haber grabado; la recarga posterior es la
        // que muestra lo que realmente quedo en la base.
        _onPasoMedLaboralOk: function () {
            this._iPendientesMedLaboral -= 1;
            if (this._iPendientesMedLaboral > 0 || this._bErrorMedLaboral) { return; }
            this._onGuardarOk();
        },

        _onPasoMedLaboralError: function (sPaso, oError) {
            this._iPendientesMedLaboral -= 1;
            if (this._bErrorMedLaboral) { return; }   // un solo mensaje aunque fallen las dos
            this._bErrorMedLaboral = true;
            this.getView().getModel("HabilitacionModel").setProperty("/Busy", false);
            console.error("### TRNS #PT-18 Medicina Laboral - fallo " + sPaso, oError);
            var sBackend = this._mensajeErrorBackend(oError);
            MessageBox.error("No se pudo guardar " + sPaso + "." + (sBackend ? "\n\n" + sBackend : ""));
        },

        // // Igual que onSuccessCallbackMotivo pero recargando el detalle, para que la intervencion
        // // recien creada se vea sin salir y volver a entrar.
        // onSuccessCallbackMotivoMedLaboral: function () {
        //     sap.m.MessageToast.show("Los cambios se han guardado correctamente");
        //     this.LoadIntervenciones(this.getView().getModel("Habilitacion").getData().Idhabilitacion);
        // },
        // FIN MOD TRNS #PT-18

        // INI MOD TRNS #PT-18 - Seguridad e Higiene: dos escrituras.
        //  1) su intervencion. CON intervencion vigente de SEG_HIG se SOBRESCRIBE el Datosadicionales,
        //     mergeando solo las claves que lee la vista y conservando el resto (#TP-64 y las del
        //     workflow). SIN intervencion vigente se da de ALTA (_crearPrimeraIntervencion): no hay
        //     JSON previo con el que mergear, asi que el Datosadicionales se arma SOLO con las claves
        //     que lee la vista. Despues del alta, la recarga deja esa fila como vigente y los guardados
        //     siguientes vuelven a ser sobrescritura.
        //  // 1) su intervencion: se SOBRESCRIBE el Datosadicionales de la vigente, mergeando solo las
        //  //    claves que lee la vista y conservando el resto (#TP-64 y las del workflow).
        //  2) Hab_SeguridadHigiene_nav (Aprobado, Contador, Vigencia), de donde lo lee el resto de la app.
        // El guardado de la habilitacion migra a Habtecnicas2PT15Set: se lee y se escribe del MISMO set.
        // // --- Seguridad e Higiene: todos los campos de su gestion ---
        // // Dos escrituras: la intervencion (Fecha_Venc, Cantidad_Venc, Tiempo_Venc, Observacion en el
        // // JSON de Datosadicionales) y Hab_SeguridadHigiene_nav (Aprobado, Contador, Vigencia), que es
        // // donde esos tres campos viven hoy y de donde los lee el resto de la app.
        onGuardarSegHig: function () {
            var oDatos = this.getView().getModel("HabilitacionModel").getData();
            var habilitacion = this.getView().getModel("Habilitacion").getData();
            var sRol = this._iniciarGuardado("SEG_HIG", "Seguridad e Higiene");
            if (!sRol) { return; }
            // ALTA o SOBRESCRITURA. Base del termino:
            //  - con intervencion vigente, su Fechaint (la sobrescritura no la cambia, asi que al releer
            //    la base es la misma y el termino redondea);
            //  - sin intervencion vigente, la Fechaint de la que se esta por crear (AHORA), que es la
            //    que despues se lee como "fecha de la intervencion original".
            var bHayVigente = !!(this._oIntervencionesVigentes || {}).SEG_HIG;
            var oFechaInt = bHayVigente ? null : new Date();
            var oFechaBase = bHayVigente ? this._fechaBaseTermino("SEG_HIG") : oFechaInt;
            // Examen REPROBADO: la lectura del JSON esta condicionada a Aprobado (ver
            // onBindingIntervenciones), asi que el termino y la observacion llegan vacios al modelo.
            // Con intervencion vigente, sobrescribirla los borraria: NO se toca el JSON y solo se guarda
            // la habilitacion. Sin intervencion vigente igual se da el alta, con Datosadicionales vacio,
            // para que quede registrado QUIEN evaluo; el termino no se exige.
            var bAprobado = !!oDatos.aprobadoCheck;
            var oCambios = null;
            var sDatosadicionalesAlta = "";
            if (bAprobado) {
                // El vencimiento se RECALCULA desde el termino editado; antes se reenviaba el viejo
                // porque onChangeDate/TimeSeguridadHigiene son stubs y nunca lo recomputaban.
                var oFechaVenc = this._calcularFechaVenc(oFechaBase,
                    oDatos.SeguridadHigiene_Anio_Venc, oDatos.SeguridadHigiene_Cantidad_Venc,
                    oDatos.SeguridadHigiene_Tiempo_Venc);
                if (!oFechaVenc) {
                    this._abortarTerminoInvalido();
                    return;
                }
                var oClaves = {
                    "SeguridadHigiene_Fecha_Venc": oFechaVenc,
                    "SeguridadHigiene_Cantidad_Venc": String(oDatos.SeguridadHigiene_Cantidad_Venc === undefined ? "" : oDatos.SeguridadHigiene_Cantidad_Venc),
                    "SeguridadHigiene_Tiempo_Venc": oDatos.SeguridadHigiene_Tiempo_Venc || "",
                    "SeguridadHigiene_Observacion": oDatos.SeguridadHigiene_Observacion || "",
                    // TP-64: persistir también el término elegido, para no depender de "adivinarlo"
                    // comparando fechas al releer (ver onBindingIntervenciones)
                    "SeguridadHigiene_Anio_Venc": oDatos.SeguridadHigiene_Anio_Venc
                };
                oCambios = { tipo: "json", claves: oClaves };
                // En el ALTA no hay Datosadicionales previo: el JSON va SOLO con estas claves, sin merge.
                sDatosadicionalesAlta = JSON.stringify(oClaves);
            }
            var data = this._datosHabilitacionBase(habilitacion.Estado);
            // Vigencia de cabecera en null: con valor, el backend pisa fecha_creacion con la fecha del
            // dia; con null restaura vigencia y fecha_creacion desde la base (igual que Medicina Laboral).
            data.Vigencia = null;
            // El payload lleva SOLO esta nav (sin apto, CETCT, seguridad publica ni intervenciones).
            // El backend graba ZTAB_SEGHIGIENE con un MODIFY de la nav tal cual llega, sin completar nada
            // desde la cabecera y reemplazando la fila entera. Por eso va Idhabilitacion: es parte de la
            // clave y sin el la fila se grababa con Idhabilitacion vacio.
            var oSegHigNav = {
                "Idhabilitacion": habilitacion.Idhabilitacion,
                "Legajo": habilitacion.Legajo,
                "Vigencia": oDatos.SeguridadHigiene_Fecha_examen,
                "Contador": oDatos.CountEvaluation,   // valor leido, sin incrementar
                "Aprobado": bAprobado                 // Edm.Boolean: Gateway lo convierte a X / vacio
            };
            // Calificacion es Edm.Byte y la vista no la muestra: se reenvia tal cual se leyo para que el
            // MODIFY no la borre, pero SOLO si hay valor numerico (con "" Gateway falla la conversion).
            if (oDatos.SeguridadHigiene_Calificacion !== undefined) {
                oSegHigNav.Calificacion = oDatos.SeguridadHigiene_Calificacion;
            }
            // Apto no lo mapea el backend: no se manda.
            data.Hab_SeguridadHigiene_nav = [oSegHigNav];
            var fnGuardarHabilitacion = function () {
                HabilitacionServices.saveHabilitacionPT15(data,
                    jQuery.proxy(this._onGuardarOk, this),
                    jQuery.proxy(this._onGuardarError, this, "Seguridad e Higiene")
                );
            }.bind(this);
            var fnError = jQuery.proxy(this._onGuardarError, this, "Seguridad e Higiene");
            // Sin intervencion vigente: ALTA primero, habilitacion despues (mismo encadenado que la
            // sobrescritura). Si el alta falla, la habilitacion NO se guarda.
            if (!bHayVigente) {
                this._crearPrimeraIntervencion("SEG_HIG", sDatosadicionalesAlta, oFechaInt,
                    fnGuardarHabilitacion, fnError);
                return;
            }
            if (!oCambios) {
                fnGuardarHabilitacion();
                return;
            }
            this._sobrescribirIntervencion("SEG_HIG", oCambios, fnGuardarHabilitacion, fnError);
        },

        // Gerencia Regional: JSON en Datosadicionales. Ahora se persiste tambien el TERMINO
        // (Anio/Cantidad/Tiempo), con el criterio de #TP-64: antes esos tres campos editables no se
        // guardaban en ningun lado y se re-derivaban comparando fechas.
        // // --- Gerencia Regional: Licencia habilitante por el termino + Observaciones ---
        onGuardarGerReg: function () {
            var oDatos = this.getView().getModel("HabilitacionModel").getData();
            var sRol = this._iniciarGuardado("GER_REG", "Gerencia Regional");
            if (!sRol) { return; }
            var oFechaVenc = this._calcularFechaVenc(this._fechaBaseTermino("GER_REG"),
                oDatos.Gerente_Reg_Anio_Venc, oDatos.Gerente_Reg_Cantidad_Venc,
                oDatos.Gerente_Reg_Tiempo_Venc);
            if (!oFechaVenc) {
                this._abortarTerminoInvalido();
                return;
            }
            var oCambios = { tipo: "json", claves: {
                "Gerente_Reg_Fecha_Venc": oFechaVenc,
                "Gerente_Reg_Observacion": oDatos.Gerente_Reg_Observacion || "",
                "Gerente_Reg_Anio_Venc": oDatos.Gerente_Reg_Anio_Venc,
                "Gerente_Reg_Cantidad_Venc": String(oDatos.Gerente_Reg_Cantidad_Venc === undefined ? "" : oDatos.Gerente_Reg_Cantidad_Venc),
                "Gerente_Reg_Tiempo_Venc": oDatos.Gerente_Reg_Tiempo_Venc || ""
            } };
            this._sobrescribirIntervencion("GER_REG", oCambios,
                jQuery.proxy(this._onGuardarOk, this),
                jQuery.proxy(this._onGuardarError, this, "Gerencia Regional")
            );
        },

        // Gestion de Calidad: Datosadicionales en TEXTO PLANO (no JSON), como lo lee
        // onBindingIntervenciones (ObservacionGestionCalidad = Datosadicionales, sin parsear).
        // // --- Gestion de Calidad: Observaciones ---
        // // Datosadicionales va como texto plano (no JSON): asi lo escribe el flujo actual y asi lo lee
        // // onBindingIntervenciones (ObservacionGestionCalidad = Datosadicionales, sin parsear).
        onGuardarGestCalidad: function () {
            var oDatos = this.getView().getModel("HabilitacionModel").getData();
            var sRol = this._iniciarGuardado("GEST_CALIDAD", "Gestión de Calidad");
            if (!sRol) { return; }
            this._sobrescribirIntervencion("GEST_CALIDAD",
                { tipo: "texto", texto: oDatos.ObservacionGestionCalidad || "" },
                jQuery.proxy(this._onGuardarOk, this),
                jQuery.proxy(this._onGuardarError, this, "Gestión de Calidad")
            );
        },

        // Verif. Jefatura Gestion de Calidad: idem, texto plano (Rep_Direccion_Observacion).
        // // --- Verif. Jefatura Gestion de Calidad: Observaciones ---
        onGuardarRepDireccion: function () {
            var oDatos = this.getView().getModel("HabilitacionModel").getData();
            var sRol = this._iniciarGuardado("REP_DIRECCION", "Verif. Jefatura Gestión de Calidad");
            if (!sRol) { return; }
            this._sobrescribirIntervencion("REP_DIRECCION",
                { tipo: "texto", texto: oDatos.Rep_Direccion_Observacion || "" },
                jQuery.proxy(this._onGuardarOk, this),
                jQuery.proxy(this._onGuardarError, this, "Verif. Jefatura Gestión de Calidad")
            );
        },
        // FIN MOD TRNS #PT-18

        // DEPRECADA TRNS #XXXXXX - reemplazada por formatters por seccion
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
        // DEPRECADA TRNS #XXXXXX - reemplazada por formatters por seccion
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
        // ELIMINADA TRNS #PT-18 - onUpdateData era el handler del boton unico: recalculaba el estado
        // desde Gradoap y guardaba habilitacion + MotivoCambioEstado para CUALQUIER rol que editara.
        // Su cuerpo vive ahora en onGuardarMedLaboral. El resto de las secciones NO toca ni el estado
        // ni AptoMedico. Original de 3dc9b09, restaurado comentado (incluye el data inline con
        // Hab_apmedico_nav y el pisado de habilitacion.Vigencia con el vencimiento del apto):
        // onUpdateData: function (event) {
        //     // ISSUE 229 - Medicina Laboral, Botones "Editar Datos" y "Cambio de Estado"
        //     var oModel = this.getView().getModel("HabilitacionModel");
        //     var habilitacion = this.getView().getModel("Habilitacion").getData();
        //     var Empresa = habilitacion.Empresa === "TRANSENER" ? "100" : "300";
        //     var Roles = this.getView().getModel("UserJsonModelVISTA").getData().User[0].roles;
        //     var Rol = Roles.find(element => element === "Director_Tecnico" || element === "Direccion_TecnicaMTO");
        //     var estadoNuevo = habilitacion.Estado;
        //     if (oModel.oData.Gradoap === "A" || oModel.oData.Gradoap === "B" || oModel.oData.Gradoap === "C") {
        //         if (habilitacion.Estado !== 'S' && habilitacion.Estado !== 'D') {
        //             estadoNuevo = 'H';
        //         }
        //     } else if (oModel.oData.Gradoap === "D" || oModel.oData.Gradoap === "F" || oModel.oData.Gradoap === "SEM") {
        //         if (habilitacion.Estado !== 'D') {
        //             estadoNuevo = 'S';
        //         }
        //     } else if (oModel.oData.Gradoap === "E") {
        //         estadoNuevo = 'D';
        //     }
        //     // valido fecha
        //     if (oModel.oData.Gradoap === "A" || oModel.oData.Gradoap === "B" || oModel.oData.Gradoap === "C") {
        //         if (oModel.oData.Medicina_Fecha_vencimiento < oModel.oData.Medicina_Fecha_vencimiento_old) {
        //             MessageBox.alert("La fecha de validez debe ser mayor o igual a la actual.", {
        //                 title: "Error"
        //             });
        //             return;
        //         } else {
        //             habilitacion.Vigencia = oModel.oData.Medicina_Fecha_vencimiento;
        //         }
        //     }
        //     var data = {
        //         Apellido: habilitacion.Apellido,
        //         Area: habilitacion.Area,
        //         Base: habilitacion.Base,
        //         Clasehab: habilitacion.Clasehab,
        //         Documento: habilitacion.Documento,
        //         Empresa: habilitacion.Empresa,
        //         Empresaext: habilitacion.Empresaext,
        //         Estado: estadoNuevo,
        //         Idhabilitacion: habilitacion.Idhabilitacion,
        //         Interno: habilitacion.Interno,
        //         Legajo: habilitacion.Legajo,
        //         Lote: habilitacion.Lote,
        //         Mto13: habilitacion.Mto13,
        //         Mto33: habilitacion.Mto33,
        //         Mto66: habilitacion.Mto66,
        //         Mto132: habilitacion.Mto132,
        //         Mto220: habilitacion.Mto220,
        //         Mto500: habilitacion.Mto500,
        //         Nombre: habilitacion.Nombre,
        //         Puesto: habilitacion.Puesto,
        //         Tipodoc: habilitacion.Tipodoc,
        //         Tipohab: habilitacion.Tipohab,
        //         Vigencia: habilitacion.Vigencia,
        //         Hab_apmedico_nav: [{
        //             "Legajo": habilitacion.Legajo,
        //             "Vigencia": oModel.oData.Medicina_Fecha_vencimiento,
        //             "Observaciones": "Sin observaciones",
        //             "Gradoap": oModel.oData.Gradoap
        //         }]
        //     };
        //     //Motivo cambio de estado
        //     var MotivoCambioData = {
        //         Clasehab: habilitacion.Clasehab,
        //         Comentarios: "Cambio de estado automático por medicina laboral",
        //         Empresa: Empresa,
        //         Idhabilitacion: habilitacion.Idhabilitacion,
        //         Rol: Rol,
        //         Estado: estadoNuevo
        //     };
        //     oModel.setProperty("/Busy", true);
        //     //Guardo el nuevo estado en la habilitacion
        //     HabilitacionServices.saveHabilitacion(data,
        //         jQuery.proxy(this.onSuccessCallbackStatus, this),
        //         jQuery.proxy(this.onErrorCallbackStatus, this)
        //     );
        //     //Guardo motivo de cambio de estado
        //     MotivoCambioEstadoService.saveMotivo(MotivoCambioData,
        //         jQuery.proxy(this.onSuccessCallbackMotivo, this),
        //         jQuery.proxy(this.onErrorCallbackMotivo, this)
        //     );
        // },
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
