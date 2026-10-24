import assert from "node:assert/strict";
import { planAppointmentMedia } from "./appointment-media.js";

const result = planAppointmentMedia({
  appointmentId: "apt-7",
  patientRef: "patient-opaque-2",
  objectKey: "appointments/apt-7/audio.wav",
  byteLength: 11,
  partSize: 5,
});
assert.equal(result.partCount, 3);
assert.equal(result.notification, "Media upload scheduled for appointment apt-7.");
console.log("appointment media decision: 11 bytes at 5 bytes per part -> 3 parts");
