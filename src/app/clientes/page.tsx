import Link from "next/link";
import { ArrowUpRight, CalendarDays, Filter, RefreshCw, Search } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";

const requests = [
  { id: "6600111", route: "Milford, MA → Shippensburg, PA", dates: "Sep 21 – Sep 22, 2026", status: "accepted" as const, note: "You will receive an email when a carrier accepts this dispatch request", updated: "Hace 2 min" },
  { id: "7743789", route: "Dallas, TX → Atlanta, GA", dates: "Sep 20 – Sep 22, 2026", status: "cancelled" as const, note: "Pickup date cannot be earlier than the current date.", updated: "Hace 18 min" },
  { id: "8802415", route: "Columbus, OH → Detroit, MI", dates: "Sep 24 – Sep 25, 2026", status: "pending" as const, note: "Esperando confirmación del broker.", updated: "Hace 1 min" },
];

export default function ClientsPage() {
  return (
    <>
      <PageHeader eyebrow="Vista de cliente" title="Solicitudes de carga" description="Consulta el estado de las solicitudes enviadas y las notificaciones generadas por el sistema." action={<Link href="/solicitudes/nueva" className="button-primary"><span>+</span>Nueva solicitud</Link>} />
      <div className="mb-6 grid gap-4 sm:grid-cols-3"><div className="stat-card"><span>Total solicitudes</span><strong>24</strong><small>+3 esta semana</small></div><div className="stat-card"><span>Aceptadas</span><strong className="text-emerald-600">18</strong><small>75% del total</small></div><div className="stat-card"><span>En revisión</span><strong className="text-amber-600">02</strong><small>Actualización automática</small></div></div>
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"><div className="flex flex-col gap-4 border-b border-slate-100 p-5 md:flex-row md:items-center md:justify-between"><div className="relative w-full md:max-w-xs"><Search className="field-icon" /><input aria-label="Buscar solicitudes" placeholder="Buscar por order ID o ciudad" className="field pl-10" /></div><div className="flex gap-2"><button className="button-secondary"><Filter className="size-4" />Filtrar</button><button className="button-secondary"><RefreshCw className="size-4" />Actualizar</button></div></div><div className="overflow-x-auto"><table className="w-full min-w-[760px] text-left"><thead className="bg-slate-50 text-xs font-bold uppercase tracking-wider text-slate-400"><tr><th className="px-6 py-4">Order ID</th><th className="px-6 py-4">Ruta</th><th className="px-6 py-4">Fechas</th><th className="px-6 py-4">Estado</th><th className="px-6 py-4">Actualizado</th><th className="px-6 py-4"><span className="sr-only">Acción</span></th></tr></thead><tbody className="divide-y divide-slate-100">{requests.map((request) => <tr key={request.id} className="group hover:bg-slate-50/80"><td className="px-6 py-5"><span className="font-bold text-slate-900">#{request.id}</span><span className="mt-1 block text-xs text-slate-400">NewCron</span></td><td className="px-6 py-5"><span className="block text-sm font-semibold text-slate-700">{request.route}</span><span className="mt-1 block max-w-xs truncate text-xs text-slate-400">{request.note}</span></td><td className="px-6 py-5"><span className="flex items-center gap-2 text-sm text-slate-600"><CalendarDays className="size-4 text-slate-400" />{request.dates}</span></td><td className="px-6 py-5"><StatusBadge status={request.status} /></td><td className="px-6 py-5 text-sm text-slate-500">{request.updated}</td><td className="px-6 py-5"><button aria-label={`Ver solicitud ${request.id}`} className="flex size-9 items-center justify-center rounded-lg text-slate-400 hover:bg-blue-50 hover:text-blue-600"><ArrowUpRight className="size-4" /></button></td></tr>)}</tbody></table></div></section>
    </>
  );
}
