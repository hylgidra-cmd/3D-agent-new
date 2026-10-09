using System.Collections.Generic;
using System.Threading.Tasks;

namespace LocalPageBackend.Services.AgentWork
{
    public class ThreeDAgentWorkProvider : IAgentWorkProvider
    {
        public string AgentId => "3D_Model";
        public string DisplayName => "3D Specialist";

        private const string SceneJsTemplate = """
            // 3D Scene Component for __TITLE__
            // Generated for task: __TASK__
            import React, { useRef } from 'react';
            import { Canvas, useFrame } from '@react-three/fiber';
            import { OrbitControls, Float, MeshDistortMaterial } from '@react-three/drei';

            function ModelObject() {
              const meshRef = useRef();

              useFrame((_, delta) => {
                if (meshRef.current) {
                  meshRef.current.rotation.x += delta * 0.4;
                  meshRef.current.rotation.y += delta * 0.6;
                }
              });

              return (
                <Float speed={2} rotationIntensity={1.5} floatIntensity={2}>
                  <mesh ref={meshRef}>
                    <icosahedronGeometry args={[2, 4]} />
                    <MeshDistortMaterial
                      color="#6366f1"
                      attach="material"
                      distort={0.4}
                      speed={2}
                      roughness={0.2}
                      metalness={0.8}
                    />
                  </mesh>
                </Float>
              );
            }

            export default function __COMPONENT__Scene() {
              return (
                <div style={{ width: '100vw', height: '100vh', background: '#090d16' }}>
                  <Canvas camera={{ position: [0, 0, 6], fov: 50 }}>
                    <ambientLight intensity={0.7} />
                    <directionalLight position={[10, 10, 5]} intensity={1.5} />
                    <pointLight position={[-10, -10, -5]} color="#ec4899" intensity={2} />
                    <ModelObject />
                    <OrbitControls enableZoom={true} />
                  </Canvas>
                </div>
              );
            }
            """;

        private const string PackageJsonTemplate = """
            {
              "name": "threed-scene",
              "private": true,
              "version": "1.0.0",
              "dependencies": {
                "react": "^18.2.0",
                "react-dom": "^18.2.0",
                "three": "^0.160.0",
                "@react-three/fiber": "^8.15.0",
                "@react-three/drei": "^9.96.0"
              }
            }
            """;

        public Dictionary<string, string> BuildDeterministicFiles(string componentName, string route, string task, string language)
        {
            var title = AgentWorkShared.ToDisplayTitle(componentName);
            var sceneJs = SceneJsTemplate
                .Replace("__TITLE__", title)
                .Replace("__TASK__", task)
                .Replace("__COMPONENT__", componentName);

            return new Dictionary<string, string>
            {
                [$"3d/{componentName}Scene.jsx"] = sceneJs,
                ["3d/package.json"] = PackageJsonTemplate
            };
        }

        public async Task<(string Path, string Content)?> TryGenerateLlmOverlayAsync(
            GeminiService gemini, string componentName, string route, string task)
        {
            var roleContext = @"You are an expert Three.js and React Three Fiber 3D developer.
Write a production-quality React Three Fiber 3D scene component for the user's task.
Output ONLY the raw JavaScript/JSX code. Do NOT wrap in markdown code blocks. Do NOT include markdown explanations.";

            var prompt = $"Build an interactive React Three Fiber 3D scene for: {task}. Component name: {componentName}Scene.";
            var generatedCode = await gemini.TryGenerateTextAsync(prompt, roleContext);

            if (string.IsNullOrWhiteSpace(generatedCode)) return null;

            var cleanCode = AgentWorkShared.StripCodeFences(generatedCode);
            return ($"3d/{componentName}Scene.jsx", cleanCode);
        }

        public string BuildReadme(string componentName, string route, string task, string language, string mode)
        {
            return $"3D Model Deliverable for: {task}\nMode: {mode}\nIncludes React Three Fiber component and package.json.";
        }
    }
}

