// Native WGSL functions composed by TSL. This is a real WebGPU material path;
// the legacy GLSL materials remain independent for fallback and atlas capture.
import { wgslFn } from 'three/tsl';

export const nodeFinHash = wgslFn(`fn villageFinHash(p0: vec3f) -> f32 {
 var p=fract(p0*.1031); p+=vec3f(dot(p,p.zyx+vec3f(31.32))); return fract((p.x+p.y)*p.z);
}`);
export const nodeFinLevel = wgslFn(`fn villageFinLevel(c: vec3f) -> f32 {
 let h=villageFinHash(c+vec3f(3.7)); if(h>.8){return 1.;} if(h<.16){return -1.;} return 0.;
}`, [nodeFinHash]);
export const nodeFinNoise = wgslFn(`fn villageFinNoise(p: vec3f) -> f32 {
 let i=floor(p); var f=fract(p); f=f*f*(vec3f(3.)-2.*f);
 return mix(mix(mix(villageFinHash(i),villageFinHash(i+vec3f(1,0,0)),f.x),mix(villageFinHash(i+vec3f(0,1,0)),villageFinHash(i+vec3f(1,1,0)),f.x),f.y),mix(mix(villageFinHash(i+vec3f(0,0,1)),villageFinHash(i+vec3f(1,0,1)),f.x),mix(villageFinHash(i+vec3f(0,1,1)),villageFinHash(i+vec3f(1,1,1)),f.x),f.y),f.z);
}`, [nodeFinHash]);
export const nodeFinish = wgslFn(`fn villageFinish(base:vec3f, o:vec3f,n0:vec3f,l:vec3f,s:vec3f,k:f32,glow:f32)->vec3f {
 let n=normalize(n0); let a=abs(n); let q=o/k; let size=s/k; let cell=floor(q-n*.5); let edge=(vec3f(.5)-abs(l))*size;
 var f=fract(q.xy); var face=size.xy; var rim=min(edge.x,edge.y); var up=0.;
 if(a.y>.5){f=fract(q.xz);face=size.xz;rim=min(edge.x,edge.z);up=1.;}else if(a.x>.5){f=fract(q.zy);face=size.zy;rim=min(edge.z,edge.y);}
 let px=max(fwidth(q.x),max(fwidth(q.y),fwidth(q.z))); let room=smoothstep(1.2,2.4,min(face.x,face.y)); let fine=(1.-smoothstep(.2,.55,px))*room;
 let h=villageFinHash(cell); let d=min(f,vec2f(1.)-f); let joint=1.-smoothstep(0.,.045+px,min(d.x,d.y));
 if(glow>.5){let longFace=smoothstep(.45,.9,min(face.x,face.y))*smoothstep(1.6,3.,max(face.x,face.y));let glass=max(room,longFace);let show=(1.-smoothstep(.2,.55,px))*glass;let lead=1.-joint*.5*show;let deep=1.-.42*(1.-smoothstep(0.,1.7,rim))*room;return vec3f(mix(1.,lead*deep*(1.+(h-.5)*.2*show),glass));}
 var u=vec3f(1,0,0); if(a.x>.5){u=vec3f(0,0,1);} var v=vec3f(0,1,0);if(a.y>.5){v=vec3f(0,0,1);}
 let here=villageFinLevel(cell);let above=villageFinLevel(cell+v);let below=villageFinLevel(cell-v);let left=villageFinLevel(cell-u);let right=villageFinLevel(cell+u);
 let band=.16+px;let top=smoothstep(1.-band,1.,f.y);let bottom=1.-smoothstep(0.,band,f.y);let le=1.-smoothstep(0.,band,f.x);let ri=smoothstep(1.-band,1.,f.x);
 let shape=top*select(select(0.,-1.5,here<above),1.,here>above)-bottom*select(0.,.7,here>below)+le*select(select(0.,-.5,here<left),.6,here>left)-ri*select(select(0.,.6,here<right),.5,here>right);
 let wear=villageFinNoise(q*.19)-.5+sin(q.x*.21+1.3)*sin(q.y*.17+.7)*sin(q.z*.19+2.1)*.4;
 var tone=1.+((h-.5)*.085-joint*.05*(.82+h*.36)+shape*.105+here*.035)*fine+wear*.105*(1.-smoothstep(1.,3.,px))*room;
 tone*=1.-(1.-up)*.16*(1.-smoothstep(0.,3.2,(l.y+.5)*size.y))*room;
 let hue=(villageFinHash(cell+vec3f(17.3))-.5)*.06*fine;let bright=max(base.r,max(base.g,base.b));let neutral=1.-smoothstep(.12,.5,(bright-min(base.r,min(base.g,base.b)))/max(.08,bright));let grain=(1.-smoothstep(.14,.5,px*4.))*room*neutral;
 if(grain>.001){tone*=1.+(villageFinHash(floor(q*4.)+vec3f(11.7))-.5)*.055*grain;}
 return tone*vec3f(1.+hue,1.,1.-hue);
}`, [nodeFinHash,nodeFinLevel,nodeFinNoise]);
export const nodeAlphaHash = wgslFn(`fn villageAlphaHash(position:vec3f)->f32 {
 let deriv=max(length(dpdx(position)),length(dpdy(position)));let scale=1./max(.05*deriv,.0000001);let lo=exp2(floor(log2(scale)));let hi=exp2(ceil(log2(scale)));
 let p0=floor(lo*position);let p1=floor(hi*position);
 let h0=fract(1.e4*sin(17.*p0.x+.1*p0.y)*(.1+abs(sin(13.*p0.y+p0.x))));let h1=fract(1.e4*sin(17.*p1.x+.1*p1.y)*(.1+abs(sin(13.*p1.y+p1.x))));
 let a0=fract(1.e4*sin(17.*h0+.1*p0.z)*(.1+abs(sin(13.*p0.z+h0))));let a1=fract(1.e4*sin(17.*h1+.1*p1.z)*(.1+abs(sin(13.*p1.z+h1))));
 let lerp=fract(log2(scale));let x=mix(a0,a1,lerp);let a=min(lerp,1.-lerp);if(a<.000001){return clamp(x,.000001,1.);}
 let den=2.*a*(1.-a);var threshold=(x-.5*a)/(1.-a);if(x<a){threshold=x*x/den;}else if(x>=1.-a){threshold=1.-(1.-x)*(1.-x)/den;}return clamp(threshold,.000001,1.);
}`);
export const nodeWaterNormal = wgslFn(`fn villageWaterNormal(world:vec2f,time:f32)->vec3f {
 let broadAxis=vec2f(.8603,.5098);let fineAxis=vec2f(-.5704,.8214);let broad=dot(world,broadAxis)*2.1+time*.72;let fine=dot(world,fineAxis)*3.7-time*1.06;
 let slope=broadAxis*cos(broad)*.065*(1.-smoothstep(.3,1.3,fwidth(broad)))+fineAxis*cos(fine)*.033*(1.-smoothstep(.3,1.3,fwidth(fine)));return normalize(vec3f(-slope.x,1.,-slope.y));
}`);
export const nodeGrassDeform = wgslFn(`fn villageGrassDeform(p0:vec3f,root:vec3f,tip:f32,time:f32,visibility:f32)->vec3f {
 var p=p0;p.y*=mix(.08,1.,visibility);let wave=sin(time*1.3-(root.x*.9+root.z*.5)*.35)*.5+.5;let sway=(sin(time*2.1+root.x*.7+root.z*.4)*.35+wave*.9)*tip*tip;p.x+=sway*.22;p.z-=sway*.12;return p;
}`);
export const nodeAoCorner = wgslFn(`fn villageAoCorner(words:vec2f,p:vec3f,n:vec3f)->f32 {
 var face=4.;var u=p.x;var v=p.y;if(abs(n.x)>.5){face=select(1.,0.,n.x>0.);u=p.z;}else if(abs(n.y)>.5){face=select(3.,2.,n.y>0.);u=p.x;v=p.z;}else{face=select(5.,4.,n.z>0.);}
 let index=face*4.+select(0.,1.,u>0.)+select(0.,2.,v>0.);let word=select(words.x,words.y,index>=12.);let local=index-floor(index/12.)*12.;let digit=floor(word/exp2(local*2.));return (digit-floor(digit/4.)*4.)/3.;
}`);
export const nodePbrClassify = wgslFn(`fn villagePbrClassify(c:vec3f)->vec2f {
 let hi=max(c.r,max(c.g,c.b));let lo=min(c.r,min(c.g,c.b));let sat=(hi-lo)/max(.0001,hi);if((c.g>c.r*1.08&&c.g>c.b*.95)||hi<.006){return vec2f(0,0);}if(sat<.23){return vec2f(0,1);}let gr=c.g/max(c.r,.0001);let br=c.b/max(c.r,.0001);if(hi>.3&&gr>.65&&gr<.94&&br>.1&&br<.55){return vec2f(3,.8);}if(c.b>c.r*.8&&c.b>c.g*1.15&&c.r>c.g*1.04){return vec2f(2,.8);}if(c.r>c.g*1.16&&c.g>c.b*1.25&&hi<.46){return vec2f(1,.7);}return vec2f(0,0);
}`);
export const nodePbrTangentNormal = wgslFn(`fn villagePbrTangentNormal(mapN:vec3f,face:vec2f,n:vec3f,eye:vec3f,side:f32)->vec3f {
 let q0=dpdx(eye);let q1=dpdy(eye);let st0=dpdx(face);let st1=dpdy(face);let q1p=cross(q1,n);let q0p=cross(n,q0);let t=q1p*st0.x+q0p*st1.x;let b=q1p*st0.y+q0p*st1.y;let det=max(dot(t,t),dot(b,b));let scale=select(0.,inverseSqrt(max(det,.00000001)),det>.00000001)*side;return normalize(t*(mapN.x*scale)+b*(mapN.y*scale)+n*mapN.z);
}`);
