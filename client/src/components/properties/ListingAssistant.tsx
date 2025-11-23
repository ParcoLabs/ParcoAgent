// client/src/components/properties/ListingAssistant.tsx
import * as React from "react";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import {
  apiCreateListingDraft,
  apiApproveListing,
  apiPublishListing,
  type Listing,
} from "@/lib/listings.api";

type Props = {
  property: {
    id?: string;
    name?: string;
    address?: string | null;
    units?: number | null;
    occ?: number | null;
    noiTtm?: number | null;
  } | null;
};

export default function ListingAssistant({ property }: Props) {
  const [beds, setBeds] = React.useState<number>(2);
  const [baths, setBaths] = React.useState<number>(1);
  const [sqft, setSqft] = React.useState<number>(1200);
  const [notes, setNotes] = React.useState<string>("");

  const [listing, setListing] = React.useState<Listing | null>(null);
  const [price, setPrice] = React.useState<number | "">("");
  const [ad, setAd] = React.useState<string>("");
  const [images, setImages] = React.useState<string[]>([]); // base64 previews

  const createDraft = useMutation({
    mutationFn: async () =>
      apiCreateListingDraft({
        propertyId: property?.id ?? null,
        propertyName: property?.name ?? null,
        address: property?.address ?? null,
        units: property?.units ?? null,
        occ: property?.occ ?? null,
        noiTtm: property?.noiTtm ?? null,
        beds,
        baths,
        sqft,
        notes: notes || null,
        images: images.length ? images : null,
      }),
    onSuccess: (lst) => {
      setListing(lst);
      setPrice(lst.price);
      setAd(lst.ad);
    },
  });

  const approve = useMutation({
    mutationFn: async () =>
      apiApproveListing({
        listingId: listing?.id,
        propertyId: property?.id ?? null,
        propertyName: property?.name ?? null,
        ad,
        price: typeof price === "number" ? price : undefined,
        images: images.length ? images : null,
      }),
    onSuccess: (lst) => {
      setListing(lst);
    },
  });

  const publish = useMutation({
    mutationFn: async () =>
      apiPublishListing({
        listingId: listing!.id,
        price: typeof price === "number" ? price : undefined,
        sites: ["streeteasy", "rent.com"],
      }),
    onSuccess: (result) => {
      setListing(result.listing);
      alert(
        `Published to: ${result.publish.postedTo.map((p: any) => p.site).join(", ")}`
      );
    },
  });

  function humanStatus(s?: Listing["status"]) {
    if (!s) return "No draft";
    if (s === "draft") return "Draft created";
    if (s === "approved") return "Approved (ready to publish)";
    if (s === "published") return "Published";
    return s;
  }

  async function onPickFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    const next: string[] = [];
    for (const f of files) {
      const data = await readAsDataURL(f);
      next.push(data);
    }
    setImages((prev) => prev.concat(next).slice(0, 12)); // cap 12
    e.currentTarget.value = "";
  }

  return (
    <div className="bg-white/80 backdrop-blur border rounded-2xl p-4 md:p-5">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-semibold">Listing Assistant</h3>
        <div className="text-xs text-slate-500">
          {humanStatus(listing?.status)}
        </div>
      </div>

      {/* inputs row */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div>
          <div className="text-xs text-slate-500 mb-1">Beds</div>
          <Input
            type="number"
            min={0}
            value={beds}
            onChange={(e) => setBeds(Number(e.target.value))}
          />
        </div>
        <div>
          <div className="text-xs text-slate-500 mb-1">Baths</div>
          <Input
            type="number"
            min={0}
            value={baths}
            onChange={(e) => setBaths(Number(e.target.value))}
          />
        </div>
        <div>
          <div className="text-xs text-slate-500 mb-1">Sq Ft</div>
          <Input
            type="number"
            min={0}
            value={sqft}
            onChange={(e) => setSqft(Number(e.target.value))}
          />
        </div>
        <div className="col-span-2">
          <div className="text-xs text-slate-500 mb-1">Notes</div>
          <Input
            placeholder="2 bath, close to subway…"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>
      </div>

      {/* actions */}
      <div className="mt-3 flex flex-wrap gap-2">
        <Button
          onClick={() => createDraft.mutate()}
          disabled={createDraft.isPending}
        >
          {createDraft.isPending ? "Creating…" : "Create Ad & Price"}
        </Button>

        <Button
          variant="outline"
          onClick={() => approve.mutate()}
          disabled={!listing || approve.isPending}
        >
          {approve.isPending ? "Approving…" : "Approve Draft"}
        </Button>

        <Button
          variant="secondary"
          onClick={() => publish.mutate()}
          disabled={!listing || (listing && listing.status === "published") || publish.isPending}
        >
          {publish.isPending
            ? "Publishing…"
            : listing?.status === "published"
            ? "Published"
            : "Publish to Sites"}
        </Button>
      </div>

      {/* editor */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 mt-4">
        <div>
          <div className="text-xs text-slate-500 mb-1">Price (USD / mo)</div>
          <Input
            type="number"
            min={0}
            value={price}
            onChange={(e) => setPrice(e.target.value === "" ? "" : Number(e.target.value))}
            disabled={!listing}
          />
        </div>
        <div>
          <div className="text-xs text-slate-500 mb-1">Add Photos</div>
          <Input
            type="file"
            multiple
            accept="image/*"
            onChange={onPickFiles}
            disabled={createDraft.isPending}
          />
        </div>
      </div>

      {images.length > 0 && (
        <div className="mt-3 grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
          {images.map((src, i) => (
            <div key={i} className="relative">
              <img
                src={src}
                alt={`upload-${i}`}
                className="w-full h-20 object-cover rounded-lg border"
              />
              <button
                className="absolute -top-2 -right-2 bg-white border rounded-full w-6 h-6 text-xs"
                onClick={() =>
                  setImages((prev) => prev.filter((_, idx) => idx !== i))
                }
                title="Remove"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="mt-4">
        <div className="text-xs text-slate-500 mb-1">Ad Copy</div>
        <Textarea
          className="min-h-[160px]"
          value={ad}
          onChange={(e) => setAd(e.target.value)}
          disabled={!listing}
        />
      </div>
    </div>
  );
}

/* utils */
function readAsDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("file read error"));
    reader.onload = () => resolve(String(reader.result));
    reader.readAsDataURL(file);
  });
}
