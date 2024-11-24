export const urlEncodeKey: [string, string][] = [
  [' ','_'],
  [' ','_'],
];

export const urlDecodeKey: [string, string][] = [
  [' ','_'],
];

export const customEncodeURL = (key: string): string => {
  let encodedKey = key;
  urlEncodeKey.forEach(([from, to]) => {
    encodedKey = encodedKey.replace(new RegExp(from, 'g'), to);
  });
  return encodedKey;
}

export const customDecodeURL = (key: string): string => {
  let decodedKey = key;
  urlDecodeKey.forEach(([from, to]) => {
    decodedKey = decodedKey.replace(new RegExp(to, 'g'), from);
  });
  return decodedKey;
}