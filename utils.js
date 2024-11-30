function findMatchingBracket(tokens, startIndex, order) {
  const isAscending = order === "asc";
  const openBracket = isAscending ? "(" : ")";
  const closeBracket = isAscending ? ")" : "(";
  const increment = isAscending ? 1 : -1;
  const endCondition = isAscending ? (i) => i < tokens.length : (i) => i >= 0;

  let stack = 0;

  for (let i = startIndex; endCondition(i); i += increment) {
    if (tokens[i].value === openBracket) {
      stack++;
    } else if (tokens[i].value === closeBracket) {
      stack--;
      if (stack === 0) {
        return i;
      }
    }
  }

  return -1;
}

function flattenTokens(tokens) {
  const result = [];

  for (const element of tokens) {
    const currentToken = element;

    if (currentToken.type === "GROUP") {
      result.push(...flattenTokens(currentToken.value));
    } else {
      result.push(currentToken);
    }
  }

  return result;
}

function logExpression(tokens, separator) {
  return tokens.map((token) => token.value).join(separator);
}

function isOperandOrGroup(token) {
  return (
    token.type === "NUMBER" ||
    token.type === "VARIABLE" ||
    token.type === "GROUP"
  );
}

function printTreeRoot(node) {
  if (!node) return;

  printTree(node.right, "", false);

  console.log(node.value);

  printTree(node.left, "", true);
}

function printTree(node, prefix = "", isLeft = true) {
  if (!node) return;

  printTree(node.right, prefix + (isLeft ? "│   " : "    "), false);

  console.log(prefix + (isLeft ? "└── " : "┌── ") + node.value);

  printTree(node.left, prefix + (isLeft ? "    " : "│   "), true);
}

module.exports = {
  findMatchingBracket,
  flattenTokens,
  logExpression,
  isOperandOrGroup,
  printTreeRoot,
  printTree,
};
