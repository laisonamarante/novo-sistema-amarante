-- Migration: 2026-04-29 — Adicionar coluna `easy_id` em 21 tabelas
--
-- Contexto:
-- Migração massiva do Easy Correspondente (sistema antigo SaaS) pro Novo
-- Sistema Amarante. ~600.000 linhas pra trazer (4.838 processos + relacionados).
--
-- A coluna `easy_id INT NULL` em cada tabela vai guardar o ID original do Easy
-- (oid_processo, oid_parceiro, etc). Permite:
--   1. Idempotência: re-rodar a migração não duplica (UPSERT por easy_id)
--   2. Rastreabilidade: saber de onde veio cada registro
--   3. Mapeamento N:N: resolver FKs entre tabelas migradas
--
-- Adiciona índice (não-único, pode ser NULL pra registros novos do sistema).
-- Idempotente via DROP IF EXISTS antes (mas usa SP pra evitar erro se já existe).

-- Helper SP: adiciona coluna se não existir
DROP PROCEDURE IF EXISTS add_easy_id_if_missing;
DELIMITER $$
CREATE PROCEDURE add_easy_id_if_missing(IN tabela VARCHAR(64))
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = tabela AND COLUMN_NAME = 'easy_id'
  ) THEN
    SET @sql = CONCAT('ALTER TABLE `', tabela, '` ADD COLUMN easy_id INT NULL, ADD INDEX idx_', tabela, '_easy_id (easy_id)');
    PREPARE stmt FROM @sql;
    EXECUTE stmt;
    DEALLOCATE PREPARE stmt;
  END IF;
END$$
DELIMITER ;

-- Aplicar em todas as tabelas relevantes
CALL add_easy_id_if_missing('usuarios');
CALL add_easy_id_if_missing('parceiros');
CALL add_easy_id_if_missing('subestabelecidos');
CALL add_easy_id_if_missing('imobiliarias');
CALL add_easy_id_if_missing('corretores');
CALL add_easy_id_if_missing('construtoras');
CALL add_easy_id_if_missing('clientes');
CALL add_easy_id_if_missing('imoveis');
CALL add_easy_id_if_missing('bancos');
CALL add_easy_id_if_missing('agencias');
CALL add_easy_id_if_missing('modalidades');
CALL add_easy_id_if_missing('fluxos');
CALL add_easy_id_if_missing('etapas');
CALL add_easy_id_if_missing('situacoes');
CALL add_easy_id_if_missing('documentos_tipos');
CALL add_easy_id_if_missing('processos');
CALL add_easy_id_if_missing('pre_analises');
CALL add_easy_id_if_missing('tarefas');
CALL add_easy_id_if_missing('arquivos');
CALL add_easy_id_if_missing('advertencias');
CALL add_easy_id_if_missing('avisos');

-- Limpar SP
DROP PROCEDURE add_easy_id_if_missing;

-- Verificacao esperada:
--   SELECT TABLE_NAME FROM information_schema.COLUMNS
--   WHERE TABLE_SCHEMA='novo_sistema_amarante' AND COLUMN_NAME='easy_id'
--   ORDER BY TABLE_NAME;
-- Deve listar as 21 tabelas acima.
