import { mysqlTable, varchar, int, decimal, text, boolean, datetime, date, mysqlEnum, index, primaryKey } from 'drizzle-orm/mysql-core'

// ============================================================
// SEGURANÇA
// ============================================================
export const usuarios = mysqlTable('usuarios', {
  id:        int('id').primaryKey().autoincrement(),
  nome:      varchar('nome', { length: 100 }).notNull(),
  login:     varchar('login', { length: 50 }).notNull().unique(),
  senha:     varchar('senha', { length: 255 }).notNull(),
  email:     varchar('email', { length: 100 }),
  cpf:       varchar('cpf', { length: 20 }),
  pis:       varchar('pis', { length: 20 }),
  perfil:    mysqlEnum('perfil', ['Administrador','Analista','Gerente','Corretor','Imobiliária','Parceiro','Construtora','Subestabelecido']).notNull().default('Analista'),
  subestabelecidoId: int('subestabelecido_id'), // FK → subestabelecidos.id (circular ref, enforced by DB)
  bloqueioInicio: date('bloqueio_inicio'),
  bloqueioFim:    date('bloqueio_fim'),
  status:    mysqlEnum('status', ['Ativo','Bloqueado','Inativo']).notNull().default('Ativo'),
  ativo:     boolean('ativo').notNull().default(true),
  criadoEm: datetime('criado_em').notNull().default(new Date()),
})

// ============================================================
// CADASTROS BASE
// ============================================================
export const bancos = mysqlTable('bancos', {
  id:   int('id').primaryKey().autoincrement(),
  nome: varchar('nome', { length: 100 }).notNull(),
  encaminhamento: mysqlEnum('encaminhamento', ['CENOP','SICOB','CEHOP','INTERCERVICE','FUNCHAL','FINTECH','ITAÚ']),
  remuneracao: decimal('remuneracao', { precision: 5, scale: 2 }).default('0.00'),
  ativo: boolean('ativo').notNull().default(true),
})

export const agencias = mysqlTable('agencias', {
  id:      int('id').primaryKey().autoincrement(),
  bancoId: int('banco_id').notNull().references(() => bancos.id),
  nome:    varchar('nome', { length: 150 }).notNull(),
  codigo:  varchar('codigo', { length: 20 }),
  cidade:  varchar('cidade', { length: 100 }),
  uf:      varchar('uf', { length: 2 }),
  ativo:   boolean('ativo').notNull().default(true),
})

export const construtoras = mysqlTable('construtoras', {
  id:      int('id').primaryKey().autoincrement(),
  nome:    varchar('nome', { length: 150 }).notNull(),
  cnpj:    varchar('cnpj', { length: 20 }),
  contato: varchar('contato', { length: 100 }),
  fone:    varchar('fone', { length: 20 }),
  fone2:   varchar('fone2', { length: 20 }),
  email:   varchar('email', { length: 100 }),
  endereco: varchar('endereco', { length: 200 }),
  numero:  varchar('numero', { length: 10 }),
  bairro:  varchar('bairro', { length: 100 }),
  cidade:  varchar('cidade', { length: 100 }),
  uf:      varchar('uf', { length: 2 }),
  cep:     varchar('cep', { length: 10 }),
  parceiroId: int("parceiro_id"),
  usuarioId: int('usuario_id').references(() => usuarios.id),
  ativo:   boolean('ativo').notNull().default(true),
})

export const empreendimentos = mysqlTable('empreendimentos', {
  id:           int('id').primaryKey().autoincrement(),
  constutoraId: int('construtora_id').references(() => construtoras.id),
  nome:         varchar('nome', { length: 150 }).notNull(),
  endereco:     varchar('endereco', { length: 200 }),
  cidade:       varchar('cidade', { length: 100 }),
  uf:           varchar('uf', { length: 2 }),
  tipo:         mysqlEnum('tipo', ['Comercial','Residencial']).default('Residencial'),
  ativo:        boolean('ativo').notNull().default(true),
})

export const imobiliarias = mysqlTable('imobiliarias', {
  id:    int('id').primaryKey().autoincrement(),
  nome:  varchar('nome', { length: 150 }).notNull(),
  cnpj:  varchar('cnpj', { length: 20 }),
  contato: varchar('contato', { length: 100 }),
  fone:  varchar('fone', { length: 20 }),
  email: varchar('email', { length: 100 }),
  endereco: varchar('endereco', { length: 200 }),
  numero:  varchar('numero', { length: 10 }),
  bairro:  varchar('bairro', { length: 100 }),
  cidade:  varchar('cidade', { length: 100 }),
  uf:      varchar('uf', { length: 2 }),
  cep:     varchar('cep', { length: 10 }),
  parceiroId: int('parceiro_id'), // FK → parceiros.id (circular ref, enforced by DB)
  usuarioId:  int('usuario_id').references(() => usuarios.id),
  ativo: boolean('ativo').notNull().default(true),
})

