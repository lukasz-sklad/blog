import '../styles/globals.css';
import 'prismjs/themes/prism-tomorrow.css';
import { useEffect } from 'react'
import { hotjar } from 'react-hotjar'




// function MyApp({ Component, pageProps }) {
//   useEffect(() => {
//     hotjar.initialize(3339999, 6)
//   }, [])
//   return (
//     <>
//       <span className="theme-bejamas" />
//       <Component {...pageProps} />
//     </>
//   );
// }

// export default MyApp;




// import { hotjar } from 'react-hotjar';

const HOTJAR_ID = 3339999; // rzeczywiste ID Hotjar
const HOTJAR_VERSION = 6;  // wersja Hotjar

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
      
      <Component {...pageProps} />

    </>
  );
}

export default MyApp;


