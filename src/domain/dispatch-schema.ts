import { z } from "zod";

const datePattern = /^\d{4}-\d{2}-\d{2}$/;
const postalCodePattern = /^\d{5}(?:-\d{4})?$/;

export const stopSchema = z.object({
  stopNumber: z.number().int().positive(),
  city: z.string().trim().min(1).max(100),
  state: z.string().trim().regex(/^[A-Za-z]{2}$/).transform((value) => value.toUpperCase()),
  postalCode: z.string().trim().regex(postalCodePattern),
});

export const vehicleSchema = z.object({
  year: z.string().trim().regex(/^\d{4}$/),
  make: z.string().trim().min(1).max(60),
  model: z.string().trim().min(1).max(80),
});

export const dispatchRequestSchema = z.object({
  shipperOrderId: z.string().trim().min(1).max(64).regex(/^[A-Za-z0-9_-]+$/, "Order ID may only contain letters, numbers, hyphens, and underscores."),
  pickupDate: z.string().regex(datePattern),
  deliveryDate: z.string().regex(datePattern),
  price: z.number().positive().finite(),
  stops: z.array(stopSchema).min(2),
  vehicles: z.array(vehicleSchema).min(1),
  transportationReleaseNotes: z.string().trim().max(2000).optional().default(""),
}).superRefine((payload, context) => {
  const numbers = payload.stops.map((stop) => stop.stopNumber);
  const uniqueNumbers = new Set(numbers);
  if (uniqueNumbers.size !== numbers.length) {
    context.addIssue({ code: "custom", path: ["stops"], message: "Stop numbers must be unique." });
  }
  if (numbers.some((number, index) => number !== index + 1)) {
    context.addIssue({ code: "custom", path: ["stops"], message: "Stop numbers must start at 1 and be consecutive." });
  }
});

export type DispatchRequest = z.infer<typeof dispatchRequestSchema>;
export type DispatchStop = z.infer<typeof stopSchema>;
export type DispatchVehicle = z.infer<typeof vehicleSchema>;

export const dispatchResultSchema = z.object({
  shipperOrderId: z.string().min(1),
  status: z.enum(["Accepted", "Cancelled"]),
  notes: z.string().min(1),
});

export type DispatchResult = z.infer<typeof dispatchResultSchema>;

export type DispatchValidationResult =
  | { ok: true; status: "Accepted"; payload: DispatchRequest; result: DispatchResult }
  | { ok: false; status: "Cancelled"; shipperOrderId: string; reason: string; result: DispatchResult }
  | { ok: false; status: "Invalid"; shipperOrderId: null; reason: string };
