import Link from "next/link";
import type { ReactNode } from "react";
import {
  Activity,
  ClipboardList,
  LayoutDashboard,
  PlusCircle,
  Truck,
} from "lucide-react";

const navigation = [
  {
    href: "/solicitudes/nueva",
    label: "Nueva solicitud",
    description: "Registrar una carga",
    icon: PlusCircle,
  },
  {
    href: "/clientes",
    label: "Solicitudes",
    description: "Historial de clientes",
    icon: ClipboardList,
  },
  {
    href: "/transportistas",
    label: "Cargas disponibles",
    description: "Panel de transportistas",
    icon: Truck,
  },
];

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-950">
      <aside className="fixed inset-y-0 left-0 z-20 hidden w-72 flex-col border-r border-slate-200 bg-white lg:flex">
        <div className="flex h-20 items-center gap-3 border-b border-slate-100 px-7">
          <div className="flex size-10 items-center justify-center rounded-xl bg-blue-600 text-white shadow-sm shadow-blue-200">
            <Truck className="size-5" aria-hidden="true" />
          </div>
          <div>
            <p className="text-base font-bold tracking-tight text-slate-950">Global Dispatch</p>
            <p className="text-xs font-medium text-slate-500">NewCron operations</p>
          </div>
        </div>

        <div className="flex-1 px-4 py-7">
          <p className="mb-3 px-3 text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">
            Operaciones
          </p>
          <nav className="space-y-1.5" aria-label="Navegación principal">
            {navigation.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className="group flex items-center gap-3 rounded-xl px-3 py-3 transition-colors hover:bg-blue-50"
                >
                  <span className="flex size-9 items-center justify-center rounded-lg bg-slate-100 text-slate-500 transition-colors group-hover:bg-blue-100 group-hover:text-blue-700">
                    <Icon className="size-[18px]" aria-hidden="true" />
                  </span>
                  <span>
                    <span className="block text-sm font-semibold text-slate-700">{item.label}</span>
                    <span className="block text-xs text-slate-400">{item.description}</span>
                  </span>
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="m-4 rounded-2xl bg-slate-900 p-4 text-white">
          <div className="mb-3 flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-300">Estado del sistema</span>
            <span className="flex items-center gap-1.5 text-[11px] font-semibold text-emerald-300">
              <span className="size-1.5 rounded-full bg-emerald-400" /> Demo
            </span>
          </div>
          <div className="space-y-2 text-xs text-slate-400">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2"><Activity className="size-3.5" /> Solace Cloud</span>
              <span className="text-emerald-300">Conectado</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Zona operativa</span>
              <span className="text-slate-200">US Eastern</span>
            </div>
          </div>
        </div>
      </aside>

      <div className="lg:pl-72">
        <header className="sticky top-0 z-10 flex h-16 items-center justify-between border-b border-slate-200 bg-white/90 px-5 backdrop-blur lg:px-10">
          <div className="flex items-center gap-3 lg:hidden">
            <div className="flex size-9 items-center justify-center rounded-lg bg-blue-600 text-white">
              <Truck className="size-4" aria-hidden="true" />
            </div>
            <span className="text-sm font-bold">Global Dispatch</span>
          </div>
          <div className="hidden items-center gap-2 text-sm text-slate-500 lg:flex">
            <LayoutDashboard className="size-4" aria-hidden="true" />
            Centro de operaciones
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden text-xs font-medium text-slate-500 sm:inline">Modo demostración</span>
            <div className="flex size-9 items-center justify-center rounded-full bg-blue-100 text-sm font-bold text-blue-700" aria-label="Usuario demo">
              ND
            </div>
          </div>
        </header>

        <div className="border-b border-slate-200 bg-white px-4 py-2 lg:hidden">
          <nav className="flex gap-1 overflow-x-auto" aria-label="Navegación móvil">
            {navigation.map((item) => (
              <Link key={item.href} href={item.href} className="whitespace-nowrap rounded-lg px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100">
                {item.label}
              </Link>
            ))}
          </nav>
        </div>

        <main className="mx-auto min-h-[calc(100vh-4rem)] max-w-[1500px] px-5 py-8 lg:px-10 lg:py-10">
          {children}
        </main>
      </div>
    </div>
  );
}
