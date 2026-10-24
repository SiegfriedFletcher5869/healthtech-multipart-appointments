import { z } from "zod";
import { infrai } from "./infrai.js";

export const appointmentMediaRequest = z.object({
  appointmentId: z.string().min(1),
  patientRef: z.string().min(1),
  objectKey: z.string().regex(/^[a-z0-9/_-]+\.[a-z0-9]+$/),
  byteLength: z.number().int().positive(),
  partSize: z.number().int().positive(),
});
export type AppointmentMediaRequest = z.infer<typeof appointmentMediaRequest>;

export type UploadPlan = { appointmentId: string; patientRef: string; objectKey: string; partCount: number; notification: string };

export function planAppointmentMedia(input: unknown): UploadPlan {
  const request = appointmentMediaRequest.parse(input);
  const partCount = Math.ceil(request.byteLength / request.partSize);
  return {
    appointmentId: request.appointmentId,
    patientRef: request.patientRef,
    objectKey: request.objectKey,
    partCount,
    notification: `Media upload scheduled for appointment ${request.appointmentId}.`,
  };
}

export async function startAppointmentUpload(input: unknown, bucket: string): Promise<UploadPlan & { uploadId: string; partUrls: string[] }> {
  const plan = planAppointmentMedia(input);
  await infrai.storage.bucket.create({ name: bucket });
  const created = await infrai.storage.multipart.create(bucket, { key: plan.objectKey });
  const partUrls = await Promise.all(Array.from({ length: plan.partCount }, (_, index) =>
    infrai.storage.multipart.presign_part(created.upload_id, index + 1).then((part) => part.url),
  ));
  return { ...plan, uploadId: created.upload_id, partUrls };
}
