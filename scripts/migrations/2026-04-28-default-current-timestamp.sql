-- Migration: 2026-04-28 — Trocar default literal por CURRENT_TIMESTAMP
--
-- Contexto:
-- O schema Drizzle usava `default(new Date())` em 22 colunas datetime.
-- Como Drizzle gera default LITERAL (não CURRENT_TIMESTAMP) em MariaDB,
-- todas as colunas tinham `DEFAULT '2026-03-19 19:28:28'` (timestamp da
-- migration original) congelado no DDL.
--
-- O bug era LATENTE — código compensava passando `criadoEm: new Date()`
-- explícito em todos os inserts. Mas qualquer dev futuro que esquecesse
-- ia pegar Mar/2026 nos novos registros.
--
-- 3 colunas (chat_conversas.criado_em/atualizado_em e chat_mensagens.criado_em)
-- já tinham sido corrigidas manualmente no DDL — são puladas aqui (não há
-- harm em re-aplicar, mas pra economizar locks pulamos).
--
-- Schema Drizzle atualizado pra `default(sql\`CURRENT_TIMESTAMP\`)` no mesmo commit.

-- ============================================================
-- 16 tabelas com `criado_em` apenas
-- ============================================================
ALTER TABLE usuarios              MODIFY criado_em     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE imoveis               MODIFY criado_em     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE processo_historico    MODIFY criado_em     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE processo_documentos   MODIFY criado_em     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE processo_atendimentos MODIFY criado_em     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE tarefas               MODIFY criado_em     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE avisos                MODIFY criado_em     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE advertencias          MODIFY criado_em     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE contas_pagar          MODIFY criado_em     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE contas_receber        MODIFY criado_em     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE fluxo_caixa           MODIFY criado_em     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE pontos                MODIFY criado_em     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE arquivos              MODIFY criado_em     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- ============================================================
-- 3 tabelas com `criado_em` + `atualizado_em` (ON UPDATE)
-- ============================================================
ALTER TABLE clientes
  MODIFY criado_em      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  MODIFY atualizado_em  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP;

ALTER TABLE processos
  MODIFY criado_em      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  MODIFY atualizado_em  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP;

ALTER TABLE pre_analises
  MODIFY criado_em      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  MODIFY atualizado_em  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP;

-- chat_conversas e chat_mensagens já estão corretas (foram alteradas
-- manualmente em algum momento). Schema Drizzle agora também reflete isso.

-- Verificação esperada:
--   SELECT TABLE_NAME, COLUMN_NAME, COLUMN_DEFAULT
--   FROM information_schema.columns
--   WHERE TABLE_SCHEMA='novo_sistema_amarante'
--     AND COLUMN_NAME IN ('criado_em','atualizado_em');
-- Todas devem mostrar `current_timestamp()` em COLUMN_DEFAULT.
