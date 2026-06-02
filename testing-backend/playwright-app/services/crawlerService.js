const { launchBrowser, openURL } = require('./browserService');

function normalizeSnapshot(str) {
  return str
    .replace(/\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{4}\b/gi, '')
    .replace(/\b\d{1,2}:\d{2}\b/g, '')
    .replace(/\b\d+ hours? ago\b/gi, '')
    .replace(/\b(Welcome back|Hello|Hi),?\s+\w+/gi, '')
    .replace(/\(\d+\)/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function stripSnapshot(snapshotStr) {
  return snapshotStr
    .split('\n')
    .map(line => {
      const nameMatch = line.match(/\[name="([^"]+)"\]/);
      const levelMatch = line.match(/\[level=(\d+)\]/);
      let result = line.replace(/\[.*?\]/g, '');
      if (nameMatch) result += ` [name="${nameMatch[1]}"]`;
      if (levelMatch) result += ` [level=${levelMatch[1]}]`;
      return result;
    })
    .join('\n');
}

async function collectPageData(page, url) {
  await openURL(page, url);

  const title = await page.title();

  const rawSnapshot = await page.locator('main, body').first().ariaSnapshot().catch(() => '');
  const snapshot = normalizeSnapshot(stripSnapshot(rawSnapshot));

  const interactiveElements = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('button, input, select, a[href]')).map(el => ({
      role: el.tagName.toLowerCase(),
      label: el.getAttribute('aria-label') || el.textContent?.trim().slice(0, 80) || el.getAttribute('placeholder') || '',
    }));
  });

  const links = await page.evaluate((origin) => {
    return Array.from(document.querySelectorAll('a[href]'))
      .map(a => { try { return new URL(a.href, window.location.href).href; } catch { return null; } })
      .filter(href => {
        if (!href) return false;
        try {
          const u = new URL(href);
          const skip = /\.(pdf|jpg|jpeg|png|gif|svg|webp|mp4|mp3|zip|doc|docx|xls|xlsx|csv|xml|json)$/i;
          return u.origin === origin && u.hash === '' && u.pathname !== '/None' && !skip.test(u.pathname);
        } catch { return false; }
      });
  }, new URL(url).origin);

  return { url, title, snapshot, interactiveElements, links: [...new Set(links)] };
}

async function crawlSite(startUrl) {
  const visited = new Set();
  const queue = [startUrl];
  const pages = [];

  const { browser, page } = await launchBrowser();
  try {
    while (queue.length > 0) {
      const url = queue.shift();
      if (visited.has(url)) continue;
      visited.add(url);

      console.log(`  Crawling: ${url}`);
      try {
        const data = await collectPageData(page, url);
        pages.push(data);
        for (const link of data.links) {
          if (!visited.has(link) && !queue.includes(link)) queue.push(link);
        }
      } catch (err) {
        console.warn(`  Skipped ${url}: ${err.message}`);
      }
    }
  } finally {
    await browser.close();
  }

  return pages;
}

async function crawlSinglePage(url) {
  const { browser, page } = await launchBrowser();
  try {
    const data = await collectPageData(page, url);
    return data;
  } finally {
    await browser.close();
  }
}

module.exports = { crawlSite, crawlSinglePage, normalizeSnapshot };
