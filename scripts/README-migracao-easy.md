# Migração Easy Correspondente → Novo Amarante

Documentação do processo de migração do sistema antigo (Easy SaaS) pro novo. **Última atualização: 2026-05-02**.

## Estado atual

✅ Migração inicial concluída em 2026-04-29:
- 408.028 linhas migradas (4.838 processos + 9.600 clientes + 1.845 imóveis + 222.986 arquivos metadata + ~170k auxiliares)
- Backup usado: `db_easy_amarante_2026-04-24_10-33-53.zip` (foto do dia 24/04 10:33)

⚠️ **Backup de 24/04 não tem dados criados/alterados depois dessa data.** Quando o Laison parar de usar o Easy, precisa de um backup atualizado pra re-migrar.

## Procedimento de re-migração (quando chegar backup novo)

### Pré-requisitos (já configurados)

- WSL Ubuntu 24.04 com SQL Server 2022 + libldap-2.5
- Python 3.12 venv em `/opt/easy-migracao/venv` com pymssql + pymysql + tqdm + bcrypt
- Tunnel SSH ativo (porta 13306 → 3306 do servidor GCP)
- Coluna `easy_id` UNIQUE em 21 tabelas do MariaDB
- Script `re_migrar.sh` em `.easy-backup/` (gitignored — local apenas)

### Passos

#### 1) Pedir backup pro suporte do Easy

> "Preciso de um export completo do banco do meu sistema (`amarantecoban`). O último que peguei foi em 24/04, quero o de hoje pra fazer migração final."

Eles enviam um `.zip` com `.bak` dentro (formato MS SQL Server).

#### 2) Salvar o `.zip` em `Downloads`

#### 3) Rodar o script de re-migração

Em PowerShell:

```powershell
wsl -d Ubuntu -u root -- bash /mnt/c/Users/laiso/Desktop/Programacao/projetos/novo-sistema-amarante/.easy-backup/re_migrar.sh /mnt/c/Users/laiso/Downloads/db_easy_amarante_NOVO.zip
```

(substitui `db_easy_amarante_NOVO.zip` pelo nome real do arquivo)

#### 4) O que acontece automaticamente

1. ✅ Backup do MariaDB atual (rollback se algo der errado)
2. ✅ Extrai o `.bak` do zip
3. ✅ Restaura no SQL Server local (substitui o anterior)
4. ✅ TRUNCATE limpo do MariaDB (preservando admin laison + permissões + simuladores + auditoria)
5. ✅ Roda todas as fases A-H (~30 min)
6. ✅ Valida totais e mostra resumo
7. ✅ Reload PM2 do novo-amarante

### Tempo total esperado

~30-40 minutos.

### Em caso de erro

O script faz backup automático do MariaDB ANTES de mexer. Se algo quebrar, restaura com:

```bash
ssh laisonamarante@34.28.158.70 'gunzip < ~/backups/novo_sistema_amarante/backup_TIMESTAMP_pre_remigracao.sql.gz | mysql -u amarante -pAmara2026db novo_sistema_amarante'
```

(o caminho exato do backup é mostrado no fim do script)

## Arquivos físicos (PDFs)

**NÃO migram com o `.bak`** — o Easy guarda os PDFs em storage externo, não no banco. Pra trazer:

- Pedir pro suporte: "preciso de export dos arquivos físicos (PDFs) também, junto com o backup"
- Eles enviam um zip com a estrutura de pastas
- Sobe pro Drive ou faz upload no novo amarante

Os **metadados** dos arquivos (nome, data upload, processo associado) já estão migrados (222.986 linhas em `arquivos`).

## Migrations SQL versionadas

- `2026-04-29-easy-id-columns.sql` — adiciona `easy_id` em 21 tabelas
- `2026-04-29-truncate-pre-easy.sql` — TRUNCATE limpo (pra reset)
- `2026-05-02-easy-id-unique.sql` — torna `easy_id` UNIQUE (pra UPSERT futuro)

## FAQ

**Q: Posso rodar a migração múltiplas vezes?**
R: Sim. O `re_migrar.sh` faz TRUNCATE primeiro pra garantir consistência total.

**Q: E se eu tiver criado dados no novo manualmente que não vieram do Easy?**
R: O TRUNCATE apaga tudo e re-migra. Se você criou processos manualmente no novo, eles serão perdidos. Use só quando tudo vier do Easy.

**Q: Posso usar o sistema novo enquanto a re-migração roda?**
R: Não recomendo — o TRUNCATE causa erros de consulta. Espera 30-40 min e usa depois.

**Q: Os usuários precisam re-cadastrar senha?**
R: Sim. Senha padrão é `Amarante@2026` pra todos os 227 usuários migrados (exceto admin `laison` que mantém a senha original `123456`).
