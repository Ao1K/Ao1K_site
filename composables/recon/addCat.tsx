const cats = [
  '/cats/angus.png',
  '/cats/sharkie.jpg',
];

const catsShown: number[] = [];

// resets pool when every cat has been used
const getNextCat = () => {
  if (catsShown.length >= cats.length) catsShown.length = 0;

  let catIndex = Math.floor(Math.random() * cats.length);

  while (catsShown.includes(catIndex)) {
    catIndex = Math.floor(Math.random() * cats.length);
  }

  catsShown.push(catIndex);

  return catIndex;
};

export default async function addCat(range: Range, textbox: string) {
  const catIndex = getNextCat();
  const src = cats[catIndex] || '/cats/angus.png';
  const img = document.createElement('img');
  img.src = src;
  img.alt = src.split('/').pop() || 'cat';

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