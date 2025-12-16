import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

const WIDTH = 900, HEIGHT = 1200; // 3×4 in @300dpi
const OUT = path.join(process.cwd(), 'printful-files/brand/neck-label-3x4in.png');
const SUN = path.join(process.cwd(), 'printful-files/brand/sun-1_25in.png');

function svgText(){
 // Simple, elegant black text on white
 return `<svg xmlns='http://www.w3.org/2000/svg' width='${WIDTH}' height='${HEIGHT}'>
 <style>
 .t1{font:700 48px Georgia, 'Times New Roman', serif; fill:#000; letter-spacing:1px}
 .t2{font:400 24px -apple-system,system-ui,Arial,sans-serif; fill:#111}
 .t3{font:400 22px -apple-system,system-ui,Arial,sans-serif; fill:#222}
 .rule{stroke:#000; stroke-width:1; opacity:.12}
 </style>
 <rect x='0' y='0' width='100%' height='100%' fill='#fff'/>
 <text x='450' y='340' text-anchor='middle' class='t1'>LYRION ATELIER</text>
 <text x='450' y='382' text-anchor='middle' class='t2'>Designed in London • Crafted on demand</text>
 <line x1='120' y1='410' x2='780' y2='410' class='rule'/>
 <text x='450' y='468' text-anchor='middle' class='t2'>Size: XS–2XL</text>
 <text x='450' y='510' text-anchor='middle' class='t2'>100% Cotton</text>
 <text x='450' y='560' text-anchor='middle' class='t3'>Machine wash cold, inside out</text>
 <text x='450' y='592' text-anchor='middle' class='t3'>Do not bleach • Tumble dry low</text>
 <text x='450' y='624' text-anchor='middle' class='t3'>Cool iron if needed • Do not dry clean</text>
 <line x1='120' y1='820' x2='780' y2='820' class='rule'/>
 <text x='450' y='880' text-anchor='middle' class='t3'>Wash similar colours • Do not iron print</text>
 <text x='450' y='912' text-anchor='middle' class='t3'>www.lyrionatelier.com</text>
 </svg>`;
}

async function run(){
 if (!fs.existsSync(SUN)) {
 console.error('Missing favicon:', SUN, '\nPlease add printful-files/brand/sun-1_25in.png first.'); 
 process.exit(0);
 }
 // Base white PNG
 const base = sharp({ create: { width: WIDTH, height: HEIGHT, channels: 3, background: '#ffffff' } });
 // Sun centered near top (300×300)
 const sunBuf = await sharp(SUN).resize(300,300,{fit:'contain'}).png().toBuffer();
 const sunLeft = Math.round((WIDTH-300)/2), sunTop = 80;

 // Text overlay via SVG render
 const textBuf = Buffer.from(svgText());

 const out = await base
 .composite([
 { input: sunBuf, left: sunLeft, top: sunTop },
 { input: textBuf, left: 0, top: 0 }
 ])
 .png({ compressionLevel: 9 })
 .toBuffer();

 await fs.promises.mkdir(path.dirname(OUT), { recursive: true });
 await fs.promises.writeFile(OUT, out);
 console.log('Wrote', OUT.replace(process.cwd(), ''));
}

await run();
