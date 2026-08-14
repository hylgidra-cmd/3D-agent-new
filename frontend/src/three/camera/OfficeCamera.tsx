import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { OrbitControls, PerspectiveCamera } from "@react-three/drei";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import { Vector3 } from "three";
import { useOfficeStore } from "../../store/officeStore";
import { useTourStore } from "../../store/tourStore";
import { officeAudio } from "../../audio/officeAudioEngine";
import type { AgentId } from "../../data/agents";

const OFFICE_CENTER = new Vector3(0, 1, -1);
const FOCUS_HEIGHT = 1.55;
const FOCUS_LERP_SPEED = 2.5;

// "Agent View" per the brief (item 23) — tight enough to clearly show agent + chair + desk +
// monitors together, not just the agent alone from across the room.
const AGENT_VIEW_DISTANCE = 8.5;
// Slightly wider than a manual agent-view — the cinematic tour frames a bit more of the
// workstation/room around each agent rather than a tight close-up.
const TOUR_VIEW_DISTANCE = 10.5;
// "Overview" distance to ease back out to on deselect — closer than the office's full diagonal
// so returning to overview doesn't feel like a jump back to a distant miniature board either.
const OVERVIEW_DISTANCE = 26;
const DISTANCE_TRANSITION_SECONDS = 1.1;
const TOUR_AUTOROTATE_SPEED = 1.1;

/**
 * Isometric-leaning orbit camera. Deliberately lerps only `controls.target` continuously toward
 * the focused agent (never camera.position directly) — since OrbitControls derives the
 * camera's actual position from spherical coordinates around that target, panning the target
 * smoothly carries the camera along at whatever distance/angle it already had.
 *
 * "Focus" is either a manual click (useOfficeStore's selectedAgentId) or an active tour step
 * (useTourStore's currentAgentId) — the tour always takes priority when running. On top of the
 * continuous target lerp, a focus CHANGE (not every frame) also kicks off a short one-time pull
 * of the camera's distance-from-target toward a framing appropriate for that change. That pull
 * only runs for DISTANCE_TRANSITION_SECONDS; once it's done, the user has completely free
 * scroll-to-zoom again outside a tour, so this can never fight manual control.
 *
 * While a tour is active, OrbitControls' `enabled` is false (blocks drag/scroll input) and
 * `autoRotate` is true — autoRotate still runs through OrbitControls' own update() regardless of
 * `enabled`, so the camera keeps slowly orbiting each paused agent for a cinematic feel without
 * the user being able to interrupt it.
 */
export default function OfficeCamera() {
  const controlsRef = useRef<OrbitControlsImpl>(null);
  const desiredTarget = useRef(new Vector3().copy(OFFICE_CENTER));
  const listenerForward = useRef(new Vector3());

  const prevFocusId = useRef<AgentId | null>(null);
  const distanceTransition = useRef<{ from: number; to: number; elapsed: number } | null>(null);

  const touring = useTourStore((s) => s.active);

  useFrame((_, delta) => {
    const { selectedAgentId, agents } = useOfficeStore.getState();
    const tour = useTourStore.getState();
    const controls = controlsRef.current;
    if (!controls) return;

    const focusAgentId = tour.active ? tour.currentAgentId : selectedAgentId;

    if (focusAgentId) {
      const runtime = agents[focusAgentId];
      desiredTarget.current.set(runtime.position[0], FOCUS_HEIGHT, runtime.position[2]);
    } else {
      desiredTarget.current.copy(OFFICE_CENTER);
    }
    controls.target.lerp(desiredTarget.current, Math.min(1, delta * FOCUS_LERP_SPEED));

    if (focusAgentId !== prevFocusId.current) {
      const currentDistance = controls.getDistance();
      const toDistance = focusAgentId ? (tour.active ? TOUR_VIEW_DISTANCE : AGENT_VIEW_DISTANCE) : OVERVIEW_DISTANCE;
      // Only bother animating if we'd actually be moving a meaningful amount — skips a pointless
      // transition when e.g. switching between two agents from a distance that's already close.
      if (Math.abs(currentDistance - toDistance) > 0.5) {
        distanceTransition.current = { from: currentDistance, to: toDistance, elapsed: 0 };
      }
      prevFocusId.current = focusAgentId;
    }

    const transition = distanceTransition.current;
    if (transition) {
      transition.elapsed += delta;
      const t = Math.min(1, transition.elapsed / DISTANCE_TRANSITION_SECONDS);
      const eased = 1 - (1 - t) * (1 - t); // ease-out — fast start, gentle settle
      const distance = transition.from + (transition.to - transition.from) * eased;

      const offset = controls.object.position.clone().sub(controls.target);
      offset.setLength(distance);
      controls.object.position.copy(controls.target).add(offset);

      if (t >= 1) distanceTransition.current = null;
    }

    controls.update();

    // Spatial-audio listener follows the camera every frame, so agent typing/footstep sounds
    // (see officeAudioEngine's per-agent panners) pan/attenuate relative to what's on screen.
    controls.object.getWorldDirection(listenerForward.current);
    const camPos = controls.object.position;
    officeAudio.updateListener(
      [camPos.x, camPos.y, camPos.z],
      [listenerForward.current.x, listenerForward.current.y, listenerForward.current.z],
    );
  });

  return (
    <>
      <PerspectiveCamera makeDefault position={[19, 16, 23]} fov={42} near={0.1} far={220} />
      <OrbitControls
        ref={controlsRef}
        makeDefault
        enabled={!touring}
        autoRotate={touring}
        autoRotateSpeed={TOUR_AUTOROTATE_SPEED}
        enableDamping
        dampingFactor={0.08}
        minDistance={4}
        maxDistance={46}
        minPolarAngle={Math.PI / 6}
        maxPolarAngle={Math.PI / 2.3}
        target={[0, 1, -1]}
      />
    </>
  );
}
