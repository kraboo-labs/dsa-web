# dsa-api.com — marketing site

Static landing + info pages for **dsa-api**, the open mirror of the EU Trusted
Flaggers register (DSA Article 22). No build step, no dependencies — plain HTML,
one CSS file, and image assets.

## Pages

| File | Purpose |
|------|---------|
| `index.html` | Home / landing |
| `api.html` | REST API reference (8 endpoints, params, example, limits) |
| `data.html` | Open dataset — files, schema, areas enum, licensing |
| `about.html` | What it is, how the pipeline works, coverage, FAQ |
| `404.html` | Not-found page |
| `styles.css` | Shared design system for the subpages |

## Assets

- `images/` — hero/section visuals (`map`, `features`, `chart`, `cta`)
- `og-image.jpg` — 1200×630 social share card
- `favicon.svg` — tab icon
- `robots.txt`, `sitemap.xml`, `site.webmanifest` — SEO / PWA metadata

## Preview locally

It's fully static, so any file server works:

```bash
# Python
python3 -m http.server 8080
# or Node
npx serve .
```

Then open http://localhost:8080. Opening `index.html` directly via `file://`
also works (all links and assets are relative).

## Design

- Palette sampled to match the reference: light periwinkle hero
  (`#5568ee → #c7cffb`), page background `#eef0fd`, accent `#3346ea`.
- Light mode only, full-width hero + CTA, scroll-reveal transitions.
- Section visuals were generated with nano-banana (Gemini image) in a single
  cohesive palette; regenerate by re-rendering into `images/`.

## Deploy

Static hosting — drop the folder on Netlify, Vercel, Cloudflare Pages, GitHub
Pages or any bucket. Absolute URLs in `sitemap.xml` / OG tags assume
`https://dsa-api.com/`; update them if the domain changes.

## License

Site code: MIT. The mirrored register data (served by the API) is CC BY 4.0.
This is a community mirror — the authoritative source is the
[European Commission](https://digital-strategy.ec.europa.eu/en/policies/trusted-flaggers-under-dsa).
