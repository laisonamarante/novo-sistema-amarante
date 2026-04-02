# GAPS - Sistema Antigo vs Sistema Novo
> Gerado em: 2026-03-25
> Objetivo: Tudo que o sistema antigo tem e o novo precisa ter igual ou melhor

---

## JA IMPLEMENTADO NO NOVO (paridade OK)

### Estrutura Geral
- [x] Login com usuario/senha
- [x] Layout com sidebar + header
- [x] Pesquisa global no header
- [x] Bater Ponto no header
- [x] Dashboard Home com simuladores, portais, pre-analise, tarefas

### Cadastros
- [x] Comprador (lista + formulario com abas)
- [x] Vendedor (lista + formulario com abas)
- [x] Rotas para novo/editar cliente

### Financiamento
- [x] Processo (lista + formulario)
- [x] Pre-Analise (pagina existe)

### Financeiro
- [x] Contas a Pagar
- [x] Contas a Receber
- [x] Fluxo de Caixa

### Seguranca
- [x] Usuarios
- [x] Advertencias
- [x] Avisos
- [x] Tarefas
- [x] Permissoes (NOVO - nao existe no antigo!)

### Relatorios
- [x] Relatorio de Processos
- [x] Relatorio de Producao
- [x] Relatorio de Parceiro
- [x] Relatorio Financeiro
- [x] Relatorio de Tarefas (import no App.tsx mas SEM rota definida)

### Arquivos
- [x] Meus Arquivos

### Configuracoes
- [x] Pagina de Configuracoes (Situacao, Etapa, Fluxo, Modalidade, Documentos)
- [x] Configurar Fluxo (vincular etapas)

### Backend/Banco
- [x] Schema completo com todas as tabelas do antigo + extras
- [x] Routers tRPC para todas as entidades principais

---

## GAPS - FALTA NO SISTEMA NOVO

### 1. CADASTROS FALTANTES (paginas dedicadas)
O antigo tem paginas separadas de CRUD para cada entidade. O novo so tem Comprador/Vendedor como paginas dedicadas.

| Cadastro | Antigo | Novo | Status |
|----------|--------|------|--------|
| Construtora | Pagina dedicada (CRUD + endereco completo) | Dentro de Configuracoes? | VERIFICAR |
| Empreendimento | Pagina dedicada (CRUD) | Dentro de Configuracoes? | VERIFICAR |
| Banco | Pagina dedicada (CRUD) | Dentro de cadastros router | OK |
| Agencia | Pagina dedicada (CRUD) | Dentro de cadastros router | OK |
| Imovel | Pagina dedicada (CRUD com matricula, tipo, endereco) | SEM pagina dedicada | FALTA |
| Imobiliaria | Pagina dedicada (CRUD + endereco + parceiro + usuario) | SEM pagina dedicada | FALTA |
| Corretor | Pagina dedicada (CRUD + CRECI + imobiliaria + parceiro) | SEM pagina dedicada | FALTA |
| Parceiro | Pagina dedicada (CRUD completo com PIX, contrato, etc) | SEM pagina dedicada | FALTA |
| Subestabelecido | Pagina dedicada (CRUD) | SEM pagina dedicada | FALTA |
| Modalidade | Pagina dedicada (CRUD + vinculo fluxo) | Dentro de Configuracoes | OK |

### 2. PROCESSO (ProcessoManter) - CORACAO DO SISTEMA
O antigo tem 11 abas completas. Precisa verificar quais abas o novo implementa de verdade:

| Aba | Antigo | Novo |
|-----|--------|------|
| Dados Gerais | Completo (banco, agencia, modalidade, fluxo, encaminhamento, responsavel, datas, proposta, contrato, observacao, pausado) + Alterar Enquadramento + Registrar Pendencia | VERIFICAR profundidade |
| Valores | 15 campos financeiros (compra/venda, avaliacao, FGTS, subsidio, financiado, parcela, taxa, amortizacao SAC/PRICE, etc) | VERIFICAR |
| Comprador | Grid + modal incluir (busca cadastrado ou manual) | VERIFICAR |
| Vendedor | Grid + modal incluir | VERIFICAR |
| Imovel | Grid + modal incluir | VERIFICAR |
| Etapas | Grid com inicio/termino/dias + observacao + concluir etapa + responsavel | VERIFICAR - parte mais critica |
| Historico | Grid + incluir registro | VERIFICAR |
| Documentacao | 3 secoes (Comprador/Vendedor/Imovel) + upload + validade + recusa | VERIFICAR |
| Vinculo | Construtora, Corretor, Parceiro, Imobiliaria | VERIFICAR |
| Tarefas | Grid + nova tarefa + resolver | VERIFICAR |
| Atendimento | Grid + novo atendimento | VERIFICAR |

### 3. PRE-ANALISE
| Funcionalidade | Antigo | Novo |
|---------------|--------|------|
| Lista com filtros (situacao, banco) | Sim | VERIFICAR |
| Modal nova pre-analise (bancos checkbox, dados pessoais) | Sim | PreAnaliseImpl.tsx e placeholder |
| Editar situacao + observacao + permitir reenvio | Sim | VERIFICAR |

