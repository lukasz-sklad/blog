import { SitemapStream } from 'sitemap';
import { createGzip } from 'zlib';
import { getPosts } from '../../utils/mdx-utils'; // Importuj funkcję do uzyskiwania postów

// Pierwsza funkcja
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

// Druga funkcja
export async function generateSitemapSecond(req, res) {
  try {
    // Twój kod generowania sitemap
  } catch (e) {
    res.status(500).end();
  }
}
