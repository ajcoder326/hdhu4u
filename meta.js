// HDHub4u Meta Module - SYNCHRONOUS VERSION for Rhino JS
// Fixed selectors based on browser analysis + streaming link extraction

var headers = {
  "Cookie": "xla=s4t",
  "Referer": "https://google.com",
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36"
};

function getMetaData(link, providerContext) {
  console.log("getMetaData called - link:", link);

  try {
    var response = axios.get(link, { headers: headers });

    if (!response || !response.data) {
      console.error("No meta response data");
      return createEmptyMeta();
    }

    var $ = cheerio.load(response.data);
    var container = $("main.page-body");

    // Extract title from h1.page-title
    var title = "";
    var titleSpan = $("h1.page-title span.material-text");
    if (titleSpan.length > 0) {
      title = titleSpan.text();
    }
    if (!title) {
      var h1PageTitle = $("h1.page-title");
      if (h1PageTitle.length > 0) {
        title = h1PageTitle.text();
      }
    }
    if (!title) {
      var h1 = $("h1").first();
      if (h1.length > 0) {
        title = h1.text();
      }
    }
    if (title) {
      title = title.trim();
      if (title.charCodeAt(0) > 10000) {
        title = title.substring(1).trim();
      }
    }
    console.log("Title found:", title ? title.substring(0, 40) : "none");

    // Determine content type
    var type = "movie";
    if (title && title.toLowerCase().indexOf("season") !== -1) {
      type = "series";
    }

    // Extract poster from img.aligncenter
    var image = "";
    var posterImg = $("main.page-body img.aligncenter");
    if (posterImg.length > 0) {
      image = posterImg.first().attr("src") || "";
    }
    if (!image) {
      var alignCenterImg = $("img.aligncenter");
      if (alignCenterImg.length > 0) {
        image = alignCenterImg.first().attr("src") || "";
      }
    }
    console.log("Image found:", image ? image.substring(0, 50) : "none");

    // Extract synopsis
    var synopsis = "";
    var bodyText = container.text() || "";
    var markers = ["Storyline", "SYNOPSIS", "STORY", "DESCRIPTION", "Plot"];
    for (var m = 0; m < markers.length; m++) {
      var markerIdx = bodyText.indexOf(markers[m]);
      if (markerIdx !== -1) {
        var afterMarker = bodyText.substring(markerIdx);
        var colonIdx = afterMarker.indexOf(":");
        if (colonIdx !== -1 && colonIdx < 30) {
          synopsis = afterMarker.substring(colonIdx + 1, colonIdx + 500).trim();
          var cutIdx = synopsis.indexOf("Download");
          if (cutIdx > 30) synopsis = synopsis.substring(0, cutIdx).trim();
          cutIdx = synopsis.indexOf("IMDb");
          if (cutIdx > 30) synopsis = synopsis.substring(0, cutIdx).trim();
          break;
        }
      }
    }
    if (!synopsis || synopsis.length < 20) {
      synopsis = "Watch " + (title || "content") + " in high quality.";
    }
    console.log("Synopsis length:", synopsis.length);

    // Extract IMDB ID if available
    var imdbId = "";
    var imdbLink = container.find('a[href*="imdb.com/title/tt"]').attr("href");
    if (imdbLink) {
      var imdbParts = imdbLink.split("/");
      for (var i = 0; i < imdbParts.length; i++) {
        if (imdbParts[i].indexOf("tt") === 0) {
          imdbId = imdbParts[i];
          break;
        }
      }
    }

    // ============================================
    // EXTRACT STREAMING/DOWNLOAD LINKS (linkList)
    // ============================================
    var linkList = [];
    var directLinks = [];

    // Find ALL streaming/download provider links
    var shortenerLinks = $('a[href*="gadgetsweb.xyz"], a[href*="hubstream"], a[href*="hubdrive"], a[href*="hubcloud"], a[href*="hubcdn.fans"], a[href*="hdstream4u.com"]');
    console.log("Shortener links found:", shortenerLinks.length);

    // Helper to determine link type based on URL
    function getLinkType(url) {
      if (url.indexOf("hubdrive.space") !== -1 || 
          url.indexOf("hubcloud") !== -1 || 
          url.indexOf("hubcdn.fans") !== -1) {
        return "extract";  // Use rule-based extractor
      }
      return "stream";
    }

    // Group by episode vs quality
    var episodeLinks = [];
    var qualityLinks = [];

    for (var s = 0; s < shortenerLinks.length && s < 100; s++) {
      var sAnchor = shortenerLinks.eq(s);
      var sText = sAnchor.text().trim();
      var sHref = sAnchor.attr("href") || "";

      if (!sHref || sHref.indexOf("http") !== 0) continue;

      // Check if it's an episode link
      if (sText.toUpperCase().indexOf("EPISODE") !== -1 || sText.toUpperCase().indexOf("EPISOD") !== -1) {
        episodeLinks.push({
          title: sText,
          link: sHref,
          type: getLinkType(sHref)
        });
      }
      // Check if it's a quality link (480p, 720p, 1080p, etc.)
      else if (sText.match(/480|720|1080|2160|4K/i)) {
        var qMatch = sText.match(/\b(480p|720p|1080p|2160p|4K)\b/i);
        qualityLinks.push({
          title: sText,
          link: sHref,
          quality: qMatch ? qMatch[0] : "",
          type: getLinkType(sHref)
        });
      }
      // Check if it's a WATCH link (hubstream, hdstream4u)
      else if (sText.toUpperCase().indexOf("WATCH") !== -1 || sHref.indexOf("hdstream4u") !== -1) {
        // Include streaming links for watching
        directLinks.push({
          title: sText || "Watch Online",
          link: sHref,
          type: getLinkType(sHref)
        });
      }
      // Check for Drive/Instant links (hubdrive, hubcdn)
      else if (sText.toUpperCase().indexOf("DRIVE") !== -1 || sText.toUpperCase().indexOf("INSTANT") !== -1) {
        directLinks.push({
          title: sText || "Download",
          link: sHref,
          type: getLinkType(sHref)
        });
      }
      // Any other shortener link
      else if (sHref.indexOf("gadgetsweb.xyz") !== -1 || sHref.indexOf("hubdrive") !== -1 || sHref.indexOf("hubcloud") !== -1 || sHref.indexOf("hubcdn") !== -1) {
        directLinks.push({
          title: sText || "Download",
          link: sHref,
          type: getLinkType(sHref)
        });
      }
    }

    console.log("Episode links:", episodeLinks.length, "Quality links:", qualityLinks.length, "Direct links:", directLinks.length);

    // For series with episode links, group them properly
    if (episodeLinks.length > 0) {
      // Group episode links by episode number
      var episodeGroups = {};
      for (var ei = 0; ei < episodeLinks.length; ei++) {
        var epMatch = episodeLinks[ei].title.match(/episode\s*(\d+)/i);
        var epNum = epMatch ? epMatch[1] : "EP" + (ei + 1);
        if (!episodeGroups[epNum]) {
          episodeGroups[epNum] = [];
        }
        episodeGroups[epNum].push(episodeLinks[ei]);
      }
      
      // Add each episode group to linkList
      for (var epKey in episodeGroups) {
        if (episodeGroups.hasOwnProperty(epKey)) {
          var firstLink = episodeGroups[epKey][0] ? episodeGroups[epKey][0].link : "";
          linkList.push({
            title: "Episode " + epKey,
            link: firstLink,
            directLinks: episodeGroups[epKey]
          });
        }
      }
    }

    // Add quality links to linkList
    for (var q = 0; q < qualityLinks.length; q++) {
      linkList.push({
        title: qualityLinks[q].title,
        quality: qualityLinks[q].quality,
        link: qualityLinks[q].link,
        type: qualityLinks[q].type,
        directLinks: [{
          title: "Download",
          link: qualityLinks[q].link,
          type: qualityLinks[q].type
        }]
      });
    }

    // Add direct links (Drive/Instant/Watch) if they exist
    if (directLinks.length > 0) {
      // If we already have quality or episode links, add directLinks as a separate section
      if (linkList.length > 0) {
        var firstDirectLink = directLinks[0] ? directLinks[0].link : "";
        linkList.push({
          title: "Additional Links",
          link: firstDirectLink,
          directLinks: directLinks
        });
      } else {
        // No episode/quality links, use directLinks as main links
        var firstDL = directLinks[0] ? directLinks[0].link : "";
        linkList.push({
          title: title || "Downloads",
          link: firstDL,
          directLinks: directLinks
        });
      }
    }

    // FALLBACK: Original method for EPiSODE strong tags
    if (linkList.length === 0) {
      var episodeStrongs = $('strong:contains("EPiSODE")');
      console.log("Episode strong count:", episodeStrongs.length);

      for (var e = 0; e < episodeStrongs.length && e < 50; e++) {
        var epElement = episodeStrongs.eq(e);
        var epTitle = epElement.text().trim();
        var parent = epElement.parent();
        var grandParent = parent.parent();
        var greatGrandParent = grandParent.parent();

        var episodeLink =
          parent.find("a").attr("href") ||
          grandParent.find("a").attr("href") ||
          greatGrandParent.next().find("a").attr("href") ||
          greatGrandParent.next().next().find("a").attr("href") || "";

        if (episodeLink && episodeLink.indexOf("http") === 0) {
          directLinks.push({
            title: epTitle,
            link: episodeLink
          });
        }
      }

      if (directLinks.length > 0) {
        var firstFallbackLink = directLinks[0] ? directLinks[0].link : "";
        linkList.push({
          title: title || "Episodes",
          link: firstFallbackLink,
          directLinks: directLinks
        });
      }
    }

    // FALLBACK: Look for any quality links
    if (linkList.length === 0) {
      var qualityAnchors = container.find('a:contains("480"), a:contains("720"), a:contains("1080"), a:contains("2160"), a:contains("4K")');
      console.log("Quality anchor count:", qualityAnchors.length);

      for (var qa = 0; qa < qualityAnchors.length && qa < 20; qa++) {
        var qAnchor = qualityAnchors.eq(qa);
        var qText = qAnchor.text().trim();
        var qHref = qAnchor.attr("href");

        var quality = "";
        var qMatch = qText.match(/\b(480p|720p|1080p|2160p|4K)\b/i);
        if (qMatch) {
          quality = qMatch[0];
        }

        if (qHref && qHref.indexOf("http") === 0) {
          linkList.push({
            title: qText,
            quality: quality,
            link: qHref,
            directLinks: [{
              title: "Download",
              link: qHref,
              type: type
            }]
          });
        }
      }
    }

    console.log("Total linkList items:", linkList.length);

    return {
      title: title || "Unknown Title",
      synopsis: synopsis,
      image: image || "",
      poster: image || "",
      type: type,
      imdbId: imdbId,
      linkList: linkList
    };

  } catch (err) {
    console.error("getMetaData error:", err);
    return createEmptyMeta();
  }
}

function createEmptyMeta() {
  return {
    title: "",
    synopsis: "",
    image: "",
    poster: "",
    type: "movie",
    imdbId: "",
    linkList: []
  };
}
