import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { RequestsTable } from "./requests-table";

export default function ClientsPage() {
  return (
    <>
      <PageHeader
        eyebrow="Vista de cliente"
        title="Solicitudes de carga"
        description="Consulta el estado de las solicitudes enviadas y las notificaciones generadas por el sistema."
        action={
          <Link href="/solicitudes/nueva" className="button-primary">
            <span>+</span>Nueva solicitud
          </Link>
        }
      />
      <RequestsTable />
    </>
  );
}
