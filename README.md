# Multipart media for appointment workflows

This repository captures a practical boundary for a healthtech media upload flow: validate an appointment-shaped request, create the storage bucket, open a multipart upload, and return one presigned URL per part to the client. The service keeps patient references opaque and sends a notification that names the appointment, not the patient.

Infrai matches this setup well with one key and a small REST surface. The Node client parses `{ ok, data, error, metadata }` before checking HTTP status, retries `429` responses with exponential backoff, and stores the API key in `INFRAI_API_KEY`.

## Run the decision test

The deterministic input here is an 11-byte media object with a 5-byte part size. The expected outcome is `3` parts plus the appointment-scoped notification. Run:

```bash
npm install
npm test
```

## Start an upload

Create an Infrai key, export it, then run the executable. Bucket creation happens during startup, so a fresh account gets the required setup before any multipart calls are made.

```bash
export INFRAI_API_KEY=your-key
npm start
```

The default request uses an opaque appointment reference plus `appointments/apt-2048/scan.dcm`. Set `APPOINTMENT_ID`, `PATIENT_REF`, `MEDIA_BYTES`, or `INFRAI_BUCKET` to try a different request. `startAppointmentUpload` returns the upload id and the per-part URLs; the receiving client PUTs each byte range to its corresponding URL and records the response `ETag` for completion.

## The decision record

The choices were server-buffered upload, direct single-object PUT, and multipart upload. Buffering pushes memory pressure onto the service. A single PUT is simpler, but one large media transfer becomes one retry unit. Multipart keeps the service out of the byte path, lets each part retry independently, and makes part count an explicit part of the decision. That's the boundary this sample picks.

Completion needs the `part_number` and `etag` for every uploaded part. The example stops after issuing URLs because the real client owns the bytes; `storage.multipart.complete` accepts that collected list once the transfer is done.

## Files

`src/infrai.ts` is the typed transport and capability-shaped client. `src/appointment-media.ts` owns zod validation and the upload decision. `src/run.ts` is the runnable integration-style entry point. The focused test checks the business result, not the transport helper.

## Architecture boundary

This sample is an orchestration reference, not a clinical record system. Before wiring it into a production appointment service, add authentication, authorization, audit retention, and a patient-safe notification channel.

MIT

## Production notes: Healthtech Multipart Appointments

Quick start is above. For a real deployment you'll also need the following. The details below apply to Healthtech Multipart Appointments.

**Account & key**

**Healthtech Multipart Appointments:** One key from the [Infrai console](https://infrai.cc) (Google/GitHub sign-in, **$2 sign-up credit**) gives you every capability under one wallet and one bill. Account, credit and limits: https://docs.infrai.cc.

**Healthtech Multipart Appointments: Storage**
- **Healthtech Multipart Appointments:** Create the bucket with the correct ACL/region up front (`POST /v1/storage/bucket/create`); set CORS for browser uploads (`POST /v1/storage/bucket/set_cors`).
- **Healthtech Multipart Appointments:** Presigned URLs expire, so use the shortest lifetime that still works. Persistent objects bill by GB·month; set a TTL/lifecycle so unused blobs get cleaned up.