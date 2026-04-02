# MAPEAMENTO COMPLETO — Sistema Antigo (Easy Correspondente)
> URL: https://amarantecoban.easycorrespondente.com.br
> Stack: ASP.NET WebForms (.aspx), PostBack, Bootstrap

---

## HOME (Default.aspx)
### 9 Seções:
1. **Simuladores** — Cards clicáveis (links externos): Caixa, Itaú, Bradesco, Santander, BB
2. **Portais** — Cards clicáveis (links externos): Caixa (CA,SR,LDLP), Itaú, Bradesco, BB
3. **Pré-Análise** — Lista resumida das últimas pré-análises + botão "Nova Pré-Análise"
4. **Tarefas Recebidas** — Grid: Cod, Processo, Solicitação, Solicitante, Data, Status + botão Resolver
5. **Tarefas Criadas** — Grid: Cod, Processo, Solicitação, Executante, Data, Status
6. **Análise COBAN** — Painel (parece vazio/placeholder no sistema atual)
7. **Meus Processos** — Grid: Cod, Comprador, Banco, Situação, Etapa, Início (pode estar vazio)
8. **Bater Ponto** — Botão no header (modal: Entrada/Saída Almoço/Retorno/Saída + observação)
9. **Pesquisa Global** — Campo no header "Digite o Nome ou CPF para pesquisar..."

### Modais da Home:
- **Nova Pré-Análise**: Banco(s) checkbox, Nome, CPF/CNPJ, Data Nascimento, Valor Financiamento, Estado Civil, CPF Cônjuge, Nome Cônjuge, Nome da Mãe, CEP
- **Nova Tarefa**: Processo (dropdown), Executante (dropdown usuários), Solicitação (textarea), Data Limite
- **Resolver Tarefa**: Acompanhamento (textarea)
- **Bater Ponto**: Tipo (Entrada/SaídaAlmoço/RetornoAlmoço/Saída), Observação

---

## SIDEBAR — Menu Completo
### Cadastros
- Comprador → Cliente.aspx?cd=1
- Vendedor → Cliente.aspx?cd=2
- Construtora → Construtora.aspx
- Empreendimento → Empreendimento.aspx
- Banco → Banco.aspx
- Agência → Agencia.aspx
- Imóvel → Imovel.aspx
- Imobiliária → Imobiliaria.aspx
- Corretor → Corretor.aspx
- Parceiro → Parceiro.aspx
- Subestabelecido → Subestabelecido.aspx
- Modalidade → Modalidade.aspx

### Configurações
- Situação → Situacao.aspx
- Etapa → Etapa.aspx
- Fluxo → Fluxo.aspx
- Documentos → DocumentoTipo.aspx

### Financiamento
- Processo → Processo.aspx

### Financeiro → Cadastros
- Tipo Despesa → TipoDespesa.aspx (em Financeiro/)
- Tipo Receita → TipoReceita.aspx
- Devedor → Devedor.aspx
- Fornecedor → Fornecedor.aspx
- Natureza → Natureza.aspx
- Conta → Conta.aspx
- Empresa → Empresa.aspx

### Financeiro → Operações
- Contas a Pagar → ContasPagar.aspx (em Financeiro/)
- Contas a Receber → ContasReceber.aspx
- Fluxo de Caixa → FluxoCaixa.aspx

### Segurança
- Usuário → Usuario.aspx (em Seguranca/)
- Advertência → Advertencia.aspx
- Aviso → Aviso.aspx
- Tarefa → Tarefa.aspx

### Relatórios
- Processo/Etapa → RelProcessoEtapa.aspx (em Relatorio/)
- Produção → RelProducao.aspx
- Parceiro → RelParceiro.aspx
- Tarefas → RelTarefas.aspx
- Contas a Pagar → RelContasPagar.aspx
- Contas a Receber → RelContasReceber.aspx
- Fluxo de Caixa → RelFluxoCaixa.aspx

### Outros
- Meus Arquivos → MeusArquivos.aspx

---

## COMPRADOR / VENDEDOR (Cliente.aspx?cd=1 / cd=2)
> Mesma página, tipo diferenciado pelo parâmetro cd (1=Comprador, 2=Vendedor)

