// ============================================================
//  estoque.js — Gerenciamento do estoque hospitalar
// ============================================================

const Estoque = (() => {

  const STORAGE_KEY = 'estoqueHosp_itens';
  const MOV_KEY     = 'estoqueHosp_movimentacoes';

  // ---------- DADOS ----------

  function carregarItens() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
    } catch { return []; }
  }

  function salvarItens(itens) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(itens));
  }

  function carregarMovimentacoes() {
    try {
      return JSON.parse(localStorage.getItem(MOV_KEY)) || [];
    } catch { return []; }
  }

  function salvarMovimentacoes(movs) {
    localStorage.setItem(MOV_KEY, JSON.stringify(movs));
  }

  // ---------- CRUD ----------

  function adicionarItem(item) {
    const itens = carregarItens();
    item.id = Date.now();
    item.criadoEm = new Date().toISOString();
    itens.push(item);
    salvarItens(itens);
    return item;
  }

  function editarItem(id, dados) {
    const itens = carregarItens();
    const idx = itens.findIndex(i => i.id === id);
    if (idx === -1) return null;
    itens[idx] = { ...itens[idx], ...dados };
    salvarItens(itens);
    return itens[idx];
  }

  function removerItem(id) {
    const itens = carregarItens().filter(i => i.id !== id);
    salvarItens(itens);
  }

  function buscarItem(id) {
    return carregarItens().find(i => i.id === id) || null;
  }

  // ---------- MOVIMENTAÇÕES ----------

  function registrarMovimentacao(itemId, tipo, quantidade, responsavel) {
    const itens = carregarItens();
    const idx = itens.findIndex(i => i.id === itemId);
    if (idx === -1) return { sucesso: false, msg: 'Item não encontrado.' };

    const item = itens[idx];
    const qtd = parseInt(quantidade);

    if (tipo === 'saida') {
      if (qtd > item.quantidade) {
        return { sucesso: false, msg: `Quantidade insuficiente. Disponível: ${item.quantidade}` };
      }
      item.quantidade -= qtd;
    } else {
      item.quantidade += qtd;
    }

    salvarItens(itens);

    const movs = carregarMovimentacoes();
    movs.unshift({
      id: Date.now(),
      itemId,
      itemNome: item.nome,
      tipo,
      quantidade: qtd,
      responsavel,
      data: new Date().toISOString()
    });
    // manter apenas últimas 100 movimentações
    salvarMovimentacoes(movs.slice(0, 100));

    return { sucesso: true, item };
  }

  // ---------- STATUS ----------

  function getStatus(item) {
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    if (item.validade) {
      const val = new Date(item.validade + 'T00:00:00');
      const diff = (val - hoje) / (1000 * 60 * 60 * 24);
      if (diff < 0) return 'vencido';
      if (diff <= 30) return 'vencido'; // vencendo em 30 dias
    }

    const min = parseInt(item.estoqueMinimo) || 0;
    const qtd = parseInt(item.quantidade) || 0;

    if (qtd === 0) return 'critico';
    if (qtd <= min * 0.5) return 'critico';
    if (qtd <= min) return 'baixo';
    return 'ok';
  }

  function getLabelStatus(status) {
    const map = {
      ok:      { label: 'Normal',    badge: 'badge-ok' },
      baixo:   { label: 'Baixo',     badge: 'badge-baixo' },
      critico: { label: 'Crítico',   badge: 'badge-critico' },
      vencido: { label: 'Vencido',   badge: 'badge-vencido' }
    };
    return map[status] || map['ok'];
  }

  // ---------- FILTROS ----------

  function filtrarItens({ busca = '', categoria = '', status = '' } = {}) {
    return carregarItens().filter(item => {
      const matchBusca = !busca || item.nome.toLowerCase().includes(busca.toLowerCase());
      const matchCat   = !categoria || item.categoria === categoria;
      const matchStatus = !status || getStatus(item) === status;
      return matchBusca && matchCat && matchStatus;
    });
  }

  // ---------- STATS ----------

  function getStats() {
    const itens = carregarItens();
    const total    = itens.length;
    const criticos = itens.filter(i => getStatus(i) === 'critico').length;
    const baixos   = itens.filter(i => getStatus(i) === 'baixo').length;
    const vencidos = itens.filter(i => getStatus(i) === 'vencido').length;
    const ok       = itens.filter(i => getStatus(i) === 'ok').length;
    return { total, criticos, baixos, vencidos, ok };
  }

  // ---------- API PÚBLICA ----------

  return {
    carregarItens,
    adicionarItem,
    editarItem,
    removerItem,
    buscarItem,
    registrarMovimentacao,
    carregarMovimentacoes,
    getStatus,
    getLabelStatus,
    filtrarItens,
    getStats
  };

})();
