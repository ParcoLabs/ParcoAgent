import * as React from "react";
import type { PropertyRow } from "@/types/properties";
import { api, apiListRequests, apiCreateRequest } from "@/lib/api";
import { useQueryClient } from "@tanstack/react-query";
import { ChevronDown, ChevronRight } from "lucide-react";

/* --------------------------- Types --------------------------- */
type RequestRow = {
  id: string;
  summary: string;
  category?: string;
  priority?: string;
  status?: string;
  tenantName?: string;
  property?: string; // stored as NAME on server (mock/in-memory)
  createdAt?: string;
};

type ListingImage = { name: string; dataUrl: string };

type ListingResult = {
  id: string;
  propertyId?: string | null;
  propertyName?: string | null;
  ad: string;
  price: number;
  status: "draft" | "approved" | "published";
  images?: ListingImage[];
  sites?: Array<{ site: string; status: string; ref: string }>;
  createdAt: string;
  approvedAt?: string | null;
  publishedAt?: string | null;
};

/* ---------------------- Demo units/tenants types ---------------------- */
type UnitRow = { id: string; unit: string; beds?: number | null; baths?: number | null; rent?: number | null; status?: "vacant" | "occupied" | "model" };
type TenantRow = { id: string; unit: string; name: string; email?: string; phone?: string; leaseStart?: string; leaseEnd?: string; rent?: number | null };

const uid = () => Math.random().toString(36).slice(2, 9);

