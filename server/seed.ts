import { db } from './context'
import bcrypt from 'bcryptjs'
import { sql } from 'drizzle-orm'
import {
  usuarios, bancos, agencias, modalidades, fluxos, situacoes, etapas,
  simuladores, finEmpresas, finContas, finFornecedores, finDevedores,
  finTipoDespesas, finTipoReceitas, finNaturezas, documentosTipos
} from '../drizzle/schema'

async function seed() {
  console.log('🌱 Iniciando seed...')

  // Admin
  const hash = await bcrypt.hash('admin123', 10)
  await db.insert(usuarios).values([
    { nome: 'Administrador', login: 'admin', senha: hash, perfil: 'Administrador', ativo: true, criadoEm: new Date() },
    { nome: 'Laison Amarante', login: 'laison', senha: await bcrypt.hash('123456', 10), perfil: 'Administrador', ativo: true, criadoEm: new Date() },
  ]).onDuplicateKeyUpdate({ set: { nome: 'Administrador' } })
  console.log('✅ Usuários criados')

  // Bancos
  await db.insert(bancos).values([
    { nome: 'Banco do Brasil' }, { nome: 'Bradesco' }, { nome: 'Itaú' },
    { nome: 'Sicoob' }, { nome: 'CrediBlue' }, { nome: 'Banco Bari' },
    { nome: 'C6 Bank' }, { nome: 'FINTECH' }, { nome: 'Fundo de Investimento' },
    { nome: 'AGRO' }, { nome: 'Creditú' },
  ]).onDuplicateKeyUpdate({ set: { nome: sql`VALUES(nome)` } })
  console.log('✅ Bancos criados')

  // Agências BB Tangará
  await db.insert(agencias).values([
    { bancoId: 1, nome: 'Tangara da Serra/MT - 1321', codigo: '1321', cidade: 'Tangará da Serra', uf: 'MT' },
    { bancoId: 1, nome: 'Tangara da Serra/MT - 1249', codigo: '1249', cidade: 'Tangará da Serra', uf: 'MT' },
    { bancoId: 1, nome: 'BB - Campo Novo do Parecis / MT', codigo: '3228', cidade: 'Campo Novo do Parecis', uf: 'MT' },
    { bancoId: 1, nome: 'BB - Sapezal', codigo: 'SAPEZAL', cidade: 'Sapezal', uf: 'MT' },
    { bancoId: 1, nome: 'BB - Sinop', codigo: 'SINOP', cidade: 'Sinop', uf: 'MT' },
    { bancoId: 1, nome: 'BB - Rondonopolis', codigo: 'ROND', cidade: 'Rondonópolis', uf: 'MT' },
    { bancoId: 2, nome: 'Bradesco - Cuiabá', codigo: 'CBA', cidade: 'Cuiabá', uf: 'MT' },
    { bancoId: 2, nome: 'Bradesco - Mutum', codigo: 'MUTUM', cidade: 'Mutum', uf: 'MT' },
    { bancoId: 2, nome: 'Bradesco - Juara', codigo: 'JUARA', cidade: 'Juara', uf: 'MT' },
    { bancoId: 3, nome: 'Itaú - Sinop / MT', codigo: 'SINOP', cidade: 'Sinop', uf: 'MT' },
    { bancoId: 3, nome: 'Itaú - TGA', codigo: 'TGA', cidade: 'Tangará da Serra', uf: 'MT' },
  ]).onDuplicateKeyUpdate({ set: { nome: sql`VALUES(nome)` } })
  console.log('✅ Agências criadas')

  // Modalidades
  await db.insert(modalidades).values([
    { nome: 'SFH - CH' }, { nome: 'RESIDENCIAL SFH/CH' }, { nome: 'PRO-COTISTA' },
    { nome: 'PMCMV' }, { nome: 'RESIDENCIAL POUPANÇA' }, { nome: 'Home Equity - Empréstimo' },
    { nome: 'Financiamento' }, { nome: 'Crédito p/ Construção' }, { nome: 'COMERCIAL' },
    { nome: 'Agro Financiamento' }, { nome: 'Agro Emprestimo' }, { nome: 'CGI - Itaú' },
    { nome: 'Financiamento - Itaú' }, { nome: 'Investimento' },
  ]).onDuplicateKeyUpdate({ set: { nome: sql`VALUES(nome)` } })
  console.log('✅ Modalidades criadas')

  // Fluxos
  await db.insert(fluxos).values([
    { nome: 'SFH - CH' }, { nome: 'Pro-Cotista' }, { nome: 'PMCMV' },
    { nome: 'Home Equity' }, { nome: 'Financiamento Padrão' },
  ]).onDuplicateKeyUpdate({ set: { nome: sql`VALUES(nome)` } })
  console.log('✅ Fluxos criados')

  // Etapas padrão (fluxo SFH-CH = id 1)
  await db.insert(etapas).values([
    { fluxoId: 1, nome: 'Processo Criado',                          ordem: 1,  tolerancia: 0 },
    { fluxoId: 1, nome: 'Análise Coban',                             ordem: 2,  tolerancia: 1 },
    { fluxoId: 1, nome: 'Atualização Cadastral / Abertura de conta', ordem: 3,  tolerancia: 3 },
    { fluxoId: 1, nome: 'SAC. Análise de Credito',                   ordem: 4,  tolerancia: 4 },
    { fluxoId: 1, nome: 'Elaboração de Formularios',                 ordem: 5,  tolerancia: 2 },
    { fluxoId: 1, nome: 'Acione de Vistoria',                        ordem: 6,  tolerancia: 8 },
    { fluxoId: 1, nome: 'Análise Jurídica',                          ordem: 7,  tolerancia: 5 },
    { fluxoId: 1, nome: 'Emissão de Contrato',                       ordem: 8,  tolerancia: 3 },
    { fluxoId: 1, nome: 'Formalização',                              ordem: 9,  tolerancia: 1 },
    { fluxoId: 1, nome: 'Registro em Cartorio',                      ordem: 10, tolerancia: 0 },
    { fluxoId: 1, nome: 'Liberação de Recurso',                      ordem: 11, tolerancia: 0 },
  ]).onDuplicateKeyUpdate({ set: { nome: sql`VALUES(nome)` } })
  console.log('✅ Etapas criadas')

  // Situações
  await db.insert(situacoes).values([
    { nome: 'Setor de Crédito (Fase 1)',       ordem: 1 },
    { nome: 'Setor de Formalização (Fase 2)',  ordem: 2 },
    { nome: 'Gerencia (Fase 3)',               ordem: 3 },
    { nome: 'OPERACIONAL',                     ordem: 4 },
    { nome: 'FINANCEIRO',                      ordem: 5 },
    { nome: 'EXTERNO',                         ordem: 6 },
  ]).onDuplicateKeyUpdate({ set: { nome: sql`VALUES(nome)` } })
  console.log('✅ Situações criadas')

  // Simuladores e portais
  await db.insert(simuladores).values([
    { nome: 'Banco do Brasil', url: 'https://cim-simulador-imovelproprio.apps.bb.com.br/simulacao-imobiliario/sobre-imovel', tipo: 'Simulador', ordem: 1 },
    { nome: 'Bradesco',        url: 'https://banco.bradesco/html/classic/produtos-servicos/emprestimo-e-financiamento/encontre-seu-credito/simuladores-imoveis.shtm', tipo: 'Simulador', ordem: 2 },
    { nome: 'Itaú',            url: 'https://www.itau.com.br/emprestimos-financiamentos', tipo: 'Simulador', ordem: 3 },
    { nome: 'Bradesco Portal', url: 'https://wspf.banco.bradesco/wsImoveis/AreaRestrita/Default.aspx', tipo: 'Portal', ordem: 4 },
    { nome: 'Funchal',         url: 'https://formalizabra.creditoimobiliario.funchalnegocios.com.br/Login.aspx', tipo: 'Portal', ordem: 5 },
    { nome: 'Digisac',         url: 'https://amarantecoban.digisac.app/login', tipo: 'Portal', ordem: 6 },
    { nome: 'CrediBlue',       url: 'https://crediblue.azo.blue', tipo: 'Portal', ordem: 7 },
    { nome: 'CashMe',          url: 'https://institucional.cashme.com.br/login', tipo: 'Portal', ordem: 8 },
    { nome: 'Trello',          url: 'https://trello.com/b/V1WO9JNa/novos-leads-amarante', tipo: 'Portal', ordem: 9 },
    { nome: 'Brasilseg',       url: 'https://portal-parceiros.cld.brasilseg.com.br', tipo: 'Portal', ordem: 10 },
    { nome: 'BB Parceiros',    url: 'https://correspondente.bb.com.br/cbo-portal-acesso', tipo: 'Portal', ordem: 11 },
    { nome: 'Itaú Parceiros',  url: 'https://plataformaitauimoveis.cloud.itau.com.br/Portal', tipo: 'Portal', ordem: 12 },
    { nome: 'Bari',            url: 'https://portal.parceirosbari.com.br/login', tipo: 'Portal', ordem: 13 },
    { nome: 'C6Bank',          url: 'https://c6imobiliario.com.br/simulacao?parceiro=29082442000106', tipo: 'Portal', ordem: 14 },
    { nome: 'Libra Crédito',   url: 'https://parceiros.libracredito.com.br/login', tipo: 'Portal', ordem: 15 },
    { nome: 'Nexoos',          url: 'https://parceiro.nexoos.com.br', tipo: 'Portal', ordem: 16 },
    { nome: 'Makasi',          url: 'https://auth.makasi.com.br/login', tipo: 'Portal', ordem: 17 },
    { nome: 'Creditas',        url: 'https://parceiros.creditas.com.br/auth/login/', tipo: 'Portal', ordem: 18 },
    { nome: 'HubSpot',         url: 'https://app.hubspot.com', tipo: 'Portal', ordem: 19 },
    { nome: 'Daycoval',        url: 'https://creditoimobiliario.daycoval.com.br', tipo: 'Portal', ordem: 20 },
    { nome: 'Pontte',          url: 'https://bit.ly/LeadParceiroHE', tipo: 'Portal', ordem: 21 },
  ]).onDuplicateKeyUpdate({ set: { nome: sql`VALUES(nome)` } })
  console.log('✅ Simuladores criados')

  // Financeiro - Empresas
  await db.insert(finEmpresas).values([
    { nome: 'Amarante Serviços' }, { nome: 'Amarante Construções' }, { nome: 'Pessoal' },
  ]).onDuplicateKeyUpdate({ set: { nome: sql`VALUES(nome)` } })

  // Financeiro - Contas
  await db.insert(finContas).values([
    { empresaId: 1, banco: 'Banco do Brasil (Serviço)',    agencia: 'Altos da Serra - TGA- 7138', conta: '—', saldo: '57794.24', limite: '0.00' },
    { empresaId: 2, banco: 'Banco do Brasil (Construções)',agencia: 'Tangara da Serra/MT - 1321',  conta: '—', saldo: '11612.66', limite: '0.00' },
    { empresaId: 1, banco: 'Bradesco (serviço)',           agencia: 'Tangara da Serra/MT - 1249',  conta: '—', saldo: '1550.00',  limite: '0.00' },
    { empresaId: 2, banco: 'Sicoob (construtora)',         agencia: 'Sicoob',                      conta: '—', saldo: '1024.04',  limite: '0.00' },
    { empresaId: 3, banco: 'Nubank Day',                   agencia: '—',                           conta: '—', saldo: '3170.96',  limite: '0.00' },
    { empresaId: 3, banco: 'BB - Laison',                  agencia: '—',                           conta: '—', saldo: '0.00',     limite: '0.00' },
    { empresaId: 3, banco: 'Bradesco Laison',              agencia: 'Tangara da Serra/MT - 1249',  conta: '—', saldo: '0.00',     limite: '0.00' },
    { empresaId: 3, banco: 'BB- Day',                      agencia: '—',                           conta: '—', saldo: '177.04',   limite: '0.00' },
  ]).onDuplicateKeyUpdate({ set: { banco: sql`VALUES(banco)` } })

  // Tipos de Despesa
  await db.insert(finTipoDespesas).values([
    { nome: 'Pagamentos de Pessoal' }, { nome: 'Encargos sobre Folha' }, { nome: 'Benefícios' },
    { nome: 'Rescisões Trabalhistas' }, { nome: 'Infraestrutura e Operação' }, { nome: 'Tecnologia e Plataformas Operacionais' },
    { nome: 'Bancários e Financeiros' }, { nome: 'Tributos Mensais' }, { nome: 'Tributos Trimestrais' },
    { nome: 'Parcelamentos de Tributos' }, { nome: 'Marketing – Mídia Paga' }, { nome: 'Marketing – Ferramentas Internas' },
    { nome: 'Marketing – Serviços Contratados' }, { nome: 'Marketing – Ações e Eventos' }, { nome: 'Manutenção e Reparos' },
    { nome: 'Materiais de Escritório' }, { nome: 'Combustível e Deslocamento eventual' }, { nome: 'Serviços e Obrigações Administrativas' },
    { nome: 'Eventos Internos' }, { nome: 'Presentes a Clientes / Brindes' }, { nome: 'Multas / Juros por Atraso' },
    { nome: 'Desp. Pessoal' }, { nome: 'Comissão repassada' }, { nome: 'Carro T-Cross' },
  ]).onDuplicateKeyUpdate({ set: { nome: sql`VALUES(nome)` } })

  // Tipos de Receita
  await db.insert(finTipoReceitas).values([
    { nome: 'Comissão' }, { nome: 'Intermediação' }, { nome: 'Outros' },
  ]).onDuplicateKeyUpdate({ set: { nome: sql`VALUES(nome)` } })

  // Naturezas
  await db.insert(finNaturezas).values([
    { nome: 'Custo com Departamento Pessoal (RH)', tipo: 'Despesa' },
    { nome: 'Impostos sobre Notas Fiscais',        tipo: 'Despesa' },
    { nome: 'Despesas Administrativas Fixas',      tipo: 'Despesa' },
    { nome: 'Marketing e Comunicação',             tipo: 'Despesa' },
    { nome: 'Despesas Eventuais / Operacionais Variáveis', tipo: 'Despesa' },
    { nome: 'Despesas com Parcerias',              tipo: 'Despesa' },
    { nome: 'Despesas Pessoais',                   tipo: 'Despesa' },
    { nome: 'Veiculo',                             tipo: 'Despesa' },
  ]).onDuplicateKeyUpdate({ set: { nome: sql`VALUES(nome)` } })

  // Fornecedores
  await db.insert(finFornecedores).values([
    { nome: 'Digisac' }, { nome: 'Premium Contabilidade' }, { nome: 'Vivo' },
    { nome: 'Bem Melhor' }, { nome: 'Mkt Adriana' }, { nome: 'Onix' },
    { nome: 'Teleturbo' }, { nome: 'Maxpel' }, { nome: 'Easy' },
    { nome: 'PIS' }, { nome: 'Cofins' }, { nome: 'CSLL' }, { nome: 'ISSQN' },
    { nome: 'Receita Federal' }, { nome: 'DAS' }, { nome: 'IRRF' },
    { nome: 'FGTS' }, { nome: 'INSS/IRRF' }, { nome: 'IPVA' }, { nome: 'IPTU' },
    { nome: 'Casa/Pessoal' }, { nome: 'Volkswagen' }, { nome: 'Bônus' },
    { nome: 'Comissão Parceiro' }, { nome: 'Cartão Sicoob' }, { nome: 'Parceiro' },
    { nome: 'Indicação' }, { nome: 'Batista Da Villa' }, { nome: 'IRRF' },
    { nome: 'Colaboradora - Ana Paula' }, { nome: 'Colaboradora - Cecilia' },
    { nome: 'Colaboradora - Esthefany' }, { nome: 'Colaboradora - Mayara' },
    { nome: 'Colaboradora - Jessica' }, { nome: 'Colaboradora - Dayara' },
    { nome: 'Colaborador - Lucas' }, { nome: 'Unimed' }, { nome: 'Empréstimo' },
    { nome: 'Eventual (outros)' },
  ]).onDuplicateKeyUpdate({ set: { nome: sql`VALUES(nome)` } })

  // Devedores
  await db.insert(finDevedores).values([
    { nome: 'BBTS' }, { nome: 'Bradesco' }, { nome: 'Creditas' },
    { nome: 'Cashme' }, { nome: 'Trinus' }, { nome: 'Oxy' },
    { nome: 'Habitabem' }, { nome: 'Outros PF' },
  ]).onDuplicateKeyUpdate({ set: { nome: sql`VALUES(nome)` } })

  // Documentos padrão (fluxo SFH-CH)
  await db.insert(documentosTipos).values([
    { fluxoId: 1, nome: 'TERMO DE RESPONSABILIDADE',                  ordem: 1,  obrigatorio: false },
    { fluxoId: 1, nome: 'RG e CPF / CNH',                             ordem: 2,  obrigatorio: true  },
    { fluxoId: 1, nome: 'SCR - autorização para compartilhamento de dados', ordem: 3, obrigatorio: true },
    { fluxoId: 1, nome: 'COMPROVANTE DE ESTADO CIVIL',                ordem: 4,  obrigatorio: true  },
    { fluxoId: 1, nome: 'Comprovante de endereço (água, luz, telefone, gás)', ordem: 5, obrigatorio: true },
    { fluxoId: 1, nome: 'COMPROVANTE DE RENDA',                       ordem: 6,  obrigatorio: true  },
    { fluxoId: 1, nome: 'CTPS (obrigatório ao apresentar Holerite)',  ordem: 7,  obrigatorio: false },
    { fluxoId: 1, nome: 'Extrato FGTS (3 últimos meses)',             ordem: 8,  obrigatorio: true  },
    { fluxoId: 1, nome: 'Declaração de IR (completa + recibo)',       ordem: 9,  obrigatorio: false },
    { fluxoId: 1, nome: 'Certidão de Nascimento (dependentes)',       ordem: 10, obrigatorio: false },
    { fluxoId: 1, nome: 'Documentos do Imóvel',                       ordem: 11, obrigatorio: true  },
    { fluxoId: 1, nome: 'Certidão de Casamento / União Estável',      ordem: 12, obrigatorio: false },
  ]).onDuplicateKeyUpdate({ set: { nome: sql`VALUES(nome)` } })

  console.log('✅ Financeiro e documentos criados')
  console.log('\n🎉 Seed completo! Login: laison / 123456')
  process.exit(0)
}

seed().catch(e => { console.error(e); process.exit(1) })
