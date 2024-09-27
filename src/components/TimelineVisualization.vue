// src/components/TimelineVisualization.vue

<template>
  <div class="timeline-container">
    <h2 class="text-2xl font-bold mb-4">{{ title }}</h2>
    <div class="timeline">
      <div v-for="(event, index) in events" :key="index" class="timeline-event">
        <div class="timeline-point"></div>
        <div class="timeline-content">
          <h3 class="text-lg font-semibold">{{ event.title }}</h3>
          <p class="text-sm text-gray-600">{{ event.date }}</p>
          <p>{{ event.description }}</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { defineComponent } from 'vue';

export default defineComponent({
  name: 'TimelineVisualization',
  props: {
    title: {
      type: String,
      default: 'Timeline'
    },
    events: {
      type: Array,
      required: true,
      validator: (value) => {
        return value.every(event => 
          typeof event.title === 'string' &&
          typeof event.date === 'string' &&
          typeof event.description === 'string'
        );
      }
    }
  }
});
</script>

<style scoped>
.timeline-container {
  @apply max-w-3xl mx-auto p-4;
}

.timeline {
  @apply relative border-l-2 border-gray-300 ml-3;
}

.timeline-event {
  @apply mb-8 ml-6;
}

.timeline-point {
  @apply absolute w-4 h-4 bg-blue-500 rounded-full -left-2 mt-1;
}

.timeline-content {
  @apply bg-white p-4 rounded shadow;
}
</style>