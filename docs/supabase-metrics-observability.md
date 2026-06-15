# Supabase Metrics Observability

This runbook adds Supabase Metrics API monitoring as an operator-only observability lane for Mochirii and the future Mochi Social site integration. It does not add player-facing UI, schema changes, Edge Function changes, game-runtime changes, provider mutations, or log drains.

Official references:

- Supabase Metrics API: <https://supabase.com/docs/guides/telemetry/metrics>
- Grafana Cloud setup: <https://supabase.com/docs/guides/telemetry/metrics/grafana-cloud>
- Prometheus and Grafana self-hosted setup: <https://supabase.com/docs/guides/telemetry/metrics/grafana-self-hosted>
- Vendor-neutral collector setup: <https://supabase.com/docs/guides/telemetry/metrics/vendor-agnostic>
- Supabase Log Drains: <https://supabase.com/docs/guides/telemetry/log-drains>

## Purpose

Supabase remains the authority for Mochirii Auth, Postgres, RLS, Storage, Edge Functions, Discord verification, tester gates, feedback, admin, and the Mochi Social alpha ledger. Metrics API monitoring should help operators see database, connection, WAL, CPU, IO, and health trends before tester sessions or public traffic spikes become incidents.

The Metrics API is currently in beta. Metric names and labels may change, and the feature is available for hosted Supabase projects, not self-hosted Supabase instances. Treat dashboards and alerts as operator evidence, not as gameplay state or release guarantees.

## Project Endpoint Map

Production Supabase project:

```text
Project ref: deyvmtncimmcinldjyqe
Metrics endpoint: https://deyvmtncimmcinldjyqe.supabase.co/customer/v1/privileged/metrics
```

Preview project refs must be verified from the current Supabase dashboard or CLI before configuration. Do not assume an older preview ref is still active.

## Security Boundary

- The Metrics API is Prometheus-compatible and uses HTTP Basic Auth.
- Use `service_role` as the Basic Auth username and a dedicated Supabase Secret API key such as the documented `sb_secret_...` key class as the password for metrics automation.
- Store the Secret API key only in Grafana Cloud, a private Prometheus secret manager, or another approved operator secret store.
- Never place metrics credentials in `NEXT_PUBLIC_*`, browser code, the Mochi Social game runtime, Vercel public env vars, screenshots, PR text, reports, Discord, or chat.
- Do not use Supabase service-role keys for ordinary metrics collection when a dedicated Secret API key is available.
- Rotate the dedicated Secret API key if it appears in any public place or untrusted log.

Mochi Social may consume Supabase-backed auth/allowlist/terms/feedback/ledger behavior through documented Edge Function contracts, but the game runtime must not scrape Supabase metrics or hold metrics credentials.

## Collector Options

Recommended first managed path: Grafana Cloud. It can scrape the Supabase Metrics API with the project ref, endpoint, HTTP Basic Auth credentials, and a 1 minute scrape interval. Creating or changing Grafana Cloud resources is an external provider action and needs action-time approval if it can affect quota or billing.

Local or self-hosted path: Prometheus plus Grafana. Prometheus should scrape once every 60 seconds with this shape:

```yaml
scrape_configs:
  - job_name: "supabase"
    scrape_interval: 60s
    metrics_path: /customer/v1/privileged/metrics
    scheme: https
    basic_auth:
      username: service_role
      password: "<secret API key (sb_secret_...)>"
    static_configs:
      - targets:
          - "<project-ref>.supabase.co:443"
        labels:
          project: "<project-ref>"
          env: "<production-or-preview>"
          team: "mochirii"
```

Vendor-neutral path: any collector that can scrape a Prometheus text endpoint over HTTPS may use the same endpoint, Basic Auth, 60 second interval, and labels.

## Dashboard And Alert Focus

Start with Supabase's Grafana dashboard JSON and alert examples, then tune thresholds after real traffic. For Mochirii and Mochi Social alpha, the first useful panels and alerts are:

- database CPU, IO, disk, WAL, replication, and connection saturation;
- query throughput and long-running transactions;
- Edge Function invocation/error trends from Supabase Studio and existing logs;
- Auth sign-in volume before and during tester sessions;
- database/storage growth tied to feedback, ledger, profile, and gallery flows;
- spikes around `/games/mochi-social`, tester gates, and alpha feedback windows.

Metrics should be reviewed with Supabase Advisors, Query Performance reports, Vercel Analytics, Speed Insights, and existing no-secret smoke reports. Metrics do not replace RLS, Edge Function authorization, Discord allowlists, Enjin finality, or manual incident review.

## Log Drains Boundary

Log drains are separate from the Metrics API. They can be plan-sensitive and cost-bearing because they export Supabase logs to external destinations. Do not enable, configure, or test log drains during the Metrics API pass unless a later plan explicitly approves that provider action with a cost note.

## Operator Checklist Template

Record this checklist in a private operator note. Do not record secret values.

```text
Supabase Metrics Operator Checklist

Project ref:
Environment: production | preview
Collector: Grafana Cloud | self-hosted Prometheus | other
Dashboard location:
Scrape interval: 60 seconds
Dedicated Secret API key created: yes | no
Secret stored only in approved secret manager: yes | no
Supabase dashboard imported: yes | no
Alerts configured: yes | no
Scrape tested without printing secret: yes | no
Live check date:
Reviewer:
Notes:
```

## Optional Live Smoke

A future live smoke may fetch the metrics endpoint only when all of these are true:

- the operator explicitly approves the live Supabase request;
- `SUPABASE_METRICS_ALLOW_LIVE=1` is set;
- `SUPABASE_METRICS_PROJECT_REF` is set to the intended project ref;
- the Secret API key is supplied from a private local secret source and never printed.

The smoke may report only HTTP status, Prometheus content type/shape, timestamp, project ref, and no-secret success/failure. It must not print response bodies, raw credentials, dashboard tokens, cookies, or private labels.

## Local Guardrails

Run the static guardrail after changing this lane:

```sh
npm run check:supabase-metrics-observability
```

For broader release checks, run:

```sh
npm run check:observability-metadata-smoke
npm run check:mochi-social-report-hygiene
npm run check:supabase-config
npm run check:security-hardening
npm run check
```
