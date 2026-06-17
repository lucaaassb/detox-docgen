/**
 * @description Cenários rápidos de smoke sem describe para validar parsing top-level
 * @author Time QA
 */

/**
 * @description Verifica se o aplicativo abre a tela inicial sem falhas.
 * @screen Smoke
 * @priority crítica
 */
it('deve abrir aplicativo na tela inicial', async () => {
  await device.launchApp({ newInstance: true });
  await expect(element(by.id('homeScreen'))).toBeVisible();
});

/**
 * @description Confirma que a navegação principal responde ao toque.
 * @screen Smoke
 * @priority alta
 */
test('deve abrir menu principal no smoke test', async () => {
  await element(by.id('mainMenuButton')).tap();
  await expect(element(by.id('mainMenuDrawer'))).toBeVisible();
});

/**
 * @description Garante que a tela de ajuda básica está acessível.
 * @screen Smoke
 * @priority média
 */
it('deve abrir central de ajuda no smoke test', async () => {
  await element(by.id('helpButton')).tap();
  await waitFor(element(by.id('helpCenterScreen'))).toBeVisible().withTimeout(4000);
  await expect(element(by.text('Como podemos ajudar?'))).toBeVisible();
});

/**
 * @description Valida saída segura da aplicação para a tela de login.
 * @screen Smoke
 * @priority alta
 */
it('deve sair da conta pelo fluxo rápido', async () => {
  await element(by.id('profileMenuButton')).tap();
  await element(by.id('quickLogoutButton')).tap();
  await expect(element(by.id('loginScreen'))).toBeVisible();
});
