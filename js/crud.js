// ============================================================
//  crud.js — Motor CRUD genérico (não altera código existente)
//  Uso: const repo = new CrudRepository('fornecedores', FornecedorSchema)
// ============================================================

class CrudRepository {

  /**
   * @param {string} entidade - chave usada no localStorage (ex: 'fornecedores')
   * @param {object} schema   - definição dos campos da entidade
   */
  constructor(entidade, schema) {
    this.entidade = entidade;
    this.schema   = schema;
    this.storageKey = `estoqueHosp_${entidade}`;
  }

  // ---------- PERSISTÊNCIA ----------

  _carregar() {
    try {
      return JSON.parse(localStorage.getItem(this.storageKey)) || [];
    } catch { return []; }
  }

  _salvar(dados) {
    localStorage.setItem(this.storageKey, JSON.stringify(dados));
  }

  // ---------- CREATE ----------

  criar(dados) {
    const erros = this._validar(dados);
    if (erros.length > 0) return { sucesso: false, erros };

    const registros = this._carregar();
    const novo = {
      id: Date.now(),
      ...this._aplicarDefaults(dados),
      criadoEm: new Date().toISOString(),
      atualizadoEm: new Date().toISOString()
    };
    registros.push(novo);
    this._salvar(registros);
    return { sucesso: true, dado: novo };
  }

  // ---------- READ ----------

  listar(filtros = {}) {
    let registros = this._carregar();

    // filtro texto em qualquer campo string
    if (filtros.busca) {
      const termo = filtros.busca.toLowerCase();
      registros = registros.filter(r =>
        Object.values(r).some(v =>
          typeof v === 'string' && v.toLowerCase().includes(termo)
        )
      );
    }

    // filtros exatos por campo
    Object.entries(filtros).forEach(([campo, valor]) => {
      if (campo === 'busca' || !valor) return;
      registros = registros.filter(r => String(r[campo]) === String(valor));
    });

    return registros;
  }

  buscarPorId(id) {
    return this._carregar().find(r => r.id === Number(id)) || null;
  }

  // ---------- UPDATE ----------

  atualizar(id, dados) {
    const erros = this._validar(dados, true);
    if (erros.length > 0) return { sucesso: false, erros };

    const registros = this._carregar();
    const idx = registros.findIndex(r => r.id === Number(id));
    if (idx === -1) return { sucesso: false, erros: ['Registro não encontrado.'] };

    registros[idx] = {
      ...registros[idx],
      ...dados,
      id: registros[idx].id,
      criadoEm: registros[idx].criadoEm,
      atualizadoEm: new Date().toISOString()
    };
    this._salvar(registros);
    return { sucesso: true, dado: registros[idx] };
  }

  // ---------- DELETE ----------

  excluir(id) {
    const registros = this._carregar();
    const idx = registros.findIndex(r => r.id === Number(id));
    if (idx === -1) return { sucesso: false, erros: ['Registro não encontrado.'] };
    const [removido] = registros.splice(idx, 1);
    this._salvar(registros);
    return { sucesso: true, dado: removido };
  }

  // ---------- VALIDAÇÃO ----------

  _validar(dados, parcial = false) {
    const erros = [];
    this.schema.campos.forEach(campo => {
      if (campo.obrigatorio && !parcial) {
        const val = dados[campo.nome];
        if (val === undefined || val === null || String(val).trim() === '') {
          erros.push(`O campo "${campo.label}" é obrigatório.`);
        }
      }
      if (dados[campo.nome] !== undefined && campo.tipo === 'number') {
        if (isNaN(Number(dados[campo.nome]))) {
          erros.push(`O campo "${campo.label}" deve ser numérico.`);
        }
      }
    });
    return erros;
  }

  _aplicarDefaults(dados) {
    const result = { ...dados };
    this.schema.campos.forEach(campo => {
      if (result[campo.nome] === undefined && campo.default !== undefined) {
        result[campo.nome] = campo.default;
      }
    });
    return result;
  }

  // ---------- UTILITÁRIOS ----------

  contar() { return this._carregar().length; }

  limparTudo() {
    this._salvar([]);
    return { sucesso: true };
  }
}


// ============================================================
//  SCHEMAS das entidades
// ============================================================

const Schemas = {

  fornecedores: {
    nome: 'Fornecedor',
    campos: [
      { nome: 'razaoSocial',  label: 'Razão Social',   tipo: 'text',   obrigatorio: true },
      { nome: 'cnpj',         label: 'CNPJ',            tipo: 'text',   obrigatorio: false },
      { nome: 'contato',      label: 'Contato',         tipo: 'text',   obrigatorio: false },
      { nome: 'telefone',     label: 'Telefone',        tipo: 'text',   obrigatorio: false },
      { nome: 'email',        label: 'E-mail',          tipo: 'email',  obrigatorio: false },
      { nome: 'categoria',    label: 'Categoria',       tipo: 'select', obrigatorio: false,
        opcoes: ['Medicamentos','Materiais','Equipamentos','EPI','Outros'] },
      { nome: 'ativo',        label: 'Ativo',           tipo: 'select', obrigatorio: false,
        opcoes: ['Sim','Não'], default: 'Sim' }
    ]
  },

  usuarios: {
    nome: 'Usuário',
    campos: [
      { nome: 'nome',     label: 'Nome Completo', tipo: 'text',   obrigatorio: true },
      { nome: 'matricula',label: 'Matrícula',     tipo: 'text',   obrigatorio: false },
      { nome: 'cargo',    label: 'Cargo',         tipo: 'select', obrigatorio: false,
        opcoes: ['Farmacêutico','Enfermeiro','Médico','Técnico','Administrativo','Outro'] },
      { nome: 'setor',    label: 'Setor',         tipo: 'text',   obrigatorio: false },
      { nome: 'email',    label: 'E-mail',        tipo: 'email',  obrigatorio: false },
      { nome: 'perfil',   label: 'Perfil',        tipo: 'select', obrigatorio: false,
        opcoes: ['Administrador','Operador','Visualizador'], default: 'Operador' },
      { nome: 'ativo',    label: 'Ativo',         tipo: 'select', obrigatorio: false,
        opcoes: ['Sim','Não'], default: 'Sim' }
    ]
  },

  categorias: {
    nome: 'Categoria',
    campos: [
      { nome: 'nome',      label: 'Nome da Categoria', tipo: 'text',   obrigatorio: true },
      { nome: 'descricao', label: 'Descrição',         tipo: 'text',   obrigatorio: false },
      { nome: 'cor',       label: 'Cor',               tipo: 'select', obrigatorio: false,
        opcoes: ['Verde','Azul','Amarelo','Vermelho','Roxo','Cinza'], default: 'Cinza' },
      { nome: 'ativo',     label: 'Ativo',             tipo: 'select', obrigatorio: false,
        opcoes: ['Sim','Não'], default: 'Sim' }
    ]
  }

};


// ============================================================
//  Instâncias prontas para uso em qualquer lugar do projeto
// ============================================================

const RepFornecedores = new CrudRepository('fornecedores', Schemas.fornecedores);
const RepUsuarios     = new CrudRepository('usuarios',     Schemas.usuarios);
const RepCategorias   = new CrudRepository('categorias',   Schemas.categorias);
