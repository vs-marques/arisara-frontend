
export interface User {
  id: string;
  email: string;
  name: string;
  profile: 'Admin' | 'Provedor' | 'Usuario' | 'Vendedor';
  idEntidade?: string;
  createdAt: Date;
}

export interface CadastroEntidade {
  id: string;
  cpfCnpj: string;
  nome: string;
  categoria: 'Usuario' | 'Proprietario' | 'Provedor' | 'Vendedor';
  natureza: 'PessoaFisica' | 'PessoaJuridica';
  idExterno?: string;
  idProvedor?: string; // Relaciona usuário ao provedor
  dataCriacao: Date;
  dataAtualizacao?: Date;
  dataExclusao?: Date;
}

export interface CadastroConta {
  id: string;
  idTitular: string;
  tipo: 'Pagador' | 'Provedor' | 'Matriz';
  tipoPontos: 'Livre' | 'Desconto';
  saldo: number;
  dataCriacao: Date;
  dataAtualizacao?: Date;
  dataExclusao?: Date;
}

export interface CadastroImovel {
  id: string;
  tipo: 'Residencial' | 'Comercial';
  idProprietario: string;
  idProvedor: string;
  idUsuario: string;
  contrato: string;
  endereco?: string;
  valor?: number;
  idExterno?: string;
  dataCriacao: Date;
  dataAtualizacao?: Date;
  dataExclusao?: Date;
}

export interface CadastroServico {
  id: string;
  descricao: string;
  valor: number;
  vencimento: Date;
  idPrestador: string;
  idContratante: string;
  idImovel: string;
  idExterno?: string;
  dataCriacao: Date;
  dataAtualizacao?: Date;
  dataExclusao?: Date;
}

// Tipos para Programas de Pontos (Reward Rules API)
export interface RewardIndexer {
  id: string;
  indexer_name: string;
  indexer_type: 'points' | 'cashback' | 'discount' | 'bonus';
  company_id?: string;
  description?: string;
  base_value: number;
  multiplier: number;
  min_threshold: number;
  max_threshold?: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface RewardIndexerCreate {
  indexer_name: string;
  indexer_type: 'points' | 'cashback' | 'discount' | 'bonus';
  company_id?: string;
  description?: string;
  base_value: number;
  multiplier: number;
  min_threshold: number;
  max_threshold?: number;
  is_active?: boolean;
}

export interface RewardRule {
  id: string;
  rule_name: string;
  rule_type: 'percentage' | 'tiered' | 'fixed' | 'conditional';
  reward_type: 'cashback' | 'points' | 'bonus' | 'discount' | 'promotion' | 'referral';
  indexer_id?: string;
  company_id?: string;
  description?: string;
  min_amount: number;
  max_amount?: number;
  reward_percentage: number;
  reward_fixed_amount: number;
  points_rate: number;
  conditions?: Record<string, any>;
  is_active: boolean;
  valid_from: string;
  valid_until?: string;
  created_at: string;
  updated_at: string;
}

export interface RewardRuleCreate {
  rule_name: string;
  rule_type: 'percentage' | 'tiered' | 'fixed' | 'conditional';
  reward_type: 'cashback' | 'points' | 'bonus' | 'discount' | 'promotion' | 'referral';
  indexer_id?: string;
  company_id?: string;
  description?: string;
  min_amount: number;
  max_amount?: number;
  reward_percentage: number;
  reward_fixed_amount?: number;
  points_rate?: number;
  conditions?: Record<string, any>;
  valid_from: string;
  valid_until?: string;
}

// Manter o tipo antigo para compatibilidade
export interface CadastroPontos {
  id: string;
  nome: string;
  tipo: 'Livre' | 'Desconto';
  diasLiberacao: number;
  diasExpiracao: number;
  proporcao: number;
  rentabilidade: number;
  pontualidade: number;
  rebate: number;
  taxa: number;
  idProvedor?: string; // Relaciona programa ao provedor
  dataCriacao: Date;
  dataAtualizacao?: Date;
  dataExclusao?: Date;
}

export interface CadastroServicoPontos {
  id: string;
  idServico: string;
  idPontos: string;
  dataCriacao: Date;
}

export interface CadastroProdutoServicoMarketplace {
  id: string;
  nome: string;
  categoria: 'Produto' | 'Servico';
  tipoOferta: 'Aberto' | 'Restrito';
  valorPontos: number;
  idOfertante: string;
  ativo: boolean;
  quantidade: number;
  descricao: string;
  dataCriacao: Date;
  dataAtualizacao?: Date;
}

export interface RegistroPagamentos {
  id: string;
  dataPagamento: Date;
  idCobranca: string;
  dataVencimento: Date;
  status: 'Pontual' | 'Vencido';
  valor: number;
  valorAcrescimo: number;
  valorTotal: number;
  idContratante: string;
  idPrestador: string;
  idServico: string;
  idImovel: string;
}

export interface RegistroPontos {
  id: string;
  data: Date;
  idPagamento: string;
  idCobranca: string;
  valorPagamento: number;
  valorPontos: number;
  dataLiberacao: Date;
  dataExpiracao: Date;
  status: 'Provisionado' | 'Liberado' | 'Expirado';
  valorRebate: number;
  valorTaxa: number;
  idContratante: string;
  idPrestador: string;
  idServico: string;
  idImovel: string;
}

export interface RegistroExtrato {
  id: string;
  data: Date;
  valor: number;
  categoria: 'Pontos' | 'Rebate' | 'Taxa' | 'Compra' | 'Venda';
  descricao: string;
  saldo: number;
  idOrigem: string;
  idContaTitular: string;
  idContaOrigem?: string;
  idContaDestino?: string;
}

export interface SolicitacaoSaque {
  id: string;
  idUsuario: string;
  valor: number;
  status: 'Pendente' | 'Aprovado' | 'Rejeitado' | 'Processado';
  dataSolicitacao: Date;
  dataProcessamento?: Date;
  observacoes?: string;
  dadosBancarios: {
    banco: string;
    agencia: string;
    conta: string;
    chavePix?: string;
  };
}

export interface DashboardStats {
  totalPontos: number;
  pontosPendente: number;
  pontosLiberado: number;
  totalTransacoes: number;
  saldoTotal: number;
}

// Re-export tipos de importação
export * from './import';
