import '../styles/globals.css';
import 'prismjs/themes/prism-tomorrow.css';
import { hotjar } from 'react-hotjar'
import { useEffect } from 'react'



function MyApp({ Component, pageProps }) {
  useEffect(() => {
    hotjar.initialize(3339999, 6)
  }, [])
  return (
    <>
      <span className="theme-bejamas" />
      <Component {...pageProps} />
    </>
  );
}

export default MyApp;
