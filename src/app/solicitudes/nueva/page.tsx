import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { RequestForm, RequestFormAside } from "./request-form";

export default function NewRequestPage() {
  return <><PageHeader eyebrow="Nueva solicitud" title="Registrar una carga" description="Ingresa los datos de transporte y el sistema validará las fechas antes de publicar la carga en Solace." action={<Link href="/clientes" className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-blue-700">Ver solicitudes <ArrowRight className="size-4" /></Link>} /><div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]"><RequestForm /><RequestFormAside /></div></>;
}