export const corretores = mysqlTable('corretores', {
  id:           int('id').primaryKey().autoincrement(),
  imobiliariaId: int('imobiliaria_id').references(() => imobiliarias.id),
  nome:         varchar('nome', { length: 150 }).notNull(),
  cpf:          varchar('cpf', { length: 20 }),
  creci:        varchar('creci', { length: 30 }),
  fone:         varchar('fone', { length: 20 }),
  email:        varchar('email', { length: 100 }),
  parceiroId:   int('parceiro_id'), // FK → parceiros.id (circular ref, enforced by DB)
  usuarioId:    int('usuario_id').references(() => usuarios.id),
  ativo:        boolean('ativo').notNull().default(true),
})

export const parceiros = mysqlTable('parceiros', {
  id:      int('id').primaryKey().autoincrement(),
  nome:    varchar('nome', { length: 150 }).notNull(),
  nomeFantasia:  varchar('nome_fantasia', { length: 200 }),
  razaoSocial:   varchar('razao_social', { length: 200 }),
  cnpj:    varchar('cnpj', { length: 20 }),
  representante: varchar('representante', { length: 150 }),
  documento:     varchar('documento', { length: 50 }),
  contato: varchar('contato', { length: 100 }),
  fone:    varchar('fone', { length: 20 }),
  email:   varchar('email', { length: 100 }),
  endereco: varchar('endereco', { length: 200 }),
  numero:  varchar('numero', { length: 10 }),
  bairro:  varchar('bairro', { length: 100 }),
  cidade:  varchar('cidade', { length: 100 }),
  uf:      varchar('uf', { length: 2 }),
  cep:     varchar('cep', { length: 10 }),
  responsavel:   varchar('responsavel', { length: 150 }),
  chavePix:      varchar('chave_pix', { length: 200 }),
  tipoChavePix:  mysqlEnum('tipo_chave_pix', ['CPF','Celular','Email','Aleatória']),
  dataContrato:  date('data_contrato'),
  usuarioId:     int('usuario_id').references(() => usuarios.id),
  ativo:   boolean('ativo').notNull().default(true),
})

export const subestabelecidos = mysqlTable('subestabelecidos', {
  id:        int('id').primaryKey().autoincrement(),
  parceiroId: int('parceiro_id').references(() => parceiros.id),
  nome:      varchar('nome', { length: 150 }).notNull(),
  cpf:       varchar('cpf', { length: 20 }),
  fone:      varchar('fone', { length: 20 }),
  email:     varchar('email', { length: 100 }),
  ativo:     boolean('ativo').notNull().default(true),
})

// ============================================================
// CLIENTES (Comprador e Vendedor)
// ============================================================
export const clientes = mysqlTable('clientes', {
  id:                   int('id').primaryKey().autoincrement(),
  tipo:                 mysqlEnum('tipo', ['Comprador','Vendedor']).notNull(),
  nome:                 varchar('nome', { length: 200 }).notNull(),
  cpfCnpj:              varchar('cpf_cnpj', { length: 20 }).notNull(),
  dataNascimento:       date('data_nascimento'),
  estadoCivil:          mysqlEnum('estado_civil', ['Solteiro','Casado Comunhão de Bens','Casado Comunhão Parcial de Bens','Casado separação de Bens','Divorciado','Separado Judicialmente','União Estável/Outros','Viúvo']),
  tipoDocumento:        mysqlEnum('tipo_documento', ['Carteira de Identidade','Carteira Funcional','Identidade Militar','Cart. Identidade e Estrangeiro','Passaporte','CNH','CPF']),
  numeroDocumento:      varchar('numero_documento', { length: 30 }),
  dataExpedicao:        date('data_expedicao'),
  orgaoExpedidor:       varchar('orgao_expedidor', { length: 30 }),
  captacao:             varchar('captacao', { length: 100 }),
  rendaComprovada:      decimal('renda_comprovada', { precision: 12, scale: 2 }).default('0.00'),
  possuiDependentes:    boolean('possui_dependentes').default(false),
  // Cônjuge
  cpfConjuge:           varchar('cpf_conjuge', { length: 20 }),
  nomeConjuge:          varchar('nome_conjuge', { length: 200 }),
  nomeMae:              varchar('nome_mae', { length: 200 }),
  // Endereço
  endereco:             varchar('endereco', { length: 200 }),
  numero:               varchar('numero', { length: 10 }),
  bairro:               varchar('bairro', { length: 100 }),
  cidade:               varchar('cidade', { length: 100 }),
  uf:                   varchar('uf', { length: 2 }),
  cep:                  varchar('cep', { length: 10 }),
  // Contato
  fone1:                varchar('fone1', { length: 20 }),
  fone2:                varchar('fone2', { length: 20 }),
  fone3:                varchar('fone3', { length: 20 }),
  contato2:             varchar('contato2', { length: 100 }),
  contato3:             varchar('contato3', { length: 100 }),
  email:                varchar('email', { length: 100 }),
  // Banco
  bancoId:              int('banco_id').references(() => bancos.id),
  numeroAgencia:        varchar('numero_agencia', { length: 20 }),
  numeroConta:          varchar('numero_conta', { length: 30 }),
  // Vínculos
  constutoraId:         int('construtora_id').references(() => construtoras.id),
  corretorId:           int('corretor_id').references(() => corretores.id),
  parceiroId:           int('parceiro_id').references(() => parceiros.id),
  imobiliariaId:        int('imobiliaria_id').references(() => imobiliarias.id),
  criadoEm:             datetime('criado_em').notNull().default(new Date()),
  atualizadoEm:         datetime('atualizado_em').notNull().default(new Date()),
})

