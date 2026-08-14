export interface AgentAvatarProps {
  color: string;
  accentColor: string;
  hairColor?: string;
  size?: number;
}

/**
 * A CSS-only "voxel head" thumbnail — echoes the actual 3D character's face (white eyes with a
 * colored pupil, optional hair cap) rather than being a disconnected icon. Deliberately not a
 * second live WebGL canvas per card (six extra GL contexts for a list of thumbnails is wasteful)
 * — the inset/gradient shading here is just enough to read as a blocky 3D head.
 */
export default function AgentAvatar({ color, accentColor, hairColor, size = 56 }: AgentAvatarProps) {
  return (
    <div
      className="relative shrink-0 overflow-hidden rounded-xl"
      style={{
        width: size,
        height: size,
        background: `linear-gradient(155deg, ${color}, ${color}99)`,
        boxShadow: "inset -6px -8px 14px rgba(0,0,0,0.35), inset 3px 4px 8px rgba(255,255,255,0.2)",
      }}
    >
      {hairColor && (
        <div className="absolute inset-x-0 top-0" style={{ height: size * 0.3, background: hairColor }} />
      )}
      <div className="absolute inset-x-0 flex items-center justify-center gap-[16%]" style={{ top: size * 0.48 }}>
        {[0, 1].map((i) => (
          <div
            key={i}
            className="relative rounded-[2px] bg-white"
            style={{ width: size * 0.17, height: size * 0.17 }}
          >
            <div
              className="absolute rounded-full"
              style={{
                width: size * 0.085,
                height: size * 0.085,
                top: "50%",
                left: "50%",
                transform: "translate(-50%, -50%)",
                background: accentColor,
              }}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
