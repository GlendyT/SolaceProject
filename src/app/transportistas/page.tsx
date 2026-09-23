import { SlidersHorizontal } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { AvailableDispatches } from "./available-dispatches";

export default function CarriersPage() {
  return <><PageHeader eyebrow="Panel de transportistas" title="Cargas disponibles" description="Revisa las cargas validadas que esperan ser aceptadas por un transportista." action={<button className="button-secondary"><SlidersHorizontal className="size-4" />Filtros</button>} /><AvailableDispatches /></>;
}
