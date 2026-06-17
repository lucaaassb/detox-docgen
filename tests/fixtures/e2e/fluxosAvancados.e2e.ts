/**
 * @description Cenários menos comuns de Detox para validar robustez do relatório
 * @author Time QA
 */
describe('Funcionalidade X - cenários avançados', () => {
  beforeAll(async () => {
    await device.launchApp({
      newInstance: true,
      permissions: {
        notifications: 'YES',
        camera: 'YES',
        location: 'inuse'
      }
    });
  });

  beforeEach(async () => {
    await device.reloadReactNative();
  });

  describe('Permissões e recursos nativos', () => {
    /**
     * @description Valida o fluxo de câmera quando a permissão já foi concedida.
     * @screen Permissões
     * @priority alta
     */
    it('deve abrir câmera com permissão concedida', async () => {
      await element(by.id('openCameraButton')).tap();
      await waitFor(element(by.id('cameraPreview'))).toBeVisible().withTimeout(7000);
      await expect(element(by.text('Câmera ativa'))).toBeVisible();
    });

    /**
     * @description Confirma o estado alternativo quando a permissão de localização é recusada.
     * @screen Permissões
     * @priority média
     */
    it('deve exibir fallback quando localização estiver indisponível', async () => {
      await device.launchApp({
        newInstance: true,
        permissions: {
          location: 'NO'
        }
      });
      await element(by.id('openMapButton')).tap();
      await expect(element(by.id('locationFallback'))).toBeVisible();
      await expect(element(by.text('Localização indisponível'))).toBeVisible();
    });
  });

  describe('Deep link e estado do aplicativo', () => {
    /**
     * @description Abre uma tela interna usando deep link.
     * @screen Deep Link
     * @priority alta
     */
    it('deve abrir detalhe de campanha por deep link', async () => {
      await device.openURL({
        url: 'detoxdocgen://campanhas/black-friday'
      });
      await expect(element(by.id('campaignDetailScreen'))).toBeVisible();
      await expect(element(by.text('Black Friday'))).toBeVisible();
    });

    /**
     * @description Valida retorno correto após app ir para background.
     * @screen Estado do app
     * @priority média
     */
    it('deve manter tela atual após background e foreground', async () => {
      await element(by.id('openSettingsButton')).tap();
      await expect(element(by.id('settingsScreen'))).toBeVisible();
      await device.sendToHome();
      await device.launchApp({ newInstance: false });
      await expect(element(by.id('settingsScreen'))).toBeVisible();
    });

    /**
     * @description Garante que a tela se adapta quando o dispositivo muda de orientação.
     * @screen Responsividade
     * @priority baixa
     */
    it('deve adaptar layout ao rotacionar o dispositivo', async () => {
      await device.setOrientation('landscape');
      await expect(element(by.id('landscapeHeader'))).toBeVisible();
      await device.setOrientation('portrait');
      await expect(element(by.id('portraitHeader'))).toBeVisible();
    });
  });

  describe('Listas, sincronização e estados negativos', () => {
    /**
     * @description Percorre uma lista grande até encontrar um item específico.
     * @screen Lista avançada
     * @priority média
     */
    it('deve encontrar item distante em lista virtualizada', async () => {
      await waitFor(element(by.id('largeList'))).toBeVisible().withTimeout(5000);
      await element(by.id('largeList')).scroll(800, 'down');
      await element(by.id('largeList')).scroll(800, 'down');
      await expect(element(by.text('Item 120'))).toBeVisible();
    });

    /**
     * @description Aguarda uma sincronização assíncrona antes de validar o conteúdo.
     * @screen Sincronização
     * @priority alta
     */
    it('deve aguardar sincronização de dados externos', async () => {
      await element(by.id('syncDataButton')).tap();
      await waitFor(element(by.id('syncSuccessMessage')))
        .toBeVisible()
        .withTimeout(10000);
      await expect(element(by.text('Dados sincronizados'))).toBeVisible();
    });

    /**
     * @description Confirma que um banner temporário desaparece após a animação.
     * @screen Feedback visual
     * @priority baixa
     */
    it('deve ocultar banner temporário após timeout', async () => {
      await element(by.id('showTemporaryBannerButton')).tap();
      await expect(element(by.id('temporaryBanner'))).toBeVisible();
      await waitFor(element(by.id('temporaryBanner')))
        .toBeNotVisible()
        .withTimeout(6000);
    });

    /**
     * @description Valida comportamento de erro sem quebrar o fluxo principal.
     * @screen Erros controlados
     * @priority média
     */
    it('deve exibir erro controlado quando serviço externo falhar', async () => {
      await element(by.id('simulateServiceErrorButton')).tap();
      await expect(element(by.id('serviceErrorToast'))).toBeVisible();
      await expect(element(by.text('Não foi possível concluir a operação'))).toBeVisible();
      await expect(element(by.id('retryServiceButton'))).toBeVisible();
    });
  });
});
