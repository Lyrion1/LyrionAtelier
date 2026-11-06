#!/usr/bin/env python3
"""Build a Google Merchant Center / Pinterest / Microsoft Merchant Center product feed
from data/catalogue.json. Usage: python3 build_merchant_feed.py <repo_root> <out_dir>
Only listed, physical products are included (readings and digital certificates are
services, which Shopping listings do not accept)."""
import json, sys, re, csv, os, html
from xml.sax.saxutils import escape
root = sys.argv[1] if len(sys.argv) > 1 else "."
out = sys.argv[2] if len(sys.argv) > 2 else "."
BASE = "https://lyrionatelier.com"
cat = json.load(open(os.path.join(root, "data/catalogue.json")))
sitemap = open(os.path.join(root, "sitemap.xml")).read()
locs = set(re.findall(r"<loc>([^<]+)</loc>", sitemap))
SKIP_TYPES = {"reading"}
DIGITAL = {"compatibility-digital-certificate", "pet-birth-chart-keepsake", "newborn-birth-chart-keepsake"}
GPC = {  # Google product taxonomy ids
    "hoodie": "5322", "sweatshirt": "5322", "crewneck": "5322", "tee": "212", "t-shirt": "212", "tank": "212",
    "polo": "212", "jersey": "212", "crop": "212", "windbreaker": "5598", "beanie": "173", "cap": "173",
    "bucket-hat": "173", "socks": "209", "slides": "187", "pyjama": "208", "mousepad": "5363", "pillow": "4454",
    "tote": "6551", "weekender": "6551", "bag": "6551", "bandana": "5207", "mug": "2169", "print": "500044",
    "framed": "500044", "box": "5096",
}
def gpc(slug, title):
    s = (slug + " " + title).lower()
    for k, v in GPC.items():
        if k in s: return v
    return "166"  # Apparel & Accessories
def link_for(p):
    l = p.get("link")
    if l:
        u = BASE + re.sub(r"\.html$", "", l)
        if u in locs: return u
    for cand in (f"{BASE}/shop/{p['slug']}", f"{BASE}/product?slug={p['slug']}"):
        if cand in locs: return cand
    return f"{BASE}/product?slug={p['slug']}"
def img(u):
    return u if u.startswith("http") else BASE + u
def clean(t, n=4900):
    t = re.sub(r"\s+", " ", (t or "").replace("\u2022", "-")).strip()
    return t[:n]
AGE = {"youth": "kids"}
GENDER = {"women": "female", "men": "male", "unisex": "unisex"}
rows, warnings = [], []
for p in cat["products"]:
    if not p.get("listed") or p.get("type") in SKIP_TYPES or p["slug"] in DIGITAL:
        continue
    imgs = [img(i) for i in (p.get("images") or [])]
    if not imgs:
        warnings.append(f"{p['slug']}: no image, skipped"); continue
    variants = p.get("variants") or [{"sku": p["slug"], "price_gbp": p["price_gbp"]["min"]}]
    is_apparel = p.get("type") == "apparel"
    for v in variants:
        price = v.get("price_gbp") or p["price_gbp"]["min"]
        color = v.get("color") or (p.get("palette") if isinstance(p.get("palette"), str) and p.get("palette") not in ("winter-souls",) else "")
        if is_apparel and not color:
            warnings.append(f"{p['slug']} / {v.get('sku')}: apparel without colour (Merchant Center will flag it; add `color` to the variant)")
        title = p.get("seoTitle") or p["title"]
        if v.get("size") and v.get("size") not in ("Standard", "One Size"):
            title = f"{p['title']} - {v['size']}"
        rows.append({
            "id": v.get("sku") or f"{p['slug']}-{v.get('size','')}",
            "item_group_id": p["slug"] if len(variants) > 1 else "",
            "title": clean(title, 150),
            "description": clean(p.get("seoDescription") or p.get("description")),
            "link": link_for(p),
            "image_link": imgs[0],
            "additional_image_link": ",".join(imgs[1:11]),
            "availability": "in_stock",
            "price": f"{price:.2f} GBP",
            "brand": "Lyrīon Atelier",
            "condition": "new",
            "identifier_exists": "no",
            "mpn": v.get("sku") or p["slug"],
            "google_product_category": gpc(p["slug"], p["title"]),
            "product_type": " > ".join(x for x in ["Lyrīon Atelier", p.get("collection") or p.get("category") or "", p.get("sign") or ""] if x),
            "gender": GENDER.get(p.get("gender") or "unisex", "unisex"),
            "age_group": AGE.get(p.get("category"), "adult"),
            "color": color or "",
            "size": v.get("size") if v.get("size") not in (None, "Standard") else "",
            "custom_label_0": p.get("sign") or "all-signs",
            "custom_label_1": p.get("element") or "",
            "custom_label_2": "gift",
            "shipping": "GB:::5.99 GBP",
        })
os.makedirs(out, exist_ok=True)
cols = list(rows[0].keys())
with open(os.path.join(out, "google_merchant_feed.tsv"), "w", newline="") as f:
    w = csv.DictWriter(f, fieldnames=cols, delimiter="\t"); w.writeheader(); w.writerows(rows)
with open(os.path.join(out, "product_feed.xml"), "w") as f:
    f.write('<?xml version="1.0" encoding="UTF-8"?>\n<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">\n<channel>\n<title>Lyrīon Atelier</title>\n<link>https://lyrionatelier.com</link>\n<description>Astrology-led fashion and gifts</description>\n')
    for r in rows:
        f.write("<item>\n")
        for k in cols:
            if not r[k]: continue
            tag = "g:" + k if k not in ("title", "description", "link") else k
            if k == "shipping":
                f.write("<g:shipping><g:country>GB</g:country><g:price>5.99 GBP</g:price></g:shipping>\n"); continue
            if k == "additional_image_link":
                for u in r[k].split(","): f.write(f"<g:additional_image_link>{escape(u)}</g:additional_image_link>\n")
                continue
            f.write(f"<{tag}>{escape(str(r[k]))}</{tag}>\n")
        f.write("</item>\n")
    f.write("</channel>\n</rss>\n")
with open(os.path.join(out, "feed_warnings.txt"), "w") as f:
    f.write("\n".join(warnings) + "\n")
print(f"{len(rows)} items from {len({r['item_group_id'] or r['id'] for r in rows})} products; {len(warnings)} warnings")
