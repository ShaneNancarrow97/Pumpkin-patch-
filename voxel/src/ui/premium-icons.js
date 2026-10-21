import atlasUrl from "../../assets/premium-menu-icons.png";

import { MENU_ICON_NAMES } from "./premium-icon-markup.js";
export { premiumIcon } from "./premium-icon-markup.js";

// Normalise atlas gutters into crisp, consistently sized UI tiles. The art is
// generated, not drawn in code. No runtime network dependency or button resizing.
export function installPremiumIcons() {
  const image = new Image(); image.src = atlasUrl;
  return new Promise(resolve => {
    image.onerror = () => resolve(false);
    image.onload = () => {
      const tile = document.createElement("canvas"), ctx = tile.getContext("2d", {willReadFrequently:true});
      const style = document.createElement("style"), rules = [];
      tile.width=image.width;tile.height=image.height;ctx.drawImage(image,0,0);
      const alpha=ctx.getImageData(0,0,image.width,image.height).data;
      const valley=(centre,radius,score)=>{let best=Infinity,result=centre;for(let n=Math.max(1,Math.round(centre-radius));n<Math.round(centre+radius);n++){const count=score(n);if(count<best||count===best&&Math.abs(n-centre)<Math.abs(result-centre)){best=count;result=n;}}return result;};
      const rowEdges=[0,...Array.from({length:4},(_,i)=>valley(image.height*(i+1)/5,image.height*.04,y=>{let n=0;for(let x=0;x<image.width;x++)if(alpha[(y*image.width+x)*4+3]>40)n++;return n;})),image.height];
      const columns=Array.from({length:5},(_,row)=>[0,...Array.from({length:5},(_,i)=>valley(image.width*(i+1)/6,image.width*.035,x=>{let n=0;for(let y=rowEdges[row];y<rowEdges[row+1];y++)if(alpha[(y*image.width+x)*4+3]>40)n++;return n;})),image.width]);
      let loaded=0;
      const legacy = {patch:"farm",home:"home",outfits:"wardrobe",upgrades:"build",journal:"journal",coins:"coins",stock:"stock",visitors:"visitors",tools:"build",yield:"stock",auto:"harvest",plots:"garden",sign:"attractions",seeds:"seeds",shop:"shop",boost:"boost",music:"music",settings:"settings",talk:"talk",fullscreen:"fullscreen",help:"journal",plant:"plant",harvest:"harvest"};
      MENU_ICON_NAMES.forEach((name,i) => {
        const col=i%6,row=Math.floor(i/6),x=columns[row][col],y=rowEdges[row],w=columns[row][col+1]-x,h=rowEdges[row+1]-y;
        tile.width=w;tile.height=h;ctx.drawImage(image,x,y,w,h,0,0,w,h);
        const pixels=ctx.getImageData(0,0,w,h).data;let left=w,right=-1,top=h,bottom=-1;
        for(let yy=0;yy<h;yy++)for(let xx=0;xx<w;xx++)if(pixels[(yy*w+xx)*4+3]>32){left=Math.min(left,xx);right=Math.max(right,xx);top=Math.min(top,yy);bottom=Math.max(bottom,yy);}
        if(right<0)return;
        const output=document.createElement("canvas");output.width=output.height=96;
        const cw=right-left+1,ch=bottom-top+1,scale=84/Math.max(cw,ch);
        output.getContext("2d").drawImage(tile,left,top,cw,ch,(96-cw*scale)/2,(96-ch*scale)/2,cw*scale,ch*scale);
        loaded++;
        document.documentElement.style.setProperty(`--menu-${name}`,`url("${output.toDataURL("image/png")}")`);
      });
      for(const [old,name]of Object.entries(legacy))rules.push(`.premium-icons-ready .ico.i-${old}{background-image:var(--menu-${name})!important;background-size:contain!important;background-position:center!important;image-rendering:auto!important;}`);
      rules.push('.premium-icons-ready .coin-icon{background-image:var(--menu-coins)!important;background-size:contain!important;background-position:center!important;image-rendering:auto!important;}');style.textContent=rules.join("\n");document.head.append(style);
      const targets = {'[data-tab="patch"] > svg':"farm",'[data-tab="shop"] > svg':"build",'[data-tab="attractions"] > svg':"attractions",'[data-tab="home"] > svg':"home",'[data-tab="more"] > svg':"more",'#fullscreen > svg':"fullscreen",'#open-settings > svg':"settings",'.hud-visitors > svg':"visitors",'#place-back > svg':"back"};
      for(const [selector,name]of Object.entries(targets))for(const old of document.querySelectorAll(selector)){const span=document.createElement("span");span.className="premium-icon";span.setAttribute("aria-hidden","true");span.style.backgroundImage=`var(--menu-${name})`;old.replaceWith(span);}
      document.body.classList.add("premium-icons-ready");document.body.dataset.premiumIconCount=String(loaded);resolve(loaded===MENU_ICON_NAMES.length);
    };
  });
}
