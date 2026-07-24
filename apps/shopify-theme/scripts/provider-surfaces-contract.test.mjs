import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  realpathSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import {
  EXPECTED_STORE_PRODUCT_HANDLES,
  canonicalSha256,
  providerSurfaceContractSha256,
  textSha256,
  validateProviderSurfaceReadback,
  validateProviderSurfaceSourceBindings,
  validateProviderSurfacesContract,
} from "./lib/provider-surfaces-contract.mjs";
import { resolveContainedRegularFile, safePrivateOperationsPath } from "./lib/local-read-boundary.mjs";

const appRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const repositoryRoot = path.resolve(appRoot, "../..");
const read = (relativePath) => readFileSync(path.join(appRoot, relativePath), "utf8");
const json = (relativePath) => JSON.parse(read(relativePath));
const contract = json("content/provider-surfaces.v1.json");
const schema = json("content/provider-surfaces.v1.schema.json");
const NOW = new Date("2026-07-19T20:00:00.000Z");
const CAPTURED_AT = "2026-07-19T19:30:00.000Z";
const THEME_ID = "141514408011";
const PACKAGE_SHA = textSha256("realistic-reviewed-package");
const sha = (label) => textSha256(`provider-surface-test:${label}`);
const providerBody = (surface, identity) => surface === "policy"
  ? `Read the Mochirii Cosmetics ${identity} information.`
  : `Review your Mochirii Cosmetics ${identity} details.`;

function sourceFixture() {
  const relativePaths = [
    ...contract.brand_identity.theme_bindings.map((item) => item.source_path),
    "sections/header.liquid",
    "snippets/primary-navigation-links.liquid",
    "snippets/seo-meta.liquid",
    "sections/footer.liquid",
    "sections/main-index.liquid",
    "sections/main-list-collections.liquid",
    "sections/main-page.liquid",
    "sections/main-collection.liquid",
    "sections/main-cart.liquid",
    "sections/main-404.liquid",
    "sections/main-search.liquid",
    "layout/theme.liquid",
    "config/settings_data.json",
    "config/settings_schema.json",
    "content/approved-customer-copy.json",
    "content/launch-pages.v1.json",
    "content/product-facts.v3.json",
  ];
  return {
    files: new Map([...new Set(relativePaths)].map((relativePath) => [relativePath, read(relativePath)])),
    canonical_emblem_bytes: readFileSync(path.join(repositoryRoot, contract.brand_identity.canonical_reference.asset_path)),
    storefront_emblem_bytes: readFileSync(path.join(repositoryRoot, contract.brand_identity.storefront_derivative.asset_path)),
    emblem_metadata: { format: "webp", width: 224, height: 224 },
    homepage_hero_bytes: readFileSync(path.join(appRoot, contract.homepage.expected.temporary_hero_fallback_asset_path)),
  };
}

function readyContract() {
  const ready = structuredClone(contract);
  ready.homepage.expected.hero_media_approval_status = "approved";
  ready.homepage.expected.approved_hero_image_sha256 = sha("dedicated-homepage-hero");
  ready.homepage.expected.approved_hero_image_alt = "Mochirii Cosmetics skincare products arranged for a daily routine.";
  ready.homepage.expected.featured_products_approval_status = "approved";
  ready.homepage.expected.approved_featured_product_handles = EXPECTED_STORE_PRODUCT_HANDLES.slice(0, 6);
  ready.homepage.expected_sha256 = canonicalSha256(ready.homepage.expected);
  const routines = [
    EXPECTED_STORE_PRODUCT_HANDLES.slice(0, 5),
    EXPECTED_STORE_PRODUCT_HANDLES.slice(5, 10),
    EXPECTED_STORE_PRODUCT_HANDLES.slice(10, 15),
    EXPECTED_STORE_PRODUCT_HANDLES.slice(15, 20),
  ];
  ready.collections.items.forEach((item, index) => {
    item.rendered_html_approval_status = "approved";
    item.approved_rendered_html_sha256 = sha(`collection-html:${item.handle}`);
    item.media_approval_status = "approved";
    item.approved_image_sha256 = sha(`collection-image:${item.handle}`);
    item.approved_image_alt = `${item.title} Mochirii Cosmetics collection.`;
    item.membership_approval_status = "approved";
    item.approved_product_handles = index === 0 ? [...EXPECTED_STORE_PRODUCT_HANDLES] : routines[index - 1];
  });
  ready.policies.items.forEach((item) => {
    item.approval_status = "approved";
    item.approved_content_sha256 = textSha256(providerBody("policy", item.identity));
  });
  ready.notifications.items.forEach((item) => {
    item.approval_status = "approved";
    item.approved_subject = `${item.customer_label} from Mochirii Cosmetics`;
    item.approved_subject_sha256 = textSha256(item.approved_subject);
    item.approved_body_sha256 = textSha256(providerBody("notification", item.identity));
  });
  ready.notifications.sender_presentation.approval_status = "approved";
  ready.notifications.sender_presentation.approved_sender_address_sha256 = sha("sender-address");
  ready.notifications.sender_presentation.approved_sender_domain_sha256 = sha("sender-domain");
  return ready;
}

