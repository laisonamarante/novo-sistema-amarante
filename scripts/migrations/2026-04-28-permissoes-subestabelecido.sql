-- Migration: 2026-04-28 — Permissões iniciais do perfil Subestabelecido
--
-- Contexto:
-- O enum `usuarios.perfil` tem 8 perfis, mas `permissoes_perfil` só tinha 7
-- (Administrador, Analista, Construtora, Corretor, Gerente, Imobiliária, Parceiro).
-- Subestabelecido estava ausente — qualquer usuário com esse perfil ia bater
-- default-deny no hook `usePermissoes()` e não acessar nada.
--
-- Estratégia:
-- Subestabelecido é subordinado ao Parceiro na hierarquia comercial
-- (parceiros → subestabelecidos), então copiamos as 86 permissões do Parceiro
-- como ponto de partida. Ajustes finos podem ser feitos no painel
-- /seguranca/permissoes.
--
-- Idempotente: ON DUPLICATE KEY UPDATE no unique key (perfil, recurso).

INSERT INTO permissoes_perfil (perfil, recurso, permitido)
SELECT 'Subestabelecido', recurso, permitido
FROM permissoes_perfil
WHERE perfil = 'Parceiro'
ON DUPLICATE KEY UPDATE permitido = VALUES(permitido);

-- Verificação esperada após rodar:
--   SELECT perfil, COUNT(*) FROM permissoes_perfil GROUP BY perfil;
-- Resultado: Subestabelecido | 86
