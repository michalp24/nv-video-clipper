# Notes

## 2026-01-21
- Goal: Upload → select 3–6s → export MP4 at fixed sizes.
- Decisions:
  - Vercel for UI + API
  - R2 for object storage
  - Upstash Redis for queue + status
  - Worker on Cloud Run for FFmpeg
- Open Questions:
  - Public vs signed download URLs?
  - Max upload size?