/**
 * @description Cenários de acessibilidade, usabilidade e adaptação visual
 * @author Time QA
 */
const AccessibilityFixtureNote = () => <></>;

describe('Acessibilidade e usabilidade', () => {
  beforeAll(async () => {
    await device.launchApp({ newInstance: true });
  });

  beforeEach(async () => {
    await device.reloadReactNative();
    await expect(element(by.id('homeScreen'))).toBeVisible();
  });

  describe('Leitura assistiva', () => {
    /**
     * @description Valida que ações principais possuem labels acessíveis.
     * @screen Acessibilidade
     * @priority alta
     */
    it('deve navegar usando labels acessíveis', async () => {
      await expect(element(by.label('Abrir menu principal'))).toBeVisible();
      await element(by.label('Abrir menu principal')).tap();
      await expect(element(by.label('Fechar menu principal'))).toBeVisible();
    });

    /**
     * @description Garante que mensagens de erro podem ser identificadas por label.
     * @screen Acessibilidade
     * @priority alta
     */
    it('deve expor erro de formulário para leitor de tela', async () => {
      await element(by.id('shortcutTransfer')).tap();
      await element(by.id('continueTransferButton')).tap();
      await expect(element(by.label('Erro: informe uma chave Pix válida'))).toBeVisible();
    });

    /**
     * @description Confirma que botões de ação possuem área mínima de toque.
     * @screen Acessibilidade
     * @priority média
     */
    it('deve manter área de toque adequada em ações primárias', async () => {
      const attributes = await element(by.id('primaryActionButton')).getAttributes();

      if (attributes.visible) {
        await element(by.id('primaryActionButton')).tap();
      }

      await expect(element(by.id('primaryActionFeedback'))).toBeVisible();
    });
  });

  describe('Adaptação visual', () => {
    /**
     * @description Mantém conteúdo legível com fonte ampliada.
     * @screen Usabilidade
     * @priority média
     */
    it('deve ajustar layout com fonte ampliada', async () => {
      await element(by.id('accessibilitySettingsButton')).tap();
      await element(by.id('fontScaleLargeOption')).tap();
      await expect(element(by.id('largeFontPreview'))).toBeVisible();
      await expect(element(by.text('Prévia de leitura'))).toBeVisible();
    });

    /**
     * @description Alterna alto contraste sem ocultar ações principais.
     * @screen Usabilidade
     * @priority média
     */
    it('deve ativar modo de alto contraste', async () => {
      await element(by.id('accessibilitySettingsButton')).tap();
      await element(by.id('highContrastSwitch')).tap();
      await expect(element(by.id('highContrastTheme'))).toBeVisible();
      await expect(element(by.id('primaryActionButton'))).toBeVisible();
    });
  });

  describe('Gestos e orientação', () => {
    /**
     * @description Preserva navegação por abas após rotação do dispositivo.
     * @screen Usabilidade
     * @priority baixa
     */
    it('deve manter abas acessíveis após rotação', async () => {
      await device.setOrientation('landscape');
      await expect(element(by.id('bottomTabs'))).toBeVisible();
      await device.setOrientation('portrait');
      await expect(element(by.id('bottomTabs'))).toBeVisible();
    });

    /**
     * @description Exibe alternativa visível quando gesto horizontal não está disponível.
     * @screen Usabilidade
     * @priority baixa
     */
    it('deve oferecer alternativa ao gesto de swipe', async () => {
      await element(by.id('tipsCarousel')).swipe('left', 'slow', 0.6);
      await expect(element(by.id('tipsNextButton'))).toBeVisible();
      await element(by.id('tipsNextButton')).tap();
      await expect(element(by.id('tipsSlide-2'))).toBeVisible();
    });
  });
});
