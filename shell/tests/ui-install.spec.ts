import { afterEach, describe, expect, it } from 'vitest'
import { defineComponent } from 'vue'
import { flushPromises } from '@vue/test-utils'
import { mountWithUi } from './helpers/mountWithUi'
import { pluginHarness } from './helpers/pluginHarness'

const api: any = { get: async () => [], post: async () => ({}), patch: async () => ({}), put: async () => ({}), delete: async () => {} }
afterEach(() => { document.body.innerHTML = '' })

describe('production UI installation', () => {
  it('resolves the full reserved plugin component set without warnings', () => {
    const warnings: string[] = []
    const wrapper = mountWithUi(defineComponent({ template: `<div>
      <Button/><SplitButton/><Menu/><Dialog/><ConfirmDialog/><Drawer/>
      <Accordion><AccordionPanel value="1"><AccordionHeader>Section</AccordionHeader><AccordionContent/></AccordionPanel></Accordion>
      <Tabs value="1"><TabList><Tab value="1">Tab</Tab></TabList><TabPanels><TabPanel value="1"/></TabPanels></Tabs>
      <InputText/><Textarea/><InputNumber/><Select/><SelectButton/><MultiSelect/><AutoComplete/>
      <ToggleSwitch/><Checkbox/><IconField><InputIcon/></IconField><Tag/><Avatar/>
      <Message/><ProgressSpinner/><Card/><Divider/>
    </div>` }), { global: { config: { warnHandler: message => warnings.push(message) } } })
    expect(warnings).toEqual([])
    expect(wrapper.find('button').exists()).toBe(true)
    wrapper.unmount()
  })
  it('renders and runs a globally registered Button', async () => {
    const wrapper = mountWithUi(defineComponent({ data: () => ({ count: 0 }), template: '<Button label="Add" @click="count++"/><span>{{ count }}</span>' }))
    await wrapper.get('button').trigger('click')
    expect(wrapper.get('span:last-child').text()).toBe('1')
    wrapper.unmount()
  })

  it.each(['Proceed', 'Cancel', 'Close'])('confirmation settles on %s through the real dialog', async (action) => {
    const ss = pluginHarness(api).ss('example')
    const wrapper = mountWithUi(defineComponent({ template: '<ConfirmDialog />' }), { attachTo: document.body })
    const result = ss.confirm?.({ header: 'Delete?', message: 'Remove the meal?', acceptLabel: 'Proceed', rejectLabel: 'Cancel' })
    await flushPromises()
    expect(document.body.textContent).toContain('Remove the meal?')
    const button = Array.from(document.querySelectorAll('button')).find(b => action === 'Close' ? b.getAttribute('aria-label') === 'Close' : b.textContent?.trim() === action)
    expect(button).toBeDefined()
    button!.click()
    await flushPromises()
    expect(await result).toBe(action === 'Proceed')
    wrapper.unmount()
  })
})
