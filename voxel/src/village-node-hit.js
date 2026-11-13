// Picking and rendering use the same terrain sample, including raised lawns.
export function villageNodeHitBox(node, point, groundAt) {
  const blighted=node?.kind==='blight',h=blighted?1.08:.65;
  return {x:point.x,y:groundAt(point.x,point.z)+h/2,z:-point.z,w:blighted?1.35:.75,h,d:blighted?1.35:.75};
}
