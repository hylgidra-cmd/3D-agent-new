// Office bounding box (top-down: X right, Z toward the entrance). See data/agents.ts's
// WAYPOINTS comment for the full floor-plan sketch. Kept in its own module (not exported
// alongside a component) so fast-refresh can treat Structure.tsx as component-only.
export const OFFICE_BOUNDS = { minX: -20, maxX: 20, minZ: -16, maxZ: 14 };

// The single shared room housing all six workstations (two facing columns of three). Everything
// east of maxX is open floor.
export const AGENT_ROOM_BOUNDS = { minX: -19, maxX: -6, minZ: -6.5, maxZ: 8.3 };
