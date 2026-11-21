

const THREE = window.THREE;
import { WORLD, SHOPS, groundY, shoreZ, WATER_Y } from './config.js';
import { mulberry32, pick, range } from './random.js';
const std = (color, rough = 0.9, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: 0.03, ...extra });
function canvasTex(w, h, draw, rx = 1, ry = 1) {
 const c = document.createElement('canvas'); c.width = w; c.height = h;
 draw(c.getContext('2d'), w, h);
 const t = new THREE.CanvasTexture(c);
 t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rx, ry);
 return t;
}
export function signTexture(text, bg, fg = '#ffffff') {
 return canvasTex(512, 128, (g, w, h) => {
  g.fillStyle = bg; g.fillRect(0, 0, w, h);
  g.fillStyle = fg; g.font = `bold ${Math.min(54, Math.floor(470 / Math.max(6, text.length * 0.6)))}px Arial`; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText(text, w / 2, h / 2 + 2);
 });
}
function signMesh(text, wdt, bg) {
 const m = new THREE.Mesh(new THREE.PlaneGeometry(wdt, wdt / 4),
  new THREE.MeshBasicMaterial({ map: signTexture(text, bg), side: THREE.FrontSide }));
 return m;
}
function facadeTex(rng, base, glass = false) {
 return canvasTex(128, 256, (g, w, h) => {
  g.fillStyle = base; g.fillRect(0, 0, w, h);
  for (let y = 10; y < h - 12; y += 22) for (let x = 10; x < w - 12; x += 24) {
   const lit = rng() < 0.42;
   g.fillStyle = glass ? (lit ? '#f7c873' : '#86aec9') : (lit ? '#ffe9a8' : '#31435c');
   g.fillRect(x, y, 14, 15);
   if (!glass && rng() < 0.3) { g.fillStyle = 'rgba(52,44,36,0.6)'; g.fillRect(x - 2, y + 16, 18, 3); g.fillStyle = 'rgba(235,235,235,0.55)'; g.fillRect(x - 2, y + 12, 18, 1); }
   if (rng() < 0.22) { g.fillStyle = '#c9ced2'; g.fillRect(x + 3, y + 17, 7, 4); }
  }
  if (glass) { g.fillStyle = 'rgba(232,240,246,0.6)'; for (let x = 4; x < w; x += 24) g.fillRect(x, 0, 2, h); }
 });
}
export function buildWorld(scene, G) {
 const rng = mulberry32(1337);
 G.colliders = []; G.ramps = []; G.props = [];

 scene.fog = new THREE.Fog(0xf6cd96, 180, 720);
 const skyTex = canvasTex(64, 512, (g, w, h) => {
  const gr = g.createLinearGradient(0, 0, 0, h);
  gr.addColorStop(0, '#27589f'); gr.addColorStop(0.38, '#5f97d8');
  gr.addColorStop(0.66, '#f4bd72'); gr.addColorStop(0.85, '#ff9e4f'); gr.addColorStop(1, '#ff8f45');
  g.fillStyle = gr; g.fillRect(0, 0, w, h);
 });
 const sky = new THREE.Mesh(new THREE.SphereGeometry(880, 24, 14),
  new THREE.MeshBasicMaterial({ map: skyTex, side: THREE.BackSide, fog: false }));
 scene.add(sky);
 const hemi = new THREE.HemisphereLight(0xbfd9ff, 0xe8c493, 0.75); scene.add(hemi);
 const sun = new THREE.DirectionalLight(0xffd9a3, 1.65);
 sun.position.set(-260, 190, 140); scene.add(sun); G.sun = sun;
 const cloudTex = canvasTex(128, 64, (g) => {
  for (let i = 0; i < 14; i++) {
   const gr = g.createRadialGradient(20 + Math.random() * 88, 24 + Math.random() * 16, 2, 40, 32, 26 + Math.random() * 14);
   gr.addColorStop(0, 'rgba(255,250,240,0.85)'); gr.addColorStop(1, 'rgba(255,250,240,0)');
   g.fillStyle = gr; g.fillRect(0, 0, 128, 64);
  }
 });
 G.clouds = [];
 for (let i = 0; i < 10; i++) {
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: cloudTex, transparent: true, depthWrite: false, opacity: 0.85, fog: false }));
  sp.position.set(range(rng, -500, 500), range(rng, 95, 150), range(rng, -500, 400));
  sp.scale.set(range(rng, 90, 170), range(rng, 22, 36), 1);
  scene.add(sp); G.clouds.push(sp);
 }

 const SEG = 110, SIZE = 680;
 const gGeo = new THREE.PlaneGeometry(SIZE, SIZE, SEG, SEG);
 gGeo.rotateX(-Math.PI / 2);
 const posA = gGeo.attributes.position;
 const colors = new Float32Array(posA.count * 3);
 const cGrass = new THREE.Color(0x69a84f), cSand = new THREE.Color(0xe8cf9a),
  cCity = new THREE.Color(0x9aa0a3), cPark = new THREE.Color(0x57b04a), cRock = new THREE.Color(0x8a7a68), tmpC = new THREE.Color();
 for (let i = 0; i < posA.count; i++) {
  const x = posA.getX(i), z = posA.getZ(i);
  const y = groundY(x, z); posA.setY(i, y);
  const s = shoreZ(x);
  if (z > s - 4) tmpC.copy(cSand).lerp(new THREE.Color(0x7d6a4a), Math.min(1, Math.max(0, (z - s) / 26)));
  else if (z > s - 30) tmpC.copy(cSand);
  else if (x > WORLD.city.x0 && x < WORLD.city.x1 && z > WORLD.city.z0 && z < WORLD.city.z1) tmpC.copy(cCity);
  else if (y > 7) tmpC.copy(cRock);
  else tmpC.copy(cGrass);
  if (x > WORLD.park.x0 && x < WORLD.park.x1 && z > WORLD.park.z0 && z < WORLD.park.z1) tmpC.copy(cPark);
  tmpC.offsetHSL(0, 0, (rng() - 0.5) * 0.03);
  colors[i * 3] = tmpC.r; colors[i * 3 + 1] = tmpC.g; colors[i * 3 + 2] = tmpC.b;
 }
 gGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
 gGeo.computeVertexNormals();
 scene.add(new THREE.Mesh(gGeo, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1 })));

 const seaTex = canvasTex(256, 256, (g, w, h) => {
  g.fillStyle = '#22779f'; g.fillRect(0, 0, w, h);
  for (let i = 0; i < 2600; i++) {
   g.fillStyle = Math.random() < 0.5 ? `rgba(255,255,255,${0.03 + Math.random() * 0.07})` : `rgba(8,50,80,${0.03 + Math.random() * 0.06})`;
   g.fillRect(Math.random() * w, Math.random() * h, 1 + Math.random() * 2, 1);
  }
  g.lineWidth = 1;
  for (let i = 0; i < 150; i++) {
   g.strokeStyle = `rgba(255,246,220,${0.02 + Math.random() * 0.05})`;
   const x = Math.random() * w, y = Math.random() * h, len = 3 + Math.random() * 7;
   g.beginPath(); g.moveTo(x, y); g.lineTo(x + len, y + (Math.random() - 0.5) * 1.5); g.stroke();
  }
 }, 30, 30);
 const sea = new THREE.Mesh(new THREE.PlaneGeometry(1500, 1500),
  new THREE.MeshPhongMaterial({ color: 0x5fa8cf, map: seaTex, transparent: true, opacity: 0.88, shininess: 140, specular: 0xfff2cc }));
 sea.rotation.x = -Math.PI / 2; sea.position.y = WATER_Y; scene.add(sea);
 G.seaTex = seaTex;

 const foamMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.55 });
 for (let x = -240; x < 240; x += 8) {
  const f = new THREE.Mesh(new THREE.PlaneGeometry(8.4, 2.6), foamMat);
  f.rotation.x = -Math.PI / 2; f.position.set(x + 4, WATER_Y + 0.03, shoreZ(x + 4) + 1);
  f.rotation.z = Math.atan2(shoreZ(x + 8) - shoreZ(x), 8);
  scene.add(f);
 }

 const shalTex = canvasTex(2, 64, (g, w, h) => {
  const gr = g.createLinearGradient(0, 0, 0, h);
  gr.addColorStop(0, 'rgba(190,240,244,0.55)'); gr.addColorStop(0.55, 'rgba(160,225,235,0.22)'); gr.addColorStop(1, 'rgba(160,225,235,0)');
  g.fillStyle = gr; g.fillRect(0, 0, w, h);
 });
 const shalMat = new THREE.MeshBasicMaterial({ map: shalTex, transparent: true, depthWrite: false });
 for (let x = -240; x < 240; x += 8) {
  const sh = new THREE.Mesh(new THREE.PlaneGeometry(8.4, 20), shalMat);
  sh.rotation.x = -Math.PI / 2; sh.position.set(x + 4, WATER_Y + 0.015, shoreZ(x + 4) + 4);
  sh.rotation.z = Math.atan2(shoreZ(x + 8) - shoreZ(x), 8);
  scene.add(sh);
 }

 const asphaltTex = canvasTex(128, 128, (g, w, h) => {
  g.fillStyle = '#3c4046'; g.fillRect(0, 0, w, h);
  for (let i = 0; i < 500; i++) { g.fillStyle = `rgba(255,255,255,${Math.random() * 0.06})`; g.fillRect(Math.random() * w, Math.random() * h, 2, 2); }
  for (let i = 0; i < 5; i++) { g.strokeStyle = 'rgba(0,0,0,0.25)'; g.beginPath(); const y = Math.random() * h; g.moveTo(0, y); g.lineTo(w, y + 6); g.stroke(); }
 }, 1, 24);
 const roadMat = new THREE.MeshStandardMaterial({ map: asphaltTex, roughness: 0.96 });
 const walkMat = std(0xb9bcbe, 1);
 const dashMat = new THREE.MeshBasicMaterial({ color: 0xf5eeda });
 const flat = (w, d, material, x, z, yOff = 0.06) => {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), material);
  m.rotation.x = -Math.PI / 2; m.position.set(x, groundY(x, z) + yOff, z); scene.add(m); return m;
 };
 const bx = (w, h, d, c, x, y, z) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), typeof c === 'object' ? c : std(c, 0.9)); m.position.set(x, groundY(x, z) + y, z); scene.add(m); return m; };
 const cy = (rt, rb, h, c, x, y, z, seg = 12) => { const m = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), typeof c === 'object' ? c : std(c, 0.9)); m.position.set(x, groundY(x, z) + y, z); scene.add(m); return m; };
 const sph = (r, c, x, y, z) => { const m = new THREE.Mesh(new THREE.SphereGeometry(r, 12, 10), typeof c === 'object' ? c : std(c, 0.9)); m.position.set(x, groundY(x, z) + y, z); scene.add(m); return m; };
 const cz0 = WORLD.city.z0, cz1 = 172, cx0 = WORLD.city.x0, cx1 = WORLD.city.x1;
 for (const ax of WORLD.avenues) {
  flat(WORLD.roadHalf * 2, cz1 - cz0, roadMat, ax, (cz0 + cz1) / 2);
  for (const side of [-1, 1]) flat(3.4, cz1 - cz0, walkMat, ax + side * (WORLD.roadHalf + 1.7), (cz0 + cz1) / 2, 0.09);
  for (let z = cz0 + 8; z < cz1 - 4; z += 12) flat(0.35, 4.4, dashMat, ax, z, 0.1);
 }
 for (const sz of WORLD.streets) {
  flat(cx1 - cx0, WORLD.roadHalf * 2, roadMat, (cx0 + cx1) / 2, sz);
  for (const side of [-1, 1]) flat(cx1 - cx0, 3.4, walkMat, (cx0 + cx1) / 2, sz + side * (WORLD.roadHalf + 1.7), 0.09);
  for (let x = cx0 + 8; x < cx1 - 4; x += 12) flat(4.4, 0.35, dashMat, x, sz, 0.1);
 }

 flat(280, 13, roadMat, 0, 156); flat(280, 3.4, walkMat, 0, 147.5, 0.09); flat(280, 3.4, walkMat, 0, 164.5, 0.09);
 const tacTex = canvasTex(32, 32, (g, w, h) => { g.fillStyle = '#d8b93c'; g.fillRect(0, 0, w, h); g.fillStyle = '#a8892a'; for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) { g.beginPath(); g.arc(4 + i * 8, 4 + j * 8, 2, 0, Math.PI * 2); g.fill(); } }, 90, 1);
 flat(280, 0.55, new THREE.MeshStandardMaterial({ map: tacTex, roughness: 1 }), 0, 148.7, 0.1);
 for (const bx3 of [-105, -35, 35, 105]) {
  const b = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.12, 0.6), std(0x7a5a38, 0.9));
  b.position.set(bx3, groundY(bx3, 146.2) + 0.5, 146.2); scene.add(b);
 }
 const crossMat = new THREE.MeshBasicMaterial({ color: 0xf8f8f2 });
 for (const ax of WORLD.avenues) for (const sz of WORLD.streets) {
  for (let i = -2; i <= 2; i++) {
   const s = new THREE.Mesh(new THREE.PlaneGeometry(0.7, 5.6), crossMat);
   s.rotation.x = -Math.PI / 2; s.position.set(ax + i * 1.6, groundY(ax, sz) + 0.11, sz - WORLD.roadHalf - 1.6);
   scene.add(s);
  }
 }

 G.trafficLights = [];
 const lampPole = std(0x2c2f33, 0.6);
 for (const ax of WORLD.avenues) for (const sz of WORLD.streets) {
  const grp = new THREE.Group(); grp.position.set(ax + 9, groundY(ax, sz), sz - 9);
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.11, 5.2, 8), lampPole); pole.position.y = 2.6; grp.add(pole);
  const headBox = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.95, 0.34), std(0x191b1e, 0.5)); headBox.position.y = 5.2; grp.add(headBox);
  const dots = [];
  [0xff3b30, 0xffcc02, 0x2ee66b].forEach((col, i) => {
   const d = new THREE.Mesh(new THREE.SphereGeometry(0.11, 8, 8), new THREE.MeshBasicMaterial({ color: col }));
   d.position.set(0, 5.52 - i * 0.32, 0.19); grp.add(d); dots.push(d);
  });
  scene.add(grp);
  G.trafficLights.push({ dots, phase: (ax + sz) % 2 === 0 ? 0 : 1 });
 }

 const facades = ['#c8b8a2', '#a8bfce', '#d9c9b4', '#b7c4c9', '#e3d3bd', '#c2a58e'].map((b) => facadeTex(rng, b));
 const glassFacades = ['#54748f', '#6886a0', '#476582'].map((b) => facadeTex(rng, b, true));
 const roofMat = std(0x5c564e, 1);
 function building(x, z, w, d, h, tex) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d),
   [std(0xdddddd), std(0xdddddd), roofMat, roofMat, std(0xdddddd), std(0xdddddd)].map((mm, i) => i < 2 || i > 3 ? new THREE.MeshStandardMaterial({ map: tex, roughness: 0.9 }) : mm));
  m.position.set(x, groundY(x, z) + h / 2, z); scene.add(m);
  const skirt = new THREE.Mesh(new THREE.BoxGeometry(w + 0.7, 0.35, d + 0.7), std(0x777777, 1));
  skirt.position.set(x, groundY(x, z) + 0.17, z); scene.add(skirt);
  if (h >= 38) {
   bx(w * 0.52, 1.2, d * 0.52, 0x4c463f, x, h + 0.6, z);
   bx(1.7, 1, 1.7, 0x9aa0a4, x + w / 4, h + 0.5, z - d / 5);
   if (h >= 52) { cy(0.07, 0.1, 7, 0x333a40, x, h + 3.5, z, 6); sph(0.22, new THREE.MeshBasicMaterial({ color: 0xff4444 }), x, h + 7.1, z); }
  }
  G.colliders.push({ x, z, hx: w / 2 + 0.2, hz: d / 2 + 0.2, h });
  return m;
 }
 const xs = [-112, -67, -22, 22, 67, 112], zs = [-24, 12, 58, 102, 141];
 for (const bx2 of xs) for (const bz of zs) {
  if (bx2 > WORLD.park.x0 - 20 && bx2 < WORLD.park.x1 + 20 && bz > 40 && bz < 118) continue;
  if (bx2 === 67 && (bz === 58 || bz === 102)) continue;
  const downtown = Math.abs(bx2) < 70 && bz > 0 && bz < 110;
  const n = downtown ? 2 : 1;
  for (let i = 0; i < n; i++) {
   const w = range(rng, 13, 19), d = range(rng, 12, 17);
   const h = downtown ? range(rng, 26, 58) : range(rng, 10, 24);
   building(bx2 + (i ? 11 : -8) + range(rng, -2, 2), bz + range(rng, -4, 4), w, d, h, downtown && rng() < 0.45 ? pick(rng, glassFacades) : pick(rng, facades));
  }
 }

 G.shopFronts = [];
 const stripeTex = (c1, c2) => canvasTex(64, 64, (g, w, h) => { for (let i = 0; i < 8; i++) { g.fillStyle = i % 2 ? c1 : c2; g.fillRect(i * 8, 0, 8, h); } }, 3, 1);
 const hex = (n) => '#' + n.toString(16).padStart(6, '0');
 function roofProp(shop, y) {
  const x = shop.x - 3, z = shop.z - 6, k = shop.kind, T = 7;
  if (k === 'burger') {
   cy(1.5, 1.5, 0.35, 0xd8a75c, x, T + 0.18, z); cy(1.56, 1.56, 0.2, 0x7fc95e, x, T + 0.45, z); cy(1.5, 1.5, 0.3, 0x8a5a2e, x, T + 0.68, z);
   const bun = sph(1.5, 0xe8b96a, x, T + 0.8, z); bun.scale.y = 0.62;
  } else if (k === 'pizza') {
   bx(0.35, 0.9, 0.35, 0x555c63, x, T + 0.45, z);
   const disc = cy(2, 2, 0.18, 0xe8c98a, x, T + 1.15, z, 18); disc.rotation.x = 0.42;
   for (let i = 0; i < 5; i++) { const pp = cy(0.3, 0.3, 0.06, 0xb03024, x + Math.cos(i * 2.4) * 1.1, T + 1.32 - Math.sin(i * 2.4) * 0.42, z + Math.sin(i * 2.4) * 1.1, 8); pp.rotation.x = 0.42; }
  } else if (k === 'coffee') {
   cy(1.05, 0.82, 1.5, 0xf4f4f4, x, T + 0.75, z, 14); cy(0.95, 0.95, 0.08, 0x4a2e18, x, T + 1.52, z, 14);
   const hd = new THREE.Mesh(new THREE.TorusGeometry(0.5, 0.13, 8, 14), std(0xf4f4f4, 0.6)); hd.position.set(x + 1.15, groundY(x, z) + T + 0.8, z); scene.add(hd);
  } else if (k === 'bakery') {
   const loaf = sph(1.5, 0xd8a75c, x, T + 0.35, z); loaf.scale.set(1.35, 0.62, 0.78);
   for (let i = -1; i <= 1; i++) { const sl = bx(0.16, 0.1, 0.8, 0xf7e3b0, x + i * 0.7, T + 1.22, z); sl.rotation.z = 0.4; }
  } else if (k === 'ice') {
   const cone = new THREE.Mesh(new THREE.ConeGeometry(1.05, 2.3, 12), std(0xd8a75c, 0.85)); cone.rotation.x = Math.PI; cone.position.set(x, groundY(x, z) + T + 1.15, z); scene.add(cone);
   sph(1.08, 0xf78fb0, x, T + 2.75, z); sph(0.8, 0xfff3f6, x, T + 3.85, z); sph(0.24, 0xd8243c, x, T + 4.6, z);
  } else if (k === 'noodle') {
   cy(1.65, 1.05, 0.95, 0xc2372f, x, T + 0.48, z, 16); cy(1.48, 1.48, 0.12, 0xf2d38a, x, T + 0.98, z, 16);
   for (const s of [-0.3, 0.3]) { const st = bx(0.09, 1.7, 0.09, 0x9a7648, x + s, T + 1.6, z); st.rotation.z = s * 1.4; }
  } else if (k === 'chicken') {
   cy(1.18, 0.92, 1.7, 0xf4f4f4, x, T + 0.85, z, 14); cy(1.19, 1.19, 0.42, 0xc2372f, x, T + 1.1, z, 14);
   const drum = sph(0.58, 0xb06a28, x, T + 2.15, z); drum.scale.y = 1.25;
   const bone = cy(0.11, 0.11, 0.7, 0xf7f0e0, x + 0.3, T + 3.05, z, 8); bone.rotation.z = -0.5;
  } else if (k === 'juice') {
   const sl = cy(1.55, 1.55, 0.4, 0xf28c28, x, T + 1, z, 16); sl.rotation.x = 1.15;
   const inner = cy(1.28, 1.28, 0.42, 0xffd9a0, x, T + 1.02, z, 16); inner.rotation.x = 1.15;
   bx(0.35, 1, 0.35, 0x555c63, x, T + 0.5, z + 0.8);
  } else if (k === 'seafood') {
   const fish = sph(1.35, 0x7fb8d8, x, T + 1.15, z); fish.scale.set(1.7, 0.62, 0.42);
   const tail = new THREE.Mesh(new THREE.ConeGeometry(0.62, 1.1, 4), std(0x5f9ec4, 0.7)); tail.rotation.z = Math.PI / 2; tail.position.set(x - 2.6, groundY(x, z) + T + 1.15, z); scene.add(tail);
   sph(0.14, new THREE.MeshBasicMaterial({ color: 0x10222e }), x + 1.7, T + 1.35, z + 0.5);
   bx(0.35, 0.9, 0.35, 0x555c63, x, T + 0.45, z);
  } else if (k === 'sushi') {
   for (let i = 0; i < 4; i++) sph(0.34, 0xe0483c, shop.x - 6 + i * 4, 5.5, shop.z - 1.1);
   bx(0.55, 1.15, 0.55, 0x8f959a, shop.x - 8.6, 0.58, shop.z - 0.6); bx(0.9, 0.28, 0.9, 0x6e7276, shop.x - 8.6, 1.3, shop.z - 0.6);
  }
 }
 for (const shop of SHOPS) {
  const y = groundY(shop.x, shop.z);
  const body = new THREE.Mesh(new THREE.BoxGeometry(20, 7, 9), std(shop.color, 0.85));
  body.position.set(shop.x, y + 3.5, shop.z - 6); scene.add(body);
  G.colliders.push({ x: shop.x, z: shop.z - 6, hx: 10.2, hz: 4.7, h: 7 });
  const awning = new THREE.Mesh(new THREE.BoxGeometry(20.6, 0.25, 3.4), new THREE.MeshStandardMaterial({ map: stripeTex(hex(shop.color), '#f7f2e6'), roughness: 0.9 }));
  awning.position.set(shop.x, y + 5.1, shop.z - 0.6); awning.rotation.x = 0.25; scene.add(awning);
  const s = signMesh(shop.name, 15, '#20303e'); s.position.set(shop.x, y + 6.2, shop.z - 1.4); scene.add(s);
  const sub = signMesh(shop.sub, 8.5, hex(shop.color)); sub.position.set(shop.x + 5, y + 1, shop.z - 1.38); scene.add(sub);
  const glass = new THREE.Mesh(new THREE.PlaneGeometry(11.5, 3.9), new THREE.MeshStandardMaterial({ color: 0xbfe6f2, roughness: 0.15, metalness: 0.4 }));
  glass.position.set(shop.x - 3.4, y + 2.05, shop.z - 1.45); scene.add(glass);
  bx(1.5, 0.7, 1.5, 0xb9bcbe, shop.x + 6.5, 7.35, shop.z - 7);
  roofProp(shop, y);
  G.shopFronts.push({ ...shop, frontZ: shop.z - 1.2 });
 }

 function civic(x, z, label, color, cross) {
  building(x, z, 22, 14, 11, facades[1]);
  const s = signMesh(label, 16, color); s.position.set(x, groundY(x, z) + 9.6, z + 7.3); scene.add(s);
  if (cross) {
   const cm = std(0xd8342c, 0.5);
   const v = new THREE.Mesh(new THREE.BoxGeometry(0.8, 3, 0.3), cm); v.position.set(x, groundY(x, z) + 12.6, z + 3); scene.add(v);
   const hz = new THREE.Mesh(new THREE.BoxGeometry(3, 0.8, 0.3), cm); hz.position.copy(v.position); scene.add(hz);
  }
 }
 civic(-112, -24, 'PALMERA GENERAL', '#274b63', true);
 civic(112, -24, 'POLICE', '#1d2f52', false);
 civic(-112, 141, 'FIRE & RESCUE', '#7c231c', false);
 G.hospital = { x: -112, z: -12 };
 bx(8.4, 0.3, 3.6, 0xe9e9e9, -112, 4.6, -15.6);
 for (const cx of [-115.6, -108.4]) cy(0.14, 0.14, 4.6, 0xb9bcbe, cx, 2.3, -14.6, 8);
 cy(4.6, 4.6, 0.2, 0x3a3f45, -112, 11.15, -24, 20);
 const hRing = new THREE.Mesh(new THREE.TorusGeometry(3.5, 0.13, 6, 24), new THREE.MeshBasicMaterial({ color: 0xf2c93e })); hRing.rotation.x = Math.PI / 2; hRing.position.set(-112, groundY(-112, -24) + 11.28, -24); scene.add(hRing);
 bx(0.55, 0.07, 2.8, 0xffffff, -113.15, 11.27, -24); bx(0.55, 0.07, 2.8, 0xffffff, -110.85, 11.27, -24); bx(1.75, 0.07, 0.55, 0xffffff, -112, 11.27, -24);
 const em = signMesh('EMERGENCY 24H', 8, '#b02a24'); em.position.set(-104, groundY(-104, -24) + 3.2, -16.6); scene.add(em);
 const chkTex = canvasTex(128, 32, (g, w, h) => { for (let i = 0; i < 16; i++) for (let j = 0; j < 4; j++) { g.fillStyle = (i + j) % 2 ? '#f2f2f2' : '#274b8f'; g.fillRect(i * 8, j * 8, 8, 8); } });
 const chk = new THREE.Mesh(new THREE.PlaneGeometry(22, 1.15), new THREE.MeshBasicMaterial({ map: chkTex })); chk.position.set(112, groundY(112, -24) + 7.6, -16.68); scene.add(chk);
 bx(7.4, 0.3, 3.2, 0x2c3e57, 112, 4.5, -15.8);
 for (const cx of [109, 115]) cy(0.15, 0.15, 4.5, 0xd8d8d8, cx, 2.25, -14.9, 8);
 for (const dx of [-117.2, -106.8]) { bx(4.8, 4.4, 0.3, 0xb03024, dx, 2.2, 148.15); bx(4.8, 0.75, 0.32, 0x9fd4e8, dx, 3.45, 148.15); }
 bx(3.4, 15, 3.4, 0xcbb9a0, -100.6, 7.5, 141);
 const fCap = new THREE.Mesh(new THREE.ConeGeometry(2.7, 1.9, 4), std(0x7c231c, 0.8)); fCap.rotation.y = Math.PI / 4; fCap.position.set(-100.6, groundY(-100.6, 141) + 15.9, 141); scene.add(fCap);
 const fSign = signMesh('STATION 7', 3.2, '#7c231c'); fSign.position.set(-100.6, groundY(-100.6, 141) + 12.4, 142.85); scene.add(fSign);
 G.colliders.push({ x: -100.6, z: 141, hx: 1.8, hz: 1.8, h: 15 });
 building(66, 56, 27, 12, 8, facades[0]);
 bx(27.5, 0.7, 12.5, 0x2e7f86, 66, 4.3, 56);
 const scSign = signMesh('PALMERA PRIMARY', 15, '#1f5f66'); scSign.position.set(66, groundY(66, 56) + 6.4, 62.3); scene.add(scSign);
 bx(6.4, 0.25, 3.2, 0x2e7f86, 66, 3.3, 63.6);
 cy(0.07, 0.09, 7.5, 0x9aa0a4, 52, 3.75, 63, 6);
 bx(1.9, 1.1, 0.08, 0xd8342c, 53, 6.9, 63);
 const courtTex = canvasTex(256, 192, (g, w, h) => {
  g.fillStyle = '#2e5f9e'; g.fillRect(0, 0, w, h);
  g.strokeStyle = '#f4f4f4'; g.lineWidth = 4; g.strokeRect(10, 10, w - 20, h - 20);
  g.beginPath(); g.moveTo(w / 2, 10); g.lineTo(w / 2, h - 10); g.stroke();
  g.beginPath(); g.arc(w / 2, h / 2, 26, 0, Math.PI * 2); g.stroke();
  g.fillStyle = '#e8762c'; g.fillRect(10, h / 2 - 34, 52, 68); g.fillRect(w - 62, h / 2 - 34, 52, 68);
  g.strokeRect(10, h / 2 - 34, 52, 68); g.strokeRect(w - 62, h / 2 - 34, 52, 68);
 });
 flat(17, 13, new THREE.MeshStandardMaterial({ map: courtTex, roughness: 0.95 }), 66, 100, 0.07);
 for (const s of [-1, 1]) {
  const hx2 = 66 + s * 7.6;
  cy(0.09, 0.09, 3.7, 0x333a40, hx2, 1.85, 100, 8);
  bx(1.9, 1.25, 0.09, 0xf4f4f4, hx2 - s * 0.55, 3.35, 100);
  const rim = new THREE.Mesh(new THREE.TorusGeometry(0.46, 0.045, 6, 14), std(0xe8762c, 0.5)); rim.rotation.x = Math.PI / 2; rim.position.set(hx2 - s * 1.05, groundY(hx2, 100) + 3.05, 100); scene.add(rim);
  bx(2.4, 0.12, 0.6, 0x7a5a38, 66, 0.55, 100 + (s > 0 ? 8.2 : -8.2));
 }
 sph(0.34, 0xe8762c, 63, 0.36, 97);

 const pathMat = std(0xd8c9a3, 1);
 flat(56, 3, pathMat, 0, 80, 0.05); flat(3, 56, pathMat, 0, 80, 0.05);
 G.trees = [];
 function tree(x, z, palm = false) {
  const y = groundY(x, z); const g = new THREE.Group(); g.position.set(x, y, z);
  if (palm === 'pine') {
   const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.2, 1.6, 7), std(0x6e5136, 1)); trunk.position.y = 0.8; g.add(trunk);
   const pm = std(0x2f7a3e, 0.95);
   [[1.7, 2.3, 2.2], [1.3, 1.9, 3.5], [0.85, 1.6, 4.6]].forEach(([r, hh, oy]) => {
    const cone = new THREE.Mesh(new THREE.ConeGeometry(r, hh, 9), pm); cone.position.y = oy; g.add(cone);
   });
  } else if (palm) {
   const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.22, 5.6, 7), std(0x8a6a48, 1));
   trunk.position.y = 2.8; trunk.rotation.z = range(rng, -0.08, 0.08); g.add(trunk);
   const frondMat = std(0x3f9e4d, 0.95);
   for (let i = 0; i < 10; i++) {
    const pivot = new THREE.Group(); pivot.position.y = 5.6;
    pivot.rotation.y = (i / 10) * Math.PI * 2 + 0.2; pivot.rotation.z = -0.52 - (i % 3) * 0.13;
    const fr = new THREE.Mesh(new THREE.SphereGeometry(1, 8, 6), frondMat);
    fr.scale.set(1.95, 0.15, 0.46); fr.position.x = 1.6; pivot.add(fr); g.add(pivot);
   }
   const frondMat2 = std(0x55b45e, 0.95);
   for (let i = 0; i < 6; i++) {
    const pivot = new THREE.Group(); pivot.position.y = 5.75;
    pivot.rotation.y = (i / 6) * Math.PI * 2 + 0.55; pivot.rotation.z = -0.22 - (i % 2) * 0.1;
    const fr = new THREE.Mesh(new THREE.SphereGeometry(1, 8, 6), frondMat2);
    fr.scale.set(1.25, 0.13, 0.38); fr.position.x = 1.0; pivot.add(fr); g.add(pivot);
   }
   for (let i = 0; i < 3; i++) {
    const nut = new THREE.Mesh(new THREE.SphereGeometry(0.17, 8, 7), std(0x6e5136, 0.9));
    nut.position.set(Math.cos(i * 2.1) * 0.24, 5.45, Math.sin(i * 2.1) * 0.24); g.add(nut);
   }
  } else {
   const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.24, 2.4, 7), std(0x6e5136, 1)); trunk.position.y = 1.2; g.add(trunk);
   const cm = std(0x4d9c46, 0.95);
   [[0, 3.6, 0, 1.5], [0.9, 3.1, 0.3, 1.05], [-0.85, 3.2, -0.25, 1.0]].forEach(([ox, oy, oz, r]) => {
    const s = new THREE.Mesh(new THREE.SphereGeometry(r, 12, 10), cm); s.position.set(ox, oy, oz); g.add(s);
   });
  }
  scene.add(g); G.trees.push(g);
  return g;
 }
 for (let i = 0; i < 14; i++) { let tx = range(rng, -28, 28), tz = range(rng, 52, 108); if (Math.hypot(tx, tz - 80) < 7) tx = tx < 0 ? -11 : 11; tree(tx, tz, rng() < 0.4); }
 for (let i = 0; i < 13; i++) tree(range(rng, 118, 178), range(rng, -168, -112), 'pine');
 for (let i = 0; i < 6; i++) tree(range(rng, -205, -160), range(rng, -60, 30), 'pine');
 for (let x = -150; x <= 150; x += 25) tree(x + range(rng, -4, 4), shoreZ(x) - 14 + range(rng, -3, 3), true);
 for (const ax of WORLD.avenues) for (let z = -20; z < 150; z += 42) { if (z > 44 && z < 118 && Math.abs(ax) < 40) continue; tree(ax + 12.5, z + range(rng, -3, 3), rng() < 0.5); }
 for (let i = 0; i < 8; i++) {
  const bx = -24 + i * 7, bz = 76;
  const b = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.12, 0.6), std(0x7a5a38, 0.9));
  b.position.set(bx, groundY(bx, bz) + 0.5, bz); scene.add(b);
 }
 const lampMat = std(0x333a40, 0.55);
 G.lampHeads = [];
 for (let x = -140; x <= 140; x += 35) for (const z of [146, 166]) {
  const p = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.09, 4.6, 7), lampMat);
  p.position.set(x, groundY(x, z) + 2.3, z); scene.add(p);
  const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.17, 8, 8), new THREE.MeshBasicMaterial({ color: 0xffe9b0 }));
  bulb.position.set(x, groundY(x, z) + 4.7, z); scene.add(bulb); G.lampHeads.push(bulb);
 }
 cy(3.3, 3.6, 0.75, 0xb8b0a0, 0, 0.38, 80, 16);
 cy(2.95, 2.95, 0.14, new THREE.MeshStandardMaterial({ color: 0x7fd4e8, roughness: 0.15 }), 0, 0.78, 80, 16);
 cy(0.45, 0.65, 1.9, 0xb8b0a0, 0, 1.3, 80, 10);
 cy(1.15, 1.15, 0.14, new THREE.MeshStandardMaterial({ color: 0x7fd4e8, roughness: 0.15 }), 0, 2.3, 80, 12);
 const jet = new THREE.Mesh(new THREE.ConeGeometry(0.34, 1.7, 8), new THREE.MeshBasicMaterial({ color: 0xdff6ff, transparent: true, opacity: 0.5 })); jet.position.set(0, groundY(0, 80) + 3.2, 80); scene.add(jet);
 G.colliders.push({ x: 0, z: 80, hx: 3.5, hz: 3.5, h: 1 });
 const bedTex = canvasTex(64, 64, (g, w, h) => {
  g.fillStyle = '#4d8a3e'; g.fillRect(0, 0, w, h);
  const cols = ['#e84f6a', '#f2a33c', '#f2e14c', '#ffffff', '#c99fe8'];
  for (let i = 0; i < 90; i++) { g.fillStyle = cols[i % 5]; g.fillRect(Math.random() * w, Math.random() * h, 3, 3); }
 }, 2, 1);
 const bedMat = new THREE.MeshStandardMaterial({ map: bedTex, roughness: 1 });
 for (const [fx2, fz2] of [[-15, 65], [15, 65], [-15, 95], [15, 95]]) flat(10, 5.5, bedMat, fx2, fz2, 0.07);
 for (const [tx2, tz2] of [[-6, 73], [6, 73], [-6, 87], [6, 87]]) {
  cy(0.09, 0.11, 0.7, 0x6e5136, tx2, 0.35, tz2, 6);
  const top = new THREE.Mesh(new THREE.ConeGeometry(1.05, 1.9, 9), std(0x3d8a3a, 0.95)); top.position.set(tx2, groundY(tx2, tz2) + 1.6, tz2); scene.add(top);
 }
 for (const [px, pz] of [[-11, 68], [11, 68], [-11, 92], [11, 92]]) {
  const p = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.09, 4.2, 7), lampMat);
  p.position.set(px, groundY(px, pz) + 2.1, pz); scene.add(p);
  const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.17, 8, 8), new THREE.MeshBasicMaterial({ color: 0xffe9b0 }));
  bulb.position.set(px, groundY(px, pz) + 4.3, pz); scene.add(bulb); G.lampHeads.push(bulb);
 }

 for (let i = 0; i < 10; i++) {
  const hx = WORLD.avenues[i % 5] + 8.6, hz = -20 + i * 17;
  const hyd = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.2, 0.62, 8), std(0xd8342c, 0.5));
  hyd.position.set(hx, groundY(hx, hz) + 0.31, hz); scene.add(hyd);
 }

 const wood = std(0x9a7648, 0.95);
 const pierZ0 = shoreZ(24) - 6;
 for (let i = 0; i < 16; i++) {
  const plank = new THREE.Mesh(new THREE.BoxGeometry(7, 0.25, 3.4), wood);
  plank.position.set(24, 1.15, pierZ0 + i * 3.4); scene.add(plank);
  if (i % 3 === 0) for (const sx of [-3, 3]) {
   const pile = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 3.4, 7), wood);
   pile.position.set(24 + sx, -0.2, pierZ0 + i * 3.4); scene.add(pile);
  }
 }
 G.pierEnd = { x: 24, z: pierZ0 + 54 };
 const statueBase = new THREE.Mesh(new THREE.CylinderGeometry(2.2, 2.6, 1.6, 10), std(0xb8b0a0, 0.9));
 const stX = -36, stZ = shoreZ(-36) - 16;
 statueBase.position.set(stX, groundY(stX, stZ) + 0.8, stZ); scene.add(statueBase);
 G.colliders.push({ x: stX, z: stZ, hx: 2.4, hz: 2.4, h: 9 });
 G.statueSpot = { x: stX, z: stZ };
 const umbCols = [0xe84f6a, 0xf2a33c, 0x3fa7d6, 0x63c96b, 0xf2e14c];
 G.beachProps = [];
 for (let i = 0; i < 16; i++) {
  const ux = -130 + i * 17 + range(rng, -4, 4), uz = shoreZ(ux) - range(rng, 6, 18);
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 2.3, 6), std(0xeeeeee, 0.6));
  pole.position.set(ux, groundY(ux, uz) + 1.15, uz); scene.add(pole);
  const can = new THREE.Mesh(new THREE.ConeGeometry(1.9, 0.7, 9), std(pick(rng, umbCols), 0.85));
  can.position.set(ux, groundY(ux, uz) + 2.35, uz); scene.add(can);
  const towel = new THREE.Mesh(new THREE.PlaneGeometry(1, 2), new THREE.MeshStandardMaterial({ color: pick(rng, umbCols), roughness: 1 }));
  towel.rotation.x = -Math.PI / 2; towel.rotation.z = range(rng, 0, 3);
  towel.position.set(ux + 1.4, groundY(ux + 1.4, uz + 1) + 0.05, uz + 1); scene.add(towel);
  G.beachProps.push({ x: ux + 1.4, z: uz + 1 });
 }
 const net = new THREE.Mesh(new THREE.PlaneGeometry(9, 1), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.5, side: THREE.DoubleSide }));
 net.position.set(70, groundY(70, shoreZ(70) - 12) + 1.4, shoreZ(70) - 12); scene.add(net);

 const wheel = new THREE.Group(); const wx = 148, wz = 148; wheel.position.set(wx, groundY(wx, wz), wz);
 const rim = new THREE.Mesh(new THREE.TorusGeometry(11, 0.35, 8, 28), std(0xe8e4da, 0.4));
 rim.position.y = 12; wheel.add(rim);
 const cabins = [];
 for (let i = 0; i < 8; i++) {
  const a = (i / 8) * Math.PI * 2;
  const cab = new THREE.Mesh(new THREE.BoxGeometry(1.8, 1.6, 1.6), std(pick(rng, umbCols), 0.7));
  cab.position.set(Math.cos(a) * 11, 12 + Math.sin(a) * 11, 0); wheel.add(cab); cabins.push(cab);
 }
 for (const sx of [-1, 1]) { const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.4, 13, 8), std(0x888888, 0.5)); leg.position.set(sx * 3.4, 6, 0); leg.rotation.z = sx * 0.27; wheel.add(leg); }
 scene.add(wheel); G.wheel = { group: wheel, rim, cabins };
 G.colliders.push({ x: wx, z: wz, hx: 4, hz: 2, h: 12 });
 const caro = new THREE.Group(); const cx2 = -148, cz2 = 148; caro.position.set(cx2, groundY(cx2, cz2), cz2);
 const roof = new THREE.Mesh(new THREE.ConeGeometry(6.4, 2.6, 12), std(0xd84f6a, 0.8)); roof.position.y = 5.4; caro.add(roof);
 const deck = new THREE.Mesh(new THREE.CylinderGeometry(5.6, 5.6, 0.5, 14), std(0xf2e3c2, 0.9)); deck.position.y = 0.6; caro.add(deck);
 const horses = new THREE.Group();
 for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2; const h = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.7, 0.4), std(pick(rng, umbCols), 0.7)); h.position.set(Math.cos(a) * 4.2, 1.6, Math.sin(a) * 4.2); h.rotation.y = -a; horses.add(h); }
 caro.add(horses); scene.add(caro); G.carousel = { group: caro, horses };
 G.colliders.push({ x: cx2, z: cz2, hx: 5.8, hz: 5.8, h: 5 });

 const rockTex = canvasTex(128, 128, (g, w, h) => {
  g.fillStyle = '#8a7460'; g.fillRect(0, 0, w, h);
  for (let i = 0; i < 260; i++) { g.fillStyle = `rgba(${40 + Math.random() * 60},${30 + Math.random() * 40},20,${0.25 + Math.random() * 0.3})`; g.fillRect(Math.random() * w, Math.random() * h, 3 + Math.random() * 9, 2 + Math.random() * 5); }
 }, 6, 3);
 const mtn = new THREE.Mesh(new THREE.ConeGeometry(52, 34, 22), new THREE.MeshStandardMaterial({ map: rockTex, roughness: 1 }));
 mtn.position.set(-150, groundY(-150, -175) + 12, -175); scene.add(mtn);
 const snow = new THREE.Mesh(new THREE.ConeGeometry(17, 11.5, 22), std(0xf6f9fb, 0.65));
 snow.position.set(-150, groundY(-150, -175) + 23.4, -175); scene.add(snow);
 for (let i = 0; i < 26; i++) {
  const a = rng() * Math.PI * 2, r = range(rng, 30, 50);
  tree(-150 + Math.cos(a) * r, -175 + Math.sin(a) * r, 'pine');
 }

 const runMat = std(0x44484e, 0.95);
 const runway = new THREE.Mesh(new THREE.PlaneGeometry(16, 130), runMat);
 runway.rotation.x = -Math.PI / 2; runway.rotation.z = 0.5;
 runway.position.set(-195, groundY(-195, 110) + 0.07, 110); scene.add(runway);
 building(-168, 42, 26, 12, 9, facades[3]);
 const aSign = signMesh('BAY AIRPORT', 18, '#20303e'); aSign.position.set(-168, groundY(-168, 42) + 8, 48.4); scene.add(aSign);
 const tower = new THREE.Mesh(new THREE.CylinderGeometry(2.2, 3, 20, 10), std(0xcfd6da, 0.7));
 tower.position.set(-150, groundY(-150, 60) + 10, 60); scene.add(tower);
 G.colliders.push({ x: -150, z: 60, hx: 3, hz: 3, h: 20 });
 const cabTop = new THREE.Mesh(new THREE.CylinderGeometry(3.4, 3.4, 3, 10), new THREE.MeshStandardMaterial({ color: 0x9fd4e8, roughness: 0.15, metalness: 0.4 }));
 cabTop.position.set(-150, groundY(-150, 60) + 21, 60); scene.add(cabTop);
 for (let i = 0; i < 6; i++) building(178 + (i % 3) * 16, -78 + Math.floor(i / 3) * 22, 12, 9, 6, facades[4]);
 const gSign = signMesh('FORT SOL', 14, '#3a4436'); gSign.position.set(186, groundY(186, -50) + 6, -42); gSign.rotation.y = Math.PI; scene.add(gSign);
 const wallMat = std(0x9c968a, 0.95);
 for (const [wx2, wz2, ww, wd] of [[186, -92, 60, 2], [186, -36, 60, 2], [157, -64, 2, 58], [215, -64, 2, 58]]) {
  const wmesh = new THREE.Mesh(new THREE.BoxGeometry(ww, 3.4, wd), wallMat);
  wmesh.position.set(wx2, groundY(wx2, wz2) + 1.7, wz2); scene.add(wmesh);
 }

 building(164, 122, 24, 16, 10, facades[2]);
 building(138, 100, 18, 13, 8, facades[0]);
 const mSign = signMesh('MARINA WAREHOUSE', 17, '#274b63'); mSign.position.set(164, groundY(164, 122) + 8.6, 130.4); scene.add(mSign);
 for (let i = 0; i < 7; i++) {
  const crate = new THREE.Mesh(new THREE.BoxGeometry(1.6, 1.6, 1.6), std(i % 2 ? 0x9a7648 : 0x6e7f8a, 0.9));
  crate.position.set(148 + (i % 3) * 2.1, groundY(150, 132) + 0.8 + Math.floor(i / 3) * 1.65, 132);
  scene.add(crate);
 }

 const yardMat = std(0x7c8085, 0.98);
 flat(58, 52, yardMat, 155, 116, 0.05);
 const bayLineMat = new THREE.MeshBasicMaterial({ color: 0xe8e2c8 });
 for (let i = 0; i < 5; i++) flat(0.3, 16, bayLineMat, 134 + i * 11, 128, 0.09);
 flat(52, 0.35, bayLineMat, 155, 104, 0.09);
 const contCols = [0xb0502e, 0x3c78d8, 0x4d8a5a];
 [[176, 97, 0, 0], [176, 97, 0, 1], [176, 103.5, 0, 0], [131, 97, Math.PI / 2, 0], [138.5, 97, Math.PI / 2, 0]].forEach(([cx, cz, ry, lvl], i) => {
  const cont = new THREE.Mesh(new THREE.BoxGeometry(6.4, 2.6, 2.5), std(contCols[i % 3], 0.8, { metalness: 0.25 }));
  cont.position.set(cx, groundY(cx, cz) + 1.3 + lvl * 2.6, cz); cont.rotation.y = ry; scene.add(cont);
  if (!lvl) G.colliders.push({ x: cx, z: cz, hx: ry ? 1.4 : 3.3, hz: ry ? 3.3 : 1.4, h: 2.6 });
 });
 for (let i = 0; i < 6; i++) {
  const crate = new THREE.Mesh(new THREE.BoxGeometry(1.6, 1.6, 1.6), std(i % 2 ? 0x6e7f8a : 0x9a7648, 0.9));
  crate.position.set(160 + (i % 3) * 2.1, groundY(162, 136) + 0.8 + Math.floor(i / 3) * 1.65, 136);
  scene.add(crate);
 }
 function boatOnTrailer(bx, bz, ry, hullCol) {
  const g = new THREE.Group(); g.position.set(bx, groundY(bx, bz), bz); g.rotation.y = ry;
  const hull = new THREE.Mesh(new THREE.BoxGeometry(2.3, 0.9, 6.4), std(hullCol, 0.5)); hull.position.y = 1.25; g.add(hull);
  const bow = new THREE.Mesh(new THREE.CylinderGeometry(1.15, 1.15, 0.9, 3, 1), std(hullCol, 0.5)); bow.position.set(0, 1.25, 3.6); bow.rotation.y = Math.PI; g.add(bow);
  const cab = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.75, 2.1), std(0xf2f2f2, 0.4)); cab.position.set(0, 1.95, -0.4); g.add(cab);
  const frame = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.16, 5.8), std(0x3a3f45, 0.6)); frame.position.y = 0.62; g.add(frame);
  for (const sx of [-0.95, 0.95]) { const wh = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.34, 0.14, 10), std(0x222222, 0.7)); wh.rotation.z = Math.PI / 2; wh.position.set(sx, 0.34, -0.6); g.add(wh); }
  scene.add(g);
  G.colliders.push({ x: bx, z: bz, hx: 1.6, hz: 3.4, h: 2.2 });
 }
 boatOnTrailer(168, 133, -0.35, 0x3f8fbf);
 boatOnTrailer(133, 108, 0.9, 0xe8762c);
 const dock = new THREE.Mesh(new THREE.BoxGeometry(56, 0.3, 3.6), wood);
 dock.position.set(155, groundY(155, 144) + 0.15, 144); scene.add(dock);
 for (const [lx, lz] of [[130, 94], [180, 94], [180, 140]]) {
  const p = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 5, 7), lampMat);
  p.position.set(lx, groundY(lx, lz) + 2.5, lz); scene.add(p);
  const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.18, 8, 8), new THREE.MeshBasicMaterial({ color: 0xffe9b0 }));
  bulb.position.set(lx, groundY(lx, lz) + 5.05, lz); scene.add(bulb);
 }
 G.safehouse = { x: 118, z: -30 };
 const shSign = signMesh('RIO SAFEHOUSE', 11, '#5c3a21'); shSign.position.set(118, groundY(118, -30) + 5.4, -23.4); scene.add(shSign);
 building(118, -30, 13, 10, 7, facades[5]);
 flat(21, 15, std(0x83878c, 0.98), 96, 118, 0.04);
 for (let i = 0; i < 3; i++) flat(0.28, 11, new THREE.MeshBasicMaterial({ color: 0xe8e2c8 }), 89 + i * 6.5, 118, 0.08);
 const showGlass = new THREE.MeshStandardMaterial({ color: 0x9fd4e8, roughness: 0.15, metalness: 0.4 });
 bx(11, 4.2, 7, showGlass, 108, 2.1, 112);
 bx(11.7, 0.3, 7.7, 0x37414c, 108, 4.35, 112);
 const showSign = signMesh('SHOWROOM', 7, '#20303e'); showSign.position.set(108, groundY(108, 112) + 3.4, 115.6); scene.add(showSign);
 bx(3.6, 3, 0.25, 0x555c63, 101.5, 1.5, 115.55);
 const servSign = signMesh('SERVICE', 5.5, '#7c231c'); servSign.position.set(101.5, groundY(101.5, 112) + 3.6, 115.6); scene.add(servSign);
 G.colliders.push({ x: 108, z: 112, hx: 5.8, hz: 3.8, h: 4.4 });
 for (let i = 0; i < 3; i++) { const tyre = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.16, 8, 14), std(0x222528, 0.8)); tyre.rotation.x = Math.PI / 2; tyre.position.set(102.5, groundY(102.5, 117) + 0.18 + i * 0.3, 117); scene.add(tyre); }
 for (const px2 of [88.6, 91.4]) cy(0.09, 0.09, 6.4, 0x333a40, px2, 3.2, 113, 6);
 const pyl = signMesh('PALMERA MOTORS', 10, '#20303e'); pyl.position.set(90, groundY(90, 113) + 6.6, 113.15); scene.add(pyl);
 const pyl2 = signMesh('SALES • SERVICE', 8, '#7c231c'); pyl2.position.set(90, groundY(90, 113) + 5.2, 113.15); scene.add(pyl2);

 const pts = [];
 const loopPts = [[-205, -120], [-205, 60], [-190, 150], [-90, 178], [90, 178], [190, 150], [205, 60], [205, -120], [150, -185], [-150, -185]];
 for (const [lx, lz] of loopPts) pts.push(new THREE.Vector3(lx, 0, lz));
 G.trainCurve = new THREE.CatmullRomCurve3(pts, true, 'catmullrom', 0.35);
 const railMat = std(0x6a6f75, 0.35, { metalness: 0.7 });
 const tieMat = std(0x5c4630, 1);
 const curvePts = G.trainCurve.getPoints(220);
 for (let i = 0; i < curvePts.length; i++) {
  const p = curvePts[i], q = curvePts[(i + 1) % curvePts.length];
  const mx = (p.x + q.x) / 2, mz = (p.z + q.z) / 2, y = groundY(mx, mz);
  const ang = Math.atan2(q.x - p.x, q.z - p.z);
  if (i % 2 === 0) { const tie = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.12, 1.1), tieMat); tie.position.set(mx, y + 0.1, mz); tie.rotation.y = ang; scene.add(tie); }
  for (const off of [-0.75, 0.75]) {
   const rail = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.14, p.distanceTo(q) + 0.3), railMat);
   rail.position.set(mx + Math.cos(ang) * off, y + 0.22, mz - Math.sin(ang) * off);
   rail.rotation.y = ang; scene.add(rail);
  }
 }
 for (const [sx, sz] of [[-205, 35], [205, 35], [0, 178], [0, -185]]) {
  const post = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 3, 6), lampMat);
  post.position.set(sx + 4, groundY(sx, sz) + 1.5, sz); scene.add(post);
  const xs = signMesh('RAIL XING', 3.4, '#8c2f26'); xs.position.set(sx + 4, groundY(sx, sz) + 3.1, sz); scene.add(xs);
 }

 const rampMat = std(0xe8762c, 0.7);
 for (const [rx, rz, ry] of [[-38, 118, 0], [52, -22, Math.PI / 2], [12, 88, Math.PI], [98, 44, -Math.PI / 2], [-98, 66, Math.PI / 2]]) {
  const ramp = new THREE.Mesh(new THREE.BoxGeometry(5, 0.4, 7), rampMat);
  ramp.position.set(rx, groundY(rx, rz) + 0.85, rz); ramp.rotation.x = -0.34; ramp.rotation.y = ry;
  scene.add(ramp); G.ramps.push({ x: rx, z: rz, dirY: ry });
 }

 G.shellSpots = [];
 const shellMat = new THREE.MeshStandardMaterial({ color: 0xffc93e, roughness: 0.25, metalness: 0.8, emissive: 0x664d00 });
 for (let i = 0; i < 20; i++) {
  const a = (i / 20) * Math.PI * 2;
  let sx = Math.cos(a) * range(rng, 60, 190), sz = Math.sin(a) * range(rng, 60, 170) + 30;

  const onRoad = (WORLD.avenues.some((ax) => Math.abs(sx - ax) < 9.5 && sz > WORLD.city.z0 && sz < 172)
   || WORLD.streets.some((st) => Math.abs(sz - st) < 9.5 && sx > WORLD.city.x0 && sx < WORLD.city.x1)
   || (sz > 146 && sz < 167 && Math.abs(sx) < 146)
   || (sx > 124 && sx < 186 && sz > 88 && sz < 146));
  if (onRoad) { sz = shoreZ(sx) - range(rng, 6, 14); }
  const y = Math.max(groundY(sx, sz), WATER_Y) + 0.7;
  const shell = new THREE.Mesh(new THREE.SphereGeometry(0.42, 10, 8), shellMat);
  shell.scale.y = 0.6; shell.position.set(sx, y, sz); scene.add(shell);
  G.shellSpots.push({ x: sx, z: sz, mesh: shell, taken: false });
 }

 const beamTex = canvasTex(16, 128, (g, w, h) => {
  const gr = g.createLinearGradient(0, 0, 0, h);
  gr.addColorStop(0, 'rgba(255,215,90,0)'); gr.addColorStop(1, 'rgba(255,215,90,0.8)');
  g.fillStyle = gr; g.fillRect(0, 0, w, h);
 });
 G.beacon = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 60, 10, 1, true),
  new THREE.MeshBasicMaterial({ map: beamTex, transparent: true, opacity: 0.4, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
 G.beacon.visible = false; scene.add(G.beacon);
 G.worldTime = 0;
 return {
  update(dt) {
   G.worldTime += dt;
   seaTex.offset.set((G.worldTime * 0.008) % 1, (G.worldTime * 0.005) % 1);
   if (G.wheel) { G.wheel.rim.rotation.z += dt * 0.25; G.wheel.cabins.forEach((c, i) => { const a = (i / 8) * Math.PI * 2 + G.wheel.rim.rotation.z; c.position.set(Math.cos(a) * 11, 12 + Math.sin(a) * 11, 0); }); }
   if (G.carousel) G.carousel.horses.rotation.y += dt * 0.7;
   for (const cl of G.clouds) { cl.position.x += dt * 1.1; if (cl.position.x > 560) cl.position.x = -560; }
   for (const tl of G.trafficLights) {
    const cyc = (G.worldTime + tl.phase * 7) % 14;
    tl.dots[0].visible = cyc > 10; tl.dots[1].visible = cyc > 8 && cyc <= 10; tl.dots[2].visible = cyc <= 8;
    tl.green = cyc <= 8;
   }
  },
 };
}