function scope() {
  return { candidate_theme_id: THEME_ID, package_sha256: PACKAGE_SHA };
}

function readbackFixture(ready) {
  const navigationObserved = {
    header: structuredClone(ready.navigation.header),
    footer_groups: structuredClone(ready.navigation.footer_groups),
  };
  const domainValues = {
    primary_customer_domain: ready.settings.expected.primary_customer_domain,
    primary_customer_url: ready.settings.expected.primary_customer_url,
    shop_url: ready.settings.expected.primary_customer_url,
    canonical_url_hosts: [ready.settings.expected.primary_customer_domain],
    json_ld_url_hosts: [ready.settings.expected.primary_customer_domain],
    customer_absolute_link_hosts: [ready.settings.expected.primary_customer_domain, "mochirii.com"],
  };
  return {
    schema_version: 1,
    record_type: "mochirii-private-provider-surface-readback",
    source_contract_sha256: providerSurfaceContractSha256(ready),
    captured_at: CAPTURED_AT,
    candidate: {
      theme_id: THEME_ID,
      admin_status: "Draft",
      published: false,
      package_sha256: PACKAGE_SHA,
    },
    brand_identity: {
      scope: scope(),
      canonical_reference_sha256: ready.brand_identity.canonical_reference.sha256,
      storefront_derivative_sha256: ready.brand_identity.storefront_derivative.sha256,
      provider_logo_readbacks: ready.brand_identity.provider_logo_expectations.map((item, index) => ({
        order: item.order,
        surface: item.surface,
        configuration_available: index !== 2,
        status: index === 2 ? "not-configurable" : "matched",
        selected_asset_sha256: index === 2 ? null : ready.brand_identity.storefront_derivative.sha256,
        readback_sha256: sha(`logo-readback:${item.surface}`),
      })),
    },
    homepage: {
      scope: scope(),
      values: structuredClone(ready.homepage.expected),
      observed_sha256: canonicalSha256(ready.homepage.expected),
      hero_image_sha256: ready.homepage.expected.approved_hero_image_sha256,
      hero_image_alt: ready.homepage.expected.approved_hero_image_alt,
      featured_product_handles: [...ready.homepage.expected.approved_featured_product_handles],
    },
    collections_index: {
      scope: scope(),
      values: structuredClone(ready.collections_index.expected),
      observed_sha256: canonicalSha256(ready.collections_index.expected),
    },
    pages: {
      items: ready.pages.items.map((item) => ({
        order: item.order,
        handle: item.handle,
        route: item.route,
        title: item.title,
        seo_title: item.seo_title,
        seo_description: item.seo_description,
        seo_sha256: item.approved_seo_sha256,
        content_sha256: item.approved_content_sha256,
      })),
    },
    collections: {
      items: ready.collections.items.map((item) => ({
        order: item.order,
        handle: item.handle,
        route: item.route,
        title: item.title,
        seo_title: item.seo_title,
        seo_description: item.seo_description,
        seo_sha256: item.approved_seo_sha256,
        description_sha256: item.approved_description_sha256,
        rendered_html_sha256: item.approved_rendered_html_sha256,
        image_sha256: item.approved_image_sha256,
        image_alt: item.approved_image_alt,
        product_handles: [...item.approved_product_handles],
      })),
    },
    navigation: {
      scope: scope(),
      observed: navigationObserved,
      observed_sha256: canonicalSha256(navigationObserved),
    },
    search_and_filters: {
      scope: scope(),
      observed_filters: structuredClone(ready.search_and_filters.filters),
      vendor_filter_present: false,
      observed_sha256: canonicalSha256({ filters: ready.search_and_filters.filters, vendor_filter_present: false }),
    },
    policies: {
      items: ready.policies.items.map((item) => ({
        order: item.order,
        identity: item.identity,
        route: item.route,
        title: item.expected_title,
        content_sha256: item.approved_content_sha256,
        normalized_body: providerBody("policy", item.identity),
        detected_third_party_names: [],
      })),
    },
    settings: {
      scope: scope(),
      values: structuredClone(ready.settings.expected),
      observed_sha256: canonicalSha256(ready.settings.expected),
    },
    domains: {
      scope: scope(),
      ...domainValues,
      observed_sha256: canonicalSha256(domainValues),
    },
    notifications: {
      sender: (() => {
        const values = {
          display_name: ready.notifications.sender_presentation.display_name,
          sender_address_sha256: ready.notifications.sender_presentation.approved_sender_address_sha256,
          sender_domain_sha256: ready.notifications.sender_presentation.approved_sender_domain_sha256,
          authenticated: true,
          domain_ownership_status: "approved",
        };
        return { ...values, readback_sha256: canonicalSha256(values) };
      })(),
      items: ready.notifications.items.map((item) => ({
        order: item.order,
        identity: item.identity,
        subject: item.approved_subject,
        subject_sha256: item.approved_subject_sha256,
        body_sha256: item.approved_body_sha256,
        normalized_body: providerBody("notification", item.identity),
        detected_third_party_names: [],
      })),
    },
  };
}

