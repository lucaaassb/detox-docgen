/**
 * @description Arquivo de exemplo para testes de documentação
 * @author Time QA
 */
describe('Login', () => {
  beforeAll(async () => {
    await device.launchApp();
  });

  beforeEach(async () => {
    await device.reloadReactNative();
  });

  describe('com email', () => {
    it('deve abrir a tela', async () => {
      await element(by.id('email')).typeText('a@b.com');
      await expect(element(by.id('homeScreen'))).toBeVisible();
    });
  });
});
