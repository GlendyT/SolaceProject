import { ArrowRight, CalendarDays, DollarSign, MapPin, Package, SlidersHorizontal, Truck } from "lucide-react";
import { PageHeader } from "@/components/page-header";

const loads = [
  { id: "6600111", from: "Milford, MA", to: "Shippensburg, PA", dates: "Sep 21 → Sep 22", price: "$900", vehicles: "1 vehicle", age: "Disponible hace 2 min" },
  { id: "8820194", from: "Raleigh, NC", to: "Richmond, VA", dates: "Sep 23 → Sep 24", price: "$650", vehicles: "2 vehicles", age: "Disponible hace 9 min" },
  { id: "9014472", from: "Phoenix, AZ", to: "Las Vegas, NV", dates: "Sep 25 → Sep 26", price: "$780", vehicles: "1 vehicle", age: "Disponible hace 14 min" },
];

export default function CarriersPage() {
  return (
    <>
      <PageHeader eyebrow="Panel de transportistas" title="Cargas disponibles" description="Revisa las cargas validadas que esperan ser aceptadas por un transportista." action={<button className="button-secondary"><SlidersHorizontal className="size-4" />Filtros</button>} />
      <div className="mb-7 flex items-center justify-between rounded-2xl border border-emerald-100 bg-emerald-50 px-5 py-4"><div className="flex items-center gap-3"><span className="flex size-9 items-center justify-center rounded-full bg-emerald-500 text-white"><Truck className="size-4" /></span><div><p className="text-sm font-bold text-emerald-950">Cola de cargas conectada</p><p className="text-xs text-emerald-800/75">Las nuevas cargas aparecen automáticamente.</p></div></div><span className="hidden text-xs font-bold text-emerald-700 sm:block">Última actualización: ahora</span></div>
      <div className="grid gap-5 xl:grid-cols-2">{loads.map((load) => <article key={load.id} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition-shadow hover:shadow-md"><div className="flex items-start justify-between gap-4"><div><div className="flex items-center gap-2"><span className="rounded-md bg-blue-50 px-2 py-1 text-xs font-bold text-blue-700">#{load.id}</span><span className="text-xs font-medium text-slate-400">{load.age}</span></div><h2 className="mt-4 text-lg font-bold text-slate-900">{load.from} <span className="mx-1 text-slate-300">→</span> {load.to}</h2></div><div className="rounded-xl bg-emerald-50 px-3 py-2 text-right"><span className="flex items-center justify-end gap-1 text-lg font-bold text-emerald-700"><DollarSign className="size-4" />{load.price.replace("$", "")}</span><span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700/70">USD total</span></div></div><div className="my-6 grid grid-cols-2 gap-3 border-y border-slate-100 py-4"><div className="flex items-center gap-2 text-sm text-slate-600"><CalendarDays className="size-4 text-blue-500" />{load.dates}</div><div className="flex items-center gap-2 text-sm text-slate-600"><Package className="size-4 text-blue-500" />{load.vehicles}</div></div><div className="flex items-center justify-between"><span className="flex items-center gap-2 text-xs text-slate-500"><MapPin className="size-3.5" />2 stops · Car hauler</span><button className="button-primary">Ver detalles <ArrowRight className="size-4" /></button></div></article>)}</div>
      <div className="mt-8 rounded-2xl border border-dashed border-slate-300 p-8 text-center"><div className="mx-auto flex size-11 items-center justify-center rounded-xl bg-slate-100 text-slate-500"><Package className="size-5" /></div><h2 className="mt-3 font-bold text-slate-800">¿No encuentras la carga que buscas?</h2><p className="mx-auto mt-1 max-w-md text-sm text-slate-500">La cola se actualiza periódicamente. Revisa de nuevo en unos minutos para ver nuevas oportunidades.</p></div>
    </>
  );
}