### Lista
- **Busca**: campo "Digite o nome ou CPF para pesquisar..." + botão Pesquisar
- **Colunas**: (Editar), (Excluir), Nome, CPF/CNPJ, Fone 1, Fone 2, Fone 3, E-mail
- **Botões**: Pesquisar, Novo
- **Paginação**: sim

### Formulário (ClienteManter.aspx?cd=X&id=Y&tp=0)
> URL: ClienteManter?cd=1&id=0&tp=0 (novo) ou cd=1&id=123&tp=0 (editar)

#### Aba 1 — Dados Gerais (#tabDados)
| Campo | Tipo | ID | Max | Opções |
|-------|------|----|-----|--------|
| Nome | text | txtNome | 70 | |
| CPF/CNPJ | text | txtCPF | 14 | |
| Data de nascimento | text | txtDataNascimento | 10 | formato DD/MM/AAAA |
| Estado Civil | select | ddlEstadoCivil | | (vazio), Casado Comunhão de Bens, Casado Comunhão Parcial de Bens, Casado separação de Bens, Divorciado, Separado Judicialmente, Solteiro, União Estável/Outros, Viúvo |
| Documento de identificação | select | ddlDocumento | | (vazio), Cart. Identidade e Estrangeiro, Carteira de Identidade, Carteira Funcional, CNH, CPF, Identidade Militar, Passaporte |
| Número do documento | text | txtNumDocumento | 10 | |
| Data de expedição | text | txtDataExp | 10 | DD/MM/AAAA |
| Orgão expedidor | text | txtOrgaoExpedidor | 50 | |
| Capitação | text | txtCapitacao | 70 | |
| Valor de renda comprovada | text | txtValRenda | 10 | |
| Dependentes | checkbox | chkDependentes | | |

#### Aba 2 — Endereço (#tabEnd)
| Campo | Tipo | ID | Max |
|-------|------|----|-----|
| Endereço | text | txtEndereco | 70 |
| Número | text | txtNumero | 70 |
| Bairro | text | txtBairro | 70 |
| Cidade | text | txtCidade | 70 |
| UF | select | ddlUF | todos os 27 estados BR |
| CEP | text | txtCEP | 8 |

#### Aba 3 — Contato (#tabContato)
| Campo | Tipo | ID | Max |
|-------|------|----|-----|
| Fone 1 | text | txtFone1 | 15 |
| Fone 2 | text | txtFone2 | 15 |
| Nome Contato 2 | text | txtNomContato2 | |
| Fone 3 | text | txtFone3 | 15 |
| Nome Contato 3 | text | txtNomContato3 | |
| E-mail | text | txtEmail | 70 |

#### Aba 4 — Dados Bancários (#tabBanco)
| Campo | Tipo | ID | Opções |
|-------|------|----|--------|
| Banco | select | ddlBanco | (vazio), AGRO, Banco Bari, Banco do Brasil, Bradesco, C6 Bank, CrediBlue, CrediBlue - Financiamento, CrediBlue Home Equity, Creditú, FINTECH, Fundo de Investimento, Itaú, Sicoob |
| Número da Agência | text | txtNumAgencia | max=10 |
| Número da Conta | text | txtNumConta | max=10 |

#### Aba 5 — Vínculo (#tabVinculo)
| Campo | Tipo | ID | Observação |
|-------|------|----|------------|
| Construtora | select | ddlConstrutora | Lista de construtoras cadastradas |
| Corretor | select | ddlCorretor | Lista de corretores cadastrados (muitos) |
| Parceiro | select | ddlParceiro | Lista de parceiros cadastrados |
| Imobiliária | select | ddlImobiliaria | Lista de imobiliárias cadastradas |

#### Botões de Ação
- **Salvar** (btnSalvar)
- **Cancelar** (a_Cancelar) — volta para lista

---

## PRÉ-ANÁLISE (PreAnalise.aspx)
> Acessível pela Home e pelo menu (se existir)

### Lista
- Colunas visíveis na Home: Situação (badge colorido), CPF/CNPJ, Nome, Valor, Banco, Responsável, Cód., Ações
- Ações: Visualizar, Editar, Excluir

