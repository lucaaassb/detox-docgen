/**
 * @description Manutenção de perfil, segurança da conta e preferências do usuário
 * @author Time QA
 */
describe('Perfil do usuário', () => {
  beforeAll(async () => {
    await device.launchApp({ newInstance: true });
  });

  beforeEach(async () => {
    await device.reloadReactNative();
    await element(by.id('emailInput')).typeText('cliente@empresa.com');
    await element(by.id('passwordInput')).typeText('Senha123!');
    await element(by.id('loginButton')).tap();
    await waitFor(element(by.id('homeScreen'))).toBeVisible().withTimeout(5000);
    await element(by.id('profileMenuButton')).tap();
  });

  afterAll(async () => {
    await device.terminateApp();
  });

  describe('Dados cadastrais', () => {
    /**
     * @description Exibe os dados principais do cliente autenticado.
     * @screen Perfil
     * @priority alta
     */
    it('deve exibir dados cadastrais do usuário', async () => {
      await expect(element(by.id('profileScreen'))).toBeVisible();
      await expect(element(by.text('Cliente Empresa'))).toBeVisible();
      await expect(element(by.text('cliente@empresa.com'))).toBeVisible();
    });

    /**
     * @description Atualiza telefone de contato com validação de formato.
     * @screen Perfil
     * @priority média
     */
    it('deve atualizar telefone de contato', async () => {
      await element(by.id('editPhoneButton')).tap();
      await element(by.id('phoneInput')).replaceText('(11) 99999-0000');
      await element(by.id('savePhoneButton')).tap();
      await expect(element(by.id('profileSavedToast'))).toBeVisible();
      await expect(element(by.text('Telefone atualizado'))).toBeVisible();
    });

    /**
     * @description Impede salvar endereço quando o CEP é inválido.
     * @screen Perfil
     * @priority média
     */
    test('deve validar CEP inválido ao editar endereço', async () => {
      await element(by.id('editAddressButton')).tap();
      await element(by.id('zipCodeInput')).replaceText('000');
      await element(by.id('saveAddressButton')).tap();
      await expect(element(by.id('zipCodeError'))).toBeVisible();
      await expect(element(by.text('CEP inválido'))).toBeVisible();
    });
  });

  describe('Segurança da conta', () => {
    /**
     * @description Altera senha quando os campos obrigatórios são preenchidos corretamente.
     * @screen Segurança
     * @priority alta
     */
    it('deve alterar senha do usuário', async () => {
      await element(by.id('securityTab')).tap();
      await element(by.id('currentPasswordInput')).typeText('Senha123!');
      await element(by.id('newPasswordInput')).typeText('NovaSenha123!');
      await element(by.id('confirmNewPasswordInput')).typeText('NovaSenha123!');
      await element(by.id('savePasswordButton')).tap();
      await expect(element(by.id('passwordChangedMessage'))).toBeVisible();
    });

    /**
     * @description Habilita autenticação em duas etapas pelo aplicativo autenticador.
     * @screen Segurança
     * @priority alta
     */
    it('deve habilitar autenticação em duas etapas', async () => {
      await element(by.id('securityTab')).tap();
      await element(by.id('twoFactorSwitch')).tap();
      await expect(element(by.id('twoFactorSetupScreen'))).toBeVisible();
      await element(by.id('authenticatorCodeInput')).typeText('123456');
      await element(by.id('confirmTwoFactorButton')).tap();
      await expect(element(by.text('Verificação em duas etapas ativada'))).toBeVisible();
    });

    /**
     * @description Encerra sessões ativas em outros dispositivos.
     * @screen Segurança
     * @priority média
     */
    it('deve revogar sessões de outros dispositivos', async () => {
      await element(by.id('securityTab')).tap();
      await element(by.id('activeSessionsButton')).tap();
      await element(by.id('revokeOtherSessionsButton')).tap();
      await element(by.text('Revogar sessões')).tap();
      await expect(element(by.id('sessionsRevokedToast'))).toBeVisible();
    });
  });

  describe('Preferências', () => {
    /**
     * @description Alterna tema do aplicativo e preserva a escolha na sessão.
     * @screen Preferências
     * @priority baixa
     */
    it('deve alternar tema escuro', async () => {
      await element(by.id('preferencesTab')).tap();
      await element(by.id('darkModeSwitch')).tap();
      await expect(element(by.id('darkThemePreview'))).toBeVisible();
      await expect(element(by.value('dark'))).toBeVisible();
    });

    /**
     * @description Altera idioma preferencial do usuário.
     * @screen Preferências
     * @priority baixa
     */
    it('deve alterar idioma preferencial', async () => {
      await element(by.id('preferencesTab')).tap();
      await element(by.id('languagePicker')).tap();
      await element(by.text('English')).tap();
      await expect(element(by.id('languageChangedToast'))).toBeVisible();
      await expect(element(by.text('Language updated'))).toBeVisible();
    });
  });
});
