import asyncio
import sys, os
sys.path.insert(0, os.path.dirname(__file__))
from playwright import async_api
from playwright.async_api import expect
from test_config import CLUB_LOGIN_URL, CLUB_EMAIL, CLUB_PASSWORD, DEFAULT_TIMEOUT, LOGIN_SLEEP, NAV_SLEEP, BASE_URL

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
        context.set_default_timeout(DEFAULT_TIMEOUT)

        page = await context.new_page()

        # Login as club owner
        await page.goto(CLUB_LOGIN_URL)
        await asyncio.sleep(2)
        await page.locator('input[type="email"]').first.fill(CLUB_EMAIL)
        await page.locator('input[type="password"]').first.fill(CLUB_PASSWORD)
        await page.locator('button[type="submit"]').click()
        await asyncio.sleep(LOGIN_SLEEP)

        # Navigate to events manager
        await page.goto(f"{BASE_URL}/events-manager")
        await asyncio.sleep(NAV_SLEEP)

        # Assertions
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
