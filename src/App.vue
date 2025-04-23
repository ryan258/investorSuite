<!-- src/App.vue -->
<template>
  <div id="app" class="container mx-auto p-4">
    <h1 class="text-3xl font-bold text-blue-600 mb-4">
      AI-Powered Future Scenario Generator
    </h1>
    <div class="flex items-center gap-4 mb-4">
      <form @submit.prevent="generateScenario" class="flex-1 flex flex-col md:flex-row gap-4 items-center">
        <input v-model="userPrompt" type="text" placeholder="Enter a topic or prompt..." class="flex-1 border rounded px-3 py-2" />
        <button type="submit" class="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">Generate Scenario</button>
      </form>
      <button @click="exportSession" class="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 whitespace-nowrap">Export Session as Markdown</button>
    </div>
    <TimelineVisualization 
      :title="'AI Development Timeline'"
      :events="timelineEvents"
      :expanded-nodes="expandedNodes"
      @expand-node="handleExpandNode"
      @expand-node-recursive="handleExpandNodeRecursive"
    />
    <div v-if="loading" class="mt-4 text-gray-500">Generating scenario...</div>
    <div v-if="error" class="mt-4 text-red-500">{{ error }}</div>
    <div v-if="exportMessage" class="mt-4 text-green-700 flex items-center gap-4">
      <span>{{ exportMessage }}</span>
      <a v-if="exportedFilename" :href="`/api/download-log/${exportedFilename}`" download class="ml-2 bg-green-200 text-green-800 px-3 py-1 rounded hover:bg-green-300 text-sm font-semibold">Download Markdown</a>
    </div>
  </div>
</template>

<script>
import { defineComponent, ref, reactive } from 'vue';
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
    const exportMessage = ref('');
    const exportedFilename = ref('');

    // Map of expanded nodes: { [index]: { expanding: bool, children: [], childrenExpanded: {} } }
    const expandedNodes = reactive({});

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
        // Reset expanded nodes on new scenario
        Object.keys(expandedNodes).forEach(key => delete expandedNodes[key]);
      } catch (e) {
        error.value = e.message || 'Error generating scenario.';
      } finally {
        loading.value = false;
      }
    }

    async function exportSession() {
      exportMessage.value = '';
      exportedFilename.value = '';
      try {
        const response = await fetch('/api/export-session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionTitle: userPrompt.value,
            timelineEvents: timelineEvents.value,
            expandedNodes: JSON.parse(JSON.stringify(expandedNodes))
          })
        });
        const data = await response.json();
        if (data.success && data.filename) {
          exportMessage.value = `Session exported to /logs/${data.filename}`;
          exportedFilename.value = data.filename;
        } else {
          exportMessage.value = 'Failed to export session.';
        }
      } catch (e) {
        exportMessage.value = 'Failed to export session.';
      }
    }

    async function handleExpandNode({ event, index }) {
      if (expandedNodes[index]?.expanding || expandedNodes[index]?.children?.length) {
        // Collapse if already expanded
        delete expandedNodes[index];
        return;
      }
      expandedNodes[index] = { expanding: true, children: [], childrenExpanded: {} };
      try {
        const expandPrompt = `Expand on this event with 3-4 more immediate, realistic events that could happen just before and after: ${event.title} (${event.date}). Respond ONLY as a single valid JSON array of objects with fields: title, date, description. Use plausible years close to ${event.date}.`;
        const response = await fetch('/api/scenarios', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prompt: expandPrompt })
        });
        if (!response.ok) throw new Error('Failed to expand event');
        const data = await response.json();
        if (Array.isArray(data) && data.length > 0) {
          expandedNodes[index].children = data.map(evt => ({
            title: evt.title,
            date: evt.date,
            description: evt.description
          }));
        } else {
          expandedNodes[index].children = [];
        }
      } catch (e) {
        expandedNodes[index].children = [];
      } finally {
        expandedNodes[index].expanding = false;
      }
    }

    async function handleExpandNodeRecursive({ event, index, parentPath }) {
      // Traverse down the expandedNodes tree using parentPath
      let node = expandedNodes;
      for (let i = 0; i <parentPath.length; ++i) {
        const idx = parentPath[i];
        if (!node[idx]) node[idx] = { expanding: false, children: [], childrenExpanded: {} };
        node = node[idx].childrenExpanded;
      }
      if (node[index]?.expanding || node[index]?.children?.length) {
        // Collapse if already expanded
        delete node[index];
        return;
      }
      node[index] = { expanding: true, children: [], childrenExpanded: {} };
      try {
        const expandPrompt = `Expand on this event with 3-4 more immediate, realistic events that could happen just before and after: ${event.title} (${event.date}). Respond ONLY as a single valid JSON array of objects with fields: title, date, description. Use plausible years close to ${event.date}.`;
        const response = await fetch('/api/scenarios', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prompt: expandPrompt })
        });
        if (!response.ok) throw new Error('Failed to expand event');
        const data = await response.json();
        if (Array.isArray(data) && data.length > 0) {
          node[index].children = data.map(evt => ({
            title: evt.title,
            date: evt.date,
            description: evt.description
          }));
        } else {
          node[index].children = [];
        }
      } catch (e) {
        node[index].children = [];
      } finally {
        node[index].expanding = false;
      }
    }

    return {
      userPrompt,
      timelineEvents,
      loading,
      error,
      exportMessage,
      exportedFilename,
      generateScenario,
      expandedNodes,
      handleExpandNode,
      handleExpandNodeRecursive,
      exportSession
    };
  }
});
</script>