function categories(result) {
  return result.issues.map((issue) => issue.category);
}

test("public expectations and all source bindings pass integrity while provider-ready approvals remain pending", () => {
  assert.deepEqual(validateProviderSurfacesContract(contract).issues, []);
  assert.deepEqual(validateProviderSurfaceSourceBindings(contract, sourceFixture()).issues, []);
  const evidence = readbackFixture(readyContract());
  evidence.source_contract_sha256 = providerSurfaceContractSha256(contract);
  const result = validateProviderSurfaceReadback(contract, evidence, {
    now: NOW,
    expectedCandidateThemeId: THEME_ID,
    expectedPackageSha256: PACKAGE_SHA,
  });
  assert.ok(categories(result).some((category) => category.startsWith("source-approval.")));
});

test("local source reads reject traversal, absolute paths, and symbolic links", (context) => {
  const parent = mkdtempSync(path.join(appRoot, ".provider-read-boundary-test-"));
  const root = path.join(parent, "root");
  mkdirSync(root);
  const inside = path.join(root, "inside.txt");
  const outside = path.join(parent, "outside.txt");
  writeFileSync(inside, "inside");
  writeFileSync(outside, "outside");
  try {
    assert.equal(resolveContainedRegularFile(root, "inside.txt"), realpathSync(inside));
    assert.equal(resolveContainedRegularFile(root, "../outside.txt"), null);
    assert.equal(resolveContainedRegularFile(root, outside), null);
    const linked = path.join(root, "linked.txt");
    try {
      symlinkSync(outside, linked, "file");
      assert.equal(resolveContainedRegularFile(root, "linked.txt"), null);
    } catch (error) {
      if (!["EPERM", "EACCES", "UNKNOWN"].includes(error?.code)) throw error;
      context.diagnostic("symbolic-link creation was unavailable; traversal checks still ran");
    }
  } finally {
    rmSync(parent, { recursive: true, force: true });
  }
});

test("private provider readback paths reject NTFS ADS and Windows edge segments", () => {
  assert.equal(safePrivateOperationsPath(".artifacts/operations/provider/readback.json"), true);
  for (const candidate of [
    ".artifacts/operations/provider/readback.json:stream",
    ".artifacts/operations/provider/trailing./readback.json",
    ".artifacts/operations/provider/trailing /readback.json",
    ".artifacts/operations/provider/CON/readback.json",
    ".artifacts/operations/provider/[readback].json",
    ".artifacts/operations/../readback.json",
  ]) assert.equal(safePrivateOperationsPath(candidate), false, candidate);
});

test("fully approved source plus exact private readback satisfies provider readiness", () => {
  const ready = readyContract();
  assert.deepEqual(validateProviderSurfacesContract(ready).issues, []);
  assert.deepEqual(validateProviderSurfaceReadback(ready, readbackFixture(ready), {
    now: NOW,
    expectedCandidateThemeId: THEME_ID,
    expectedPackageSha256: PACKAGE_SHA,
  }).issues, []);
});