### Nova Pré-Análise (Modal)
| Campo | Tipo | Observação |
|-------|------|------------|
| Banco(s) | checkboxes | Múltipla seleção dos bancos cadastrados |
| Nome | text | obrigatório |
| CPF/CNPJ | text | obrigatório |
| Data Nascimento | text | |
| Valor Financiamento | text | |
| Estado Civil | select | Solteiro, Casado |
| CPF Cônjuge | text | aparece se Casado |
| Nome Cônjuge | text | aparece se Casado |
| Nome da Mãe | text | |
| CEP | text | |

### Editar Pré-Análise (Modal)
| Campo | Tipo |
|-------|------|
| Situação | select: Aguardando, Em análise, Aprovada, Reprovada |
| Observação | textarea |
| Permitir reenvio | checkbox |

---

## CADASTROS AUXILIARES

### Construtora (Construtora.aspx → ConstrutoraManter)
**Lista colunas**: (Editar), (Excluir), Nome, Fone, E-mail
**Formulário**:
| Campo | Tipo | Max |
|-------|------|-----|
| Nome da Construtora | text | 70 |
| CNPJ | text | 14 |
| Nome do Contato | text | 70 |
| Fone | text | 15 |
| E-mail | text | 70 |
| Endereço | text | 70 |
| Número | text | 70 |
| Bairro | text | 70 |
| Cidade | text | 70 |
| UF | select | 27 estados |
| CEP | text | 8 |
| Usuário do sistema | select | lista de usuários |

### Empreendimento (Empreendimento.aspx → EmpreendimentoManter)
**Lista colunas**: (Editar), (Excluir), (sem headers visíveis)
**Formulário**:
| Campo | Tipo | Opções |
|-------|------|--------|
| Nome do Empreendimento | text max=70 | |
| Construtora | select | lista de construtoras |
| Tipo de Empreendimento | select | Comercial, Residencial |
| Endereço | text max=70 | |
| Bairro | text max=70 | |
| Cidade | text max=70 | |
| UF | select | 27 estados |

### Banco (Banco.aspx → BancoManter)
**Lista colunas**: (Editar), (Excluir), Nome
**Formulário**:
| Campo | Tipo | Opções |
|-------|------|--------|
| Nome do Banco | text max=70 | |
| Encaminhamento | select | CENOP, SICOB, CEHOP, INTERCERVICE, FUNCHAL, FINTECH, ITAÚ |
| Remuneração | text max=3 | percentual |

### Agência (Agencia.aspx → AgenciaManter)
**Lista colunas**: (Editar), (Excluir), Nome da Agência, Banco, Número
**Formulário**:
| Campo | Tipo |
|-------|------|
| Nome da Agência | text max=70 |
| Banco | select (lista de bancos) |
| Número da Agência | text max=10 |

### Imóvel (Imovel.aspx → ImovelManter)
**Lista colunas**: (Editar), (Excluir), Matrícula, Endereço, Número, Complemento, Bairro, Cidade, UF, CEP
**Formulário**:
| Campo | Tipo | Opções |
|-------|------|--------|
| Matrícula | text max=8 | |
| Tipo | select | Residencial, Comercial, Terreno, Galpão |
| CEP | text max=8 | |
| Endereço | text max=70 | |
| Número | text max=70 | |
| Complemento | text max=70 | |
| Bairro | text max=70 | |
| Cidade | text max=70 | |
| UF | select | 27 estados |

### Imobiliária (Imobiliaria.aspx → ImobiliariaManter)
**Lista colunas**: (Editar), (Excluir), Nome da imobiliária, Nome do contato, Fone, E-mail
**Formulário**:
| Campo | Tipo | Max |
|-------|------|-----|
| Nome da imobiliária | text | 70 |
| CNPJ | text | 14 |
| Nome do contato | text | |
| Fone | text | 15 |
| E-mail | text | 70 |
| Endereço | text | 70 |
| Número | text | 70 |
| Bairro | text | 70 |
| Cidade | text | 70 |
| UF | select | 27 estados |
| CEP | text | 8 |
| Parceiro | select | lista de parceiros |
| Usuário do sistema | select | lista de usuários |

