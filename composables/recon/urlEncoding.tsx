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
  // decode ~- before decoding - to avoid ~- being partially consumed as ~'
  // use a null-byte placeholder since it cannot appear in valid URL strings
  decodedKey = decodedKey.replace(/_/g, ' ');
  decodedKey = decodedKey.replace(/~-/g, '\x00');
  decodedKey = decodedKey.replace(/-/g, "'");
  decodedKey = decodedKey.replace(/\x00/g, '-');
  decodedKey = decodedKey.replace(/~S/g, '// Scramble of the day\n');

  // legacy compat. Old URLs had raw date dashes which decode as apostrophes; fix them back
  decodedKey = decodedKey.replace(/(\d{4})'(\d{2})'(\d{2})/g, '$1-$2-$3');

  return decodeDateComment(decodedKey);
}