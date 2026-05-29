//  main.js — Controlador principal da interface do sistema

// -- NAVEGAÇÃO --

function initNav() {
  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const target = btn.dataset.section;
      const sectionId = 'section-' + target.replace(/\s+/g, '-');

      document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
      btn.classList.add('active');
      document.getElementById(sectionId)?.classList.add('active');

      if (target === 'painel geral') renderPainelGeral();
      if (target === 'estoque') renderTabelaEstoque();
      if (target === 'alertas') Alertas.renderizarAlertas();
    });
  });
}

// -- RELÓGIO --

function initRelogio() {
  function atualizar() {
    const el = document.getElementById('relogio');
    if (!el) return;
    el.textContent = new Date().toLocaleString('pt-BR', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit', second: '2-digit'
    });
  }
  atualizar();
  setInterval(atualizar, 1000);
}

// -- PAINEL GERAL --

function renderPainelGeral() {
  const stats = Estoque.getStats();

  document.getElementById('cards-dashboard').innerHTML = `
    <div class="stat-card ${stats.total === 0 ? '' : 'ok'}">
      <span class="stat-label">Total de Itens</span>
      <span class="stat-value">${stats.total}</span>
      <span class="stat-sub">itens cadastrados</span>
    </div>
    <div class="stat-card ok">
      <span class="stat-label">Normal</span>
      <span class="stat-value">${stats.ok}</span>
      <span class="stat-sub">itens em ordem</span>
    </div>
    <div class="stat-card warning">
      <span class="stat-label">Estoque Baixo</span>
      <span class="stat-value">${stats.baixos}</span>
      <span class="stat-sub">abaixo do mínimo</span>
    </div>
    <div class="stat-card danger">
      <span class="stat-label">Crítico</span>
      <span class="stat-value">${stats.criticos}</span>
      <span class="stat-sub">precisam de atenção</span>
    </div>
    <div class="stat-card ${stats.vencidos > 0 ? 'danger' : ''}">
      <span class="stat-label">Vencidos/Vencendo</span>
      <span class="stat-value">${stats.vencidos}</span>
      <span class="stat-sub">verificar validade</span>
    </div>
  `;

  const movs = Estoque.carregarMovimentacoes().slice(0, 10);
  const tbody = document.getElementById('tbody-movimentacoes');

  if (movs.length === 0) {
    tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;color:var(--text3);padding:24px">Nenhuma movimentação registrada.</td></tr>';
    return;
  }

  tbody.innerHTML = movs.map(m => `
    <tr>
      <td>${m.itemNome}</td>
      <td><span class="badge ${m.tipo === 'entrada' ? 'badge-ok' : 'badge-critico'}">${m.tipo === 'entrada' ? '↑ Entrada' : '↓ Saída'}</span></td>
      <td>${m.quantidade}</td>
      <td>${formatarDataHora(m.data)}</td>
      <td>${m.responsavel || '—'}</td>
    </tr>`).join('');
}

// -- TABELA ESTOQUE --

function renderTabelaEstoque(filtros = {}) {
  const itens = Estoque.filtrarItens(filtros);
  const tbody = document.getElementById('tbody-estoque');
  const vazio = document.getElementById('estoque-vazio');

  if (itens.length === 0) {
    tbody.innerHTML = '';
    vazio.classList.remove('hidden');
    return;
  }

  vazio.classList.add('hidden');
  tbody.innerHTML = itens.map(item => {
    const status = Estoque.getStatus(item);
    const { label, badge } = Estoque.getLabelStatus(status);
    return `
      <tr>
        <td><strong>${item.nome}</strong></td>
        <td><span class="tag-categoria">${item.categoria || '—'}</span></td>
        <td style="font-family:var(--mono)">${item.quantidade}</td>
        <td style="font-family:var(--mono)">${item.estoqueMinimo || 0}</td>
        <td>${item.unidade || '—'}</td>
        <td>${formatarData(item.validade)}</td>
        <td>${item.localizacao || '—'}</td>
        <td><span class="badge ${badge}">${label}</span></td>
        <td>
          <div class="acoes">
            <button class="btn btn-sm btn-info"   onclick="abrirModalMovimentacao(${item.id})">↕</button>
            <button class="btn btn-sm btn-ghost"  onclick="iniciarEdicao(${item.id})">✏️</button>
            <button class="btn btn-sm btn-danger" onclick="confirmarRemocao(${item.id})">🗑</button>
          </div>
        </td>
      </tr>`;
  }).join('');
}

// -- FORMULÁRIO DE ESTOQUE --

let idEmEdicao = null;

function limparFormulario() {
  ['input-nome', 'input-categoria', 'input-quantidade', 'input-minimo',
    'input-unidade', 'input-validade', 'input-localizacao'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.value = '';
    });
}

function iniciarEdicao(id) {
  const item = Estoque.buscarItem(id);
  if (!item) return;

  idEmEdicao = id;
  document.getElementById('input-nome').value = item.nome || '';
  document.getElementById('input-categoria').value = item.categoria || '';
  document.getElementById('input-quantidade').value = item.quantidade || 0;
  document.getElementById('input-minimo').value = item.estoqueMinimo || 0;
  document.getElementById('input-unidade').value = item.unidade || '';
  document.getElementById('input-validade').value = item.validade || '';
  document.getElementById('input-localizacao').value = item.localizacao || '';

  document.getElementById('form-titulo').textContent = 'Editar Item';
  document.getElementById('btn-salvar').textContent = '💾 Salvar Alterações';
  document.getElementById('btn-cancelar-edicao').style.display = 'inline-flex';

  document.querySelector('#section-estoque').scrollIntoView({ behavior: 'smooth' });
}

