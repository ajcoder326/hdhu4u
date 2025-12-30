// HDHub4u Stream Module - SYNCHRONOUS VERSION for Rhino JS
// Based on vega-providers implementation with link shortener bypass

var headers = {
  "Cookie": "xla=s4t",
  "Referer": "https://google.com",
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36"
};

// Utility functions
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
  return value.replace(/[a-zA-Z]/g, function (char) {
    return String.fromCharCode(
      (char <= "Z" ? 90 : 122) >= (char = char.charCodeAt(0) + 13) ? char : char - 26
    );
  });
}

function rot13(str) {
  return str.replace(/[a-zA-Z]/g, function (char) {
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
    // First base64 decode
    var decoded = atob(encryptedString);
    // Second base64 decode
    decoded = atob(decoded);
    // ROT13 decode
    decoded = rot13(decoded);
    // Third base64 decode
    decoded = atob(decoded);
    // Parse JSON
    return JSON.parse(decoded);
  } catch (error) {
    console.error("Error decoding string:", error);
    return null;
  }
}

// Extract redirect link from shortener page
function getRedirectLinks(link) {
  try {
    console.log("getRedirectLinks:", link);
    var res = axios.get(link, { headers: headers });
    var resText = res.data;

    // Extract tokens from ck('_wp_http_\d+','<token>') pattern
    var regex = /ck\('_wp_http_\d+','([^']+)'/g;
    var combinedString = "";
    var match;

    while ((match = regex.exec(resText)) !== null) {
      combinedString += match[1];
    }

    if (!combinedString) {
      console.log("No ck tokens found, trying alternate method");
      // Try to find direct redirect URL
      var redirectMatch = resText.match(/var\s+url\s*=\s*['"]([^'"]+)['"]/);
      if (redirectMatch) {
        return redirectMatch[1];
      }
      return link;
    }

    var decodedString = decode(pen(decode(decode(combinedString))));
    console.log("Decoded redirect string");

    var data = JSON.parse(decodedString);
    var token = encode(data.data || "");
    var blogLink = (data.wp_http1 || "") + "?re=" + token;

    console.log("blogLink:", blogLink);

    // Note: In synchronous version, we can't truly wait
    // We'll try to fetch directly and hope the timer has passed
    var blogRes = axios.get(blogLink, { headers: headers });
    var blogResText = blogRes.data;

    var reurlMatch = blogResText.match(/var reurl = "([^"]+)"/);
    if (reurlMatch) {
      return reurlMatch[1];
    }

    return blogLink;
  } catch (err) {
    console.error("Error in getRedirectLinks:", err);
    return link;
  }
}

// HubCloud Extractor - extracts stream links from hubcloud page
function hubcloudExtractor(link) {
  try {
    console.log("hubcloudExtractor:", link);
    var baseUrl = link.split("/").slice(0, 3).join("/");
    var streamLinks = [];

    var response = axios.get(link, { headers: headers });
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
      var downloadIcon = $(".fa-file-download.fa-lg");
      var parentHref = "";
      if (downloadIcon.length > 0) {
        var parentEl = downloadIcon.parent();
        if (parentEl && parentEl.length > 0) {
          parentHref = parentEl.attr("href") || "";
        }
      }
      vcloudLink = vLinkRedirect || parentHref || link;
    }

    console.log("vcloudLink:", vcloudLink);

    if (vcloudLink && vcloudLink.indexOf("/") === 0) {
      vcloudLink = baseUrl + vcloudLink;
      console.log("New vcloudLink:", vcloudLink);
    }

    // Fetch the vcloud page
    var vcloudRes = axios.get(vcloudLink, { headers: headers });
    var vcloudHtml = vcloudRes.data;
    var $vcloud = cheerio.load(vcloudHtml);

    // Extract download links from buttons
    var buttons = $vcloud(".btn-success.btn-lg.h6, .btn-danger, .btn-secondary");
    console.log("Found buttons:", buttons.length);

    for (var i = 0; i < buttons.length; i++) {
      var element = buttons.eq(i);
      var downloadLink = element.attr("href") || "";

      if (!downloadLink) continue;

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
    }

    console.log("streamLinks count:", streamLinks.length);
    return streamLinks;
  } catch (error) {
    console.error("hubcloudExtractor error:", error);
    return [];
  }
}

