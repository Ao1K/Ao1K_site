export default async function addCat(range: Range, textbox: string) {
  const src = '/angus.png';
  const img = document.createElement('img');
  img.src = src;
  img.alt = 'angus';

  const span = document.createElement('span');
  span.appendChild(img);

  range.insertNode(span);

  focusTextbox(textbox);
}

const focusTextbox = (textboxID: string) => {
  return new Promise<Selection | null>((resolve) => {
    const textbox = document.getElementById(textboxID) as HTMLElement;
    textbox.focus();
    setTimeout(() => resolve(window.getSelection()), 50);
  });
};