// ============================================================
// IMÓVEIS
// ============================================================
export const imoveis = mysqlTable('imoveis', {
  id:          int('id').primaryKey().autoincrement(),
  matricula:   varchar('matricula', { length: 50 }),
  endereco:    varchar('endereco', { length: 200 }).notNull(),
  numero:      varchar('numero', { length: 10 }),
  complemento: varchar('complemento', { length: 100 }),
  bairro:      varchar('bairro', { length: 100 }),
  cidade:      varchar('cidade', { length: 100 }).notNull(),
  uf:          varchar('uf', { length: 2 }).notNull(),
  cep:         varchar('cep', { length: 10 }),
  tipo:        mysqlEnum('tipo', ['Residencial','Comercial','Terreno','Galpão']).default('Residencial'),
  corretorId:    int('corretor_id').references(() => corretores.id),
  imobiliariaId: int('imobiliaria_id').references(() => imobiliarias.id),
  parceiroId:    int('parceiro_id').references(() => parceiros.id),
  constutoraId:  int('construtora_id').references(() => construtoras.id),
  usuarioId:     int('usuario_id').references(() => usuarios.id),
  criadoEm:    datetime('criado_em').notNull().default(new Date()),
})

// ============================================================
// CONFIGURAÇÕES DE PROCESSO
// ============================================================
export const modalidades = mysqlTable('modalidades', {
  id:   int('id').primaryKey().autoincrement(),
  nome: varchar('nome', { length: 100 }).notNull(),
  fluxoId: int('fluxo_id').references(() => fluxos.id),
  ativo: boolean('ativo').notNull().default(true),
})

export const situacoes = mysqlTable('situacoes', {
  id:    int('id').primaryKey().autoincrement(),
  nome:  varchar('nome', { length: 100 }).notNull(),
  ordem: int('ordem').notNull().default(0),
  ativo: boolean('ativo').notNull().default(true),
})

export const etapas = mysqlTable('etapas', {
  // Etapa pertence a fluxos via N:N (`fluxo_etapas`). Não há FK direta — a coluna
  // `fluxo_id` legacy foi removida em 2026-04-28 (estava causando bug ativo na
  // tela ConfigurarFluxo).
  id:          int('id').primaryKey().autoincrement(),
  nome:        varchar('nome', { length: 100 }).notNull(),
  ordem:       int('ordem').notNull().default(0),
  tolerancia:  int('tolerancia').default(0), // dias de tolerância
  situacaoId:  int('situacao_id').references(() => situacoes.id),
  importante:  boolean('importante').default(false),
  atendente:   boolean('atendente').default(false),
  externo:     boolean('externo').default(false),
  ativo:       boolean('ativo').notNull().default(true),
})

export const fluxos = mysqlTable('fluxos', {
  id:   int('id').primaryKey().autoincrement(),
  nome: varchar('nome', { length: 100 }).notNull(),
  externo: boolean('externo').notNull().default(false),
  ativo: boolean('ativo').notNull().default(true),
})

export const fluxoEtapas = mysqlTable('fluxo_etapas', {
  id:       int('id').primaryKey().autoincrement(),
  fluxoId:  int('fluxo_id').notNull().references(() => fluxos.id),
  etapaId:  int('etapa_id').notNull().references(() => etapas.id),
  ordem:    int('ordem').notNull().default(0),
})

export const documentosTipos = mysqlTable('documentos_tipos', {
  id:      int('id').primaryKey().autoincrement(),
  fluxoId: int('fluxo_id').references(() => fluxos.id),
  nome:    varchar('nome', { length: 150 }).notNull(),
  categoria: varchar('categoria', { length: 50 }).default('Comprador - Pessoa Física'),
  ordem:   int('ordem').notNull().default(0),
  obrigatorio: boolean('obrigatorio').notNull().default(true),
  ativo:   boolean('ativo').notNull().default(true),
})

