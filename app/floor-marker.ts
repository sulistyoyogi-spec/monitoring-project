/** A marker is assigned only while importing a verified bold-and-empty row. */
export const isFloorMarker=(payload:unknown)=>Boolean(payload&&typeof payload==="object"&&(payload as Record<string,unknown>).floorMarker===true);
