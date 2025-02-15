import { urlEncodeKey } from './urlEncoding';

const replaceText = (text: string) => {
    while (text.endsWith('\n')) {
        text = text.slice(0, -1);
    }
    urlEncodeKey.forEach((replacement, i) => {
        //console.log('replacement:', replacement, JSON.stringify(text));
        text = text.replace(new RegExp(replacement[0], 'g'), replacement[1]);
        //console.log('text:', JSON.stringify(text));
    });

    return text;
  };

export default function updateURL(queryName: string, textToEncode: string | null) {

    const currentParams = new URLSearchParams(window.location.search);

    if (!textToEncode) {
        if (currentParams.has(queryName)) {
            currentParams.delete(queryName);
            const newQueryString = currentParams.toString();
            window.history.pushState({}, '', `${window.location.pathname}?${newQueryString}`);
        }
        return;
    }

    const text = replaceText(textToEncode);
    const newParam = encodeURIComponent(text);

    currentParams.set(queryName, newParam);
    const newQueryString = currentParams.toString();
    window.history.pushState({}, '', `${window.location.pathname}?${newQueryString}`); // used to use useRouter, but it was reloading the page
}