### 4. RELATORIOS - FILTROS E EXPORTACAO
O antigo tem filtros detalhados e botao Gerar (provavelmente PDF/Excel):

| Relatorio | Filtros no Antigo | Novo |
|-----------|------------------|------|
| Processos por Etapa | Banco, Agencia, Situacao, Etapa, Parceiro, Usuario, Construtora, Corretor, Imobiliaria, Datas, Status (Ativo/Pausado/Concluido) | VERIFICAR filtros |
| Producao | Datas (inicio, assinatura, pagto vendedor), Banco, Agencia | VERIFICAR |
| Parceiro | Banco, Parceiro, Datas (assinatura, inicio, pagto vendedor), N Processo | VERIFICAR |
| Tarefas | Datas, Situacao, Parceiro, Solicitante, Executante | VERIFICAR - rota nem existe no App.tsx |
| Contas a Pagar | Tipo Despesa, Fornecedor, Conta, Forma Pagamento, Datas, Status | VERIFICAR |
| Contas a Receber | Tipo Receita, Devedor, Conta, Forma Recebimento, Datas, Status | VERIFICAR |
| Fluxo de Caixa | Datas, Conta, Empresa, Natureza, Valor, Tipo (Credito/Debito) | VERIFICAR |

### 5. FINANCEIRO - CADASTROS AUXILIARES
O antigo tem 7 cadastros auxiliares dentro do financeiro:

| Cadastro | Antigo | Novo |
|----------|--------|------|
| Tipo Despesa | Pagina dedicada (24 tipos) | Tem na tabela mas tem tela? |
| Tipo Receita | Pagina dedicada | ? |
| Devedor | Pagina dedicada | ? |
| Fornecedor | Pagina dedicada | ? |
| Natureza | Pagina dedicada (11 naturezas) | ? |
| Conta Bancaria | Pagina dedicada (8 contas) | ? |
| Empresa | Pagina dedicada (3 empresas) | ? |

### 6. SEGURANCA - FUNCIONALIDADES ESPECIFICAS

| Feature | Antigo | Novo |
|---------|--------|------|
| Usuario - filtros (Nome, Perfil, Situacao, Subestabelecido) | Sim | VERIFICAR |
| Usuario - campos (PIS, bloqueio periodo, subestabelecido) | Sim | VERIFICAR |
| Advertencia - filtros + contestar/aceitar fluxo | Sim | VERIFICAR |
| Aviso - por perfil (cada perfil ve seus avisos) | Sim | VERIFICAR |
| Tarefa - pagina de consulta/alteracao em MASSA | Sim | VERIFICAR |
| Perfis: Admin, Atendente, Construtora, Corretor, Engenheiro, Gerente, Imobiliaria, Parceiro | Sim | Novo tem: Admin, Atendente, Gerente, Corretor, Imobiliaria, Parceiro, Construtora, Engenheiro, Analista, Financeiro |

### 7. HOME - SECOES FALTANTES

| Secao | Antigo | Novo |
|-------|--------|------|
| Simuladores (BB, Bradesco, Itau + Caixa, Santander) | 5 bancos | Novo tem 3 (BB, Bradesco, Itau) - FALTAM Caixa e Santander |
| Portais (Caixa CA/SR/LDLP, Itau, Bradesco, BB) | Sim | VERIFICAR se mesmos links |
| Analise COBAN | Secao no antigo | VERIFICAR se existe no novo |
| Meus Processos | Grid na home | VERIFICAR |
| Tarefas Criadas | Grid separado | VERIFICAR (novo mostra so Recebidas?) |

### 8. FUNCIONALIDADES TRANSVERSAIS

| Feature | Antigo | Novo |
|---------|--------|------|
| Pesquisa global por Nome/CPF | No header | Existe |
| Bater Ponto (modal com tipo + observacao) | Sim | Existe |
| Manter conectado (checkbox no login) | Sim | Nao tem |
| Paginacao nas listas | Sim | VERIFICAR |
| Excluir registros (soft delete) | Sim | VERIFICAR |
| Export relatorios (PDF/Excel) | Botao Gerar | Novo tem exportCSV.ts - so CSV? |

---

## PRIORIDADES CRITICAS (fazer primeiro)

1. **Cadastros dedicados faltantes**: Imovel, Imobiliaria, Corretor, Parceiro, Subestabelecido, Construtora, Empreendimento - precisam de paginas CRUD completas
2. **ProcessoForm - verificar 11 abas**: Garantir que TODAS as abas estao funcionando igual ao antigo
3. **Pre-Analise**: Tirar do placeholder e implementar completo
4. **Relatorio de Tarefas**: Adicionar rota no App.tsx
5. **Cadastros financeiros**: Verificar se Tipo Despesa, Tipo Receita, Devedor, Fornecedor, Natureza, Conta, Empresa tem CRUD funcional
6. **Relatorios**: Verificar se todos os filtros do antigo existem no novo + exportacao

---

## MELHORIAS DO NOVO (ja tem e antigo nao)
- Permissoes (controle granular de acesso)
- Perfis extras: Analista, Financeiro
- UI moderna (React + Tailwind vs ASP.NET WebForms)
- API REST/tRPC (vs PostBack)
- Responsivo
