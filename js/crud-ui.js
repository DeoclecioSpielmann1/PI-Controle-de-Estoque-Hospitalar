//  crud-ui.js — Interface visual CRUD

const CrudUI = (() => {
  const repositorios = {
    fornecedores: () => RepFornecedores,
    usuarios: () => RepUsuarios,
    categorias: () => RepCategorias
  };

  let entidadeAtiva = null;
  let idEmEdicao = null;

  function init() {
    _injetarNavButtons();
    _injetarSections();
  }

  function _injetarNavButtons() {
    const nav = document.querySelector('.header-nav');
    if (!nav) return;
    const entidades = [
      { key: 'fornecedores', label: 'Fornecedores' },
      { key: 'usuarios', label: 'Usuários' },
      { key: 'categorias', label: 'Categorias' }
    ];
    entidades.forEach(({ key, label }) => {
      if (nav.querySelector(`[data-section="${key}"]`)) return;
      const btn = document.createElement('button');
      btn.className = 'nav-btn';
      btn.dataset.section = key;
      btn.textContent = label;
      btn.addEventListener('click', () => _abrirSecao(key));
      nav.appendChild(btn);
    });
  }

  function _injetarSections() {
    const main = document.querySelector('.main');
    if (!main) return;
    Object.keys(Schemas).forEach(key => {
      if (document.getElementById(`section-${key}`)) return;
      const section = document.createElement('section');
      section.id = `section-${key}`;
      section.className = 'section';
      section.innerHTML = _templateSection(key);
      main.appendChild(section);
      _bindEventosSection(key);
    });
  }

  function _abrirSecao(key) {
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
    document.querySelector(`[data-section="${key}"]`)?.classList.add('active');
    document.getElementById(`section-${key}`)?.classList.add('active');
    entidadeAtiva = key;
    idEmEdicao = null;
    _renderTabela(key);
    _resetForm(key);
  }

  function _templateSection(key) {
    const schema = Schemas[key];
    return `
      <div class="section-title">
        <h1>${schema.nome}s</h1>
        <p>Cadastro e gerenciamento de ${schema.nome.toLowerCase()}s</p>
      </div>
      <div class="card form-card" id="form-card-${key}">
        <div class="card-header">
          <h2 id="form-titulo-${key}">Novo ${schema.nome}</h2>
          <button class="btn btn-ghost" id="btn-cancelar-${key}" style="display:none">✕ Cancelar</button>
        </div>
        <div class="form-grid" id="form-campos-${key}">${_renderCampos(schema)}</div>
        <div class="form-actions">
          <button class="btn btn-primary" id="btn-salvar-${key}">＋ Adicionar</button>
        </div>
        <div id="form-erros-${key}" class="form-erros hidden"></div>
      </div>
      <div class="filtros">
        <input type="text" class="input-busca" id="busca-${key}" placeholder="🔍 Buscar ${schema.nome.toLowerCase()}..." />
        ${_renderFiltroStatus(key)}
      </div>
      <div class="card tabela-card">
        <div class="card-header">
          <h2>Registros</h2>
          <span class="badge badge-ok" id="contagem-${key}">0 registros</span>
        </div>
        <div style="overflow-x:auto">
          <table class="tabela">
            <thead><tr id="thead-${key}"></tr></thead>
            <tbody id="tbody-${key}"></tbody>
          </table>
        </div>
        <div id="vazio-${key}" class="vazio hidden">Nenhum registro encontrado.</div>
      </div>`;
  }

  function _renderCampos(schema) {
    return schema.campos.map(campo => {
      const id = `campo-${schema.nome.toLowerCase()}-${campo.nome}`;
      let input = campo.tipo === 'select'
        ? `<select id="${id}"><option value="">Selecione...</option>${campo.opcoes.map(o => `<option value="${o}">${o}</option>`).join('')}</select>`
        : `<input type="${campo.tipo}" id="${id}" placeholder="${campo.label}" />`;
      return `<div class="campo"><label>${campo.label}${campo.obrigatorio ? ' <span style="color:var(--danger-light)">*</span>' : ''}</label>${input}</div>`;
    }).join('');
  }

  function _renderFiltroStatus(key) {
    const temAtivo = Schemas[key].campos.some(c => c.nome === 'ativo');
    if (!temAtivo) return '';
    return `<select class="select-filtro" id="filtro-ativo-${key}">
      <option value="">Todos</option>
      <option value="Sim">Ativos</option>
      <option value="Não">Inativos</option>
    </select>`;
  }

  function _bindEventosSection(key) {
    setTimeout(() => {
      document.getElementById(`btn-salvar-${key}`)?.addEventListener('click', () => _salvar(key));
      document.getElementById(`btn-cancelar-${key}`)?.addEventListener('click', () => _cancelarEdicao(key));
      document.getElementById(`busca-${key}`)?.addEventListener('input', () => _renderTabela(key));
      document.getElementById(`filtro-ativo-${key}`)?.addEventListener('change', () => _renderTabela(key));
    }, 50);
  }

  function _salvar(key) {
    const rep = repositorios[key]();
    const schema = Schemas[key];
    const dados = _coletarForm(key, schema);
    const resultado = idEmEdicao ? rep.atualizar(idEmEdicao, dados) : rep.criar(dados);
    if (!resultado.sucesso) { _mostrarErros(key, resultado.erros); return; }
    _esconderErros(key);
    _cancelarEdicao(key);
    _renderTabela(key);
  }

  function _iniciarEdicao(key, id) {
    const rep = repositorios[key]();
    const schema = Schemas[key];
    const item = rep.buscarPorId(id);
    if (!item) return;
    idEmEdicao = id;
    schema.campos.forEach(campo => {
      const el = document.getElementById(`campo-${schema.nome.toLowerCase()}-${campo.nome}`);
      if (el) el.value = item[campo.nome] ?? '';
    });
    document.getElementById(`form-titulo-${key}`).textContent = `Editar ${schema.nome}`;
    document.getElementById(`btn-salvar-${key}`).textContent = '💾 Salvar';
    document.getElementById(`btn-cancelar-${key}`).style.display = 'inline-flex';
    document.getElementById(`form-card-${key}`)?.scrollIntoView({ behavior: 'smooth' });
  }

  function _excluir(key, id) {
    const rep = repositorios[key]();
    const item = rep.buscarPorId(id);
    if (!item) return;
    const nomeItem = item.razaoSocial || item.nome || `#${id}`;
    if (!confirm(`Excluir "${nomeItem}"?`)) return;
    rep.excluir(id);
    _renderTabela(key);
  }

  function _cancelarEdicao(key) {
    idEmEdicao = null;
    _resetForm(key);
    document.getElementById(`form-titulo-${key}`).textContent = `Novo ${Schemas[key].nome}`;
    document.getElementById(`btn-salvar-${key}`).textContent = '＋ Adicionar';
    document.getElementById(`btn-cancelar-${key}`).style.display = 'none';
    _esconderErros(key);
  }

  function _renderTabela(key) {
    const rep = repositorios[key]();
    const schema = Schemas[key];
    const filtros = { busca: document.getElementById(`busca-${key}`)?.value || '' };
    const filtroAtivo = document.getElementById(`filtro-ativo-${key}`)?.value;
    if (filtroAtivo) filtros.ativo = filtroAtivo;
    const registros = rep.listar(filtros);

    const thead = document.getElementById(`thead-${key}`);
    if (thead && thead.children.length === 0) {
      thead.innerHTML = schema.campos.map(c => `<th>${c.label}</th>`).join('') + '<th>Criado em</th><th>Ações</th>';
    }

    const tbody = document.getElementById(`tbody-${key}`);
    const vazio = document.getElementById(`vazio-${key}`);
    const cont = document.getElementById(`contagem-${key}`);

    if (cont) cont.textContent = `${registros.length} registro(s)`;

    if (registros.length === 0) {
      tbody.innerHTML = '';
      vazio?.classList.remove('hidden');
      return;
    }
    vazio?.classList.add('hidden');

    tbody.innerHTML = registros.map(item => {
      const celulas = schema.campos.map(campo => {
        const val = item[campo.nome] ?? '—';
        if (campo.nome === 'ativo') return `<td><span class="badge ${val === 'Sim' ? 'badge-ok' : 'badge-critico'}">${val}</span></td>`;
        return `<td>${val}</td>`;
      }).join('');
      return `<tr>${celulas}<td style="font-size:11px;color:var(--text3)">${_formatarData(item.criadoEm)}</td><td><div class="acoes"><button class="btn btn-sm btn-ghost" onclick="CrudUI._iniciarEdicao('${key}', ${item.id})">✏️</button><button class="btn btn-sm btn-danger" onclick="CrudUI._excluir('${key}', ${item.id})">🗑</button></div></td></tr>`;
    }).join('');
  }

  function _coletarForm(key, schema) {
    const dados = {};
    schema.campos.forEach(campo => {
      const el = document.getElementById(`campo-${schema.nome.toLowerCase()}-${campo.nome}`);
      if (el) dados[campo.nome] = campo.tipo === 'number' ? (el.value !== '' ? Number(el.value) : '') : el.value;
    });
    return dados;
  }

  function _resetForm(key) {
    Schemas[key].campos.forEach(campo => {
      const el = document.getElementById(`campo-${Schemas[key].nome.toLowerCase()}-${campo.nome}`);
      if (el) el.value = campo.default ?? '';
    });
  }

  function _mostrarErros(key, erros) {
    const el = document.getElementById(`form-erros-${key}`);
    if (!el) return;
    el.innerHTML = erros.map(e => `<span>⚠ ${e}</span>`).join('');
    el.classList.remove('hidden');
  }

  function _esconderErros(key) {
    document.getElementById(`form-erros-${key}`)?.classList.add('hidden');
  }

  function _formatarData(iso) {
    if (!iso) return '—';
    return new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  }

  return { init, _iniciarEdicao, _excluir };
})();
