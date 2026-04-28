-- Migration: 2026-04-28 — Recursos novos em permissoes_perfil
--
-- Contexto:
-- Bloco A do plano de execucao da segunda metade da sessao 28/04. Para
-- aplicar `requirePerm()` nas mutations de bancos/modalidades/fluxos/
-- situacoes/etapas/documentos/usuarios, precisamos de recursos correspondentes
-- em `permissoes_perfil` (default-deny no middleware do backend).
--
-- Estrategia: copiar permissoes do recurso `cadastro:agencia:*` (template
-- existente) para cada nova entidade, preservando defaults por perfil.
-- Idempotente via ON DUPLICATE KEY UPDATE.

-- 1. Banco
INSERT INTO permissoes_perfil (perfil, recurso, permitido)
SELECT perfil, REPLACE(recurso, 'agencia', 'banco'), permitido
FROM permissoes_perfil WHERE recurso LIKE 'cadastro:agencia:%'
ON DUPLICATE KEY UPDATE permitido = VALUES(permitido);

-- 2. Modalidade
INSERT INTO permissoes_perfil (perfil, recurso, permitido)
SELECT perfil, REPLACE(recurso, 'agencia', 'modalidade'), permitido
FROM permissoes_perfil WHERE recurso LIKE 'cadastro:agencia:%'
ON DUPLICATE KEY UPDATE permitido = VALUES(permitido);

-- 3. Fluxo
INSERT INTO permissoes_perfil (perfil, recurso, permitido)
SELECT perfil, REPLACE(recurso, 'agencia', 'fluxo'), permitido
FROM permissoes_perfil WHERE recurso LIKE 'cadastro:agencia:%'
ON DUPLICATE KEY UPDATE permitido = VALUES(permitido);

-- 4. Situacao
INSERT INTO permissoes_perfil (perfil, recurso, permitido)
SELECT perfil, REPLACE(recurso, 'agencia', 'situacao'), permitido
FROM permissoes_perfil WHERE recurso LIKE 'cadastro:agencia:%'
ON DUPLICATE KEY UPDATE permitido = VALUES(permitido);

-- 5. Etapa
INSERT INTO permissoes_perfil (perfil, recurso, permitido)
SELECT perfil, REPLACE(recurso, 'agencia', 'etapa'), permitido
FROM permissoes_perfil WHERE recurso LIKE 'cadastro:agencia:%'
ON DUPLICATE KEY UPDATE permitido = VALUES(permitido);

-- 6. Documento
INSERT INTO permissoes_perfil (perfil, recurso, permitido)
SELECT perfil, REPLACE(recurso, 'agencia', 'documento'), permitido
FROM permissoes_perfil WHERE recurso LIKE 'cadastro:agencia:%'
ON DUPLICATE KEY UPDATE permitido = VALUES(permitido);

-- 7. Usuario:criar e Usuario:editar (sem usuario:excluir — sistema usa soft-delete via editar)
INSERT INTO permissoes_perfil (perfil, recurso, permitido)
SELECT perfil, 'usuario:criar', permitido FROM permissoes_perfil WHERE recurso='cadastro:agencia:criar'
ON DUPLICATE KEY UPDATE permitido = VALUES(permitido);

INSERT INTO permissoes_perfil (perfil, recurso, permitido)
SELECT perfil, 'usuario:editar', permitido FROM permissoes_perfil WHERE recurso='cadastro:agencia:editar'
ON DUPLICATE KEY UPDATE permitido = VALUES(permitido);

-- Verificacao esperada:
--   SELECT recurso, COUNT(*) FROM permissoes_perfil
--   WHERE recurso LIKE 'cadastro:%' OR recurso LIKE 'usuario:%'
--   GROUP BY recurso;
-- Deve listar os recursos novos com 7 linhas cada (1 por perfil).
