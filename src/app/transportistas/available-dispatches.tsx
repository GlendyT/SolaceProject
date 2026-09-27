"use client";

import { useCallback, useEffect, useState } from "react";
import {
  ArrowRight,
  Ban,
  CalendarDays,
  DollarSign,
  FileCode,
  MapPin,
  Package,
  RefreshCw,
  Truck,
} from "lucide-react";
import { toast } from "sonner";
import { PayloadModal } from "@/components/payload-modal";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

type Stop = { city: string; state: string; postalCode: string };
type Dispatch = {
  shipperOrderId: string;
  payload: {
    pickupDate: string;
    deliveryDate: string;
    price: number;
    stops: Stop[];
    vehicles: unknown[];
  };
  assignmentStatus: string;
  createdAt: string;
};

function date(value: string) {
  const parsed = new Date(value.length === 10 ? `${value}T00:00:00Z` : value);
  return Number.isNaN(parsed.getTime())
    ? "Fecha inválida"
    : new Intl.DateTimeFormat("es-MX", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        timeZone: "UTC",
      }).format(parsed);
}

export function AvailableDispatches() {
  const [dispatches, setDispatches] = useState<Dispatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [assigning, setAssigning] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState<string | null>(null);
  const [orderToCancel, setOrderToCancel] = useState<string | null>(null);
  const [selectedPayload, setSelectedPayload] = useState<{
    title: string;
    subtitle?: string;
    data: unknown;
  } | null>(null);
  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/available-dispatches", {
        cache: "no-store",
      });
      const body = (await response.json()) as {
        dispatches?: Dispatch[];
        error?: string;
      };
      if (!response.ok)
        throw new Error(body.error ?? "No fue posible cargar las cargas.");
      setDispatches(body.dispatches ?? []);
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "No fue posible cargar las cargas.",
      );
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    const initial = window.setTimeout(() => {
      void load();
    }, 0);
    const interval = window.setInterval(() => {
      void load();
    }, 2_000);
    return () => {
      window.clearTimeout(initial);
      window.clearInterval(interval);
    };
  }, [load]);

  async function assign(shipperOrderId: string) {
    setAssigning(shipperOrderId);
    setError(null);
    try {
      const response = await fetch(
        `/api/dispatch-requests/${encodeURIComponent(shipperOrderId)}/assign`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ carrierId: "demo-carrier-1" }),
        },
      );
      const body = (await response.json()) as { error?: string };
      if (!response.ok)
        throw new Error(body.error ?? "No fue posible aceptar la carga.");
      toast.success(`Carga #${shipperOrderId} aceptada con éxito.`);
      setDispatches((current) =>
        current.filter((item) => item.shipperOrderId !== shipperOrderId),
      );
    } catch (reason) {
      const message =
        reason instanceof Error
          ? reason.message
          : "No fue posible aceptar la carga.";
      setError(message);
      toast.error(message);
    } finally {
      setAssigning(null);
    }
  }

  async function executeCancel(shipperOrderId: string) {
    setCancelling(shipperOrderId);
    setError(null);
    try {
      const response = await fetch(
        `/api/dispatch-requests/${encodeURIComponent(shipperOrderId)}/cancel`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ reason: "Cancelada por el transportista." }),
        },
      );
      const body = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(body.error ?? "No fue posible cancelar la carga.");
      }
      toast.success(`Carga #${shipperOrderId} cancelada correctamente.`);
      setDispatches((current) =>
        current.filter((item) => item.shipperOrderId !== shipperOrderId),
      );
      setOrderToCancel(null);
    } catch (reason) {
      const message =
        reason instanceof Error
          ? reason.message
          : "No fue posible cancelar la carga.";
      setError(message);
      toast.error(message);
    } finally {
      setCancelling(null);
    }
  }

  return (
    <>
      <div className="mb-7 flex items-center justify-between rounded-2xl border border-emerald-100 bg-emerald-50 px-5 py-4">
        <div className="flex items-center gap-3">
          <span className="flex size-9 items-center justify-center rounded-full bg-emerald-500 text-white">
            <Truck className="size-4" />
          </span>
          <div>
            <p className="text-sm font-bold text-emerald-950">
              Cola de cargas conectada
            </p>
            <p className="text-xs text-emerald-800/75">
              Las nuevas cargas aparecen cuando el worker las procesa.
            </p>
          </div>
        </div>
        <button
          onClick={() => void load()}
          disabled={loading}
          className="button-secondary border-emerald-200 bg-white/60"
        >
          <RefreshCw className={`size-4 ${loading ? "animate-spin" : ""}`} />
          Actualizar
        </button>
      </div>
      {error && (
        <div
          role="alert"
          className="mb-6 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800"
        >
          {error}
        </div>
      )}
      {loading && !dispatches.length ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center text-sm text-slate-500">
          Cargando cargas disponibles...
        </div>
      ) : !dispatches.length ? (
        <div className="rounded-2xl border border-dashed border-slate-300 p-12 text-center">
          <Package className="mx-auto size-7 text-slate-400" />
          <h2 className="mt-3 font-bold text-slate-800">
            No hay cargas disponibles
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Las cargas aceptadas aparecerán aquí cuando el worker termine de
            procesarlas.
          </p>
        </div>
      ) : (
        <div className="grid gap-5 xl:grid-cols-2">
          {dispatches.map((dispatch) => {
            const [from, to] = dispatch.payload.stops;
            return (
              <article
                key={dispatch.shipperOrderId}
                className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition-shadow hover:shadow-md"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <span className="rounded-md bg-blue-50 px-2 py-1 text-xs font-bold text-blue-700">
                      #{dispatch.shipperOrderId}
                    </span>
                    <h2 className="mt-4 text-lg font-bold text-slate-900">
                      {from?.city}, {from?.state}{" "}
                      <span className="mx-1 text-slate-300">→</span> {to?.city},{" "}
                      {to?.state}
                    </h2>
                  </div>
                  <div className="rounded-xl bg-emerald-50 px-3 py-2 text-right">
                    <span className="flex items-center justify-end gap-1 text-lg font-bold text-emerald-700">
                      <DollarSign className="size-4" />
                      {dispatch.payload.price.toFixed(2)}
                    </span>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700/70">
                      USD total
                    </span>
                  </div>
                </div>
                <div className="my-6 grid grid-cols-2 gap-3 border-y border-slate-100 py-4">
                  <div className="flex items-center gap-2 text-sm text-slate-600">
                    <CalendarDays className="size-4 text-blue-500" />
                    {date(dispatch.payload.pickupDate)} →{" "}
                    {date(dispatch.payload.deliveryDate)}
                  </div>
                  <div className="flex items-center gap-2 text-sm text-slate-600">
                    <Package className="size-4 text-blue-500" />
                    {dispatch.payload.vehicles.length} vehículo(s)
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2 text-xs text-slate-500">
                    <MapPin className="size-3.5" />
                    {dispatch.payload.stops.length} paradas
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        setSelectedPayload({
                          title: `Carga disponible #${dispatch.shipperOrderId}`,
                          subtitle: `${from?.city}, ${from?.state} → ${to?.city}, ${to?.state} | $${dispatch.payload.price.toFixed(2)} USD`,
                          data: dispatch.payload,
                        })
                      }
                      className="button-secondary text-xs cursor-pointer py-2 px-3"
                    >
                      <FileCode className="size-3.5" />
                      Payload
                    </button>
                    <button
                      type="button"
                      onClick={() => setOrderToCancel(dispatch.shipperOrderId)}
                      disabled={
                        cancelling === dispatch.shipperOrderId ||
                        assigning === dispatch.shipperOrderId
                      }
                      className="inline-flex items-center gap-1 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-bold text-rose-700 hover:bg-rose-100 hover:border-rose-300 disabled:cursor-not-allowed disabled:opacity-60 transition-colors cursor-pointer"
                      title="Cancelar esta carga"
                    >
                      <Ban className="size-3.5" />
                      {cancelling === dispatch.shipperOrderId
                        ? "Cancelando..."
                        : "Cancelar"}
                    </button>
                    <button
                      onClick={() => void assign(dispatch.shipperOrderId)}
                      disabled={
                        assigning === dispatch.shipperOrderId ||
                        cancelling === dispatch.shipperOrderId
                      }
                      className="button-primary disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer text-xs py-2"
                    >
                      {assigning === dispatch.shipperOrderId
                        ? "Aceptando..."
                        : "Aceptar carga"}{" "}
                      <ArrowRight className="size-4" />
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      <ConfirmDialog
        isOpen={Boolean(orderToCancel)}
        onClose={() => setOrderToCancel(null)}
        onConfirm={() => {
          if (orderToCancel) {
            void executeCancel(orderToCancel);
          }
        }}
        title="¿Cancelar esta carga?"
        description={`¿Estás seguro de que deseas cancelar la carga #${orderToCancel}? Esta acción rechazará la carga y actualizará el estado de la solicitud para el cliente.`}
        confirmText="Sí, cancelar carga"
        cancelText="Volver"
        isDestructive
        loading={Boolean(cancelling)}
      />

      <PayloadModal
        isOpen={Boolean(selectedPayload)}
        onClose={() => setSelectedPayload(null)}
        title={selectedPayload?.title ?? "Payload"}
        subtitle={selectedPayload?.subtitle}
        payload={selectedPayload?.data}
      />
    </>
  );
}
