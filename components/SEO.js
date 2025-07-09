import Head from 'next/head';

export default function SEO({ title, description, posts }) {
  return (
    <Head>
      <title>{title}</title>
      <meta name="description" content={description} />
      {posts && posts.map((post, index) => (
        <meta 
          key={index} 
          property="og:description" 
          content={post.data.description || description} 
        />
      ))}
      {/* Inne meta tagi... */}
    </Head>
  );
}
