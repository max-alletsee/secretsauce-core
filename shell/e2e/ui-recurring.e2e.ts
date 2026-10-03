import { test, expect } from './helpers/state'
import { login } from './helpers/ui'
function localDay(offset=0) { const d=new Date(); d.setDate(d.getDate()+offset); return d.toLocaleDateString('en-CA') }
const names=['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday']

test('repeat_provider_schedules_the_same_recipe_seven_days_later', async ({page, request}) => {
  await login(page)
  const result=await request.post('/api/recipes',{data:{title:'Weekly browser lentil soup',language:'en'}})
  expect(result.status()).toBe(201)
  const recipe=await result.json()
  const response=await request.post('/api/schedule',{data:{date:localDay(),meal_type:'dinner',recipe_id:recipe.id}})
  expect(response.status()).toBe(201)
  const original=await response.json()
  let ruleId:string|undefined
  try {
    await page.goto('/timeline')
    const card=page.locator('.day-card.is-today .schedule-card').filter({hasText:recipe.title})
    await expect(card).toBeVisible(); await card.scrollIntoViewIfNeeded(); await card.click()
    const created = page.waitForResponse(response => response.url().endsWith('/api/x/core-recurring/rules') && response.request().method()==='POST')
    await page.getByRole('menuitem',{name:`Repeat every ${names[new Date().getDay()]}`,exact:true}).click()
    expect((await created).ok()).toBe(true)
    const rule=(await (await request.get('/api/x/core-recurring/rules')).json()).find((row:any)=>row.recipe_id===recipe.id)
    expect(rule).toBeTruthy(); ruleId=rule.id
    expect(rule.weekday).toBe((new Date().getDay()+6)%7)
    await page.getByRole('button',{name:'Show 5 more days',exact:true}).click()
    const repeated=page.locator(`.day-card[data-timeline-date="${localDay(7)}"] .schedule-card`).filter({hasText:recipe.title})
    await expect(repeated).toBeVisible()
    await repeated.locator('.pi-replay').hover()
    await expect(page.getByRole('tooltip')).toContainText(`Repeats every ${names[new Date().getDay()]}`)
    const future=(await (await request.get(`/api/schedule?from=${localDay(7)}&to=${localDay(7)}`)).json()).find((row:any)=>row.recipe_id===recipe.id)
    expect(future.origin).toBe('plugin:core-recurring')
    await repeated.scrollIntoViewIfNeeded(); await repeated.click()
    await expect(page.getByRole('menuitem',{name:/^Repeat every /})).toHaveCount(0)
    await page.keyboard.press('Escape')
    await page.getByRole('link',{name:'Settings',exact:true}).first().click()
    await page.locator('#settings-core-recurring').getByRole('button',{name:'Recurring Meals',exact:true}).click()
    const row=page.locator('.recurring-settings li').filter({hasText:recipe.title})
    await row.getByRole('button',{name:'Delete',exact:true}).click()
    await expect(row).toHaveCount(0)
    expect((await request.get(`/api/schedule/${future.id}`)).status()).toBe(404)
    expect((await request.get(`/api/schedule/${original.id}`)).status()).toBe(200)
  } finally { if(ruleId) await request.delete(`/api/x/core-recurring/rules/${ruleId}`) }
})

test('Settings creates a recurring meal from weekday slot and recipe search', async ({page,request})=>{
  await login(page)
  const result=await request.post('/api/recipes',{data:{title:'Settings weekly pasta',language:'en'}})
  expect(result.status()).toBe(201)
  const recipe=await result.json()
  let ruleId:string|undefined
  try {
    await page.goto('/settings?section=core-recurring')
    const section=page.locator('#settings-core-recurring')
    await expect(section).toContainText('A recurring meal is planned automatically on the same weekday every week, 14 days ahead.')
    await expect(section.getByRole('button',{name:'Materialize Now',exact:true})).toHaveCount(0)
    await section.getByRole('button',{name:'Add recurring meal',exact:true}).click()
    const dialog=page.getByRole('dialog')
    await dialog.getByLabel('Weekday',{exact:true}).click()
    await page.getByRole('option',{name:'Monday',exact:true}).click()
    await dialog.getByLabel('Meal slot',{exact:true}).click()
    await page.getByRole('option',{name:'Dinner',exact:true}).click()
    await dialog.getByLabel('Recipe',{exact:true}).fill('Settings weekly')
    await page.getByRole('option',{name:'Settings weekly pasta',exact:true}).click()
    await dialog.getByRole('button',{name:'Add recurring meal',exact:true}).click()
    await expect(dialog).not.toBeVisible()
    await expect(section).toContainText('Every Monday · Dinner · Settings weekly pasta')
    const rule=(await (await request.get('/api/x/core-recurring/rules')).json()).find((row:any)=>row.recipe_id===recipe.id)
    ruleId=rule.id
    expect(rule.weekday).toBe(0); expect(rule.meal_type).toBe('dinner')
    const meals=(await (await request.get(`/api/schedule?from=${localDay()}&to=${localDay(13)}`)).json()).filter((row:any)=>row.recipe_id===recipe.id)
    expect(meals).toHaveLength(2)
  } finally { if(ruleId) await request.delete(`/api/x/core-recurring/rules/${ruleId}`) }
})