test("navigation order, URL drift, and unmodeled child links fail exact parity", () => {
  for (const mutate of [
    (evidence) => evidence.navigation.observed.header.reverse(),
    (evidence) => { evidence.navigation.observed.header[0].destination = "/collections/all"; },
    (evidence) => { evidence.navigation.observed.header[0].children.push({ order: 1, label: "Extra", destination: "/pages/about", children: [] }); },
  ]) {
    const ready = readyContract();
    const evidence = readbackFixture(ready);
    mutate(evidence);
    evidence.navigation.observed_sha256 = canonicalSha256(evidence.navigation.observed);
    assert.ok(categories(validateProviderSurfaceReadback(ready, evidence, { now: NOW })).includes("readback.exact-parity"));
  }
});

test("filter label, parameter order, and Vendor presence fail closed", () => {
  const ready = readyContract();
  const evidence = readbackFixture(ready);
  evidence.search_and_filters.observed_filters[0].label = "Formats";
  evidence.search_and_filters.observed_filters.reverse();
  evidence.search_and_filters.vendor_filter_present = true;
  evidence.search_and_filters.observed_sha256 = canonicalSha256({
    filters: evidence.search_and_filters.observed_filters,
    vendor_filter_present: true,
  });
  const found = categories(validateProviderSurfaceReadback(ready, evidence, { now: NOW }));
  assert.ok(found.includes("readback.exact-parity"));
  assert.ok(found.includes("readback.vendor-filter"));
});

test("homepage injection, featured order drift, dedicated hero drift, and settings status mismatch fail", () => {
  const ready = readyContract();
  const publicDrift = structuredClone(ready);
  publicDrift.homepage.expected.hero_text = "Backend platform notes.";
  publicDrift.homepage.expected_sha256 = canonicalSha256(publicDrift.homepage.expected);
  assert.ok(categories(validateProviderSurfacesContract(publicDrift)).some((category) => category.includes("system-language")));

  const evidence = readbackFixture(ready);
  evidence.homepage.featured_product_handles.reverse();
  evidence.homepage.hero_image_sha256 = sha("wrong-hero");
  evidence.homepage.hero_image_alt = "";
  evidence.candidate.admin_status = "unpublished";
  const found = categories(validateProviderSurfaceReadback(ready, evidence, { now: NOW }));
  assert.ok(found.includes("readback.featured-products"));
  assert.ok(found.includes("readback.hero-image"));
  assert.ok(found.includes("readback.hero-image-alt"));
  assert.ok(found.includes("status-semantics"));
});

test("page and collection SEO, RTE, media, membership, and ordering drift fail", () => {
  const ready = readyContract();
  const evidence = readbackFixture(ready);
  evidence.pages["items"][0].seo_title = "Changed title";
  evidence.pages.items[1].content_sha256 = sha("changed-page");
  evidence.collections.items[0].seo_description = "Changed description";
  evidence.collections.items[1].rendered_html_sha256 = sha("changed-html");
  evidence.collections.items[2].image_alt = "Changed image";
  evidence.collections.items[3].product_handles.reverse();
  const found = categories(validateProviderSurfaceReadback(ready, evidence, { now: NOW }));
  for (const expected of ["readback.identity", "readback.content-sha256", "readback.rendered-html-sha256", "readback.media-parity", "readback.membership-parity"]) {
    assert.ok(found.includes(expected), expected);
  }
});

test("collection approvals reject empty, duplicate, unknown, and incomplete main membership", () => {
  for (const handles of [[], [EXPECTED_STORE_PRODUCT_HANDLES[0], EXPECTED_STORE_PRODUCT_HANDLES[0]], ["unknown-product"], EXPECTED_STORE_PRODUCT_HANDLES.slice(1)]) {
    const ready = readyContract();
    ready.collections.items[0].approved_product_handles = handles;
    const found = categories(validateProviderSurfacesContract(ready));
    assert.ok(found.includes("item.membership-approval") || found.includes("item.main-membership"));
  }
});

test("homepage featured approval rejects unknown product handles", () => {
  const ready = readyContract();
  ready.homepage.expected.approved_featured_product_handles[5] = "unknown-product";
  ready.homepage.expected_sha256 = canonicalSha256(ready.homepage.expected);
  assert.ok(categories(validateProviderSurfacesContract(ready)).includes("featured-products.approval"));
});