export default function PropertyDetailsPane({ selected }: { selected: PropertyRow | null }) {
  const qc = useQueryClient();

  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [allRequests, setAllRequests] = React.useState<RequestRow[]>([]);
  const [filtered, setFiltered] = React.useState<RequestRow[]>([]);

  // Inline create form state
  const [summary, setSummary] = React.useState("");
  const [tenantName, setTenantName] = React.useState("");
  const [category, setCategory] = React.useState("Plumbing");
  const [priority, setPriority] = React.useState("Medium");
  const [creating, setCreating] = React.useState(false);
  const [msg, setMsg] = React.useState<string | null>(null);

  // Listing Assistant state
  const [beds, setBeds] = React.useState<number | "">("");
  const [baths, setBaths] = React.useState<number | "">("");
  const [sqft, setSqft] = React.useState<number | "">("");
  const [notes, setNotes] = React.useState("");
  const [listing, setListing] = React.useState<ListingResult | null>(null);

  // NEW: editable fields for the draft (ad/price)
  const [adEdited, setAdEdited] = React.useState<string>("");
  const [priceEdited, setPriceEdited] = React.useState<string>("");

  // NEW: images (data URLs for demo)
  const [images, setImages] = React.useState<ListingImage[]>([]);

  // Approve/publish toggles
  const [approvedLocal, setApprovedLocal] = React.useState(false);

  const [genLoading, setGenLoading] = React.useState(false);
  const [approveLoading, setApproveLoading] = React.useState(false);
  const [pubLoading, setPubLoading] = React.useState(false);
  const [toast, setToast] = React.useState<string | null>(null);

  // Collapsible: Listing Assistant
  const [listingOpen, setListingOpen] = React.useState(false);

  // Units & Tenants drill-down (demo local store per property)
  const [units, setUnits] = React.useState<UnitRow[]>([]);
  const [tenants, setTenants] = React.useState<TenantRow[]>([]);
  const [unitsOpen, setUnitsOpen] = React.useState(true);

  // clear transient toast
  React.useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2500);
    return () => clearTimeout(t);
  }, [toast]);

  const propName = selected?.name?.trim() || "";
  const propId = (selected as any)?.id || "";
  const address = selected?.address || "";
  const unitsCount = typeof (selected as any)?.units === "number" ? (selected as any)?.units : undefined;
  const occ = typeof (selected as any)?.occ === "number" ? (selected as any)?.occ : undefined;
  const noiTtm = typeof (selected as any)?.noiTtm === "number" ? (selected as any)?.noiTtm : undefined;

  // ---- Load requests via your api.ts wrapper (BASE already /api) ----
  async function loadAllRequests() {
    setLoading(true);
    setError(null);
    try {
      const data = await apiListRequests(); // get("/requests")
      const items: RequestRow[] = Array.isArray(data) ? data : (data as any)?.items || [];
      setAllRequests(items);
    } catch (e: any) {
      setError(e?.message || "Failed to load requests");
    } finally {
      setLoading(false);
    }
  }

  // Reset on property change
  React.useEffect(() => {
    setMsg(null);
    setAllRequests([]);
    setFiltered([]);
    setListing(null);
    setAdEdited("");
    setPriceEdited("");
    setImages([]);
    setApprovedLocal(false);
    // demo seed for units/tenants (per property)
    setUnits([
      { id: uid(), unit: "1A", beds: 1, baths: 1, rent: 2400, status: "occupied" },
      { id: uid(), unit: "2B", beds: 2, baths: 1, rent: 3050, status: "occupied" },
      { id: uid(), unit: "3C", beds: 2, baths: 2, rent: 0, status: "vacant" },
    ]);
    setTenants([
      { id: uid(), unit: "1A", name: "Alicia Gomez", email: "alicia@example.com", phone: "+1 555-0001", leaseStart: "2025-01-01", leaseEnd: "2025-12-31", rent: 2400 },
      { id: uid(), unit: "2B", name: "Marcus Lee", email: "marcus@example.com", phone: "+1 555-0002", leaseStart: "2025-02-01", leaseEnd: "2026-01-31", rent: 3050 },
    ]);
    if (propName) loadAllRequests();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [propName]);

  // Filter
  React.useEffect(() => {
    const p = (propName || "").toLowerCase();
    setFiltered(
      allRequests.filter((r) => {
        const rp = (r.property || "").toLowerCase();
        return rp === p || rp.startsWith(p) || rp.includes(p);
      })
    );
  }, [allRequests, propName]);

  // Keep editable fields synced to current draft
  React.useEffect(() => {
    if (!listing) return;
    setAdEdited(listing.ad || "");
    setPriceEdited(String(listing.price ?? ""));
    setImages(listing.images || []);
    setApprovedLocal(listing.status === "approved" || listing.status === "published");
  }, [listing?.id]); // reset when new draft generated

  // ---- Create request linked by property NAME ----
  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!propName || !summary.trim()) return;

    setCreating(true);
    setMsg(null);
    try {
      const res = await apiCreateRequest({
        summary: summary.trim(),
        category,
        priority,
        property: propName, // server expects a string name in mock mode
        tenantName: tenantName.trim() || undefined,
      });

      const id = (res as any)?.id || (res as any)?.requestId;

      setMsg("Request created.");
      setSummary("");
      setTenantName("");

      await qc.invalidateQueries({ queryKey: ["/requests"] });
      await loadAllRequests();

      if (id) {
        window.location.href = `/requests?select=${encodeURIComponent(id)}`;
      }
    } catch (e: any) {
      setMsg(e?.message || "Failed to create request.");
    } finally {
      setCreating(false);
    }
  }

  /* -------------------- Listing Assistant Actions -------------------- */
  async function handleGenerate() {
    if (!propName) return;
    setGenLoading(true);
    setListing(null);
    setApprovedLocal(false);
    try {
      const payload = {
        propertyId: propId,
        propertyName: propName,
        address,
        units: unitsCount,
        occ,
        noiTtm,
        beds: beds === "" ? undefined : Number(beds),
        baths: baths === "" ? undefined : Number(baths),
        sqft: sqft === "" ? undefined : Number(sqft),
        notes: notes || undefined,
      };
      const res = await api<{ ok: boolean; results: any[] }>("/agent/execute", {
        method: "POST",
        body: { action: "property-create-listing", payload },
      });

      const first =
        (res as any)?.results?.[0]?.result ||
        (res as any)?.result ||
        (res as any)?.results?.[0] ||
        null;

      if (first?.ad && typeof first?.price === "number") {
        setListing(first as ListingResult);
        setAdEdited(first.ad);
        setPriceEdited(String(first.price));
        setToast("Listing draft created.");
        setListingOpen(true); // auto-open on create
      } else if (first?.ad && typeof first?.priceSuggested === "number") {
        // backward-compatible shape
        const tmp = {
          id: `temp-${Math.random().toString(36).slice(2, 8)}`,
          propertyId: propId,
          propertyName: propName,
          ad: first.ad,
          price: first.priceSuggested,
          status: "draft",
          createdAt: new Date().toISOString(),
        } as ListingResult;
        setListing(tmp);
        setAdEdited(tmp.ad);
        setPriceEdited(String(tmp.price));
        setToast("Listing draft created.");
        setListingOpen(true);
      } else {
        setToast("Listing created but no content returned.");
      }
    } catch {
      setToast("Failed to create listing.");
    } finally {
      setGenLoading(false);
    }
  }

  async function handleApprove() {
    if (!listing) return;
    const priceNum = Number(priceEdited || 0);
    if (!adEdited.trim() || !priceNum) {
      setToast("Enter ad copy and price, then approve.");
      return;
    }
    setApproveLoading(true);
    try {
      const res = await api<{ ok: boolean; results: any[] }>("/agent/execute", {
        method: "POST",
        body: {
          action: "property-approve-listing",
          payload: {
            listingId: listing.id,
            ad: adEdited,
            price: priceNum,
            propertyId: listing.propertyId,
            propertyName: listing.propertyName,
            images, // << send images with approve
          },
        },
      });
      const result = (res as any)?.results?.[0]?.result as ListingResult | undefined;
      if (result?.status === "approved") {
        setListing(result);
      } else {
        // Fallback: mark approved locally (ensures Publish enable)
        setListing({
          ...(listing as ListingResult),
          ad: adEdited,
          price: priceNum,
          images,
          status: "approved",
          approvedAt: new Date().toISOString(),
        });
      }
      setApprovedLocal(true);
      setToast("Listing approved.");
      await qc.invalidateQueries({ queryKey: ["/audit"] });
    } catch {
      // Final fallback: still allow publish after local approve
      setListing({
        ...(listing as ListingResult),
        ad: adEdited,
        price: Number(priceEdited || 0),
        images,
        status: "approved",
        approvedAt: new Date().toISOString(),
      });
      setApprovedLocal(true);
      setToast("Listing approved (offline).");
    } finally {
      setApproveLoading(false);
    }
  }

  async function handlePublish() {
    if (!listing) return;
    if (!(approvedLocal || listing.status === "approved")) {
      setToast("Approve the listing first.");
      return;
    }
    setPubLoading(true);
    try {
      const res = await api<{ ok: boolean; results: any[] }>("/agent/execute", {
        method: "POST",
        body: {
          action: "property-publish-listing",
          payload: {
            listingId: listing.id,
            propertyId: listing.propertyId,
            ad: listing.ad,
            price: listing.price,
            sites: ["streeteasy", "rent.com"],
            images, // carry images to publish result
          },
        },
      });
      const first =
        (res as any)?.results?.[0]?.result ||
        (res as any)?.result ||
        (res as any)?.results?.[0] ||
        null;

      if (first?.status === "published") {
        setListing(first as ListingResult);
        setToast("Listing published to StreetEasy & Rent.com.");
      } else {
        // publish queued or fallback
        setListing({
          ...(listing as ListingResult),
          status: "published",
          publishedAt: new Date().toISOString(),
        });
        setToast("Publish queued.");
      }
      await qc.invalidateQueries({ queryKey: ["/audit"] });
    } catch {
      // offline publish fallback
      setListing({
        ...(listing as ListingResult),
        status: "published",
        publishedAt: new Date().toISOString(),
      });
      setToast("Published (offline).");
    } finally {
      setPubLoading(false);
    }
  }

  // Handle image selection → read as data URL
  async function onPickImages(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const readers = Array.from(files).map(
      (file) =>
        new Promise<ListingImage>((resolve, reject) => {
          const fr = new FileReader();
          fr.onerror = () => reject(new Error("file read error"));
          fr.onload = () => resolve({ name: file.name, dataUrl: String(fr.result || "") });
          fr.readAsDataURL(file);
        })
    );
    try {
      const results = await Promise.all(readers);
      setImages((prev) => [...prev, ...results]);
      setToast(`${results.length} image${results.length > 1 ? "s" : ""} added.`);
    } catch {
      setToast("Failed to read one or more images.");
    } finally {
      // allow picking same file again later
      e.currentTarget.value = "";
    }
  }

  // derived: occupancy and NOI from units/tenants for the header
  const occupiedUnits = tenants.length;
  const totalUnits = Math.max(units.length, unitsCount || 0);
  const occPct = totalUnits > 0 ? Math.round((occupiedUnits / totalUnits) * 100) : (occ ?? 0);
  const noiDisplay = typeof noiTtm === "number" ? noiTtm : tenants.reduce((sum, t) => sum + (t.rent || 0), 0) * 12;

  /* ----------------------------- Render ----------------------------- */
  if (!selected) {
    return (
      <div className="flex h-full items-center justify-center rounded-2xl border border-dashed border-gray-200 bg-white p-10 text-gray-500">
        Select a property to view details.
      </div>
    );
  }

  const canPublish = !!listing && (approvedLocal || listing.status === "approved") && !pubLoading;

  return (
    <div className="space-y-6">
      {/* Property summary */}
      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-xl font-semibold">{selected.name}</h3>
            <p className="mt-1 text-sm text-gray-600">{selected.address || "—"}</p>
          </div>
          <div className="text-right">
            <div className="text-xs text-gray-500">Units / Occupancy</div>
            <div className="text-sm">
              {totalUnits} • {occPct}%
            </div>
            <div className="text-xs text-gray-500 mt-1">NOI (TTM est.)</div>
            <div className="text-sm">${(noiDisplay || 0).toLocaleString()}</div>
          </div>
        </div>
      </div>

      {/* Units & Tenants drill-down */}
      <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
        <button
          className="w-full flex items-center justify-between px-6 py-4 text-left hover:bg-gray-50"
          onClick={() => setUnitsOpen((v) => !v)}
        >
          <div className="text-lg font-semibold">Units & Tenants</div>
          {unitsOpen ? <ChevronDown className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
        </button>

        {unitsOpen && (
          <div className="px-6 pb-6">
            {/* Units table */}
            <div className="rounded-xl border bg-white overflow-hidden">
              <div className="px-4 py-3 border-b font-medium">Units</div>
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr className="text-left">
                      <th className="px-4 py-2">Unit</th>
                      <th className="px-4 py-2">Beds</th>
                      <th className="px-4 py-2">Baths</th>
                      <th className="px-4 py-2">Rent</th>
                      <th className="px-4 py-2">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {units.map((u) => (
                      <tr key={u.id} className="border-t">
                        <td className="px-4 py-2">{u.unit}</td>
                        <td className="px-4 py-2">{u.beds ?? "—"}</td>
                        <td className="px-4 py-2">{u.baths ?? "—"}</td>
                        <td className="px-4 py-2">{u.rent ? `$${u.rent.toLocaleString()}` : "—"}</td>
                        <td className="px-4 py-2 capitalize">{u.status ?? "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* quick add row */}
              <div className="p-3 border-t flex gap-2 flex-wrap">
                <button
                  className="rounded-lg border px-3 py-1 text-sm hover:bg-gray-50"
                  onClick={() =>
                    setUnits((prev) => [
                      ...prev,
                      { id: uid(), unit: `U${prev.length + 1}`, beds: 1, baths: 1, rent: 0, status: "vacant" },
                    ])
                  }
                >
                  + Add Unit
                </button>
              </div>
            </div>

            {/* Tenants table */}
            <div className="rounded-xl border bg-white overflow-hidden mt-4">
              <div className="px-4 py-3 border-b font-medium">Tenants</div>
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr className="text-left">
                      <th className="px-4 py-2">Name</th>
                      <th className="px-4 py-2">Unit</th>
                      <th className="px-4 py-2">Email</th>
                      <th className="px-4 py-2">Phone</th>
                      <th className="px-4 py-2">Lease</th>
                      <th className="px-4 py-2">Rent</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tenants.map((t) => (
                      <tr key={t.id} className="border-t">
                        <td className="px-4 py-2">{t.name}</td>
                        <td className="px-4 py-2">{t.unit}</td>
                        <td className="px-4 py-2">{t.email || "—"}</td>
                        <td className="px-4 py-2">{t.phone || "—"}</td>
                        <td className="px-4 py-2">
                          {t.leaseStart ? new Date(t.leaseStart).toLocaleDateString() : "—"} —{" "}
                          {t.leaseEnd ? new Date(t.leaseEnd).toLocaleDateString() : "—"}
                        </td>
                        <td className="px-4 py-2">{t.rent ? `$${t.rent.toLocaleString()}` : "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* quick add row */}
              <div className="p-3 border-t flex gap-2 flex-wrap">
                <button
                  className="rounded-lg border px-3 py-1 text-sm hover:bg-gray-50"
                  onClick={() =>
                    setTenants((prev) => [
                      ...prev,
                      {
                        id: uid(),
                        unit: units.find((u) => u.status !== "model")?.unit || "1A",
                        name: "New Tenant",
                        email: "",
                        phone: "",
                        leaseStart: "",
                        leaseEnd: "",
                        rent: null,
                      },
                    ])
                  }
                >
                  + Add Tenant
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Inline create request */}
      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <h4 className="text-lg font-semibold">Add New Request</h4>
        <p className="mt-1 text-sm text-gray-600">
          Creates a request already linked to <span className="font-medium">{selected.name}</span>.
        </p>

        <form onSubmit={handleCreate} className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
          <label className="flex flex-col gap-1">
            <span className="text-sm text-gray-600">Summary *</span>
            <input
              className="rounded-xl border border-gray-300 p-2"
              placeholder="e.g., Leak under kitchen sink"
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              required
            />
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-sm text-gray-600">Tenant Name</span>
            <input
              className="rounded-xl border border-gray-300 p-2"
              placeholder="Optional"
              value={tenantName}
              onChange={(e) => setTenantName(e.target.value)}
            />
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-sm text-gray-600">Category</span>
            <select
              className="rounded-xl border border-gray-300 p-2"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              <option>Plumbing</option>
              <option>Electrical</option>
              <option>HVAC</option>
              <option>Cleaning</option>
              <option>General</option>
              <option>Other</option>
            </select>
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-sm text-gray-600">Priority</span>
            <select
              className="rounded-xl border border-gray-300 p-2"
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
            >
              <option>Low</option>
              <option>Medium</option>
              <option>High</option>
              <option>Urgent</option>
            </select>
          </label>

          <div className="md:col-span-2 flex items-center gap-3 pt-1">
            <button
              type="submit"
              disabled={creating || !summary.trim()}
              className="rounded-2xl bg-black px-4 py-2 text-white disabled:opacity-60"
            >
              {creating ? "Creating…" : "Create Request"}
            </button>
            {msg && <span className="text-sm text-gray-700">{msg}</span>}
          </div>
        </form>
      </div>

      {/* Listing Assistant — collapsible */}
      <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
        <button
          className="w-full flex items-center justify-between px-6 py-4 text-left hover:bg-gray-50"
          onClick={() => setListingOpen((v) => !v)}
        >
          <div className="text-lg font-semibold">Create a rental listing</div>
          {listingOpen ? <ChevronDown className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
        </button>

        {listingOpen && (
          <div className="px-6 pb-6">
            {toast && <div className="text-sm text-emerald-700 mb-2">{toast}</div>}
            <p className="text-sm text-gray-600">
              Generate an ad and suggested price for <span className="font-medium">{selected.name}</span>, then{" "}
              <span className="font-medium">Approve</span> and <span className="font-medium">Publish</span> (mock) to StreetEasy &amp; Rent.com.
            </p>

            {/* Quick facts */}
            <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-4">
              <label className="flex flex-col gap-1">
                <span className="text-sm text-gray-600">Beds</span>
                <input
                  className="rounded-xl border border-gray-300 p-2"
                  type="number"
                  min={0}
                  value={beds}
                  onChange={(e) => setBeds(e.target.value === "" ? "" : Number(e.target.value))}
                />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-sm text-gray-600">Baths</span>
                <input
                  className="rounded-xl border border-gray-300 p-2"
                  type="number"
                  min={0}
                  step="0.5"
                  value={baths}
                  onChange={(e) => setBaths(e.target.value === "" ? "" : Number(e.target.value))}
                />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-sm text-gray-600">Sq Ft</span>
                <input
                  className="rounded-xl border border-gray-300 p-2"
                  type="number"
                  min={0}
                  value={sqft}
                  onChange={(e) => setSqft(e.target.value === "" ? "" : Number(e.target.value))}
                />
              </label>
              <label className="flex flex-col gap-1 md:col-span-1">
                <span className="text-sm text-gray-600">Notes</span>
                <input
                  className="rounded-xl border border-gray-300 p-2"
                  placeholder="Renovated kitchen, in-unit W/D, etc."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </label>
            </div>

            {/* Actions */}
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <button
                className="rounded-2xl bg-blue-600 px-4 py-2 text-white disabled:opacity-60"
                onClick={handleGenerate}
                disabled={genLoading}
              >
                {genLoading ? "Generating…" : "Create Ad & Price"}
              </button>

              <button
                className="rounded-2xl border px-4 py-2 hover:bg-gray-50 disabled:opacity-60"
                onClick={handleApprove}
                disabled={!listing || listing.status === "approved" || listing.status === "published" || approveLoading}
              >
                {approveLoading ? "Approving…" : listing?.status === "approved" ? "Approved" : "Approve Draft"}
              </button>

              <button
                className="rounded-2xl border px-4 py-2 hover:bg-gray-50 disabled:opacity-60"
                onClick={handlePublish}
                disabled={!canPublish}
              >
                {pubLoading ? "Publishing…" : "Publish to Sites"}
              </button>

              {listing?.status && (
                <span className="text-sm text-gray-600">
                  Status: <span className="font-medium capitalize">{approvedLocal ? "approved" : listing.status}</span>
                </span>
              )}
            </div>

            {/* Ad editor / preview + Image uploader */}
            {listing && (
              <div className="mt-4 rounded-xl border bg-gray-50 p-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="md:col-span-2">
                    <label className="text-xs text-gray-500">Ad Copy</label>
                    <textarea
                      className="mt-1 w-full rounded-xl border border-gray-300 p-3 min-h-[180px]"
                      value={adEdited}
                      onChange={(e) => setAdEdited(e.target.value)}
                    />
                  </div>
                  <div className="md:col-span-1">
                    <label className="text-xs text-gray-500">Price (USD / mo)</label>
                    <input
                      className="mt-1 w-full rounded-xl border border-gray-300 p-2"
                      type="number"
                      min={0}
                      step={25}
                      value={priceEdited}
                      onChange={(e) => setPriceEdited(e.target.value)}
                    />

                    <div className="mt-4">
                      <label className="text-xs text-gray-500">Photos</label>
                      <input
                        className="mt-1 w-full rounded-xl border border-gray-300 p-2"
                        type="file"
                        multiple
                        accept="image/*"
                        onChange={onPickImages}
                      />
                      {images.length > 0 && (
                        <div className="mt-2 grid grid-cols-3 gap-2">
                          {images.map((img, idx) => (
                            <div key={`${img.name}-${idx}`} className="rounded-lg border bg-white p-1">
                              <img src={img.dataUrl} alt={img.name} className="h-20 w-full object-cover rounded" />
                              <div className="mt-1 flex items-center justify-between">
                                <span className="truncate text-[10px] text-gray-600">{img.name}</span>
                                <button
                                  className="text-[10px] text-red-600"
                                  onClick={() => setImages((prev) => prev.filter((_, i) => i !== idx))}
                                >
                                  remove
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="mt-2 text-xs text-gray-500">
                      Current status: <span className="font-medium">{approvedLocal ? "approved" : listing.status}</span>
                    </div>
                  </div>
                </div>

                {listing?.sites && listing.status === "published" && (
                  <div className="mt-4 text-sm text-gray-700">
                    Posted to:
                    <ul className="mt-1 list-disc pl-5">
                      {listing.sites.map((s) => (
                        <li key={s.ref}>
                          {s.site} — {s.status} ({s.ref})
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Requests for this property */}
      <div className="rounded-2xl border border-gray-200 bg-white p-0 shadow-sm overflow-hidden">
        <div className="border-b px-6 py-4">
          <h4 className="text-lg font-semibold">Requests for {selected.name}</h4>
        </div>

        {loading ? (
          <div className="p-6 text-sm text-gray-500">Loading…</div>
        ) : error ? (
          <div className="p-6 text-sm text-red-600">{error}</div>
        ) : filtered.length === 0 ? (
          <div className="p-6 text-sm text-gray-500">No requests yet.</div>
        ) : (
          <ul className="divide-y">
            {filtered.map((r) => (
              <li key={r.id} className="px-6 py-4 hover:bg-gray-50">
                <div className="flex items-center justify-between">
                  <div className="min-w-0">
                    <div className="truncate font-medium">{r.summary}</div>
                    <div className="mt-1 text-xs text-gray-600">
                      {r.category || "—"} • {r.priority || "—"} • {r.status || "open"}
                      {r.tenantName ? ` • ${r.tenantName}` : ""}
                      {r.createdAt ? ` • ${new Date(r.createdAt).toLocaleString()}` : ""}
                    </div>
                  </div>
                  <button
                    className="text-sm text-blue-700 hover:underline"
                    onClick={() => {
                      window.location.href = `/requests?select=${encodeURIComponent(r.id)}`;
                    }}
                  >
                    View
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
