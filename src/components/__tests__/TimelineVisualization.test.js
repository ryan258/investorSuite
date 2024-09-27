// src/components/__tests__/TimelineVisualization.test.js

import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import TimelineVisualization from '../TimelineVisualization.vue'

describe('TimelineVisualization', () => {
  const mockEvents = [
    { title: 'Event 1', date: '2025', description: 'Description 1' },
    { title: 'Event 2', date: '2028', description: 'Description 2' },
  ]

  it('renders properly', () => {
    const wrapper = mount(TimelineVisualization, {
      props: {
        title: 'Test Timeline',
        events: mockEvents,
      },
    })

    expect(wrapper.text()).toContain('Test Timeline')
    expect(wrapper.text()).toContain('Event 1')
    expect(wrapper.text()).toContain('Event 2')
    expect(wrapper.text()).toContain('2025')
    expect(wrapper.text()).toContain('2028')
    expect(wrapper.text()).toContain('Description 1')
    expect(wrapper.text()).toContain('Description 2')
  })

  it('renders correct number of events', () => {
    const wrapper = mount(TimelineVisualization, {
      props: {
        title: 'Test Timeline',
        events: mockEvents,
      },
    })

    const eventElements = wrapper.findAll('.timeline-event')
    expect(eventElements.length).toBe(mockEvents.length)
  })
})