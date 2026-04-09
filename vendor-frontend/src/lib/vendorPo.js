import { supabase } from "./supabase";

/**
 * Get all org_ids this vendor is linked to.
 *
 * vendors.user_id is UNIQUE → only one vendors row per user.
 * Extra orgs come from vendor_org_links bridge table.
 */
export async function getVendorLinkedOrgIds(userId, vendor) {
  const ids = new Set();

  if (vendor?.org_id) ids.add(vendor.org_id);

  if (vendor?.id) {
    const { data: links, error } = await supabase
      .from("vendor_org_links")
      .select("org_id")
      .eq("vendor_id", vendor.id);

    if (error) {
      console.warn("[vendor-frontend] vendor_org_links:", error.message, error);
    } else {
      (links || []).forEach((row) => {
        if (row?.org_id) ids.add(row.org_id);
      });
    }
  }

  return [...ids];
}

function normalizeName(s) {
  return (s || "").toLowerCase().replace(/\s+/g, " ").trim();
}

function namesLikelyMatch(companyName, supplierName) {
  const a = normalizeName(companyName);
  const b = normalizeName(supplierName);
  if (!a || !b) return false;
  return a === b || a.includes(b) || b.includes(a);
}

/**
 * Purchase orders visible to this vendor.
 *
 * Path A — by linked org_id(s)
 * Path B — by supplier_name ilike match
 *
 * If BOTH return empty despite matching rows in the DB, the cause is
 * almost certainly RLS. Run these policies in Supabase SQL editor:
 *
 *   CREATE POLICY "Vendors can view their org POs"
 *   ON public.purchase_orders FOR SELECT
 *   USING (
 *     org_id IN (
 *       SELECT org_id FROM public.vendors
 *       WHERE user_id = auth.uid() AND org_id IS NOT NULL
 *     )
 *     OR supplier_name ILIKE '%' || (
 *       SELECT company_name FROM public.vendors
 *       WHERE user_id = auth.uid() LIMIT 1
 *     ) || '%'
 *   );
 */
export async function fetchVendorPurchaseOrders(userId, vendor) {
  if (!vendor) return [];

  const orgIds = await getVendorLinkedOrgIds(userId, vendor);
  const company = (vendor.company_name || "").trim();
  const byId = new Map();

  const merge = (rows) => {
    (rows || []).forEach((r) => {
      if (r?.id) byId.set(r.id, r);
    });
  };

  // ── Path A: by linked org(s) ─────────────────────────────────────────────
  if (orgIds.length > 0) {
    const { data, error, status, statusText } = await supabase
      .from("purchase_orders")
      .select("*")
      .in("org_id", orgIds)
      .order("created_at", { ascending: false });

    // Log both data and error — RLS silently returns [] with no error
    console.log("[vendor-frontend] PO fetch (by org) →", {
      orgIds,
      status,
      statusText,
      rowCount: data?.length ?? 0,
      error: error ?? null,
    });

    if (error) {
      console.error("[vendor-frontend] PO fetch (by org) ERROR:", error);
    } else {
      merge(data);
    }
  }

  // ── Path B: by supplier_name fuzzy match ─────────────────────────────────
  if (company) {
    const esc = company
      .replace(/\\/g, "\\\\")
      .replace(/%/g, "\\%")
      .replace(/_/g, "\\_");

    const { data, error, status, statusText } = await supabase
      .from("purchase_orders")
      .select("*")
      .ilike("supplier_name", `%${esc}%`)
      .order("created_at", { ascending: false });

    console.log("[vendor-frontend] PO fetch (by supplier_name) →", {
      company,
      status,
      statusText,
      rowCount: data?.length ?? 0,
      error: error ?? null,
    });

    if (error) {
      console.error("[vendor-frontend] PO fetch (by supplier) ERROR:", error);
    } else {
      merge(data);
    }
  }

  if (byId.size === 0) {
    console.warn(
      "[vendor-frontend] fetchVendorPurchaseOrders: 0 results after both paths.\n" +
        "► If matching rows exist in the DB this is an RLS policy issue.\n" +
        "► Apply the CREATE POLICY statements from the comment above this function.",
      { orgIds, company }
    );
  }

  const merged = [...byId.values()].sort(
    (a, b) =>
      new Date(b.created_at || b.po_date || 0) -
      new Date(a.created_at || a.po_date || 0)
  );

  return merged.filter((po) => {
    const orgMatch = orgIds.length > 0 && po.org_id && orgIds.includes(po.org_id);
    const nameMatch = namesLikelyMatch(vendor.company_name, po.supplier_name);
    return orgMatch || nameMatch;
  });
}

