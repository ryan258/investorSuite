// src/components/TimelineVisualization.vue

<template>
  <div class="timeline-container">
    <h2 class="text-2xl font-bold mb-4">{{ title }}</h2>
    <div class="timeline">
      <TimelineNode
        v-for="(event, index) in events"
        :key="index"
        :event="event"
        :index="index"
        :expanded-nodes="expandedNodes"
        @expand-node="onExpandNode"
        @expand-node-recursive="$emit('expand-node-recursive', $event)"
      />
    </div>
  </div>
</template>

<script>
import TimelineNode from './TimelineNode.vue';

export default {
  name: 'TimelineVisualization',
  components: { TimelineNode },
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
    },
    expandedNodes: {
      type: Object,
      default: () => ({})
    }
  },
  emits: ['expand-node-recursive', 'expand-node'],
  methods: {
    onExpandNode(payload) {
      this.$emit('expand-node', payload);
    }
  }
};
</script>

<style scoped>
.timeline-container {
  max-width: 48rem;
  margin-left: auto;
  margin-right: auto;
  padding: 1rem;
}
.timeline {
  position: relative;
  border-left: 2px solid #d1d5db;
  margin-left: 0.75rem;
}
.timeline-event {
  margin-bottom: 2rem;
  margin-left: 1.5rem;
}
.timeline-point {
  position: absolute;
  width: 1rem;
  height: 1rem;
  background-color: #3498db;
  border-radius: 50%;
  left: -0.5rem;
  margin-top: 0.25rem;
}
.timeline-content {
  background-color: #fff;
  padding: 1rem;
  border-radius: 0.25rem;
  box-shadow: 0 0 0.25rem rgba(0, 0, 0, 0.1);
}
.expanded-horizontal-stack {
  display: flex;
  flex-direction: row;
  gap: 0.75rem;
  margin-top: 0.5rem;
  margin-left: 1.5rem;
}
</style>