// ============================================================
// PROCESSOS DE FINANCIAMENTO
// ============================================================
export const processos = mysqlTable('processos', {
  id:                    int('id').primaryKey().autoincrement(),
  // Dados Gerais
  bancoId:               int('banco_id').references(() => bancos.id),
  agenciaId:             int('agencia_id').references(() => agencias.id),
  modalidadeId:          int('modalidade_id').references(() => modalidades.id),
  fluxoId:               int('fluxo_id').references(() => fluxos.id),
  situacaoId:            int('situacao_id').references(() => situacoes.id),
  encaminhamento:        varchar('encaminhamento', { length: 100 }),
  responsavelId:         int('responsavel_id').references(() => usuarios.id),
  dataEmissaoContrato:   date('data_emissao_contrato'),
  dataAssinatura:        date('data_assinatura'),
  dataPagtoVendedor:     date('data_pagto_vendedor'),
  dataRemuneracao:       date('data_remuneracao'),
  dataPagtoComissao:     date('data_pagto_comissao'),
  numProposta:           varchar('num_proposta', { length: 50 }),
  numContrato:           varchar('num_contrato', { length: 50 }),
  observacao:            text('observacao'),
  reprovado:             boolean('reprovado').notNull().default(false),
  arquivado:             boolean('arquivado').notNull().default(false),
  pausado:               boolean('pausado').notNull().default(false),
  cadastroInicialCompleto: boolean('cadastro_inicial_completo').notNull().default(true),
  // Valores
  valorCompraVenda:      decimal('valor_compra_venda', { precision: 15, scale: 2 }).default('0.00'),
  valorAvaliacao:        decimal('valor_avaliacao', { precision: 15, scale: 2 }).default('0.00'),
  valorRecursoProprio:   decimal('valor_recurso_proprio', { precision: 15, scale: 2 }).default('0.00'),
  valorSubsidio:         decimal('valor_subsidio', { precision: 15, scale: 2 }).default('0.00'),
  valorFgts:             decimal('valor_fgts', { precision: 15, scale: 2 }).default('0.00'),
  valorIq:               decimal('valor_iq', { precision: 15, scale: 2 }).default('0.00'),
  valorFinanciado:       decimal('valor_financiado', { precision: 15, scale: 2 }).default('0.00'),
  valorParcela:          decimal('valor_parcela', { precision: 15, scale: 2 }).default('0.00'),
  numeroParcelas:        int('numero_parcelas').default(0),
  valorDespesas:         decimal('valor_despesas', { precision: 12, scale: 2 }).default('0.00'),
  remuneracaoPerc:       decimal('remuneracao_perc', { precision: 5, scale: 2 }).default('0.00'),
  remuneracaoValor:      decimal('remuneracao_valor', { precision: 12, scale: 2 }).default('0.00'),
  taxa:                  decimal('taxa', { precision: 5, scale: 2 }).default('0.00'),
  tipoAmortizacao:       mysqlEnum('tipo_amortizacao', ['SAC','PRICE']).default('PRICE'),
  tipoImovel:            mysqlEnum('tipo_imovel_processo', ['Novo','Usado']),
  // Vínculos
  parceiroId:            int('parceiro_id').references(() => parceiros.id),
  corretorId:            int('corretor_id').references(() => corretores.id),
  imobiliariaId:         int('imobiliaria_id').references(() => imobiliarias.id),
  constutoraId:          int('construtora_id').references(() => construtoras.id),
  // Controle
  criadoPorId:           int('criado_por_id').references(() => usuarios.id),
  criadoEm:              datetime('criado_em').notNull().default(new Date()),
  atualizadoEm:          datetime('atualizado_em').notNull().default(new Date()),
}, (t) => ({
  idxBanco:       index('idx_banco').on(t.bancoId),
  idxResponsavel: index('idx_responsavel').on(t.responsavelId),
  idxSituacao:    index('idx_situacao').on(t.situacaoId),
}))

// Vínculo Processo <-> Compradores (pode ter múltiplos)
export const processoCompradores = mysqlTable('processo_compradores', {
  processoId: int('processo_id').notNull().references(() => processos.id),
  clienteId:  int('cliente_id').notNull().references(() => clientes.id),
  proponente: boolean('proponente').default(false),
}, (t) => ({
  pk: primaryKey({ columns: [t.processoId, t.clienteId] }),
}))

// Vínculo Processo <-> Vendedores
export const processoVendedores = mysqlTable('processo_vendedores', {
  processoId: int('processo_id').notNull().references(() => processos.id),
  clienteId:  int('cliente_id').notNull().references(() => clientes.id),
  proponente: boolean('proponente').default(false),
}, (t) => ({
  pk: primaryKey({ columns: [t.processoId, t.clienteId] }),
}))

// Vínculo Processo <-> Imóveis
export const processoImoveis = mysqlTable('processo_imoveis', {
  processoId: int('processo_id').notNull().references(() => processos.id),
  imovelId:   int('imovel_id').notNull().references(() => imoveis.id),
}, (t) => ({
  pk: primaryKey({ columns: [t.processoId, t.imovelId] }),
}))

