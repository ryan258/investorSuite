// src/__tests__/App.test.js

import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import App from '../App.vue'
import TimelineVisualization from '../components/TimelineVisualization.vue'

describe('App', () => {
  it('renders TimelineVisualization component', () => {
    const wrapper = mount(App, {
      global: {
        stubs: {
          TimelineVisualization: true
        }
      }
    })
    expect(wrapper.findComponent({ name: 'TimelineVisualization' }).exists()).toBe(true)
  })

  it('passes correct props to TimelineVisualization', () => {
    const wrapper = mount(App, {
      global: {
        stubs: {
          TimelineVisualization: true
        }
      }
    })
    const timelineComponent = wrapper.findComponent({ name: 'TimelineVisualization' })
    expect(timelineComponent.props('title')).toBe('AI Development Timeline')
    expect(Array.isArray(timelineComponent.props('events'))).toBe(true)
    expect(timelineComponent.props('events')).toHaveLength(2)
  })
})