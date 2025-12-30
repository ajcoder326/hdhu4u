var BASE_URL = "https://new1.hdhub4u.fo";

var headers = {
  "Cookie": "xla=s4t",
  "Referer": "https://google.com",
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36"
};

async function getPosts(filter, page, providerContext) {
  console.log("getPosts called with filter:", filter, "page:", page);
  
  try {
    var url = BASE_URL + filter + "/page/" + page + "/";
    if (filter === "" || filter === "/") {
      url = BASE_URL + "/page/" + page + "/";
    }
    console.log("Fetching URL:", url);
    
    var response = await axios.get(url, { headers: headers });
    console.log("Response received, data length:", response.data ? response.data.length : 0);
    
    if (!response.data) {
      console.error("No response data");
      return [];
    }
    
    var $ = cheerio.load(response.data);
    var posts = [];
    
    // Primary selector: ul.recent-movies > li.thumb
    $("ul.recent-movies li.thumb").each(function(i, element) {
      try {
        var img = $(element).find("figure img");
        var link = $(element).find("a").first();
        
        var title = img.attr("alt") || "";
        var href = link.attr("href") || "";
        var image = img.attr("src") || "";
        
        if (title && href && image) {
          posts.push({
            title: title.replace("Download", "").trim(),
            link: href,
            image: image
          });
        }
      } catch (e) {
        console.error("Error parsing item:", e);
      }
    });
    
    console.log("Found", posts.length, "posts");
    return posts;
  } catch (err) {
    console.error("getPosts error:", err.message || err);
    return [];
  }
}

async function getSearchPosts(query, page, providerContext) {
  console.log("getSearchPosts called with query:", query, "page:", page);
  
  try {
    var url = BASE_URL + "/page/" + page + "/?s=" + encodeURIComponent(query);
    console.log("Search URL:", url);
    
    var response = await axios.get(url, { headers: headers });
    console.log("Search response received, data length:", response.data ? response.data.length : 0);
    
    if (!response.data) {
      console.error("No search response data");
      return [];
    }
    
    var $ = cheerio.load(response.data);
    var posts = [];
    
    // Search results use different selectors
    // Try movie-grid first (search results)
    $("ul.movie-grid li.movie-card").each(function(i, element) {
      try {
        var img = $(element).find("img").first();
        var link = $(element).find("a").first();
        var titleEl = $(element).find("h3");
        
        var title = titleEl.text() || img.attr("alt") || "";
        var href = link.attr("href") || "";
        var image = img.attr("src") || "";
        
        if (title && href && image) {
          posts.push({
            title: title.replace("Download", "").trim(),
            link: href,
            image: image
          });
        }
      } catch (e) {
        console.error("Error parsing search item:", e);
      }
    });
    
    // Fallback to recent-movies if no results
    if (posts.length === 0) {
      $("ul.recent-movies li.thumb").each(function(i, element) {
        try {
          var img = $(element).find("figure img");
          var link = $(element).find("a").first();
          
          var title = img.attr("alt") || "";
          var href = link.attr("href") || "";
          var image = img.attr("src") || "";
          
          if (title && href && image) {
            posts.push({
              title: title.replace("Download", "").trim(),
              link: href,
              image: image
            });
          }
        } catch (e) {
          console.error("Error parsing fallback item:", e);
        }
      });
    }
    
    console.log("Found", posts.length, "search results");
    return posts;
  } catch (err) {
    console.error("getSearchPosts error:", err.message || err);
    return [];
  }
}
