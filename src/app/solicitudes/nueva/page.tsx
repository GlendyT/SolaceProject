import Link from "next/link";
import { ArrowRight, CalendarDays, CarFront, ClipboardPaste, DollarSign, MapPin, Plus, Save, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/page-header";

export default function NewRequestPage() {
  return (
    <>
      <PageHeader
        eyebrow="Nueva solicitud"
        title="Registrar una carga"
        description="Ingresa los datos de transporte y el sistema validará las fechas antes de publicar la carga en Solace."
        action={<Link href="/clientes" className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-blue-700">Ver solicitudes <ArrowRight className="size-4" /></Link>}
      />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
        <form className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm lg:p-8">
          <div className="mb-8 flex items-start justify-between gap-4 border-b border-slate-100 pb-6">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Información de la solicitud</h2>
              <p className="mt-1 text-sm text-slate-500">Los campos marcados con * son obligatorios.</p>
            </div>
            <span className="hidden rounded-lg bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-700 sm:block">Zona: US Eastern</span>
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <label className="space-y-2 text-sm font-semibold text-slate-700">
              Shipper order ID *
              <input required name="shipperOrderId" placeholder="Ej. 6600111" className="field" />
            </label>
            <label className="space-y-2 text-sm font-semibold text-slate-700">
              Precio (USD) *
              <span className="relative block"><DollarSign className="field-icon" /><input required name="price" type="number" min="1" placeholder="900" className="field pl-10" /></span>
            </label>
            <label className="space-y-2 text-sm font-semibold text-slate-700">
              Fecha de pickup *
              <span className="relative block"><CalendarDays className="field-icon" /><input required name="pickupDate" type="date" className="field pl-10" /></span>
            </label>
            <label className="space-y-2 text-sm font-semibold text-slate-700">
              Fecha de delivery *
              <span className="relative block"><CalendarDays className="field-icon" /><input required name="deliveryDate" type="date" className="field pl-10" /></span>
            </label>
          </div>

          <section className="mt-8 border-t border-slate-100 pt-7">
            <div className="mb-4 flex items-center justify-between"><div><h2 className="text-base font-bold text-slate-900">Paradas</h2><p className="text-sm text-slate-500">Define el origen y destino del transporte.</p></div><button type="button" className="button-secondary"><Plus className="size-4" />Agregar parada</button></div>
            <div className="grid gap-4 rounded-xl border border-slate-200 bg-slate-50/70 p-4 sm:grid-cols-[58px_1fr_100px_120px]">
              <span className="flex size-9 items-center justify-center rounded-lg bg-blue-100 text-sm font-bold text-blue-700">01</span>
              <label className="space-y-1.5 text-xs font-semibold text-slate-600">Ciudad<input name="pickupCity" placeholder="Milford" className="field field-small" /></label>
              <label className="space-y-1.5 text-xs font-semibold text-slate-600">Estado<input name="pickupState" placeholder="MA" className="field field-small" /></label>
              <label className="space-y-1.5 text-xs font-semibold text-slate-600">ZIP code<input name="pickupPostalCode" placeholder="01757" className="field field-small" /></label>
            </div>
            <div className="mt-3 grid gap-4 rounded-xl border border-slate-200 bg-slate-50/70 p-4 sm:grid-cols-[58px_1fr_100px_120px]">
              <span className="flex size-9 items-center justify-center rounded-lg bg-slate-200 text-sm font-bold text-slate-600">02</span>
              <label className="space-y-1.5 text-xs font-semibold text-slate-600">Ciudad<input name="deliveryCity" placeholder="Shippensburg" className="field field-small" /></label>
              <label className="space-y-1.5 text-xs font-semibold text-slate-600">Estado<input name="deliveryState" placeholder="PA" className="field field-small" /></label>
              <label className="space-y-1.5 text-xs font-semibold text-slate-600">ZIP code<input name="deliveryPostalCode" placeholder="17257" className="field field-small" /></label>
            </div>
          </section>

          <section className="mt-8 border-t border-slate-100 pt-7">
            <div className="mb-4 flex items-center justify-between"><div><h2 className="text-base font-bold text-slate-900">Vehículos</h2><p className="text-sm text-slate-500">Agrega los vehículos incluidos en la carga.</p></div><button type="button" className="button-secondary"><Plus className="size-4" />Agregar vehículo</button></div>
            <div className="grid gap-4 rounded-xl border border-slate-200 p-4 sm:grid-cols-[1fr_1fr_1fr_40px]">
              <label className="space-y-1.5 text-xs font-semibold text-slate-600">Año<input name="vehicleYear" placeholder="2010" className="field field-small" /></label>
              <label className="space-y-1.5 text-xs font-semibold text-slate-600">Marca<input name="vehicleMake" placeholder="Toyota" className="field field-small" /></label>
              <label className="space-y-1.5 text-xs font-semibold text-slate-600">Modelo<input name="vehicleModel" placeholder="Corolla" className="field field-small" /></label>
              <button type="button" aria-label="Eliminar vehículo" className="mt-5 flex size-9 items-center justify-center rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-600"><Trash2 className="size-4" /></button>
            </div>
          </section>

          <label className="mt-8 block space-y-2 border-t border-slate-100 pt-7 text-sm font-semibold text-slate-700">Notas de liberación<textarea name="transportationReleaseNotes" rows={3} placeholder="Indicaciones adicionales para el transportista..." className="field resize-none" /></label>
          <div className="mt-8 flex flex-col-reverse gap-3 border-t border-slate-100 pt-6 sm:flex-row sm:justify-end"><button type="button" className="button-secondary justify-center">Cancelar</button><button type="submit" className="button-primary justify-center"><Save className="size-4" />Enviar solicitud</button></div>
        </form>

        <aside className="space-y-5">
          <div className="rounded-2xl border border-blue-100 bg-blue-50 p-5"><div className="mb-3 flex size-10 items-center justify-center rounded-xl bg-blue-600 text-white"><ClipboardPaste className="size-5" /></div><h2 className="font-bold text-blue-950">Validación automática</h2><p className="mt-2 text-sm leading-6 text-blue-800/80">Las fechas se revisan en la zona US Eastern. Las cargas inválidas se registran como Cancelled con el motivo correspondiente.</p></div>
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><h2 className="font-bold text-slate-900">Reglas principales</h2><ul className="mt-4 space-y-3 text-sm text-slate-500"><li className="flex gap-2"><MapPin className="mt-0.5 size-4 shrink-0 text-blue-600" />Pickup no puede ser anterior a hoy.</li><li className="flex gap-2"><CalendarDays className="mt-0.5 size-4 shrink-0 text-blue-600" />Delivery debe tener al menos un día de diferencia.</li><li className="flex gap-2"><CarFront className="mt-0.5 size-4 shrink-0 text-blue-600" />La carga válida aparecerá para los transportistas.</li></ul></div>
        </aside>
      </div>
    </>
  );
}