// Main stream extraction function - SYNCHRONOUS
function getStream(link, type, providerContext) {
  try {
    console.log("HDHub4u getStream link:", link, "type:", type);

    var hubdriveLink = "";

    // Check if it's already a hubdrive link
    if (link.indexOf("hubdrive") !== -1) {
      var hubdriveRes = axios.get(link, { headers: headers });
      var hubdriveText = hubdriveRes.data;
      var $ = cheerio.load(hubdriveText);
      hubdriveLink = $(".btn.btn-primary.btn-user.btn-success1.m-1").attr("href") || link;
    }
    // Check if it's a hubcloud link directly
    else if (link.indexOf("hubcloud") !== -1) {
      hubdriveLink = link;
    }
    // Check if it's a gadgetsweb.xyz shortener link  
    else if (link.indexOf("gadgetsweb.xyz") !== -1 || link.indexOf("?id=") !== -1) {
      console.log("Processing shortener link:", link);
      // For shortener links, we need to decode or redirect
      var shortRes = axios.get(link, { headers: headers });
      var shortText = shortRes.data;

      // Look for encoded string or redirect
      var encryptedParts = shortText.split("s('o','");
      if (encryptedParts.length > 1) {
        var encryptedString = encryptedParts[1].split("',180")[0];
        if (encryptedString) {
          var decodedData = decodeString(encryptedString);
          if (decodedData && decodedData.o) {
            var decodedLink = atob(decodedData.o);
            console.log("Decoded shortener to:", decodedLink);
            hubdriveLink = getRedirectLinks(decodedLink);
          }
        }
      }

      // Fallback: try to find hubcloud/hubdrive link in page
      if (!hubdriveLink) {
        var $short = cheerio.load(shortText);
        hubdriveLink = $short('a[href*="hubcloud"]').attr("href") ||
          $short('a[href*="hubdrive"]').attr("href") ||
          $short('a[href*="hubcdn"]').attr("href") || "";
      }
    }
    // Regular link - need to parse the page
    else {
      var res = axios.get(link, { headers: headers });
      var text = res.data;
      var $ = cheerio.load(text);

      // Method 1: Look for encoded string
      var encryptedParts = text.split("s('o','");
      if (encryptedParts.length > 1) {
        var encryptedString = encryptedParts[1].split("',180")[0];
        if (encryptedString) {
          var decodedData = decodeString(encryptedString);
          if (decodedData && decodedData.o) {
            var decodedLink = atob(decodedData.o);
            hubdriveLink = getRedirectLinks(decodedLink);
          }
        }
      }

      // Method 2: Direct hubcloud/hubdrive links on page
      if (!hubdriveLink) {
        hubdriveLink = $('a[href*="hubcloud"]').attr("href") ||
          $('a[href*="hubdrive"]').attr("href") ||
          $('a[href*="hubcdn"]').attr("href") || "";
      }

      // Method 3: Look for quality-based links
      if (!hubdriveLink) {
        hubdriveLink = $('a:contains("1080p")').attr("href") ||
          $('a:contains("720p")').attr("href") ||
          $('a:contains("480p")').attr("href") ||
          $('h3:contains("1080p")').find("a").attr("href") || "";
      }
    }

    if (!hubdriveLink) {
      console.log("No download link found");
      return [];
    }

    console.log("hubdriveLink:", hubdriveLink);

    // If hubdrive, fetch it to get final hubcloud link
    if (hubdriveLink.indexOf("hubdrive") !== -1) {
      var hubdriveRes2 = axios.get(hubdriveLink, { headers: headers });
      var hubdriveText2 = hubdriveRes2.data;
      var $h = cheerio.load(hubdriveText2);
      var nextLink = $h(".btn.btn-primary.btn-user.btn-success1.m-1").attr("href");
      if (nextLink) {
        hubdriveLink = nextLink;
      }
    }

    // Get hubcloud link from meta refresh if present
    if (hubdriveLink.indexOf("hubcloud") === -1 && hubdriveLink.indexOf("hubcdn") === -1) {
      try {
        var hubdriveLinkRes = axios.get(hubdriveLink, { headers: headers });
        var hubcloudText = hubdriveLinkRes.data;
        var metaMatch = hubcloudText.match(/<META HTTP-EQUIV="refresh" content="0; url=([^"]+)">/i);
        if (metaMatch && metaMatch[1]) {
          hubdriveLink = metaMatch[1];
        }
      } catch (e) {
        console.log("Error getting meta refresh:", e);
      }
    }

    console.log("Final hubcloudLink:", hubdriveLink);

    // Extract stream links from hubcloud
    var streams = hubcloudExtractor(hubdriveLink);

    return streams;
  } catch (error) {
    console.error("HDHub4u getStream error:", error);
    return [];
  }
}
