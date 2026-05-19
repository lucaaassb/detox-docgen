/**
 * @description Fluxos principais da Home para validar dashboard, atalhos e notificações
 * @author Time QA
 */
describe('Home', () => {
  beforeAll(async () => {
    await device.launchApp({ newInstance: true });
  });

  beforeEach(async () => {
    await device.reloadReactNative();
    await element(by.id('emailInput')).typeText('cliente@empresa.com');
    await element(by.id('passwordInput')).typeText('Senha123!');
    await element(by.id('loginButton')).tap();
    await waitFor(element(by.id('homeScreen'))).toBeVisible().withTimeout(5000);
  });

  describe('Resumo financeiro', () => {
    /**
     * @description Garante que os cards principais do dashboard estão visíveis.
     * @screen Home
     * @priority crítica
     */
    it('deve exibir resumo financeiro do usuário', async () => {
      await expect(element(by.id('balanceCard'))).toBeVisible();
      await expect(element(by.id('incomeCard'))).toBeVisible();
      await expect(element(by.id('expenseCard'))).toBeVisible();
      await expect(element(by.text('Saldo disponível'))).toBeVisible();
    });

    /**
     * @description Valida a navegação do card de saldo para a tela de extrato.
     * @screen Home
     * @priority alta
     */
    it('deve abrir extrato ao tocar no card de saldo', async () => {
      await element(by.id('balanceCard')).tap();
      await expect(element(by.id('statementScreen'))).toBeVisible();
      await expect(element(by.text('Extrato'))).toBeVisible();
    });

    /**
     * @description Confirma que o usuário consegue ocultar e reexibir valores sensíveis.
     * @screen Home
     * @priority média
     */
    it('deve ocultar e exibir valores financeiros', async () => {
      await element(by.id('toggleBalanceVisibility')).tap();
      await expect(element(by.text('••••'))).toBeVisible();
      await element(by.id('toggleBalanceVisibility')).tap();
      await expect(element(by.id('balanceAmount'))).toBeVisible();
    });
  });

  describe('Atalhos rápidos', () => {
    /**
     * @description Abre o fluxo de transferência a partir dos atalhos da Home.
     * @screen Home
     * @priority alta
     */
    it('deve acessar transferência pelo atalho rápido', async () => {
      await element(by.id('shortcutTransfer')).tap();
      await expect(element(by.id('transferScreen'))).toBeVisible();
      await expect(element(by.text('Nova transferência'))).toBeVisible();
    });

    /**
     * @description Abre o pagamento de boleto a partir dos atalhos da Home.
     * @screen Home
     * @priority alta
     */
    it('deve acessar pagamento pelo atalho rápido', async () => {
      await element(by.id('shortcutPayment')).tap();
      await expect(element(by.id('paymentScreen'))).toBeVisible();
      await expect(element(by.text('Pagar boleto'))).toBeVisible();
    });

    /**
     * @description Permite personalizar a ordem dos atalhos favoritos.
     * @screen Home
     * @priority baixa
     */
    it('deve abrir edição de atalhos favoritos', async () => {
      await element(by.id('editShortcutsButton')).tap();
      await expect(element(by.id('shortcutEditorScreen'))).toBeVisible();
      await expect(element(by.text('Editar atalhos'))).toBeVisible();
    });
  });

  describe('Notificações', () => {
    /**
     * @description Exibe a central de notificações quando houver mensagens pendentes.
     * @screen Home
     * @priority média
     */
    it('deve abrir central de notificações', async () => {
      await element(by.id('notificationsButton')).tap();
      await expect(element(by.id('notificationsScreen'))).toBeVisible();
      await expect(element(by.text('Notificações'))).toBeVisible();
    });

    /**
     * @description Marca uma notificação como lida e atualiza o contador.
     * @screen Notificações
     * @priority média
     */
    it('deve marcar notificação como lida', async () => {
      await element(by.id('notificationsButton')).tap();
      await element(by.id('notificationItem-0')).tap();
      await expect(element(by.id('notificationDetailScreen'))).toBeVisible();
      await expect(element(by.id('unreadBadge'))).toBeNotVisible();
    });
  });

  describe('Busca e atualização', () => {
    /**
     * @description Pesquisa uma transação recente usando o campo de busca da Home.
     * @screen Home
     * @priority média
     */
    it('deve pesquisar transação recente', async () => {
      await element(by.id('homeSearchInput')).typeText('mercado');
      await expect(element(by.id('searchResultsList'))).toBeVisible();
      await expect(element(by.text('Mercado Central'))).toBeVisible();
    });

    /**
     * @description Atualiza os dados da Home com gesto de pull to refresh.
     * @screen Home
     * @priority baixa
     */
    it('deve atualizar dados da home ao puxar para atualizar', async () => {
      await element(by.id('homeScrollView')).swipe('down', 'fast', 0.8);
      await expect(element(by.id('homeRefreshIndicator'))).toBeVisible();
      await waitFor(element(by.id('lastUpdatedLabel'))).toBeVisible().withTimeout(5000);
    });

    /**
     * @description Exibe estado vazio quando a busca não retorna resultados.
     * @screen Home
     * @priority baixa
     */
    it('deve exibir estado vazio para busca sem resultados', async () => {
      await element(by.id('homeSearchInput')).typeText('xyz sem resultado');
      await expect(element(by.id('emptySearchState'))).toBeVisible();
      await expect(element(by.text('Nenhuma transação encontrada'))).toBeVisible();
    });
  });
});
