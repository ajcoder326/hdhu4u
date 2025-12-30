// HDHub4u Posts Module - SYNCHRONOUS VERSION for Rhino JS

var BASE_URL = "https://new1.hdhub4u.fo";

var headers = {
  "Cookie": "xla=s4t",
  "Referer": "https://google.com",
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36"
};

function getPosts(filter, page, providerContext) {
  console.log("getPosts called with filter:", filter, "page:", page);

  try {
    var url = BASE_URL + filter + "/page/" + page + "/";
    if (filter === "" || filter === "/") {
      url = BASE_URL + "/page/" + page + "/";
    }
    console.log("Fetching URL:", url);

    var response = axios.get(url, { headers: headers });
    console.log("Response received, data length:", response.data ? response.data.length : 0);

    if (!response.data) {
      console.error("No response data");
      return [];
    }

    var $ = cheerio.load(response.data);
    var posts = [];

    // Primary selector: ul.recent-movies > li.thumb
    var items = $("ul.recent-movies li.thumb");
    console.log("Found items:", items.length);

    for (var i = 0; i < items.length; i++) {
      try {
        var element = items.eq(i);
        var img = element.find("figure img");
        var link = element.find("a").first();

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
    }

    console.log("Found", posts.length, "posts");
    return posts;
  } catch (err) {
    console.error("getPosts error:", err.message || err);
    return [];
  }
}

function getSearchPosts(query, page, providerContext) {
  console.log("getSearchPosts called with query:", query, "page:", page);

  try {
    var url = BASE_URL + "/page/" + page + "/?s=" + encodeURIComponent(query);
    console.log("Search URL:", url);

    var response = axios.get(url, { headers: headers });
    console.log("Search response received, data length:", response.data ? response.data.length : 0);

    if (!response.data) {
      console.error("No search response data");
      return [];
    }

    var $ = cheerio.load(response.data);
    var posts = [];

    // Search results - try movie-grid
    var items = $("ul.movie-grid li.movie-card");
    console.log("Found search items:", items.length);

    for (var i = 0; i < items.length; i++) {
      try {
        var element = items.eq(i);
        var img = element.find("img").first();
        var link = element.find("a").first();
        var titleEl = element.find("h3");

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
    }

    // Fallback to recent-movies
    if (posts.length === 0) {
      var fallbackItems = $("ul.recent-movies li.thumb");
      console.log("Fallback items:", fallbackItems.length);

      for (var j = 0; j < fallbackItems.length; j++) {
        try {
          var el = fallbackItems.eq(j);
          var img2 = el.find("figure img");
          var link2 = el.find("a").first();

          var title2 = img2.attr("alt") || "";
          var href2 = link2.attr("href") || "";
          var image2 = img2.attr("src") || "";

          if (title2 && href2 && image2) {
            posts.push({
              title: title2.replace("Download", "").trim(),
              link: href2,
              image: image2
            });
          }
        } catch (e) {
          console.error("Error parsing fallback item:", e);
        }
      }
    }

    console.log("Found", posts.length, "search results");
    return posts;
  } catch (err) {
    console.error("getSearchPosts error:", err.message || err);
    return [];
  }
}
