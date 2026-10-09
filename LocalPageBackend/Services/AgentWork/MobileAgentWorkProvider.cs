using System.Collections.Generic;
using System.Threading.Tasks;

namespace LocalPageBackend.Services.AgentWork
{
    public class MobileAgentWorkProvider : IAgentWorkProvider
    {
        public string AgentId => "Android_iOS";
        public string DisplayName => "Mobile App Developer";

        private const string AppJsTemplate = """
            // React Native / Expo Screen for __TITLE__
            // Generated for task: __TASK__
            import React, { useState } from 'react';
            import { StyleSheet, Text, View, TextInput, TouchableOpacity, FlatList, SafeAreaView, StatusBar } from 'react-native';

            export default function App() {
              const [items, setItems] = useState([
                { id: '1', title: 'Birinchi vazifa / Sample item' },
                { id: '2', title: 'Mobil ilova / Mobile feature' }
              ]);
              const [text, setText] = useState('');

              const addItem = () => {
                if (!text.trim()) return;
                setItems([...items, { id: Date.now().toString(), title: text.trim() }]);
                setText('');
              };

              return (
                <SafeAreaView style={styles.container}>
                  <StatusBar barStyle="light-content" />
                  <View style={styles.header}>
                    <Text style={styles.title}>__TITLE__</Text>
                    <Text style={styles.subtitle}>__TASK__</Text>
                  </View>

                  <View style={styles.inputContainer}>
                    <TextInput
                      style={styles.input}
                      placeholder="Yangi element qo'shish..."
                      placeholderTextColor="#94a3b8"
                      value={text}
                      onChangeText={setText}
                    />
                    <TouchableOpacity style={styles.button} onPress={addItem}>
                      <Text style={styles.buttonText}>+</Text>
                    </TouchableOpacity>
                  </View>

                  <FlatList
                    data={items}
                    keyExtractor={item => item.id}
                    renderItem={({ item }) => (
                      <View style={styles.card}>
                        <Text style={styles.cardText}>{item.title}</Text>
                      </View>
                    )}
                    contentContainerStyle={styles.list}
                  />
                </SafeAreaView>
              );
            }

            const styles = StyleSheet.create({
              container: { flex: 1, backgroundColor: '#090d16' },
              header: { padding: 20, borderBottomWidth: 1, borderBottomColor: '#1e293b' },
              title: { fontSize: 24, fontWeight: 'bold', color: '#f8fafc' },
              subtitle: { fontSize: 13, color: '#94a3b8', marginTop: 4 },
              inputContainer: { flexDirection: 'row', padding: 16, gap: 8 },
              input: { flex: 1, backgroundColor: '#1e293b', borderRadius: 8, paddingHorizontal: 16, color: '#f8fafc', height: 48 },
              button: { width: 48, height: 48, backgroundColor: '#38bdf8', borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
              buttonText: { fontSize: 24, color: '#090d16', fontWeight: 'bold' },
              list: { padding: 16 },
              card: { backgroundColor: '#1e293b', padding: 16, borderRadius: 8, marginBottom: 8, borderWidth: 1, borderColor: '#334155' },
              cardText: { color: '#f8fafc', fontSize: 16 }
            });
            """;

        private const string PackageJsonTemplate = """
            {
              "name": "mobile-app",
              "version": "1.0.0",
              "scripts": {
                "start": "expo start",
                "android": "expo start --android",
                "ios": "expo start --ios"
              },
              "dependencies": {
                "expo": "~50.0.0",
                "react": "18.2.0",
                "react-native": "0.73.0"
              }
            }
            """;

        public Dictionary<string, string> BuildDeterministicFiles(string componentName, string route, string task, string language)
        {
            var title = AgentWorkShared.ToDisplayTitle(componentName);
            var appJs = AppJsTemplate.Replace("__TITLE__", title).Replace("__TASK__", task);

            return new Dictionary<string, string>
            {
                ["mobile/App.js"] = appJs,
                ["mobile/package.json"] = PackageJsonTemplate
            };
        }

        public async Task<(string Path, string Content)?> TryGenerateLlmOverlayAsync(
            GeminiService gemini, string componentName, string route, string task)
        {
            var roleContext = @"You are a Senior React Native (iOS / Android) mobile developer.
Write a complete, working React Native screen for the given user task.
Output ONLY raw JavaScript/JSX code. No markdown fences, no explanatory text.";

            var prompt = $"Build a React Native screen component for: {task}. Component name: {componentName}Screen.";
            var generatedCode = await gemini.TryGenerateTextAsync(prompt, roleContext);

            if (string.IsNullOrWhiteSpace(generatedCode)) return null;

            var cleanCode = AgentWorkShared.StripCodeFences(generatedCode);
            return ("mobile/App.js", cleanCode);
        }

        public string BuildReadme(string componentName, string route, string task, string language, string mode)
        {
            return $"Mobile (Android & iOS) Deliverable for: {task}\nMode: {mode}\nRun with Expo: npm install && npx expo start";
        }
    }
}

