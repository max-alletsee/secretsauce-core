import { test, expect } from './helpers/state'
import { login } from './helpers/ui'

test('ingredient checkboxes and labels toggle only their own row without ingredient IDs', async ({ page, request }) => {
  await login(page)
  const response = await request.post('/api/recipes', { data: {
    title: 'Independent ingredient checklist', language: 'en', servings: 2,
    ingredients: [
      { name: 'Flour', quantity: 200, unit: 'g' },
      { name: 'Sugar', quantity: 100, unit: 'g' },
      { name: 'Flour', quantity: 20, unit: 'g', notes: 'for dusting' },
    ],
  } })
  expect(response.status()).toBe(201)
  const recipe = await response.json()
  await page.goto(`/recipes/${recipe.id}`)
  const rows = page.locator('.ingredient-item')
  const checkboxes = rows.getByRole('checkbox')
  await expect(checkboxes).toHaveCount(3)
  await checkboxes.nth(0).check()
  await expect(checkboxes.nth(0)).toBeChecked()
  await expect(checkboxes.nth(1)).not.toBeChecked()
  await expect(checkboxes.nth(2)).not.toBeChecked()
  await expect(rows.nth(0).locator('label')).toHaveClass(/struck/)
  await expect(rows.nth(1).locator('label')).not.toHaveClass(/struck/)
  await expect(rows.nth(2).locator('label')).not.toHaveClass(/struck/)

  // Labels must target their own input, including repeated ingredient names.
  await rows.nth(2).locator('label').click()
  await expect(checkboxes.nth(2)).toBeChecked()
  await expect(checkboxes.nth(1)).not.toBeChecked()
  await rows.nth(0).locator('label').click()
  await expect(checkboxes.nth(0)).not.toBeChecked()
  await expect(checkboxes.nth(2)).toBeChecked()
  await page.getByRole('button', { name: 'Increase servings', exact: true }).click()
  await expect(checkboxes.nth(2)).toBeChecked()
  await page.reload()
  await expect(checkboxes).toHaveCount(3)
  for (const checkbox of await checkboxes.all()) await expect(checkbox).not.toBeChecked()
})

const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/lS0AAAAASUVORK5CYII=','base64')

test('cover upload belongs to the recipe group and survives editor list and detail reloads',async({page,request})=>{
  await login(page)
  const response=await request.post('/api/recipes',{data:{title:'Recipe with a cover',language:'en'}})
  expect(response.status()).toBe(201)
  const recipe=await response.json()
  let assetId:string|undefined
  try {
    await page.goto(`/recipes/${recipe.id}/edit`)
    await expect(page.getByLabel('Title',{exact:true})).toHaveValue(recipe.title)
    await expect(page.getByLabel('Cover image',{exact:true})).toBeEnabled()
    const uploaded=page.waitForResponse(response=>response.url().endsWith('/api/assets')&&response.request().method()==='POST')
    await page.getByLabel('Cover image',{exact:true}).setInputFiles({name:'cover.png',mimeType:'image/png',buffer:png})
    const result=await uploaded
    expect(result.status(),await result.text()).toBe(201)
    const asset=await result.json();assetId=asset.id
    expect(asset).toMatchObject({entity_type:'recipe',entity_id:recipe.group_id,slot:'cover'})
    await expect(page.getByAltText('Recipe cover',{exact:true})).toHaveAttribute('src',`/api/assets/${assetId}/file`)
    await page.reload()
    await expect(page.getByAltText('Recipe cover',{exact:true})).toHaveAttribute('src',`/api/assets/${assetId}/file`)
    await page.goto(`/recipes/${recipe.id}`)
    const detail=page.locator('.recipe-detail-page img')
    await expect(detail).toHaveAttribute('src',`/api/assets/${assetId}/file`)
    await expect.poll(()=>detail.evaluate((image:HTMLImageElement)=>image.complete&&image.naturalWidth>0)).toBe(true)
    await page.goto('/recipes')
    const card=page.locator('.recipe-card').filter({hasText:recipe.title})
    await expect(card.locator('img')).toHaveAttribute('src',`/api/assets/${assetId}/file`)
    // Covers are independent immediate uploads, not an imagined Recipe PATCH field.
    expect((await (await request.get(`/api/assets?entity_type=recipe&entity_id=${recipe.group_id}`)).json()).map((row:any)=>row.id)).toEqual([assetId])
    expect((await request.delete(`/api/recipes/${recipe.id}?revision=${recipe.revision}`)).status()).toBe(204)
    expect((await request.get(`/api/assets/${assetId}`)).status()).toBe(404)
    assetId=undefined // Recipe-group deletion owns metadata cleanup; normal asset GC owns orphan files.
  } finally {
    if(assetId)expect((await request.delete(`/api/assets/${assetId}`)).status()).toBe(204)
  }
})

test('unsaved recipe explains that a cover requires a saved recipe group',async({page})=>{
  await login(page);await page.goto('/recipes/new')
  await expect(page.getByLabel('Cover image',{exact:true})).toBeDisabled()
  await expect(page.locator('.recipe-edit-page')).toContainText('Save your recipe first to add a cover image')
})

test('failed cover upload retains the edited fields without changing the recipe',async({page,request})=>{
  await login(page)
  const response=await request.post('/api/recipes',{data:{title:'Cover failure draft',language:'en'}})
  expect(response.status()).toBe(201)
  const recipe=await response.json()
  await page.goto(`/recipes/${recipe.id}/edit`)
  await expect(page.getByLabel('Title',{exact:true})).toHaveValue(recipe.title)
  await page.getByLabel('Title',{exact:true}).fill('Still an unsaved title')
  await expect(page.getByLabel('Cover image',{exact:true})).toBeEnabled()
  const uploaded=page.waitForResponse(response=>response.url().endsWith('/api/assets')&&response.request().method()==='POST')
  await page.getByLabel('Cover image',{exact:true}).setInputFiles({name:'bad.png',mimeType:'image/png',buffer:Buffer.from('not an image')})
  expect((await uploaded).status()).toBe(422)
  await expect(page.locator('.recipe-edit-page .p-message')).toBeVisible()
  await expect(page.getByLabel('Title',{exact:true})).toHaveValue('Still an unsaved title')
  expect((await (await request.get(`/api/recipes/${recipe.id}`)).json()).title).toBe(recipe.title)
  expect(await (await request.get(`/api/assets?entity_type=recipe&entity_id=${recipe.group_id}`)).json()).toEqual([])
})
