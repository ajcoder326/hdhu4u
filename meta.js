var headers = {
  "Cookie": "xla=s4t",
  "Referer": "https://google.com",
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36 Edg/131.0.0.0"
};

async function getMetaData(link, providerContext) {
  try {
    var url = link;
    console.log("HDHub4u getMeta url:", url);
    
    var response = await axios.get(url, { headers: headers });
    var $ = cheerio.load(response.data);
    var container = $(".page-body");
    
    // Extract IMDB ID
    var imdbHref = container
      .find('a[href*="imdb.com/title/tt"]:not([href*="imdb.com/title/tt/"])')
      .attr("href") || "";
    var imdbId = imdbHref ? imdbHref.split("/")[4] || "" : "";
    
    // Extract title
    var title = container
      .find('h2[data-ved="2ahUKEwjL0NrBk4vnAhWlH7cAHRCeAlwQ3B0oATAfegQIFBAM"],h2[data-ved="2ahUKEwiP0pGdlermAhUFYVAKHV8tAmgQ3B0oATAZegQIDhAM"]')
      .text() || $("h1.title, .entry-title").first().text().trim() || $(".page-title").text().trim();
    
    // Determine content type
    var type = title.toLowerCase().indexOf("season") !== -1 ? "series" : "movie";
    
    // Extract synopsis
    var synopsis = container
      .find('strong:contains("DESCRIPTION")')
      .parent()
      .text()
      .replace("DESCRIPTION:", "")
      .trim() || $(".entry-content p").first().text().trim();
    
    // Extract image
    var image = container.find('img[decoding="async"]').attr("src") || 
                $(".entry-content img").first().attr("src") || "";
    
    // Extract download links
    var linkList = [];
    var directLinks = [];
    
    // Type 1: Episode links (for series)
    $('strong:contains("EPiSODE")').each(function(i, element) {
      var epTitle = $(element).parent().parent().text();
      var episodesLink = $(element)
        .parent()
        .parent()
        .parent()
        .next()
        .next()
        .find("a")
        .attr("href") ||
        $(element).parent().parent().parent().next().find("a").attr("href");
      
      if (episodesLink) {
        directLinks.push({
          title: epTitle,
          link: episodesLink
        });
      }
    });
    
    // Type 2: Alternative episode format
    if (directLinks.length === 0) {
      container.find('a:contains("EPiSODE")').each(function(i, element) {
        var epTitle = $(element).text();
        var episodesLink = $(element).attr("href");
        if (episodesLink) {
          directLinks.push({
            title: epTitle.toUpperCase(),
            link: episodesLink
          });
        }
      });
    }
    
    // Add collected episode links
    if (directLinks.length > 0) {
      linkList.push({
        title: title,
        directLinks: directLinks
      });
    }
    
    // Type 3: Quality-based movie links
    if (directLinks.length === 0) {
      container
        .find('a:contains("480"),a:contains("720"),a:contains("1080"),a:contains("2160"),a:contains("4K")')
        .each(function(i, element) {
          var linkText = $(element).text();
          var qualityMatch = linkText.match(/\b(480p|720p|1080p|2160p)\b/i);
          var quality = qualityMatch ? qualityMatch[0] : "";
          var movieLink = $(element).attr("href");
          
          if (movieLink) {
            linkList.push({
              title: linkText,
              quality: quality,
              directLinks: [
                { link: movieLink, title: "Movie", type: "movie" }
              ]
            });
          }
        });
    }
    
    // Type 4: HubCloud direct links
    container.find('a[href*="hubcloud"], a[href*="hubdrive"]').each(function(i, element) {
      var linkHref = $(element).attr("href");
      var linkText = $(element).text().trim() || "Download";
      
      if (linkHref) {
        // Check if link already exists
        var exists = false;
        for (var j = 0; j < linkList.length; j++) {
          if (linkList[j].directLinks) {
            for (var k = 0; k < linkList[j].directLinks.length; k++) {
              if (linkList[j].directLinks[k].link === linkHref) {
                exists = true;
                break;
              }
            }
          }
          if (exists) break;
        }
        
        if (!exists) {
          linkList.push({
            title: linkText,
            directLinks: [{ title: linkText, link: linkHref }]
          });
        }
      }
    });
    
    console.log("HDHub4u meta:", title, "type:", type, "links:", linkList.length);
    
    return {
      title: title,
      synopsis: synopsis,
      image: image,
      poster: image,
      imdbId: imdbId,
      type: type,
      linkList: linkList
    };
  } catch (err) {
    console.error("HDHub4u getMeta error:", err);
    return {
      title: "",
      synopsis: "",
      image: "",
      imdbId: "",
      type: "movie",
      linkList: []
    };
  }
}
