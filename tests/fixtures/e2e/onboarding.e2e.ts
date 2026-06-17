/**
 * @description Fluxos de primeiro acesso, cadastro e preferências iniciais
 * @author Time QA
 */
describe('Onboarding e cadastro', () => {
  beforeAll(async () => {
    await device.launchApp({ newInstance: true, delete: true });
  });

  beforeEach(async () => {
    await device.reloadReactNative();
  });

  describe('Experiência inicial', () => {
    /**
     * @description Confirma que a primeira tela apresenta a proposta do aplicativo.
     * @screen Onboarding
     * @priority alta
     */
    it('deve exibir tela inicial do onboarding', async () => {
      await expect(element(by.id('onboardingWelcomeScreen'))).toBeVisible();
      await expect(element(by.text('Organize sua vida financeira'))).toBeVisible();
      await expect(element(by.id('startOnboardingButton'))).toBeVisible();
    });

    /**
     * @description Permite avançar pelos slides do onboarding usando gesto de arrastar.
     * @screen Onboarding
     * @priority média
     */
    it('deve avançar carrossel de apresentação', async () => {
      await element(by.id('onboardingCarousel')).swipe('left', 'fast', 0.7);
      await expect(element(by.id('onboardingSlide-1'))).toBeVisible();
      await element(by.id('onboardingCarousel')).swipe('left', 'fast', 0.7);
      await expect(element(by.id('onboardingSlide-2'))).toBeVisible();
    });

    /**
     * @description Abre termos de uso antes de iniciar o cadastro.
     * @screen Onboarding
     * @priority baixa
     */
    test('deve abrir termos de uso pelo link do onboarding', async () => {
      await element(by.id('termsLink')).tap();
      await expect(element(by.id('termsScreen'))).toBeVisible();
      await expect(element(by.text('Termos de uso'))).toBeVisible();
    });
  });

  describe('Cadastro de conta', () => {
    /**
     * @description Cadastra novo usuário com dados válidos.
     * @screen Cadastro
     * @priority crítica
     */
    it('deve concluir cadastro com dados válidos', async () => {
      await element(by.id('startOnboardingButton')).tap();
      await element(by.id('fullNameInput')).typeText('Cliente Novo');
      await element(by.id('signupEmailInput')).typeText('novo.cliente@empresa.com');
      await element(by.id('signupPasswordInput')).typeText('Senha123!');
      await element(by.id('acceptTermsCheckbox')).tap();
      await element(by.id('createAccountButton')).tap();
      await waitFor(element(by.id('accountCreatedScreen'))).toBeVisible().withTimeout(6000);
      await expect(element(by.text('Conta criada com sucesso'))).toBeVisible();
    });

    /**
     * @description Bloqueia cadastro quando o e-mail já existe.
     * @screen Cadastro
     * @priority alta
     */
    it('deve exibir erro para e-mail já cadastrado', async () => {
      await element(by.id('startOnboardingButton')).tap();
      await element(by.id('fullNameInput')).typeText('Cliente Existente');
      await element(by.id('signupEmailInput')).typeText('cliente@empresa.com');
      await element(by.id('signupPasswordInput')).typeText('Senha123!');
      await element(by.id('acceptTermsCheckbox')).tap();
      await element(by.id('createAccountButton')).tap();
      await expect(element(by.id('duplicateEmailError'))).toBeVisible();
      await expect(element(by.text('Este e-mail já está em uso'))).toBeVisible();
    });

    /**
     * @description Impede cadastro com senha fraca.
     * @screen Cadastro
     * @priority alta
     */
    it('deve validar senha fraca no cadastro', async () => {
      await element(by.id('startOnboardingButton')).tap();
      await element(by.id('fullNameInput')).typeText('Cliente Novo');
      await element(by.id('signupEmailInput')).typeText('cliente.fraco@empresa.com');
      await element(by.id('signupPasswordInput')).typeText('123');
      await element(by.id('createAccountButton')).tap();
      await expect(element(by.id('weakPasswordError'))).toBeVisible();
      await expect(element(by.text('Use uma senha mais segura'))).toBeVisible();
    });
  });

  describe('Preferências iniciais', () => {
    /**
     * @description Seleciona objetivos financeiros durante a configuração inicial.
     * @screen Preferências iniciais
     * @priority média
     */
    it('deve selecionar objetivos financeiros iniciais', async () => {
      await element(by.id('startOnboardingButton')).tap();
      await element(by.id('skipSignupButton')).tap();
      await element(by.id('goal-save-money')).tap();
      await element(by.id('goal-control-expenses')).tap();
      await element(by.id('continuePreferencesButton')).tap();
      await expect(element(by.id('preferencesSummaryScreen'))).toBeVisible();
    });

    /**
     * @description Permite ativar notificações no final do onboarding.
     * @screen Preferências iniciais
     * @priority média
     */
    it('deve ativar notificações na configuração inicial', async () => {
      await element(by.id('startOnboardingButton')).tap();
      await element(by.id('skipSignupButton')).tap();
      await element(by.id('enableNotificationsSwitch')).tap();
      await expect(element(by.id('notificationsEnabledMessage'))).toBeVisible();
      await expect(element(by.text('Notificações ativadas'))).toBeVisible();
    });
  });
});
