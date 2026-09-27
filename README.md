# Global Dispatch | NewCron

Plataforma de alta confiabilidad para la gestión y despacho de solicitudes de transporte de vehículos. Implementa una arquitectura orientada a eventos con **Next.js 16**, **PostgreSQL en Neon**, **Solace Cloud** y un **Worker desacoplado con Transactional Outbox**, garantizando validación estricta de reglas de negocio, mensajería persistente y actualización atómica entre clientes y transportistas.

> 🌐 **Demo en Vivo / Live Demo:**  
> **[https://solace-project-guatemaltek.vercel.app/solicitudes/nueva](https://solace-project-guatemaltek.vercel.app/solicitudes/nueva)**  
> *Desplegado en Vercel y conectado a PostgreSQL Neon y Solace Cloud para pruebas en tiempo real.*

---

## Índice
0. [Demo en Vivo](#demo-en-vivo)
1. [Arquitectura General y Componentes](#arquitectura-general-y-componentes)
2. [¿Qué es y para qué sirve Solace Cloud?](#qué-es-y-para-qué-sirve-solace-cloud)
3. [¿Qué es y cómo funciona el Worker?](#qué-es-y-cómo-funciona-el-worker)
4. [Base de Datos y Modelo de Datos](#base-de-datos-y-modelo-de-datos)
5. [Diagramas de Flujo, UML y Secuencia](#diagramas-de-flujo-uml-y-secuencia)
6. [Casos de Uso](#casos-de-uso)
7. [Nuevas Funcionalidades y Mejoras Implementadas](#nuevas-funcionalidades-y-mejoras-implementadas)
8. [Contrato de la Solicitud y Reglas de Negocio](#contrato-de-la-solicitud-y-reglas-de-negocio)
9. [Endpoints de la API](#endpoints-de-la-api)
10. [Instalación, Migraciones y Ejecución Local](#instalación-migraciones-y-ejecución-local)

---

## Demo en Vivo

La aplicación se encuentra desplegada y operativa en Vercel:

| Módulo / Vista | Enlace de Acceso | Descripción |
|---|---|---|
| **Nueva Solicitud** | [solace-project-guatemaltek.vercel.app/solicitudes/nueva](https://solace-project-guatemaltek.vercel.app/solicitudes/nueva) | Formulario con Zippopotam.us, calendario Shadcn e inspección previa de payload. |
| **Historial Clientes** | [solace-project-guatemaltek.vercel.app/clientes](https://solace-project-guatemaltek.vercel.app/clientes) | Listado en tiempo real con estatus, notas y modal de inspección JSON de cada solicitud. |
| **Cargas Disponibles** | [solace-project-guatemaltek.vercel.app/transportistas](https://solace-project-guatemaltek.vercel.app/transportistas) | Portal de transportistas para aceptar o cancelar cargas con diálogos de confirmación Shadcn. |

---

## Arquitectura General y Componentes

```mermaid
flowchart TD
  subgraph Frontend_API ["Vercel: Next.js 16 (App Router)"]
    UI_New["/solicitudes/nueva (Formulario)"]
    UI_Hist["/clientes (Historial)"]
    UI_Carrier["/transportistas (Cargas)"]
    API_Dispatch["API: /api/dispatch-requests"]
    API_Assign["API: /api/dispatch-requests/{id}/assign"]
    API_Cancel["API: /api/dispatch-requests/{id}/cancel"]
  end

  subgraph Database ["PostgreSQL (Neon)"]
    T_Requests[("dispatch_requests")]
    T_Outbox[("outbox_events")]
    T_Available[("available_dispatches")]
    T_Results[("request_results")]
    T_Processed[("processed_events")]
  end

  subgraph Worker_Node ["Worker Node.js (Oracle Cloud VM / Local)"]
    Publisher["Publisher: Lee outbox y envía a Solace"]
    Consumer_Avail["Consumer: Procesa cola available"]
    Consumer_Res["Consumer: Procesa cola results"]
  end

  subgraph Broker_Solace ["Solace Cloud (Guaranteed Messaging)"]
    Topic_Avail["Tópico: newcron/dispatch/v1/available/*"]
    Topic_Acc["Tópico: newcron/dispatch/v1/result/accepted/*"]
    Topic_Canc["Tópico: newcron/dispatch/v1/result/cancelled/*"]
    Queue_Avail["Cola: newcron.global-dispatch.available.v1"]
    Queue_Res["Cola: newcron.global-dispatch.results.v1"]
  end

  UI_New --> API_Dispatch
  UI_Hist --> API_Dispatch
  UI_Carrier --> API_Assign
  UI_Carrier --> API_Cancel

  API_Dispatch -->|Transacción atómica: Solicitud + Outbox| T_Requests
  API_Dispatch --> T_Outbox
  API_Assign -->|Update atómico: Available -> Assigned| T_Available
  API_Cancel -->|Update atómico: Available -> Cancelled| T_Available
  API_Cancel --> T_Results

  Publisher -->|Polling continuo| T_Outbox
  Publisher -->|Publicación PERSISTENT| Broker_Solace
  Broker_Solace --> Queue_Avail
  Broker_Solace --> Queue_Res

  Queue_Avail -->|Mensajería con ACK manual| Consumer_Avail
  Queue_Res -->|Mensajería con ACK manual| Consumer_Res

  Consumer_Avail -->|Guardar proyección| T_Available
  Consumer_Avail -->|Deduplicación| T_Processed
  Consumer_Res -->|Guardar resultado| T_Results
  Consumer_Res -->|Deduplicación| T_Processed
```

---

## ¿Qué es y para qué sirve Solace Cloud?

**Solace Cloud** es un broker de mensajería empresarial de nivel corporativo que actúa como la columna vertebral de eventos distribuidos de la plataforma.

### ¿Por qué se utiliza en este proyecto?
1. **Desacoplamiento total**: El API web que recibe las solicitudes no necesita esperar a que los transportistas o sistemas externos procesen la carga; simplemente valida y despacha el evento.
2. **Mensajería Garantizada (Persistent Messaging)**: Todos los mensajes se publican con modo `PERSISTENT`. Si el worker o el servidor se reinician, los mensajes permanecen almacenados de forma segura en las colas de Solace sin pérdida de información.
3. **Enrutamiento inteligente por tópicos (Topic Hierarchy)**:
   * `newcron/dispatch/v1/available/{shipperOrderId}`: Cargas válidas que los transportistas pueden tomar.
   * `newcron/dispatch/v1/result/accepted/{shipperOrderId}`: Resultados de solicitudes aprobadas por las reglas de fechas.
   * `newcron/dispatch/v1/result/cancelled/{shipperOrderId}`: Resultados de solicitudes rechazadas con su motivo de cancelación.
4. **Colas Durables con Suscripciones**:
   * **Cola de disponibles (`newcron.global-dispatch.available.v1`)**: Suscrita a `newcron/dispatch/v1/available/*`.
   * **Cola de resultados (`newcron.global-dispatch.results.v1`)**: Suscrita a `newcron/dispatch/v1/result/*`.

---

## ¿Qué es y cómo funciona el Worker?

El **Worker** es un proceso autónomo de Node.js (diseñado para ejecutarse 24/7 en una máquina virtual o en background) que conecta PostgreSQL con Solace Cloud.

### Funciones Principales:
1. **Patrón Transactional Outbox (Publicador)**:
   * Evita el problema del doble commit distribuido (fallar al guardar en base de datos o fallar al publicar en el broker).
   * La API web guarda en una sola transacción SQL la solicitud en `dispatch_requests` y los eventos en `outbox_events`.
   * El Worker lee continuamente los registros pendientes (`published_at IS NULL`) de `outbox_events`, los envía a Solace y marca `published_at = now()` únicamente cuando el broker confirma la recepción mediante ACK.
2. **Consumo con Confirmación Manual (ACK Manual)**:
   * Los consumidores de cargas y resultados consumen las colas de Solace de forma continua.
   * **Primero se persiste** la proyección en PostgreSQL (`available_dispatches` o `request_results`).
   * **Luego se confirma** el mensaje en Solace mediante `message.acknowledge()`. Si el worker colapsa antes de guardar en la base de datos, Solace reenviará el mensaje intacto.
3. **Idempotencia y Deduplicación**:
   * Cada evento tiene un `event_id` único (UUID v4).
   * La tabla `processed_events` registra los IDs de eventos ya procesados, evitando duplicados si ocurre un reintento en la red.

---

## Base de Datos y Modelo de Datos

La persistencia se gestiona en **PostgreSQL (Neon)**. El sistema utiliza migraciones ordenadas en `/migrations`.

### Tablas:
* `dispatch_requests`: Almacena la solicitud original, fechas, precio, payload completo en JSONB (`raw_payload`), estado de validación inicial (`Accepted` o `Cancelled`) y motivo de cancelación.
* `outbox_events`: Eventos pendientes y publicados hacia Solace (`topic`, `payload`, `attempts`, `published_at`).
* `available_dispatches`: Cargas listas para ser visualizadas y tomadas por transportistas. Controla el estado de asignación: `'Available'`, `'Assigned'` o `'Cancelled'`.
* `request_results`: Proyección de estado consultable para el cliente (`Accepted` o `Cancelled`) con sus notas descriptivas.
* `processed_events`: Registro de deduplicación de eventos consumidos por el worker.

```mermaid
erDiagram
  dispatch_requests ||--o| available_dispatches : "genera si es válida"
  dispatch_requests ||--o| request_results : "genera resultado"
  dispatch_requests ||--o{ outbox_events : "publica eventos"
  processed_events }|--|| dispatch_requests : "garantiza idempotencia"

  dispatch_requests {
    text shipper_order_id PK
    date pickup_date
    date delivery_date
    numeric price
    jsonb raw_payload
    text validation_status
    text cancellation_reason
    timestamptz received_at
    timestamptz created_at
  }

  available_dispatches {
    text shipper_order_id PK, FK
    jsonb payload
    text assignment_status "Available | Assigned | Cancelled"
    text carrier_id
    timestamptz assigned_at
    timestamptz created_at
  }

  request_results {
    text shipper_order_id PK, FK
    text status "Accepted | Cancelled"
    text notes
    text event_id
    timestamptz received_at
  }

  outbox_events {
    text event_id PK
    text shipper_order_id FK
    text event_type
    text topic
    jsonb payload
    integer attempts
    timestamptz published_at
  }
```

---

## Diagramas de Flujo, UML y Secuencia

### Diagrama de Secuencia Completo (Registro, Solace, Asignación y Cancelación)

```mermaid
sequenceDiagram
  autonumber
  actor Cliente as Cliente (Web)
  participant API as Next.js API
  participant DB as Neon PostgreSQL
  participant W as Worker (Node.js)
  participant Solace as Solace Cloud
  actor Transp as Transportista (Web)

  Note over Cliente, API: 1. Registro de Solicitud
  Cliente->>API: POST /api/dispatch-requests
  API->>API: Validar reglas de fechas (US Eastern)
  API->>DB: INSERT dispatch_requests + outbox_events
  API-->>Cliente: Toast: "Solicitud recibida" o "Solicitud cancelada"

  Note over W, Solace: 2. Outbox & Publicación a Solace
  W->>DB: SELECT * FROM outbox_events WHERE published_at IS NULL
  W->>Solace: Publicar PERSISTENT en tópicos disponibles/resultados
  Solace-->>W: Confirmación de recepción (ACK)
  W->>DB: UPDATE outbox_events SET published_at = now()

  Note over Solace, W: 3. Consumo de Colas y Proyecciones
  Solace->>W: Mensaje de carga válida (Queue Available)
  W->>DB: INSERT INTO available_dispatches
  W-->>Solace: ACK manual
  Solace->>W: Mensaje de resultado (Queue Results)
  W->>DB: INSERT INTO request_results
  W-->>Solace: ACK manual

  Note over Transp, DB: 4. Interacción del Transportista
  Transp->>API: GET /api/available-dispatches
  API->>DB: SELECT FROM available_dispatches WHERE status = 'Available'
  API-->>Transp: Lista de cargas disponibles

  alt Aceptar Carga
    Transp->>API: POST /api/dispatch-requests/{id}/assign
    API->>DB: UPDATE available_dispatches SET status='Assigned' WHERE status='Available'
    DB-->>API: 1 fila modificada
    API-->>Transp: Toast: "Carga aceptada con éxito"
  else Cancelar Carga (con ConfirmDialog)
    Transp->>API: POST /api/dispatch-requests/{id}/cancel
    API->>DB: UPDATE available_dispatches SET status='Cancelled' + request_results='Cancelled'
    DB-->>API: Éxito
    API-->>Transp: Toast: "Carga cancelada correctamente"
  end
```

---

## Casos de Uso

| Actor | Caso de Uso | Descripción | Resultado en el Sistema |
| :--- | :--- | :--- | :--- |
| **Cliente** | Previsualizar Payload | Clic en *"Ver payload"* antes de enviar el formulario. | Modal con JSON estructurado en tiempo real y botón para copiar. |
| **Cliente** | Autocompletar Dirección | Digitar el ZIP Code de 5 dígitos en origen o destino. | Consulta a Zippopotam.us y autocompleta Ciudad y Estado. |
| **Cliente** | Registrar Solicitud | Envío del formulario de despacho. | Valida reglas de fechas, guarda en base de datos y encola en Outbox. Notificación vía Toast. |
| **Cliente** | Consultar Historial | Vista `/clientes` y `/clientes/[id]`. | Muestra tabla con filtros, estado (`Accepted` o `Cancelled`), notas y botón para ver el payload resultante. |
| **Transportista**| Inspeccionar Carga | Clic en *"Payload"* en cualquier tarjeta disponible. | Muestra el JSON emitido por Solace con paradas, vehículos y precios. |
| **Transportista**| Aceptar Carga | Clic en *"Aceptar carga"*. | Asignación atómica (`Assigned`) con transportista demo. La carga desaparece de disponibles. |
| **Transportista**| Cancelar Carga | Clic en *"Cancelar"* en una carga disponible. | Abre `ConfirmDialog` de shadcn. Si confirma, la carga pasa a `Cancelled` y se notifica al cliente. |
| **Worker** | Publicación Outbox | Monitoreo continuo de eventos pendientes. | Publica con modo `PERSISTENT` en Solace Cloud y marca marca temporal. |
| **Worker** | Consumo Garantizado | Lectura de colas de Solace con ACK manual. | Actualiza proyecciones PostgreSQL de forma idempotente con `processed_events`. |

---

## Nuevas Funcionalidades y Mejoras Implementadas

### 1. Sistema de Notificaciones Toast con shadcn / Sonner
* Reemplazo de los mensajes de error estáticos por toasts interactivos y accesibles.
* Validación en el cliente con `noValidate` para avisar de forma inmediata qué campo falta antes del envío.
* Toasts informativos ante respuestas del servidor (`toast.success` y `toast.error`).

### 2. Selector de Fechas con shadcn Calendar (`react-day-picker`)
* Integración de calendarios en español.
* **Regla 1 (Pickup)**: Bloqueo de fechas anteriores al día de hoy en la zona `America/New_York`.
* **Regla 2 (Delivery)**: Bloqueo de fechas que no tengan al menos un día calendario de diferencia respecto a la recogida.
* **Ajuste automático**: Si la fecha de recogida cambia y deja inválida la entrega, el sistema reinicia la fecha de entrega y emite un toast de advertencia.

### 3. Autocompletado de Códigos Postales con Zippopotam.us
* Reordenamiento del bloque de paradas: **ZIP code primero**.
* Al ingresar 5 dígitos numéricos, consulta `https://api.zippopotam.us/us/{zip}` sin requerir API keys.
* Rellena automáticamente la Ciudad y el Estado (código de 2 letras), manteniendo los campos editables.
* Indicador de carga animado (`LoaderCircle`) dentro del input.

### 4. Visualizador de Payloads en las 3 Vistas (`PayloadModal`)
* Componente modal con diseño oscuro para código (`pre` / `code`), backdrop blur y botón de copiado rápido al portapapeles.
* **En Nueva Solicitud**: Permite revisar el payload exacto antes de ser transmitido.
* **En Historial de Clientes**: Muestra el JSON de la orden incluyendo su estado final (`status: "Accepted" | "Cancelled"`) y las notas emitidas.
* **En Cargas Disponibles**: Permite al transportista inspeccionar el payload de Solace.

### 5. Cancelación de Cargas para Transportistas con `ConfirmDialog`
* Nueva migración `003_allow_cancelled_assignment_status.sql` para habilitar el estado `Cancelled`.
* Endpoint seguro `POST /api/dispatch-requests/{id}/cancel` con actualización atómica de `available_dispatches`, `request_results` y `dispatch_requests`.
* Reemplazo de `window.confirm` por un componente `ConfirmDialog` estilizado con shadcn, botones de peligro, cierre con tecla `Esc` y estados de carga.

---

## Contrato de la Solicitud y Reglas de Negocio

### Payload de Entrada:
```json
{
  "shipperOrderId": "6600111",
  "pickupDate": "2026-09-28",
  "deliveryDate": "2026-09-30",
  "price": 950.00,
  "stops": [
    { "stopNumber": 1, "city": "Milford", "state": "MA", "postalCode": "01757" },
    { "stopNumber": 2, "city": "Shippensburg", "state": "PA", "postalCode": "17257" }
  ],
  "vehicles": [
    { "year": "2020", "make": "Freightliner", "model": "Cascadia" }
  ],
  "transportationReleaseNotes": "Manejar con precaución."
}
```

### Reglas de Validación (Zona `America/New_York`):
1. **Pickup**: No puede ser anterior a la fecha actual.
2. **Same-day Cutoff (15:00 Eastern)**: Si la recogida es hoy, la solicitud debe recibirse a las 15:00:00 o antes. Si se recibe a las 15:00:01 o después, se marca como `Cancelled`.
3. **Delivery**: Debe ser al menos un día calendario posterior a la fecha de pickup.
4. **Validaciones de estructura**: Precios mayores a 0, códigos postales válidos, paradas ordenadas y al menos un vehículo.

---

## Endpoints de la API

| Método | Endpoint | Descripción | Respuestas |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/dispatch-requests` | Valida y guarda la solicitud en base de datos y outbox. | `202 Accepted` / `400 Bad Request` / `409 Conflict` |
| `GET` | `/api/dispatch-requests` | Lista el historial con proyecciones y `rawPayload`. | `200 OK` / `500 Error` |
| `GET` | `/api/dispatch-requests/{id}` | Retorna el detalle completo y estado de asignación. | `200 OK` / `404 Not Found` |
| `GET` | `/api/available-dispatches` | Lista cargas disponibles para transportistas. | `200 OK` / `500 Error` |
| `POST` | `/api/dispatch-requests/{id}/assign` | Acepta una carga de forma atómica. | `200 OK` / `404 Not Found` / `409 Conflict` |
| `POST` | `/api/dispatch-requests/{id}/cancel` | Cancela/rechaza una carga disponible. | `200 OK` / `404 Not Found` / `409 Conflict` |

---

## Instalación, Migraciones y Ejecución Local

### 1. Clonar el repositorio e instalar dependencias:
```bash
git clone https://github.com/GlendyT/SolaceProject.git
cd SolaceProject
pnpm install
```

### 2. Configurar variables de entorno:
Copiar `.env.example` a `.env`:
```bash
cp .env.example .env
```
Asegurar que `DATABASE_URL` contenga la cadena de conexión de Neon y las credenciales de Solace Cloud:
```dotenv
DATABASE_URL=postgresql://neondb_owner:...@...neon.tech/neondb?sslmode=require
BUSINESS_TIME_ZONE=America/New_York

SOLACE_URL=wss://...messaging.solace.cloud:443
SOLACE_VPN=...
SOLACE_USERNAME=...
SOLACE_PASSWORD=...
SOLACE_QUEUE_AVAILABLE=newcron.global-dispatch.available.v1
SOLACE_QUEUE_RESULTS=newcron.global-dispatch.results.v1
SOLACE_TOPIC_PREFIX=newcron/dispatch/v1
```

### 3. Ejecutar migraciones de Base de Datos:
```bash
pnpm run db:init
```

### 4. Ejecutar la aplicación en desarrollo:
```bash
# Terminal 1: Aplicación Web Next.js
pnpm dev

# Terminal 2: Worker de Solace y Outbox
pnpm run worker:dev
```

### 5. Pruebas y verificación de tipos:
```bash
pnpm run typecheck
pnpm run test
```