### Corretor (Corretor.aspx → CorretorManter)
**Lista colunas**: (Editar), (Excluir), Nome, Fone, E-mail
**Formulário**:
| Campo | Tipo | Max |
|-------|------|-----|
| Nome do Corretor | text | 70 |
| CRECI | text | 20 |
| CPF | text | 11 |
| Fone | text | 15 |
| E-mail | text | 70 |
| Imobiliária | select | lista |
| Parceiro | select | lista |
| Usuário do sistema | select | lista |

### Parceiro (Parceiro.aspx → ParceiroManter)
**Lista colunas**: (Editar), (Excluir), Nome/Razão Social, Nome Fantasia, Usuário, Fone, E-mail, Cidade, UF
**Formulário**:
| Campo | Tipo | Max | Opções |
|-------|------|-----|--------|
| CPF/CNPJ | text | 14 | |
| Nome Fantasia | text | 70 | |
| Nome/Razão Social | text | 70 | |
| Nome do Representante | text | 70 | |
| CPF do Representante | text | 11 | |
| Documento de identificação | select | | mesmas opções de ClienteManter |
| Número do documento | text | 70 | |
| Fone | text | 15 | |
| E-mail | text | 70 | |
| Responsável | text | 70 | |
| Endereço | text | 70 | |
| Número | text | 50 | |
| Bairro | text | 50 | |
| Cidade | text | 70 | |
| UF | select | | 27 estados |
| CEP | text | 8 | |
| Usuário | select | | lista |
| Chave PIX | select | | CPF/CNPJ, Celular, E-mail, Chave aleatória |
| Valor da Chave PIX | text | 70 | |
| Data Ass. Contrato | text | 10 | DD/MM/AAAA |
| Data Situação | text | | readonly |
| Usuário Situação | text | | readonly |

### Subestabelecido (Subestabelecido.aspx → SubestabelecidoManter)
**Lista colunas**: (Editar), (Excluir), Nome
**Formulário**:
| Campo | Tipo |
|-------|------|
| Nome do Subestabelecido | text max=70 |

### Modalidade (Modalidade.aspx → ModalidadeManter)
**Lista colunas**: (Editar), (Excluir), Descrição, Fluxo
**Formulário**:
| Campo | Tipo | Opções |
|-------|------|--------|
| Descrição da Modalidade | text max=70 | |
| Fluxo | select | CGI-Itaú, Crédito p/ Construção, FINANCIAMENTO, Financiamento-Itaú, Fundo de Investimento, HOME EQUITY, Operações Agro, PMCMV, PRO-COTISTA, RESIDENCIAL, SFH-CH, Siscred-Bradesco |

---

## CONFIGURAÇÕES

### Situação (Situacao.aspx → SituacaoManter)
**Lista colunas**: (Editar), (Excluir), Descrição
**Dados existentes**: EXTERNO, FINANCEIRO, Gerencia (Fase 3), OPERACIONAL, Setor de Crédito (Fase 1), Setor de Formalização (Fase 2)
**Formulário**: Descrição (text max=70)

### Etapa (Etapa.aspx → EtapaManter)
**Lista colunas**: (Editar), (Excluir), Descrição, Situação, Dias permanência, Importante, Atendente, Externo
**Dados existentes (exemplos)**: Acione de Vistoria (Fase 2, 8d), Acolhimento de Proposta (Fase 2, 1d), Análise Coban (Fase 1, 1d), Análise de crédito (Fase 1, 5d), etc.
**Formulário**:
| Campo | Tipo |
|-------|------|
| Descrição | text max=70 |
| Situação | select (lista de situações) |
| Num. dias | text max=3 |

### Fluxo (Fluxo.aspx)
**Lista colunas**: (Editar), (Excluir), (Etapas vinculadas), Descrição
**Dados existentes**: CGI-Itaú, Crédito p/ Construção, FINANCIAMENTO, Financiamento-Itaú, Fundo de Investimento, HOME EQUITY, Operações Agro, PMCMV, PRO-COTISTA, RESIDENCIAL
**Formulário**: Descrição (text max=70)
> Nota: Fluxo tem 3 botões no grid (Editar, Excluir, e provavelmente "Ver Etapas")

