-- Migration: 2026-04-28 — Tabela `auditoria` para log de mutations
--
-- Contexto:
-- Bloco B do plano de execucao. Todas as mutations protegidas com
-- requirePerm() vao ser logadas automaticamente nesta tabela.
--
-- Captura: usuario, recurso, path da procedure, input JSON, IP, timestamp.
-- usuario_nome e perfil sao denormalizados pra preservar historico mesmo
-- se o usuario for excluido depois.

CREATE TABLE IF NOT EXISTS auditoria (
  id              INT PRIMARY KEY AUTO_INCREMENT,
  usuario_id      INT NOT NULL,
  usuario_nome    VARCHAR(100),
  perfil          VARCHAR(50),
  recurso         VARCHAR(100) NOT NULL,
  procedure_path  VARCHAR(200) NOT NULL,
  input_json      TEXT,
  ip              VARCHAR(45),
  criado_em       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_audit_usuario (usuario_id, criado_em),
  KEY idx_audit_recurso (recurso, criado_em),
  KEY idx_audit_criado_em (criado_em)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Verificacao:
--   DESCRIBE auditoria;
--   SHOW INDEX FROM auditoria;
