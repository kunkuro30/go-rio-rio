

const THREE = window.THREE;
function puffTexture(inner, outer) {
 const c = document.createElement('canvas'); c.width = c.height = 64;
 const g = c.getContext('2d');
 const grad = g.createRadialGradient(32, 32, 2, 32, 32, 31);
 grad.addColorStop(0, inner); grad.addColorStop(1, outer);
 g.fillStyle = grad; g.fillRect(0, 0, 64, 64);
 const t = new THREE.CanvasTexture(c); return t;
}
export function createFx(scene) {
 const texSoft = puffTexture('rgba(255,255,255,1)', 'rgba(255,255,255,0)');
 const MAX = 900;
 const pos = new Float32Array(MAX * 3), col = new Float32Array(MAX * 3);
 const geo = new THREE.BufferGeometry();
 geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
 geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
 const mat = new THREE.PointsMaterial({
  size: 1.6, map: texSoft, transparent: true, depthWrite: false,
  vertexColors: true, blending: THREE.AdditiveBlending, sizeAttenuation: true,
 });
 const points = new THREE.Points(geo, mat);
 points.frustumCulled = false; scene.add(points);
 const pool = [];
 for (let i = 0; i < MAX; i++) pool.push({ life: 0, max: 1, vx: 0, vy: 0, vz: 0, grow: 0, r: 1, g: 1, b: 1, x: 0, y: -99, z: 0 });
 let cursor = 0;
 const cTint = new THREE.Color();
 function spawn(x, y, z, vx, vy, vz, life, color, grow = 0) {
  const p = pool[cursor]; cursor = (cursor + 1) % MAX;
  p.x = x; p.y = y; p.z = z; p.vx = vx; p.vy = vy; p.vz = vz;
  p.life = life; p.max = life; p.grow = grow;
  cTint.set(color); p.r = cTint.r; p.g = cTint.g; p.b = cTint.b;
 }
 const fx = {
  sparks(x, y, z, n = 6) { for (let i = 0; i < n; i++) spawn(x, y, z, (Math.random() - 0.5) * 5, Math.random() * 4, (Math.random() - 0.5) * 5, 0.35, 0xffc95e); },
  smoke(x, y, z, dark = false, big = false) {
   spawn(x + (Math.random() - 0.5), y, z + (Math.random() - 0.5), 0.3, 1.6, 0.2, big ? 1.8 : 1.1, dark ? 0x2c2c30 : 0x9aa0a6, 0.6);
  },
  fire(x, y, z, n = 3) { for (let i = 0; i < n; i++) spawn(x + (Math.random() - 0.5) * 0.8, y + Math.random() * 0.4, z + (Math.random() - 0.5) * 0.8, 0, 2.4, 0, 0.5, Math.random() < 0.5 ? 0xff7b2e : 0xffc02e); },
  explosion(x, y, z) {
   for (let i = 0; i < 26; i++) spawn(x, y + 0.6, z, (Math.random() - 0.5) * 11, Math.random() * 8, (Math.random() - 0.5) * 11, 0.8, Math.random() < 0.6 ? 0xff8b2e : 0xffe08a);
   for (let i = 0; i < 10; i++) fx.smoke(x, y + 1, z, true, true);
   spawn(x, y + 0.8, z, 0, 0.5, 0, 0.22, 0xfff6d8);
  },
  splash(x, y, z) { for (let i = 0; i < 8; i++) spawn(x, y, z, (Math.random() - 0.5) * 2.4, 2 + Math.random() * 2, (Math.random() - 0.5) * 2.4, 0.5, 0xbfeaff); },
  muzzle(x, y, z) { spawn(x, y, z, 0, 0, 0, 0.07, 0xffd76a); },
  update(dt) {
   for (let i = 0; i < MAX; i++) {
    const p = pool[i];
    if (p.life > 0) {
     p.life -= dt; p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt;
     p.vy -= (p.grow ? -0.4 : 2.2) * dt;
     if (p.life <= 0) p.y = -99;
    }
    pos[i * 3] = p.x; pos[i * 3 + 1] = p.y; pos[i * 3 + 2] = p.z;
    const f = p.life > 0 ? p.life / p.max : 0;
    col[i * 3] = p.r * f; col[i * 3 + 1] = p.g * f; col[i * 3 + 2] = p.b * f;
   }
   geo.attributes.position.needsUpdate = true;
   geo.attributes.color.needsUpdate = true;
  },
 };
 return fx;
}