// Etapas do Processo (histórico de progresso)
export const processoEtapas = mysqlTable('processo_etapas', {
  id:          int('id').primaryKey().autoincrement(),
  processoId:  int('processo_id').notNull().references(() => processos.id),
  etapaId:     int('etapa_id').notNull().references(() => etapas.id),
  ordem:       int('ordem').notNull(),
  observacao:  text('observacao'),
  iniciado:    datetime('iniciado'),
  concluido:   datetime('concluido'),
  diasDecorridos: int('dias_decorridos').default(0),
  usuarioId:   int('usuario_id').references(() => usuarios.id),
})

// Histórico do Processo
export const processoHistorico = mysqlTable('processo_historico', {
  id:          int('id').primaryKey().autoincrement(),
  processoId:  int('processo_id').notNull().references(() => processos.id),
  usuarioId:   int('usuario_id').references(() => usuarios.id),
  titulo:      varchar('titulo', { length: 200 }),
  descricao:   text('descricao').notNull(),
  tipo:        varchar('tipo', { length: 50 }).default('historico'),
  etapa:       varchar('etapa', { length: 100 }),
  criadoEm:    datetime('criado_em').notNull().default(new Date()),
})

// Documentação do Processo
export const processoDocumentos = mysqlTable('processo_documentos', {
  id:              int('id').primaryKey().autoincrement(),
  processoId:      int('processo_id').notNull().references(() => processos.id),
  documentoTipoId: int('documento_tipo_id').references(() => documentosTipos.id),
  clienteId:       int('cliente_id').references(() => clientes.id),
  nomeArquivo:     varchar('nome_arquivo', { length: 255 }).notNull(),
  caminhoArquivo:  varchar('caminho_arquivo', { length: 500 }).notNull(),
  mimeType:        varchar('mime_type', { length: 100 }),
  tamanho:         int('tamanho'),
  secao:           varchar('secao', { length: 50 }).default('Geral'),
  tipoVinculo:     varchar('tipo_vinculo', { length: 30 }).default('formulario'),
  status:          varchar('status', { length: 20 }).default('pendente'),
  motivoRecusa:    text('motivo_recusa'),
  dataValidade:    date('data_validade'),
  usuarioId:       int('usuario_id').references(() => usuarios.id),
  criadoEm:        datetime('criado_em').notNull().default(new Date()),
})

// Atendimentos do Processo
export const processoAtendimentos = mysqlTable('processo_atendimentos', {
  id:          int('id').primaryKey().autoincrement(),
  processoId:  int('processo_id').notNull().references(() => processos.id),
  usuarioId:   int('usuario_id').references(() => usuarios.id),
  descricao:   text('descricao').notNull(),
  criadoEm:    datetime('criado_em').notNull().default(new Date()),
})

// ============================================================
// PRÉ-ANÁLISE
// ============================================================
export const preAnalises = mysqlTable('pre_analises', {
  id:               int('id').primaryKey().autoincrement(),
  processoId:       int('processo_id').references(() => processos.id),
  bancos:           varchar('bancos', { length: 100 }).notNull(), // CSV: "1,2,3"
  nome:             varchar('nome', { length: 200 }).notNull(),
  cpfCnpj:          varchar('cpf_cnpj', { length: 20 }).notNull(),
  dataNascimento:   date('data_nascimento'),
  valorFinanciamento: decimal('valor_financiamento', { precision: 15, scale: 2 }),
  estadoCivil:      mysqlEnum('estado_civil', ['Solteiro','Casado']).default('Solteiro'),
  cpfConjuge:       varchar('cpf_conjuge', { length: 20 }),
  nomeConjuge:      varchar('nome_conjuge', { length: 200 }),
  nomeMae:          varchar('nome_mae', { length: 200 }),
  cep:              varchar('cep', { length: 10 }),
  situacao:         varchar('situacao', { length: 50 }).default('Aguardando análise'),
  observacao:       text('observacao'),
  retorno:          text('retorno'),
  permitirReenvio:  boolean('permitir_reenvio').default(false),
  solicitanteId:    int('solicitante_id').references(() => usuarios.id),
  responsavelId:    int('responsavel_id').references(() => usuarios.id),
  criadoEm:         datetime('criado_em').notNull().default(new Date()),
  atualizadoEm:     datetime('atualizado_em').notNull().default(new Date()),
})

// ============================================================
// TAREFAS
// ============================================================
export const tarefas = mysqlTable('tarefas', {
  id:           int('id').primaryKey().autoincrement(),
  processoId:   int('processo_id').references(() => processos.id),
  solicitanteId: int('solicitante_id').notNull().references(() => usuarios.id),
  executanteId: int('executante_id').notNull().references(() => usuarios.id),
  solicitacao:  text('solicitacao').notNull(),
  dataLimite:   date('data_limite'),
  status:       mysqlEnum('status', ['Pendente','Resolvida','Encerrada']).notNull().default('Pendente'),
  acompanhamento: text('acompanhamento'),
  criadoEm:     datetime('criado_em').notNull().default(new Date()),
  resolvidoEm:  datetime('resolvido_em'),
})

