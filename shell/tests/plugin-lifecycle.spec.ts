import { it, expect, vi } from 'vitest'
import { createStreamClient } from '../src/stream'
import { createPluginLoader } from '../src/registries/plugins'
import { pluginHarness } from './helpers/pluginHarness'
class EventSourceDouble {
  static current: EventSourceDouble
  handlers = new Map<string, ((event: MessageEvent) => void)[]>()
  constructor(public url: string) { EventSourceDouble.current = this }
  addEventListener(name: string, handler: (event: MessageEvent) => void) { this.handlers.set(name, [...(this.handlers.get(name) || []), handler]) }
  frame(name: string, data: any) { for (const handler of this.handlers.get(name) || []) handler({data: JSON.stringify(data),lastEventId: data.seq?.toString() || ''} as MessageEvent) }
  close() {}
}
it('deactivation and reactivation do not orphan or duplicate plugin subscriptions', async () => {
  const previous = globalThis.EventSource
  globalThis.EventSource = EventSourceDouble as any
  const stream = createStreamClient('/api/events/stream','boot',async()=>{})
  try {
    const harness = pluginHarness({} as any)
    harness.stream.on = stream.on
    let delivered = 0, fail = false
    const diagnostic = vi.spyOn(console, 'error').mockImplementation(() => {})
    const loader = createPluginLoader({...harness,makeSecretSauceUI:harness.ss,importModule:async()=>({default:(ss:any)=>{
      ss.on('timeline:created',()=>{delivered++})
      if (fail) throw new Error('Activation failed after subscribing')
    }})})
    const plugin = {id:'timeline',ui_entry:'/timeline.js',name:'Timeline'}
    await loader.activatePlugin(plugin); stream.connect()
    EventSourceDouble.current.frame('hello',{kind:'hello',boot_id:'boot',seq:0})
    EventSourceDouble.current.frame('event',{kind:'event',name:'timeline:created',seq:1})
    expect(delivered).toBe(1)
    loader.deactivatePlugin('timeline')
    EventSourceDouble.current.frame('event',{kind:'event',name:'timeline:created',seq:2})
    expect(delivered).toBe(1)
    await loader.activatePlugin(plugin)
    EventSourceDouble.current.frame('event',{kind:'event',name:'timeline:created',seq:3})
    expect(delivered).toBe(2)
    loader.deactivatePlugin('timeline'); fail = true
    await loader.activatePlugin(plugin)
    EventSourceDouble.current.frame('event',{kind:'event',name:'timeline:created',seq:4})
    expect(delivered).toBe(2)
    expect(loader.loadedPlugins.has('timeline')).toBe(false)
    expect(diagnostic).toHaveBeenCalledWith('Failed to activate plugin timeline:', expect.any(Error))
    diagnostic.mockRestore()
  } finally { stream.disconnect(); globalThis.EventSource=previous }
})
