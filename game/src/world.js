// The island: geography comes from config.groundY / shoreZ, so the mesh,
// the physics and the swimmers all agree about where the water is.
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
function facadeTex(rng, base) {
  return canvasTex(128, 256, (g, w, h) => {
    g.fillStyle = base; g.fillRect(0, 0, w, h);
    for (let y = 10; y < h - 12; y += 22) for (let x = 10; x < w - 12; x += 24) {
      const lit = rng() < 0.42;
      g.fillStyle = lit ? '#ffe9a8' : '#31435c';
      g.fillRect(x, y, 14, 15);
    }
  });
}
export function buildWorld(scene, G) {
  const rng = mulberry32(1337);
  G.colliders = []; G.ramps = []; G.props = [];
  // --- sky, sun, clouds: warm golden late-afternoon grade ---
  scene.fog = new THREE.Fog(0xf2c98d, 180, 720);
  const skyTex = canvasTex(64, 512, (g, w, h) => {
    const gr = g.createLinearGradient(0, 0, 0, h);
    gr.addColorStop(0, '#2f66b8'); gr.addColorStop(0.42, '#6fa8e0');
    gr.addColorStop(0.72, '#f7cf8e'); gr.addColorStop(0.92, '#ffb066'); gr.addColorStop(1, '#ff9e57');
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
  // --- island ground with vertex colours by zone ---
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
  // --- sea: irregular foam-streak texture, slowly drifting ---
  const seaTex = canvasTex(256, 256, (g, w, h) => {
    g.fillStyle = '#2e8fb8'; g.fillRect(0, 0, w, h);
    g.strokeStyle = 'rgba(255,255,255,0.35)'; g.lineWidth = 2;
    for (let i = 0; i < 42; i++) { // wavy arcs, deliberately irregular lengths
      const y = Math.random() * h; g.beginPath();
      g.arc(Math.random() * w, y, 12 + Math.random() * 30, Math.PI * 1.1, Math.PI * 1.9); g.stroke();
    }
  }, 30, 30);
  const sea = new THREE.Mesh(new THREE.PlaneGeometry(1500, 1500),
    new THREE.MeshPhongMaterial({ color: 0x9fd4e8, map: seaTex, transparent: true, opacity: 0.88, shininess: 140, specular: 0xfff2cc }));
  sea.rotation.x = -Math.PI / 2; sea.position.y = WATER_Y; scene.add(sea);
  G.seaTex = seaTex;
  // foam collar along the shoreline (segments follow shoreZ)
  const foamMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.55 });
  for (let x = -240; x < 240; x += 8) {
    const f = new THREE.Mesh(new THREE.PlaneGeometry(8.4, 2.6), foamMat);
    f.rotation.x = -Math.PI / 2; f.position.set(x + 4, WATER_Y + 0.03, shoreZ(x + 4) + 1);
    f.rotation.z = Math.atan2(shoreZ(x + 8) - shoreZ(x), 8);
    scene.add(f);
  }
  // --- roads, sidewalks, crosswalks (stripes aligned to the grid) ---
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
  // Ocean Drive along the shops + coast road
  flat(280, 13, roadMat, 0, 156); flat(280, 3.4, walkMat, 0, 147.5, 0.09); flat(280, 3.4, walkMat, 0, 164.5, 0.09);
  const crossMat = new THREE.MeshBasicMaterial({ color: 0xf8f8f2 });
  for (const ax of WORLD.avenues) for (const sz of WORLD.streets) {
    for (let i = -2; i <= 2; i++) { // zebra stripes parallel to the avenue, inside the junction
      const s = new THREE.Mesh(new THREE.PlaneGeometry(0.7, 5.6), crossMat);
      s.rotation.x = -Math.PI / 2; s.position.set(ax + i * 1.6, groundY(ax, sz) + 0.11, sz - WORLD.roadHalf - 1.6);
      scene.add(s);
    }
  }
  // traffic lights at every junction
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
  // --- buildings on the blocks between roads ---
  const facades = ['#c8b8a2', '#a8bfce', '#d9c9b4', '#b7c4c9', '#e3d3bd', '#c2a58e'].map((b) => facadeTex(rng, b));
  const roofMat = std(0x5c564e, 1);
  function building(x, z, w, d, h, tex) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d),
      [std(0xdddddd), std(0xdddddd), roofMat, roofMat, std(0xdddddd), std(0xdddddd)].map((mm, i) => i < 2 || i > 3 ? new THREE.MeshStandardMaterial({ map: tex, roughness: 0.9 }) : mm));
    m.position.set(x, groundY(x, z) + h / 2, z); scene.add(m);
    const skirt = new THREE.Mesh(new THREE.BoxGeometry(w + 0.7, 0.35, d + 0.7), std(0x777777, 1));
    skirt.position.set(x, groundY(x, z) + 0.17, z); scene.add(skirt);
    G.colliders.push({ x, z, hx: w / 2 + 0.2, hz: d / 2 + 0.2, h });
    return m;
  }
  const xs = [-112, -67, -22, 22, 67, 112], zs = [-24, 12, 58, 102, 141];
  for (const bx of xs) for (const bz of zs) {
    if (bx > WORLD.park.x0 - 20 && bx < WORLD.park.x1 + 20 && bz > 40 && bz < 118) continue; // park stays open
    const downtown = Math.abs(bx) < 70 && bz > 0 && bz < 110;
    const n = downtown ? 2 : 1;
    for (let i = 0; i < n; i++) {
      const w = range(rng, 13, 19), d = range(rng, 12, 17);
      const h = downtown ? range(rng, 26, 58) : range(rng, 10, 24);
      building(bx + (i ? 11 : -8) + range(rng, -2, 2), bz + range(rng, -4, 4), w, d, h, pick(rng, facades));
    }
  }
  // --- named shops on Ocean Drive, signs facing the beach (+z, never mirrored) ---
  G.shopFronts = [];
  for (const shop of SHOPS) {
    const y = groundY(shop.x, shop.z);
    const body = new THREE.Mesh(new THREE.BoxGeometry(20, 7, 9), std(shop.color, 0.85));
    body.position.set(shop.x, y + 3.5, shop.z - 6); scene.add(body);
    G.colliders.push({ x: shop.x, z: shop.z - 6, hx: 10.2, hz: 4.7, h: 7 });
    const awning = new THREE.Mesh(new THREE.BoxGeometry(20.6, 0.25, 3.4), std(0xf3ead8, 0.9));
    awning.position.set(shop.x, y + 5.1, shop.z - 0.6); awning.rotation.x = 0.25; scene.add(awning);
    const s = signMesh(shop.name, 15, '#20303e'); s.position.set(shop.x, y + 6.2, shop.z - 1.4); scene.add(s);
    const door = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 4.4), new THREE.MeshStandardMaterial({ color: 0xbfe6f2, roughness: 0.15, metalness: 0.4 }));
    door.position.set(shop.x, y + 2.2, shop.z - 1.45); scene.add(door);
    G.shopFronts.push({ ...shop, frontZ: shop.z - 1.2 });
  }
  // --- civic buildings: clinic, police, fire ---
  function civic(x, z, label, color, cross) {
    building(x, z, 22, 14, 11, facades[1]);
    const s = signMesh(label, 16, color); s.position.set(x, groundY(x, z) + 9.6, z + 7.3); scene.add(s);
    if (cross) {
      const cm = std(0xd8342c, 0.5);
      const v = new THREE.Mesh(new THREE.BoxGeometry(0.8, 3, 0.3), cm); v.position.set(x, groundY(x, z) + 12.6, z + 3); scene.add(v);
      const hz = new THREE.Mesh(new THREE.BoxGeometry(3, 0.8, 0.3), cm); hz.position.copy(v.position); scene.add(hz);
    }
  }
  civic(-112, -24, 'BAY CLINIC', '#274b63', true);
  civic(112, -24, 'BAY POLICE', '#1d2f52', false);
  civic(-112, 141, 'FIRE STATION 7', '#7c231c', false);
  G.hospital = { x: -112, z: -12 };
  // --- park: lawn paths, benches, lamps, clustered trees (never on sidewalks) ---
  const pathMat = std(0xd8c9a3, 1);
  flat(56, 3, pathMat, 0, 80, 0.05); flat(3, 56, pathMat, 0, 80, 0.05);
  G.trees = [];
  function tree(x, z, palm = false) {
    const y = groundY(x, z); const g = new THREE.Group(); g.position.set(x, y, z);
    if (palm) {
      const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.22, 5.6, 7), std(0x8a6a48, 1));
      trunk.position.y = 2.8; trunk.rotation.z = range(rng, -0.08, 0.08); g.add(trunk);
      const frondMat = std(0x3f9e4d, 0.95);
      for (let i = 0; i < 7; i++) {
        const pivot = new THREE.Group(); pivot.position.y = 5.6;
        pivot.rotation.y = (i / 7) * Math.PI * 2; pivot.rotation.z = -0.5 - (i % 3) * 0.12;
        const fr = new THREE.Mesh(new THREE.SphereGeometry(1, 8, 6), frondMat);
        fr.scale.set(1.8, 0.14, 0.4); fr.position.x = 1.5; pivot.add(fr); g.add(pivot);
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
  for (let i = 0; i < 14; i++) tree(range(rng, -28, 28), range(rng, 52, 108), rng() < 0.4);
  for (let x = -150; x <= 150; x += 25) tree(x + range(rng, -4, 4), shoreZ(x) - 14 + range(rng, -3, 3), true);
  for (const ax of WORLD.avenues) for (let z = -20; z < 150; z += 42) { if (z > 44 && z < 118 && Math.abs(ax) < 40) continue; tree(ax + 12.5, z + range(rng, -3, 3), rng() < 0.5); }
  for (let i = 0; i < 8; i++) { // benches + lamps in the park and on the promenade
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
  // hydrants + mailboxes on sidewalks
  for (let i = 0; i < 10; i++) {
    const hx = WORLD.avenues[i % 5] + 8.6, hz = -20 + i * 17;
    const hyd = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.2, 0.62, 8), std(0xd8342c, 0.5));
    hyd.position.set(hx, groundY(hx, hz) + 0.31, hz); scene.add(hyd);
  }
  // --- beach: pier, statue, umbrellas, towels, volleyball ---
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
  // --- rides: ferris wheel + carousel ---
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
  // --- mountain: textured cone, snow cap, tree scatter (never bare) ---
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
    tree(-150 + Math.cos(a) * r, -175 + Math.sin(a) * r, false);
  }
  // --- airport (SW) + garrison (E) + safehouse ---
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
  // --- the marina: warehouses, crates and a dock (mission country) ---
  building(164, 122, 24, 16, 10, facades[2]);
  building(138, 100, 18, 13, 8, facades[0]);
  const mSign = signMesh('MARINA WAREHOUSE', 17, '#274b63'); mSign.position.set(164, groundY(164, 122) + 8.6, 130.4); scene.add(mSign);
  for (let i = 0; i < 7; i++) {
    const crate = new THREE.Mesh(new THREE.BoxGeometry(1.6, 1.6, 1.6), std(i % 2 ? 0x9a7648 : 0x6e7f8a, 0.9));
    crate.position.set(148 + (i % 3) * 2.1, groundY(150, 132) + 0.8 + Math.floor(i / 3) * 1.65, 132);
    scene.add(crate);
  }
  G.safehouse = { x: 118, z: -30 };
  const shSign = signMesh('RIO SAFEHOUSE', 11, '#5c3a21'); shSign.position.set(118, groundY(118, -30) + 5.4, -23.4); scene.add(shSign);
  building(118, -30, 13, 10, 7, facades[5]);
  // --- train loop: rounded rectangle around the island ---
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
  // --- stunt ramps ---
  const rampMat = std(0xe8762c, 0.7);
  for (const [rx, rz, ry] of [[-38, 118, 0], [52, -22, Math.PI / 2], [12, 88, Math.PI], [98, 44, -Math.PI / 2], [-98, 66, Math.PI / 2]]) {
    const ramp = new THREE.Mesh(new THREE.BoxGeometry(5, 0.4, 7), rampMat);
    ramp.position.set(rx, groundY(rx, rz) + 0.85, rz); ramp.rotation.x = -0.34; ramp.rotation.y = ry;
    scene.add(ramp); G.ramps.push({ x: rx, z: rz, dirY: ry });
  }
  // --- golden shells (collectibles) ---
  G.shellSpots = [];
  const shellMat = new THREE.MeshStandardMaterial({ color: 0xffc93e, roughness: 0.25, metalness: 0.8, emissive: 0x664d00 });
  for (let i = 0; i < 15; i++) {
    const a = (i / 15) * Math.PI * 2;
    const sx = Math.cos(a) * range(rng, 60, 190), sz = Math.sin(a) * range(rng, 60, 170) + 30;
    const y = Math.max(groundY(sx, sz), WATER_Y) + 0.7;
    const shell = new THREE.Mesh(new THREE.SphereGeometry(0.42, 10, 8), shellMat);
    shell.scale.y = 0.6; shell.position.set(sx, y, sz); scene.add(shell);
    G.shellSpots.push({ x: sx, z: sz, mesh: shell, taken: false });
  }
  // objective beacon: thin, additive, transparent, fades with distance
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
