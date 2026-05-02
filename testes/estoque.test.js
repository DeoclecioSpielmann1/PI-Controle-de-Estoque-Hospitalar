// tests/estoque.test.js
const { ctx } = require("./loadModules");

function limpar() { ctx.localStorage.clear(); }

function inserir(overrides = {}) {
  return ctx.Estoque.adicionarItem({
    nome: 'Dipirona 500mg', categoria: 'Medicamentos',
    quantidade: 100, estoqueMinimo: 20, unidade: 'cx',
    validade: '2099-12-31', localizacao: 'A1',
    ...overrides
  });
}

describe('Estoque — CRUD básico', () => {
  beforeEach(limpar);

  test('adicionarItem atribui id numérico', () => { expect(typeof inserir().id).toBe('number'); });
  test('adicionarItem persiste o item', () => { const i = inserir(); expect(ctx.Estoque.buscarItem(i.id)).not.toBeNull(); });
  test('buscarItem retorna null para id inexistente', () => { expect(ctx.Estoque.buscarItem(999999)).toBeNull(); });
  test('editarItem altera campos', () => { const i = inserir(); expect(ctx.Estoque.editarItem(i.id, { quantidade: 200 }).quantidade).toBe(200); });
  test('editarItem retorna null para id inexistente', () => { expect(ctx.Estoque.editarItem(999999, {})).toBeNull(); });
  test('removerItem exclui o item', () => { const i = inserir(); ctx.Estoque.removerItem(i.id); expect(ctx.Estoque.buscarItem(i.id)).toBeNull(); });
  test('carregarItens retorna todos', () => { inserir({ nome: 'A' }); inserir({ nome: 'B' }); expect(ctx.Estoque.carregarItens().length).toBe(2); });
});

describe('Estoque — getStatus', () => {
  beforeEach(limpar);

  const base = (o = {}) => ({ nome: 'X', quantidade: 100, estoqueMinimo: 20, validade: '2099-12-31', ...o });

  test('"ok" — quantidade normal e dentro validade', () => { expect(ctx.Estoque.getStatus(base())).toBe('ok'); });
  test('"critico" — quantidade zero', () => { expect(ctx.Estoque.getStatus(base({ quantidade: 0 }))).toBe('critico'); });
  test('"critico" — quantidade ≤ 50% do mínimo', () => { expect(ctx.Estoque.getStatus(base({ quantidade: 9, estoqueMinimo: 20 }))).toBe('critico'); });
  test('"baixo" — quantidade abaixo do mínimo mas > 50%', () => { expect(ctx.Estoque.getStatus(base({ quantidade: 15, estoqueMinimo: 20 }))).toBe('baixo'); });
  test('"vencido" — validade passada', () => { expect(ctx.Estoque.getStatus(base({ validade: '2000-01-01', quantidade: 100, estoqueMinimo: 5 }))).toBe('vencido'); });
  test('"vencido" — vence em ≤ 30 dias', () => {
    const d = new Date(); d.setDate(d.getDate() + 15);
    expect(ctx.Estoque.getStatus(base({ validade: d.toISOString().split('T')[0], quantidade: 100, estoqueMinimo: 5 }))).toBe('vencido');
  });
  test('"ok" — sem campo validade', () => {
    const item = base({ quantidade: 100, estoqueMinimo: 5 }); delete item.validade;
    expect(ctx.Estoque.getStatus(item)).toBe('ok');
  });
});

describe('Estoque — getLabelStatus', () => {
  test.each([
    ['ok',      'Normal',  'badge-ok'],
    ['baixo',   'Baixo',   'badge-baixo'],
    ['critico', 'Crítico', 'badge-critico'],
    ['vencido', 'Vencido', 'badge-vencido'],
  ])('"%s" → label "%s" badge "%s"', (status, label, badge) => {
    const r = ctx.Estoque.getLabelStatus(status);
    expect(r.label).toBe(label);
    expect(r.badge).toBe(badge);
  });
  test('status desconhecido retorna fallback ok', () => { expect(ctx.Estoque.getLabelStatus('xxx').label).toBe('Normal'); });
});

