// tests/alertas.test.js
const { elementMock, DocumentMock, ctx } = require('./loadModules');

function limpar() { ctx.localStorage.clear(); }

function inserir(o = {}) {
  return ctx.Estoque.adicionarItem({
    nome: 'Item Padrão', categoria: 'Medicamentos',
    quantidade: 100, estoqueMinimo: 20, unidade: 'cx',
    validade: '2099-12-31', localizacao: 'A1', ...o
  });
}

function resetDOM(ids = []) {
  const doc = new DocumentMock();
  ids.forEach(id => {
    const el = elementMock();
    el.classList._list.add('hidden');
    doc._set(id, el);
  });
  ctx.document = doc;
  global.document = doc;
}

// =============================================================
describe('Alertas — getAlertas', () => {
  beforeEach(limpar);

  test('retorna [] quando tudo está ok', () => { inserir(); expect(ctx.Alertas.getAlertas()).toEqual([]); });
  test('alerta "critico" para item zerado', () => {
    inserir({ quantidade: 0 });
    const a = ctx.Alertas.getAlertas();
    expect(a[0].tipo).toBe('critico');
    expect(a[0].descricao).toContain('zerado');
  });
  test('alerta "critico" para qtd ≤ 50% mínimo', () => {
    inserir({ quantidade: 9, estoqueMinimo: 20 });
    expect(ctx.Alertas.getAlertas()[0].tipo).toBe('critico');
  });
  test('alerta "baixo" para qtd < mínimo', () => {
    inserir({ quantidade: 15, estoqueMinimo: 20 });
    const a = ctx.Alertas.getAlertas();
    expect(a[0].tipo).toBe('baixo');
    expect(a[0].descricao).toContain('abaixo do mínimo');
  });
  test('alerta "vencido" para validade passada', () => {
    inserir({ validade: '2000-01-01', quantidade: 100, estoqueMinimo: 5 });
    expect(ctx.Alertas.getAlertas()[0].tipo).toBe('vencido');
  });
  test('alerta "vencido" para produto vencendo em ≤ 30 dias', () => {
    const d = new Date(); d.setDate(d.getDate() + 15);
    inserir({ validade: d.toISOString().split('T')[0], quantidade: 100, estoqueMinimo: 5 });
    const a = ctx.Alertas.getAlertas();
    expect(a[0].tipo).toBe('vencido');
    expect(a[0].descricao).toContain('dia(s)');
  });
  test('título do alerta é o nome do item', () => {
    inserir({ nome: 'Aspirina', quantidade: 0 });
    expect(ctx.Alertas.getAlertas()[0].titulo).toBe('Aspirina');
  });
  test('alerta inclui referência ao item', () => {
    const item = inserir({ quantidade: 0 });
    expect(ctx.Alertas.getAlertas()[0].item.id).toBe(item.id);
  });
});

describe('Alertas — ordenação (critico → vencido → baixo)', () => {
  beforeEach(() => {
    limpar();
    inserir({ nome: 'Baixo',   quantidade: 15, estoqueMinimo: 20, validade: '2099-12-31' });
    inserir({ nome: 'Critico', quantidade: 0,  estoqueMinimo: 20, validade: '2099-12-31' });
    inserir({ nome: 'Vencido', quantidade: 50, estoqueMinimo: 5,  validade: '2000-01-01' });
  });

  test('primeiro é "critico"', () => { expect(ctx.Alertas.getAlertas()[0].tipo).toBe('critico'); });
  test('segundo é "vencido"',  () => { expect(ctx.Alertas.getAlertas()[1].tipo).toBe('vencido'); });
  test('terceiro é "baixo"',   () => { expect(ctx.Alertas.getAlertas()[2].tipo).toBe('baixo');   });
});

describe('Alertas — atualizarBanner', () => {
  beforeEach(() => { limpar(); resetDOM(['alertas-banner']); });

  test('oculta banner quando sem críticos/vencidos', () => {
    inserir();
    ctx.Alertas.atualizarBanner();
    expect(ctx.document.getElementById('alertas-banner').classList.contains('hidden')).toBe(true);
  });
  test('exibe banner para item crítico', () => {
    inserir({ quantidade: 0 });
    ctx.Alertas.atualizarBanner();
    const b = ctx.document.getElementById('alertas-banner');
    expect(b.classList.contains('hidden')).toBe(false);
    expect(b.textContent).toContain('crítico');
  });
  test('exibe banner para item vencido', () => {
    inserir({ validade: '2000-01-01', quantidade: 100, estoqueMinimo: 5 });
    ctx.Alertas.atualizarBanner();
    expect(ctx.document.getElementById('alertas-banner').textContent).toContain('validade');
  });
  test('banner mostra contagem correta', () => {
    inserir({ quantidade: 0, nome: 'A' });
    inserir({ quantidade: 0, nome: 'B' });
    ctx.Alertas.atualizarBanner();
    expect(ctx.document.getElementById('alertas-banner').textContent).toContain('2');
  });
  test('não quebra sem elemento banner no DOM', () => {
    ctx.document = new DocumentMock();
    expect(() => ctx.Alertas.atualizarBanner()).not.toThrow();
  });
});

describe('Alertas — renderizarAlertas', () => {
  beforeEach(() => { limpar(); resetDOM(['lista-alertas']); });

  test('mensagem "Nenhum alerta" quando estoque ok', () => {
    inserir();
    ctx.Alertas.renderizarAlertas();
    expect(ctx.document.getElementById('lista-alertas').innerHTML).toContain('Nenhum alerta');
  });
  test('renderiza card de alerta crítico com nome do item', () => {
    inserir({ nome: 'Morfina', quantidade: 0 });
    ctx.Alertas.renderizarAlertas();
    const html = ctx.document.getElementById('lista-alertas').innerHTML;
    expect(html).toContain('Morfina');
    expect(html).toContain('critico');
  });
  test('renderiza localização quando informada', () => {
    inserir({ quantidade: 0, localizacao: 'Sala B3' });
    ctx.Alertas.renderizarAlertas();
    expect(ctx.document.getElementById('lista-alertas').innerHTML).toContain('Sala B3');
  });
  test('não quebra sem container no DOM', () => {
    ctx.document = new DocumentMock();
    expect(() => ctx.Alertas.renderizarAlertas()).not.toThrow();
  });
});
