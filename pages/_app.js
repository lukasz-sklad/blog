'use strict';
import '../styles/globals.css';
import 'prismjs/themes/prism-tomorrow.css';
import { useEffect } from 'react';
import Head from 'next/head';
import { hotjar } from 'react-hotjar';
import EchoTerminal from '../components/EchoTerminal';
import Script from 'next/script';
import ChristmasMood from '../components/ChristmasMood';

const HOTJAR_ID = 3339999; // rzeczywiste ID Hotjar
const HOTJAR_VERSION = 6; // wersja Hotjar

function MyApp({ Component, pageProps }) {
  useEffect(() => {
    console.log('Inicjalizacja Hotjar');
    hotjar.initialize(HOTJAR_ID, HOTJAR_VERSION);
    console.log('Hotjar zainicjalizowany');
    console.log('HOTJAR_ID:', HOTJAR_ID);
    console.log('HOTJAR_SV:', HOTJAR_VERSION);
    hotjar.initialize(HOTJAR_ID, HOTJAR_VERSION);
  }, []);

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
