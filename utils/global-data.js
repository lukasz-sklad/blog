export const getGlobalData = () => {
  const name = process.env.BLOG_NAME
    ? decodeURI(process.env.BLOG_NAME)
    : '&&';
  const blogTitle = process.env.BLOG_TITLE
    ? decodeURI(process.env.BLOG_TITLE)
    : 'Wiążę mój miecz z twoją beznadziejną sprawą” – Elnor, Star Trek: Picard';
  const footerText = process.env.BLOG_FOOTER_TEXT
    ? decodeURI(process.env.BLOG_FOOTER_TEXT)
    : '';
    // : 'All rights reserved.';

  return {
    name,
    blogTitle,
    footerText,
  };
};
