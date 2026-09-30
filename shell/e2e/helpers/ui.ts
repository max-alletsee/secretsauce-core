import { expect, type Page } from '@playwright/test'

export async function chooseMember(page: Page, name: string) {
  await page.getByRole('combobox', { name: 'Current member', exact: true }).click()
  await page.getByRole('option', { name, exact: true }).click()
}

export async function login(page: Page) {
  await page.goto('/login')
  await page.locator('input[type=password]').fill('secretpassphrase')
  await page.locator('button[type=submit]').click()
  await expect(page).toHaveURL(/\/(timeline|recipes)$/)
}
