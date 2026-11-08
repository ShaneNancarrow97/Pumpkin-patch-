// The village road leaves the farm beside Skyla's east lane, clear of the shop.
export const VILLAGE_GATEWAY = Object.freeze({ x: 38, z: 10.4, approach: Object.freeze({x:38,z:12.2}), zone: Object.freeze({x0:37.2,x1:38.65,z0:9.9,z1:10.65}) });
export const atVillageGateway = p => !!p && p.x >= VILLAGE_GATEWAY.zone.x0 && p.x <= VILLAGE_GATEWAY.zone.x1 && p.z >= VILLAGE_GATEWAY.zone.z0 && p.z <= VILLAGE_GATEWAY.zone.z1;