describe('Estoque — registrarMovimentacao', () => {
  beforeEach(limpar);

  test('entrada aumenta quantidade', () => {
    const i = inserir({ quantidade: 50 });
    ctx.Estoque.registrarMovimentacao(i.id, 'entrada', 30, 'João');
    expect(ctx.Estoque.buscarItem(i.id).quantidade).toBe(80);
  });
  test('saída diminui quantidade', () => {
    const i = inserir({ quantidade: 50 });
    ctx.Estoque.registrarMovimentacao(i.id, 'saida', 20, 'Ana');
    expect(ctx.Estoque.buscarItem(i.id).quantidade).toBe(30);
  });
  test('saída com qtd insuficiente retorna erro', () => {
    const i = inserir({ quantidade: 10 });
    expect(ctx.Estoque.registrarMovimentacao(i.id, 'saida', 50, 'X').sucesso).toBe(false);
  });
  test('erro para item inexistente', () => { expect(ctx.Estoque.registrarMovimentacao(999999, 'entrada', 1, 'X').sucesso).toBe(false); });
  test('registra no histórico', () => {
    const i = inserir({ quantidade: 100 });
    ctx.Estoque.registrarMovimentacao(i.id, 'saida', 5, 'Médico');
    const movs = ctx.Estoque.carregarMovimentacoes();
    expect(movs[0].tipo).toBe('saida');
    expect(movs[0].quantidade).toBe(5);
  });
  test('histórico mantém máx 100 itens', () => {
    const i = inserir({ quantidade: 999999 });
    for (let k = 0; k < 110; k++) ctx.Estoque.registrarMovimentacao(i.id, 'entrada', 1, 'X');
    expect(ctx.Estoque.carregarMovimentacoes().length).toBe(100);
  });
});

describe('Estoque — filtrarItens', () => {
  beforeEach(() => {
    limpar();
    inserir({ nome: 'Dipirona',  categoria: 'Medicamentos', quantidade: 100, estoqueMinimo: 10 });
    inserir({ nome: 'Seringa',   categoria: 'Materiais',    quantidade: 5,   estoqueMinimo: 20 });
    inserir({ nome: 'Luva EPI',  categoria: 'EPI',          quantidade: 0,   estoqueMinimo: 10 });
  });

  test('sem filtros retorna todos', () => { expect(ctx.Estoque.filtrarItens().length).toBe(3); });
  test('filtra por busca', () => { expect(ctx.Estoque.filtrarItens({ busca: 'dipiro' }).length).toBe(1); });
  test('filtra por categoria', () => { expect(ctx.Estoque.filtrarItens({ categoria: 'EPI' }).length).toBe(1); });
  test('filtra por status crítico', () => {
    const r = ctx.Estoque.filtrarItens({ status: 'critico' });
    expect(r.length).toBeGreaterThan(0);
    r.forEach(i => expect(ctx.Estoque.getStatus(i)).toBe('critico'));
  });
  test('filtros combinados', () => {
    ctx.Estoque.filtrarItens({ categoria: 'Materiais', status: 'critico' })
      .forEach(i => expect(i.categoria).toBe('Materiais'));
  });
});

describe('Estoque — getStats', () => {
  beforeEach(() => {
    limpar();
    inserir({ quantidade: 100, estoqueMinimo: 10, validade: '2099-12-31' }); // ok
    inserir({ quantidade: 15,  estoqueMinimo: 20, validade: '2099-12-31' }); // baixo
    inserir({ quantidade: 0,   estoqueMinimo: 20, validade: '2099-12-31' }); // critico
    inserir({ quantidade: 50,  estoqueMinimo: 5,  validade: '2000-01-01' }); // vencido
  });

  test('total = 4',    () => { expect(ctx.Estoque.getStats().total).toBe(4); });
  test('ok = 1',       () => { expect(ctx.Estoque.getStats().ok).toBe(1); });
  test('baixos = 1',   () => { expect(ctx.Estoque.getStats().baixos).toBe(1); });
  test('criticos = 1', () => { expect(ctx.Estoque.getStats().criticos).toBe(1); });
  test('vencidos = 1', () => { expect(ctx.Estoque.getStats().vencidos).toBe(1); });
});
