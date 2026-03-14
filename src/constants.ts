import { InvestmentOption } from './types';

export const CATEGORIES = {
  income: ['Serviço', 'Venda de Produto', 'Outros'],
  expense: [
    'Aluguel',
    'Luz/Água',
    'Materiais',
    'DAS-MEI',
    'Pró-labore',
    'Empréstimo',
    'Mercado',
    'Marketing',
    'Outros'
  ]
};

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
