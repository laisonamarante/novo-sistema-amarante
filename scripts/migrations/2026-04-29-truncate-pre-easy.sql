-- Migration: 2026-04-29 — TRUNCATE limpo pré-migração Easy
--
-- Contexto:
-- Antes de migrar 600k linhas do Easy, limpar dados de teste do novo amarante.
-- Laison confirmou que tudo no novo é teste e pode ser apagado.
--
-- MANTER (NÃO truncar):
--   - usuarios.id=2 (admin laison) — outros usuarios serão recriados via Easy
--   - permissoes_perfil (recursos do sistema, não vem do Easy)
--   - auditoria (esquema, fica vazia)
--   - simuladores (links de bancos pra simulação — não vem do Easy)
--
-- Backup feito antes:
--   ~/backups/novo_sistema_amarante/backup_2026-04-29_pre_migracao_easy.sql

SET FOREIGN_KEY_CHECKS = 0;

-- Tabelas relacionadas a processos (timeline e relacionamentos)
TRUNCATE TABLE processo_historico;
TRUNCATE TABLE processo_atendimentos;
TRUNCATE TABLE processo_documentos;
TRUNCATE TABLE processo_etapas;
TRUNCATE TABLE processo_compradores;
TRUNCATE TABLE processo_vendedores;
TRUNCATE TABLE processo_imoveis;
TRUNCATE TABLE arquivos;
TRUNCATE TABLE advertencias;
TRUNCATE TABLE avisos;
TRUNCATE TABLE tarefas;
TRUNCATE TABLE pre_analises;
TRUNCATE TABLE processos;

-- Cadastros e configs
TRUNCATE TABLE clientes;
TRUNCATE TABLE imoveis;
TRUNCATE TABLE empreendimentos;

-- Junções
TRUNCATE TABLE fluxo_etapas;
TRUNCATE TABLE fluxo_documentos;
TRUNCATE TABLE parceiro_bancos;
TRUNCATE TABLE subestabelecido_bancos;
TRUNCATE TABLE banco_modalidades;

-- Cadastros base
TRUNCATE TABLE corretores;
TRUNCATE TABLE imobiliarias;
TRUNCATE TABLE construtoras;
TRUNCATE TABLE subestabelecidos;
TRUNCATE TABLE parceiros;
TRUNCATE TABLE agencias;
TRUNCATE TABLE bancos;

-- Configs de processo
TRUNCATE TABLE modalidades;
TRUNCATE TABLE fluxos;
TRUNCATE TABLE situacoes;
TRUNCATE TABLE etapas;
TRUNCATE TABLE documentos_tipos;

-- Financeiro (pausado mas tabelas existem)
TRUNCATE TABLE contas_pagar;
TRUNCATE TABLE contas_receber;
TRUNCATE TABLE fluxo_caixa;
TRUNCATE TABLE fin_empresas;
TRUNCATE TABLE fin_contas;
TRUNCATE TABLE fin_fornecedores;
TRUNCATE TABLE fin_devedores;
TRUNCATE TABLE fin_tipo_despesas;
TRUNCATE TABLE fin_tipo_receitas;
TRUNCATE TABLE fin_naturezas;

-- Outros
TRUNCATE TABLE pontos;
TRUNCATE TABLE permissoes;        -- granulares por usuario (mantém permissoes_perfil)
TRUNCATE TABLE chat_conversas;
TRUNCATE TABLE chat_mensagens;

-- Usuários: deletar TODOS exceto laison (id=2 baseado no seed)
DELETE FROM usuarios WHERE login != 'laison';

-- Reset auto-increment pra começar limpo
ALTER TABLE processos AUTO_INCREMENT = 1;
ALTER TABLE clientes AUTO_INCREMENT = 1;
ALTER TABLE imoveis AUTO_INCREMENT = 1;
ALTER TABLE parceiros AUTO_INCREMENT = 1;
ALTER TABLE corretores AUTO_INCREMENT = 1;
ALTER TABLE imobiliarias AUTO_INCREMENT = 1;
ALTER TABLE construtoras AUTO_INCREMENT = 1;
ALTER TABLE subestabelecidos AUTO_INCREMENT = 1;
ALTER TABLE bancos AUTO_INCREMENT = 1;
ALTER TABLE agencias AUTO_INCREMENT = 1;
ALTER TABLE modalidades AUTO_INCREMENT = 1;
ALTER TABLE fluxos AUTO_INCREMENT = 1;
ALTER TABLE etapas AUTO_INCREMENT = 1;
ALTER TABLE situacoes AUTO_INCREMENT = 1;
ALTER TABLE documentos_tipos AUTO_INCREMENT = 1;
ALTER TABLE pre_analises AUTO_INCREMENT = 1;
ALTER TABLE tarefas AUTO_INCREMENT = 1;
ALTER TABLE arquivos AUTO_INCREMENT = 1;
ALTER TABLE advertencias AUTO_INCREMENT = 1;
ALTER TABLE avisos AUTO_INCREMENT = 1;

SET FOREIGN_KEY_CHECKS = 1;

-- Verificacao:
--   SELECT 'processos' t, COUNT(*) c FROM processos UNION
--   SELECT 'usuarios',COUNT(*) FROM usuarios UNION
--   SELECT 'clientes',COUNT(*) FROM clientes UNION
--   SELECT 'parceiros',COUNT(*) FROM parceiros UNION
--   SELECT 'permissoes_perfil',COUNT(*) FROM permissoes_perfil UNION
--   SELECT 'simuladores',COUNT(*) FROM simuladores;
-- Esperado: usuarios=1, permissoes_perfil>0, simuladores>0, resto=0