### Documentos (Documento.aspx)
**Lista colunas**: (Editar), (Excluir), Nome
**Dados existentes (exemplos)**: Abertura dos endividamentos bancários, ART ou RRT, AUTORIZAÇÃO - Análises de Crédito, Autorização de assinatura Eletrônica, AUTORIZAÇÃO DE FGTS, Balancetes, Balanço Patrimonial, Carta de Crédito, etc.
**Formulário**: Descrição (text max=70)

---

## PROCESSO (Processo.aspx) — Lista de Financiamentos

### Filtros de Busca
| Filtro | Tipo | ID |
|--------|------|----|
| Cliente | text | txtNome |
| Banco | select | ddlBanco |
| Situação | select | ddlSituacao |
| Etapa | select | ddlEtapa |
| Agência | select | ddlAgencia |
| Modalidade | select | ddlModalidade |
| Construtora | select | ddlConstrutora |
| Corretor | select | ddlCorretor |
| Imobiliária | select | ddlImobiliaria |
| Parceiro | select | ddlParceiro |
| Código | text | txtCodigo |
**Botão**: Pesquisar

### Colunas da Grid
(Editar) | (Excluir) | (Detalhes?) | Código | N° Proposta | Comprador | Vendedor | Agência | Modalidade | Etapa | Evolução

---

## PROCESSO MANTER (ProcessoManter.aspx?id=X) — ⭐ CORAÇÃO DO SISTEMA

> 11 Abas — Formulário completo de gestão de cada processo de financiamento

### Aba 1 — Dados Gerais (#tabDados)
**Seção principal (readonly + editáveis)**:
| Campo | Tipo | Observação |
|-------|------|------------|
| Banco | text (readonly) | preenchido |
| Agência | text (readonly) | preenchido |
| Modalidade | text (readonly) | preenchido |
| Fluxo | text (readonly) | preenchido |
| Encaminhamento | select | CENOP, SICOB, CEHOP, INTERCERVICE, FUNCHAL, FINTECH, ITAÚ |
| Responsável | select | lista de usuários do sistema |
| Data emissão Contrato | text max=10 | DD/MM/AAAA |
| Data de Assinatura | text max=10 | DD/MM/AAAA |
| Data pagto Vendedor | text max=10 | DD/MM/AAAA |
| Nº Proposta | text max=16 | |
| Nº Contrato | text max=12 | |
| Data Remuneração | text max=10 | DD/MM/AAAA |
| Observação | textarea | |
| Pausado | checkbox | pausa o processo |

**Seção "Alterar Enquadramento"**:
| Campo | Tipo |
|-------|------|
| Banco | select (lista de bancos) |
| Agência | select (muda conforme banco) |
| Modalidade | select |
| Fluxo | text (readonly, muda conforme modalidade) |
| Botão | btnAlterarEnquadramento |

**Seção "Registrar Pendência"**:
- Pendência (textarea) + botão Registrar

### Aba 2 — Valores (#tabValores)
| Campo | Tipo | Max |
|-------|------|-----|
| Valor de Compra e Venda | text | 10 |
| Valor da Avaliação | text | 10 |
| Valor Recurso Próprio | text | 10 |
| Valor do Subsídio | text | 10 |
| Valor FGTS | text | 10 |
| Valor do IQ (Saldo Devedor) | text | 10 |
| Valor Financiado | text | 10 |
| Valor da Parcela | text | 10 |
| Número de Parcelas | text | 5 |
| Taxa de Juros | text | 3 |
| Valor Despesas | text | 10 |
| Remuneração (%) | text | |
| Remuneração (R$) | text | |
| Tipo Amortização | radio | SAC / PRICE |
| Situação do Imóvel | radio | Novo / Usado |

### Aba 3 — Comprador (#tabComprador)
**Grid**: CPF/CNPJ | Cliente | E-mail | Telefone | Proponente
**Botão**: Incluir Comprador
**Modal de inclusão**: Cliente (select dos cadastrados) OU campos manuais: Nome, CPF/CNPJ, Data nasc., Estado Civil, Telefone, E-mail, Valor da Renda, Banco, Agência, Conta

### Aba 4 — Vendedor (#tabVendedor)
**Grid**: CPF/CNPJ | Cliente | E-mail | Telefone | Proponente
**Botão**: Incluir Vendedor
**Modal**: Mesmo layout do Comprador

