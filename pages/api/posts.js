import { getPosts } from '../../utils/mdx-utils';

export default function handler(req, res) {
  const posts = getPosts();
  // Zwracamy tylko potrzebne dane, żeby nie przesyłać treści całych artykułów
  const simplifiedPosts = posts.map((post) => ({
    title: post.data.title,
    slug: post.filePath.replace(/\.mdx?$/, ''), // To jest "techniczny" slug (nazwa pliku)
    customSlug: post.data.slug, // To jest "ładny" slug z frontmattera
    date: post.data.date,
    description: post.data.description || post.data.summary || '',
  }));

  res.status(200).json(simplifiedPosts);
}