/**
 * Attach organizations.legal_name to each PO for table display.
 */
export async function enrichPOsWithOrganizations(pos) {
  const ids = [...new Set((pos || []).map((p) => p.org_id).filter(Boolean))];
  if (ids.length === 0) {
    return (pos || []).map((p) => ({ ...p, organizations: null }));
  }

  const { data: orgs, error } = await supabase
    .from("organizations")
    .select("id, legal_name")
    .in("id", ids);

  if (error) {
    console.warn("[vendor-frontend] organizations (enrich PO):", error.message);
  }

  const map = Object.fromEntries((orgs || []).map((o) => [o.id, o]));
  return (pos || []).map((p) => ({
    ...p,
    organizations:
      p.org_id && map[p.org_id] ? { legal_name: map[p.org_id].legal_name } : null,
  }));
}

/**
 * Invoices visible to this vendor — same dual-path strategy as POs.
 *
 * RLS policy needed:
 *   CREATE POLICY "Vendors can view their org invoices"
 *   ON public.invoices FOR SELECT
 *   USING (
 *     org_id IN (
 *       SELECT org_id FROM public.vendors
 *       WHERE user_id = auth.uid() AND org_id IS NOT NULL
 *     )
 *     OR supplier_name ILIKE '%' || (
 *       SELECT company_name FROM public.vendors
 *       WHERE user_id = auth.uid() LIMIT 1
 *     ) || '%'
 *   );
 */
export async function fetchVendorInvoices(userId, vendor) {
  if (!vendor) return [];

  const orgIds = await getVendorLinkedOrgIds(userId, vendor);
  const company = (vendor.company_name || "").trim();
  const byId = new Map();

  const merge = (rows) => {
    (rows || []).forEach((r) => {
      if (r?.id) byId.set(r.id, r);
    });
  };

  if (orgIds.length > 0) {
    const { data, error, status, statusText } = await supabase
      .from("invoices")
      .select("*")
      .in("org_id", orgIds)
      .order("created_at", { ascending: false });

    console.log("[vendor-frontend] Invoice fetch (by org) →", {
      orgIds,
      status,
      statusText,
      rowCount: data?.length ?? 0,
      error: error ?? null,
    });

    if (error) {
      console.error("[vendor-frontend] Invoice fetch (by org) ERROR:", error);
    } else {
      merge(data);
    }
  }

  if (company) {
    const esc = company
      .replace(/\\/g, "\\\\")
      .replace(/%/g, "\\%")
      .replace(/_/g, "\\_");

    const { data, error, status, statusText } = await supabase
      .from("invoices")
      .select("*")
      .ilike("supplier_name", `%${esc}%`)
      .order("created_at", { ascending: false });

    console.log("[vendor-frontend] Invoice fetch (by supplier_name) →", {
      company,
      status,
      statusText,
      rowCount: data?.length ?? 0,
      error: error ?? null,
    });

    if (error) {
      console.error("[vendor-frontend] Invoice fetch (by supplier) ERROR:", error);
    } else {
      merge(data);
    }
  }

  if (byId.size === 0) {
    console.warn(
      "[vendor-frontend] fetchVendorInvoices: 0 results after both paths.",
      { orgIds, company }
    );
  }

  const merged = [...byId.values()].sort(
    (a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0)
  );

  return merged.filter((inv) => {
    const orgMatch = orgIds.length > 0 && inv.org_id && orgIds.includes(inv.org_id);
    const nameMatch = namesLikelyMatch(vendor.company_name, inv.supplier_name);
    return orgMatch || nameMatch;
  });
}

