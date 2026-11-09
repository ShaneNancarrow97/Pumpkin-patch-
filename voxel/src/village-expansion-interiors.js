// Each neighbour has a usable, authored room rather than a shared empty shell.
import { seeded } from './voxels.js';
import { expansionAreaInfo } from './rules/village-expansion-access.js';
export function expansionHomeOpen(state,plan){
 if(!plan)return false;if(!plan.area)return true;
 const effects=state.village?.expansion?.effects??[];
 return !!expansionAreaInfo(state,plan.area)?.open&&(effects.includes('home-'+plan.host)||plan.host==='cinder'&&effects.includes('restaurant-opening')||plan.host==='granny'&&effects.includes('granny-listens'));
}
const styles={mabel:[0x9d718c,0x473452],tansy:[0x7b8968,0x3e513b],opal:[0x9b9aa9,0x434451],cinder:[0xc7a88d,0x6d403d],corvus:[0x8b5473,0x482f53],baron:[0x9d6a73,0x522b41],granny:[0x8a8868,0x45422e]};
function room(f,who){const r=seeded(792+Object.keys(styles).indexOf(who)),[plaster,timber]=styles[who],W=12,D=10;
 for(let x=-W/2;x<W/2;x+=.4)for(let z=-D;z<0;z+=1)f.block(x+.2,.02,z+.5,.39,.12,.98,0x92715a+Math.floor(r()*4)*0x030202);
 f.block(0,-.15,-D/2,W+.5,.2,D+.6,timber);
 for(let y=.15;y<4.7;y+=.35){f.block(-W/2,y,-D/2,.25,.34,D,plaster);f.block(W/2,y,-D/2,.25,.34,D,plaster);f.block(0,y,-D,W,.34,.25,plaster);}
 for(const x of [-6,-3,0,3,6]){f.block(x,.1,-D+.2,.16,4.8,.18,timber);f.block(x,4.6,-D/2,.18,.25,D,timber);}
 for(const y of [.2,1.1,4.5])f.block(0,y,-D+.18,W,.12,.16,timber);
 for(const x of [-3.5,3.5]){f.block(x,1.7,-D+.2,1.6,2.1,.06,0x627399,true);for(const dx of [-.85,.85])f.block(x+dx,1.6,-D+.27,.12,2.3,.08,timber);f.block(x,2.7,-D+.3,1.8,.08,.08,timber);}
 f.block(0,.17,-4,4,.025,4.5,who==='baron'?0x792e4b:0x62516d);for(const x of [-1.9,1.9])f.block(x,.2,-4,.06,.02,4.3,0xc5a476);
 // Welcome desk leaves a generous route to the host at the back of every room.
 f.block(0,0,-7,3.2,.85,1.15,timber);f.block(0,.85,-7,3.4,.13,1.3,0xba9672);
 for(const x of [-4.8,4.8]){f.block(x,0,-8,1.6,1.5,1.2,timber);f.block(x,1.5,-8,1.75,.12,1.4,0xba9672);}
 for(const x of [-4.9,4.9]){f.block(x,1.8,-9.5,.14,1,.14,0xc9ad72);f.block(x,2.8,-9.5,.1,.22,.1,0xffc873,true);f.mark('lamp',x,3.1,-9.3);}
 if(who==='mabel'){
  for(const x of [-4.6,4.6]){f.block(x,.4,-5,.12,2,.12,timber);f.block(x,2.4,-5,1.6,.1,.12,0xa8826b);for(let i=0;i<4;i++)f.block(x-.6+i*.4,1.15,-5,.32,1.3,.2,[0x6d4c89,0x884659,0x87916b,0xb3a082][i]);}
  f.block(.6,1,-7,.8,.45,.45,0x35303c);f.block(.3,1.45,-7,.12,.2,.12,0xc3aa7b);for(let i=0;i<9;i++)f.block(-1.25+i*.28,1,-7,.16,.22,.16,[0x936bb4,0xcba4c4,0xb18b58][i%3]);
 }else if(who==='tansy'){
  for(let i=0;i<9;i++){const x=-4.8+(i%3)*.45,z=-7.8+Math.floor(i/3)*.35;f.block(x,1.6,z,.25,.3,.25,0xa57559);for(let j=0;j<3;j++)f.block(x+(r()-.5)*.3,1.9+j*.13,z,.25,.15,.2,0x679452);}
  for(let i=0;i<6;i++)f.block(-2+i*.8,3.8,-9.6,.22,.6,.1,[0x769164,0xa79973,0x8869a3][i%3]);
 }else if(who==='opal'){
  for(let i=0;i<8;i++){f.block(-1.3+i*.36,1,-7,.18,.25+r()*.45,.18,[0xbc90da,0x83b7cb,0xe19a72][i%3],true);}
  for(let i=0;i<5;i++)f.block(4.5,1.7+i*.26,-8,.9,.22,.8,0x9b96a3);
 }else if(who==='cinder'){
  f.block(-4.7,.2,-7,1.9,1.6,1.8,0x45404c);f.block(-4.7,.6,-5.99,1.3,.7,.04,0xd18043,true);f.block(-4.7,1.9,-7,.9,.3,.9,0x6c6271);f.block(-4.7,2.2,-7,1,.07,1,0xc2b6a1);
  for(let i=0;i<6;i++){f.block(-2+i*.8,3.4,-9.6,.05,.5,.08,0xa18a66);f.block(-2+i*.8,3,-9.55,.45,.45,.08,0xb8966e);}
 }else if(who==='corvus'){
  f.block(0,.2,-8.7,5,.35,1.8,0x8d6a54);for(const x of [-2.4,2.4])for(let j=0;j<6;j++)f.block(x+(j%2)*.15,1+j*.45,-8.9,.8,.48,.18,0x8e3158);
  for(let i=0;i<8;i++)f.block(-2+i*.6,4.2,-8.8,.1,.1,.1,[0xffc873,0xb9a1e7][i%2],true);
 }else if(who==='baron'){
  for(const x of [-4.6,4.6])for(let i=0;i<3;i++){f.block(x,1.6+i*.5,-8,.85,.06,1,timber);f.block(x,1.7+i*.5,-7.9,.35,.3,.35,[0xb78c6e,0x9f7ebc,0xe4c680][i]);}
  for(const x of [-2,2]){f.block(x,2.1,-9.7,1.4,1.7,.15,0xbb9668);f.block(x,2.2,-9.5,1.15,1.4,.08,0x614b6d);}
 }else{
  f.block(-4.5,.2,-6,1.8,1.05,1.8,0x302e32);f.block(-4.5,1.25,-6,1.5,.07,1.5,0x7c9767,true);for(const x of [-5.1,-3.9])f.block(x,0,-6,.25,.3,.25,0xd69e58,true);
  for(let i=0;i<9;i++)f.block(-1.2+i*.3,1,-7,.2,.4,.2,[0x987655,0x8e9763,0x87668c][i%3]);
  f.block(4.7,.2,-5,1.8,.6,3,0x594c42);f.block(4.7,.8,-5,1.7,.2,2.8,0x8c7383);
 }
}
const furnitureBlocks=who=>[[-6,-10,-3.7,-6],[3.7,-10,6,-6],[-1.7,-7.7,1.7,-6.3],[-6,-10,6,-9.6],...(who==='mabel'?[[-5.5,-5.4,-3.7,-4.6],[3.7,-5.4,5.5,-4.6]]:who==='granny'?[[-5.5,-7,-3.5,-5],[3.7,-6.6,5.7,-3.4]]:[])];
const definitions=[['mabel-cottage','Mabel’s haberdashery','mabel',-6,62,'east','copse'],['tansy-cottage','Tansy’s potting room','tansy',-6,82,'east','copse'],['opal-studio','Opal’s stone studio','opal',52,74,'east','quarry'],['cinder-restaurant','Cinder’s restaurant','cinder',66,70,'west','quarry'],['corvus-tent','Corvus’s living tent','corvus',148,46,'east','moor'],['baron-manor','The Baron’s velvet manor','baron',148,68,'east','moor'],['granny-cottage','Granny Brambletooth’s cottage','granny',-68,81.5,'south','acre']];
export const EXPANSION_INSIDES=Object.freeze(Object.fromEntries(definitions.map(([id,name,host,x,z,facing,area])=>[id,Object.freeze({name,host,area,door:Object.freeze({x,z,facing}),build:f=>room(f,host),hall:Object.freeze({w:12,d:10,host:[0,-5.6],spawn:[0,-1.4],light:.55,exposure:1.1,blocks:Object.freeze(furnitureBlocks(host))})})])));
