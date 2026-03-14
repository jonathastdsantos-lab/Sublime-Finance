import { InvestmentOption } from './types';

export const CATEGORIES = {
  entrada: [
    { id: 'servico', label: 'Serviço' },
    { id: 'pix_recebido', label: 'PIX Recebido' },
    { id: 'pagamento', label: 'Pagamento' },
    { id: 'outro', label: 'Outro' }
  ],
  saida: [
    { id: 'material', label: 'Material' },
    { id: 'aluguel', label: 'Aluguel' },
    { id: 'luz', label: 'Luz/Água' },
    { id: 'emprestimo', label: 'Empréstimo' },
    { id: 'mercado', label: 'Mercado' },
    { id: 'retirada', label: 'Retirada/Pró-labore' },
    { id: 'pix_enviado', label: 'PIX Enviado' },
    { id: 'mei_das', label: 'DAS-MEI' },
    { id: 'imposto', label: 'Imposto' },
    { id: 'outro', label: 'Outro' }
  ]
};

export const PAYMENT_METHODS = [
  { id: 'dinheiro', label: 'Dinheiro' },
  { id: 'pix', label: 'PIX' },
  { id: 'cartao_debito', label: 'Cartão de Débito' },
  { id: 'cartao_credito', label: 'Cartão de Crédito' },
  { id: 'transferencia', label: 'Transferência' },
  { id: 'boleto', label: 'Boleto' }
];

export const FIXED_COST_CATEGORIES = [
  { id: 'aluguel', label: 'Aluguel' },
  { id: 'luz', label: 'Luz' },
  { id: 'agua', label: 'Água' },
  { id: 'internet', label: 'Internet' },
  { id: 'emprestimo', label: 'Empréstimo' },
  { id: 'mei_das', label: 'DAS-MEI' },
  { id: 'seguro', label: 'Seguro' },
  { id: 'software', label: 'Software/Sistemas' },
  { id: 'outro', label: 'Outro' }
];

export const INITIAL_INVESTMENTS: InvestmentOption[] = [
  {
    objective: 'Reserva de Emergência',
    where: 'Tesouro Selic ou CDB 100% CDI',
    why: 'Liquidez imediata. Se o Studio precisar hoje, você saca hoje.'
  },
  {
    objective: 'Sonho 2027 (Casamento)',
    where: 'CDB Prefixado ou IPCA+ 2027',
    why: 'Garante que o dinheiro vai render acima da inflação até a data do evento.'
  },
  {
    objective: 'Expansão do Studio',
    where: 'LCI/LCA (após 90 dias)',
    why: 'Isento de Imposto de Renda, ótimo para deixar o dinheiro trabalhando por 6 a 12 meses.'
  }
];
