/**
 * Global lighting rig. Room-specific accents (the fountain's blue glow, the meeting room's
 * spotlight, the server room's green/cyan wash, workstation monitor emissives) live in their
 * own components — this is just the base exposure every part of the office shares: soft
 * ambient fill plus one directional key light sized to cover the whole ~40x30 floor plan.
 */
export default function OfficeLighting() {
  return (
    <>
      {/* Soft sky/ground fill — brightens the whole office evenly (including shadowed faces
          the directional/ambient lights alone leave dim) without washing out contrast. */}
      <hemisphereLight color="#dce8ff" groundColor="#3a4150" intensity={0.95} />

      <ambientLight intensity={1.15} />

      <directionalLight
        castShadow
        position={[18, 26, 12]}
        intensity={2.7}
        color="#fff8ef"
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-near={1}
        shadow-camera-far={70}
        shadow-camera-left={-26}
        shadow-camera-right={26}
        shadow-camera-top={22}
        shadow-camera-bottom={-22}
        shadow-bias={-0.0006}
      />

      {/* Cool rim light from the opposite side, matching the studio look of the original prototype */}
      <directionalLight position={[-16, 14, -10]} intensity={0.55} color="#8fd3ff" />
    </>
  );
}
