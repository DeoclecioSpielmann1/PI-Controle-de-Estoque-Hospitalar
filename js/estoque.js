//  estoque.js — Lógica de negócio do estoque hospitalar

const Estoque = (() => {

  const CHAVE_ITENS = 'estoqueHosp_itens';
  const CHAVE_MOVS = 'estoqueHosp_movimentacoes';

  // -- PERSISTÊNCIA --

  function carregarItens() {
    try {
      return JSON.parse(localStorage.getItem(CHAVE_ITENS)) || [];
    } catch { return []; }
  }

  function _salvarItens(itens) {
    localStorage.setItem(CHAVE_ITENS, JSON.stringify(itens));
  }

  function carregarMovimentacoes() {
    try {
      return JSON.parse(localStorage.getItem(CHAVE_MOVS)) || [];
    } catch { return []; }
  }

  function _salvarMovimentacoes(movs) {
    localStorage.setItem(CHAVE_MOVS, JSON.stringify(movs));
  }

  // -- CRUD --

  function adicionarItem(dados) {
    const itens = carregarItens();
    const novo = { id: Date.now(), ...dados };
    itens.push(novo);
    _salvarItens(itens);
    return novo;
  }

  function buscarItem(id) {
    return carregarItens().find(i => i.id === Number(id)) || null;
  }

  function editarItem(id, dados) {
    const itens = carregarItens();
    const idx = itens.findIndex(i => i.id === Number(id));
    if (idx === -1) return null;
    itens[idx] = { ...itens[idx], ...dados };
    _salvarItens(itens);
    return itens[idx];
  }

  function removerItem(id) {
    const itens = carregarItens().filter(i => i.id !== Number(id));
    _salvarItens(itens);
  }

  // -- STATUS --

  function getStatus(item) {
    // Verifica validade primeiro
    if (item.validade) {
      const hoje = new Date();
      hoje.setHours(0, 0, 0, 0);
      const val = new Date(item.validade + 'T00:00:00');
      const diff = Math.round((val - hoje) / (1000 * 60 * 60 * 24));
      if (diff <= 30) return 'vencido';
    }

    const qtd = Number(item.quantidade) || 0;
    const min = Number(item.estoqueMinimo) || 0;

    if (qtd === 0 || (min > 0 && qtd <= min * 0.5)) return 'critico';
    if (min > 0 && qtd < min) return 'baixo';
    return 'ok';
  }

  function getLabelStatus(status) {
    const mapa = {
      ok: { label: 'Normal', badge: 'badge-ok' },
      baixo: { label: 'Baixo', badge: 'badge-baixo' },
      critico: { label: 'Crítico', badge: 'badge-critico' },
      vencido: { label: 'Vencido', badge: 'badge-vencido' },
    };
    return mapa[status] || mapa.ok;
  }

  // -- MOVIMENTAÇÕES --

  function registrarMovimentacao(id, tipo, quantidade, responsavel) {
    const item = buscarItem(id);
    if (!item) return { sucesso: false, msg: 'Item não encontrado.' };

    const qtd = Number(quantidade);
    const novaQtd = tipo === 'entrada'
      ? item.quantidade + qtd
      : item.quantidade - qtd;

    if (novaQtd < 0) {
      return { sucesso: false, msg: `Quantidade insuficiente. Estoque atual: ${item.quantidade}` };
    }

    editarItem(id, { quantidade: novaQtd });

    // Salva no histórico (máximo 100 registros)
    const movs = carregarMovimentacoes();
    movs.unshift({
      id: Date.now(),
      itemId: item.id,
      itemNome: item.nome,
      tipo,
      quantidade: qtd,
      responsavel: responsavel || '',
      data: new Date().toISOString()
    });
    _salvarMovimentacoes(movs.slice(0, 100));

    return { sucesso: true };
  }

  // -- FILTROS --

  function filtrarItens(filtros = {}) {
    let itens = carregarItens();

    if (filtros.busca) {
      const t = filtros.busca.toLowerCase();
      itens = itens.filter(i =>
        i.nome?.toLowerCase().includes(t) ||
        i.categoria?.toLowerCase().includes(t) ||
        i.localizacao?.toLowerCase().includes(t)
      );
    }

    if (filtros.categoria) {
      itens = itens.filter(i => i.categoria === filtros.categoria);
    }

    if (filtros.status) {
      itens = itens.filter(i => getStatus(i) === filtros.status);
    }

    return itens;
  }

  // -- ESTATÍSTICAS --

  function getStats() {
    const itens = carregarItens();
    return {
      total: itens.length,
      ok: itens.filter(i => getStatus(i) === 'ok').length,
      baixos: itens.filter(i => getStatus(i) === 'baixo').length,
      criticos: itens.filter(i => getStatus(i) === 'critico').length,
      vencidos: itens.filter(i => getStatus(i) === 'vencido').length,
    };
  }

  return {
    carregarItens,
    carregarMovimentacoes,
    adicionarItem,
    buscarItem,
    editarItem,
    removerItem,
    getStatus,
    getLabelStatus,
    registrarMovimentacao,
    filtrarItens,
    getStats
  };

})();
