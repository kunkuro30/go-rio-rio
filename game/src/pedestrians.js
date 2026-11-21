import {SHOPS,WORLD,groundY,shoreZ,WATER_Y,waterDepth} from './config.js';
import {buildFigure,poseFigure} from './characters.js';
import {pick,range} from './random.js';
const SKINS=[0xd9a37e,0xb97a4e,0x8a5a34,0xf0c8a0,0x6e4525];
const HAIRS=[0x2a1d12,0x14100c,0x4a3018,0x8a6a48,0xd8b13c,0xd8d8d8,0xb03a2e];
const CLOTH=[0xd8342c,0x3c78d8,0xf2b13c,0x63b06b,0xf2f0e8,0x9a5fc0,0x2ea8a0,0xe87fa8,0x23232e,0x2b3a55,0x6e5136,0xc9b083,0xe8862e,0x7fd4c9,0xb8e62e,0x8a9a5b,0x4a5568,0x3a3f4a];
const FL=['cap','dress','apron','hat','glasses','bald','longHair'];
const NAMES='Lifeguard,Surfer,Tourist,Snapper,Exec,Suit,Chef,Grandma,Grandpa,Skater,Jogger,Fisher,Vendor,Keeper,Student,Gangster,Nurse,Doctor,Fireman,Beachgirl,Muscle,Waiter,Mechanic,Painter,Yogi,Builder,Sailor,Hipster,Courier,Kid'.split(',');
// CAST->SKINS/HAIRS/CLOTH;flags 1cap 2dress 4apron 8hat 16glasses 32bald 64longHair 128kid
const CAST=[
[1,4,0,0,4,1],[0,4,6,2,11,64],[3,3,7,11,4,17],[2,1,12,3,10,8],[3,1,8,8,8,66],
[0,0,9,8,8,0],[1,0,4,17,8,5],[3,5,5,5,10,2],[0,5,15,10,10,48],[1,1,8,1,0,1],
[4,1,14,17,4,1],[2,2,1,10,10,8],[0,2,2,4,10,4],[1,0,6,17,8,5],[3,6,3,11,4,0],
[2,1,8,8,4,16],[3,2,13,4,4,0],[0,0,4,16,8,0],[1,1,2,17,8,1],[0,4,7,7,4,64],
[4,1,0,8,8,32],[0,1,4,8,8,4],[2,0,9,17,8,1],[3,3,5,4,10,8],[3,3,4,7,4,64],
[1,2,12,10,10,1],[0,1,4,9,4,1],[3,2,10,9,10,16],[1,0,0,1,4,1],[0,1,2,3,0,129],
];
const BEACH=[0,1,2,3,19,10];
const SWIM=[1,19,2,0];
const KEEPS=[13,6,12,21];
const SHOP=[14,2,7,27,24,3];
const TOWN=[5,4,14,9,15,28,22,27,23,26,25,8,10,2,29,11,20];
const PARK=[7,8,10,24,29,14,11,23,20];
function outfit(i){
const a=CAST[i],f=a[5];
const o={skin:SKINS[a[0]],hair:HAIRS[a[1]],shirt:CLOTH[a[2]],pants:CLOTH[a[3]],shoes:CLOTH[a[4]]};
for(let b=0;b<7;b++)if(f>>b&1)o[FL[b]]=true;
return o;
}
export function createPedestrians(G){
const rng=G.rng;
G.peds=[];
function bag(pool){
let q=[];
return () =>{
if(!q.length){
q=pool.slice();
for(let i=q.length-1;i>0;i--){const j=Math.floor(rng()*(i+1));const t=q[i];q[i]=q[j];q[j]=t}
}
return q.pop();
};
}
const beach=bag(BEACH),swim=bag(SWIM),keeps=bag(KEEPS),shop=bag(SHOP),town=bag(TOWN),park=bag(PARK);
function addPed(x,z,role,mode='walk',arch=0){
const fig=buildFigure(outfit(arch));
if(CAST[arch][5] & 128) fig.group.scale.setScalar(0.76);
fig.group.position.set(x,groundY(x,z),z);
fig.group.rotation.y=range(rng,0,Math.PI*2);
G.scene.add(fig.group);
const ped={fig,role,mode,arch,archName:NAMES[arch],x,z,tx:x,tz:z,speed:range(rng,1.1,1.9),wait:0,hp:100,down:0,shopIdx:Math.floor(range(rng,0,SHOPS.length))};
G.peds.push(ped);
return ped;
}
for(const s of SHOPS){
const ped=addPed(s.x+range(rng,-3,3),s.z+1.5,'keeper','stand',keeps());
ped.fig.group.rotation.y=Math.PI;
}
addPed(-108,-8,'doctor','stand',17);addPed(-104,-6,'nurse','stand',16);
addPed(-106,138,'fire','stand',18);addPed(-100,140,'fire','stand',18);
const walkSpots=[];
for(const ax of WORLD.avenues) for(const sz of WORLD.streets) walkSpots.push([ax+10.5,sz+8]);
for(let i=0;i<46;i++){
const [x,z]=pick(rng,walkSpots);
addPed(x+range(rng,-3,3),z+range(rng,-3,3),'citizen','walk',town());
}
for(let i=0;i<14;i++){
const s=SHOPS[i % SHOPS.length];
addPed(s.x,s.z+4,'shopper','shop',shop());
}
for(let i=0;i<20;i++) addPed(range(rng,-130,130),range(rng,140,165),'citizen','walk',park());
for(const spot of G.beachProps.slice(0,10)){
const ped=addPed(spot.x,spot.z,'swim','lie',beach());
ped.fig.group.rotation.x=-Math.PI/2+0.06;
ped.fig.group.position.y=groundY(spot.x,spot.z)+0.18;
ped.fig.blob.visible=false;
}
addPed(66,shoreZ(66)-12,'swim','stand',0);addPed(74,shoreZ(74)-12,'swim','stand',1);
G.swimmers=[];
for(let i=0;i<9;i++){
const x=-120+i*28+range(rng,-6,6);
let z=shoreZ(x)+6;
while(waterDepth(x,z)<1.0&&z<shoreZ(x)+40) z+=2;
const ai=swim();
const fig=buildFigure(outfit(ai));
fig.group.position.set(x,WATER_Y-1.12,z);
fig.blob.visible=false;
G.scene.add(fig.group);
G.swimmers.push({fig,x,z,phase:range(rng,0,6),arch:ai,archName:NAMES[ai]});
}
function newTarget(ped){
if(ped.mode==='shop'){
ped.shopIdx=(ped.shopIdx+1+Math.floor(range(rng,0,3))) % SHOPS.length;
const s=SHOPS[ped.shopIdx];
ped.tx=s.x+range(rng,-4,4);ped.tz=s.z+4;
} else{
const [x,z]=pick(rng,walkSpots);
ped.tx=x+range(rng,-4,4);ped.tz=z+range(rng,-4,4);
if(rng()<0.25){ped.tx=range(rng,-130,130);ped.tz=range(rng,140,164)}
}
}
return{
update(dt){
for(const ped of G.peds){
const f=ped.fig;
if(ped.down>0){ped.down-=dt;f.blob.visible=false;poseFigure(f,'down',dt);if(ped.down<=0){ped.hp=60;f.group.rotation.x=0;f.blob.visible=true} continue}
if(ped.mode==='stand'){poseFigure(f,'idle',dt);continue}
if(ped.mode==='lie') continue;
if(ped.wait>0){ped.wait-=dt;poseFigure(f,'idle',dt);continue}
const dx=ped.tx-ped.x,dz=ped.tz-ped.z,d=Math.hypot(dx,dz);
if(d<1.2){ped.wait=ped.mode==='shop'?range(rng,2,5) :range(rng,0.4,2);newTarget(ped);continue}
const vx=(dx/d)*ped.speed,vz=(dz/d)*ped.speed;
ped.x+=vx*dt;ped.z+=vz*dt;
f.group.position.set(ped.x,groundY(ped.x,ped.z),ped.z);
f.group.rotation.y=Math.atan2(vx,vz);
poseFigure(f,'walk',dt,ped.speed);
}
for(const sw of G.swimmers){
sw.phase+=dt;
sw.fig.group.position.y=WATER_Y-1.12+Math.sin(sw.phase*1.4)*0.07;
sw.fig.group.position.x=sw.x+Math.sin(sw.phase*0.22)*2.5;
poseFigure(sw.fig,'swim',dt);
}
},
};
}
