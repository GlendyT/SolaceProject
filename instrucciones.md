PROYECTO GLOBAL DISPATCH
Descripción
La empresa “NewCron” tiene un sistema que conecta a transportistas de car haulers con predios
de automóviles, las operaciones se llevan a cabo en Estados Unidos. NewCron recibe solicitudes
de sus clientes que son usualmente dueños de predios de autómoviles donde comentan que han
comprado nuevos automóviles en subastas y por tanto necesitan de conductores de car haulers
para transportar las compras realizadas.
La solicitud viene en el siguiente payload:
{
 "shipperOrderId": "6600111",
 "pickupDate": "2026-09-21",
 "deliveryDate": "2026-09-22",
 "price": 900,
 "stops": [
 {
 "stopNumber": 1,
 "city": "Milford",
 "state": "MA",
 "postalCode": "01757"
 },
 {
 "stopNumber": 2,
 "city": "Shippensburg",
 "state": "PA",
 "postalCode": "17257"
 }
 ],
 "vehicles": [
 {
 "year": "2010",
 "make": "Toyota",
 "model": "Corolla"
 }
 ]
 "transportationReleaseNotes": "Verify the pickup date; shipments cannot be delivered after 3:00
p.m. on the current date or on previous days."
}
Nota: Antes de conectarse con los conductores de car haulers, NewCron revisa el payload para
verificar que la fecha de pick-up no sea anterior a la fecha de hoy, por otro lado si la fecha de
pick-up coincide con la de hoy debe verificarse que al momento de recibir el payload de solicitud
no sea después de las 3 pm porque ningún chofer se puede comprometer a recoger el auto en el
mismo día que recibió la solicitud y menos si queda tiempo. Por otro lado, la fecha de delivery
debe ser en principio mayor que la de pick-up a su vez debe haber por lo menos un día de
diferencia.
Una vez validadas las condiciones anteriores se debe enviar este payload a una cola en Solace
donde estén todos los pedidos que tengan un correcto payload, en esta cola debe haber un
programa que simule una especie de dashboard para transportistas que muestre todos los pedidos
disponibles para que uno de ellos acepte la carga.
Para los clientes que mandaron su solicitud de carga también pueden ir a un apartado donde
verán todas las solicitudes de carga. Este apartado se conecta a otra cola en Solace donde estarán
todos los resultados de las solicitudes enviadas por clientes. Si la solicitud fue aceptada por el
sistema verán un payload como este:
{
 "shipperOrderId": "6600111",
 "status": "Accepted",
 "notes": "You will receive an email when a carrier accepts this dispatch request"
}
Si la solicitud fue cancelada es debido a que el payload original no es válido, ya sea por fecha de
pick-up o de delivery. Un ejemplo de payload para este caso es:
{
 "shipperOrderId": "7743789",
 "status": "Cancelled",
 "notes": "Pickup date cannot be earlier than the current date."
}
Requerimientos
• La elección de los lenguajes de programación y frameworks quedan a disposición de cada
persona.
• Los programas pueden ser en consola o requerir de una interfaz de usuario básica para
mostrar los estados en tiempo real de cada solicitud.
• El bróker de mensajería que debe usarse debe ser Solace, ya sea su edición software o su
edición cloud, según convenga.
• Los nombres de colas y tópicos quedan a discreción de cada persona, siempre recordando
las buenas prácticas de Solace.
Entrega

Fecha y hora límite: Domingo 27 de septiembre a las 23:55 horas.
Formato de entrega: Envío del comprobante o enlace al repositorio de código (GitHub) donde
se encuentre la solución completa y su documentación (README.md)