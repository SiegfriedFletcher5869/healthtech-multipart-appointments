import { startAppointmentUpload } from "./appointment-media.js";

const appointmentId = process.env.APPOINTMENT_ID ?? "apt-2048";
const input = {
  appointmentId,
  patientRef: process.env.PATIENT_REF ?? "patient-opaque-17",
  objectKey: `appointments/${appointmentId}/scan.dcm`,
  byteLength: Number(process.env.MEDIA_BYTES ?? 12000000),
  partSize: 5000000,
};
const result = await startAppointmentUpload(input, process.env.INFRAI_BUCKET ?? "healthtech-media");
console.log(JSON.stringify(result, null, 2));
