# Speed Insights Evidence

This is a no-secret field-data packet for `mochirii.com`. It records read-only
Vercel Speed Insights evidence and should not be used as approval to change
visuals, assets, routes, providers, or runtime settings.

## Source And Thresholds

- Dashboard source: Vercel project `mochirii/mochirii` > Speed Insights
  ([Vercel Speed Insights](https://vercel.com/docs/speed-insights)).
- Evidence captured: 2026-07-06 from the logged-in Vercel dashboard.
- Field-data threshold source:
  [Web Vitals p75 guidance](https://web.dev/articles/vitals).
- Good thresholds: LCP <= 2.5s, INP <= 200ms, CLS <= 0.1.
- Fix policy: act only on repeated current p75 issues by route, device, or
  country segment. Treat one-off or low-sample signals as watch-only.

## Desktop Readback

- Real Experience Score: 100.
- First Contentful Paint: 0.97s.
- Largest Contentful Paint: 1.27s.
- Interaction to Next Paint: 8ms.
- Cumulative Layout Shift: 0.02.
- First Input Delay: 1ms.
- Time to First Byte: 0.32s.
- Dashboard sample note: 848 data points for the current desktop view.

### Desktop Routes

| Route | Data Points | RES |
| --- | ---: | ---: |
| `/` | 416 | 100 |
| `/auth` | 111 | 100 |
| `/account` | 104 | 100 |
| `/oauth/consent` | 86 | 100 |
| `/games/mochi-pets` | 30 | 100 |
| `/social` | 19 | 98 |
| `/recruitment` | 18 | 100 |

### Desktop Country Segment

| Country | Data Points | RES | Status |
| --- | ---: | ---: | --- |
| Singapore | 113 | 84 | Watch-only needs-improvement segment |

The Singapore segment is the only current needs-improvement signal observed in
this readback. It should stay watch-only until repeated current data shows a
specific p75 LCP, INP, or CLS issue on an actionable route/device segment.

## Mobile Readback

- Real Experience Score: 100.
- First Contentful Paint: 0.96s.
- Largest Contentful Paint: 0.93s.
- Interaction to Next Paint: 152ms.
- Cumulative Layout Shift: 0.
- First Input Delay: 28ms.
- Time to First Byte: 0s.
- Dashboard sample note: the mobile view showed low sample depth and only `/`
  in the route table during this readback.

## Recommendations

- No immediate performance-code PR is justified by this packet.
- Keep monitoring `/`, `/auth`, `/account`, `/oauth/consent`,
  `/games/mochi-pets`, `/social`, and `/recruitment`.
- Prioritize only evidence-backed field issues: route/device/country segments
  with repeated p75 LCP > 2.5s, INP > 200ms, or CLS > 0.1.
- Continue current lightweight frontend cleanup separately from performance
  optimization, since the current field data is broadly healthy.
