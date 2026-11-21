

const THREE=window.THREE;
export const FIGURE_HEIGHT = 1.78;
const matCache=new Map();
function mat(color,rough=0.85){
const key=color+':'+rough;
if(!matCache.has(key)) matCache.set(key,new THREE.MeshStandardMaterial({color,roughness:rough,metalness:0.02}));
return matCache.get(key);
}
function seg(rTop,rBottom,h,material){
const m=new THREE.Mesh(new THREE.CylinderGeometry(rTop,rBottom,h,10),material);
m.castShadow=false;
return m;
}
function ball(r,material,sy=1){
const m=new THREE.Mesh(new THREE.SphereGeometry(r,12,10),material);
m.scale.y=sy;
return m;
}
function limb(parent,x,y,z,upperLen,lowerLen,rU,rL,mUpper,mLower,mEnd,endR){
const shoulder=new THREE.Group();shoulder.position.set(x,y,z);parent.add(shoulder);
const upper=seg(rU*0.82,rU,upperLen,mUpper);upper.position.y=-upperLen/2;shoulder.add(upper);
const elbow=new THREE.Group();elbow.position.y=-upperLen;shoulder.add(elbow);
const lower=seg(rL*0.8,rL,lowerLen,mLower);lower.position.y=-lowerLen/2;elbow.add(lower);
const end=ball(endR,mEnd);end.position.y=-lowerLen;elbow.add(end);
return{joint:shoulder,elbow,end};
}

export function buildFigure(opts={}){
const skin=mat(opts.skin ?? 0xd9a37e,0.65);
const shirt=mat(opts.shirt ?? 0x3e6fb0,0.92);
const pants=mat(opts.pants ?? 0x2e3440,0.95);
const shoes=mat(opts.shoes ?? 0x222222,0.55);
const hairM=mat(opts.hair ?? 0x2a1d12,0.9);
const accent=mat(opts.accent ?? (opts.shirt ?? 0x3e6fb0),0.8);
const root=new THREE.Group();
const pelvis=new THREE.Group();pelvis.position.y=0.98;root.add(pelvis);
const hips=seg(0.155,0.17,0.2,pants);hips.position.y=0.02;pelvis.add(hips);
const spine=new THREE.Group();spine.position.y=0.1;pelvis.add(spine);
const torso=seg(0.145,0.165,0.52,shirt);torso.position.y=0.28;spine.add(torso);
const chest=ball(0.165,shirt,0.9);chest.position.y=0.5;spine.add(chest);
const neck=new THREE.Group();neck.position.y=0.56;spine.add(neck);
const neckM=seg(0.05,0.055,0.09,skin);neckM.position.y=0.03;neck.add(neckM);
const head=new THREE.Group();head.position.y=0.1;neck.add(head);
const skull=ball(0.118,skin,1.08);skull.position.y=0.115;head.add(skull);
if(!opts.bald){const hair=ball(0.121,hairM,opts.longHair?1.32 :0.92);hair.position.set(0,opts.longHair?0.115 :0.155,-0.012);head.add(hair)}
if(opts.cap){const cap=seg(0.125,0.128,0.05,accent);cap.position.y=0.185;head.add(cap);const brim=seg(0.02,0.09,0.02,accent);brim.position.set(0,0.165,0.13);brim.scale.z=0.6;head.add(brim)}
if(opts.hat){const brim=seg(0.2,0.2,0.02,accent);brim.position.y=0.185;head.add(brim);const dome=ball(0.115,accent,0.72);dome.position.y=0.2;head.add(dome)}
const eyeM=mat(0x14161c,0.3);
for(const sx of [-1,1]){const eye=ball(0.016,eyeM);eye.position.set(sx*0.045,0.12,0.108);head.add(eye)}
if(opts.glasses){const gl=new THREE.Mesh(new THREE.BoxGeometry(0.19,0.04,0.02),eyeM);gl.position.set(0,0.12,0.112);head.add(gl)}
const armL=limb(spine,-0.21,0.5,0,0.3,0.28,0.055,0.045,shirt,skin,skin,0.045);
const armR=limb(spine,0.21,0.5,0,0.3,0.28,0.055,0.045,shirt,skin,skin,0.045);
const legL=limb(pelvis,-0.1,-0.02,0,0.44,0.44,0.075,0.055,pants,pants,shoes,0.055);
const legR=limb(pelvis,0.1,-0.02,0,0.44,0.44,0.075,0.055,pants,pants,shoes,0.055);

legL.end.position.z=0.05;legR.end.position.z=0.05;
if(opts.dress){const skirt=seg(0.24,0.17,0.3,accent);skirt.position.y=-0.08;pelvis.add(skirt)}
if(opts.apron){const ap=new THREE.Mesh(new THREE.BoxGeometry(0.26,0.4,0.02),mat(0xf4f1e6,0.95));ap.position.set(0,0.3,0.16);spine.add(ap)}
const fig={
group:root,pelvis,spine,neck,head,
armL:armL.joint,armR:armR.joint,elbowL:armL.elbow,elbowR:armR.elbow,
legL:legL.joint,legR:legR.joint,kneeL:legL.elbow,kneeR:legR.elbow,
  phase: Math.random() * 6, recoil: 0, height: FIGURE_HEIGHT,
};
root.traverse((o)=>{o.userData.partOfFigure=true});

if(!buildFigure.blobMat){
const c=document.createElement('canvas');c.width=c.height=64;
const g=c.getContext('2d');
const gr=g.createRadialGradient(32,32,4,32,32,31);
gr.addColorStop(0,'rgba(20,16,8,0.42)');gr.addColorStop(0.7,'rgba(20,16,8,0.22)');gr.addColorStop(1,'rgba(20,16,8,0)');
g.fillStyle=gr;g.fillRect(0,0,64,64);
buildFigure.blobMat=new THREE.MeshBasicMaterial({map:new THREE.CanvasTexture(c),transparent:true,depthWrite:false});
}
const blob=new THREE.Mesh(new THREE.CircleGeometry(0.46,18),buildFigure.blobMat);
blob.rotation.x=-Math.PI/2;blob.position.y=0.03;blob.renderOrder=2;
root.add(blob);
fig.blob=blob;
return fig;
}

