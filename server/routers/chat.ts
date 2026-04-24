import { z } from 'zod'
import { sql } from 'drizzle-orm'
import { TRPCError } from '@trpc/server'
import { router, protectedProcedure } from '../trpc'

const PERFIS_INTERNOS = ['Administrador', 'Analista', 'Gerente']
const PERFIS_EXTERNOS = ['Parceiro', 'Corretor', 'Imobiliária', 'Construtora', 'Subestabelecido']

function isPerfilInterno(perfil?: string | null) {
  return !!perfil && PERFIS_INTERNOS.includes(perfil)
}

function isPerfilExterno(perfil?: string | null) {
  return !!perfil && PERFIS_EXTERNOS.includes(perfil)
}

function getProcessoScopeSql(usuario: any) {
  if (isPerfilInterno(usuario?.perfil)) return sql``

  switch (usuario?.perfil) {
    case 'Parceiro':
    case 'Subestabelecido':
      return usuario?.parceiroId
        ? sql`AND (p.criado_por_id = ${usuario.id} OR p.parceiro_id = ${usuario.parceiroId})`
        : sql`AND p.criado_por_id = ${usuario.id}`
    case 'Corretor':
      return usuario?.corretorId
        ? sql`AND (p.criado_por_id = ${usuario.id} OR p.corretor_id = ${usuario.corretorId})`
        : sql`AND p.criado_por_id = ${usuario.id}`
    case 'Imobiliária':
      return usuario?.imobiliariaId
        ? sql`AND (p.criado_por_id = ${usuario.id} OR p.imobiliaria_id = ${usuario.imobiliariaId})`
        : sql`AND p.criado_por_id = ${usuario.id}`
    case 'Construtora':
      return usuario?.constutoraId
        ? sql`AND (p.criado_por_id = ${usuario.id} OR p.construtora_id = ${usuario.constutoraId})`
        : sql`AND p.criado_por_id = ${usuario.id}`
    default:
      return sql`AND 1 = 0`
  }
}

function getParticipanteSql(usuarioId: number) {
  return sql`(
    (c.externo_id IS NULL AND (c.criado_por_id = ${usuarioId} OR c.interno_id = ${usuarioId}))
    OR (c.externo_id IS NOT NULL AND (c.interno_id = ${usuarioId} OR c.externo_id = ${usuarioId}))
  )`
}

async function assertConversaAcesso(ctx: any, conversaId: number) {
  const usuarioId = ctx.usuario.id
  const result = await ctx.db.execute(sql`
    SELECT c.*
    FROM chat_conversas c
    WHERE c.id = ${conversaId}
      AND ${getParticipanteSql(usuarioId)}
    LIMIT 1
  `)
  const conversa = ((result[0] as unknown as any[]) || [])[0]
  if (!conversa) throw new TRPCError({ code: 'FORBIDDEN', message: 'Acesso negado à conversa' })
  return conversa
}

async function gerarResumoConversa(ctx: any, conversaId: number, mensagemInicialId?: number | null) {
  const result = await ctx.db.execute(sql`
    SELECT u.nome as remetenteNome,
           m.texto,
           m.criado_em as criadoEm
    FROM chat_mensagens m
    JOIN usuarios u ON u.id = m.remetente_id
    WHERE m.conversa_id = ${conversaId}
      ${mensagemInicialId ? sql`AND m.id > ${mensagemInicialId}` : sql``}
    ORDER BY m.criado_em ASC, m.id ASC
    LIMIT 80
  `)
  const mensagens = (result[0] as unknown as any[]) || []
  const principais = mensagens.slice(-20)

  if (!principais.length) {
    return 'Resumo automático do chat: conversa encerrada sem mensagens registradas.'
  }

  const linhas = principais.map((mensagem) => {
    const data = mensagem.criadoEm ? new Date(mensagem.criadoEm).toLocaleString('pt-BR') : ''
    return `- ${data} - ${mensagem.remetenteNome}: ${String(mensagem.texto || '').slice(0, 500)}`
  })

  return [
    'Resumo automático do chat interno:',
    `Total de mensagens analisadas: ${mensagens.length}.`,
    'Últimas mensagens:',
    ...linhas,
  ].join('\n')
}

