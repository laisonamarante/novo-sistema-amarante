import { forwardRef, ReactNode } from 'react'
import { Loader2, AlertCircle } from 'lucide-react'

export function Btn({ variant='primary', size='md', loading, icon, children, className='', disabled, ...props }: {
  variant?:'primary'|'secondary'|'danger'|'ghost'|'success'; size?:'sm'|'md'|'lg'
  loading?:boolean; icon?:ReactNode; children?:ReactNode; className?:string; disabled?:boolean
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const v = { primary:'bg-blue-600 hover:bg-blue-700 text-white', secondary:'bg-gray-100 hover:bg-gray-200 text-gray-800',
    danger:'bg-red-600 hover:bg-red-700 text-white', ghost:'border border-gray-300 hover:bg-gray-50 text-gray-700',
    success:'bg-green-600 hover:bg-green-700 text-white' }
  const s = { sm:'px-2 py-1 text-xs', md:'px-4 py-2 text-sm', lg:'px-6 py-3 text-base' }
  return (
    <button {...props} disabled={disabled||loading}
      className={`inline-flex items-center gap-2 rounded font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${v[variant]} ${s[size]} ${className}`}>
      {loading?<Loader2 size={14} className="animate-spin"/>:icon}{children}
    </button>
  )
}

export const Input = forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>&{label?:string;error?:string;hint?:string}>(
  ({label,error,hint,className='',...props},ref) => (
    <div className="flex flex-col gap-1">
      {label&&<label className="text-sm font-medium text-gray-700">{label}</label>}
      <input ref={ref} {...props} className={`border rounded px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${error?'border-red-400 bg-red-50':'border-gray-300'} ${props.disabled?'bg-gray-100':'bg-white'} ${className}`}/>
      {error&&<span className="text-xs text-red-600 flex items-center gap-1"><AlertCircle size={11}/>{error}</span>}
      {hint&&!error&&<span className="text-xs text-gray-400">{hint}</span>}
    </div>
  )
)

export const Select = forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>&{label?:string;error?:string;options:{value:string|number;label:string}[];placeholder?:string}>(
  ({label,error,options,placeholder,className='',...props},ref) => (
    <div className="flex flex-col gap-1">
      {label&&<label className="text-sm font-medium text-gray-700">{label}</label>}
      <select ref={ref} {...props} className={`border rounded px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 transition-colors ${error?'border-red-400':'border-gray-300'} bg-white ${className}`}>
        {placeholder&&<option value="">{placeholder}</option>}
        {options.map(o=><option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
      {error&&<span className="text-xs text-red-600">{error}</span>}
    </div>
  )
)

export const Textarea = forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>&{label?:string;error?:string}>(
  ({label,error,className='',...props},ref) => (
    <div className="flex flex-col gap-1">
      {label&&<label className="text-sm font-medium text-gray-700">{label}</label>}
      <textarea ref={ref} {...props} className={`border rounded px-3 py-2 text-sm outline-none resize-none focus:ring-2 focus:ring-blue-500 transition-colors ${error?'border-red-400':'border-gray-300'} ${className}`}/>
      {error&&<span className="text-xs text-red-600">{error}</span>}
    </div>
  )
)

export function Card({children,className=''}:{children:ReactNode;className?:string}) {
  return <div className={`bg-white rounded-lg shadow-sm border border-gray-200 ${className}`}>{children}</div>
}
export function CardHeader({children,className=''}:{children:ReactNode;className?:string}) {
  return <div className={`px-6 py-4 border-b border-gray-200 ${className}`}>{children}</div>
}
export function CardBody({children,className=''}:{children:ReactNode;className?:string}) {
  return <div className={`px-6 py-4 ${className}`}>{children}</div>
}

const BC: Record<string,string> = {
  Ativo:'bg-green-100 text-green-800',Inativo:'bg-gray-100 text-gray-500',
  Pendente:'bg-yellow-100 text-yellow-800',Pago:'bg-green-100 text-green-800',
  Recebido:'bg-green-100 text-green-800',Atrasado:'bg-red-100 text-red-800',
  Resolvida:'bg-green-100 text-green-800',Encerrada:'bg-gray-100 text-gray-500',
}
export function Badge({label,color}:{label:string;color?:string}) {
  return <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${color||BC[label]||'bg-blue-100 text-blue-800'}`}>{label}</span>
}

export function Table({headers,children,loading,empty}:{headers:string[];children:ReactNode;loading?:boolean;empty?:string}) {
  return (
    <div className="overflow-x-auto rounded-lg border border-gray-200">
      <table className="w-full text-sm">
        <thead className="bg-blue-900 text-white">
          <tr>{headers.map((h,i)=><th key={i} className="px-4 py-3 text-left font-medium whitespace-nowrap">{h}</th>)}</tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {loading?<tr><td colSpan={headers.length} className="py-12 text-center text-gray-400"><Loader2 className="animate-spin inline mr-2" size={16}/>Carregando...</td></tr>:children}
        </tbody>
      </table>
      {!loading&&empty&&<p className="text-center text-gray-400 py-8 text-sm">{empty}</p>}
    </div>
  )
}

export function Modal({title,open,onClose,children,size='md'}:{title:string;open:boolean;onClose:()=>void;children:ReactNode;size?:'sm'|'md'|'lg'|'xl'}) {
  if(!open)return null
  const s={sm:'max-w-sm',md:'max-w-lg',lg:'max-w-2xl',xl:'max-w-4xl'}
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose}/>
      <div className={`relative z-10 bg-white rounded-xl shadow-2xl w-full ${s[size]} max-h-[90vh] flex flex-col`}>
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h2 className="font-semibold text-gray-800 text-base">{title}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 text-xl leading-none w-6 h-6 flex items-center justify-center">×</button>
        </div>
        <div className="overflow-y-auto flex-1 px-6 py-4">{children}</div>
      </div>
    </div>
  )
}

export function Pagination({pagina,total,onChange}:{pagina:number;total:number;onChange:(p:number)=>void}) {
  if(total<=1)return null
  const arr=Array.from({length:Math.min(total,10)},(_,i)=>i+1)
  return (
    <div className="flex gap-1 mt-4">
      {arr.map(p=>(
        <button type="button" key={p} onClick={()=>onChange(p)}
          className={`w-8 h-8 rounded text-xs transition-colors ${p===pagina?'bg-blue-600 text-white':'border border-gray-300 hover:bg-gray-50'}`}>
          {p}
        </button>
      ))}
      {total>10&&<span className="text-gray-400 text-sm self-center">...</span>}
    </div>
  )
}

export function Spinner({size=20}:{size?:number}) {
  return <Loader2 size={size} className="animate-spin text-blue-600"/>
}

export function PageHeader({title,subtitle,actions}:{title:string;subtitle?:string;actions?:ReactNode}) {
  return (
    <div className="flex items-center justify-between mb-6">
      <div>
        <h1 className="text-xl font-bold text-gray-800">{title}</h1>
        {subtitle&&<p className="text-sm text-gray-500 mt-0.5">{subtitle}</p>}
      </div>
      {actions&&<div className="flex items-center gap-2">{actions}</div>}
    </div>
  )
}

export function Alert({type='info',message}:{type?:'info'|'success'|'error'|'warning';message:string}) {
  const s={info:'bg-blue-50 text-blue-800 border-blue-200',success:'bg-green-50 text-green-800 border-green-200',
    error:'bg-red-50 text-red-800 border-red-200',warning:'bg-yellow-50 text-yellow-800 border-yellow-200'}
  return <div className={`px-4 py-3 rounded border text-sm ${s[type]}`}>{message}</div>
}

// Aliases
export const Button = Btn
export function Loading() { return <div className="flex justify-center py-12"><Spinner size={32} /></div> }

export function Tabs({tabs,active,onChange}:{tabs:{key:string;label:string}[];active:string;onChange:(k:string)=>void}) {
  return (
    <div className="flex border-b border-gray-200 mb-4">
      {tabs.map(t => (
        <button type="button" key={t.key} onClick={() => onChange(t.key)}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${t.key === active ? "border-blue-600 text-blue-600" : "border-transparent text-gray-500 hover:text-gray-700"}`}>
          {t.label}
        </button>
      ))}
    </div>
  )
}
