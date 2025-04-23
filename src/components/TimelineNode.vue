<template>
  <div class="timeline-event relative">
    <div class="timeline-point"></div>
    <div class="timeline-content">
      <h3 class="text-lg font-semibold">{{ event.title }}</h3>
      <p class="text-sm text-gray-600">{{ event.date }}</p>
      <p>{{ event.description }}</p>
      <button class="mt-2 px-3 py-1 bg-blue-100 hover:bg-blue-200 rounded text-blue-700 text-xs font-semibold" @click="handleExpand">🔎 Expand</button>
    </div>
    <div v-if="isExpanded" class="expanded-horizontal-stack flex flex-row gap-3 mt-2 ml-6">
      <div v-if="expanding" class="text-xs text-gray-400">Loading...</div>
      <template v-else>
        <TimelineNode
          v-for="(child, idx) in children"
          :key="idx"
          :event="child"
          :index="idx"
          :expanded-nodes="childrenExpanded"
          @expand-node="handleExpandChild"
          @expand-node-recursive="handleExpandChild"
        />
      </template>
    </div>
  </div>
</template>

<script>
export default {
  name: 'TimelineNode',
  props: {
    event: Object,
    index: Number,
    expandedNodes: Object
  },
  emits: ['expand-node', 'expand-node-recursive'],
  methods: {
    handleExpand() {
      this.$emit('expand-node', { event: this.event, index: this.index });
    },
    handleExpandChild(payload) {
      this.$emit('expand-node-recursive', {
        ...payload,
        parentPath: [this.index, ...(payload.parentPath || [])]
      });
    }
  },
  computed: {
    isExpanded() {
      return !!this.expandedNodes[this.index];
    },
    children() {
      return this.expandedNodes[this.index]?.children || [];
    },
    expanding() {
      return this.expandedNodes[this.index]?.expanding || false;
    },
    childrenExpanded() {
      return this.expandedNodes[this.index]?.childrenExpanded || {};
    }
  }
};
</script>

<style scoped>
.timeline-event {
  position: relative;
  margin-bottom: 2rem;
  margin-left: 1.5rem;
}
.timeline-point {
  position: absolute;
  width: 1rem;
  height: 1rem;
  background: #3b82f6;
  border-radius: 9999px;
  left: -0.5rem;
  margin-top: 0.25rem;
}
.timeline-content {
  background: white;
  padding: 1rem;
  border-radius: 0.5rem;
  box-shadow: 0 1px 3px rgba(0,0,0,0.05);
}
.expanded-horizontal-stack {
  display: flex;
  flex-direction: row;
  gap: 0.75rem;
  margin-top: 0.5rem;
  margin-left: 1.5rem;
}
</style>
