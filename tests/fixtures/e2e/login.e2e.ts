/**
 * @description Fluxo realista de autenticação para validação de login mobile
 * @author Time QA
 */
describe('Login', () => {
  beforeAll(async () => {
    await device.launchApp();
  });

  beforeEach(async () => {
    await device.reloadReactNative();
  });

  describe('Acesso inicial', () => {
    /**
     * @description Garante que a tela de login abre com os campos principais.
     * @screen Login
     * @priority alta
     */
    it('deve exibir a tela de login com campos obrigatórios', async () => {
      await expect(element(by.id('loginScreen'))).toBeVisible();
      await expect(element(by.id('emailInput'))).toBeVisible();
      await expect(element(by.id('passwordInput'))).toBeVisible();
      await expect(element(by.id('loginButton'))).toBeVisible();
    });

    /**
     * @description Valida acesso ao fluxo de recuperação de senha.
     * @screen Login
     * @priority média
     */
    it('deve navegar para recuperação de senha', async () => {
      await element(by.id('forgotPasswordLink')).tap();
      await expect(element(by.id('forgotPasswordScreen'))).toBeVisible();
      await expect(element(by.text('Recuperar senha'))).toBeVisible();
    });
  });

  describe('Validação de formulário', () => {
    /**
     * @description Impede login sem e-mail preenchido.
     * @screen Login
     * @priority alta
     */
    it('deve exibir erro quando o e-mail estiver vazio', async () => {
      await element(by.id('passwordInput')).typeText('Senha123!');
      await element(by.id('loginButton')).tap();
      await expect(element(by.text('Informe seu e-mail'))).toBeVisible();
    });

    /**
     * @description Impede login sem senha preenchida.
     * @screen Login
     * @priority alta
     */
    it('deve exibir erro quando a senha estiver vazia', async () => {
      await element(by.id('emailInput')).typeText('cliente@empresa.com');
      await element(by.id('loginButton')).tap();
      await expect(element(by.text('Informe sua senha'))).toBeVisible();
    });

    /**
     * @description Bloqueia e-mail fora do formato esperado.
     * @screen Login
     * @priority média
     */
    it('deve validar formato inválido de e-mail', async () => {
      await element(by.id('emailInput')).typeText('cliente-empresa');
      await element(by.id('passwordInput')).typeText('Senha123!');
      await element(by.id('loginButton')).tap();
      await expect(element(by.text('E-mail inválido'))).toBeVisible();
    });
  });

  describe('Autenticação', () => {
    /**
     * @description Realiza login com credenciais válidas e abre a home.
     * @screen Login
     * @priority crítica
     */
    it('deve autenticar usuário com credenciais válidas', async () => {
      await element(by.id('emailInput')).typeText('cliente@empresa.com');
      await element(by.id('passwordInput')).typeText('Senha123!');
      await element(by.id('loginButton')).tap();
      await waitFor(element(by.id('homeScreen'))).toBeVisible().withTimeout(5000);
      await expect(element(by.text('Olá, Cliente'))).toBeVisible();
    });

    /**
     * @description Exibe mensagem de erro quando a senha não confere.
     * @screen Login
     * @priority alta
     */
    it('deve exibir erro para senha incorreta', async () => {
      await element(by.id('emailInput')).typeText('cliente@empresa.com');
      await element(by.id('passwordInput')).typeText('senha-errada');
      await element(by.id('loginButton')).tap();
      await expect(element(by.text('E-mail ou senha inválidos'))).toBeVisible();
    });

    /**
     * @description Mantém o botão de entrar bloqueado durante o envio.
     * @screen Login
     * @priority média
     */
    it('deve exibir carregamento durante autenticação', async () => {
      await element(by.id('emailInput')).typeText('cliente@empresa.com');
      await element(by.id('passwordInput')).typeText('Senha123!');
      await element(by.id('loginButton')).tap();
      await expect(element(by.id('loginLoading'))).toBeVisible();
      await expect(element(by.id('loginButton'))).toBeNotVisible();
    });
  });

  describe('Sessão do usuário', () => {
    beforeEach(async () => {
      await element(by.id('emailInput')).typeText('cliente@empresa.com');
      await element(by.id('passwordInput')).typeText('Senha123!');
      await element(by.id('loginButton')).tap();
      await waitFor(element(by.id('homeScreen'))).toBeVisible().withTimeout(5000);
    });

    /**
     * @description Confirma que o usuário autenticado visualiza dados da conta.
     * @screen Home
     * @priority alta
     */
    it('deve exibir dados do usuário logado na home', async () => {
      await expect(element(by.id('profileSummary'))).toBeVisible();
      await expect(element(by.text('cliente@empresa.com'))).toBeVisible();
    });

    /**
     * @description Garante que o logout encerra a sessão e retorna ao login.
     * @screen Home
     * @priority alta
     */
    it('deve encerrar sessão ao tocar em sair', async () => {
      await element(by.id('profileMenuButton')).tap();
      await element(by.id('logoutButton')).tap();
      await expect(element(by.id('loginScreen'))).toBeVisible();
    });
  });
});
