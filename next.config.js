module.exports = {
  async rewrites() {
    return [
      {
        source: '/sitemap',
        destination: '/api/sitemap',
      },
    ];
  },
};
