// HDHub4u Stream Module - Returns automation rules for hidden browser extraction
// When user clicks a link, the app will use these rules to automate the extraction

var headers = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36"
};

/**
 * Get streams for a given link
 * Returns automation rules that the hidden browser will execute
 */
function getStreams(link, type) {
  console.log("getStreams called with:", link);
  
  // Determine what type of link this is and return appropriate automation rules
  
  // HBLinks page - need to extract hubcloud link first
  if (link.indexOf("hblinks.dad") !== -1) {
    return getHblinksAutomation(link);
  }
  
  // HubCloud page - this is where download button is
  if (link.indexOf("hubcloud.foo") !== -1 || 
      link.indexOf("hubcloud.fyi") !== -1 || 
      link.indexOf("hubcloud.lol") !== -1) {
    return getHubcloudAutomation(link);
  }
  
  // HubDrive page
  if (link.indexOf("hubdrive.space") !== -1) {
    return getHubdriveAutomation(link);
  }
  
  // HubCDN page
  if (link.indexOf("hubcdn.fans") !== -1) {
    return getHubcdnAutomation(link);
  }
  
  // Unknown - return as direct link
  console.log("Unknown link type, returning as direct");
  return [{
    server: "Direct",
    link: link,
    type: "direct"
  }];
}

/**
 * Automation for hblinks.dad pages
 * Flow: hblinks → extract hubcloud link → hubcloud → click button → gamerxyt → extract final links
 */
function getHblinksAutomation(link) {
  console.log("Creating HBLinks automation for:", link);
  
  // First, fetch the hblinks page to get the hubcloud URL
  try {
    var response = axios.get(link, { headers: headers });
    var html = response.data;
    var $ = cheerio.load(html);
    
    // Find the hubcloud link
    var hubcloudLink = $('a[href*="hubcloud"]').first().attr("href");
    
    if (hubcloudLink) {
      console.log("Found hubcloud link:", hubcloudLink);
      // Return automation for the hubcloud page
      return getHubcloudAutomation(hubcloudLink);
    }
    
    console.log("No hubcloud link found on hblinks page");
    return [];
  } catch (e) {
    console.error("Error fetching hblinks:", e);
    return [];
  }
}

/**
 * Automation for hubcloud.foo pages
 * This is the main extraction - click download button → go to gamerxyt → extract final URLs
 */
function getHubcloudAutomation(link) {
  console.log("Creating HubCloud automation for:", link);
  
  // Return the link with automation rules
  // The hidden browser will execute these steps
  return [{
    server: "HubCloud",
    link: link,
    type: "automate",
    automation: {
      steps: [
        {
          action: "waitAndClick",
          selector: "#download",
          matchUrl: "hubcloud",
          timeout: 10000
        },
        {
          action: "extractLinks",
          selector: "a.btn-success, a.btn-primary, a[href*='pixeldrain'], a[href*='.zip'], a[href*='.mkv']",
          matchUrl: "gamerxyt",
          filter: [".zip", ".mkv", ".mp4", "pixeldrain", "fukggl", "firecdn", "fsl.", "cdn.", "hubcdn"]
        },
        {
          action: "complete"
        }
      ]
    }
  }];
}

/**
 * Automation for hubdrive.space pages
 */
function getHubdriveAutomation(link) {
  console.log("Creating HubDrive automation for:", link);
  
  // First fetch the page to get the hubcloud link
  try {
    var response = axios.get(link, { headers: headers });
    var html = response.data;
    var $ = cheerio.load(html);
    
    // Find the HubCloud Server button
    var hubcloudLink = $('a.btn:contains("HubCloud")').attr("href") || 
                       $('a[href*="hubcloud"]').first().attr("href");
    
    if (hubcloudLink) {
      console.log("Found hubcloud link from hubdrive:", hubcloudLink);
      return getHubcloudAutomation(hubcloudLink);
    }
    
    console.log("No hubcloud link found on hubdrive page");
    return [];
  } catch (e) {
    console.error("Error fetching hubdrive:", e);
    return [];
  }
}

/**
 * Automation for hubcdn.fans pages
 */
function getHubcdnAutomation(link) {
  console.log("Creating HubCDN automation for:", link);
  
  return [{
    server: "HubCDN",
    link: link,
    type: "automate",
    automation: {
      steps: [
        {
          action: "extractLinks",
          selector: "a[href*='.mkv'], a[href*='.zip'], a[href*='download'], a.btn",
          matchUrl: "hubcdn",
          filter: [".zip", ".mkv", ".mp4", "download"]
        },
        {
          action: "complete"
        }
      ]
    }
  }];
}