// ============================================================
// CHAT INTERNO
// ============================================================
export const chatConversas = mysqlTable('chat_conversas', {
  id:          int('id').primaryKey().autoincrement(),
  criadoPorId: int('criado_por_id').notNull().references(() => usuarios.id),
  internoId:   int('interno_id').references(() => usuarios.id),
  externoId:   int('externo_id').references(() => usuarios.id),
  processoId:  int('processo_id').references(() => processos.id),
  status:      varchar('status', { length: 20 }).notNull().default('aberta'),
  criadoEm:    datetime('criado_em').notNull().default(new Date()),
  atualizadoEm: datetime('atualizado_em').notNull().default(new Date()),
}, (t) => ({
  idxInterno: index('idx_chat_conversas_interno').on(t.internoId),
  idxExterno: index('idx_chat_conversas_externo').on(t.externoId),
  idxCriadoPor: index('idx_chat_conversas_criado_por').on(t.criadoPorId),
}))

export const chatMensagens = mysqlTable('chat_mensagens', {
  id:          int('id').primaryKey().autoincrement(),
  conversaId:  int('conversa_id').notNull().references(() => chatConversas.id),
  remetenteId: int('remetente_id').notNull().references(() => usuarios.id),
  texto:       text('texto').notNull(),
  processoIdDetectado: int('processo_id_detectado').references(() => processos.id),
  lidaEm:      datetime('lida_em'),
  criadoEm:    datetime('criado_em').notNull().default(new Date()),
}, (t) => ({
  idxConversa: index('idx_chat_mensagens_conversa').on(t.conversaId),
  idxRemetente: index('idx_chat_mensagens_remetente').on(t.remetenteId),
}))

// ============================================================
// AVISOS E ADVERTÊNCIAS
// ============================================================
export const avisos = mysqlTable('avisos', {
  id:          int('id').primaryKey().autoincrement(),
  titulo:      varchar('titulo', { length: 200 }).notNull(),
  mensagem:    text('mensagem').notNull(),
  perfil:      varchar('perfil', { length: 50 }).default('Todos'),
  dataInicio:  date('data_inicio'),
  dataFim:     date('data_fim'),
  destinoId:   int('destino_id').references(() => usuarios.id), // null = todos
  lido:        boolean('lido').notNull().default(false),
  criadoPorId: int('criado_por_id').references(() => usuarios.id),
  criadoEm:    datetime('criado_em').notNull().default(new Date()),
})

export const advertencias = mysqlTable('advertencias', {
  id:                int('id').primaryKey().autoincrement(),
  usuarioId:         int('usuario_id').notNull().references(() => usuarios.id),
  processoId:        int('processo_id').references(() => processos.id),
  descricao:         text('descricao').notNull(),
  motivoContestacao: text('motivo_contestacao'),
  justificativa:     text('justificativa'),
  status:            mysqlEnum('status', ['Pendente','Aceita','Contestada','Em Análise','Rejeitada']).notNull().default('Pendente'),
  criadoPorId:       int('criado_por_id').references(() => usuarios.id),
  criadoEm:          datetime('criado_em').notNull().default(new Date()),
  resolvidoEm:       datetime('resolvido_em'),
})

// ============================================================
// FINANCEIRO
// ============================================================
export const finTipoDespesas = mysqlTable('fin_tipo_despesas', {
  id:   int('id').primaryKey().autoincrement(),
  nome: varchar('nome', { length: 150 }).notNull(),
  ativo: boolean('ativo').notNull().default(true),
})

export const finTipoReceitas = mysqlTable('fin_tipo_receitas', {
  id:   int('id').primaryKey().autoincrement(),
  nome: varchar('nome', { length: 150 }).notNull(),
  ativo: boolean('ativo').notNull().default(true),
})

export const finNaturezas = mysqlTable('fin_naturezas', {
  id:   int('id').primaryKey().autoincrement(),
  nome: varchar('nome', { length: 150 }).notNull(),
  tipo: mysqlEnum('tipo', ['Despesa','Receita','Ambos']).notNull().default('Ambos'),
  ativo: boolean('ativo').notNull().default(true),
})

export const finEmpresas = mysqlTable('fin_empresas', {
  id:   int('id').primaryKey().autoincrement(),
  nome: varchar('nome', { length: 150 }).notNull(),
  cnpj: varchar('cnpj', { length: 20 }),
  ativo: boolean('ativo').notNull().default(true),
})

export const finContas = mysqlTable('fin_contas', {
  id:        int('id').primaryKey().autoincrement(),
  empresaId: int('empresa_id').references(() => finEmpresas.id),
  banco:     varchar('banco', { length: 100 }).notNull(),
  agencia:   varchar('agencia', { length: 100 }),
  conta:     varchar('conta', { length: 50 }),
  titular:   varchar('titular', { length: 100 }),
  limite:    decimal('limite', { precision: 15, scale: 2 }).default('0.00'),
  saldo:     decimal('saldo', { precision: 15, scale: 2 }).default('0.00'),
  ativo:     boolean('ativo').notNull().default(true),
})