async function getProcessoVinculadoConversa(ctx: any, conversaId: number) {
  const result = await ctx.db.execute(sql`
    SELECT COALESCE(
      c.processo_id,
      (
        SELECT m.processo_id_detectado
        FROM chat_mensagens m
        WHERE m.conversa_id = c.id
          AND m.processo_id_detectado IS NOT NULL
        ORDER BY m.criado_em DESC, m.id DESC
        LIMIT 1
      )
    ) as processoId
    FROM chat_conversas c
    WHERE c.id = ${conversaId}
    LIMIT 1
  `)
  const row = ((result[0] as unknown as any[]) || [])[0]
  return row?.processoId ? Number(row.processoId) : null
}

async function buscarProcessoDetectado(ctx: any, texto: string) {
  const termo = texto.trim()
  if (termo.length < 2) return null
  const numeros = termo.replace(/\D/g, '')
  const numeroCurto = (termo.match(/#?(\d{1,8})/) || [])[1]
  const buscaNumerica = numeroCurto ? Number(numeroCurto) : -1
  const buscaTexto = termo.length >= 3 ? `%${termo}%` : '___sem_resultado___'
  const buscaDocumento = numeros.length >= 6 ? `%${numeros}%` : '___sem_resultado___'

  const result = await ctx.db.execute(sql`
    SELECT p.id,
           p.num_proposta as numProposta,
           p.num_contrato as numContrato,
           (SELECT c.nome FROM processo_compradores pc
            JOIN clientes c ON c.id = pc.cliente_id
            WHERE pc.processo_id = p.id LIMIT 1) as compradorNome,
           (SELECT e.nome FROM processo_etapas pe
            JOIN etapas e ON e.id = pe.etapa_id
            WHERE pe.processo_id = p.id AND pe.concluido IS NULL
            ORDER BY pe.ordem ASC LIMIT 1) as etapaNome
    FROM processos p
    WHERE 1=1
      ${getProcessoScopeSql(ctx.usuario)}
      AND (
        p.id = ${buscaNumerica}
        OR p.num_proposta LIKE ${buscaTexto}
        OR p.num_contrato LIKE ${buscaTexto}
        OR EXISTS (
          SELECT 1
          FROM processo_compradores pc2
          JOIN clientes c2 ON c2.id = pc2.cliente_id
          WHERE pc2.processo_id = p.id
            AND (
              c2.nome LIKE ${buscaTexto}
              OR c2.cpf_cnpj LIKE ${buscaTexto}
              OR REPLACE(REPLACE(REPLACE(c2.cpf_cnpj, '.', ''), '-', ''), '/', '') LIKE ${buscaDocumento}
            )
        )
        OR EXISTS (
          SELECT 1
          FROM processo_vendedores pv2
          JOIN clientes v2 ON v2.id = pv2.cliente_id
          WHERE pv2.processo_id = p.id
            AND (
              v2.nome LIKE ${buscaTexto}
              OR v2.cpf_cnpj LIKE ${buscaTexto}
              OR REPLACE(REPLACE(REPLACE(v2.cpf_cnpj, '.', ''), '-', ''), '/', '') LIKE ${buscaDocumento}
            )
        )
      )
    ORDER BY p.criado_em DESC
    LIMIT 1
  `)

  return ((result[0] as unknown as any[]) || [])[0] || null
}

export const chatRouter = router({
  usuariosDisponiveis: protectedProcedure.query(async ({ ctx }) => {
    const perfil = ctx.usuario.perfil
    const wherePerfil = isPerfilInterno(perfil)
      ? sql``
      : sql`AND perfil IN ('Administrador','Analista','Gerente')`

    const result = await ctx.db.execute(sql`
      SELECT id, nome, perfil
      FROM usuarios
      WHERE ativo = true
        AND status = 'Ativo'
        AND id <> ${ctx.usuario.id}
        ${wherePerfil}
      ORDER BY FIELD(perfil, 'Administrador','Gerente','Analista','Parceiro','Corretor','Imobiliária','Construtora','Subestabelecido'), nome
    `)
    return result[0] as unknown as any[]
  }),

  listarConversas: protectedProcedure.query(async ({ ctx }) => {
    const usuarioId = ctx.usuario.id
    const result = await ctx.db.execute(sql`
      SELECT c.id,
             c.status,
             c.processo_id as processoId,
             c.criado_em as criadoEm,
             c.atualizado_em as atualizadoEm,
             other_user.id as outroUsuarioId,
             other_user.nome as outroUsuarioNome,
             other_user.perfil as outroUsuarioPerfil,
             (
               SELECT m.texto
               FROM chat_mensagens m
               WHERE m.conversa_id = c.id
               ORDER BY m.criado_em DESC, m.id DESC
               LIMIT 1
             ) as ultimaMensagem,
             (
               SELECT m.criado_em
               FROM chat_mensagens m
               WHERE m.conversa_id = c.id
               ORDER BY m.criado_em DESC, m.id DESC
               LIMIT 1
             ) as ultimaMensagemEm,
             (
               SELECT COUNT(*)
               FROM chat_mensagens m
               WHERE m.conversa_id = c.id
                 AND m.remetente_id <> ${usuarioId}
                 AND m.lida_em IS NULL
             ) as naoLidas
      FROM chat_conversas c
      JOIN usuarios other_user ON other_user.id = CASE
        WHEN c.externo_id IS NULL THEN CASE WHEN c.criado_por_id = ${usuarioId} THEN c.interno_id ELSE c.criado_por_id END
        ELSE CASE WHEN c.externo_id = ${usuarioId} THEN c.interno_id ELSE c.externo_id END
      END
      WHERE ${getParticipanteSql(usuarioId)}
      ORDER BY c.atualizado_em DESC, c.id DESC
      LIMIT 50
    `)
    return result[0] as unknown as any[]
  }),

  totalNaoLidas: protectedProcedure.query(async ({ ctx }) => {
    const usuarioId = ctx.usuario.id
    const result = await ctx.db.execute(sql`
      SELECT COUNT(*) as total
      FROM chat_mensagens m
      JOIN chat_conversas c ON c.id = m.conversa_id
      WHERE ${getParticipanteSql(usuarioId)}
        AND m.remetente_id <> ${usuarioId}
        AND m.lida_em IS NULL
    `)
    const row = ((result[0] as unknown as any[]) || [])[0]
    return { total: Number(row?.total || 0) }
  }),

  criarOuAbrir: protectedProcedure
    .input(z.object({ usuarioId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      if (input.usuarioId === ctx.usuario.id) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Selecione outro usuário' })
      }

      const userResult = await ctx.db.execute(sql`
        SELECT id, nome, perfil
        FROM usuarios
        WHERE id = ${input.usuarioId} AND ativo = true AND status = 'Ativo'
        LIMIT 1
      `)
      const destino = ((userResult[0] as unknown as any[]) || [])[0]
      if (!destino) throw new TRPCError({ code: 'NOT_FOUND', message: 'Usuário não encontrado' })

      const origemInterna = isPerfilInterno(ctx.usuario.perfil)
      const destinoInterno = isPerfilInterno(destino.perfil)
      const origemExterna = isPerfilExterno(ctx.usuario.perfil)
      const destinoExterno = isPerfilExterno(destino.perfil)

      if (origemExterna && destinoExterno) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Usuários externos só podem falar com usuários internos' })
      }

      let existenteResult
      if (origemInterna && destinoInterno) {
        existenteResult = await ctx.db.execute(sql`
          SELECT id, status FROM chat_conversas
          WHERE externo_id IS NULL
            AND (
              (criado_por_id = ${ctx.usuario.id} AND interno_id = ${destino.id})
              OR (criado_por_id = ${destino.id} AND interno_id = ${ctx.usuario.id})
            )
          LIMIT 1
        `)
      } else {
        const internoId = origemInterna ? ctx.usuario.id : destino.id
        const externoId = destinoExterno ? destino.id : ctx.usuario.id
        existenteResult = await ctx.db.execute(sql`
          SELECT id, status FROM chat_conversas
          WHERE interno_id = ${internoId}
            AND externo_id = ${externoId}
          LIMIT 1
        `)
      }

      const existente = ((existenteResult[0] as unknown as any[]) || [])[0]
      if (existente?.id) {
        if (existente.status !== 'aberta') {
          await ctx.db.execute(sql`
            UPDATE chat_conversas
            SET status = 'aberta', atualizado_em = NOW()
            WHERE id = ${existente.id}
          `)
        }
        return { id: Number(existente.id) }
      }

      const internoId = origemInterna && destinoInterno ? destino.id : origemInterna ? ctx.usuario.id : destino.id
      const externoId = origemInterna && destinoInterno ? null : destinoExterno ? destino.id : ctx.usuario.id

      const insert = await ctx.db.execute(sql`
        INSERT INTO chat_conversas (criado_por_id, interno_id, externo_id, status, criado_em, atualizado_em)
        VALUES (${ctx.usuario.id}, ${internoId}, ${externoId}, 'aberta', NOW(), NOW())
      `)
      const result = insert[0] as any
      return { id: Number(result.insertId) }
    }),

  mensagens: protectedProcedure
    .input(z.object({ conversaId: z.number() }))
    .query(async ({ input, ctx }) => {
      await assertConversaAcesso(ctx, input.conversaId)
      await ctx.db.execute(sql`
        UPDATE chat_mensagens
        SET lida_em = COALESCE(lida_em, NOW())
        WHERE conversa_id = ${input.conversaId}
          AND remetente_id <> ${ctx.usuario.id}
      `)
      const result = await ctx.db.execute(sql`
        SELECT m.id,
               m.conversa_id as conversaId,
               m.remetente_id as remetenteId,
               u.nome as remetenteNome,
               u.perfil as remetentePerfil,
               m.texto,
               m.processo_id_detectado as processoIdDetectado,
               m.lida_em as lidaEm,
               m.criado_em as criadoEm,
               p.num_proposta as processoNumProposta,
               (SELECT c.nome FROM processo_compradores pc
                JOIN clientes c ON c.id = pc.cliente_id
                WHERE pc.processo_id = p.id LIMIT 1) as processoCompradorNome
        FROM chat_mensagens m
        JOIN usuarios u ON u.id = m.remetente_id
        LEFT JOIN processos p ON p.id = m.processo_id_detectado
        WHERE m.conversa_id = ${input.conversaId}
        ORDER BY m.criado_em ASC, m.id ASC
        LIMIT 200
      `)
      return result[0] as unknown as any[]
    }),

  enviarMensagem: protectedProcedure
    .input(z.object({ conversaId: z.number(), texto: z.string().min(1).max(3000) }))
    .mutation(async ({ input, ctx }) => {
      const conversa = await assertConversaAcesso(ctx, input.conversaId)
      const texto = input.texto.trim()
      const processo = await buscarProcessoDetectado(ctx, texto)

      if (conversa.status !== 'aberta') {
        await ctx.db.execute(sql`
          INSERT INTO chat_mensagens (conversa_id, remetente_id, texto, criado_em)
          VALUES (
            ${input.conversaId},
            ${ctx.usuario.id},
            'Novo atendimento iniciado nesta conversa.',
            NOW()
          )
        `)
      }

      await ctx.db.execute(sql`
        INSERT INTO chat_mensagens (conversa_id, remetente_id, texto, processo_id_detectado, criado_em)
        VALUES (${input.conversaId}, ${ctx.usuario.id}, ${texto}, ${processo?.id || null}, NOW())
      `)
      await ctx.db.execute(sql`
        UPDATE chat_conversas
        SET status = 'aberta',
            atualizado_em = NOW(),
            processo_id = COALESCE(processo_id, ${processo?.id || null})
        WHERE id = ${input.conversaId}
      `)
      return { ok: true, processo: processo ? { id: processo.id } : null }
    }),

  encerrar: protectedProcedure
    .input(z.object({
      conversaId: z.number(),
      levarParaAtendimento: z.boolean().default(false),
    }))
    .mutation(async ({ input, ctx }) => {
      if (!isPerfilInterno(ctx.usuario.perfil)) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Somente usuários internos podem encerrar conversas' })
      }

      const conversa = await assertConversaAcesso(ctx, input.conversaId)
      if (conversa.status === 'encerrada') return { ok: true }

      const processoId = await getProcessoVinculadoConversa(ctx, input.conversaId)

      if (input.levarParaAtendimento && !processoId) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Esta conversa não tem processo vinculado para registrar atendimento' })
      }

      await ctx.db.execute(sql`
        INSERT INTO chat_mensagens (conversa_id, remetente_id, texto, criado_em)
        VALUES (
          ${input.conversaId},
          ${ctx.usuario.id},
          'Conversa encerrada pela equipe Amarante. Se precisar de novo atendimento, envie uma nova mensagem por aqui.',
          NOW()
        )
      `)

      await ctx.db.execute(sql`
        UPDATE chat_conversas
        SET status = 'encerrada',
            atualizado_em = NOW(),
            processo_id = COALESCE(processo_id, ${processoId})
        WHERE id = ${input.conversaId}
      `)

      if (input.levarParaAtendimento && processoId) {
        const resumo = await gerarResumoConversa(ctx, input.conversaId)
        await ctx.db.execute(sql`
          INSERT INTO processo_atendimentos (processo_id, usuario_id, descricao, criado_em)
          VALUES (${processoId}, ${ctx.usuario.id}, ${resumo}, NOW())
        `)
      }

      return { ok: true }
    }),

  transferir: protectedProcedure
    .input(z.object({
      conversaId: z.number(),
      novoInternoId: z.number(),
    }))
    .mutation(async ({ input, ctx }) => {
      if (!isPerfilInterno(ctx.usuario.perfil)) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Somente usuários internos podem transferir conversas' })
      }

      const conversa = await assertConversaAcesso(ctx, input.conversaId)
      if (!conversa.externo_id) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Transferência disponível apenas para conversas com usuários externos' })
      }
      if (Number(conversa.interno_id) === input.novoInternoId) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Esta conversa já está com esse usuário' })
      }

      const destinoResult = await ctx.db.execute(sql`
        SELECT id, nome, perfil
        FROM usuarios
        WHERE id = ${input.novoInternoId}
          AND ativo = true
          AND status = 'Ativo'
          AND perfil IN ('Administrador','Analista','Gerente')
        LIMIT 1
      `)
      const destino = ((destinoResult[0] as unknown as any[]) || [])[0]
      if (!destino) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Selecione um usuário interno ativo' })
      }

      const processoId = await getProcessoVinculadoConversa(ctx, input.conversaId)
      const corteResult = await ctx.db.execute(sql`
        SELECT GREATEST(
          COALESCE((
            SELECT MAX(id)
            FROM chat_mensagens
            WHERE conversa_id = ${input.conversaId}
              AND texto = 'Novo atendimento iniciado nesta conversa.'
          ), 0),
          COALESCE((
            SELECT MAX(id)
            FROM chat_mensagens
            WHERE conversa_id = ${input.conversaId}
              AND texto LIKE 'Conversa encerrada pela equipe Amarante.%'
          ), 0)
        ) as corteId
      `)
      const corteRow = ((corteResult[0] as unknown as any[]) || [])[0]
      const corteId = Number(corteRow?.corteId || 0)
      const resumo = await gerarResumoConversa(ctx, input.conversaId, corteId || null)
      const mensagem = [
        `Chamado transferido para ${destino.nome} pela equipe Amarante.`,
        '',
        'Resumo para continuidade:',
        resumo,
      ].join('\n')
      const mensagemOrigem = `Chamado transferido para ${destino.nome}. O atendimento continuará com esse responsável.`

      const alvoResult = await ctx.db.execute(sql`
        SELECT id
        FROM chat_conversas
        WHERE externo_id = ${conversa.externo_id}
          AND interno_id = ${input.novoInternoId}
        LIMIT 1
      `)
      let conversaAlvoId = Number((((alvoResult[0] as unknown as any[]) || [])[0])?.id || 0)

      if (!conversaAlvoId) {
        const insert = await ctx.db.execute(sql`
          INSERT INTO chat_conversas (criado_por_id, interno_id, externo_id, processo_id, status, criado_em, atualizado_em)
          VALUES (${input.novoInternoId}, ${input.novoInternoId}, ${conversa.externo_id}, ${processoId}, 'aberta', NOW(), NOW())
        `)
        const insertResult = insert[0] as any
        conversaAlvoId = Number(insertResult.insertId)
      }

      await ctx.db.execute(sql`
        INSERT INTO chat_mensagens (conversa_id, remetente_id, texto, processo_id_detectado, lida_em, criado_em)
        SELECT ${conversaAlvoId}, remetente_id, texto, processo_id_detectado, NULL, criado_em
        FROM chat_mensagens
        WHERE conversa_id = ${input.conversaId}
          ${corteId ? sql`AND id > ${corteId}` : sql``}
        ORDER BY criado_em ASC, id ASC
      `)

      await ctx.db.execute(sql`
        UPDATE chat_conversas
        SET status = 'encerrada',
            atualizado_em = NOW()
        WHERE id = ${input.conversaId}
      `)

      await ctx.db.execute(sql`
        INSERT INTO chat_mensagens (conversa_id, remetente_id, texto, criado_em)
        VALUES (${input.conversaId}, ${ctx.usuario.id}, ${mensagemOrigem}, NOW())
      `)

      await ctx.db.execute(sql`
        UPDATE chat_conversas
        SET status = 'aberta',
            atualizado_em = NOW(),
            processo_id = COALESCE(processo_id, ${processoId})
        WHERE id = ${conversaAlvoId}
      `)

      await ctx.db.execute(sql`
        INSERT INTO chat_mensagens (conversa_id, remetente_id, texto, criado_em)
        VALUES (${conversaAlvoId}, ${ctx.usuario.id}, ${mensagem}, NOW())
      `)

      return { ok: true, conversaId: conversaAlvoId }
    }),

  encerrarETransferir: protectedProcedure
    .input(z.object({
      conversaId: z.number(),
      novoInternoId: z.number(),
      comentario: z.string().min(1, 'Informe o que deve ser tratado pelo novo responsável').max(2000),
      levarParaAtendimento: z.boolean().default(false),
    }))
    .mutation(async ({ input, ctx }) => {
      if (!isPerfilInterno(ctx.usuario.perfil)) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Somente usuários internos podem transferir conversas' })
      }

      const conversa = await assertConversaAcesso(ctx, input.conversaId)
      if (!conversa.externo_id) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Transferência disponível apenas para conversas com usuários externos' })
      }
      if (Number(conversa.interno_id) === input.novoInternoId) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Esta conversa já está com esse usuário' })
      }

      const destinoResult = await ctx.db.execute(sql`
        SELECT id, nome, perfil
        FROM usuarios
        WHERE id = ${input.novoInternoId}
          AND ativo = true
          AND status = 'Ativo'
          AND perfil IN ('Administrador','Analista','Gerente')
        LIMIT 1
      `)
      const destino = ((destinoResult[0] as unknown as any[]) || [])[0]
      if (!destino) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Selecione um usuário interno ativo' })
      }

      const processoId = await getProcessoVinculadoConversa(ctx, input.conversaId)
      if (input.levarParaAtendimento && !processoId) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Esta conversa não tem processo vinculado para registrar atendimento' })
      }

      if (input.levarParaAtendimento && processoId) {
        const resumo = await gerarResumoConversa(ctx, input.conversaId)
        await ctx.db.execute(sql`
          INSERT INTO processo_atendimentos (processo_id, usuario_id, descricao, criado_em)
          VALUES (${processoId}, ${ctx.usuario.id}, ${resumo}, NOW())
        `)
      }

      const origemMensagem = `Atendimento encerrado e novo assunto transferido para ${destino.nome}.`
      await ctx.db.execute(sql`
        INSERT INTO chat_mensagens (conversa_id, remetente_id, texto, criado_em)
        VALUES (${input.conversaId}, ${ctx.usuario.id}, ${origemMensagem}, NOW())
      `)
      await ctx.db.execute(sql`
        UPDATE chat_conversas
        SET status = 'encerrada',
            atualizado_em = NOW(),
            processo_id = COALESCE(processo_id, ${processoId})
        WHERE id = ${input.conversaId}
      `)

      const alvoResult = await ctx.db.execute(sql`
        SELECT id
        FROM chat_conversas
        WHERE externo_id = ${conversa.externo_id}
          AND interno_id = ${input.novoInternoId}
        LIMIT 1
      `)
      let conversaAlvoId = Number((((alvoResult[0] as unknown as any[]) || [])[0])?.id || 0)

      if (!conversaAlvoId) {
        const insert = await ctx.db.execute(sql`
          INSERT INTO chat_conversas (criado_por_id, interno_id, externo_id, processo_id, status, criado_em, atualizado_em)
          VALUES (${input.novoInternoId}, ${input.novoInternoId}, ${conversa.externo_id}, NULL, 'aberta', NOW(), NOW())
        `)
        const insertResult = insert[0] as any
        conversaAlvoId = Number(insertResult.insertId)
      }

      const destinoMensagem = [
        `Novo assunto transferido por ${ctx.usuario.nome} para ${destino.nome}.`,
        '',
        'Comentário para continuidade:',
        input.comentario.trim(),
      ].join('\n')

      await ctx.db.execute(sql`
        UPDATE chat_conversas
        SET status = 'aberta',
            atualizado_em = NOW()
        WHERE id = ${conversaAlvoId}
      `)
      await ctx.db.execute(sql`
        INSERT INTO chat_mensagens (conversa_id, remetente_id, texto, criado_em)
        VALUES (${conversaAlvoId}, ${ctx.usuario.id}, ${destinoMensagem}, NOW())
      `)

      return { ok: true, conversaId: conversaAlvoId }
    }),
})
