'use strict';
import '../styles/globals.css';
import 'prismjs/themes/prism-tomorrow.css';
import { useEffect } from 'react';
import Head from 'next/head';
import EchoTerminal from '../components/EchoTerminal';
import Script from 'next/script';
import ChristmasMood from '../components/ChristmasMood';

function MyApp({ Component, pageProps }) {
  return (
    <>
      <Head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>
      <span className="theme-bejamas" />
      <ChristmasMood />
      <EchoTerminal />
      <Script type="module" src="https://ajax.googleapis.com/ajax/libs/model-viewer/3.3.0/model-viewer.min.js" strategy="afterInteractive" />
      <Component {...pageProps} />
    </>
  );
}

export default MyApp;
