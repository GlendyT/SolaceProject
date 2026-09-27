"use client";

import { useState, useRef, useEffect } from "react";
import { toast } from "sonner";
import { DateTime } from "luxon";
import { Calendar } from "@/components/ui/calendar";
import { PayloadModal } from "@/components/payload-modal";
import {
  CalendarDays,
  CarFront,
  ClipboardPaste,
  FileCode,
  LoaderCircle,
  MapPin,
  Save,
} from "lucide-react";

export function RequestForm() {
  const [submitting, setSubmitting] = useState(false);
  const [showPayloadModal, setShowPayloadModal] = useState(false);
  const [previewPayload, setPreviewPayload] = useState<unknown>(null);
  const [pickupDate, setPickupDate] = useState<Date | undefined>(undefined);
  const [deliveryDate, setDeliveryDate] = useState<Date | undefined>(undefined);
  const [openPickup, setOpenPickup] = useState(false);
  const [openDelivery, setOpenDelivery] = useState(false);

  // Estados para autocompletado de paradas con Zippopotam.us
  const [pickupPostalCode, setPickupPostalCode] = useState("");
  const [pickupCity, setPickupCity] = useState("");
  const [pickupState, setPickupState] = useState("");
  const [loadingPickupZip, setLoadingPickupZip] = useState(false);

  const [deliveryPostalCode, setDeliveryPostalCode] = useState("");
  const [deliveryCity, setDeliveryCity] = useState("");
  const [deliveryState, setDeliveryState] = useState("");
  const [loadingDeliveryZip, setLoadingDeliveryZip] = useState(false);

  const formRef = useRef<HTMLFormElement>(null);
  const pickupRef = useRef<HTMLDivElement>(null);
  const deliveryRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        pickupRef.current &&
        !pickupRef.current.contains(event.target as Node)
      ) {
        setOpenPickup(false);
      }
      if (
        deliveryRef.current &&
        !deliveryRef.current.contains(event.target as Node)
      ) {
        setOpenDelivery(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const todayEastern = DateTime.now()
    .setZone("America/New_York")
    .startOf("day")
    .toJSDate();
  const minDeliveryDate = pickupDate
    ? DateTime.fromJSDate(pickupDate)
        .plus({ days: 1 })
        .startOf("day")
        .toJSDate()
    : DateTime.fromJSDate(todayEastern)
        .plus({ days: 1 })
        .startOf("day")
        .toJSDate();

  async function lookupZip(
    zip: string,
  ): Promise<{ city: string; state: string } | null> {
    const cleanZip = zip.trim();
    if (!/^\d{5}$/.test(cleanZip)) return null;
    try {
      const res = await fetch(`https://api.zippopotam.us/us/${cleanZip}`);
      if (!res.ok) return null;
      const data = (await res.json()) as {
        places?: Array<{ "place name": string; "state abbreviation": string }>;
      };
      const place = data.places?.[0];
      if (!place) return null;
      return {
        city: place["place name"],
        state: place["state abbreviation"],
      };
    } catch {
      return null;
    }
  }

  async function handlePickupZipChange(e: React.ChangeEvent<HTMLInputElement>) {
    const value = e.target.value.replace(/\D/g, "").slice(0, 5);
    setPickupPostalCode(value);
    if (value.length === 5) {
      setLoadingPickupZip(true);
      const location = await lookupZip(value);
      setLoadingPickupZip(false);
      if (location) {
        setPickupCity(location.city);
        setPickupState(location.state);
        toast.success(
          `Origen autocompletado: ${location.city}, ${location.state}`,
        );
      } else {
        toast.error("Código postal de origen no encontrado en EE. UU.");
      }
    }
  }

  async function handleDeliveryZipChange(
    e: React.ChangeEvent<HTMLInputElement>,
  ) {
    const value = e.target.value.replace(/\D/g, "").slice(0, 5);
    setDeliveryPostalCode(value);
    if (value.length === 5) {
      setLoadingDeliveryZip(true);
      const location = await lookupZip(value);
      setLoadingDeliveryZip(false);
      if (location) {
        setDeliveryCity(location.city);
        setDeliveryState(location.state);
        toast.success(
          `Destino autocompletado: ${location.city}, ${location.state}`,
        );
      } else {
        toast.error("Código postal de destino no encontrado en EE. UU.");
      }
    }
  }

  function handleSelectPickup(date: Date | undefined) {
    setPickupDate(date);
    setOpenPickup(false);
    if (date && deliveryDate) {
      const minDelivery = DateTime.fromJSDate(date)
        .plus({ days: 1 })
        .startOf("day");
      const currentDelivery = DateTime.fromJSDate(deliveryDate).startOf("day");
      if (currentDelivery < minDelivery) {
        setDeliveryDate(undefined);
        toast.info(
          "La fecha de delivery se reinició porque debe tener al menos un día de diferencia con respecto al pickup.",
        );
      }
    }
  }

  function handleSelectDelivery(date: Date | undefined) {
    if (!pickupDate) {
      toast.error("Selecciona primero la fecha de pickup.");
      return;
    }
    setDeliveryDate(date);
    setOpenDelivery(false);
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);

    const shipperOrderId = String(form.get("shipperOrderId") ?? "").trim();
    const pickupDateStr = pickupDate
      ? DateTime.fromJSDate(pickupDate).toFormat("yyyy-MM-dd")
      : "";
    const deliveryDateStr = deliveryDate
      ? DateTime.fromJSDate(deliveryDate).toFormat("yyyy-MM-dd")
      : "";
    const price = Number(form.get("price"));
    const pickupCity = String(form.get("pickupCity") ?? "").trim();
    const pickupState = String(form.get("pickupState") ?? "").trim();
    const pickupPostalCode = String(form.get("pickupPostalCode") ?? "").trim();
    const deliveryCity = String(form.get("deliveryCity") ?? "").trim();
    const deliveryState = String(form.get("deliveryState") ?? "").trim();
    const deliveryPostalCode = String(
      form.get("deliveryPostalCode") ?? "",
    ).trim();
    const vehicleYear = String(form.get("vehicleYear") ?? "").trim();
    const vehicleMake = String(form.get("vehicleMake") ?? "").trim();
    const vehicleModel = String(form.get("vehicleModel") ?? "").trim();

    if (!shipperOrderId) {
      toast.error("El Shipper Order ID es obligatorio.");
      return;
    }
    if (!price || price <= 0) {
      toast.error("Ingresa un precio válido mayor a 0.");
      return;
    }
    if (!pickupDateStr) {
      toast.error("Selecciona la fecha de pickup.");
      return;
    }
    if (!deliveryDateStr) {
      toast.error("Selecciona la fecha de delivery.");
      return;
    }
    if (pickupDate && deliveryDate) {
      const p = DateTime.fromJSDate(pickupDate).startOf("day");
      const d = DateTime.fromJSDate(deliveryDate).startOf("day");
      if (d < p.plus({ days: 1 })) {
        toast.error(
          "La fecha de delivery debe ser al menos un día posterior a la fecha de pickup.",
        );
        return;
      }
    }
    if (!pickupCity || !pickupState || !pickupPostalCode) {
      toast.error("Completa todos los datos de origen (ciudad, estado y ZIP).");
      return;
    }
    if (!deliveryCity || !deliveryState || !deliveryPostalCode) {
      toast.error(
        "Completa todos los datos de destino (ciudad, estado y ZIP).",
      );
      return;
    }
    if (!vehicleYear || !vehicleMake || !vehicleModel) {
      toast.error("Completa los datos del vehículo (año, marca y modelo).");
      return;
    }

    setSubmitting(true);
    const body = {
      shipperOrderId,
      pickupDate: pickupDateStr,
      deliveryDate: deliveryDateStr,
      price,
      stops: [
        {
          stopNumber: 1,
          city: pickupCity,
          state: pickupState,
          postalCode: pickupPostalCode,
        },
        {
          stopNumber: 2,
          city: deliveryCity,
          state: deliveryState,
          postalCode: deliveryPostalCode,
        },
      ],
      vehicles: [
        {
          year: vehicleYear,
          make: vehicleMake,
          model: vehicleModel,
        },
      ],
      transportationReleaseNotes: String(
        form.get("transportationReleaseNotes") ?? "",
      ).trim(),
    };

    try {
      const response = await fetch("/api/dispatch-requests", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      const result = (await response.json()) as {
        status?: string;
        notes?: string;
        error?: string;
      };
      if (!response.ok) {
        throw new Error(
          result.error ?? "No fue posible registrar la solicitud.",
        );
      }

      if (result.status === "Accepted") {
        toast.success("Solicitud recibida con éxito", {
          description: result.notes,
        });
        formElement.reset();
        setPickupDate(undefined);
        setDeliveryDate(undefined);
        setPickupPostalCode("");
        setPickupCity("");
        setPickupState("");
        setDeliveryPostalCode("");
        setDeliveryCity("");
        setDeliveryState("");
      } else {
        toast.error("Solicitud cancelada o rechazada", {
          description: result.notes,
        });
      }
    } catch (error) {
      toast.error("Error al procesar la solicitud", {
        description:
          error instanceof Error ? error.message : "Intenta nuevamente.",
      });
    } finally {
      setSubmitting(false);
    }
  }

  function handleOpenPayloadPreview() {
    if (!formRef.current) return;
    const form = new FormData(formRef.current);
    const payload = {
      shipperOrderId: String(form.get("shipperOrderId") ?? "").trim(),
      pickupDate: pickupDate
        ? DateTime.fromJSDate(pickupDate).toFormat("yyyy-MM-dd")
        : "",
      deliveryDate: deliveryDate
        ? DateTime.fromJSDate(deliveryDate).toFormat("yyyy-MM-dd")
        : "",
      price: Number(form.get("price")) || 0,
      stops: [
        {
          stopNumber: 1,
          city: pickupCity || String(form.get("pickupCity") ?? "").trim(),
          state: pickupState || String(form.get("pickupState") ?? "").trim(),
          postalCode:
            pickupPostalCode ||
            String(form.get("pickupPostalCode") ?? "").trim(),
        },
        {
          stopNumber: 2,
          city: deliveryCity || String(form.get("deliveryCity") ?? "").trim(),
          state:
            deliveryState || String(form.get("deliveryState") ?? "").trim(),
          postalCode:
            deliveryPostalCode ||
            String(form.get("deliveryPostalCode") ?? "").trim(),
        },
      ],
      vehicles: [
        {
          year: String(form.get("vehicleYear") ?? "").trim(),
          make: String(form.get("vehicleMake") ?? "").trim(),
          model: String(form.get("vehicleModel") ?? "").trim(),
        },
      ],
      transportationReleaseNotes: String(
        form.get("transportationReleaseNotes") ?? "",
      ).trim(),
    };
    setPreviewPayload(payload);
    setShowPayloadModal(true);
  }

  return (
    <form
      ref={formRef}
      noValidate
      onSubmit={handleSubmit}
      className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm lg:p-8"
    >
      <input
        type="hidden"
        name="pickupDate"
        value={
          pickupDate
            ? DateTime.fromJSDate(pickupDate).toFormat("yyyy-MM-dd")
            : ""
        }
      />
      <input
        type="hidden"
        name="deliveryDate"
        value={
          deliveryDate
            ? DateTime.fromJSDate(deliveryDate).toFormat("yyyy-MM-dd")
            : ""
        }
      />
      <div className="mb-8 flex items-start justify-between gap-4 border-b border-slate-100 pb-6">
        <div>
          <h2 className="text-lg font-bold text-slate-900">
            Información de la solicitud
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Los campos marcados con * son obligatorios.
          </p>
        </div>
        <span className="hidden rounded-lg bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-700 sm:block">
          Zona: US Eastern
        </span>
      </div>
      <div className="grid gap-5 sm:grid-cols-2">
        <label className="space-y-2 text-sm font-semibold text-slate-700">
          Shipper order ID *
          <input
            required
            name="shipperOrderId"
            placeholder="Ej. 6600111"
            className="field"
          />
        </label>
        <label className="space-y-2 text-sm font-semibold text-slate-700">
          Precio (USD) *
          <span className="relative block">
            <input
              required
              name="price"
              type="number"
              min="1"
              step="0.01"
              placeholder="900"
              className="field pl-10"
            />
          </span>
        </label>

        {/* Campo Fecha de pickup con shadcn Calendar */}
        <div
          className="relative space-y-2 text-sm font-semibold text-slate-700"
          ref={pickupRef}
        >
          <span>Fecha de pickup *</span>
          <button
            type="button"
            onClick={() => {
              setOpenPickup((prev) => !prev);
              setOpenDelivery(false);
            }}
            className="field flex items-center justify-between text-left font-normal cursor-pointer"
          >
            <span
              className={
                pickupDate ? "text-slate-900 font-medium" : "text-slate-400"
              }
            >
              {pickupDate
                ? DateTime.fromJSDate(pickupDate)
                    .setLocale("es")
                    .toFormat("dd 'de' MMMM, yyyy")
                : "Seleccionar fecha"}
            </span>
            <CalendarDays className="size-4 text-slate-400" />
          </button>
          {openPickup && (
            <div className="absolute left-0 top-full z-50 mt-1">
              <Calendar
                mode="single"
                selected={pickupDate}
                onSelect={handleSelectPickup}
                disabled={{ before: todayEastern }}
              />
            </div>
          )}
        </div>

        {/* Campo Fecha de delivery con shadcn Calendar */}
        <div
          className="relative space-y-2 text-sm font-semibold text-slate-700"
          ref={deliveryRef}
        >
          <span>Fecha de delivery *</span>
          <button
            type="button"
            onClick={() => {
              if (!pickupDate) {
                toast.error("Selecciona primero la fecha de pickup.");
                return;
              }
              setOpenDelivery((prev) => !prev);
              setOpenPickup(false);
            }}
            className="field flex items-center justify-between text-left font-normal cursor-pointer"
          >
            <span
              className={
                deliveryDate ? "text-slate-900 font-medium" : "text-slate-400"
              }
            >
              {deliveryDate
                ? DateTime.fromJSDate(deliveryDate)
                    .setLocale("es")
                    .toFormat("dd 'de' MMMM, yyyy")
                : "Seleccionar fecha"}
            </span>
            <CalendarDays className="size-4 text-slate-400" />
          </button>
          {openDelivery && (
            <div className="absolute left-0 top-full z-50 mt-1">
              <Calendar
                mode="single"
                selected={deliveryDate}
                onSelect={handleSelectDelivery}
                disabled={{ before: minDeliveryDate }}
              />
            </div>
          )}
        </div>
      </div>
      <section className="mt-8 border-t border-slate-100 pt-7">
        <div className="mb-4">
          <h2 className="text-base font-bold text-slate-900">Paradas</h2>
          <p className="text-sm text-slate-500">
            Ingresa el ZIP code de 5 dígitos para autocompletar la ciudad y el
            estado automáticamente.
          </p>
        </div>

        {/* Parada 01: Origen */}
        <div className="grid gap-4 rounded-xl border border-slate-200 bg-slate-50/70 p-4 sm:grid-cols-[58px_130px_1fr_90px]">
          <span className="flex size-9 items-center justify-center rounded-lg bg-blue-100 text-sm font-bold text-blue-700">
            01
          </span>
          <label className="space-y-1.5 text-xs font-semibold text-slate-600">
            ZIP code *
            <span className="relative block">
              <input
                required
                name="pickupPostalCode"
                placeholder="01757"
                maxLength={5}
                value={pickupPostalCode}
                onChange={handlePickupZipChange}
                className="field field-small pr-8 font-mono"
              />
              {loadingPickupZip && (
                <LoaderCircle className="absolute right-2.5 top-1/2 -translate-y-1/2 size-3.5 animate-spin text-blue-600" />
              )}
            </span>
          </label>
          <label className="space-y-1.5 text-xs font-semibold text-slate-600">
            Ciudad *
            <input
              required
              name="pickupCity"
              placeholder="Milford"
              value={pickupCity}
              onChange={(e) => setPickupCity(e.target.value)}
              className="field field-small"
            />
          </label>
          <label className="space-y-1.5 text-xs font-semibold text-slate-600">
            Estado *
            <input
              required
              name="pickupState"
              placeholder="MA"
              maxLength={2}
              value={pickupState}
              onChange={(e) => setPickupState(e.target.value.toUpperCase())}
              className="field field-small uppercase"
            />
          </label>
        </div>

        {/* Parada 02: Destino */}
        <div className="mt-3 grid gap-4 rounded-xl border border-slate-200 bg-slate-50/70 p-4 sm:grid-cols-[58px_130px_1fr_90px]">
          <span className="flex size-9 items-center justify-center rounded-lg bg-slate-200 text-sm font-bold text-slate-600">
            02
          </span>
          <label className="space-y-1.5 text-xs font-semibold text-slate-600">
            ZIP code *
            <span className="relative block">
              <input
                required
                name="deliveryPostalCode"
                placeholder="17257"
                maxLength={5}
                value={deliveryPostalCode}
                onChange={handleDeliveryZipChange}
                className="field field-small pr-8 font-mono"
              />
              {loadingDeliveryZip && (
                <LoaderCircle className="absolute right-2.5 top-1/2 -translate-y-1/2 size-3.5 animate-spin text-blue-600" />
              )}
            </span>
          </label>
          <label className="space-y-1.5 text-xs font-semibold text-slate-600">
            Ciudad *
            <input
              required
              name="deliveryCity"
              placeholder="Shippensburg"
              value={deliveryCity}
              onChange={(e) => setDeliveryCity(e.target.value)}
              className="field field-small"
            />
          </label>
          <label className="space-y-1.5 text-xs font-semibold text-slate-600">
            Estado *
            <input
              required
              name="deliveryState"
              placeholder="PA"
              maxLength={2}
              value={deliveryState}
              onChange={(e) => setDeliveryState(e.target.value.toUpperCase())}
              className="field field-small uppercase"
            />
          </label>
        </div>
      </section>
      <section className="mt-8 border-t border-slate-100 pt-7">
        <div className="mb-4">
          <h2 className="text-base font-bold text-slate-900">Vehículos * </h2>
          <p className="text-sm text-slate-500">
            Agrega el vehículo incluido en la carga.
          </p>
        </div>
        <div className="grid gap-4 rounded-xl border border-slate-200 p-4 sm:grid-cols-3">
          <label className="space-y-1.5 text-xs font-semibold text-slate-600">
            Año
            <input
              required
              name="vehicleYear"
              placeholder="2020"
              maxLength={4}
              className="field field-small"
            />
          </label>
          <label className="space-y-1.5 text-xs font-semibold text-slate-600">
            Marca
            <input
              required
              name="vehicleMake"
              placeholder="Freightliner"
              className="field field-small"
            />
          </label>
          <label className="space-y-1.5 text-xs font-semibold text-slate-600">
            Modelo
            <input
              required
              name="vehicleModel"
              placeholder="Cascadia"
              className="field field-small"
            />
          </label>
        </div>
      </section>
      <label className="mt-8 block space-y-2 border-t border-slate-100 pt-7 text-sm font-semibold text-slate-700">
        Notas de liberación
        <textarea
          name="transportationReleaseNotes"
          rows={3}
          placeholder="Indicaciones adicionales para el transportista..."
          className="field resize-none"
        />
      </label>
      <div className="mt-8 flex items-center justify-end gap-3 border-t border-slate-100 pt-6">
        <button
          type="button"
          onClick={handleOpenPayloadPreview}
          className="button-secondary justify-center cursor-pointer"
        >
          <FileCode className="size-4" />
          Ver payload
        </button>
        <button
          disabled={submitting}
          type="submit"
          className="button-primary justify-center disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer"
        >
          {submitting ? (
            <LoaderCircle className="size-4 animate-spin" />
          ) : (
            <Save className="size-4" />
          )}
          {submitting ? "Enviando..." : "Enviar solicitud"}
        </button>
      </div>

      <PayloadModal
        isOpen={showPayloadModal}
        onClose={() => setShowPayloadModal(false)}
        title="Previsualización del Payload"
        subtitle="Datos estructurados que se enviarán en la solicitud actual"
        payload={previewPayload}
      />
    </form>
  );
}

export function RequestFormAside() {
  return (
    <aside className="space-y-5">
      <div className="rounded-2xl border border-blue-100 bg-blue-50 p-5">
        <div className="mb-3 flex size-10 items-center justify-center rounded-xl bg-blue-600 text-white">
          <ClipboardPaste className="size-5" />
        </div>
        <h2 className="font-bold text-blue-950">Validación automática</h2>
        <p className="mt-2 text-sm leading-6 text-blue-800/80">
          Las fechas se revisan en la zona US Eastern. Las cargas inválidas se
          registran como Cancelled con el motivo correspondiente.
        </p>
      </div>
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="font-bold text-slate-900">Reglas principales</h2>
        <ul className="mt-4 space-y-3 text-sm text-slate-500">
          <li className="flex gap-2">
            <MapPin className="mt-0.5 size-4 shrink-0 text-blue-600" />
            Pickup no puede ser anterior a hoy.
          </li>
          <li className="flex gap-2">
            <CalendarDays className="mt-0.5 size-4 shrink-0 text-blue-600" />
            Delivery debe tener al menos un día de diferencia.
          </li>
          <li className="flex gap-2">
            <CarFront className="mt-0.5 size-4 shrink-0 text-blue-600" />
            La carga válida aparecerá para los transportistas.
          </li>
        </ul>
      </div>
    </aside>
  );
}
