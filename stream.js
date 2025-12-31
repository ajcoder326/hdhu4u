// HDHub4u Stream Module - DOM-only extraction
// 
// FLOW (no clicking, just DOM parsing at each step):
// 1. hubdrive page → extract hubcloud URL from DOM
// 2. hubcloud page → extract gamerxyt URL from DOM (#download href)
// 3. gamerxyt page → extract all download links from DOM
//
// This is FAST because we never wait for ads or countdowns!

var headers = {
  "User-Agent": "Mozilla/5.0 (Linux; Android 13; SM-G991B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36"
};

/**
 * Get streams for a given link
 * Returns DOM extraction rules for the hidden browser
 */
function getStreams(link, type) {
  console.log("getStreams called with:", link);
  
  // HubDrive page - full 3-step extraction
  if (link.indexOf("hubdrive.") !== -1) {
    return getHubdriveExtraction(link);
  }
  
  // HubCloud page - 2-step extraction (skip first step)
  if (link.indexOf("hubcloud.") !== -1) {
    return getHubcloudExtraction(link);
  }
  
  // HBLinks shortener - try to resolve first, then extract
  if (link.indexOf("hblinks.") !== -1) {
    return getHblinksExtraction(link);
  }
  
  // GamerXYT final page - just extract links
  if (link.indexOf("gamerxyt.") !== -1) {
    return getFinalPageExtraction(link);
  }
  
  // Unknown - try as hubdrive-style (3 steps)
  console.log("Unknown link type, trying 3-step extraction");
  return getHubdriveExtraction(link);
}

/**
 * Full 3-step DOM extraction for hubdrive pages
 * Step 1: hubdrive → find hubcloud link in DOM
 * Step 2: hubcloud → find #download href in DOM
 * Step 3: gamerxyt → extract all download links
 */
function getHubdriveExtraction(link) {
  console.log("Creating 3-step DOM extraction for hubdrive:", link);
  
  return [{
    server: "Auto Extract",
    link: link,
    type: "automate",
    automation: {
      steps: [
        // Step 1: Extract HubCloud URL from hubdrive page
        {
          action: "extractUrl",
          selectors: [
            "a[href*='hubcloud']",
            "a.btn-success[href*='hubcloud']",
            "a.btn[href*='hubcloud']"
          ],
          patterns: ["hubcloud", "HubCloud", "HUBCLOUD"]
        },
        // Step 2: Extract download page URL from hubcloud
        {
          action: "extractUrl",
          selectors: [
            "#download",
            "a#download",
            "a[href*='gamerxyt']",
            "a[href*='hubcloud.php']"
          ],
          patterns: ["gamerxyt", "hubcloud.php"]
        },
        // Step 3: Extract all download links from final page
        {
          action: "extractLinks",
          selectors: [
            "a.btn-success",
            "a.btn-primary",
            "a.btn-danger",
            "a.btn-info",
            "a[href*='.mkv']",
            "a[href*='.mp4']",
            "a[href*='.zip']",
            "a[href*='pixel']",
            "a[href*='fsl']",
            "a[href*='hubcdn']",
            "a[href*='fukggl']",
            "a[href*='firecdn']"
          ],
          excludePatterns: [
            "t.me",
            "telegram",
            "facebook",
            "twitter",
            "instagram",
            "javascript:",
            "#"
          ]
        }
      ]
    }
  }];
}

/**
 * 2-step DOM extraction for hubcloud pages (skip hubdrive step)
 */
function getHubcloudExtraction(link) {
  console.log("Creating 2-step DOM extraction for hubcloud:", link);
  
  return [{
    server: "HubCloud",
    link: link,
    type: "automate",
    automation: {
      steps: [
        // Step 1: Extract download page URL from hubcloud
        {
          action: "extractUrl",
          selectors: [
            "#download",
            "a#download",
            "a[href*='gamerxyt']",
            "a[href*='hubcloud.php']"
          ],
          patterns: ["gamerxyt", "hubcloud.php"]
        },
        // Step 2: Extract all download links from final page
        {
          action: "extractLinks",
          selectors: [
            "a.btn-success",
            "a.btn-primary",
            "a.btn-danger",
            "a.btn-info",
            "a[href*='.mkv']",
            "a[href*='.mp4']",
            "a[href*='.zip']",
            "a[href*='pixel']",
            "a[href*='fsl']",
            "a[href*='hubcdn']",
            "a[href*='fukggl']",
            "a[href*='firecdn']"
          ],
          excludePatterns: [
            "t.me",
            "telegram",
            "facebook",
            "twitter",
            "instagram",
            "javascript:",
            "#"
          ]
        }
      ]
    }
  }];
}

/**
 * Extraction for hblinks shortener
 * Try to resolve via axios first, fallback to DOM extraction
 */
function getHblinksExtraction(link) {
  console.log("Processing hblinks shortener:", link);
  
  try {
    // Try to fetch and find the hubdrive/hubcloud link
    var response = axios.get(link, { headers: headers, timeout: 10000 });
    var html = response.data;
    var $ = cheerio.load(html);
    
    // Look for hubdrive or hubcloud link
    var nextLink = $('a[href*="hubdrive"]').first().attr("href") ||
                   $('a[href*="hubcloud"]').first().attr("href");
    
    if (nextLink) {
      console.log("Resolved hblinks to:", nextLink);
      
      if (nextLink.indexOf("hubdrive") !== -1) {
        return getHubdriveExtraction(nextLink);
      } else if (nextLink.indexOf("hubcloud") !== -1) {
        return getHubcloudExtraction(nextLink);
      }
    }
    
    // Fallback: return link with 3-step extraction
    console.log("Could not resolve hblinks, trying DOM extraction");
    return getHubdriveExtraction(link);
    
  } catch (e) {
    console.error("Error resolving hblinks:", e);
    return getHubdriveExtraction(link);
  }
}

/**
 * Direct extraction from final page (gamerxyt)
 */
function getFinalPageExtraction(link) {
  console.log("Creating direct link extraction for final page:", link);
  
  return [{
    server: "Direct",
    link: link,
    type: "automate",
    automation: {
      steps: [
        {
          action: "extractLinks",
          selectors: [
            "a.btn-success",
            "a.btn-primary",
            "a.btn-danger",
            "a.btn-info",
            "a[href*='.mkv']",
            "a[href*='.mp4']",
            "a[href*='.zip']",
            "a[href*='pixel']",
            "a[href*='fsl']",
            "a[href*='hubcdn']",
            "a[href*='fukggl']",
            "a[href*='firecdn']"
          ],
          excludePatterns: [
            "t.me",
            "telegram",
            "facebook",
            "twitter",
            "instagram",
            "javascript:",
            "#"
          ]
        }
      ]
    }
  }];
}
