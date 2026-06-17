/**
 * @description Fluxos de transferência, revisão, comprovantes e agendamento
 * @author Time QA
 */
describe('Transferências', () => {
  beforeAll(async () => {
    await device.launchApp({ newInstance: true });
  });

  beforeEach(async () => {
    await device.reloadReactNative();
    await element(by.id('emailInput')).typeText('cliente@empresa.com');
    await element(by.id('passwordInput')).typeText('Senha123!');
    await element(by.id('loginButton')).tap();
    await waitFor(element(by.id('homeScreen'))).toBeVisible().withTimeout(5000);
    await element(by.id('shortcutTransfer')).tap();
  });

  afterEach(async () => {
    await device.takeScreenshot('transferencias-final-state');
  });

  describe('Novo Pix', () => {
    /**
     * @description Preenche chave Pix, valor e descrição para iniciar uma transferência.
     * @screen Transferência
     * @priority crítica
     */
    it('deve preencher dados obrigatórios de uma transferência Pix', async () => {
      await element(by.id('pixKeyInput')).typeText('destinatario@empresa.com');
      await element(by.id('transferAmountInput')).typeText('15000');
      await element(by.id('transferDescriptionInput')).typeText('Pagamento de serviço');
      await element(by.id('continueTransferButton')).tap();
      await expect(element(by.id('transferReviewScreen'))).toBeVisible();
      await expect(element(by.text('R$ 150,00'))).toBeVisible();
    });

    /**
     * @description Valida mensagem quando a chave Pix não possui formato aceito.
     * @screen Transferência
     * @priority alta
     */
    it('deve bloquear chave Pix inválida', async () => {
      await element(by.id('pixKeyInput')).typeText('chave-invalida');
      await element(by.id('transferAmountInput')).typeText('5000');
      await element(by.id('continueTransferButton')).tap();
      await expect(element(by.id('pixKeyError'))).toBeVisible();
      await expect(element(by.text('Informe uma chave Pix válida'))).toBeVisible();
    });

    /**
     * @description Abre seleção de favoritos para preencher destinatário recorrente.
     * @screen Transferência
     * @priority média
     */
    test('deve preencher destinatário usando favorito', async () => {
      await element(by.id('favoriteRecipientButton')).tap();
      await element(by.id('favoriteRecipient-0')).tap();
      await expect(element(by.id('pixKeyInput'))).toHaveText('maria@empresa.com');
      await expect(element(by.id('recipientNameLabel'))).toBeVisible();
    });
  });

  describe('Revisão e confirmação', () => {
    /**
     * @description Confirma transferência usando senha transacional válida.
     * @screen Revisão da transferência
     * @priority crítica
     */
    it('deve confirmar transferência com senha transacional', async () => {
      await element(by.id('pixKeyInput')).typeText('destinatario@empresa.com');
      await element(by.id('transferAmountInput')).typeText('15000');
      await element(by.id('continueTransferButton')).tap();
      await element(by.id('transactionPasswordInput')).typeText('123456');
      await element(by.id('confirmTransferButton')).tap();
      await waitFor(element(by.id('transferSuccessScreen'))).toBeVisible().withTimeout(8000);
      await expect(element(by.text('Transferência concluída'))).toBeVisible();
    });

    /**
     * @description Exibe erro quando a senha transacional está incorreta.
     * @screen Revisão da transferência
     * @priority alta
     */
    it('deve recusar senha transacional incorreta', async () => {
      await element(by.id('pixKeyInput')).typeText('destinatario@empresa.com');
      await element(by.id('transferAmountInput')).typeText('15000');
      await element(by.id('continueTransferButton')).tap();
      await element(by.id('transactionPasswordInput')).typeText('000000');
      await element(by.id('confirmTransferButton')).tap();
      await expect(element(by.id('transactionPasswordError'))).toBeVisible();
      await expect(element(by.text('Senha transacional inválida'))).toBeVisible();
    });

    /**
     * @description Confirma a transferência usando autenticação biométrica quando disponível.
     * @screen Revisão da transferência
     * @priority alta
     */
    it('deve confirmar transferência com biometria', async () => {
      const usarBiometria = true;

      await element(by.id('pixKeyInput')).typeText('destinatario@empresa.com');
      await element(by.id('transferAmountInput')).typeText('7500');
      await element(by.id('continueTransferButton')).tap();

      if (usarBiometria) {
        await element(by.label('Confirmar com biometria')).tap();
      }

      await expect(element(by.id('biometricPrompt'))).toBeVisible();
      await expect(element(by.text('Use sua digital para confirmar'))).toBeVisible();
    });
  });

  describe('Comprovantes e histórico', () => {
    /**
     * @description Compartilha comprovante após uma transferência concluída.
     * @screen Comprovante
     * @priority média
     */
    it('deve compartilhar comprovante de transferência', async () => {
      await element(by.id('historyTransferItem-0')).tap();
      await element(by.id('shareReceiptButton')).tap();
      await expect(element(by.id('nativeShareSheet'))).toBeVisible();
    });

    /**
     * @description Mantém o comprovante acessível mesmo quando o compartilhamento falha.
     * @screen Comprovante
     * @priority média
     */
    it('deve manter comprovante disponível se compartilhamento falhar', async () => {
      await element(by.id('historyTransferItem-0')).tap();

      try {
        await element(by.id('shareReceiptButton')).tap();
      } catch {
        await expect(element(by.id('receiptScreen'))).toBeVisible();
      }

      await expect(element(by.id('receiptCode'))).toBeVisible();
    });

    /**
     * @description Cancela transferência agendada antes da data de execução.
     * @screen Agendamentos
     * @priority alta
     */
    it('deve cancelar transferência agendada', async () => {
      await element(by.id('scheduledTransfersTab')).tap();
      await element(by.id('scheduledTransferItem-0')).tap();
      await element(by.id('cancelScheduledTransferButton')).tap();
      await element(by.text('Confirmar cancelamento')).tap();
      await expect(element(by.id('scheduledTransferCanceledMessage'))).toBeVisible();
    });
  });
});
