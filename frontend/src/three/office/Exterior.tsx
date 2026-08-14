import { Grid } from "@react-three/drei";

const STUDIO_BACKGROUND = "#05070a";

/**
 * The "outside" of the office — deliberately not a landscape anymore. No sky, no ground/grass,
 * no trees: just a solid dark studio background, matching fog for depth cueing, and a sleek
 * fading tech-grid floor extending past the building footprint, so the office reads as a clean
 * high-tech stage/viewport rather than a building sitting in a park.
 */
export default function Exterior() {
  return (
    <group>
      <color attach="background" args={[STUDIO_BACKGROUND]} />
      {/* Soft falloff so the grid/void beyond the building fades to the background color
          instead of cutting off with a hard edge. */}
      <fog attach="fog" args={[STUDIO_BACKGROUND, 45, 150]} />

      {/* Solid dark backing plane — gives the grid something opaque to sit on rather than void,
          and quietly catches the key light's falloff at the edges of the scene. */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.05, 0]} receiveShadow>
        <planeGeometry args={[400, 400]} />
        <meshStandardMaterial color="#090b10" roughness={0.95} metalness={0.05} />
      </mesh>

      {/* Sleek fading grid — professional-viewport / studio-stage look, replacing grass. */}
      <Grid
        position={[0, -0.03, 0]}
        args={[10, 10]}
        cellSize={2}
        cellThickness={0.5}
        cellColor="#1c2430"
        sectionSize={10}
        sectionThickness={1.1}
        sectionColor="#2f3d52"
        fadeDistance={110}
        fadeStrength={1.5}
        followCamera={false}
        infiniteGrid
      />
    </group>
  );
}
