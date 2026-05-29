// tests/loadModules.js
const vm = require('vm');
const fs = require('fs');
const path = require('path');

class LocalStorageMock {
  constructor() { this.store = {}; }
  clear() { this.store = {}; }
  getItem(key) { return this.store[key] ?? null; }
  setItem(key, value) { this.store[key] = String(value); }
  removeItem(key) { delete this.store[key]; }
}

function elementMock() {
  return {
    classList: {
      _list: new Set(),
      add(c) { this._list.add(c); },
      remove(c) { this._list.delete(c); },
      contains(c) { return this._list.has(c); }
    },
    _html: '', _text: '',
    get innerHTML() { return this._html; },
    set innerHTML(v) { this._html = v; },
    get textContent() { return this._text; },
    set textContent(v) { this._text = v; }
  };
}

class DocumentMock {
  constructor() { this._els = {}; }
  getElementById(id) { return this._els[id] || null; }
  _set(id, el) { this._els[id] = el; }
}

const ctx = vm.createContext({
  localStorage: new LocalStorageMock(),
  document: new DocumentMock(),
  formatarData: (dataStr) => {
    if (!dataStr) return '—';
    const [ano, mes, dia] = dataStr.split('-');
    return `${dia}/${mes}/${ano}`;
  },
  console, Date, JSON, parseInt, isNaN, Number, String, Math, Object, Array, Set
});

function runFile(relPath) {
  let code = fs.readFileSync(path.join(__dirname, '..', relPath), 'utf-8');
  // Transforma declarações top-level em assignments no global do contexto
  code = `(function(global){\n${code
      .replace(/^const\s+(\w+)\s*=/gm, 'global.$1 =')
      .replace(/^let\s+(\w+)\s*=/gm, 'global.$1 =')
      .replace(/^class\s+(\w+)/gm, 'global.$1 = class $1')
    }\n})(this);`;
  vm.runInContext(code, ctx);
}

runFile('js/estoque.js');
runFile('js/alertas.js');
runFile('js/crud.js');

module.exports = { elementMock, DocumentMock, ctx };
