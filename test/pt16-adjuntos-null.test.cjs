const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { test } = require("node:test");

class JSONModel {
    constructor(data = {}) { this.oData = data; }
    getData() { return this.oData; }
    setData(data) { this.oData = data; }
    setProperty(name, value) { this.oData[name.slice(1)] = value; }
    updateBindings() {}
}

let controllerMethods;
const messageErrors = [];
vm.runInNewContext(fs.readFileSync(path.join(__dirname,
    "../webapp/controller/detailHabPT15.controller.js"), "utf8"), {
    sap: { ui: {
        define(names, factory) {
            const dependencies = {
                "sap/ui/core/mvc/Controller": {
                    extend(name, methods) { controllerMethods = methods; }
                },
                "sap/m/MessageBox": { error(message) { messageErrors.push(message); } },
                "transener/GestionHabilitaciones/utils/FormatHelper": {
                    formatJsonDate(value) { return value ? new Date(value) : null; }
                }
            };
            factory(...names.map(name => dependencies[name] || {}));
        },
        model: { json: { JSONModel } }
    } },
    console,
    Date
});

for (const [name, attachments, expected] of [
    ["null", null, false],
    ["undefined", undefined, false],
    ["navegación diferida", { __deferred: { uri: "/AdjuntosSet" } }, false],
    ["sin adjuntos", { results: [] }, false],
    ["con adjuntos", { results: [{ Nombre: "informe.pdf" }] }, true]
]) {
    test(`visibilidad de adjuntos: ${name}`, () => {
        assert.equal(controllerMethods.validaAjuntos(attachments), expected);
    });
}

test("la recarga con AdjuntosSet null alcanza el cierre del indicador de carga", () => {
    const models = {
        HabilitacionModel: new JSONModel({ Busy: true }),
        Habilitacion: new JSONModel({ Idhabilitacion: "T000000075" })
    };
    let medicalReloaded = false;
    const controller = Object.assign({}, controllerMethods, {
        getView() {
            return {
                getModel(name) { return models[name]; },
                setModel(model, name) {
                    models[name] = model;
                    // UI5 evalúa el formatter de los paneles al propagar el modelo.
                    if (name === "Intervenciones") {
                        model.getData().Intervenciones.forEach(intervention => {
                            controller.validaAjuntos(intervention.AdjuntosSet);
                        });
                    }
                }
            };
        },
        _cargarAptoMedico() { medicalReloaded = true; },
        LoadRegionesModel() {}
    });

    controller.SuccessCallBackInt({
        results: [{ Rol: "hab_pt15_med-laboral", AdjuntosSet: null }]
    });

    assert.equal(medicalReloaded, true);
    assert.equal(models.HabilitacionModel.getData().Busy, false);
    assert.deepEqual(messageErrors, []);
});

for (const [name, expiry, expectedTerm, expectedQuantity, expectedUnit] of [
    ["años", new Date(2029, 0, 15), "3", undefined, undefined],
    ["meses", new Date(2028, 1, 15), "0", 25, "Mes"],
    ["días", new Date(2026, 0, 30), "0", 15, "Dia"]
]) {
    test(`Seguridad e Higiene sin firma calcula ${name} desde Fechaint`, () => {
        const errorsBefore = messageErrors.length;
        const models = {
            HabilitacionModel: new JSONModel({ Busy: true }),
            Habilitacion: new JSONModel({
                Hab_SeguridadHigiene_nav: [{ Aprobado: true, Contador: 0 }]
            }),
            Intervenciones: new JSONModel({ Intervenciones: [{
                Rol: "hab_pt15_seg-hig",
                Firma: "",
                Fechaint: new Date(2026, 0, 15),
                Datosadicionales: JSON.stringify({ SeguridadHigiene_Fecha_Venc: expiry })
            }] })
        };
        const controller = Object.assign({}, controllerMethods, {
            getView() { return { getModel(name) { return models[name]; } }; },
            _cargarAptoMedico() {},
            LoadRegionesModel() {}
        });

        controller.onBindingIntervenciones();

        const data = models.HabilitacionModel.getData();
        assert.equal(messageErrors.length, errorsBefore);
        assert.equal(data.SeguridadHigiene_Anio_Venc, expectedTerm);
        assert.equal(data.SeguridadHigiene_Cantidad_Venc, expectedQuantity);
        assert.equal(data.SeguridadHigiene_Tiempo_Venc, expectedUnit);
        assert.equal(data.SeguridadHigiene_Fecha, undefined);
        assert.equal(data.Busy, false);
    });
}
