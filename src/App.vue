<!-- src/App.vue -->
<template>
  <div id="app" class="container mx-auto p-4">
    <h1 class="text-3xl font-bold text-blue-600 mb-4">
      AI-Powered Future Scenario Generator
    </h1>
    <TimelineVisualization 
      :title="'AI Development Timeline'"
      :events="timelineEvents"
    />
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

    return {
      timelineEvents
    };
  }
});
</script>