export const finFornecedores = mysqlTable('fin_fornecedores', {
  id:    int('id').primaryKey().autoincrement(),
  nome:  varchar('nome', { length: 150 }).notNull(),
  cnpj:  varchar('cnpj', { length: 20 }),
  fone:  varchar('fone', { length: 20 }),
  email: varchar('email', { length: 100 }),
  ativo: boolean('ativo').notNull().default(true),
})

export const finDevedores = mysqlTable('fin_devedores', {
  id:    int('id').primaryKey().autoincrement(),
  nome:  varchar('nome', { length: 150 }).notNull(),
  cnpj:  varchar('cnpj', { length: 20 }),
  fone:  varchar('fone', { length: 20 }),
  email: varchar('email', { length: 100 }),
  ativo: boolean('ativo').notNull().default(true),
})

export const contasPagar = mysqlTable('contas_pagar', {
  id:               int('id').primaryKey().autoincrement(),
  empresaId:        int('empresa_id').references(() => finEmpresas.id),
  tipoDespesaId:    int('tipo_despesa_id').references(() => finTipoDespesas.id),
  fornecedorId:     int('fornecedor_id').references(() => finFornecedores.id),
  contaId:          int('conta_id').references(() => finContas.id),
  naturezaId:       int('natureza_id').references(() => finNaturezas.id),
  vencimento:       date('vencimento').notNull(),
  valor:            decimal('valor', { precision: 15, scale: 2 }).notNull(),
  valorPago:        decimal('valor_pago', { precision: 15, scale: 2 }).default('0.00'),
  numDocumento:     varchar('num_documento', { length: 50 }),
  historico:        varchar('historico', { length: 255 }),
  formaPagamento:   mysqlEnum('forma_pagamento', ['BOLETO','CARTÃO DE CRÉDITO','CARTÃO DE DÉBITO','DÉBITO EM CONTA','DINHEIRO','PIX','TRANSFERÊNCIA BANCÁRIA']),
  status:           mysqlEnum('status', ['Pendente','Pago','Atrasado']).notNull().default('Pendente'),
  despesaFixa:      boolean('despesa_fixa').notNull().default(false),
  parcelaAtual:     int('parcela_atual').default(1),
  totalParcelas:    int('total_parcelas').default(1),
  parcelaPaiId:     int('parcela_pai_id'),
  dataPagamento:    date('data_pagamento'),
  observacao:       text('observacao'),
  usuarioId:        int('usuario_id').references(() => usuarios.id),
  criadoEm:         datetime('criado_em').notNull().default(new Date()),
})

export const contasReceber = mysqlTable('contas_receber', {
  id:               int('id').primaryKey().autoincrement(),
  empresaId:        int('empresa_id').references(() => finEmpresas.id),
  tipoReceitaId:    int('tipo_receita_id').references(() => finTipoReceitas.id),
  devedorId:        int('devedor_id').references(() => finDevedores.id),
  contaId:          int('conta_id').references(() => finContas.id),
  naturezaId:       int('natureza_id').references(() => finNaturezas.id),
  processoId:       int('processo_id').references(() => processos.id),
  vencimento:       date('vencimento').notNull(),
  valor:            decimal('valor', { precision: 15, scale: 2 }).notNull(),
  valorRecebido:    decimal('valor_recebido', { precision: 15, scale: 2 }).default('0.00'),
  numDocumento:     varchar('num_documento', { length: 50 }),
  historico:        varchar('historico', { length: 255 }),
  formaPagamento:   mysqlEnum('forma_pagamento', ['BOLETO','CARTÃO DE CRÉDITO','CARTÃO DE DÉBITO','DÉBITO EM CONTA','DINHEIRO','PIX','TRANSFERÊNCIA BANCÁRIA']),
  status:           mysqlEnum('status', ['Pendente','Recebido','Atrasado']).notNull().default('Pendente'),
  dataRecebimento:  date('data_recebimento'),
  observacao:       text('observacao'),
  usuarioId:        int('usuario_id').references(() => usuarios.id),
  criadoEm:         datetime('criado_em').notNull().default(new Date()),
})

export const fluxoCaixa = mysqlTable('fluxo_caixa', {
  id:             int('id').primaryKey().autoincrement(),
  empresaId:      int('empresa_id').references(() => finEmpresas.id),
  contaId:        int('conta_id').references(() => finContas.id),
  naturezaId:     int('natureza_id').references(() => finNaturezas.id),
  tipo:           mysqlEnum('tipo', ['Credito','Debito']).notNull(),
  valor:          decimal('valor', { precision: 15, scale: 2 }).notNull(),
  historico:      varchar('historico', { length: 255 }),
  dataMovimento:  date('data_movimento').notNull(),
  contaPagarId:   int('conta_pagar_id').references(() => contasPagar.id),
  contaReceberId: int('conta_receber_id').references(() => contasReceber.id),
  usuarioId:      int('usuario_id').references(() => usuarios.id),
  criadoEm:       datetime('criado_em').notNull().default(new Date()),
})

