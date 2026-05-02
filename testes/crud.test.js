// tests/crud.test.js
const { ctx } = require("./loadModules");

function novoRepo(entidade) {
  const repo = new ctx.CrudRepository(entidade, ctx.Schemas[entidade]);
  repo.limparTudo();
  return repo;
}

describe('CrudRepository — criar', () => {
  let repo;
  beforeEach(() => { ctx.localStorage.clear(); repo = novoRepo('fornecedores'); });

  test('cria registro com campo obrigatório', () => {
    const r = repo.criar({ razaoSocial: 'Farmácia Vida' });
    expect(r.sucesso).toBe(true);
    expect(r.dado.razaoSocial).toBe('Farmácia Vida');
    expect(typeof r.dado.id).toBe('number');
  });

  test('aplica default de "ativo"', () => {
    expect(repo.criar({ razaoSocial: 'X' }).dado.ativo).toBe('Sim');
  });

  test('erro ao criar com campo obrigatório vazio', () => {
    const r = repo.criar({ razaoSocial: '' });
    expect(r.sucesso).toBe(false);
    expect(r.erros[0]).toContain('Razão Social');
  });

  test('erro ao criar sem campos', () => {
    expect(repo.criar({}).sucesso).toBe(false);
  });

  test('persiste múltiplos registros', () => {
    repo.criar({ razaoSocial: 'A' });
    repo.criar({ razaoSocial: 'B' });
    expect(repo.contar()).toBe(2);
  });
});

describe('CrudRepository — listar e buscarPorId', () => {
  let repo;
  beforeEach(() => {
    ctx.localStorage.clear();
    repo = novoRepo('fornecedores');
    repo.criar({ razaoSocial: 'Alfa Medicamentos', categoria: 'Medicamentos' });
    repo.criar({ razaoSocial: 'Beta Equipamentos', categoria: 'Equipamentos' });
    repo.criar({ razaoSocial: 'Gama EPI',          categoria: 'EPI' });
  });

  test('lista todos sem filtros', () => { expect(repo.listar().length).toBe(3); });
  test('filtra por busca textual', () => { expect(repo.listar({ busca: 'alfa' })[0].razaoSocial).toBe('Alfa Medicamentos'); });
  test('filtra por campo exato', () => { expect(repo.listar({ categoria: 'EPI' }).length).toBe(1); });
  test('busca inexistente retorna []', () => { expect(repo.listar({ busca: 'xyz' })).toEqual([]); });
  test('buscarPorId encontra registro', () => {
    // Usa um repo limpo para garantir id único
    ctx.localStorage.clear();
    const repo2 = new ctx.CrudRepository('fornecedores2', ctx.Schemas.fornecedores);
    const criado = repo2.criar({ razaoSocial: 'Delta' }).dado;
    expect(repo2.buscarPorId(criado.id).razaoSocial).toBe('Delta');
  });
  test('buscarPorId retorna null para id inválido', () => { expect(repo.buscarPorId(999999)).toBeNull(); });
});

describe('CrudRepository — atualizar', () => {
  let repo, id;
  beforeEach(() => { ctx.localStorage.clear(); repo = novoRepo('fornecedores'); id = repo.criar({ razaoSocial: 'Original' }).dado.id; });

  test('atualiza campo', () => { expect(repo.atualizar(id, { razaoSocial: 'Novo' }).dado.razaoSocial).toBe('Novo'); });
  test('preserva id e criadoEm', () => {
    const orig = repo.buscarPorId(id);
    const r = repo.atualizar(id, { contato: 'X' });
    expect(r.dado.id).toBe(id);
    expect(r.dado.criadoEm).toBe(orig.criadoEm);
  });
  test('atualizadoEm é definido', () => { repo.atualizar(id, { contato: 'Y' }); expect(repo.buscarPorId(id).atualizadoEm).toBeDefined(); });
  test('erro para id inexistente', () => { expect(repo.atualizar(999999, { razaoSocial: 'X' }).sucesso).toBe(false); });
});

describe('CrudRepository — excluir', () => {
  let repo, id;
  beforeEach(() => { ctx.localStorage.clear(); repo = novoRepo('fornecedores'); id = repo.criar({ razaoSocial: 'Para Remover' }).dado.id; });

  test('exclui e retorna dado removido', () => {
    const r = repo.excluir(id);
    expect(r.sucesso).toBe(true);
    expect(repo.buscarPorId(id)).toBeNull();
  });
  test('decrementa contagem', () => { repo.excluir(id); expect(repo.contar()).toBe(0); });
  test('erro para id inexistente', () => { expect(repo.excluir(999999).sucesso).toBe(false); });
});

describe('CrudRepository — limparTudo', () => {
  test('esvazia repositório', () => {
    const repo = novoRepo('categorias');
    repo.criar({ nome: 'A' }); repo.criar({ nome: 'B' });
    repo.limparTudo();
    expect(repo.contar()).toBe(0);
  });
});

describe('ctx.Schemas — estrutura', () => {
  test('fornecedores: razaoSocial é obrigatório', () => {
    expect(ctx.Schemas.fornecedores.campos.find(c => c.nome === 'razaoSocial').obrigatorio).toBe(true);
  });
  test('usuarios: nome é obrigatório', () => {
    expect(ctx.Schemas.usuarios.campos.find(c => c.nome === 'nome').obrigatorio).toBe(true);
  });
  test('categorias: nome é obrigatório', () => {
    expect(ctx.Schemas.categorias.campos.find(c => c.nome === 'nome').obrigatorio).toBe(true);
  });
  test('fornecedores: ativo default "Sim"', () => {
    expect(ctx.Schemas.fornecedores.campos.find(c => c.nome === 'ativo').default).toBe('Sim');
  });
  test('usuarios: perfil default "Operador"', () => {
    expect(ctx.Schemas.usuarios.campos.find(c => c.nome === 'perfil').default).toBe('Operador');
  });
});
