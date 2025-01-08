"use server";

import { launch, type Page } from "puppeteer";
import { setTimeout } from "node:timers/promises";

const TIMEOUT = 60000; // Increase timeout to 60 seconds
const SCROLL_DELAY = 2000; // Increase scroll delay to 2 seconds

async function waitForSelector(page: Page, selector: string, timeout = TIMEOUT): Promise<boolean> {
  try {
    await page.waitForSelector(selector, { timeout });
    return true;
  } catch {
    console.error(`Timeout waiting for selector: ${selector}`);
    return false;
  }
}

async function handleLoginChallenges(page: Page) {
  // Handle "Save Login Info" dialog
  const saveLoginButton = await page.$('button._acan._acap._acas._aj1-');
  if (saveLoginButton) {
    await saveLoginButton.click();
    await setTimeout(1000);
  }

  // Handle cookie acceptance dialog
  const cookieButton = await page.$('button[role="alert"]');
  if (cookieButton) {
    await cookieButton.click();
    await setTimeout(1000);
  }

  // Check for suspicious login attempt dialog
  const suspiciousLoginText = await page.$('text/This login attempt appears suspicious/i');
  if (suspiciousLoginText) {
    throw new Error('Suspicious login detected. Please log in manually first and try again.');
  }
}

async function getList(
  page: Page,
  username: string,
  type: "followers" | "following",
): Promise<string[]> {
  console.log(`Fetching ${type} list for ${username}`);
  
  // Wait for and click the followers/following link
  const linkSelector = `a[href="/${username}/${type}/"]`;
  if (!await waitForSelector(page, linkSelector)) {
    throw new Error(`Could not find ${type} link. Please verify the account is accessible.`);
  }
  
  await page.click(linkSelector);
  console.log(`Clicked ${type} link`);

  // Wait for the dialog to appear
  const dialogSelector = 'div[role="dialog"] ul';
  if (!await waitForSelector(page, dialogSelector)) {
    throw new Error(`${type} dialog did not appear. The account might be private or rate-limited.`);
  }

  // Scroll to load all users
  let lastHeight = 0;
  let scrollAttempts = 0;
  const MAX_SCROLL_ATTEMPTS = 50; // Prevent infinite scrolling

  while (scrollAttempts < MAX_SCROLL_ATTEMPTS) {
    const newHeight = await page.evaluate(() => {
      const dialog = document.querySelector('div[role="dialog"] ul');
      if (!dialog) return 0;
      (dialog as HTMLElement).scrollTop = dialog.scrollHeight;
      return dialog.scrollHeight;
    });

    if (newHeight === lastHeight) {
      // Double-check if we've really reached the end
      await setTimeout(SCROLL_DELAY * 2);
      const finalCheck = await page.evaluate(() => {
        const dialog = document.querySelector('div[role="dialog"] ul');
        return dialog ? dialog.scrollHeight : 0;
      });
      if (finalCheck === newHeight) break;
    }

    lastHeight = newHeight;
    await setTimeout(SCROLL_DELAY);
    scrollAttempts++;
  }

  // Extract usernames
  const userList = await page.$$eval(
    'div[role="dialog"] ul li div div div span a',
    (links) => links.map((link) => (link as HTMLElement).innerText),
  );

  // Close dialog
  const closeButton = await page.$('button[aria-label="Close"]');
  if (closeButton) {
    await closeButton.click();
    await setTimeout(1000);
  }

  return userList;
}

export async function scrapeInstagram(
  formData: FormData
): Promise<{
  followersCount: number;
  followingCount: number;
  notFollowBack: string[];
  notFollowingBack: string[];
}> {
  const igUsername = formData.get('username') as string;
  const igPassword = formData.get('password') as string;

  console.log(igUsername, igPassword)
  if (!igUsername || !igPassword) {
    throw new Error("Instagram credentials are required");
  }

  const browser = await launch({
    headless: true,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--disable-accelerated-2d-canvas",
      "--disable-gpu"
    ],
  });

  try {
    const page = await browser.newPage();
    
    // Set a realistic viewport and user agent
    await page.setViewport({ width: 1280, height: 800 });
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

    // Navigate to login page
    await page.goto("https://www.instagram.com/accounts/login/", {
      waitUntil: "networkidle2",
      timeout: TIMEOUT,
    });

    // Handle login
    if (!await waitForSelector(page, 'input[name="username"]')) {
      throw new Error("Login page did not load properly");
    }

    console.log('logged in');
    await page.type('input[name="username"]', igUsername, { delay: 100 });
    await page.type('input[name="password"]', igPassword, { delay: 100 });
    await page.click('button[type="submit"]');

    // Wait for navigation and handle any login challenges
    await page.waitForNavigation({ waitUntil: "networkidle2", timeout: TIMEOUT });
    await handleLoginChallenges(page);

    // Navigate to profile page
    await page.goto(`https://www.instagram.com/${igUsername}/`, {
      waitUntil: "networkidle2",
      timeout: TIMEOUT,
    });

    // Fetch followers and following lists
    const followers = await getList(page, igUsername, "followers");
    const following = await getList(page, igUsername, "following");

    // Calculate differences
    const notFollowBack = following.filter((f) => !followers.includes(f));
    const notFollowingBack = followers.filter((f) => !following.includes(f));

    return {
      followersCount: followers.length,
      followingCount: following.length,
      notFollowBack,
      notFollowingBack,
    };
  } catch (e) {
    console.error("Instagram scraping failed:", e);
    throw new Error(`Failed to scrape Instagram: ${e}`);
  } finally {
    await browser.close();
  }
}
