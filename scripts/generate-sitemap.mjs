const fs = require('fs');
const { SitemapStream, streamToPromise } = require('sitemap');
const { createGzip } = require('zlib');
const path = require('path');
const { getPosts, POSTS_PATH } = require('../utils/mdx-utils'); // Zaktualizuj ścieżkę

(async () => {
  try {
    const smStream = new SitemapStream({ hostname: 'https://lmk.one' });
    const pipeline = smStream.pipe(createGzip());
    const posts = getPosts();

    posts.forEach(({ slug }) => {
      smStream.write({
        url: `/posts/${slug}`,
        changefreq: 'daily',
        priority: 0.7,
      });
    });

    smStream.end();

    const sitemapPath = path.join(__dirname, '../public/sitemap.xml.gz');
    await streamToPromise(pipeline.pipe(fs.createWriteStream(sitemapPath)));

    console.log(`Sitemap została pomyślnie wygenerowana: ${sitemapPath}`);
  } catch (error) {
    console.error('Błąd podczas generowania mapy witryny:', error);
  }
})();
