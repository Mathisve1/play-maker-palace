import asyncio
from playwright import async_api
from playwright.async_api import expect

async def run_test():
    pw = None
    browser = None
    context = None

    try:
        pw = await async_api.async_playwright().start()

        browser = await pw.chromium.launch(
            headless=True,
            args=[
                "--window-size=1280,720",
                "--disable-dev-shm-usage",
                "--ipc=host",
                "--single-process"
            ],
        )

        context = await browser.new_context()
        context.set_default_timeout(10000)

        page = await context.new_page()

        # Login as club owner via club login
        await page.goto("http://localhost:4173/club-login")
        await asyncio.sleep(2)
        await page.locator('input[type="email"]').first.fill('mathis@gmail.clm')
        await page.locator('input[type="password"]').first.fill('mathis123')
        await page.locator('button[type="submit"]').click()
        await asyncio.sleep(5)

        # Navigate directly to the events manager (correct route)
        await page.goto("http://localhost:4173/events-manager")
        await asyncio.sleep(3)

        # --> Assertions to verify final state
        frame = context.pages[-1]
        current_url = await frame.evaluate("() => window.location.href")
        assert '/events-manager' in current_url
        assert await frame.locator("xpath=//*[contains(., 'Name')]").nth(0).is_visible(), "Expected 'Name' to be visible"
        assert await frame.locator("xpath=//*[contains(., 'required')]").nth(0).is_visible(), "Expected 'required' to be visible"
        await asyncio.sleep(5)

    finally:
        if context:
            await context.close()
        if browser:
            await browser.close()
        if pw:
            await pw.stop()

asyncio.run(run_test())