test("emblem provenance and provider logo selection bind canonical reference to storefront derivative", () => {
  const ready = readyContract();
  const evidence = readbackFixture(ready);
  evidence.brand_identity.canonical_reference_sha256 = sha("wrong-canonical");
  evidence.brand_identity.provider_logo_readbacks[0].selected_asset_sha256 = ready.brand_identity.canonical_reference.sha256;
  evidence.brand_identity.provider_logo_readbacks[2].configuration_available = null;
  const found = categories(validateProviderSurfaceReadback(ready, evidence, { now: NOW }));
  assert.ok(found.includes("emblem-reference-parity"));
  assert.ok(found.includes("provider-logo.configurable-parity"));
  assert.ok(found.includes("provider-logo.pending"));
});

test("customer domains, canonical URLs, JSON-LD URLs, and absolute links use approved Mochirii hosts", () => {
  const ready = readyContract();
  const evidence = readbackFixture(ready);
  evidence.domains.shop_url = "https://legacy.example";
  evidence.domains.canonical_url_hosts.push("legacy.example");
  evidence.domains.json_ld_url_hosts[0] = "legacy.example";
  evidence.domains.observed_sha256 = canonicalSha256(Object.fromEntries(
    Object.entries(evidence.domains).filter(([key]) => !["scope", "observed_sha256"].includes(key)),
  ));
  assert.ok(categories(validateProviderSurfaceReadback(ready, evidence, { now: NOW })).includes("readback.exact-parity"));
});

test("notification sender presentation requires Mochirii display, approved private hashes, ownership, and authentication", () => {
  const ready = readyContract();
  const evidence = readbackFixture(ready);
  evidence.notifications.sender.authenticated = false;
  evidence.notifications.sender.domain_ownership_status = "pending";
  evidence.notifications.sender.readback_sha256 = canonicalSha256(Object.fromEntries(
    Object.entries(evidence.notifications.sender).filter(([key]) => key !== "readback_sha256"),
  ));
  assert.ok(categories(validateProviderSurfaceReadback(ready, evidence, { now: NOW })).includes("readback.sender-parity"));
});

test("private provider bodies apply shared language policy without exposing matched copy", () => {
  const ready = readyContract();
  const evidence = readbackFixture(ready);
  const marker = "PrivateBodyMarker773";
  const body = `${marker} back&#101;nd pro&#118;ider Shop&#105;fy cal&#109; healing skin. &concealedcopy;`;
  ready.policies.items[0].approved_content_sha256 = textSha256(body);
  evidence.policies.items[0].content_sha256 = textSha256(body);
  evidence.policies.items[0].normalized_body = body;
  evidence.policies.items[0].detected_third_party_names = [];
  evidence.source_contract_sha256 = providerSurfaceContractSha256(ready);
  const result = validateProviderSurfaceReadback(ready, evidence, { now: NOW });
  const found = categories(result);
  for (const category of [
    "readback.body-language.system-language",
    "readback.body-language.mood-only-language",
    "readback.body-language.unsupported-claim",
    "readback.body-language.third-party-name",
    "readback.body-language.unresolved-html-entity",
  ]) assert.ok(found.includes(category), category);
  assert.equal(JSON.stringify(result.issues).includes(marker), false);
});

test("reviewed mandatory-name exceptions authorize one exact private provider body", () => {
  const ready = readyContract();
  const evidence = readbackFixture(ready);
  const body = "Shopify privacy disclosure.";
  ready.policies.items[0].approved_content_sha256 = textSha256(body);
  evidence.policies.items[0].content_sha256 = textSha256(body);
  evidence.policies.items[0].normalized_body = body;
  evidence.policies.items[0].detected_third_party_names = ["Shopify"];
  evidence.source_contract_sha256 = providerSurfaceContractSha256(ready);
  const mandatoryNameExceptions = {
    status: "reviewed",
    rendered_review: {
      status: "reviewed",
      reviewer: "compliance-reviewer",
      review_date: "2026-07-19",
      reviewed_route_categories: ["policies-and-privacy"],
    },
    entries: [{
      surface: "rendered-body:policies-and-privacy",
      route: ready.policies.items[0].route,
      exact_name: "Shopify",
      legal_or_contractual_reason: "Required privacy disclosure",
      exact_approved_wording: body,
      reviewer: "compliance-reviewer",
      review_date: "2026-07-19",
    }],
  };
  const result = validateProviderSurfaceReadback(ready, evidence, { now: NOW, mandatoryNameExceptions });
  assert.equal(categories(result).includes("readback.body-language.third-party-name"), false);
});

