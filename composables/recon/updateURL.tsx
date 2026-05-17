import { customEncodeURL } from './urlEncoding';

const replaceText = (text: string) => {
    while (text.endsWith('\n')) {
        text = text.slice(0, -1);
    }
    return customEncodeURL(text);
  };

export default function updateURL(queryName: string, textToEncode: string | null) {

  const currentParams = new URLSearchParams(window.location.search);

  if (!textToEncode) {
      if (currentParams.has(queryName)) {
          currentParams.delete(queryName);
          const newQueryString = currentParams.toString().replace(/%2C/gi, ',');
          window.history.pushState({}, '', `${window.location.pathname}?${newQueryString}`);
      }
      return;
  }

  const text = replaceText(textToEncode);

  currentParams.set(queryName, text);
  const newQueryString = currentParams.toString().replace(/%2C/gi, ',');
  window.history.pushState({}, '', `${window.location.pathname}?${newQueryString}`); // used to use useRouter, but it was reloading the page
}
