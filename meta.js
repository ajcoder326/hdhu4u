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

    // Method 1: Find Episode links (for series)
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
        greatGrandParent.next().next().find("a").attr("href") ||
        "";

      if (episodeLink && episodeLink.indexOf("http") === 0) {
        directLinks.push({
          title: epTitle,
          link: episodeLink
        });
      }
    }

    // Method 2: Find Episode links using anchor tags
    if (directLinks.length === 0) {
      var episodeAnchors = container.find('a:contains("EPiSODE")');
      console.log("Episode anchor count:", episodeAnchors.length);

      for (var ea = 0; ea < episodeAnchors.length && ea < 50; ea++) {
        var anchor = episodeAnchors.eq(ea);
        var anchorText = anchor.text().trim().toUpperCase();
        var anchorHref = anchor.attr("href");

        if (anchorHref && anchorHref.indexOf("http") === 0) {
          directLinks.push({
            title: anchorText,
            link: anchorHref
          });
        }
      }
    }

    if (directLinks.length > 0) {
      linkList.push({
        title: title || "Episodes",
        directLinks: directLinks
      });
      console.log("Found", directLinks.length, "episode links");
    }

    // Method 3: Find Quality-based download links
    if (directLinks.length === 0) {
      var qualityLinks = container.find('a:contains("480"), a:contains("720"), a:contains("1080"), a:contains("2160"), a:contains("4K")');
      console.log("Quality link count:", qualityLinks.length);

      for (var q = 0; q < qualityLinks.length && q < 20; q++) {
        var qAnchor = qualityLinks.eq(q);
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
            directLinks: [{
              title: "Download",
              link: qHref,
              type: type
            }]
          });
        }
      }
      console.log("Found", linkList.length, "quality links");
    }

    // Method 4: Find HubCloud/HubDrive direct links
    if (linkList.length === 0) {
      var hubLinks = container.find('a[href*="hubcloud"], a[href*="hubdrive"], a[href*="hubcdn"]');
      console.log("Hub link count:", hubLinks.length);

      for (var h = 0; h < hubLinks.length && h < 10; h++) {
        var hubAnchor = hubLinks.eq(h);
        var hubText = hubAnchor.text().trim() || "Download";
        var hubHref = hubAnchor.attr("href");

        if (hubHref) {
          linkList.push({
            title: hubText,
            directLinks: [{
              title: "Stream",
              link: hubHref
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
