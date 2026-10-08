const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const assert = require('node:assert/strict');
const { test } = require('node:test');
let service, request;
const odata = { read(entity, options) { request = { entity, options }; } };
class Filter {
    constructor(name, operator, value) { Object.assign(this, { name, operator, value }); }
}
vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../webapp/services/HabilitacionServices.js'), 'utf8'), {
    sap: { ui: {
        define(names, factory) { service = factory({ getModel: () => odata }); },
        model: { Filter, FilterOperator: { EQ: 'EQ' } }
    } },
    jQuery: { proxy: (fn, context, ...args) => fn.bind(context, ...args) }
});
const selected = legajo => ({ Idhabilitacion: 'PE00000608', Clasehab: 'H0003', Legajo: legajo });
function read(data, callback = () => {}) {
    request = undefined;
    service.loadHabilitacionPT15('PE00000608', {
        getModel: () => data ? { getData: () => data } : undefined
    }, callback);
    return request;
}
for (const legajo of ['00000492', '00000765']) {
    test(`GET PT15 envía únicamente ID, clase y legajo ${legajo}`, () => {
        const r = read(selected(legajo));
        assert.equal(r.entity, '/Habtecnicas2PT15Set');
        assert.deepEqual([...r.options.filters].map(f => [f.name, f.value]), [
            ['Idhabilitacion', 'PE00000608'], ['Clasehab', 'H0003'], ['Legajo', legajo]
        ]);
    });
}
for (const [name, data] of [
    ['sin selección', null],
    ['sin legajo', { Idhabilitacion: 'PE00000608', Clasehab: 'H0003' }],
    ['otra licencia', { ...selected('00000492'), Idhabilitacion: 'OTRA' }],
    ['otra clase', { ...selected('00000492'), Clasehab: 'H0002' }]
]) {
    test(`selección inválida: ${name}`, () => {
        let error;
        const r = read(data, e => { error = e; });
        assert.equal(r, undefined);
        assert(error && error.message);
    });
}
for (const [name, result] of [
    ['otro legajo', selected('00000765')],
    ['otro ID', { ...selected('00000492'), Idhabilitacion: 'OTRA' }],
    ['otra clase', { ...selected('00000492'), Clasehab: 'H0002' }]
]) {
    test(`rechaza respuesta de ${name} antes de cargar el modelo`, () => {
        let error, loaded = false;
        const original = service.onSuccessCallback;
        service.onSuccessCallback = () => { loaded = true; };
        try {
            read(selected('00000492'), e => { error = e; }).options.success({ results: [result] });
            assert(error && error.message);
            assert.equal(loaded, false);
        } finally { service.onSuccessCallback = original; }
    });
}
test('respuesta correcta llega al procesamiento habitual', () => {
    let loaded = false;
    const original = service.onSuccessCallback;
    service.onSuccessCallback = () => { loaded = true; };
    try {
        read(selected('00000492')).options.success({ results: [selected('00000492')] });
        assert.equal(loaded, true);
    } finally { service.onSuccessCallback = original; }
});
test('lectura TcT conserva endpoint y filtros', () => {
    service.loadHabilitacion('T000000075', 'H0002', {}, () => {});
    assert.equal(request.entity, '/HabTecnicas2Set');
    assert.deepEqual([...request.options.filters].map(f => [f.name, f.value]), [
        ['Idhabilitacion', 'T000000075'], ['Clasehab', 'H0002']
    ]);
});
test('lectura de duplicación PT15 conserva filtros anteriores', () => {
    service.readOriginalPT15('PE00000608', () => {}, () => {});
    assert.deepEqual([...request.options.filters].map(f => [f.name, f.value]), [
        ['Idhabilitacion', 'PE00000608'], ['Clasehab', 'H0003']
    ]);
});

test('usa la selección actual aunque el modelo del detalle conserve otro legajo', () => {
    request = undefined;
    service.loadHabilitacionPT15('PE00000608', {
        getModel(name) {
            return { getData: () => selected(name === 'Habilitacion' ? '00000765' : '00000492') };
        }
    }, () => {});
    assert.equal(request.options.filters[2].value, '00000492');
});
test('recargar tras guardar conserva el filtro de legajo de la selección', () => {
    const data = selected('00000538');
    const first = read(data);
    const reload = read(data);
    assert.deepEqual([...first.options.filters].map(f => [f.name, f.value]),
        [...reload.options.filters].map(f => [f.name, f.value]));
    assert.equal(reload.options.urlParameters.$expand,
        'Hab_apmedicoPT15_nav,Hab_SeguridadPublica_nav,Hab_SeguridadHigiene_nav,Hab_CETCT_nav,Hab_DesMantenimiento_nav');
});
test('una respuesta sin filas informa el error habitual', () => {
    let error;
    read(selected('00000492'), e => { error = e; }).options.success({ results: [] });
    assert.equal(error.message, 'Sin datos');
});
test('un error OData llega al callback', () => {
    const expected = { statusCode: 500 };
    let error;
    read(selected('00000492'), e => { error = e; }).options.error(expected);
    assert.equal(error, expected);
});
