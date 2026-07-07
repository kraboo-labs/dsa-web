#!/usr/bin/env node
/**
 * Programmatic SEO generator for dsa-api.com.
 * Fetches the live register and writes static pages:
 *   /flaggers/            index (full filterable list)
 *   /flaggers/country/XX  one per country
 *   /flaggers/<slug>      one per flagger
 *   /areas/<area>         one per area of expertise
 *   /learn/<topic>        4 evergreen explainers
 * Also regenerates sitemap.xml. No dependencies.
 *
 *   node build/generate.mjs [--api https://api.dsa-api.com]
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const API = (process.argv.find((a) => a.startsWith("--api="))?.split("=")[1]) || "https://api.dsa-api.com";
const SITE = "https://dsa-api.com";
const YEAR = "2026";
const TODAY = "2026-07-07";

const COUNTRY = {
  AT: "Austria", BE: "Belgium", BG: "Bulgaria", HR: "Croatia", CY: "Cyprus",
  CZ: "Czechia", DK: "Denmark", EE: "Estonia", FI: "Finland", FR: "France",
  DE: "Germany", EL: "Greece", GR: "Greece", HU: "Hungary", IE: "Ireland",
  IT: "Italy", LV: "Latvia", LT: "Lithuania", LU: "Luxembourg", MT: "Malta",
  NL: "Netherlands", PL: "Poland", PT: "Portugal", RO: "Romania", SK: "Slovakia",
  SI: "Slovenia", ES: "Spain", SE: "Sweden",
};
const AREA_LABEL = {
  illegal_speech: "Illegal speech", ip_infringement: "IP infringement",
  scams_fraud: "Scams & fraud", cyber_violence: "Cyber violence",
  protection_of_minors: "Protection of minors", data_privacy: "Data privacy",
  illegal_products: "Illegal products", public_security: "Public security",
  self_harm: "Self-harm", civil_discourse: "Civil discourse", violence: "Violence",
  gender_based_violence: "Gender-based violence", consumer_protection: "Consumer protection",
  animal_welfare: "Animal welfare", csam: "CSAM", other: "Other",
};

const esc = (s) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const cc = (c) => COUNTRY[c] || c || "—";
const area = (a) => AREA_LABEL[a] || String(a).replace(/_/g, " ").replace(/\b\w/g, (m) => m.toUpperCase());
const slugify = (s) =>
  String(s).normalize("NFKD").replace(/[̀-ͯ]/g, "").toLowerCase()
    .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60);

const MARK = `<svg viewBox="0 0 24 24" fill="none"><path d="M12 2l8 3v6c0 5-3.4 8.3-8 11-4.6-2.7-8-6-8-11V5l8-3z" fill="currentColor" opacity="0.9"/><path d="M8.5 12l2.4 2.4L15.8 9.5" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
const FAVICON = "data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 24 24%22%3E%3Cpath d=%22M12 2l8 3v6c0 5-3.4 8.3-8 11-4.6-2.7-8-6-8-11V5l8-3z%22 fill=%22%233346ea%22/%3E%3Cpath d=%22M8.5 12l2.4 2.4L15.8 9.5%22 stroke=%22white%22 stroke-width=%222%22 fill=%22none%22 stroke-linecap=%22round%22 stroke-linejoin=%22round%22/%3E%3C/svg%3E";

// depth = number of path segments below root (for relative asset + link prefix)
function nav(depth, active) {
  const r = "../".repeat(depth) || "./";
  const link = (href, label, key) =>
    `<a href="${r}${href}"${active === key ? ' class="active"' : ""}>${label}</a>`;
  return `<nav>
    <a class="brand" href="${r}index.html"><span class="mk" aria-hidden="true">${MARK}</span>dsa-api</a>
    <div class="nlinks">
      ${link("index.html", "Home", "home")}
      ${link("flaggers/index.html", "Flaggers", "flaggers")}
      ${link("api.html", "API", "api")}
      ${link("data.html", "Data", "data")}
      ${link("about.html", "About", "about")}
    </div>
    <div class="nact">
      <a class="btn btn-white hideSm" href="https://github.com/kraboo-labs/dsa-api">GitHub</a>
      <a class="btn btn-solid" href="https://docs.dsa-api.com/docs">Read the docs</a>
    </div>
  </nav>`;
}
function footer(depth) {
  const r = "../".repeat(depth) || "./";
  return `<footer><div class="wrap">
  <div class="foot">
    <div class="foot-lead">
      <a class="brand" href="${r}index.html"><span class="mk" aria-hidden="true">${MARK}</span>dsa-api</a>
      <p>An open mirror of the EU Trusted Flaggers register. Built by Kraboo Labs.</p>
    </div>
    <div class="fcolh"><h4>Product</h4><a href="${r}api.html">API reference</a><a href="https://docs.dsa-api.com/docs">Swagger docs</a><a href="https://status.dsa-api.com">Status</a></div>
    <div class="fcolh"><h4>Data</h4><a href="${r}flaggers/index.html">Browse flaggers</a><a href="${r}data.html">Open data</a><a href="https://github.com/kraboo-labs/dsa-data">Dataset</a></div>
    <div class="fcolh"><h4>More</h4><a href="${r}about.html">About</a><a href="https://digital-strategy.ec.europa.eu/en/policies/trusted-flaggers-under-dsa">EU register ↗</a><a href="https://api.dsa-api.com/openapi.json">openapi.json</a></div>
  </div>
  <p class="disc"><b>Community mirror — not the authoritative source.</b> The official register lives at the <a href="https://digital-strategy.ec.europa.eu/en/policies/trusted-flaggers-under-dsa">European Commission</a>; verify there before any legal or compliance decision. Data licensed CC&nbsp;BY&nbsp;4.0, code MIT.</p>
  <div class="foot-bar"><div class="links"><a href="${r}index.html">Home</a><a href="${r}flaggers/index.html">Flaggers</a><a href="${r}api.html">API</a><a href="${r}data.html">Data</a><a href="${r}about.html">About</a></div><span>© ${YEAR} Kraboo Labs · dsa-api.com</span></div>
</div></footer>`;
}
function crumbs(depth, trail) {
  const r = "../".repeat(depth) || "./";
  const parts = [`<a href="${r}index.html">Home</a>`];
  trail.forEach((t) => parts.push(t.href ? `<a href="${r}${t.href}">${esc(t.label)}</a>` : `<span>${esc(t.label)}</span>`));
  return `<p class="crumbs">${parts.join('<span class="sep">›</span>')}</p>`;
}
function page({ depth, active, title, desc, canonical, jsonld = [], head = "", body }) {
  const r = "../".repeat(depth) || "./";
  const ld = jsonld.map((o) => `<script type="application/ld+json">${JSON.stringify(o)}</script>`).join("\n");
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
<meta name="theme-color" content="#5568ee">
<link rel="canonical" href="${canonical}">
<link rel="icon" href="${FAVICON}" type="image/svg+xml">
<link rel="stylesheet" href="${r}styles.css">
<meta property="og:type" content="website">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(desc)}">
<meta property="og:url" content="${canonical}">
<meta property="og:image" content="${SITE}/og-image.jpg">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:image" content="${SITE}/og-image.jpg">
${head}${ld}
</head>
<body>
<header class="topbar" style="padding-bottom:0">
  ${nav(depth, active)}
</header>
<main>
<div class="wrap">
${body}
</div>
</main>
${footer(depth)}
</body>
</html>
`;
}
const ORG = { "@context": "https://schema.org", "@type": "Organization", name: "dsa-api", url: SITE, description: "Open mirror of the EU Trusted Flaggers register (DSA Article 22)." };
function write(rel, html) {
  const abs = path.join(ROOT, rel);
  fs.mkdirSync(path.dirname(abs), { recursive: true });
  fs.writeFileSync(abs, html);
}

async function fetchJson(url) {
  const res = await fetch(url, { headers: { accept: "application/json" } });
  if (!res.ok) throw new Error(`${url} → ${res.status}`);
  const j = await res.json();
  return j && typeof j === "object" && "data" in j ? j.data : j;
}

async function main() {
  console.log(`fetching from ${API} …`);
  const flaggers = await fetchJson(`${API}/v1/trusted-flaggers?status=all&limit=200`);
  const list = Array.isArray(flaggers) ? flaggers : [];
  // stable slug: name + short id
  for (const f of list) f._slug = `${slugify(f.name)}-${String(f.id).slice(0, 6)}`;
  const active = list.filter((f) => f.status === "active");
  console.log(`  ${list.length} flaggers (${active.length} active)`);

  const byCountry = {}, byArea = {};
  for (const f of active) {
    (byCountry[f.country_code] ||= []).push(f);
    for (const a of f.areas_of_expertise || []) (byArea[a] ||= []).push(f);
  }
  const countries = Object.keys(byCountry).sort((a, b) => cc(a).localeCompare(cc(b)));
  const areas = Object.keys(byArea).sort((a, b) => area(a).localeCompare(area(b)));
  const urls = []; // for sitemap {loc, priority}

  const chipRow = (f, depth) =>
    (f.areas_of_expertise || []).map((a) => `<a class="pill-tag" href="${"../".repeat(depth)}areas/${a}.html">${esc(area(a))}</a>`).join(" ");

  // ---- /flaggers/index.html ----
  {
    const rows = list.slice().sort((a, b) => a.name.localeCompare(b.name)).map((f) => `<tr>
      <td><a href="../flaggers/${f._slug}.html">${esc(f.name)}</a></td>
      <td><a href="../flaggers/country/${(f.country_code || "").toLowerCase()}.html">${esc(cc(f.country_code))}</a></td>
      <td>${(f.areas_of_expertise || []).map((a) => esc(area(a))).join(", ") || "—"}</td>
      <td>${esc(f.designation_date || "—")}</td>
      <td><span class="pill-tag${f.status === "active" ? "" : " removed"}">${esc(f.status)}</span></td>
    </tr>`).join("\n");
    const body = `${crumbs(1, [{ label: "Trusted flaggers" }])}
<h1 style="font-size:clamp(30px,4vw,44px);font-weight:800;letter-spacing:-0.03em;margin:0">EU Trusted Flaggers — the full list</h1>
<p class="lead">Every organisation designated as a Trusted Flagger under <b>DSA Article 22</b>, across ${countries.length} EU member states. ${active.length} active, refreshed every 6 hours from the European Commission register.</p>
<div class="linkgrid">${countries.map((c) => `<a href="../flaggers/country/${c.toLowerCase()}.html">${esc(cc(c))} (${byCountry[c].length})</a>`).join("")}</div>
<div class="table-scroll" style="margin-top:26px"><table class="tf-table">
<thead><tr><th>Name</th><th>Country</th><th>Areas of expertise</th><th>Designated</th><th>Status</th></tr></thead>
<tbody>${rows}</tbody></table></div>
<p style="margin-top:26px">Prefer data over a table? Query the <a href="../api.html">REST API</a> or download the <a href="../data.html">open dataset</a>.</p>`;
    write("flaggers/index.html", page({
      depth: 1, active: "flaggers",
      title: `EU Trusted Flaggers — full list (${YEAR}) | dsa-api`,
      desc: `The complete list of ${active.length} designated EU Trusted Flaggers under DSA Article 22, across ${countries.length} member states. Free API and open data.`,
      canonical: `${SITE}/flaggers/`,
      jsonld: [ORG, {
        "@context": "https://schema.org", "@type": "Dataset",
        name: "EU Trusted Flaggers register (mirror)",
        description: "Designated Trusted Flaggers under the EU Digital Services Act, Article 22.",
        url: `${SITE}/flaggers/`, license: "https://creativecommons.org/licenses/by/4.0/",
        creator: { "@type": "Organization", name: "European Commission" }, isAccessibleForFree: true,
      }],
      body,
    }));
    urls.push({ loc: `${SITE}/flaggers/`, priority: "0.9" });
  }

  // ---- country pages ----
  for (const c of countries) {
    const fs_ = byCountry[c].slice().sort((a, b) => a.name.localeCompare(b.name));
    const rows = fs_.map((f) => `<tr>
      <td><a href="../${f._slug}.html">${esc(f.name)}</a></td>
      <td>${(f.areas_of_expertise || []).map((a) => esc(area(a))).join(", ") || "—"}</td>
      <td>${esc(f.designation_date || "—")}</td></tr>`).join("\n");
    const body = `${crumbs(2, [{ label: "Flaggers", href: "flaggers/index.html" }, { label: cc(c) }])}
<h1 style="font-size:clamp(28px,4vw,40px);font-weight:800;letter-spacing:-0.03em;margin:0">Trusted flaggers in ${esc(cc(c))}</h1>
<p class="lead">${fs_.length} organisation${fs_.length === 1 ? "" : "s"} in ${esc(cc(c))} designated as EU Trusted Flaggers under DSA Article 22.</p>
<div class="table-scroll" style="margin-top:22px"><table class="tf-table">
<thead><tr><th>Name</th><th>Areas of expertise</th><th>Designated</th></tr></thead>
<tbody>${rows}</tbody></table></div>
<p style="margin-top:24px">See <a href="../index.html">all countries</a> · query by country via the <a href="../../api.html">API</a>: <code>GET /v1/trusted-flaggers?country=${esc(c)}</code></p>`;
    write(`flaggers/country/${c.toLowerCase()}.html`, page({
      depth: 2, active: "flaggers",
      title: `Trusted flaggers in ${cc(c)} — DSA Article 22 list | dsa-api`,
      desc: `${fs_.length} designated EU Trusted Flaggers in ${cc(c)} under DSA Article 22. Names, areas of expertise and designation dates.`,
      canonical: `${SITE}/flaggers/country/${c.toLowerCase()}.html`,
      jsonld: [ORG], body,
    }));
    urls.push({ loc: `${SITE}/flaggers/country/${c.toLowerCase()}.html`, priority: "0.7" });
  }

  // ---- detail pages ----
  for (const f of list) {
    const areasHtml = (f.areas_of_expertise || []).map((a) => `<a class="pill-tag" href="../areas/${a}.html">${esc(area(a))}</a>`).join(" ") || "—";
    const website = f.website ? `<a href="${esc(f.website)}" rel="nofollow noopener">${esc(f.website)}</a>` : "—";
    const body = `${crumbs(1, [{ label: "Flaggers", href: "flaggers/index.html" }, { label: cc(f.country_code), href: `flaggers/country/${(f.country_code || "").toLowerCase()}.html` }, { label: f.name }])}
<h1 style="font-size:clamp(26px,3.6vw,38px);font-weight:800;letter-spacing:-0.02em;margin:0">${esc(f.name)}</h1>
<p class="lead">${esc(f.name)} is ${f.status === "active" ? "a designated" : "a former"} EU Trusted Flagger${f.country_code ? ` in ${esc(cc(f.country_code))}` : ""} under Article 22 of the Digital Services Act.</p>
<dl class="kv">
  <dt>Status</dt><dd><span class="pill-tag${f.status === "active" ? "" : " removed"}">${esc(f.status)}</span></dd>
  <dt>Country</dt><dd><a href="country/${(f.country_code || "").toLowerCase()}.html">${esc(cc(f.country_code))}</a></dd>
  <dt>Designating DSC</dt><dd>${esc(f.dsc_name || "—")}</dd>
  <dt>Areas of expertise</dt><dd>${areasHtml}</dd>
  <dt>Designated</dt><dd>${esc(f.designation_date || "—")}</dd>
  <dt>Website</dt><dd>${website}</dd>
</dl>
<p style="margin-top:26px">Machine-readable record: <code>GET /v1/trusted-flaggers/${esc(f.id)}</code> · <a href="../api.html">API docs</a> · <a href="https://digital-strategy.ec.europa.eu/en/policies/trusted-flaggers-under-dsa" rel="nofollow">verify on the EU register ↗</a></p>`;
    write(`flaggers/${f._slug}.html`, page({
      depth: 1, active: "flaggers",
      title: `${f.name} — EU Trusted Flagger${f.country_code ? ` (${cc(f.country_code)})` : ""} | dsa-api`,
      desc: `${f.name}: designated EU Trusted Flagger under DSA Article 22${f.country_code ? ` in ${cc(f.country_code)}` : ""}. Areas of expertise, designating coordinator and designation date.`,
      canonical: `${SITE}/flaggers/${f._slug}.html`,
      jsonld: [ORG, {
        "@context": "https://schema.org", "@type": "Organization",
        name: f.name, ...(f.website ? { url: f.website } : {}),
        ...(f.country_code ? { address: { "@type": "PostalAddress", addressCountry: f.country_code } } : {}),
      }], body,
    }));
    urls.push({ loc: `${SITE}/flaggers/${f._slug}.html`, priority: "0.5" });
  }

  // ---- area pages ----
  for (const a of areas) {
    const fs_ = byArea[a].slice().sort((x, y) => x.name.localeCompare(y.name));
    const rows = fs_.map((f) => `<tr>
      <td><a href="../flaggers/${f._slug}.html">${esc(f.name)}</a></td>
      <td><a href="../flaggers/country/${(f.country_code || "").toLowerCase()}.html">${esc(cc(f.country_code))}</a></td>
      <td>${esc(f.designation_date || "—")}</td></tr>`).join("\n");
    const body = `${crumbs(1, [{ label: "Areas" }, { label: area(a) }])}
<h1 style="font-size:clamp(28px,4vw,40px);font-weight:800;letter-spacing:-0.03em;margin:0">Trusted flaggers for ${esc(area(a))}</h1>
<p class="lead">${fs_.length} EU Trusted Flagger${fs_.length === 1 ? "" : "s"} designated with expertise in <b>${esc(area(a))}</b> under DSA Article 22. Platforms must give their reports priority.</p>
<div class="table-scroll" style="margin-top:22px"><table class="tf-table">
<thead><tr><th>Name</th><th>Country</th><th>Designated</th></tr></thead>
<tbody>${rows}</tbody></table></div>
<div class="linkgrid" style="margin-top:26px">${areas.filter((x) => x !== a).map((x) => `<a href="../areas/${x}.html">${esc(area(x))}</a>`).join("")}</div>
<p style="margin-top:22px">Filter by area via the <a href="../api.html">API</a>: <code>GET /v1/trusted-flaggers?area=${esc(a)}</code></p>`;
    write(`areas/${a}.html`, page({
      depth: 1, active: "flaggers",
      title: `Trusted flaggers for ${area(a)} — DSA Article 22 | dsa-api`,
      desc: `${fs_.length} EU Trusted Flaggers with expertise in ${area(a)}, designated under DSA Article 22. Full list with countries and dates.`,
      canonical: `${SITE}/areas/${a}.html`,
      jsonld: [ORG], body,
    }));
    urls.push({ loc: `${SITE}/areas/${a}.html`, priority: "0.6" });
  }

  // ---- explainers ----
  const learn = [
    {
      slug: "what-is-a-trusted-flagger",
      h1: "What is a Trusted Flagger under the DSA?",
      desc: "A plain-English explanation of Trusted Flaggers under the EU Digital Services Act (Article 22): what they are, how they're designated, and what platforms must do.",
      html: `<p>A <b>Trusted Flagger</b> is an entity awarded a special status under <b>Article 22 of the EU Digital Services Act (DSA)</b>. When a Trusted Flagger reports (flags) content it believes is illegal, online platforms must treat those reports with <b>priority</b> and decide on them without undue delay.</p>
<h2>Who can be a Trusted Flagger?</h2>
<p>Status is awarded by a national <b>Digital Services Coordinator (DSC)</b> — the DSA regulator in each member state — to entities that demonstrate particular expertise in detecting illegal content, that represent collective interests, and that work diligently and objectively. They are not government censors; many are NGOs, hotlines, or specialist bodies (for example child-protection or anti-fraud organisations).</p>
<h2>What does the status actually change?</h2>
<p>Platforms already must act on any user's report of illegal content (the <a href="../api.html">notice-and-action</a> mechanism). A Trusted Flagger's notices simply jump the queue and are handled as a priority. The European Commission maintains a public register of all designated flaggers — which this site mirrors as a <a href="../flaggers/index.html">browsable list</a> and a <a href="../api.html">free API</a>.</p>
<h2>Where to see the current list</h2>
<p>Browse <a href="../flaggers/index.html">all designated flaggers</a>, filter <a href="../areas/illegal_speech.html">by area of expertise</a>, or read <a href="dsa-article-22-explained.html">what Article 22 requires of platforms</a>.</p>`,
    },
    {
      slug: "how-to-become-a-trusted-flagger",
      h1: "How to become a Trusted Flagger under the DSA",
      desc: "How an organisation applies for Trusted Flagger status under DSA Article 22: the criteria, which authority awards it, and how to monitor new designations.",
      html: `<p>Trusted Flagger status under <b>Article 22 of the Digital Services Act</b> is awarded by the <b>Digital Services Coordinator (DSC)</b> of the member state where the applicant is established. You apply to your national DSC, not to the platforms and not to the European Commission directly.</p>
<h2>The three legal criteria</h2>
<ul class="list">
<li><b>Expertise and competence</b> in detecting, identifying and notifying illegal content.</li>
<li><b>Independence from any online platform</b> — you must represent collective interests, not a single company's.</li>
<li><b>Diligence, accuracy and objectivity</b> in submitting notices.</li>
</ul>
<h2>After designation</h2>
<p>Once awarded, your organisation is entered into the European Commission's public register and must publish annual reports on the notices it sent. Every platform in the EU must then treat your flags as priority.</p>
<h2>Track new designations</h2>
<p>New flaggers are added to the register regularly. You can watch changes without checking the EU page by hand — poll the <a href="../api.html">changes endpoint</a> (<code>GET /v1/changes</code>) or browse the <a href="../flaggers/index.html">current list</a>. The register is refreshed every six hours here.</p>`,
    },
    {
      slug: "dsa-article-22-explained",
      h1: "DSA Article 22 explained — for platforms",
      desc: "What Article 22 of the EU Digital Services Act requires online platforms to do about Trusted Flaggers, and how to automate the check.",
      html: `<p><b>Article 22 of the Digital Services Act</b> obliges every online platform operating in the EU to give <b>priority</b> to notices submitted by designated Trusted Flaggers, and to process and decide on them without undue delay.</p>
<h2>What platforms must do in practice</h2>
<ul class="list">
<li>Recognise which incoming reports come from a designated Trusted Flagger.</li>
<li>Route those reports to a priority queue in your trust &amp; safety workflow.</li>
<li>Keep your knowledge of who is designated <b>current</b> — the register changes over time.</li>
</ul>
<h2>Automating the check</h2>
<p>The hard part is step 3: the register is published as a web page. This site turns it into a <a href="../api.html">free API</a> so you can resolve an incoming report against the live list — for example by the reporter's email domain:</p>
<div class="code"><pre><span class="c"># is this report from a designated flagger?</span>
curl "https://api.dsa-api.com/v1/trusted-flaggers/lookup?domain=example.org"</pre></div>
<p>See the <a href="../flaggers/index.html">full list</a>, or read <a href="what-is-a-trusted-flagger.html">what a Trusted Flagger is</a>.</p>`,
    },
    {
      slug: "dsa-glossary",
      h1: "DSA glossary — key terms",
      desc: "Plain-English definitions of the main Digital Services Act terms: Trusted Flagger, DSC, notice-and-action, VLOP, statement of reasons and more.",
      html: `<p>Short definitions of the Digital Services Act terms you'll meet around the Trusted Flaggers register.</p>
<dl class="kv" style="grid-template-columns:max-content;gap:0">
</dl>
<h2>Trusted Flagger</h2><p>An entity designated under Article 22 whose reports of illegal content platforms must prioritise. <a href="what-is-a-trusted-flagger.html">Full explainer →</a></p>
<h2>Digital Services Coordinator (DSC)</h2><p>The national authority in each member state that enforces the DSA and designates Trusted Flaggers.</p>
<h2>Notice-and-action</h2><p>The mechanism (Article 16) by which anyone can report illegal content and the platform must act on it.</p>
<h2>Statement of Reasons</h2><p>The explanation a platform must give a user when it restricts their content (Article 17).</p>
<h2>VLOP / VLOSE</h2><p>Very Large Online Platform / Search Engine — services with 45M+ EU users, subject to extra DSA obligations.</p>
<h2>Areas of expertise</h2><p>The categories of illegal content a flagger specialises in — e.g. <a href="../areas/illegal_speech.html">illegal speech</a>, <a href="../areas/scams_fraud.html">scams &amp; fraud</a>, <a href="../areas/protection_of_minors.html">protection of minors</a>.</p>`,
    },
  ];
  for (const l of learn) {
    const body = `${crumbs(1, [{ label: "Learn" }, { label: l.h1 }])}
<div class="prose-block">
<h1 style="font-size:clamp(28px,4vw,42px);font-weight:800;letter-spacing:-0.03em;margin:0">${esc(l.h1)}</h1>
${l.html}
</div>`;
    write(`learn/${l.slug}.html`, page({
      depth: 1, active: null,
      title: `${l.h1} | dsa-api`, desc: l.desc,
      canonical: `${SITE}/learn/${l.slug}.html`,
      jsonld: [ORG, { "@context": "https://schema.org", "@type": "Article", headline: l.h1, description: l.desc, author: ORG, publisher: ORG }],
      body,
    }));
    urls.push({ loc: `${SITE}/learn/${l.slug}.html`, priority: "0.7" });
  }

  // ---- sitemap ----
  const staticUrls = [
    { loc: `${SITE}/`, priority: "1.0" },
    { loc: `${SITE}/api.html`, priority: "0.8" },
    { loc: `${SITE}/data.html`, priority: "0.8" },
    { loc: `${SITE}/about.html`, priority: "0.6" },
  ];
  const all = [...staticUrls, ...urls];
  const sm = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${all.map((u) => `  <url><loc>${u.loc}</loc><lastmod>${TODAY}</lastmod><priority>${u.priority}</priority></url>`).join("\n")}
</urlset>
`;
  write("sitemap.xml", sm);

  console.log(`generated: 1 index + ${countries.length} country + ${list.length} detail + ${areas.length} area + ${learn.length} learn = ${urls.length} pages`);
  console.log(`sitemap: ${all.length} urls`);
}
main().catch((e) => { console.error(e); process.exit(1); });
