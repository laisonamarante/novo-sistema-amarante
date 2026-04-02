import { z } from 'zod'
import { eq, like, and, or } from 'drizzle-orm'
import { router, protectedProcedure } from '../trpc'
import { clientes } from '../../drizzle/schema'

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
  constutoraId:        z.number().optional(),
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
      const where = and(
        eq(clientes.tipo, input.tipo),
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
      const [c] = await ctx.db.select().from(clientes).where(eq(clientes.id, input.id))
      if (!c) throw new Error('Cliente não encontrado')
      return c
    }),

  criar: protectedProcedure
    .input(clienteInput)
    .mutation(async ({ input, ctx }) => {
      const [result] = await ctx.db.insert(clientes).values({ ...input as any, criadoEm: new Date(), atualizadoEm: new Date() })
      return { id: (result as any).insertId }
    }),

  atualizar: protectedProcedure
    .input(z.object({ id: z.number() }).merge(clienteInput.partial()))
    .mutation(async ({ input, ctx }) => {
      const { id, ...dados } = input
      await ctx.db.update(clientes).set({ ...dados as any, atualizadoEm: new Date() }).where(eq(clientes.id, id))
      return { ok: true }
    }),

  excluir: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      await ctx.db.delete(clientes).where(eq(clientes.id, input.id))
      return { ok: true }
    }),
})
