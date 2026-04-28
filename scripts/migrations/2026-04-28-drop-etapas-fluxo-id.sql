-- Migration: 2026-04-28 — Remover coluna legacy `etapas.fluxo_id`
--
-- Contexto:
-- O sistema sempre teve duas formas de associar etapa↔fluxo:
--   1) FK direta `etapas.fluxo_id` (1:N — uma etapa pertence a um fluxo)
--   2) Tabela junção `fluxo_etapas` (N:N — etapa reutilizável em múltiplos fluxos)
--
-- Auditoria de 2026-04-28 confirmou que o modelo REAL é o N:N:
--   • 87 vínculos em fluxo_etapas, com 16 etapas reutilizadas em até 10 fluxos
--   • Apenas 1 etapa (id=52, "Etapa Teste", inativa) tinha fluxo_id preenchido
--   • Função `criarEtapasDoFluxo` (processos.ts) e CRUD admin já usam só fluxo_etapas
--
-- A coluna legacy `fluxo_id` causava bug visível:
--   • Endpoint `etapas.listar({fluxoId})` filtrava pela coluna errada
--   • Tela `Configurações → Configurar Fluxo` listava sempre vazio
--   • "Remover etapa do fluxo" chamava `etapas.excluir` (soft-delete da etapa
--     INTEIRA, não desvincular) — risco de perda de etapa reutilizada
--
-- Correções de código foram aplicadas no mesmo commit:
--   • client/src/pages/Configuracoes/ConfigurarFluxo.tsx — refeito pra usar
--     fluxos.listarEtapas / vincularEtapa / desvincularEtapa / subirOrdemEtapa
--   • server/routers/cadastros.ts — etapas.listar/criar/editar sem fluxoId
--   • drizzle/schema.ts — campo fluxoId removido de etapas
--   • server/seed.ts — etapas inseridas sem fluxoId, vínculos via fluxoEtapas
--
-- Idempotência: usa IF EXISTS pra evitar erro se rodada duas vezes.

-- Limpar única referência viva (etapa de teste inativa)
DELETE FROM etapas WHERE id = 52 AND ativo = 0;

-- Drop FK e coluna
ALTER TABLE etapas DROP FOREIGN KEY etapas_fluxo_id_fluxos_id_fk;
ALTER TABLE etapas DROP COLUMN fluxo_id;

-- Verificação esperada após rodar:
--   DESCRIBE etapas;  -- não deve mais conter `fluxo_id`
