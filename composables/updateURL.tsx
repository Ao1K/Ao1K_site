
const replaceText = (text: string) => {
    const replacementTable: string[][] = [
        ['%C2%A0','_'],
        ['\n', '%0A'],
    ];

    replacementTable.forEach((replacement, i) => {
        text = text.replace(new RegExp(replacement[i][0], 'g'), replacement[i][1]);
    });
    return text;
  };

export default function updateURL(queryName: string, textToEncode: string) {

    if (!textToEncode) return;

    const currentParams = new URLSearchParams(window.location.search);

    const text = replaceText(textToEncode);
    const newParam = encodeURIComponent(text);

    currentParams.set(queryName, newParam);
    const newQueryString = currentParams.toString();
    window.history.replaceState({}, '', `${window.location.pathname}?${newQueryString}`); // used to use useRouter, but it was reloading the page

}
