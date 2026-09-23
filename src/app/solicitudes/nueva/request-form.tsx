"use client";

import { useState } from "react";
import { CalendarDays, CarFront, ClipboardPaste, DollarSign, LoaderCircle, MapPin, Save } from "lucide-react";

type SubmissionState = { kind: "success" | "error"; message: string; detail?: string } | null;

export function RequestForm() {
  const [submitting, setSubmitting] = useState(false);
  const [submission, setSubmission] = useState<SubmissionState>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setSubmitting(true); setSubmission(null);
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const body = {
      shipperOrderId: String(form.get("shipperOrderId") ?? "").trim(), pickupDate: String(form.get("pickupDate") ?? ""), deliveryDate: String(form.get("deliveryDate") ?? ""), price: Number(form.get("price")),
      stops: [
        { stopNumber: 1, city: String(form.get("pickupCity") ?? "").trim(), state: String(form.get("pickupState") ?? "").trim(), postalCode: String(form.get("pickupPostalCode") ?? "").trim() },
        { stopNumber: 2, city: String(form.get("deliveryCity") ?? "").trim(), state: String(form.get("deliveryState") ?? "").trim(), postalCode: String(form.get("deliveryPostalCode") ?? "").trim() },
      ],
      vehicles: [{ year: String(form.get("vehicleYear") ?? "").trim(), make: String(form.get("vehicleMake") ?? "").trim(), model: String(form.get("vehicleModel") ?? "").trim() }],
      transportationReleaseNotes: String(form.get("transportationReleaseNotes") ?? "").trim(),
    };
    try {
      const response = await fetch("/api/dispatch-requests", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
      const result = (await response.json()) as { status?: string; notes?: string; error?: string };
      if (!response.ok) throw new Error(result.error ?? "No fue posible registrar la solicitud.");
      setSubmission({ kind: result.status === "Accepted" ? "success" : "error", message: result.status === "Accepted" ? "Solicitud recibida" : "Solicitud cancelada", detail: result.notes });
      if (result.status === "Accepted") formElement.reset();
    } catch (error) { setSubmission({ kind: "error", message: "No fue posible enviar la solicitud", detail: error instanceof Error ? error.message : "Intenta nuevamente." }); }
    finally { setSubmitting(false); }
  }

  return <form onSubmit={handleSubmit} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm lg:p-8">
    <div className="mb-8 flex items-start justify-between gap-4 border-b border-slate-100 pb-6"><div><h2 className="text-lg font-bold text-slate-900">Información de la solicitud</h2><p className="mt-1 text-sm text-slate-500">Los campos marcados con * son obligatorios.</p></div><span className="hidden rounded-lg bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-700 sm:block">Zona: US Eastern</span></div>
    {submission && <div role="status" aria-live="polite" className={`mb-6 rounded-xl border px-4 py-3 text-sm ${submission.kind === "success" ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-rose-200 bg-rose-50 text-rose-800"}`}><p className="font-semibold">{submission.message}</p>{submission.detail && <p className="mt-1">{submission.detail}</p>}</div>}
    <div className="grid gap-5 sm:grid-cols-2"><label className="space-y-2 text-sm font-semibold text-slate-700">Shipper order ID *<input required name="shipperOrderId" placeholder="Ej. 6600111" className="field" /></label><label className="space-y-2 text-sm font-semibold text-slate-700">Precio (USD) *<span className="relative block"><DollarSign className="field-icon" /><input required name="price" type="number" min="1" step="0.01" placeholder="900" className="field pl-10" /></span></label><label className="space-y-2 text-sm font-semibold text-slate-700">Fecha de pickup *<span className="relative block"><CalendarDays className="field-icon" /><input required name="pickupDate" type="date" className="field pl-10" /></span></label><label className="space-y-2 text-sm font-semibold text-slate-700">Fecha de delivery *<span className="relative block"><CalendarDays className="field-icon" /><input required name="deliveryDate" type="date" className="field pl-10" /></span></label></div>
    <section className="mt-8 border-t border-slate-100 pt-7"><div className="mb-4"><h2 className="text-base font-bold text-slate-900">Paradas</h2><p className="text-sm text-slate-500">Define el origen y destino del transporte.</p></div><div className="grid gap-4 rounded-xl border border-slate-200 bg-slate-50/70 p-4 sm:grid-cols-[58px_1fr_100px_120px]"><span className="flex size-9 items-center justify-center rounded-lg bg-blue-100 text-sm font-bold text-blue-700">01</span><label className="space-y-1.5 text-xs font-semibold text-slate-600">Ciudad<input required name="pickupCity" placeholder="Milford" className="field field-small" /></label><label className="space-y-1.5 text-xs font-semibold text-slate-600">Estado<input required name="pickupState" placeholder="MA" maxLength={2} className="field field-small" /></label><label className="space-y-1.5 text-xs font-semibold text-slate-600">ZIP code<input required name="pickupPostalCode" placeholder="01757" className="field field-small" /></label></div><div className="mt-3 grid gap-4 rounded-xl border border-slate-200 bg-slate-50/70 p-4 sm:grid-cols-[58px_1fr_100px_120px]"><span className="flex size-9 items-center justify-center rounded-lg bg-slate-200 text-sm font-bold text-slate-600">02</span><label className="space-y-1.5 text-xs font-semibold text-slate-600">Ciudad<input required name="deliveryCity" placeholder="Shippensburg" className="field field-small" /></label><label className="space-y-1.5 text-xs font-semibold text-slate-600">Estado<input required name="deliveryState" placeholder="PA" maxLength={2} className="field field-small" /></label><label className="space-y-1.5 text-xs font-semibold text-slate-600">ZIP code<input required name="deliveryPostalCode" placeholder="17257" className="field field-small" /></label></div></section>
    <section className="mt-8 border-t border-slate-100 pt-7"><div className="mb-4"><h2 className="text-base font-bold text-slate-900">Vehículos</h2><p className="text-sm text-slate-500">Agrega el vehículo incluido en la carga.</p></div><div className="grid gap-4 rounded-xl border border-slate-200 p-4 sm:grid-cols-3"><label className="space-y-1.5 text-xs font-semibold text-slate-600">Año<input required name="vehicleYear" placeholder="2020" maxLength={4} className="field field-small" /></label><label className="space-y-1.5 text-xs font-semibold text-slate-600">Marca<input required name="vehicleMake" placeholder="Freightliner" className="field field-small" /></label><label className="space-y-1.5 text-xs font-semibold text-slate-600">Modelo<input required name="vehicleModel" placeholder="Cascadia" className="field field-small" /></label></div></section>
    <label className="mt-8 block space-y-2 border-t border-slate-100 pt-7 text-sm font-semibold text-slate-700">Notas de liberación<textarea name="transportationReleaseNotes" rows={3} placeholder="Indicaciones adicionales para el transportista..." className="field resize-none" /></label><div className="mt-8 flex justify-end border-t border-slate-100 pt-6"><button disabled={submitting} type="submit" className="button-primary justify-center disabled:cursor-not-allowed disabled:opacity-60">{submitting ? <LoaderCircle className="size-4 animate-spin" /> : <Save className="size-4" />}{submitting ? "Enviando..." : "Enviar solicitud"}</button></div>
  </form>;
}

export function RequestFormAside() { return <aside className="space-y-5"><div className="rounded-2xl border border-blue-100 bg-blue-50 p-5"><div className="mb-3 flex size-10 items-center justify-center rounded-xl bg-blue-600 text-white"><ClipboardPaste className="size-5" /></div><h2 className="font-bold text-blue-950">Validación automática</h2><p className="mt-2 text-sm leading-6 text-blue-800/80">Las fechas se revisan en la zona US Eastern. Las cargas inválidas se registran como Cancelled con el motivo correspondiente.</p></div><div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><h2 className="font-bold text-slate-900">Reglas principales</h2><ul className="mt-4 space-y-3 text-sm text-slate-500"><li className="flex gap-2"><MapPin className="mt-0.5 size-4 shrink-0 text-blue-600" />Pickup no puede ser anterior a hoy.</li><li className="flex gap-2"><CalendarDays className="mt-0.5 size-4 shrink-0 text-blue-600" />Delivery debe tener al menos un día de diferencia.</li><li className="flex gap-2"><CarFront className="mt-0.5 size-4 shrink-0 text-blue-600" />La carga válida aparecerá para los transportistas.</li></ul></div></aside>; }