### Aba 5 — Imóvel (#tabImovel)
**Grid**: Matrícula | Endereço | Número | Complemento | Cidade | UF | CEP
**Botão**: Incluir Imóvel
**Modal**: Matrícula, Tipo (select), CEP, Endereço, Número, Complemento, Bairro, Cidade, UF

### Aba 6 — Etapas (#tabEtapa)
**Grid**: Etapa | Observação | Início | ... | Término | Dias | Usuário
**Ações**: Botões por linha (ícones de ação)
**Botões gerais**: Button3, btnConcluir
**Modal Observação**: Observação (textarea) + checkbox Pendente + btnSalvarObs
**Modal Concluir Etapa**: Observação (textarea) + Responsável (select) + btnConcluirEtapa
> Esta aba controla o fluxo do processo — cada etapa tem início/término e o processo avança

### Aba 7 — Histórico (#tabHistorico)
**Grid**: Data | Título | Etapa | Observação | Usuário
**Botão**: Incluir Histórico
**Modal**: Observação (textarea) + botões OK/Fechar

### Aba 8 — Documentação (#tabDocs)
> 3 sub-seções de documentos (Comprador, Vendedor, Imóvel) + documentos gerais
**Grid (por sub-seção)**: Ordem | Documento | Arquivo | Data Upload | Validade | Usuário
**Grid (Imóvel/Geral)**: Ordem | Documento | Arquivo | Data Upload | Usuário | Arquivo Ass
**Funcionalidades**:
- Selecionar Fluxo (dropdown) para carregar lista de documentos necessários
- Upload de arquivo por documento (FileUpload)
- Data de Validade (text) por documento
- Motivo de Recusa (textarea) — pode recusar documento
- Botões: Fechar, OK por sub-seção

### Aba 9 — Vínculo (#tabVinculo)
| Campo | Tipo |
|-------|------|
| Construtora | select |
| Corretor | select |
| Parceiro | select |
| Imobiliária | select |

### Aba 10 — Tarefas (#tabTarefa)
**Grid**: Nº | Solicitante | Tarefa | Data | Executante
**Botão**: Nova Tarefa
**Modal Tarefa existente**: Descrição (textarea, readonly), Situação (select), Acompanhamento (textarea) + Salvar
**Modal Nova Tarefa**: Usuário (select executante), Solicitação (textarea) + Salvar

### Aba 11 — Atendimento (#tabAtendimento)
**Botão**: Novo Atendimento
**Modal**: Descrição (textarea) + Salvar
> Registra atendimentos/interações relacionadas ao processo

---

## SEGURANÇA

### Usuário (Usuario.aspx)
**Filtros**: Nome (text), Perfil (select: Administrador/Atendente/Construtora/Corretor/Engenheiro/Gerente/Imobiliária/Parceiro), Situação (select: Ativo/Bloqueado/Inativo), Subestabelecido (select)
**Grid**: Nome | Login | Situação | Perfil

**UsuarioManter** (UsuarioManter.aspx?id=X&tp=Y):
| Campo | Tipo | Observações |
|-------|------|------------|
| Nome | text | |
| CPF | text | |
| PIS | text | |
| Perfil | select | Administrador, Atendente, Construtora, Corretor, Engenheiro, Gerente, Imobiliária, Parceiro |
| Subestabelecido | select | Lista de subestabelecidos |
| Situação | select | Ativo, Bloqueado, Inativo |
| Período de bloqueio - Data Início | text (date) | |
| Período de bloqueio - Data Fim | text (date) | |
| Login | text | |
**Botões**: Salvar | Cancelar

### Advertência (Advertencia.aspx)
**Filtros**: Nome (text), Usuário (select: 18 funcionários), Situação (select: Pendente/Aceita/Contestada)
**Grid**: Situação | Usuário | Data | Processo | Descrição

**AdvertenciaManter** (AdvertenciaManter.aspx?id=X&tp=Y):
| Campo | Tipo | Observações |
|-------|------|------------|
| Usuário | select | Lista de 18 funcionários |
| Nº Processo | text | |
| Processo | text | Referência ao processo |
| Descrição | textarea | Descrição da advertência |
**Botões**: Salvar | Cancelar

### Aviso (Aviso.aspx)
**Filtros**: Nome (text)
**Grid**: Início | Fim | Descrição

