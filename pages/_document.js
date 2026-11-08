import React from 'react';
import Document, { Html, Head, Main, NextScript } from 'next/document';

class MyDocument extends Document {
  render() {
    return (
      <Html lang="en" className="theme-compiled">
        <Head>
          <link rel="icon" href="/favicon.ico" />
          <meta name="google-site-verification" content="C70Kgu31V4hqMt-LNOmmKVnmlT8z4h7W80R75qsqwj4" />
          <meta httpEquiv="onion-location" content="http://lmkone2duyasmunviw4ydkt2blqyjfr5mrj5kcsmcv5oplnpcsws72ad.onion" />
          {/* Hotjar Tracking Code for https://www.lmk.one */}
          <script
            dangerouslySetInnerHTML={{
              __html: `
                (function(h,o,t,j,a,r){
                    h.hj=h.hj||function(){(h.hj.q=h.hj.q||[]).push(arguments)};
                    h._hjSettings={hjid:6679038,hjsv:6};
                    a=o.getElementsByTagName('head')[0];
                    r=o.createElement('script');r.async=1;
                    r.src=t+h._hjSettings.hjid+j+h._hjSettings.hjsv;
                    a.appendChild(r);
                })(window,document,'https://static.hotjar.com/c/hotjar-','.js?sv=');
              `,
            }}
          />
        </Head>
        <body
          className={`antialiased text-lg bg-white dark:bg-gray-900 dark:text-white leading-base`}
        >
          <Main />
          <NextScript />
          {/* Netlify Forms Detection Blueprint for Kompas */}
          <form name="kompas-feedback" data-netlify="true" netlify-honeypot="bot-field" hidden>
            <input type="hidden" name="form-name" value="kompas-feedback" />
            <input type="hidden" name="bot-field" />
            <input type="text" name="name" />
            <input type="email" name="email" />
            <select name="topic">
              <option value="opinia">Opinia o aplikacji</option>
              <option value="pomysl">Propozycja ulepszenia / nowa funkcja</option>
              <option value="blad">Zgłoszenie błędu (Bug report)</option>
              <option value="inne">Inne</option>
            </select>
            <textarea name="message"></textarea>
          </form>
        </body>
      </Html>
    );
  }
}

export default MyDocument;
