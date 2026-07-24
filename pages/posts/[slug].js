import { getGlobalData } from '../../utils/global-data';
import {
  getNextPostBySlug,
  getPostBySlug,
  getPreviousPostBySlug,
  postFilePaths,
} from '../../utils/mdx-utils';

import { MDXRemote } from 'next-mdx-remote';
import Head from 'next/head';
import Link from 'next/link';
import ArrowIcon from '../../components/ArrowIcon';
import CustomLink from '../../components/CustomLink';
import Footer from '../../components/Footer';
import Header from '../../components/Header';
import Layout, { GradientBackground } from '../../components/Layout';
import SEO from '../../components/SEO';
import InteractiveGame from '../../components/InteractiveGame';
import EchoTerminal from '../../components/EchoTerminal';
import CodeBlock from '../../components/CodeBlock';
import VideoPlayer from '../../components/VideoPlayer';
import ThreeDModel from '../../components/ThreeDModel';
import SpeechControl from '../../components/SpeechControl';

// Custom components/renderers to pass to MDX.
// Since the MDX files aren't loaded by webpack, they have no knowledge of how
// to handle import statements. Instead, you must include components in scope
// here.
const components = {
  a: CustomLink,
  pre: CodeBlock,
  // It also works with dynamically-imported components, which is especially
  // useful for conditionally loading components for certain routes.
  // See the notes in README.md for more details.
  Head,
  InteractiveGame,
  EchoTerminal,
  VideoPlayer,
  ThreeDModel,
  SpeechControl,
};

export default function PostPage({
  source,
  frontMatter,
  prevPost,
  nextPost,
  globalData,
}) {
  return (
    <Layout>
      <SEO
        title={`${frontMatter.title} - ${globalData.name}`}
        description={frontMatter.description}
      />
      <Header name={globalData.name} />
      <article className="px-6 md:px-0 break-words overflow-wrap-anywhere">
  <header>
    <h1 className="text-3xl md:text-5xl dark:text-white text-center mb-12 break-words">
      {frontMatter.title}
    </h1>
    {frontMatter.summary && (
      <p className="text-xl mb-4 break-words">{frontMatter.summary}</p>
    )}
    <SpeechControl mode="post" />
  </header>
        <main>
          <article className="prose dark:prose-dark">
            <MDXRemote {...source} components={components} />
          </article>
        </main>
        <div className="grid md:grid-cols-2 gap-0 lg:-mx-24 mt-12">
          {prevPost && (
            <Link href={`/posts/${prevPost.slug}`}>
              <a className={`h-full transform-gpu will-change-transform backdrop-blur-lg bg-white dark:bg-black dark:bg-opacity-30 bg-opacity-10 hover:bg-opacity-20 dark:hover:bg-opacity-50 transition border border-gray-800 dark:border-white border-opacity-10 dark:border-opacity-10 flex flex-col min-w-0 py-8 px-10 text-center md:text-right justify-center ${
                nextPost 
                  ? 'rounded-t-lg border-b-0 md:rounded-none md:rounded-l-lg md:border-b md:border-r-0' 
                  : 'rounded-lg'
              }`}>
                <p className="uppercase text-gray-500 mb-4 dark:text-white dark:opacity-60 relative z-10">
                  Poprzedni
                </p>
                <h4 className="text-xl md:text-2xl text-gray-700 mb-6 dark:text-white break-words relative z-10">
                  {prevPost.title}
                </h4>
                <ArrowIcon className="transform rotate-180 mx-auto md:mr-0 relative z-10" />
              </a>
            </Link>
          )}
          {nextPost && (
            <Link href={`/posts/${nextPost.slug}`}>
              <a className={`h-full transform-gpu will-change-transform backdrop-blur-lg bg-white dark:bg-black dark:bg-opacity-30 bg-opacity-10 hover:bg-opacity-20 dark:hover:bg-opacity-50 transition border border-gray-800 dark:border-white border-opacity-10 dark:border-opacity-10 flex flex-col min-w-0 py-8 px-10 text-center md:text-left justify-center ${
                prevPost
                  ? 'rounded-b-lg md:rounded-none md:rounded-r-lg'
                  : 'rounded-lg'
              }`}>
                <p className="uppercase text-gray-500 mb-4 dark:text-white dark:opacity-60 relative z-10">
                  Następny
                </p>
                <h4 className="text-xl md:text-2xl text-gray-700 mb-6 dark:text-white break-words relative z-10">
                  {nextPost.title}
                </h4>
                <ArrowIcon className="mx-auto md:ml-0 relative z-10" />
              </a>
            </Link>
          )}
        </div>
      </article>
      <Footer copyrightText={globalData.footerText} />
      <GradientBackground
        variant="large"
        className="absolute -top-32 opacity-30 dark:opacity-50"
      />
      <GradientBackground
        variant="small"
        className="absolute bottom-0 opacity-20 dark:opacity-10"
      />
    </Layout>
  );
}

export const getStaticProps = async ({ params }) => {
  const globalData = getGlobalData();
  const { mdxSource, data } = await getPostBySlug(params.slug);
  const prevPost = getPreviousPostBySlug(params.slug);
  const nextPost = getNextPostBySlug(params.slug);

  return {
    props: {
      globalData,
      source: mdxSource,
      frontMatter: data,
      prevPost,
      nextPost,
    },
  };
};

export const getStaticPaths = async () => {
  const paths = postFilePaths
    // Remove file extensions for page paths
    .map((path) => path.replace(/\.mdx?$/, ''))
    // Map the path into the static paths object required by Next.js
    .map((slug) => ({ params: { slug } }));

  return {
    paths,
    fallback: false,
  };
};
