import { test, expect } from './helpers/state'
import type { Locator } from '@playwright/test'
import { login } from './helpers/ui'
import { spawn, execFileSync } from 'node:child_process'
import { once } from 'node:events'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

test.use({actionTimeout:5000})
const themes=['aura-tomato','nora-tomato','material-indigo','lara-amber']

test('fresh household setup is accessible and themed without touching the seeded browser server',async({page},testInfo)=>{
  test.setTimeout(90000)
  const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..')
  const directory=await mkdtemp(path.join(tmpdir(),'ss-ui-setup-smoke-'))
  const script='import sys, uvicorn; from secretsauce.app import build_app; uvicorn.run(build_app(data_dir=sys.argv[1]), host="127.0.0.1", port=0)'
  const server=spawn('uv',['run','python','-c',script,directory],{cwd:root,detached:process.platform!=='win32'})
  let url='',diagnostic=''
  server.on('error',error=>{diagnostic+=error.message})
  server.stderr.on('data',data=>{diagnostic+=data.toString();url=diagnostic.match(/Uvicorn running on (http:\/\/127\.0\.0\.1:\d+)/)?.[1]||''})
  try {
    await expect.poll(()=>url,{message:'Fresh setup server did not announce its URL',timeout:15000}).not.toBe('')
    await page.setViewportSize({width:390,height:844})
    const errors:string[]=[]
    page.on('pageerror',error=>errors.push(error.message))
    page.on('console',message=>{if(message.type()==='error')errors.push(message.text())})
    for(const theme of themes){
      await page.goto(url+'/setup')
      await page.evaluate(id=>localStorage.setItem('ss-theme',id),theme)
      await page.reload()
      await page.getByLabel('Household Name',{exact:true}).fill('Smoke household')
      await page.getByLabel('Household Passphrase',{exact:true}).fill('setup-smoke-passphrase')
      await page.getByLabel('Your Name',{exact:true}).fill('Sam')
      await expect(page.getByLabel('Language',{exact:true})).toBeVisible()
      expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(390)
      expect(errors).toEqual([])
      await page.screenshot({path:testInfo.outputPath(`${theme}-390-setup.png`),fullPage:true,animations:'disabled'})
    }
    await page.getByRole('button',{name:'Complete Setup',exact:true}).click()
    await expect(page).toHaveURL(/\/timeline$/)
    await expect(page.locator('.day-card.is-today')).toBeVisible()
    expect(errors).toEqual([])
  } finally {
    if(server.pid&&server.exitCode===null){
      const exited=once(server,'exit')
      if(process.platform==='win32')execFileSync('taskkill',['/PID',String(server.pid),'/T','/F'])
      else process.kill(-server.pid,'SIGTERM')
      await exited
    }
    await rm(directory,{recursive:true,force:true})
  }
})
for(const theme of themes) for(const width of [390,1280]) {
  test(`all_main_screens_render_in_each_theme_without_runtime_errors ${theme} ${width}`,async({page,request},testInfo)=>{
    // This is a multi-screen flow with screenshot I/O, not a relaxed assertion.
    test.setTimeout(120000)
    await page.setViewportSize({width,height:844})
    await page.addInitScript(id=>localStorage.setItem('ss-theme',id),theme)
    const pageErrors:string[]=[],authenticatedConsoleErrors:string[]=[]
    let authenticated=false
    page.on('pageerror',error=>pageErrors.push(error.message))
    page.on('console',message=>{
      if(message.type()!=='error')return
      if(!authenticated&&message.location().url.includes('/api/auth/session')&&message.text().includes('401'))return
      authenticatedConsoleErrors.push(`${message.location().url}: ${message.text()}`)
    })
    async function capture(screen:string,ready:Locator){
      await expect(ready).toBeVisible()
      const dimensions=await page.evaluate(()=>({scrollWidth:document.documentElement.scrollWidth,viewportWidth:window.innerWidth}))
      expect(dimensions.scrollWidth,screen).toBeLessThanOrEqual(dimensions.viewportWidth)
      const content=page.locator('.ss-content')
      if(await content.count()) {
        const overflow=await content.evaluate(element=>element.scrollWidth-element.clientWidth)
        if(overflow>1)console.log(await content.evaluate(root=>Array.from(root.querySelectorAll('*')).map(element=>({tag:element.tagName,cls:element.className,right:element.getBoundingClientRect().right,width:element.getBoundingClientRect().width})).filter(row=>row.right>root.getBoundingClientRect().right+1).slice(0,15)))
        expect(overflow,`${screen}: inner content overflow`).toBeLessThanOrEqual(1)
      }
      expect(pageErrors,screen).toEqual([])
      expect(authenticatedConsoleErrors,screen).toEqual([])
      await page.screenshot({path:testInfo.outputPath(`${theme}-${width}-${screen}.png`),fullPage:true,animations:'disabled'})
    }
    await page.goto('/login')
    await capture('login',page.getByRole('button',{name:'Log In',exact:true}))
    await login(page);authenticated=true
    if(width<768)await expect(page.locator('.ss-main-container > .desktop-navigation')).not.toBeVisible()
    const response=await request.post('/api/recipes',{data:{language:'en',title:'Theme smoke lentil soup',description:'A nourishing weeknight meal for the household.',servings:4,ingredients:[{name:'Lentils',quantity:200,unit:'g'}],steps:[{instruction:'Simmer until tender.',timer_minutes:20}]}})
    expect(response.status()).toBe(201)
    const recipe=await response.json()
    await page.goto('/recipes')
    await expect(page.getByRole('button',{name:recipe.title,exact:true})).toBeVisible()
    await capture('recipes',page.getByRole('button',{name:'New recipe',exact:true}))
    await page.getByRole('button',{name:'New recipe',exact:true}).click()
    await page.getByRole('menuitem',{name:'Import with AI…',exact:true}).click()
    await capture('import',page.getByRole('dialog').getByRole('button',{name:'Extract recipe',exact:true}))
    await page.getByRole('dialog').getByRole('tab',{name:'Paste text',exact:true}).click()
    await page.getByRole('dialog').getByLabel('Recipe text',{exact:true}).fill('Chickpeas and lemon, simmer for ten minutes.')
    await page.getByRole('dialog').getByRole('button',{name:'Extract recipe',exact:true}).click()
    await capture('import-preview',page.getByRole('dialog').getByRole('button',{name:'Save recipe',exact:true}))
    await page.getByRole('dialog').getByRole('button',{name:'Close',exact:true}).click()
    await page.goto(`/recipes/${recipe.id}`)
    await capture('recipe-detail',page.getByRole('heading',{name:recipe.title,exact:true}))
    await page.goto(`/recipes/${recipe.id}/edit`)
    await capture('recipe-editor',page.getByRole('button',{name:'Save Recipe',exact:true}))
    await page.goto('/timeline')
    const today=page.locator('.day-card.is-today')
    await expect(today).toBeVisible()
    await capture('timeline',page.getByRole('button',{name:'Today',exact:true}))
    const dayActions=today.getByRole('button',{name:'Day actions',exact:true})
    await dayActions.scrollIntoViewIfNeeded();await dayActions.click()
    await page.getByRole('menuitem',{name:'Add slot for this day',exact:true}).click()
    await capture('add-slot',page.getByRole('dialog').getByLabel('Slot name',{exact:true}))
    await page.getByRole('dialog').getByRole('button',{name:'Close',exact:true}).click()
    const add=today.getByRole('button',{name:'Add meal',exact:true}).first()
    await add.scrollIntoViewIfNeeded();await add.click()
    await capture('add-meal',page.getByRole('dialog').getByLabel('Search recipes',{exact:true}))
    await page.getByRole('dialog').getByRole('tab',{name:'Note',exact:true}).click()
    await capture('add-note',page.getByRole('dialog').getByLabel('Note title',{exact:true}))
    await page.getByRole('dialog').getByRole('button',{name:'Close',exact:true}).click()
    const logged=await request.post('/api/journal',{data:{date:new Date().toLocaleDateString('en-CA'),meal_type:'dinner',recipe_id:recipe.id,status:'cooked',servings_cooked:4}})
    expect(logged.status()).toBe(201)
    await page.goto('/journal')
    await capture('journal',page.locator('.journal-entry-card').filter({hasText:recipe.title}))
    await page.goto('/shopping-list')
    await capture('shopping',page.getByLabel('Extra item name',{exact:true}))
    await page.goto('/settings')
    await capture('settings',page.getByRole('button',{name:'Save household',exact:true}))
    await page.goto('/settings?section=members')
    await page.locator('.member-card').first().getByRole('button',{name:/^Edit /}).click()
    await capture('member-edit',page.getByRole('dialog').getByLabel('Portion size',{exact:true}))
    await page.getByRole('dialog').getByRole('button',{name:'Close',exact:true}).click()
    await page.goto('/settings?section=core-recurring')
    await page.getByRole('button',{name:'Add recurring meal',exact:true}).click()
    await capture('recurring-form',page.getByRole('dialog').getByLabel('Weekday',{exact:true}))
    await page.getByRole('dialog').getByRole('button',{name:'Close',exact:true}).click()
    expect(pageErrors).toEqual([]);expect(authenticatedConsoleErrors).toEqual([])
  })
}
