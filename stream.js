var headers = {
  "Cookie": "xla=s4t",
  "Referer": "https://google.com",
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36 Edg/131.0.0.0"
};

// Utility functions for decoding
function encode(value) {
  return btoa(value.toString());
}

function decode(value) {
  if (value === undefined || value === null) {
    return "";
  }
  try {
    return atob(value.toString());
  } catch (e) {
    return "";
  }
}

function pen(value) {
  return value.replace(/[a-zA-Z]/g, function(char) {
    return String.fromCharCode(
      (char <= "Z" ? 90 : 122) >= (char = char.charCodeAt(0) + 13) ? char : char - 26
    );
  });
}

function rot13(str) {
  return str.replace(/[a-zA-Z]/g, function(char) {
    var charCode = char.charCodeAt(0);
    var isUpperCase = char <= "Z";
    var baseCharCode = isUpperCase ? 65 : 97;
    return String.fromCharCode(
      ((charCode - baseCharCode + 13) % 26) + baseCharCode
    );
  });
}

function decodeString(encryptedString) {
  try {
    var decoded = atob(encryptedString);
    decoded = atob(decoded);
    decoded = rot13(decoded);
    decoded = atob(decoded);
    return JSON.parse(decoded);
  } catch (error) {
    console.error("Error decoding string:", error);
    return null;
  }
}

// HubCloud extraction using axios only
async function hubcloudExtractor(link) {
  try {
    console.log("hubcloudExtractor:", link);
    var baseUrl = link.split("/").slice(0, 3).join("/");
    var streamLinks = [];
    
    var response = await axios.get(link, { headers: headers });
    var html = response.data;
    var $ = cheerio.load(html);
    
    // Try to find redirect URL
    var vLinkMatch = html.match(/var\s+url\s*=\s*'([^']+)';/);
    var vLinkRedirect = vLinkMatch ? vLinkMatch[1] : "";
    
    var vcloudLink = "";
    if (vLinkRedirect && vLinkRedirect.indexOf("r=") !== -1) {
      vcloudLink = decode(vLinkRedirect.split("r=")[1]);
    }
    if (!vcloudLink) {
      vcloudLink = vLinkRedirect || $(".fa-file-download.fa-lg").parent().attr("href") || link;
    }
    
    console.log("vcloudLink:", vcloudLink);
    
    if (vcloudLink && vcloudLink.indexOf("/") === 0) {
      vcloudLink = baseUrl + vcloudLink;
      console.log("New vcloudLink:", vcloudLink);
    }
    
    // Fetch the vcloud page
    var vcloudRes = await axios.get(vcloudLink, { headers: headers });
    var vcloudHtml = vcloudRes.data;
    var $vcloud = cheerio.load(vcloudHtml);
    
    // Extract download links from buttons
    $vcloud(".btn-success.btn-lg.h6, .btn-danger, .btn-secondary").each(function(i, element) {
      var downloadLink = $vcloud(element).attr("href") || "";
      
      if (!downloadLink) return;
      
      // Classify by link type
      if (downloadLink.indexOf(".dev") !== -1 && downloadLink.indexOf("/?id=") === -1) {
        streamLinks.push({ server: "Cf Worker", link: downloadLink, type: "mkv" });
      } else if (downloadLink.indexOf("pixeld") !== -1) {
        // Fix pixeldrain links
        if (downloadLink.indexOf("api") === -1) {
          var parts = downloadLink.split("/");
          var token = parts[parts.length - 1];
          var pixelBase = parts.slice(0, -2).join("/");
          downloadLink = pixelBase + "/api/file/" + token + "?download";
        }
        streamLinks.push({ server: "Pixeldrain", link: downloadLink, type: "mkv" });
      } else if (downloadLink.indexOf("hubcloud") !== -1 || downloadLink.indexOf("/?id=") !== -1) {
        streamLinks.push({ server: "HubCloud", link: downloadLink, type: "mkv" });
      } else if (downloadLink.indexOf("cloudflarestorage") !== -1) {
        streamLinks.push({ server: "CfStorage", link: downloadLink, type: "mkv" });
      } else if (downloadLink.indexOf("fastdl") !== -1 || downloadLink.indexOf("fsl.") !== -1) {
        streamLinks.push({ server: "FastDl", link: downloadLink, type: "mkv" });
      } else if (downloadLink.indexOf("hubcdn") !== -1 && downloadLink.indexOf("/?id=") === -1) {
        streamLinks.push({ server: "HubCdn", link: downloadLink, type: "mkv" });
      } else if (downloadLink.indexOf(".mkv") !== -1) {
        var serverMatch = downloadLink.match(/^(?:https?:\/\/)?(?:www\.)?([^\/]+)/i);
        var serverName = serverMatch ? serverMatch[1].replace(/\./g, " ") : "Unknown";
        streamLinks.push({ server: serverName, link: downloadLink, type: "mkv" });
      }
    });
    
    console.log("streamLinks:", streamLinks.length);
    return streamLinks;
  } catch (error) {
    console.log("hubcloudExtractor error:", error);
    return [];
  }
}

