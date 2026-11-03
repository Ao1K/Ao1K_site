import ts from 'typescript';

const NULLISH_FLAGS = ts.TypeFlags.Undefined | ts.TypeFlags.Null | ts.TypeFlags.Void;
const MOVE_LITERAL = /^(?:[UDRLFBudrlfb]3?'?|[UDRLFBudrlfbMESxyz]2?'?)$/;
const MOVE_NAME = /(?:^m|M)ove$|^tok(?:en)?$|Token$/;
const MOVE_CLASS_CHARS = /^[UDRLFBudrlfbMESxyzw23'\\]+$/;
const LAYER_LETTERS = /[UDRLFBudrlfbMESxyz]/g;
const PRIME_SUFFIX = /2'|'\??\$/;
const WHITESPACE_PATTERN = /^(?:\\s|\[\s*\\s\s*\]|\[ \]| )[+*]?$/;

const STRING_METHODS = new Set([
  'at',
  'charAt',
  'charCodeAt',
  'codePointAt',
  'endsWith',
  'includes',
  'indexOf',
  'lastIndexOf',
  'length',
  'match',
  'matchAll',
  'replace',
  'replaceAll',
  'search',
  'slice',
  'split',
  'startsWith',
  'substr',
  'substring',
]);

function isWhitespaceSeparator(node) {
  if (node?.type !== 'Literal') return false;
  if (typeof node.value === 'string') return /^[ \t]+$/.test(node.value);
  return Boolean(node.regex) && WHITESPACE_PATTERN.test(node.regex.pattern);
}

function isMoveNotationRegex(pattern) {
  if (pattern.includes("'") && PRIME_SUFFIX.test(pattern)) return true;
  const classBodies = pattern.match(/\[\^?[^\]]*\]/g) ?? [];
  return classBodies.some(classText => {
    const body = classText.replace(/^\[\^?/, '').replace(/\]$/, '');
    if (!MOVE_CLASS_CHARS.test(body)) return false;
    const layers = new Set(body.replace(/\\./g, '').match(LAYER_LETTERS) ?? []);
    return layers.size >= 2;
  });
}

function propertyName(node) {
  if (!node.computed && node.property.type === 'Identifier') return node.property.name;
  if (node.computed && node.property.type === 'Literal') return String(node.property.value);
  return null;
}

function expressionName(node) {
  if (node.type === 'Identifier') return node.name;
  if (node.type === 'MemberExpression' && !node.computed && node.property.type === 'Identifier') {
    return node.property.name;
  }
  if (node.type === 'TSNonNullExpression') return expressionName(node.expression);
  return null;
}

function createMoveTypeCheck(services) {
  function nonNullishMembers(type) {
    const members = type.isUnion() ? type.types : [type];
    return members.filter(member => !(member.flags & NULLISH_FLAGS));
  }

  function isMoveLiteralUnion(type) {
    const present = nonNullishMembers(type);
    return present.length > 0 && present.every(member => member.isStringLiteral() && MOVE_LITERAL.test(member.value));
  }

  function isPlainString(type) {
    const present = nonNullishMembers(type);
    return present.length > 0 && present.every(member => member.flags & ts.TypeFlags.String);
  }

  return function isMoveValue(node) {
    const type = services.getTypeAtLocation(node);
    if (isMoveLiteralUnion(type)) return true;
    const name = expressionName(node);
    return Boolean(name) && MOVE_NAME.test(name) && isPlainString(type);
  };
}

const noMoveParsing = {
  meta: {
    type: 'problem',
    docs: { description: 'Move notation is parsed only in utils/parser/.' },
    schema: [
      {
        type: 'object',
        properties: {
          allowWhitespaceSplit: { type: 'boolean' },
          allowSplitOn: { type: 'array', items: { type: 'string' } },
        },
        additionalProperties: false,
      },
    ],
    messages: {
      whitespaceSplit: 'Splitting text on whitespace parses moves. Use cube3x3.parse or parseTrusted.',
      moveAccess: "Reading the characters of a move ('{{name}}'). Use cube3x3.layer, amount, turns, or isRotation.",
      moveIndex: 'Indexing into a move. Use cube3x3.layer, amount, turns, or isRotation.',
      moveRegexTest: 'Testing a move with a regex. Use cube3x3.layer, amount, turns, or isRotation.',
      moveRegex: 'Regex matches move notation. Use cube3x3 operations instead.',
    },
  },
  create(context) {
    const { allowWhitespaceSplit = false, allowSplitOn = [] } = context.options[0] ?? {};
    const allowedSplitReceivers = new Set(allowSplitOn);
    const services = context.sourceCode.parserServices;
    const isMoveValue = services?.program ? createMoveTypeCheck(services) : null;

    return {
      Literal(node) {
        if (node.regex && isMoveNotationRegex(node.regex.pattern)) {
          context.report({ node, messageId: 'moveRegex' });
        }
      },
      CallExpression(node) {
        const callee = node.callee;
        if (callee.type !== 'MemberExpression') return;
        const name = propertyName(callee);
        if (name === 'split' && isWhitespaceSeparator(node.arguments[0])) {
          const isAllowedSplit = allowWhitespaceSplit || allowedSplitReceivers.has(expressionName(callee.object));
          if (!isAllowedSplit) context.report({ node, messageId: 'whitespaceSplit' });
          return;
        }
        const tested = node.arguments[0];
        if (isMoveValue && (name === 'test' || name === 'exec') && tested && isMoveValue(tested)) {
          context.report({ node, messageId: 'moveRegexTest' });
        }
      },
      MemberExpression(node) {
        if (!isMoveValue) return;
        const name = propertyName(node);
        const isIndex = node.computed && !(node.property.type === 'Literal' && typeof node.property.value === 'string');
        const isStringMethod = !node.computed && name !== null && STRING_METHODS.has(name);
        if (!isIndex && !isStringMethod) return;
        if (!isMoveValue(node.object)) return;
        if (isIndex) {
          context.report({ node, messageId: 'moveIndex' });
          return;
        }
        if (name === 'split' && node.parent.type === 'CallExpression' && isWhitespaceSeparator(node.parent.arguments[0])) return;
        context.report({ node, messageId: 'moveAccess', data: { name } });
      },
    };
  },
};

export default noMoveParsing;
