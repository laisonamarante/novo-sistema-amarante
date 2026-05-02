-- Migration: 2026-05-02 — Tornar `easy_id` UNIQUE em vez de INDEX
--
-- Contexto:
-- Pra suportar UPSERT (`INSERT ... ON DUPLICATE KEY UPDATE`) no script de
-- re-migração quando chegar um backup atualizado do Easy, `easy_id` precisa
-- ser UNIQUE KEY em todas as tabelas migradas.
--
-- NULL é permitido em UNIQUE — registros que não vieram do Easy (admin laison,
-- simuladores, etc) ficam com easy_id=NULL e isso é OK.
--
-- Idempotente: SP verifica se já existe o UNIQUE antes de adicionar.

DROP PROCEDURE IF EXISTS unique_easy_id_if_missing;
DELIMITER $$
CREATE PROCEDURE unique_easy_id_if_missing(IN tabela VARCHAR(64))
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = tabela
      AND COLUMN_NAME = 'easy_id'
      AND NON_UNIQUE = 0
  ) THEN
    SET @drop_idx = CONCAT('ALTER TABLE `', tabela, '` DROP INDEX idx_', tabela, '_easy_id');
    SET @add_uniq = CONCAT('ALTER TABLE `', tabela, '` ADD UNIQUE KEY uq_', tabela, '_easy_id (easy_id)');
    PREPARE stmt FROM @drop_idx;
    BEGIN
      DECLARE EXIT HANDLER FOR SQLEXCEPTION BEGIN END;
      EXECUTE stmt;
    END;
    DEALLOCATE PREPARE stmt;
    PREPARE stmt FROM @add_uniq;
    EXECUTE stmt;
    DEALLOCATE PREPARE stmt;
  END IF;
END$$
DELIMITER ;

CALL unique_easy_id_if_missing('usuarios');
CALL unique_easy_id_if_missing('parceiros');
CALL unique_easy_id_if_missing('subestabelecidos');
CALL unique_easy_id_if_missing('imobiliarias');
CALL unique_easy_id_if_missing('corretores');
CALL unique_easy_id_if_missing('construtoras');
CALL unique_easy_id_if_missing('clientes');
CALL unique_easy_id_if_missing('imoveis');
CALL unique_easy_id_if_missing('bancos');
CALL unique_easy_id_if_missing('agencias');
CALL unique_easy_id_if_missing('modalidades');
CALL unique_easy_id_if_missing('fluxos');
CALL unique_easy_id_if_missing('etapas');
CALL unique_easy_id_if_missing('situacoes');
CALL unique_easy_id_if_missing('documentos_tipos');
CALL unique_easy_id_if_missing('processos');
CALL unique_easy_id_if_missing('pre_analises');
CALL unique_easy_id_if_missing('tarefas');
CALL unique_easy_id_if_missing('advertencias');
CALL unique_easy_id_if_missing('avisos');

DROP PROCEDURE unique_easy_id_if_missing;
