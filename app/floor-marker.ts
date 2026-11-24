/** True for section labels such as "6st FLOOR" and "ROOF FLOOR", not panels. */
export const isFloorMarker=(value:unknown)=>/\b(?:\d+(?:ST|ND|RD|TH)?|ROOF)\s+FLOOR\b|\bLANTAI\s*\d+\b/i.test(String(value??""));
