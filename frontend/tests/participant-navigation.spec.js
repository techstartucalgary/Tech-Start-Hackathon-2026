const { test, expect } = require('@playwright/test');

const routes = [
  ['/dashboard', 'Dashboard'],
  ['/find-a-team', 'Find a team'],
  ['/my-team', 'My team'],
  ['/event-logistics', 'Event logistics'],
  ['/participant-guide', 'Participant guide'],
];

async function expectCurrentPage(page, path, label) {
  await expect(page).toHaveURL(new RegExp(`${path}$`));
  await expect(
    page.getByRole('heading', { name: label, exact: true }),
  ).toBeVisible();
  await expect(page).toHaveTitle(`${label} | Tech Start`);
}

for (const [path, label] of routes) {
  test(`desktop links to ${label} and preserves the highlight on reload`, async ({
    page,
  }) => {
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto('/find-a-team');
    const nav = page.getByRole('navigation', { name: 'Main navigation' });
    await expect(
      nav.getByRole('link', { name: 'Find a team', exact: true }),
    ).toHaveAttribute('aria-current', 'page');
    await nav.getByRole('link', { name: label, exact: true }).click();
    await expectCurrentPage(page, path, label);
    await expect(nav.locator('[aria-current="page"]')).toHaveCount(1);
    await expect(
      nav.getByRole('link', { name: label, exact: true }),
    ).toHaveAttribute('aria-current', 'page');
    const response = await page.reload();
    expect(response.status()).toBe(200);
    await expect(
      nav.getByRole('link', { name: label, exact: true }),
    ).toHaveAttribute('aria-current', 'page');
    expect(errors).toEqual([]);
  });
}

test('browser back and forward update the active link', async ({ page }) => {
  await page.goto('/find-a-team');
  const nav = page.getByRole('navigation');
  await nav.getByRole('link', { name: 'My team', exact: true }).click();
  await expectCurrentPage(page, '/my-team', 'My team');
  await nav.getByRole('link', { name: 'Participant guide' }).click();
  await expectCurrentPage(page, '/participant-guide', 'Participant guide');
  await page.goBack();
  await expect(
    nav.getByRole('link', { name: 'My team', exact: true }),
  ).toHaveAttribute('aria-current', 'page');
  await page.goForward();
  await expect(
    nav.getByRole('link', { name: 'Participant guide' }),
  ).toHaveAttribute('aria-current', 'page');
});

test('keyboard users can skip navigation and activate links', async ({
  page,
}) => {
  await page.goto('/find-a-team');
  await page.keyboard.press('Tab');
  await expect(
    page.getByRole('link', { name: 'Skip to content' }),
  ).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('main')).toBeFocused();
  await page.goto('/find-a-team');
  await page.keyboard.press('Tab');
  await page.keyboard.press('Tab');
  await expect(
    page.getByRole('link', { name: 'Dashboard', exact: true }),
  ).toBeFocused();
  await page.keyboard.press('Enter');
  await expectCurrentPage(page, '/dashboard', 'Dashboard');
  await expect(page.getByRole('main')).toBeFocused();
});

for (const width of [320, 390]) {
  test(`mobile menu reaches every route at ${width}px without overflow`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 844 });
    await page.goto('/find-a-team');
    const toggle = page.getByRole('button', { name: 'Open navigation' });
    const dialog = page.getByRole('dialog', { name: 'Event navigation' });
    for (const [path, label] of routes) {
      await expect(toggle).toHaveAttribute('aria-expanded', 'false');
      await expect(page.getByRole('navigation')).toHaveCount(0);
      await toggle.click();
      await expect(toggle).toHaveAttribute('aria-expanded', 'true');
      await dialog.getByRole('link', { name: label, exact: true }).click();
      await expect(dialog).not.toBeVisible();
      await expectCurrentPage(page, path, label);
      await expect(page.getByRole('main')).toBeFocused();
      await toggle.click();
      await expect(
        dialog.getByRole('link', { name: label, exact: true }),
      ).toHaveAttribute('aria-current', 'page');
      await page.keyboard.press('Escape');
      await expect(toggle).toBeFocused();
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= window.innerWidth,
        ),
      ).toBe(true);
    }
  });
}

test('mobile drawer traps focus, closes with Escape or backdrop, and restores scrolling', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/find-a-team');
  const toggle = page.getByRole('button', { name: 'Open navigation' });
  const dialog = page.getByRole('dialog');
  await toggle.focus();
  await page.keyboard.press('Enter');
  await expect(
    dialog.getByRole('button', { name: 'Close navigation' }),
  ).toBeFocused();
  await expect(page.locator('body')).toHaveCSS('overflow', 'hidden');
  await page.keyboard.press('Shift+Tab');
  await expect(
    dialog.getByRole('link', { name: 'Participant guide' }),
  ).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(
    dialog.getByRole('button', { name: 'Close navigation' }),
  ).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(dialog).not.toBeVisible();
  await expect(toggle).toBeFocused();
  await expect(page.locator('body')).not.toHaveCSS('overflow', 'hidden');
  await toggle.click();
  await page.mouse.click(370, 400);
  await expect(dialog).not.toBeVisible();
  await expect(toggle).toBeFocused();
  await toggle.click();
  await dialog.getByRole('button', { name: 'Close navigation' }).click();
  await expect(toggle).toBeFocused();
});

test('resizing an open drawer to desktop restores the sidebar and focus', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/find-a-team');
  await page.getByRole('button', { name: 'Open navigation' }).click();
  await page.setViewportSize({ width: 1280, height: 800 });
  await expect(page.getByRole('dialog')).not.toBeVisible();
  await expect(
    page
      .getByRole('navigation')
      .getByRole('link', { name: 'Find a team', exact: true }),
  ).toBeFocused();
  await expect(page.locator('body')).not.toHaveCSS('overflow', 'hidden');
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(
    page.getByRole('button', { name: 'Open navigation' }),
  ).toHaveAttribute('aria-expanded', 'false');
});

test('home and authentication pages keep their existing header', async ({
  page,
}) => {
  for (const path of ['/', '/welcome-page', '/login', '/register']) {
    await page.goto(path);
    await expect(page.locator('header')).toBeVisible();
    await expect(
      page.getByRole('navigation', { name: 'Main navigation' }),
    ).toHaveCount(0);
    await expect(
      page.getByRole('button', { name: 'Open navigation' }),
    ).toHaveCount(0);
  }
});