export function poseFigure(fig,mode,dt,speed=0,aimPitch=0){
fig.recoil=Math.max(0,fig.recoil-dt*6);
const t=performance.now()*0.001;
const sw=mode==='walk'?Math.min(1,speed/5) :0;
if(mode==='walk') fig.phase+=dt*(4+speed*1.35);
const s=Math.sin(fig.phase),c=Math.cos(fig.phase);
const setLimb=(leg,knee,v,kv)=>{leg.rotation.x=v;knee.rotation.x=kv};
if(mode==='sit'){
setLimb(fig.legL,fig.kneeL,-1.5,1.5);setLimb(fig.legR,fig.kneeR,-1.5,1.5);
fig.armL.rotation.x=-0.5;fig.armR.rotation.x=-0.5;
fig.elbowL.rotation.x=-0.4;fig.elbowR.rotation.x=-0.4;
fig.pelvis.position.y=0.55;
return;
}
fig.pelvis.position.y=0.98+(mode==='walk'?Math.abs(c)*0.045*sw :Math.sin(t*1.7)*0.008);
if(mode==='swim'){
setLimb(fig.legL,fig.kneeL,s*0.6,0.5);setLimb(fig.legR,fig.kneeR,-s*0.6,0.5);
fig.armL.rotation.x=c*0.9-0.4;fig.armR.rotation.x=-c*0.9-0.4;
fig.elbowL.rotation.x=-0.5;fig.elbowR.rotation.x=-0.5;
fig.spine.rotation.x=0.5;
return;
}
fig.spine.rotation.x=mode==='aim'?0.06 :0;
if(mode==='walk'||mode==='idle'){
setLimb(fig.legL,fig.kneeL,s*0.62*sw,Math.max(0,-s)*0.7*sw);
setLimb(fig.legR,fig.kneeR,-s*0.62*sw,Math.max(0,s)*0.7*sw);
fig.armL.rotation.x=-s*0.55*sw;fig.armR.rotation.x=s*0.55*sw;
fig.armL.rotation.z=0.08;fig.armR.rotation.z=-0.08;
fig.elbowL.rotation.x=-0.25-sw*0.2;fig.elbowR.rotation.x=-0.25-sw*0.2;
}
if(mode==='aim'){

const kick=fig.recoil*0.35;
fig.armR.rotation.x=-1.35-aimPitch-kick;
fig.armR.rotation.z=-0.12;
fig.elbowR.rotation.x=-0.12+kick*0.4;
fig.armL.rotation.x=-1.05-aimPitch*0.8;
fig.armL.rotation.z=0.5;
fig.elbowL.rotation.x=-0.55;
fig.spine.rotation.y=-0.18;
}else if(mode!=='walk'){
fig.spine.rotation.y=0;
}
if(mode==='down'){
fig.group.rotation.x=-Math.PI/2+0.08;
}else if(fig.group.rotation.x!==0){
fig.group.rotation.x=0;
}
}
