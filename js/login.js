// ============================================================
//  login.js — Controle de autenticação
// ============================================================

const Login = (() => {

  // Usuários válidos (num projeto real isso viria de um servidor)
  const USUARIOS = [
    { usuario: 'admin', senha: 'admin', nome: 'Administrador' },
    { usuario: 'farmacia', senha: '1234', nome: 'Farmacêutico' }
  ];

  const CHAVE_SESSAO = 'estoqueHosp_sessao';

  // Verifica se há sessão ativa e redireciona para o sistema
  function verificarSessao() {
    const sessao = _getSessao();
    if (sessao) {
      _abrirSistema(sessao.nome);
      return true;
    }
    return false;
  }

  // Tenta fazer login com usuário e senha informados
  function tentarLogin() {
    const usuario = document.getElementById('login-usuario').value.trim();
    const senha   = document.getElementById('login-senha').value;

    if (!usuario || !senha) {
      _mostrarErro('Preencha o usuário e a senha.');
      return;
    }

    const encontrado = USUARIOS.find(
      u => u.usuario === usuario && u.senha === senha
    );

    if (encontrado) {
      _esconderErro();
      _salvarSessao(encontrado);
      _abrirSistema(encontrado.nome);
    } else {
      _mostrarErro('Usuário ou senha incorretos.');
      document.getElementById('login-senha').value = '';
      document.getElementById('login-senha').focus();
    }
  }

  // Faz logout e volta para a tela de login
  function sair() {
    _limparSessao();
    document.getElementById('tela-sistema').classList.remove('ativo');
    document.getElementById('tela-login').style.display = 'flex';
    document.getElementById('login-usuario').value = '';
    document.getElementById('login-senha').value = '';
    _esconderErro();
  }

  // --- Privados ---

  function _abrirSistema(nomeUsuario) {
    document.getElementById('tela-login').style.display = 'none';
    document.getElementById('tela-sistema').classList.add('ativo');
    // Mostra o nome do usuário logado, se o elemento existir
    const el = document.getElementById('nome-usuario-logado');
    if (el) el.textContent = nomeUsuario;
    // Inicializa o sistema (nav, relógio, dashboard, etc.)
    if (typeof iniciarSistema === 'function') iniciarSistema();
  }

  function _mostrarErro(msg) {
    const el = document.getElementById('login-erro');
    if (!el) return;
    el.textContent = msg;
    el.classList.add('visivel');
  }

  function _esconderErro() {
    const el = document.getElementById('login-erro');
    if (el) el.classList.remove('visivel');
  }

  function _salvarSessao(usuario) {
    const sessao = { usuario: usuario.usuario, nome: usuario.nome };
    sessionStorage.setItem(CHAVE_SESSAO, JSON.stringify(sessao));
  }

  function _getSessao() {
    try {
      return JSON.parse(sessionStorage.getItem(CHAVE_SESSAO));
    } catch { return null; }
  }

  function _limparSessao() {
    sessionStorage.removeItem(CHAVE_SESSAO);
  }

  return { verificarSessao, tentarLogin, sair };

})();

// ============================================================
//  Inicializa o login quando o DOM estiver pronto
// ============================================================
document.addEventListener('DOMContentLoaded', () => {

  // Se já tem sessão ativa, vai direto pro sistema
  if (Login.verificarSessao()) return;

  // Botão de entrar
  document.getElementById('btn-entrar')
    ?.addEventListener('click', Login.tentarLogin);

  // Permite pressionar Enter nos campos
  ['login-usuario', 'login-senha'].forEach(id => {
    document.getElementById(id)
      ?.addEventListener('keydown', e => {
        if (e.key === 'Enter') Login.tentarLogin();
      });
  });

  // Botão de sair (dentro do sistema)
  document.getElementById('btn-sair')
    ?.addEventListener('click', Login.sair);
});
