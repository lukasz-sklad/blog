import Link from 'next/link';
import { getPosts } from '../utils/mdx-utils';

import Footer from '../components/Footer';
import Header from '../components/Header';
import Layout, { GradientBackground } from '../components/Layout';
import ArrowIcon from '../components/ArrowIcon';
import { getGlobalData } from '../utils/global-data';
import SEO from '../components/SEO';

export default function Index({ posts, globalData }) {
  return (
    <Layout>
      <SEO 
  title={globalData.name} 
  description={globalData.blogTitle}
  posts={posts}
/>
      <Header name={globalData.name} />
      <main className="w-full">
        <h1 className="text-3xl lg:text-5xl text-center mb-12">
          {globalData.blogTitle}
        </h1>

        <div className="mb-10 p-6 rounded-2xl bg-gradient-to-r from-purple-900/40 via-indigo-900/30 to-blue-900/40 border border-purple-500/30 backdrop-blur-md shadow-xl text-center md:text-left md:flex items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/20 text-purple-300 text-xs font-semibold mb-2 uppercase tracking-wider">
              🚀 Wyróżniony projekt
            </div>
            <h2 className="text-xl md:text-2xl font-bold dark:text-white">
              *Craft Polska — Darmowe aplikacje online
            </h2>
            <p className="mt-1 text-sm md:text-base opacity-75 dark:text-gray-300">
              Alternatywa dla programów Adobe i pakietu Office: PhotoCraft (Photoshop), VectorCraft (Corel/Illustrator), SolidCraft (CAD 3D), Word & Excel w Twojej przeglądarce.
            </p>
          </div>
          <a
            href="https://craft.lmk.one/"
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 md:mt-0 inline-flex items-center justify-center px-6 py-3 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-semibold text-sm transition-all shadow-lg hover:shadow-purple-500/25 shrink-0"
          >
            Otwórz portal ↗
          </a>
        </div>

        <ul className="w-full">
          {posts.map((post) => (
            <li
              key={post.filePath}
              className="md:first:rounded-t-lg md:last:rounded-b-lg backdrop-blur-lg bg-white dark:bg-black dark:bg-opacity-30 bg-opacity-10 hover:bg-opacity-20 dark:hover:bg-opacity-50 transition border border-gray-800 dark:border-white border-opacity-10 dark:border-opacity-10 border-b-0 last:border-b hover:border-b hovered-sibling:border-t-0"
            >
              <Link
                as={`/posts/${post.filePath.replace(/\.mdx?$/, '')}`}
                href={`/posts/[slug]`}
              >
                <a className="py-6 lg:py-10 px-6 lg:px-16 block focus:outline-none focus:ring-4 transform-gpu will-change-transform">
  {post.data.date && (
    <p className="uppercase mb-3 font-bold opacity-60 relative z-10">
      {post.data.date}
    </p>
  )}
  <h2 className="text-2xl md:text-3xl relative z-10">{post.data.title}</h2>
  {post.data.summary && (
    <p className="mt-3 text-lg opacity-60 relative z-10">
      {post.data.summary}
    </p>
  )}
  <ArrowIcon className="mt-4 relative z-10" />
</a>
              </Link>
            </li>
          ))}
        </ul>
      </main>
      <Footer copyrightText={globalData.footerText} />
      <GradientBackground
        variant="large"
        className="fixed top-20 opacity-40 dark:opacity-60"
      />
      <GradientBackground
        variant="small"
        className="absolute bottom-0 opacity-20 dark:opacity-10"
      />
    </Layout>
  );
}

export function getStaticProps() {
  const posts = getPosts();
  const globalData = getGlobalData();

  return { props: { posts, globalData } };
}
