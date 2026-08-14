import { useEffect, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import type { Group } from "three";
import type { ThreeEvent } from "@react-three/fiber";
import { agentText, type AIAgent } from "../data/agents";
import { useOfficeStore } from "../store/officeStore";
import { useTourStore } from "../store/tourStore";
import { officeAudio } from "../audio/officeAudioEngine";
import { useTranslation } from "../i18n/useTranslation";
import AgentCharacter from "./AgentCharacter";
import AgentNameplate from "./AgentNameplate";
import TaskTimer from "./TaskTimer";

export interface AgentControllerProps {
  agent: AIAgent;
}

/**
 * Bridges one AIAgent between the simulation store and the scene graph:
 * - Reads position/rotationY imperatively from useOfficeStore.getState() every frame and writes
 *   it straight onto the group ref — deliberately NOT a reactive selector, so 60fps position
 *   updates never trigger a React re-render (see officeStore.ts's setAgentTransform doc comment).
 * - Subscribes reactively (cheap, low-frequency) to this agent's state/task and to
 *   selectedAgentId, since those DO need to drive JSX (animation branch, name tag, highlight).
 */
export default function AgentController({ agent }: AgentControllerProps) {
  const groupRef = useRef<Group>(null);
  const [hovered, setHovered] = useState(false);

  const state = useOfficeStore((s) => s.agents[agent.id].state);
  const isSelected = useOfficeStore((s) => s.selectedAgentId === agent.id);
  const selectAgent = useOfficeStore((s) => s.selectAgent);
  const taskDeadline = useOfficeStore((s) => s.agents[agent.id].taskDeadline);
  const { locale } = useTranslation();

  useFrame(() => {
    const runtime = useOfficeStore.getState().agents[agent.id];
    groupRef.current?.position.set(...runtime.position);
    if (groupRef.current) groupRef.current.rotation.y = runtime.rotationY;
    officeAudio.updateAgentPosition(agent.id, runtime.position);
  });

  // Drives the spatial typing-clack / footstep loops (see officeAudioEngine.setAgentState) —
  // a plain effect keyed on `state` rather than a per-frame check, since the engine only needs
  // to know about actual transitions, not every frame's value.
  useEffect(() => {
    officeAudio.setAgentState(agent.id, state);
  }, [agent.id, state]);

  useEffect(() => () => officeAudio.disposeAgent(agent.id), [agent.id]);

  const handleClick = (event: ThreeEvent<MouseEvent>) => {
    event.stopPropagation();
    // During a cinematic tour, manual selection is disabled — the tour alone drives camera
    // focus (see OfficeCamera), and a stray click here shouldn't fight it or pop AgentInfoPanel
    // open over TourOverlay.
    if (useTourStore.getState().active) return;
    selectAgent(isSelected ? null : agent.id);
  };

  return (
    <group
      ref={groupRef}
      onClick={handleClick}
      onPointerOver={(e) => {
        e.stopPropagation();
        setHovered(true);
        document.body.style.cursor = "pointer";
      }}
      onPointerOut={() => {
        setHovered(false);
        document.body.style.cursor = "auto";
      }}
    >
      <AgentCharacter
        id={agent.id}
        color={agent.color}
        accentColor={agent.accentColor}
        hairColor={agent.hairColor}
        state={state}
        isSelected={isSelected}
      />

      <AgentNameplate
        personName={agent.personName}
        jobTitle={agentText(agent.id, locale).name}
        accentColor={agent.accentColor}
        emphasized={hovered || isSelected}
      />

      {taskDeadline !== null && <TaskTimer deadline={taskDeadline} />}
    </group>
  );
}