// ============================================================
// TIME TRACKING (Bater Ponto)
// ============================================================
export const pontos = mysqlTable('pontos', {
  id:         int('id').primaryKey().autoincrement(),
  usuarioId:  int('usuario_id').notNull().references(() => usuarios.id),
  tipo:       mysqlEnum('tipo', ['Entrada','SaidaAlmoco','RetornoAlmoco','Saida']).notNull(),
  dataHora:   datetime('data_hora').notNull(),
  observacao: varchar('observacao', { length: 255 }),
  criadoEm:   datetime('criado_em').notNull().default(new Date()),
})

// ============================================================
// ARQUIVOS
// ============================================================
export const arquivos = mysqlTable('arquivos', {
  id:             int('id').primaryKey().autoincrement(),
  usuarioId:      int('usuario_id').notNull().references(() => usuarios.id),
  processoId:     int('processo_id').references(() => processos.id),
  parceiroId:     int('parceiro_id').references(() => parceiros.id),
  nomeOriginal:   varchar('nome_original', { length: 255 }).notNull(),
  nomeArquivo:    varchar('nome_arquivo', { length: 255 }).notNull(),
  caminhoArquivo: varchar('caminho_arquivo', { length: 500 }).notNull(),
  mimeType:       varchar('mime_type', { length: 100 }),
  tamanho:        int('tamanho'),
  descricao:      varchar('descricao', { length: 255 }),
  criadoEm:       datetime('criado_em').notNull().default(new Date()),
})

// ============================================================
// SIMULADORES (config dos bancos)
// ============================================================
export const simuladores = mysqlTable('simuladores', {
  id:       int('id').primaryKey().autoincrement(),
  nome:     varchar('nome', { length: 100 }).notNull(),
  url:      varchar('url', { length: 500 }).notNull(),
  logoUrl:  varchar('logo_url', { length: 500 }),
  tipo:     mysqlEnum('tipo', ['Simulador','Portal']).notNull().default('Simulador'),
  ordem:    int('ordem').notNull().default(0),
  ativo:    boolean('ativo').notNull().default(true),
})

// ============================================================
// PERMISSÕES POR USUÁRIO
// ============================================================
export const permissoes = mysqlTable('permissoes', {
  id:        int('id').primaryKey().autoincrement(),
  usuarioId: int('usuario_id').notNull().references(() => usuarios.id),
  modulo:    varchar('modulo', { length: 100 }).notNull(),
  ver:       boolean('ver').notNull().default(false),
  criar:     boolean('criar').notNull().default(false),
  editar:    boolean('editar').notNull().default(false),
  excluir:   boolean('excluir').notNull().default(false),
})

// ============================================================
// TABELAS DE JUNÇÃO
// ============================================================
export const bancoModalidades = mysqlTable('banco_modalidades', {
  bancoId:      int('banco_id').notNull().references(() => bancos.id),
  modalidadeId: int('modalidade_id').notNull().references(() => modalidades.id),
}, (t) => ({
  pk: primaryKey({ columns: [t.bancoId, t.modalidadeId] }),
}))

export const fluxoDocumentos = mysqlTable('fluxo_documentos', {
  id:              int('id').primaryKey().autoincrement(),
  fluxoId:         int('fluxo_id').notNull().references(() => fluxos.id),
  documentoTipoId: int('documento_tipo_id').notNull().references(() => documentosTipos.id),
  categoria:       varchar('categoria', { length: 50 }).notNull().default('Comprador - Pessoa Física'),
  ordem:           int('ordem').notNull().default(0),
  obrigatorioPrimeiraEtapa: boolean('obrigatorio_primeira_etapa').notNull().default(false),
})

export const parceiroBancos = mysqlTable('parceiro_bancos', {
  parceiroId: int('parceiro_id').notNull().references(() => parceiros.id),
  bancoId:    int('banco_id').notNull().references(() => bancos.id),
}, (t) => ({
  pk: primaryKey({ columns: [t.parceiroId, t.bancoId] }),
}))

// ============================================================
// PERMISSÕES POR PERFIL
// ============================================================
export const permissoesPerfil = mysqlTable('permissoes_perfil', {
  id:        int('id').primaryKey().autoincrement(),
  perfil:    varchar('perfil', { length: 50 }).notNull(),
  recurso:   varchar('recurso', { length: 100 }).notNull(),
  permitido: boolean('permitido').notNull().default(true),
})

// Subestabelecido ↔ Bancos (N:N)
export const subestabelecidoBancos = mysqlTable('subestabelecido_bancos', {
  id: int('id').primaryKey().autoincrement(),
  subestabelecidoId: int('subestabelecido_id').notNull().references(() => subestabelecidos.id),
  bancoId: int('banco_id').notNull().references(() => bancos.id),
})
