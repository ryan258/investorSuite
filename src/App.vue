<!-- src/App.vue -->
<template>
  <div id="app" class="container mx-auto p-4">
    <h1 class="text-3xl font-bold text-blue-600 mb-4">
      AI-Powered Future Scenario Generator
    </h1>
    <form @submit.prevent="generateScenario" class="mb-6 flex flex-col md:flex-row gap-4 items-center">
      <input v-model="userPrompt" type="text" placeholder="Enter a topic or prompt..." class="flex-1 border rounded px-3 py-2" />
      <button type="submit" class="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">Generate Scenario</button>
    </form>
    <TimelineVisualization 
      :title="'AI Development Timeline'"
      :events="timelineEvents"
    />
    <div v-if="loading" class="mt-4 text-gray-500">Generating scenario...</div>
    <div v-if="error" class="mt-4 text-red-500">{{ error }}</div>
  </div>
</template>

<script>
import { defineComponent, ref } from 'vue';
import TimelineVisualization from './components/TimelineVisualization.vue';

export default defineComponent({
  name: 'App',
  components: {
    TimelineVisualization
  },
  setup() {
    const userPrompt = ref('');
    const timelineEvents = ref([
      {
        title: 'AI Breakthrough in Natural Language Processing',
        date: '2025',
        description: 'A major breakthrough in NLP allows AI to understand and generate human-like text with unprecedented accuracy.'
      },
      {
        title: 'AI-Powered Climate Change Solutions',
        date: '2028',
        description: 'AI systems contribute to significant advancements in renewable energy and carbon capture technologies.'
      },
    ]);
    const loading = ref(false);
    const error = ref('');

    async function generateScenario() {
      if (!userPrompt.value) return;
      loading.value = true;
      error.value = '';
      try {
        const response = await fetch('/api/scenarios', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prompt: userPrompt.value })
        });
        if (!response.ok) throw new Error('Failed to generate scenario');
        const data = await response.json();
        // Accept both array and single object
        if (Array.isArray(data) && data.length > 0) {
          timelineEvents.value = data.map((scenario, i) => ({
            title: scenario.scenario?.title || scenario.title || `Scenario ${i+1}`,
            date: scenario.scenario?.date || scenario.date || '',
            description: scenario.scenario?.description || scenario.description || ''
          }));
        } else if (data && (data.title || data.description)) {
          timelineEvents.value = [{
            title: data.title || 'Scenario',
            date: data.date || '',
            description: data.description || ''
          }];
        } else {
          error.value = 'No scenarios returned.';
        }
      } catch (e) {
        error.value = e.message || 'Error generating scenario.';
      } finally {
        loading.value = false;
      }
    }

    return {
      userPrompt,
      timelineEvents,
      loading,
      error,
      generateScenario
    };
  }
});
</script>