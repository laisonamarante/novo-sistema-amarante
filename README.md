# 🏢 Novo Sistema Amarante

Sistema completo de gestão para a Amarante Serviços Financeiros e Imobiliários.

## Stack
- **Frontend:** React 18 + Vite + TailwindCSS + React Query
- **Backend:** Express + tRPC 11 + JWT
- **Banco:** MySQL + Drizzle ORM
- **Tipagem:** TypeScript end-to-end

## Instalação

### 1. Instalar dependências
```bash
pnpm install
# ou
npm install
```

### 2. Configurar banco de dados
```bash
# Criar banco MySQL
mysql -u root -p -e "CREATE DATABASE novo_sistema_amarante CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"

# Copiar variáveis de ambiente
cp .env.example .env
# Editar .env com suas credenciais
```

### 3. Criar as tabelas
```bash
pnpm db:push
# ou
npx drizzle-kit push
```

### 4. Popular dados iniciais
```bash
npx tsx seed.ts
```

### 5. Rodar em desenvolvimento
```bash
pnpm dev
```

### 6. Build para produção
```bash
pnpm build
pnpm start
```

## Módulos

| Módulo | Status |
|--------|--------|
| Login / Autenticação | ✅ |
| Home / Dashboard | ✅ |
| Cadastro Comprador | ✅ |
| Cadastro Vendedor | ✅ |
| Processo de Financiamento | ✅ |
| Pré-Análise | ✅ |
| Contas a Pagar | ✅ |
| Contas a Receber | ✅ |
| Fluxo de Caixa | ✅ |
| Tarefas | ✅ |
| Bater Ponto | ✅ |
| Usuários | ✅ |
| Configurações | 🔧 |
| Relatórios | 🔧 |
| Arquivos | 🔧 |

## Acessos padrão (após seed)
- **Admin:** login `laison` / senha `123456`
- **Porta servidor:** 3001
- **Porta frontend:** 5173
