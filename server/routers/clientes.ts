import { z } from 'zod'
import { eq, like, and, or, inArray } from 'drizzle-orm'
import { router, protectedProcedure } from '../trpc'
import { clientes } from '../../drizzle/schema'
import { TRPCError } from '@trpc/server'

const PERFIS_INTERNOS = ['Administrador', 'Analista', 'Gerente']

function isPerfilInterno(perfil?: string | null) {
  return !!perfil && PERFIS_INTERNOS.includes(perfil)
}

function getClienteScopeCondition(usuario: any) {
  if (isPerfilInterno(usuario?.perfil)) return undefined

  switch (usuario?.perfil) {
    case 'Parceiro':
    case 'Subestabelecido':
      return usuario?.parceiroId ? eq(clientes.parceiroId, usuario.parceiroId) : eq(clientes.id, -1)
    case 'Corretor':
      return usuario?.corretorId ? eq(clientes.corretorId, usuario.corretorId) : eq(clientes.id, -1)
    case 'Imobiliária':
      return usuario?.imobiliariaId ? eq(clientes.imobiliariaId, usuario.imobiliariaId) : eq(clientes.id, -1)
    case 'Construtora':
      return usuario?.construtoraId ? eq(clientes.construtoraId, usuario.construtoraId) : eq(clientes.id, -1)
    default:
      return eq(clientes.id, -1)
  }
}

function applyClienteOwnership(input: Record<string, any>, usuario: any) {
  if (isPerfilInterno(usuario?.perfil)) return input

  const scoped = { ...input }

  switch (usuario?.perfil) {
    case 'Parceiro':
    case 'Subestabelecido':
      scoped.parceiroId = usuario?.parceiroId || undefined
      break
    case 'Corretor':
      scoped.parceiroId = usuario?.parceiroId || undefined
      scoped.corretorId = usuario?.corretorId || undefined
      scoped.imobiliariaId = usuario?.imobiliariaId || undefined
      break
    case 'Imobiliária':
      scoped.parceiroId = usuario?.parceiroId || undefined
      scoped.imobiliariaId = usuario?.imobiliariaId || undefined
      break
    case 'Construtora':
      scoped.parceiroId = usuario?.parceiroId || undefined
      scoped.construtoraId = usuario?.construtoraId || undefined
      break
  }

  return scoped
}

async function assertClienteAcesso(ctx: any, id: number) {
  const scope = getClienteScopeCondition(ctx.usuario)
  const where = scope ? and(eq(clientes.id, id), scope) : eq(clientes.id, id)
  const [cliente] = await ctx.db.select({ id: clientes.id }).from(clientes).where(where)

  if (!cliente) {
    throw new TRPCError({ code: 'FORBIDDEN', message: 'Acesso negado ao cliente' })
  }
}

const clienteInput = z.object({
  tipo:                z.enum(['Comprador','Vendedor']),
  nome:                z.string().min(1),
  cpfCnpj:             z.string().min(1),
  dataNascimento:      z.string().optional(),
  estadoCivil:         z.enum(['Solteiro','Casado Comunhão de Bens','Casado Comunhão Parcial de Bens','Casado separação de Bens','Divorciado','Separado Judicialmente','União Estável/Outros','Viúvo']).optional(),
  tipoDocumento:       z.string().optional(),
  numeroDocumento:     z.string().optional(),
  dataExpedicao:       z.string().optional(),
  orgaoExpedidor:      z.string().optional(),
  captacao:            z.string().optional(),
  rendaComprovada:     z.string().optional(),
  possuiDependentes:   z.boolean().optional(),
  cpfConjuge:          z.string().optional(),
  nomeConjuge:         z.string().optional(),
  nomeMae:             z.string().optional(),
  endereco:            z.string().optional(),
  numero:              z.string().optional(),
  bairro:              z.string().optional(),
  cidade:              z.string().optional(),
  uf:                  z.string().optional(),
  cep:                 z.string().optional(),
  fone1:               z.string().optional(),
  fone2:               z.string().optional(),
  fone3:               z.string().optional(),
  contato2:            z.string().optional(),
  contato3:            z.string().optional(),
  email:               z.string().optional(),
  bancoId:             z.number().optional(),
  numeroAgencia:       z.string().optional(),
  numeroConta:         z.string().optional(),
  construtoraId:        z.number().optional(),
  corretorId:          z.number().optional(),
  parceiroId:          z.number().optional(),
  imobiliariaId:       z.number().optional(),
})

export const clientesRouter = router({
  listar: protectedProcedure
    .input(z.object({
      tipo:   z.enum(['Comprador','Vendedor']),
      busca:  z.string().optional(),
      pagina: z.number().default(1),
    }))
    .query(async ({ input, ctx }) => {
      const limite = 10
      const offset = (input.pagina - 1) * limite
      const scope = getClienteScopeCondition(ctx.usuario)
      const where = and(
        eq(clientes.tipo, input.tipo),
        scope,
        input.busca
          ? or(like(clientes.nome, `%${input.busca}%`), like(clientes.cpfCnpj, `%${input.busca}%`))
          : undefined
      )
      const lista = await ctx.db.select({
        id: clientes.id, nome: clientes.nome, cpfCnpj: clientes.cpfCnpj,
        fone1: clientes.fone1, fone2: clientes.fone2, fone3: clientes.fone3,
        email: clientes.email,
      }).from(clientes).where(where).limit(limite).offset(offset)

      const [total] = await ctx.db.select({ count: clientes.id }).from(clientes).where(where)
      return { lista, total: Number(total?.count || 0), paginas: Math.ceil(Number(total?.count || 0) / limite) }
    }),

  buscar: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input, ctx }) => {
      const scope = getClienteScopeCondition(ctx.usuario)
      const where = scope ? and(eq(clientes.id, input.id), scope) : eq(clientes.id, input.id)
      const [c] = await ctx.db.select().from(clientes).where(where)
      if (!c) throw new Error('Cliente não encontrado')
      return c
    }),

  porIds: protectedProcedure
    .input(z.object({ ids: z.array(z.number()) }))
    .query(async ({ input, ctx }) => {
      if (!input.ids.length) return []
      const scope = getClienteScopeCondition(ctx.usuario)
      const where = scope ? and(inArray(clientes.id, input.ids), scope) : inArray(clientes.id, input.ids)
      return ctx.db.select({
        id: clientes.id, nome: clientes.nome, cpfCnpj: clientes.cpfCnpj,
        fone1: clientes.fone1, email: clientes.email,
      }).from(clientes).where(where)
    }),

  criar: protectedProcedure
    .input(clienteInput)
    .mutation(async ({ input, ctx }) => {
      const dados = applyClienteOwnership({ ...input }, ctx.usuario)
      const [result] = await ctx.db.insert(clientes).values({ ...dados as any, criadoEm: new Date(), atualizadoEm: new Date() })
      return { id: (result as any).insertId }
    }),

  atualizar: protectedProcedure
    .input(z.object({ id: z.number() }).merge(clienteInput.partial()))
    .mutation(async ({ input, ctx }) => {
      await assertClienteAcesso(ctx, input.id)
      const { id, ...dados } = input
      const scoped = applyClienteOwnership({ ...dados }, ctx.usuario)
      await ctx.db.update(clientes).set({ ...scoped as any, atualizadoEm: new Date() }).where(eq(clientes.id, id))
      return { ok: true }
    }),

  excluir: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      await assertClienteAcesso(ctx, input.id)
      await ctx.db.delete(clientes).where(eq(clientes.id, input.id))
      return { ok: true }
    }),
})
