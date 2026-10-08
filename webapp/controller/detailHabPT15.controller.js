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

        // INI MOD TRNS #PT-18 - estados en los que se permite editar las secciones de PT15.
        // Definicion funcional: N (Nueva Habilitacion), P (Pendiente Gestion de Calidad),
        // H (Habilitado) y S (Suspendido). Quedan bloqueados C (Cancelado), D (Revocado)
        // y F (Finalizado). Es la MISMA lista para las cinco secciones; si alguna necesita
        // otra, parametrizar por seccion a partir de aca.
        ESTADOS_EDITABLES_PT15: ["N", "P", "H", "S"],
        // FIN MOD TRNS #PT-18

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
            // INI MOD TRNS #PT-18 - cada edicion de un rol crea una intervencion NUEVA (nunca se sobrescribe),
            // asi que por rol puede haber N filas. La vista muestra la MAS RECIENTE; el resto es historial.
            // El maximo se calcula explicitamente por Fechaint+Horaint, sin depender del orden de llegada.
            var oAgrupado = this._agruparUltimaPorRol(Intervenciones);
            oModel.setProperty("/HistorialPorRol", oAgrupado.historial);
            // Fechacreacion forma parte de la PK de ZTAB_APROB_HAB: al crear una intervencion nueva hay que
            // reenviar LA MISMA de las filas existentes de esta habilitacion, no la fecha de hoy.
            oDataModel.Fechacreacion = this._resolverFechacreacion(Intervenciones);
            Intervenciones = oAgrupado.ultimas;
            // FIN MOD TRNS #PT-18
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
                        oDataModel.SeguridadHigiene_Nombre = Intervenciones[row].Nombre;
                        oDataModel.SeguridadHigiene_Fecha = FormatHelper.formatJsonDate(Intervenciones[row].Fechaint);
                    }
                    var oSegHig = (Habilitacion.Hab_SeguridadHigiene_nav && Habilitacion.Hab_SeguridadHigiene_nav.length > 0) ?
                        Habilitacion.Hab_SeguridadHigiene_nav[0] : null;
                    oDataModel.CountEvaluation = oSegHig ? Number(oSegHig.Contador) || 0 : 0;
                    var bAprobado = !!oSegHig && (oSegHig.Aprobado === true || oSegHig.Aprobado === "X");
                    oDataModel.aprobadoCheck = bAprobado;
                    oDataModel.reprobadoCheck = !!oSegHig && !bAprobado && oDataModel.CountEvaluation > 0;
                    if (oSegHig) {
                        oDataModel.SeguridadHigiene_Fecha_examen = FormatHelper.formatJsonDate(oSegHig.Vigencia);
                    }
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
                                    oDataModel.SeguridadHigiene_Cantidad_Venc = Dias;
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

        // Clave de orden = ms de Fechaint (Edm.DateTime -> Date) + ms de Horaint (Edm.Time -> {ms}).
        _claveOrdenIntervencion: function (oInt) {
            var t = 0;
            if (oInt.Fechaint) {
                t += (oInt.Fechaint instanceof Date) ? oInt.Fechaint.getTime() : new Date(oInt.Fechaint).getTime();
            }
            if (oInt.Horaint && typeof oInt.Horaint === "object" && oInt.Horaint.ms != null) {
                t += oInt.Horaint.ms;
            }
            return t;
        },

        // Devuelve { ultimas: [fila mas reciente de cada rol], historial: { clave: [filas DESC] } }.
        // Las filas cuyo Rol no matchea ninguna clave se descartan (la cadena if/else tampoco las usa).
        _agruparUltimaPorRol: function (aInt) {
            var that = this;
            var oHistorial = {};
            (aInt || []).forEach(function (oInt) {
                var sClave = that._claveDeRol(oInt.Rol);
                if (!sClave) { return; }
                if (!oHistorial[sClave]) { oHistorial[sClave] = []; }
                oHistorial[sClave].push(oInt);
            });
            var aUltimas = [];
            Object.keys(oHistorial).forEach(function (sClave) {
                oHistorial[sClave].sort(function (a, b) {
                    return that._claveOrdenIntervencion(b) - that._claveOrdenIntervencion(a);
                });
                aUltimas.push(oHistorial[sClave][0]);
            });
            return { ultimas: aUltimas, historial: oHistorial };
        },

        // Fechacreacion de la habilitacion: la comparten todas las filas de ZTAB_APROB_HAB de esta
        // habilitacion. Se toma de la fila mas reciente que la traiga; si ninguna la trae, hoy.
        _resolverFechacreacion: function (aInt) {
            var that = this;
            var aConFecha = (aInt || []).filter(function (oInt) {
                return !!oInt.Fechacreacion;
            });
            if (!aConFecha.length) { return new Date(); }
            aConFecha.sort(function (a, b) {
                return that._claveOrdenIntervencion(b) - that._claveOrdenIntervencion(a);
            });
            return aConFecha[0].Fechacreacion;
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
            oDataModel.Medicina_Fecha = null;
            var sUsuario = oApto && oApto.Usuario ? oApto.Usuario : "";
            this._sUsuarioFirmaApto = sUsuario;
            if (!sUsuario) {
                return;
            }
            oDataModel.Medicina_Fecha = oApto.Fecha ? FormatHelper.formatJsonDate(oApto.Fecha) : null;
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
        //     var aBloqueados = ["C", "D", "F", "N"];
        //     return aBloqueados.indexOf(this._normalizarUO(vEstado)) === -1;
        // },
        _estadoPermiteEdicion: function (vEstado) {
            return this.ESTADOS_EDITABLES_PT15.indexOf(this._normalizarUO(vEstado)) !== -1;
        },
        // FIN MOD TRNS #PT-18

        // GLOBALES (sin region)
        onEnableMedLaboral: function (vRoles, vEstado) {
            if (!this._estadoPermiteEdicion(vEstado)) { return false; }
            return this._tieneRolGlobal(vRoles,
                ["hab_pt15_med-laboral", "MedicinaLaboral_PT15", "Medicina_Laboral"]);
        },

        onEnableRepDireccion: function (vRoles, vEstado) {
            if (!this._estadoPermiteEdicion(vEstado)) { return false; }
            return this._tieneRolGlobal(vRoles,
                ["hab_pt15_rep-direccion", "Rep_Direccion_PT15"]);
        },

        // REGIONALES (requieren UO)
        onEnableSegHig: function (vRoles, vUO, vEstado) {
            if (!this._estadoPermiteEdicion(vEstado)) { return false; }
            return this._tieneRolRegional(vRoles, "hab_pt15_seg-hig", vUO,
                ["seguridadH_PT15"]);
        },

        onEnableGerReg: function (vRoles, vUO, vEstado) {
            if (!this._estadoPermiteEdicion(vEstado)) { return false; }
            return this._tieneRolRegional(vRoles, "hab_pt15_ger-reg-jefe-cot", vUO,
                ["Ger_Reg_Jefe_COT", "PT15_GerRegional"]);
        },

        onEnableGestCalidad: function (vRoles, vUO, vEstado) {
            if (!this._estadoPermiteEdicion(vEstado)) { return false; }
            return this._tieneRolRegional(vRoles, "hab_pt15_gest-calidad", vUO,
                ["Gestion_Calidad_PT152", "Gestion_Calidad_PT15"]);
        },

        // ELIMINADA TRNS #PT-18 - onEnableGuardar habilitaba el boton unico del footer si el usuario
        // podia editar AL MENOS una seccion. Ahora hay un boton por seccion con su propio formatter.

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

        // UPDATE_ENTITY del backend lanza not_implemented: TODO guardado de intervencion va por create().
        // El backend pisa Usuario con sy-uname y genera un Idadjuntos por cada create (aca se ignora:
        // estos handlers no suben archivos). La unicidad de la fila la dan Fechaint + Horaint.
        _crearIntervencion: function (sRol, sDatosadicionales, fnOk, fnError) {
            var oHab = this.getView().getModel("Habilitacion").getData();
            var oDatos = this.getView().getModel("HabilitacionModel").getData();
            var oUserData = this.getView().getModel("UserData");
            var oUser = oUserData ? oUserData.getData() : {};
            var oAhora = new Date();
            var oPayload = {
                "Idhabilitacion": oHab.Idhabilitacion,
                "Clasehab": "H0003",
                "Legajo": oHab.Interno ? oHab.Legajo : oHab.Documento,
                "Fechacreacion": oDatos.Fechacreacion || oAhora,
                "Rol": sRol,
                "Fechaint": oAhora,
                "Horaint": "PT" + oAhora.getHours() + "H" + oAhora.getMinutes() + "M" + oAhora.getSeconds() + "S",
                "Datosadicionales": sDatosadicionales || "",
                "Firma": (oUser && oUser.Firma) || "",
                "Nombre": (oUser && oUser.UserName) || "",
                "Empresa": oHab.Empresa,
                "Accion": "",
                "Usuario": ""
            };
            IntervencionesServices.SaveIntervencionPT15(oPayload, fnOk, fnError);
        },

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

        _onGuardarError: function (sNombreSeccion, oError) {
            this.getView().getModel("HabilitacionModel").setProperty("/Busy", false);
            MessageBox.error("No se pudieron guardar los cambios de " + sNombreSeccion + ". Intente nuevamente.");
        },

        // Campos de la habilitacion que se reenvian tal cual en los create() sobre HabTecnicas2Set
        // (el guardado de la habilitacion es un create con deep insert de la nav entity que toque).
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

        // --- Medicina Laboral: Grado de aptitud + Fecha de vencimiento del apto medico ---
        // UNICA seccion que toca el recalculo de estado, Hab_apmedico_nav y MotivoCambioEstado.
        // Datosadicionales va vacio a proposito: el dato vive en Hab_apmedico_nav y duplicarlo en el
        // JSON bifurcaria el dato respecto del print de PT15 y del resto de la app.
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
            this._crearIntervencion(sRol, "", function () {
                //Guardo el nuevo estado en la habilitacion
                // INI MOD TRNS #PT16 - POST deep a Habtecnicas2PT15Set
                // HabilitacionServices.saveHabilitacion(data,
                HabilitacionServices.saveHabilitacionPT15(data,
                // FIN MOD TRNS #PT16
                    jQuery.proxy(this.onSuccessCallbackStatus, this),
                    jQuery.proxy(this.onErrorCallbackStatus, this)
                );
                //Guardo motivo de cambio de estado
                MotivoCambioEstadoService.saveMotivo(MotivoCambioData,
                    jQuery.proxy(this.onSuccessCallbackMotivoMedLaboral, this),
                    jQuery.proxy(this.onErrorCallbackMotivo, this)
                );
            }.bind(this), jQuery.proxy(this._onGuardarError, this, "Medicina Laboral"));
        },

        // Igual que onSuccessCallbackMotivo pero recargando el detalle, para que la intervencion
        // recien creada se vea sin salir y volver a entrar.
        onSuccessCallbackMotivoMedLaboral: function () {
            sap.m.MessageToast.show("Los cambios se han guardado correctamente");
            this.LoadIntervenciones(this.getView().getModel("Habilitacion").getData().Idhabilitacion);
        },

        // --- Seguridad e Higiene: todos los campos de su gestion ---
        // Dos escrituras: la intervencion (Fecha_Venc, Cantidad_Venc, Tiempo_Venc, Observacion en el
        // JSON de Datosadicionales) y Hab_SeguridadHigiene_nav (Aprobado, Contador, Vigencia), que es
        // donde esos tres campos viven hoy y de donde los lee el resto de la app.
        onGuardarSegHig: function () {
            var oDatos = this.getView().getModel("HabilitacionModel").getData();
            var habilitacion = this.getView().getModel("Habilitacion").getData();
            var sRol = this._iniciarGuardado("SEG_HIG", "Seguridad e Higiene");
            if (!sRol) { return; }
            var sDatosadicionales = JSON.stringify({
                "SeguridadHigiene_Fecha_Venc": oDatos.SeguridadHigiene_Fecha_Venc,
                "SeguridadHigiene_Cantidad_Venc": String(oDatos.SeguridadHigiene_Cantidad_Venc === undefined ? "" : oDatos.SeguridadHigiene_Cantidad_Venc),
                "SeguridadHigiene_Tiempo_Venc": oDatos.SeguridadHigiene_Tiempo_Venc || "",
                "SeguridadHigiene_Observacion": oDatos.SeguridadHigiene_Observacion || "",
                // TP-64: persistir también el término elegido, para no depender de "adivinarlo"
                // comparando fechas al releer (ver onBindingIntervenciones)
                "SeguridadHigiene_Anio_Venc": oDatos.SeguridadHigiene_Anio_Venc
            });
            var data = this._datosHabilitacionBase(habilitacion.Estado);
            data.Hab_SeguridadHigiene_nav = [{
                "Legajo": habilitacion.Legajo,
                "Vigencia": oDatos.SeguridadHigiene_Fecha_examen,
                "Contador": oDatos.CountEvaluation,
                "Aprobado": oDatos.aprobadoCheck
            }];
            this._crearIntervencion(sRol, sDatosadicionales, function () {
                HabilitacionServices.saveHabilitacion(data,
                    jQuery.proxy(this._onGuardarOk, this),
                    jQuery.proxy(this._onGuardarError, this, "Seguridad e Higiene")
                );
            }.bind(this), jQuery.proxy(this._onGuardarError, this, "Seguridad e Higiene"));
        },

        // --- Gerencia Regional: Licencia habilitante por el termino + Observaciones ---
        onGuardarGerReg: function () {
            var oDatos = this.getView().getModel("HabilitacionModel").getData();
            var sRol = this._iniciarGuardado("GER_REG", "Gerencia Regional");
            if (!sRol) { return; }
            var sDatosadicionales = JSON.stringify({
                "Gerente_Reg_Fecha_Venc": oDatos.Gerente_Reg_Fecha_Venc,
                "Gerente_Reg_Observacion": oDatos.Gerente_Reg_Observacion || ""
            });
            this._crearIntervencion(sRol, sDatosadicionales,
                jQuery.proxy(this._onGuardarOk, this),
                jQuery.proxy(this._onGuardarError, this, "Gerencia Regional")
            );
        },

        // --- Gestion de Calidad: Observaciones ---
        // Datosadicionales va como texto plano (no JSON): asi lo escribe el flujo actual y asi lo lee
        // onBindingIntervenciones (ObservacionGestionCalidad = Datosadicionales, sin parsear).
        onGuardarGestCalidad: function () {
            var oDatos = this.getView().getModel("HabilitacionModel").getData();
            var sRol = this._iniciarGuardado("GEST_CALIDAD", "Gestión de Calidad");
            if (!sRol) { return; }
            this._crearIntervencion(sRol, oDatos.ObservacionGestionCalidad || "",
                jQuery.proxy(this._onGuardarOk, this),
                jQuery.proxy(this._onGuardarError, this, "Gestión de Calidad")
            );
        },

        // --- Verif. Jefatura Gestion de Calidad: Observaciones ---
        // Idem: texto plano, como lo lee onBindingIntervenciones (Rep_Direccion_Observacion).
        onGuardarRepDireccion: function () {
            var oDatos = this.getView().getModel("HabilitacionModel").getData();
            var sRol = this._iniciarGuardado("REP_DIRECCION", "Verif. Jefatura Gestión de Calidad");
            if (!sRol) { return; }
            this._crearIntervencion(sRol, oDatos.Rep_Direccion_Observacion || "",
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
        // Su cuerpo vive ahora en onGuardarMedLaboral, que ademas crea la intervencion. El resto de
        // las secciones NO toca ni el estado ni AptoMedico.
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
