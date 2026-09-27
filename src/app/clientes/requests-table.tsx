"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowUpRight, CalendarDays, FileCode, RefreshCw, Search } from "lucide-react";
import { StatusBadge } from "@/components/status-badge";
import { PayloadModal } from "@/components/payload-modal";

type RequestRow = {
  shipperOrderId: string;
  pickupDate: string | null;
  deliveryDate: string | null;
  status: "Accepted" | "Cancelled" | "Pending";
  notes: string;
  pickupCity: string | null;
  pickupState: string | null;
  deliveryCity: string | null;
  deliveryState: string | null;
  rawPayload?: unknown;
  totalCount: number;
  acceptedCount: number;
  pendingCount: number;
};

function formatDate(value: string | null) {
  if (!value) return "Pendiente";
  const isoValue = /^\d{4}-\d{2}-\d{2}$/.test(value)
    ? `${value}T00:00:00Z`
    : value;
  const date = new Date(isoValue);
  if (Number.isNaN(date.getTime())) return "Fecha inválida";
  return new Intl.DateTimeFormat("es-MX", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}
function badgeStatus(
  status: RequestRow["status"],
): "accepted" | "cancelled" | "pending" {
  return status === "Accepted"
    ? "accepted"
    : status === "Cancelled"
      ? "cancelled"
      : "pending";
}

export function RequestsTable() {
  const [requests, setRequests] = useState<RequestRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [selectedPayload, setSelectedPayload] = useState<{
    title: string;
    subtitle?: string;
    data: unknown;
  } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/dispatch-requests", {
        cache: "no-store",
      });
      const body = (await response.json()) as {
        requests?: RequestRow[];
        error?: string;
      };
      if (!response.ok)
        throw new Error(body.error ?? "No fue posible cargar las solicitudes.");
      setRequests(body.requests ?? []);
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "No fue posible cargar las solicitudes.",
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
  const filtered = requests.filter((request) =>
    `${request.shipperOrderId} ${request.pickupCity ?? ""} ${request.deliveryCity ?? ""}`
      .toLowerCase()
      .includes(query.toLowerCase()),
  );
  const stats = requests[0] ?? {
    totalCount: 0,
    acceptedCount: 0,
    pendingCount: 0,
  };

  return (
    <>
      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <div className="stat-card">
          <span>Total solicitudes</span>
          <strong>{stats.totalCount}</strong>
          <small>Desde PostgreSQL</small>
        </div>
        <div className="stat-card">
          <span>Aceptadas</span>
          <strong className="text-emerald-600">{stats.acceptedCount}</strong>
          <small>Resultado confirmado</small>
        </div>
        <div className="stat-card">
          <span>En revisión</span>
          <strong className="text-amber-600">{stats.pendingCount}</strong>
          <small>Esperando worker</small>
        </div>
      </div>
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-4 border-b border-slate-100 p-5 md:flex-row md:items-center md:justify-between">
          <div className="relative w-full md:max-w-xs">
            <Search className="field-icon" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              aria-label="Buscar solicitudes"
              placeholder="Buscar por order ID o ciudad"
              className="field pl-10"
            />
          </div>
          <button
            onClick={() => void load()}
            disabled={loading}
            className="button-secondary"
          >
            <RefreshCw className={`size-4 ${loading ? "animate-spin" : ""}`} />
            Actualizar
          </button>
        </div>
        {error && (
          <div
            role="alert"
            className="m-5 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800"
          >
            {error}
          </div>
        )}
        {loading && !requests.length ? (
          <div className="p-12 text-center text-sm text-slate-500">
            Cargando solicitudes...
          </div>
        ) : !filtered.length ? (
          <div className="p-12 text-center">
            <p className="font-semibold text-slate-800">
              {query
                ? "No encontramos coincidencias."
                : "Aún no hay solicitudes."}
            </p>
            <p className="mt-1 text-sm text-slate-500">
              Las solicitudes nuevas aparecerán aquí después de enviarlas.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left">
              <thead className="bg-slate-50 text-xs font-bold uppercase tracking-wider text-slate-400">
                <tr>
                  <th className="px-6 py-4">Order ID</th>
                  <th className="px-6 py-4">Ruta</th>
                  <th className="px-6 py-4">Fechas</th>
                  <th className="px-6 py-4">Estado</th>
                  <th className="px-6 py-4">
                    <span className="sr-only">Acción</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((request) => (
                  <tr
                    key={request.shipperOrderId}
                    className="group hover:bg-slate-50/80"
                  >
                    <td className="px-6 py-5">
                      <span className="font-bold text-slate-900">
                        #{request.shipperOrderId}
                      </span>
                      <span className="mt-1 block text-xs text-slate-400">
                        NewCron
                      </span>
                    </td>
                    <td className="px-6 py-5">
                      <span className="block text-sm font-semibold text-slate-700">
                        {request.pickupCity}, {request.pickupState} →{" "}
                        {request.deliveryCity}, {request.deliveryState}
                      </span>
                      <span className="mt-1 block max-w-xs truncate text-xs text-slate-400">
                        {request.notes}
                      </span>
                    </td>
                    <td className="px-6 py-5">
                      <span className="flex items-center gap-2 text-sm text-slate-600">
                        <CalendarDays className="size-4 text-slate-400" />
                        {formatDate(request.pickupDate)} –{" "}
                        {formatDate(request.deliveryDate)}
                      </span>
                    </td>
                    <td className="px-6 py-5">
                      <StatusBadge status={badgeStatus(request.status)} />
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            setSelectedPayload({
                              title: `Solicitud #${request.shipperOrderId}`,
                              subtitle: `Estado: ${request.status} | ${request.pickupCity ?? ""}, ${request.pickupState ?? ""} → ${request.deliveryCity ?? ""}, ${request.deliveryState ?? ""}`,
                              data: {
                                status: request.status,
                                notes: request.notes,
                                ...(typeof request.rawPayload === "object" && request.rawPayload !== null
                                  ? (request.rawPayload as Record<string, unknown>)
                                  : {
                                      shipperOrderId: request.shipperOrderId,
                                      pickupDate: request.pickupDate,
                                      deliveryDate: request.deliveryDate,
                                    }),
                              },
                            })
                          }
                          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-600 hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700 transition-colors cursor-pointer"
                          title="Ver payload de la solicitud"
                        >
                          <FileCode className="size-3.5" />
                          <span>Payload</span>
                        </button>
                        <Link
                          href={`/clientes/${encodeURIComponent(request.shipperOrderId)}`}
                          aria-label={`Ver solicitud ${request.shipperOrderId}`}
                          className="flex size-8 items-center justify-center rounded-lg text-slate-400 hover:bg-blue-50 hover:text-blue-600"
                        >
                          <ArrowUpRight className="size-4" />
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

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
