// ============================================================
//  alertas.js — Central de alertas do estoque hospitalar
// ============================================================

const Alertas = (() => {

  function getAlertas() {
    const itens   = Estoque.carregarItens();
    const alertas = [];

    itens.forEach(item => {
      const status = Estoque.getStatus(item);

      if (status === 'critico') {
        alertas.push({
          tipo:     'critico',
          icon:     '🚨',
          titulo:   item.nome,
          descricao: item.quantidade === 0
            ? 'Estoque zerado! Necessita reposição imediata.'
            : `Estoque crítico: ${item.quantidade} ${item.unidade || 'unid'} (mínimo: ${item.estoqueMinimo})`,
          item
        });
      } else if (status === 'baixo') {
        alertas.push({
          tipo:      'baixo',
          icon:      '⚠️',
          titulo:    item.nome,
          descricao: `Estoque abaixo do mínimo: ${item.quantidade} ${item.unidade || 'unid'} (mínimo: ${item.estoqueMinimo})`,
          item
        });
      } else if (status === 'vencido') {
        const hoje = new Date();
        hoje.setHours(0, 0, 0, 0);
        const val  = new Date(item.validade + 'T00:00:00');
        const diff = Math.round((val - hoje) / (1000 * 60 * 60 * 24));

        alertas.push({
          tipo:      'vencido',
          icon:      '📅',
          titulo:    item.nome,
          descricao: diff < 0
            ? `Produto vencido em ${_formatarData(item.validade)}. Retirar do estoque.`
            : `Vence em ${diff} dia(s) — ${_formatarData(item.validade)}. Verificar substituição.`,
          item
        });
      }
    });

    // Ordem: critico → vencido → baixo
    const ordem = { critico: 0, vencido: 1, baixo: 2 };
    alertas.sort((a, b) => ordem[a.tipo] - ordem[b.tipo]);

    return alertas;
  }

  function _formatarData(dataStr) {
    if (!dataStr) return '—';
    const [ano, mes, dia] = dataStr.split('-');
    return `${dia}/${mes}/${ano}`;
  }

  function renderizarAlertas() {
    const container = document.getElementById('lista-alertas');
    if (!container) return;

    const alertas = getAlertas();

    if (alertas.length === 0) {
      container.innerHTML = `
        <div class="alerta-vazio">
          <div class="alerta-vazio-icon">✅</div>
          <p>Nenhum alerta no momento. Estoque em ordem!</p>
        </div>`;
      return;
    }

    container.innerHTML = alertas.map(a => `
      <div class="alerta-item ${a.tipo}">
        <span class="alerta-icon">${a.icon}</span>
        <div class="alerta-info">
          <strong>${a.titulo}</strong>
          <p>${a.descricao}</p>
          ${a.item.localizacao ? `<p>📍 ${a.item.localizacao}</p>` : ''}
        </div>
        <span class="badge badge-${a.tipo === 'baixo' ? 'baixo' : a.tipo === 'critico' ? 'critico' : 'vencido'}">
          ${a.tipo === 'baixo' ? 'Baixo' : a.tipo === 'critico' ? 'Crítico' : 'Validade'}
        </span>
      </div>`).join('');
  }

  function atualizarBanner() {
    const banner = document.getElementById('alertas-banner');
    if (!banner) return;

    const alertas = getAlertas();
    const criticos = alertas.filter(a => a.tipo === 'critico').length;
    const vencidos = alertas.filter(a => a.tipo === 'vencido').length;

    if (criticos === 0 && vencidos === 0) {
      banner.classList.add('hidden');
      return;
    }

    const partes = [];
    if (criticos > 0) partes.push(`🚨 ${criticos} item(ns) em nível crítico`);
    if (vencidos > 0) partes.push(`📅 ${vencidos} item(ns) com validade expirada/próxima`);

    banner.textContent = partes.join('  •  ');
    banner.classList.remove('hidden');
  }

  return { getAlertas, renderizarAlertas, atualizarBanner };

})();
