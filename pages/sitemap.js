import { SitemapStream, streamToPromise } from 'sitemap';
import { createGzip } from 'zlib';
import { Readable } from 'stream';
import { getPosts } from '../utils/mdx-utils'; // Importuj funkcję do uzyskiwania postów

export default async function generateSitemap(req, res) {
  try {
    const smStream = new SitemapStream({ hostname: 'https://lmk.one' });
    const pipeline = smStream.pipe(createGzip());

    // Dodaj wszystkie strony/posty do mapy witryny
    const posts = getPosts(); // Przykładowa funkcja do uzyskiwania postów
    posts.forEach((post) => {
      smStream.write({
        url: `/posts/${post.slug}`,
        changefreq: 'daily',
        priority: 0.7,
      });
    });

    smStream.end();

    // Wyślij odpowiedź
    pipeline.pipe(res).on('error', (e) => {
      throw e;
    });
  } catch (e) {
    res.status(500).end();
  }
}
