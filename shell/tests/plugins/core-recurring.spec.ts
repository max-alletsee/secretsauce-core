import { it, expect, vi, afterEach } from 'vitest'
import { flushPromises, type VueWrapper } from '@vue/test-utils'
import activate from '../../../secretsauce/plugins/core/core-recurring/ui/src/index'
import { registeredRoute, clickButton, savedRecipe } from '../helpers/registeredPlugin'
import { pluginHarness } from '../helpers/pluginHarness'
import activateTimeline from '../../../secretsauce/plugins/core/core-timeline/ui/src/index'
const wrappers:VueWrapper[]=[]
afterEach(()=>{wrappers.splice(0).forEach(w=>w.unmount());document.body.innerHTML=''})

it.each([['2026-09-28',0,'Monday'],['2026-10-04',6,'Sunday']])('repeat_weekly_converts_javascript_weekdays for %s', async (date,weekday,name)=>{
  const posts:any[]=[]
  const api={get:async()=>[],post:async(path:string,body:any)=>{posts.push([path,body]);return {id:'rule',...body,recipe_title:'Cake',created:2}}}
  const harness=pluginHarness(api as any)
  activateTimeline(harness.ss('core-timeline'));activate(harness.ss('core-recurring'))
  harness.householdStore.household.meal_types=[{id:'dinner',label:'Dinner'}]
  const provider=harness.intents.getProviders('entry:interact').find(provider=>provider.id==='repeat-weekly')!
  const context={entry:{id:'entry',date,meal_type:'Dinner',recipe_id:'cake_en',origin:'manual'}}
  expect(provider.titleFor!(context)).toBe(`Repeat every ${name}`)
  expect(provider.isAvailable!(context)).toBe(true)
  await provider.execute!(context)
  expect(posts).toEqual([['/api/x/core-recurring/rules',{weekday,meal_type:'dinner',recipe_id:'cake_en'}]])
  expect(harness.notifications).toContainEqual({level:'success',message:`Repeating every ${name}`})
  expect(provider.isAvailable!({entry:{date,meal_type:'dinner',recipe_id:null,origin:'manual'}})).toBe(false)
  expect(provider.isAvailable!({entry:{date,meal_type:'dinner',recipe_id:'cake_en',origin:'plugin:core-recurring'}})).toBe(false)
})

it('maps all seven JavaScript weekdays to the literal Python order', async()=>{
  const {pythonWeekday}=await import('../../../secretsauce/plugins/core/core-recurring/ui/src/weekday')
  expect([0,1,2,3,4,5,6].map(pythonWeekday)).toEqual([6,0,1,2,3,4,5])
})

it('creates a rule through the owning Settings dialog and retains a rejected draft', async()=>{
  let reject=true
  const rules:any[]=[]
  const calls:any[]=[]
  const api={get:async(path:string,query:any)=>{
    if(path==='/api/x/core-recurring/rules')return [...rules]
    if(path==='/api/recipes'){expect(query).toEqual({q:'Chocolate'});return {items:[savedRecipe],total:1,limit:50,offset:0}}
    throw new Error(`Unexpected GET ${path}`)
  },post:async(path:string,body:any)=>{
    calls.push([path,body]);if(reject)throw new Error('Could not save rule')
    const rule={id:'new-rule',...body,recipe_title:savedRecipe.title,created:2,created_at:'2026-09-28T12:00:00Z'};rules.push(rule);return rule
  }}
  const {wrapper,harness}=await registeredRoute(activate,'core-recurring',api,'/settings')
  harness.householdStore.household.meal_types=[{id:'dinner',label:'Dinner'}]
  wrappers.push(wrapper)
  await clickButton('Add recurring meal')
  const input=document.querySelector<HTMLInputElement>('#recurring-recipe')!
  input.value='Chocolate';input.dispatchEvent(new Event('input'))
  await vi.waitFor(()=>expect(document.querySelector('[role=listbox]')?.textContent).toContain('Chocolate cake'))
  document.querySelector<HTMLElement>('[role=option]')!.click();await flushPromises()
  await clickButton('Add recurring meal',document.querySelector('[role=dialog]')!)
  expect(document.querySelector('[role=dialog]')?.textContent).toContain('Could not save rule')
  expect(document.querySelector<HTMLInputElement>('#recurring-recipe')?.value).toBe('Chocolate cake')
  reject=false
  await clickButton('Add recurring meal',document.querySelector('[role=dialog]')!)
  expect(document.querySelector('[role=dialog]')).toBeNull()
  expect(wrapper.text()).toContain('Every Monday · Dinner · Chocolate cake')
  expect(calls).toEqual([
    ['/api/x/core-recurring/rules',{weekday:0,meal_type:'dinner',recipe_id:'cake_en'}],
    ['/api/x/core-recurring/rules',{weekday:0,meal_type:'dinner',recipe_id:'cake_en'}],
  ])
})