**AvisoManter** (AvisoManter.aspx?id=X&tp=Y):
| Campo | Tipo | Observações |
|-------|------|------------|
| Data Início | text (date) | |
| Data Fim | text (date) | |
| Descrição | textarea | |
| Perfil | select | Administrador, Atendente, Construtora, Corretor, Parceiro, Imobiliária, Gerente, Engenheiro |
**Botões**: Salvar | Cancelar
> Avisos são exibidos por perfil — cada perfil vê seus avisos

### Tarefa (Tarefa.aspx)
> Não tem TarefaManter separado — tarefas são criadas dentro do ProcessoManter (aba Tarefas)
> Esta página é para CONSULTA e ALTERAÇÃO EM MASSA de tarefas

**Filtros**:
| Campo | Tipo |
|-------|------|
| Nº da Tarefa | text |
| Data Início | text (date) |
| Data Fim | text (date) |
| Situação | select: Pendente/Resolvida/Encerrada |
| Parceiro | select (53 opções) |
| Solicitante | select (18 usuários) |
| Executante | select (18 usuários) |

**Grid**: Nº | Data | Situação | Nº Processo | Comprador | Solicitante | Executante | Solicitação | Limite

**Seção "Alterar" (inline)**: Para alteração em massa das tarefas selecionadas
| Campo | Tipo |
|-------|------|
| Situação | select |
| Solicitante | select |
| Executante | select |
| Acompanhamento | textarea |

---

## RELATÓRIOS

### Relatório: Processos por Etapa (Reports/ConsRelProcessoEtapa.aspx)
**Filtros**:
| Campo | Tipo | Observações |
|-------|------|------------|
| Banco | select | Banco do Brasil, Bradesco, FINTECH, Itaú |
| Agência | select | Carrega dinamicamente por banco |
| Situação | select | EXTERNO, FINANCEIRO, Gerencia(Fase3), OPERACIONAL, SetorCrédito(Fase1), SetorFormalização(Fase2) |
| Etapa | select | Carrega dinamicamente por situação |
| Parceiro | select | 53 opções |
| Usuário | select | 8 funcionários internos |
| Construtora | select | 8 construtoras |
| Corretor | select | 103 corretores |
| Imobiliária | select | 25 imobiliárias |
| Data Início | text (date) | |
| Data Fim | text (date) | |
| Status | radio | Ativo / Pausado / Concluído |
**Botões**: Pesquisar

### Relatório: Produção (Reports/ConsRelProducao.aspx)
**Filtros**:
| Campo | Tipo |
|-------|------|
| Data Início | text (date) |
| Data Fim | text (date) |
| Data Assinatura Início | text (date) |
| Data Assinatura Fim | text (date) |
| Data Pag. Vendedor Início | text (date) |
| Data Pag. Vendedor Fim | text (date) |
| Banco | select (4 bancos) |
| Agência | select (dinâmico) |
**Botões**: Pesquisar | Gerar

### Relatório: Parceiro (Reports/ConsRelParceiro.aspx)
**Filtros**:
| Campo | Tipo |
|-------|------|
| Banco | select (4 bancos) |
| Parceiro | select (53 opções) |
| Data Assinatura Início | text (date) |
| Data Assinatura Fim | text (date) |
| Data Início | text (date) |
| Data Fim | text (date) |
| Data Pag. Vendedor Início | text (date) |
| Data Pag. Vendedor Fim | text (date) |
| Nº Processo | text |
**Botões**: Pesquisar | Gerar

### Relatório: Tarefas (Reports/ConsRelTarefa.aspx)
**Filtros**:
| Campo | Tipo |
|-------|------|
| Data Início | text (date) |
| Data Fim | text (date) |
| Situação | select: Pendente/Resolvida/Encerrada |
| Parceiro | select (53 opções) |
| Solicitante | select (18 usuários) |
| Executante | select (18 usuários) |
**Botões**: Pesquisar | Gerar

