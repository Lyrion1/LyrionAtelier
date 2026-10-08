# Artwork for new designs

What the design intake needs in `artwork/incoming/design-{id}.png`, and the
options for producing that file automatically from the engine's
`artwork_prompt`. The owner chooses the route; nothing here is switched on.

## The file Printful needs

The intake reads the exact printfile size for the chosen blank and placement
from Printful (`GET /mockup-generator/printfiles/{product}`) and refuses
artwork far smaller than it. For each garment in `data/garments.json`:

| Garment (blank) | Placement | Printfile | Format |
| --- | --- | --- | --- |
| Tee (Bella + Canvas 3001), DTG | `front` | 12 × 16 in at 150 DPI = **1800 × 2400 px**; Printful is enlarging some DTG blanks to 15 × 18 in (2250 × 2700 px), and the intake uses whatever Printful reports | PNG, transparent background, sRGB IEC61966-2.1 |
| Hoodie (Gildan 18500), DTG | `front` | as reported by Printful for the blank (front area at 150 DPI) | PNG, transparent, sRGB |
| Sweatshirt (Gildan 18000), DTG | `front` | as reported by Printful for the blank (front area at 150 DPI) | PNG, transparent, sRGB |
| Any of the above, embroidered | `embroidery_chest_left` | small chest area; the size is on the product's File guidelines tab in Printful | PNG only, flat colours, no gradients or fine hairlines; Printful digitises the design (a one-time fee per design) |

General rules from Printful's file guidance:

- 150 DPI at print size for apparel (300 DPI for small items and paper);
  more than 300 DPI adds nothing.
- PNG for DTG, because it keeps the background transparent; JPEG does not.
- sRGB colour profile; maximum upload 200 MB.
- Nothing important within a few millimetres of the printfile edge.

The engine's `palette`, `wording` and `decoration` should be honoured in the
artwork itself; the intake uses `decoration` only to choose print or
embroidery.

## Producing the file automatically: options

All prices are per image as published by third-party trackers in mid to late
2026 (sources below). They change often: check the provider's own pricing
page before choosing. A finished design usually needs several generations,
an upscale to the printfile size, and background removal.

| Route | Output | Typical cost per image | Notes |
| --- | --- | --- | --- |
| OpenAI GPT Image 2 (or 1.5) | raster, up to about 1536 px | roughly $0.006 (low) to $0.21 (high) for 1024 × 1024; Batch is half price on 1.5 | strong with lettering (`wording`); needs upscaling to 1800 × 2400 and background removal |
| Google Imagen 4 / Gemini image models | raster | roughly $0.02 to $0.06 (Imagen 4 tiers), $0.02 to $0.13 (Gemini image) | one tracker lists Imagen 4 as deprecated in August 2026; confirm before building on it |
| Ideogram 4.0 API | raster, can return transparent backgrounds | $0.03 Turbo, $0.06 Default, $0.10 Quality | good typography; still needs upscaling |
| Recraft V4.1 Vector | **SVG** | roughly $0.035 to $0.08 (Pro vector about $0.33) | vector scales to any printfile without loss and suits embroidery; Recraft moved to credits in September 2026 |
| A human illustrator, briefed from `artwork_prompt` | whatever is asked for | quoted per design | slowest; no generation fees; rights are clearest |

Whatever the route, the step after generation is the same: save the PNG as
`artwork/incoming/design-{id}.png` (or have the engine commit it there) and
the intake does the rest.

Points to weigh: whether lettering must be exact (favours GPT Image or
Ideogram), whether embroidery is common (favours vector), cost per approved
design rather than per image, and the provider's terms on commercial use of
generated images.

Sources:
[GPT Image 2 API pricing](https://aireiter.com/blog/gpt-image-2-api-pricing),
[GPT Image 1.5 pricing](https://www.aifreeapi.com/en/posts/gpt-image-1-5-pricing-api),
[Google Imagen API pricing](https://pricepertoken.com/imagen-pricing),
[AI image pricing, Google vs OpenAI](https://intuitionlabs.ai/articles/ai-image-generation-pricing-google-openai),
[Ideogram API pricing](https://developer.puter.com/tutorials/ideogram-api-pricing/),
[Recraft V4.1 pricing](https://tech-insider.org/how-to-use-recraft-ai-2026/),
[Recraft pricing changes](https://checkthat.ai/brands/recraft/pricing),
[Printful: preparing a print file](https://help.printful.com/hc/en-us/articles/28491464259740-How-should-I-prepare-my-print-file-for-the-best-results),
[Printful: preparing a design for embroidery](https://help.printful.com/hc/en-us/articles/28727397325340-How-should-I-prepare-my-design-for-embroidery),
[Printful Graphics and Embroidery Guide](https://www.printful.com/graphics-and-embroidery-guide).