/**
 * Attach organizations.legal_name to each invoice for table display.
 */
export async function enrichInvoicesWithOrganizations(invoices) {
  const ids = [
    ...new Set((invoices || []).map((i) => i.org_id).filter(Boolean)),
  ];
  if (ids.length === 0) {
    return (invoices || []).map((i) => ({ ...i, organizations: null }));
  }

  const { data: orgs, error } = await supabase
    .from("organizations")
    .select("id, legal_name")
    .in("id", ids);

  if (error) {
    console.warn("[vendor-frontend] organizations (enrich inv):", error.message);
  }

  const map = Object.fromEntries((orgs || []).map((o) => [o.id, o]));
  return (invoices || []).map((i) => ({
    ...i,
    organizations:
      i.org_id && map[i.org_id] ? { legal_name: map[i.org_id].legal_name } : null,
  }));
}

/**
 * Attach purchase_orders.po_number to each invoice for table display.
 */
export async function enrichInvoicesWithPONumbers(invoices) {
  const ids = [
    ...new Set((invoices || []).map((i) => i.po_id).filter(Boolean)),
  ];
  if (ids.length === 0) {
    return (invoices || []).map((i) => ({ ...i, po_number: null }));
  }

  const { data: pos, error } = await supabase
    .from("purchase_orders")
    .select("id, po_number")
    .in("id", ids);

  if (error) {
    console.warn("[vendor-frontend] purchase_orders (enrich inv):", error.message);
  }

  const map = Object.fromEntries((pos || []).map((p) => [p.id, p]));
  return (invoices || []).map((i) => ({
    ...i,
    po_number: i.po_id && map[i.po_id] ? map[i.po_id].po_number : null,
  }));
}

/**
 * Connect a vendor to an additional org via the bridge table.
 */
export async function connectVendorToOrg(vendorId, orgId) {
  const { error } = await supabase
    .from("vendor_org_links")
    .upsert(
      { vendor_id: vendorId, org_id: orgId },
      { onConflict: "vendor_id,org_id" }
    );

  if (error) {
    console.error("[vendor-frontend] connectVendorToOrg:", error.message, error);
  }
  return { error };
}
export async function updatePOStatus(poId, newStatus) {
  const updates = { status: newStatus };

  if (newStatus === "acknowledged") {
    updates.acknowledged_at = new Date().toISOString();
  }

  if (newStatus === "closed") {
    updates.closed_at = new Date().toISOString();
  }

  const { error } = await supabase
    .from("purchase_orders")
    .update(updates)
    .eq("id", poId);

  return { error };
}

/**
 * Fetch Goods Receipt Notes (GRNs) associated with authorized purchase orders.
 */
export async function fetchVendorGrns(poIds) {
  if (!poIds || poIds.length === 0) return [];
  
  const { data, error } = await supabase
    .from("grns")
    .select("*, purchase_orders(po_number)")
    .in("po_id", poIds)
    .order("grn_date", { ascending: false });
    
  if (error) {
    console.error("[vendor-frontend] fetchVendorGrns ERROR:", error);
    return [];
  }
  
  return data || [];
}

/**
 * Fetch specific GRN items
 */
export async function fetchVendorGrnItems(grnId) {
  if (!grnId) return [];
  
  const { data, error } = await supabase
    .from("grn_items")
    .select("*")
    .eq("grn_id", grnId);
    
  if (error) {
    console.error(`[vendor-frontend] fetchVendorGrnItems(${grnId}) ERROR:`, error);
    return [];
  }
  
  return data || [];
}