test("pending and approved copy/hash lifecycle states are strict", () => {
  const pendingPolicy = structuredClone(contract);
  pendingPolicy.policies.items[0].approved_content_sha256 = sha("should-be-null");
  assert.ok(categories(validateProviderSurfacesContract(pendingPolicy)).includes("item.pending-state"));

  const brokenNotification = readyContract();
  brokenNotification.notifications.items[0].approved_subject_sha256 = sha("wrong-subject");
  assert.ok(categories(validateProviderSurfacesContract(brokenNotification)).includes("item.subject-sha256"));

  for (const definition of [schema.$defs.homepage_expected, schema.$defs.collection_expectation, schema.$defs.policy, schema.$defs.notification, schema.$defs.notification_sender]) {
    assert.ok(Array.isArray(definition.allOf) && definition.allOf.length > 0);
  }
  assert.equal(schema.$defs.sha256.pattern, "^(?!([a-f0-9])\\1{63}$)[a-f0-9]{64}$");
  assert.equal(
    schema.$defs.collection_expectation.allOf.at(-1).else.properties.approved_product_handles.minItems,
    1,
  );
});

test("missing keys and repeated-character placeholder hashes fail integrity", () => {
  const missing = structuredClone(contract);
  delete missing.navigation.header;
  assert.ok(categories(validateProviderSurfacesContract(missing)).includes("root.keys"));

  const placeholder = structuredClone(contract);
  placeholder.navigation.expected_sha256 = "a".repeat(64);
  placeholder.pages.items[0].approved_content_sha256 = "0".repeat(64);
  const found = categories(validateProviderSurfacesContract(placeholder));
  assert.ok(found.includes("expectations.sha256"));
  assert.ok(found.includes("item.content-sha256"));

  assert.doesNotThrow(() => validateProviderSurfaceReadback(undefined, {}, { now: NOW }));
  assert.deepEqual(
    validateProviderSurfaceReadback(undefined, {}, { now: NOW }).issues,
    [{ surface: "provider-readback", category: "source-contract.invalid" }],
  );
});

test("source escape bindings and shared customer-language policy reject regressions without echoing content", () => {
  const source = sourceFixture();
  source.files.set("sections/main-index.liquid", source.files.get("sections/main-index.liquid").replace("section.settings.hero_heading | escape", "section.settings.hero_heading"));
  const marker = "PrivateMarker551";
  const copy = JSON.parse(source.files.get("content/approved-customer-copy.json"));
  copy.pages[0].bodyHtml += `<p>${marker} backend provider notes. S<span>elfnamed</span> details.</p>`;
  source.files.set("content/approved-customer-copy.json", JSON.stringify(copy));
  const result = validateProviderSurfaceSourceBindings(contract, source);
  const serialized = JSON.stringify(result.issues);
  assert.ok(categories(result).includes("source.escape-or-binding"));
  assert.ok(categories(result).some((category) => category.includes("system-language") || category.includes("third-party-name")));
  assert.ok(categories(result).some((category) => category.includes("third-party-name")));
  assert.equal(serialized.includes(marker), false);
});

test("private evidence freshness rejects impossible dates and stale captures", () => {
  const ready = readyContract();
  for (const capturedAt of ["2026-02-30T19:30:00.000Z", "2026-07-17T19:30:00.000Z"]) {
    const evidence = readbackFixture(ready);
    evidence.captured_at = capturedAt;
    assert.ok(categories(validateProviderSurfaceReadback(ready, evidence, { now: NOW })).includes("root.freshness"));
  }
});

test("standalone provider-ready CLI requires private path, target theme, and package bindings", () => {
  const check = spawnSync(process.execPath, [
    path.join(appRoot, "scripts/check-provider-surfaces.mjs"),
    "--require-provider-ready",
    "--private-readback",
    path.join(appRoot, "missing.json"),
  ], { cwd: appRoot, encoding: "utf8", windowsHide: true });
  assert.equal(check.status, 2);
  assert.match(check.stderr, /category=arguments/u);
});
