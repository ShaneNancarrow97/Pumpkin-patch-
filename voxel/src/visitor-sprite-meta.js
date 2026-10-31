import { VISITOR_KINDS } from "./content/visitors.js";
// The generated sheet is a four-frame walk cycle per row. Measure alpha so
// transparent gutters never change the apparent scale or the foot anchor.
export function horrorVisitorSheetMeta(image) {
  const canvas=document.createElement("canvas");canvas.width=image.width;canvas.height=image.height;
  const ctx=canvas.getContext("2d",{willReadFrequently:true});ctx.drawImage(image,0,0);
  const rowEdges=[0,267,546,816,1104,1402].map(y=>Math.round(y*image.height/1402));
  const pixels=ctx.getImageData(0,0,image.width,image.height).data,meta={w:image.width,h:image.height,rows:320};
  for(let row=0;row<5;row++) {
    meta[VISITOR_KINDS[row+5]]=Array.from({length:4},(_,col)=>{
      const x=Math.round(col*image.width/4),y=rowEdges[row],w=Math.round((col+1)*image.width/4)-x,h=rowEdges[row+1]-y;
      let left=w,right=-1,top=h,bottom=-1;
      for(let yy=0;yy<h;yy++)for(let xx=0;xx<w;xx++)if(pixels[((y+yy)*image.width+x+xx)*4+3]>40){left=Math.min(left,xx);right=Math.max(right,xx);top=Math.min(top,yy);bottom=Math.max(bottom,yy);}
      if(bottom<0)throw Error(`Missing visitor walk frame ${row}:${col}`);
      return {x,y,w,h,ax:(left+right+1)/2,ay:bottom+1,unit:1.62/(bottom-top+1)};
    });
  }
  return meta;
}