function cancelarEdicao() {
  idEmEdicao = null;
  limparFormulario();
  document.getElementById('form-titulo').textContent = 'Adicionar Item';
  document.getElementById('btn-salvar').textContent = '＋ Adicionar Item';
  document.getElementById('btn-cancelar-edicao').style.display = 'none';
}

function salvarItem() {
  const nome = document.getElementById('input-nome').value.trim();
  if (!nome) { alert('Informe o nome do item.'); return; }

  const dados = {
    nome,
    categoria: document.getElementById('input-categoria').value,
    quantidade: parseInt(document.getElementById('input-quantidade').value) || 0,
    estoqueMinimo: parseInt(document.getElementById('input-minimo').value) || 0,
    unidade: document.getElementById('input-unidade').value.trim(),
    validade: document.getElementById('input-validade').value,
    localizacao: document.getElementById('input-localizacao').value.trim()
  };

  if (idEmEdicao) {
    Estoque.editarItem(idEmEdicao, dados);
    cancelarEdicao();
  } else {
    Estoque.adicionarItem(dados);
    limparFormulario();
  }

  renderTabelaEstoque(getFiltrosAtivos());
  Alertas.atualizarBanner();
}

function confirmarRemocao(id) {
  const item = Estoque.buscarItem(id);
  if (!item) return;
  if (confirm(`Remover "${item.nome}" do estoque?`)) {
    Estoque.removerItem(id);
    renderTabelaEstoque(getFiltrosAtivos());
    Alertas.atualizarBanner();
  }
}

// -- MODAL DE MOVIMENTAÇÃO --
let itemMovAtivo = null;

function abrirModalMovimentacao(id) {
  const item = Estoque.buscarItem(id);
  if (!item) return;
  itemMovAtivo = id;
  document.getElementById('modal-item-nome').textContent = item.nome;
  document.getElementById('mov-qtd').value = '';
  document.getElementById('mov-responsavel').value = '';
  document.getElementById('mov-tipo').value = 'entrada';
  document.getElementById('modal-mov').classList.remove('hidden');
}

function fecharModal() {
  document.getElementById('modal-mov').classList.add('hidden');
  itemMovAtivo = null;
}

function confirmarMovimentacao() {
  const tipo = document.getElementById('mov-tipo').value;
  const qtd = parseInt(document.getElementById('mov-qtd').value);
  const responsavel = document.getElementById('mov-responsavel').value.trim();

  if (!qtd || qtd <= 0) { alert('Informe uma quantidade válida.'); return; }

  const result = Estoque.registrarMovimentacao(itemMovAtivo, tipo, qtd, responsavel);

  if (!result.sucesso) { alert(result.msg); return; }

  fecharModal();
  renderTabelaEstoque(getFiltrosAtivos());
  Alertas.atualizarBanner();
}

// -- FILTROS --

function getFiltrosAtivos() {
  return {
    busca: document.getElementById('filtro-busca')?.value || '',
    categoria: document.getElementById('filtro-categoria')?.value || '',
    status: document.getElementById('filtro-status')?.value || ''
  };
}

function initFiltros() {
  ['filtro-busca', 'filtro-categoria', 'filtro-status'].forEach(id => {
    document.getElementById(id)
      ?.addEventListener('input', () => renderTabelaEstoque(getFiltrosAtivos()));
  });
}

// -- UTILITÁRIOS --

function formatarData(dataStr) {
  if (!dataStr) return '—';
  const [ano, mes, dia] = dataStr.split('-');
  return `${dia}/${mes}/${ano}`;
}

function formatarDataHora(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });
}

// -- INICIALIZAÇÃO DO SISTEMA --

function iniciarSistema() {
  initNav();
  initRelogio();
  renderPainelGeral();
  initFiltros();

  document.getElementById('btn-salvar')
    ?.addEventListener('click', salvarItem);
  document.getElementById('btn-cancelar-edicao')
    ?.addEventListener('click', cancelarEdicao);
  document.getElementById('btn-confirmar-mov')
    ?.addEventListener('click', confirmarMovimentacao);
  document.getElementById('btn-fechar-modal')
    ?.addEventListener('click', fecharModal);
  document.getElementById('btn-cancelar-mov')
    ?.addEventListener('click', fecharModal);
  document.getElementById('modal-mov')
    ?.addEventListener('click', e => {
      if (e.target === document.getElementById('modal-mov')) fecharModal();
    });

  Alertas.atualizarBanner();

  // Inicia o CRUD de fornecedores, usuários e categorias
  if (typeof CrudUI !== 'undefined') CrudUI.init();
}

// Expõe globalmente para o login.js chamar após autenticar
window.iniciarSistema = iniciarSistema;

document.addEventListener('DOMContentLoaded', () => {
  // O sistema só inicia de verdade quando o login liberar
  // Mas se já estiver autenticado (verificarSessao retorna true), 
  // o login.js chama iniciarSistema via observação do DOM
});
