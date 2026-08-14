import { DoubleSide, MeshPhysicalMaterial, MeshStandardMaterial } from "three";

/**
 * Shared material singletons — created exactly once for the whole app lifetime (not per
 * component instance, not even per-mount via useMemo) and referenced by many meshes across the
 * office via the `material={...}` prop. Keeps the "use proper, varied materials" brief cheap:
 * one GPU material per look, reused everywhere that look is needed, instead of dozens of
 * near-identical MeshStandardMaterial instances.
 *
 * Anything that needs a per-instance color (agent identity colors, workstation accents) is
 * intentionally NOT here — those are built with useMemo in the component that needs them.
 */

export const woodMaterial = new MeshStandardMaterial({
  color: "#8a5a34",
  roughness: 0.75,
  metalness: 0.05,
});

export const darkWoodMaterial = new MeshStandardMaterial({
  color: "#3f2a1c",
  roughness: 0.7,
  metalness: 0.05,
});

export const stoneMaterial = new MeshStandardMaterial({
  color: "#6b7280",
  roughness: 0.9,
  metalness: 0.05,
});

export const concreteMaterial = new MeshStandardMaterial({
  color: "#3a3f47",
  roughness: 0.95,
  metalness: 0.02,
});

export const metalMaterial = new MeshStandardMaterial({
  color: "#8b93a1",
  roughness: 0.35,
  metalness: 0.85,
});

export const darkMetalMaterial = new MeshStandardMaterial({
  color: "#1c2128",
  roughness: 0.4,
  metalness: 0.75,
});

export const glassMaterial = new MeshPhysicalMaterial({
  color: "#bfe4ff",
  transparent: true,
  opacity: 0.14,
  roughness: 0.05,
  metalness: 0.1,
  side: DoubleSide,
});

export const floorMaterial = new MeshStandardMaterial({
  color: "#1b212c",
  roughness: 0.25,
  metalness: 0.4,
});

export const carpetMaterial = new MeshStandardMaterial({
  color: "#232833",
  roughness: 0.95,
  metalness: 0,
});

export const foliageMaterial = new MeshStandardMaterial({
  color: "#3f8a4d",
  roughness: 0.8,
  metalness: 0,
});

export const potMaterial = new MeshStandardMaterial({
  color: "#5c4433",
  roughness: 0.8,
  metalness: 0,
});

export const screenOffMaterial = new MeshStandardMaterial({
  color: "#050608",
  roughness: 0.3,
  metalness: 0.4,
});