### Relatório Financeiro: Contas a Pagar (Financeiro/Reports/ConsRelContasPagar.aspx)
**Filtros**:
| Campo | Tipo |
|-------|------|
| Tipo Despesa | select (24 opções) |
| Fornecedor | select (38 opções) |
| Conta | select (8 contas bancárias) |
| Forma Pagamento | select |
| Data Vencimento Início | text (date) |
| Data Vencimento Fim | text (date) |
| Data Pagamento Início | text (date) |
| Data Pagamento Fim | text (date) |
| Status | radio: Pendente / Pago / Todos |
**Botões**: Pesquisar

### Relatório Financeiro: Contas a Receber (Financeiro/Reports/ConsRelContasReceber.aspx)
**Filtros**:
| Campo | Tipo |
|-------|------|
| Tipo Receita | select: Comissão, Intermediação, Outros |
| Devedor | select: BBTS, Bradesco, Cashme, Creditas, Habitabem, Outros PF, Oxy, Trinus |
| Conta | select (8 contas bancárias) |
| Forma Recebimento | select |
| Data Vencimento Início | text (date) |
| Data Vencimento Fim | text (date) |
| Data Recebimento Início | text (date) |
| Data Recebimento Fim | text (date) |
| Status | radio: Pendente / Recebido / Todos |
**Botões**: Pesquisar

### Relatório Financeiro: Fluxo de Caixa (Financeiro/Reports/ConsRelFluxoCaixa.aspx)
**Filtros**:
| Campo | Tipo |
|-------|------|
| Data Início | text (date) |
| Data Fim | text (date) |
| Conta | select (8 contas bancárias) |
| Empresa | select: Amarante Construções, Amarante Serviços, Pessoal |
| Natureza | select (11 opções) |
| Valor | text |
| Tipo | radio: Crédito / Débito / Todos |
**Botões**: Pesquisar

---

## MEUS ARQUIVOS (MeusArquivos.aspx)
**Filtros**: Nome (text)
**Grid**: Data Upload | Tipo | Data | Tamanho
**Upload**: FileUpload (input type=file)
> Área pessoal de upload/download de documentos do usuário

---

## RESUMO GERAL DO SISTEMA ANTIGO

### Módulos Principais:
1. **Home** — Dashboard com simuladores, portais, pré-análise, tarefas, processos, ponto
2. **Cadastros** — Comprador, Vendedor (com 5 abas cada: Geral/Endereço/Complemento/Renda/Documentos), Construtora, Empreendimento, Banco, Agência, Imóvel, Imobiliária, Corretor, Parceiro, Subestabelecido, Modalidade
3. **Configurações** — Situação, Etapa, Fluxo, Documentos (tipos)
4. **Processo** — Core do sistema (lista + formulário com 11 abas: Dados Gerais, Valores, Comprador, Vendedor, Imóvel, Etapas, Histórico, Documentação, Vínculo, Tarefas, Atendimento)
5. **Financeiro** — Cadastros (TipoDespesa, TipoReceita, Devedor, Fornecedor, Natureza, Conta, Empresa) + Operações (Contas a Pagar, Contas a Receber, Fluxo de Caixa)
6. **Segurança** — Usuário (com perfis), Advertência, Aviso (por perfil), Tarefa (consulta/alteração em massa)
7. **Relatórios** — 7 relatórios: Processos por Etapa, Produção, Parceiro, Tarefas, Contas a Pagar, Contas a Receber, Fluxo de Caixa
8. **Meus Arquivos** — Upload/download pessoal de documentos

### Entidades e Relacionamentos:
- **Processo** é o centro — liga Comprador(es), Vendedor(es), Imóvel(eis), Banco, Agência, Modalidade, Fluxo, Etapas, Construtora, Corretor, Parceiro, Imobiliária
- **Etapa** pertence a uma **Situação**, que pertence a um **Fluxo**
- **Corretor** pode pertencer a uma **Imobiliária** e/ou **Parceiro**
- **Imobiliária** pode ter um **Parceiro**
- **Agência** pertence a um **Banco**
- **Empreendimento** pertence a uma **Construtora**
- **Financeiro**: ContasPagar → TipoDespesa + Fornecedor + Conta + Empresa; ContasReceber → TipoReceita + Devedor + Conta + Empresa
- **Natureza** (Pagamento/Recebimento) agrupa TipoDespesa e TipoReceita

### Perfis de Acesso:
Administrador, Atendente, Construtora, Corretor, Engenheiro, Gerente, Imobiliária, Parceiro
