// encode order matters: escape literal dashes before encoding apostrophes as dashes
// ~ is an unreserved URI character (RFC 3986) and won't be percent-encoded
export const urlEncodeKey: [string, string][] = [
  ['// Scramble of the day\n', '~S'],
  ['-','~-'],
  ["'","-"],
  [' ','_'],
];

// compact "// YYYY-MM-DD" → "~DYYYYMMDD" (saves 3 chars, avoids dash/space encoding)
const encodeDateComment = (s: string) =>
  s.replace(/\/\/ (\d{4})-(\d{2})-(\d{2})\n/g, '~D$1$2$3');

const decodeDateComment = (s: string) =>
  s.replace(/~D(\d{4})(\d{2})(\d{2})/g, '// $1-$2-$3\n');

export const customEncodeURL = (key: string): string => {
  let encodedKey = encodeDateComment(key);
  urlEncodeKey.forEach(([from, to]) => {
    encodedKey = encodedKey.replace(new RegExp(from, 'g'), to);
  });
  return encodedKey;
}

export const customDecodeURL = (key: string): string => {
  let decodedKey = key;
  [...urlEncodeKey].reverse().forEach(([from, to]) => {
    decodedKey = decodedKey.replace(new RegExp(to, 'g'), from);
  });

  // legacy compat. Old URLs had raw date dashes which decode as apostrophes; fix them back
  decodedKey = decodedKey.replace(/(\d{4})'(\d{2})'(\d{2})/g, '$1-$2-$3');

  return decodeDateComment(decodedKey);
}