// Main stream extraction function
async function getStream(link, type, providerContext) {
  try {
    console.log("HDHub4u getStream link:", link, "type:", type);
    
    var hubdriveLink = "";
    var streamLinks = [];
    
    // Check if it's a hubdrive link directly
    if (link.indexOf("hubdrive") !== -1) {
      var hubdriveRes = await axios.get(link, { headers: headers });
      var hubdriveText = hubdriveRes.data;
      var $ = cheerio.load(hubdriveText);
      hubdriveLink = $(".btn.btn-primary.btn-user.btn-success1.m-1").attr("href") || link;
    } else if (link.indexOf("hubcloud") !== -1) {
      // Direct hubcloud link
      hubdriveLink = link;
    } else {
      // Need to decode encrypted link from page
      var res = await axios.get(link, { headers: headers });
      var text = res.data;
      var $ = cheerio.load(text);
      
      // Try multiple methods to find download links
      
      // Method 1: Direct hubcloud/hubdrive links on page
      var directLink = $('a[href*="hubcloud"]').attr("href") || 
                       $('a[href*="hubdrive"]').attr("href") ||
                       $('a[href*="hubcdn"]').attr("href");
      
      if (directLink) {
        hubdriveLink = directLink;
      }
      
      // Method 2: Look for encoded links
      if (!hubdriveLink) {
        var encryptedParts = text.split("s('o','");
        if (encryptedParts.length > 1) {
          var encryptedString = encryptedParts[1].split("',180")[0];
          if (encryptedString) {
            var decodedData = decodeString(encryptedString);
            if (decodedData && decodedData.o) {
              hubdriveLink = atob(decodedData.o);
            }
          }
        }
      }
      
      // Method 3: Find quality-based links
      if (!hubdriveLink) {
        hubdriveLink = $('a:contains("1080p")').attr("href") ||
                       $('a:contains("720p")').attr("href") ||
                       $('a:contains("480p")').attr("href") ||
                       $('h3:contains("1080p")').find("a").attr("href");
      }
      
      if (!hubdriveLink) {
        console.log("No download link found");
        return [];
      }
    }
    
    console.log("hubdriveLink:", hubdriveLink);
    
    // If hubdrive, fetch it again to get final link
    if (hubdriveLink.indexOf("hubdrive") !== -1) {
      var hubdriveRes2 = await axios.get(hubdriveLink, { headers: headers });
      var hubdriveText2 = hubdriveRes2.data;
      var $h = cheerio.load(hubdriveText2);
      var nextLink = $h(".btn.btn-primary.btn-user.btn-success1.m-1").attr("href");
      if (nextLink) {
        hubdriveLink = nextLink;
      }
    }
    
    // Get final hubcloud link from hubdrive page if needed
    if (hubdriveLink.indexOf("hubcloud") === -1 && hubdriveLink.indexOf("hubcdn") === -1) {
      var hubdriveLinkRes = await axios.get(hubdriveLink, { headers: headers });
      var hubcloudText = hubdriveLinkRes.data;
      var metaMatch = hubcloudText.match(/<META HTTP-EQUIV="refresh" content="0; url=([^"]+)">/i);
      if (metaMatch && metaMatch[1]) {
        hubdriveLink = metaMatch[1];
      }
    }
    
    console.log("Final hubcloudLink:", hubdriveLink);
    
    // Extract stream links from hubcloud
    var streams = await hubcloudExtractor(hubdriveLink);
    
    return streams;
  } catch (error) {
    console.log("HDHub4u getStream error:", error);
    return [];
  }
}
