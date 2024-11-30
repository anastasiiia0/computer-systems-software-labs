const { Token, Expression } = require("./task-1.js");
const {
  findMatchingBracket,
  flattenTokens,
  logExpression,
  isOperandOrGroup,
  printTreeRoot,
} = require("./utils.js");

const precedence = {
  "+": 1,
  "-": 1,
  "*": 2,
  "/": 2,
  "^": 3,
  sin: 4,
  cos: 4,
  tan: 4,
};

class Node {
  constructor(value) {
    this.value = value;
    this.left = null;
    this.right = null;
  }
}

function optimize(tokens) {
  let optimized = false;

  do {
    optimized = false;
    let stack = [];

    for (let i = 0; i < tokens.length; i++) {
      const currentToken = tokens[i];
      const prevToken = stack[stack.length - 1];
      const beforePrevToken = stack[stack.length - 2];
      const nextToken = tokens[i + 1];
      const afterNextToken = tokens[i + 2];

      // Унарний мінус
      if (
        currentToken.value === "-" &&
        (!prevToken || prevToken?.value === "(")
      ) {
        stack.push(new Token("NUMBER", "0", currentToken.position));
        stack.push(currentToken);
        optimized = true;
        continue;
      }

      // Помилка ділення на 0
      if (currentToken.value === "0" && prevToken?.value === "/") {
        throw new Error("Помилка: ділення на нуль.");
      }

      // Множення на 0
      if (currentToken.value === "0") {
        if (
          nextToken?.value === "*" &&
          (afterNextToken?.type === "VARIABLE" ||
            afterNextToken?.type === "NUMBER")
        ) {
          i += 2;
          stack.push(currentToken);
          optimized = true;
          continue;
        } else if (
          prevToken?.value === "*" &&
          (beforePrevToken?.type === "VARIABLE" ||
            beforePrevToken?.type === "NUMBER")
        ) {
          stack.pop();
          stack.pop();
          stack.push(currentToken);
          optimized = true;
          continue;
        } else if (
          nextToken?.value === "*" &&
          (afterNextToken?.type === "FUNCTION" || afterNextToken?.value === "(")
        ) {
          let closeBracketIndex = findMatchingBracket(tokens, i + 2, "asc");
          if (closeBracketIndex !== -1) {
            i = closeBracketIndex;
            stack.push(currentToken);
            optimized = true;
            continue;
          }
        } else if (prevToken?.value === "*" && beforePrevToken?.value === ")") {
          let openBracketIndex = findMatchingBracket(tokens, i - 2, "desc");

          if (openBracketIndex !== -1) {
            let startIndex = openBracketIndex;
            if (tokens[openBracketIndex - 1]?.type === "FUNCTION") {
              startIndex = openBracketIndex - 1;
            }
            while (startIndex < i) {
              stack.pop();
              startIndex++;
            }
            stack.push(currentToken);
            optimized = true;
            continue;
          }
        }
      }

      // Ділення 0 на вираз
      if (currentToken.value === "0" && nextToken?.value === "/") {
        if (
          afterNextToken?.value === "(" ||
          afterNextToken?.type === "FUNCTION"
        ) {
          let closeBracketIndex = findMatchingBracket(tokens, i + 2, "asc");
          if (closeBracketIndex !== -1) {
            stack.push(currentToken);
            i = closeBracketIndex;
            optimized = true;
            continue;
          }
        } else {
          stack.push(currentToken);
          i += 2;
          optimized = true;
          continue;
        }
      }

      // Множення/ділення на 1
      if (currentToken.value === "1") {
        if (nextToken?.value === "*") {
          i += 1;
          optimized = true;
          continue;
        } else if (prevToken?.value === "*" || prevToken?.value === "/") {
          stack.pop();
          optimized = true;
          continue;
        }
      }

      // Додавання/віднімання 0
      if (currentToken.value === "0") {
        if (prevToken?.value === "+" || prevToken?.value === "-") {
          stack.pop();
          optimized = true;
          continue;
        } else if (nextToken?.value === "+") {
          i += 1;
          optimized = true;
          continue;
        }
      }

      stack.push(currentToken);
    }

    tokens.length = 0;
    tokens.push(...stack);
  } while (optimized);

  return tokens;
}

function groupBrackets(tokens) {
  const result = [];
  let i = 0;

  while (i < tokens.length) {
    const currentToken = tokens[i];
    const nextToken = tokens[i + 1];

    if (currentToken.type === "FUNCTION") {
      let group = [];
      group.push(currentToken);
      group.push(nextToken);
      i++;

      const closingIndex = findMatchingBracket(tokens, i, "asc");

      const innerTokens = tokens.slice(i + 1, closingIndex);

      const groupedInnerTokens = groupBrackets(innerTokens);
      group.push(...groupedInnerTokens);
      group.push(tokens[closingIndex]);

      group = transform(group);

      let groupedTokens = new Token("GROUP", group);
      groupedTokens.isAlreadyGrouped = true;

      result.push(groupedTokens);

      i = closingIndex;
    } else if (currentToken.value === "(") {
      let group = [];
      group.push(currentToken);
      const closingIndex = findMatchingBracket(tokens, i, "asc");

      const innerTokens = tokens.slice(i + 1, closingIndex);

      const groupedInnerTokens = groupBrackets(innerTokens);
      group.push(...groupedInnerTokens);
      group.push(tokens[closingIndex]);

      group = transform(group);

      let groupedTokens = new Token("GROUP", group);
      groupedTokens.isAlreadyGrouped = true;

      result.push(groupedTokens);

      i = closingIndex;
    } else {
      result.push(currentToken);
    }

    i++;
  }

  return result;
}

function transform(tokens) {
  let groupedTokens = groupFunc(tokens, ["^"]);
  groupedTokens = optimizeSubtractionAndDivision(groupedTokens, "/");
  groupedTokens = groupFunc(groupedTokens, ["*", "/"]);
  groupedTokens = optimizeSubtractionAndDivision(groupedTokens, "-");
  groupedTokens = groupFunc(groupedTokens, ["+", "-"]);
  return groupedTokens;
}

function groupFunc(tokens, precedenceOperators) {
  let groupedTokens = [];
  let i = 0;
  let flag = false;

  const startLength = tokens.length;

  while (i < tokens.length) {
    const currentToken = tokens[i];
    const prevToken = groupedTokens[groupedTokens.length - 1];
    const nextToken = tokens[i + 1];

    if (precedenceOperators.includes(currentToken.value)) {
      if (isOperandOrGroup(prevToken) && isOperandOrGroup(nextToken)) {
        if (
          ((currentToken.value === "*" || currentToken.value === "+") &&
            prevToken.isAlreadyGrouped) ||
          nextToken.isAlreadyGrouped
        ) {
          groupedTokens.push(currentToken);
          flag = true;
        } else {
          let group = [];
          group.push(new Token("BRACKET", "("));
          group.push(groupedTokens.pop());
          group.push(currentToken);
          group.push(nextToken);
          group.push(new Token("BRACKET", ")"));

          const groupToken = new Token("GROUP", group);
          groupToken.isAlreadyGrouped = true;
          groupedTokens.push(groupToken);
          flag = true;
          i++;
        }
      } else {
        groupedTokens.push(currentToken);
      }
    } else {
      groupedTokens.push(currentToken);
    }
    i++;
  }

  for (let token of groupedTokens) {
    if (token.type === "GROUP") {
      token.isAlreadyGrouped = false;
    }
  }

  if (flag) {
    return groupFunc(groupedTokens, precedenceOperators);
  }

  return groupedTokens;
}

function optimizeSubtractionAndDivision(tokens, operator) {
  let i = 0;
  const result = [];

  while (i < tokens.length) {
    const currentToken = tokens[i];

    if (currentToken.value === operator) {
      const operandsList = [];

      let j;
      for (j = i; j < tokens.length; ) {
        if (tokens[j]?.value === operator) {
          operandsList.push(tokens[j + 1]);
          j += 2;
        } else {
          break;
        }
      }

      result.push(currentToken);

      if (operandsList.length >= 2) {
        let innerGroup = [];
        innerGroup.push(new Token("BRACKET", "("));

        for (let k = 0; k < operandsList.length; k++) {
          innerGroup.push(operandsList[k]);
          if (k < operandsList.length - 1) {
            operator === "-"
              ? innerGroup.push(new Token("OPERATOR", "+"))
              : innerGroup.push(new Token("OPERATOR", "*"));
          }
        }
        innerGroup.push(new Token("BRACKET", ")"));

        innerGroup = groupFunc(innerGroup, ["^"]);
        innerGroup = groupFunc(innerGroup, ["*", "/"]);
        innerGroup = groupFunc(innerGroup, ["+", "-"]);

        const groupToken = new Token("GROUP", innerGroup);
        groupToken.isAlreadyGrouped = true;
        result.push(groupToken);

        i = j - 1;
      } else {
        result.push(tokens[i + 1]);
        i++;
      }
    } else if (currentToken.type === "GROUP") {
      let groupedTokens = optimizeSubtractionAndDivision(
        currentToken.value,
        operator
      );

      groupedTokens = groupFunc(groupedTokens, ["^"]);
      groupedTokens = groupFunc(groupedTokens, ["*", "/"]);
      groupedTokens = groupFunc(groupedTokens, ["+", "-"]);

      const groupToken = new Token("GROUP", groupedTokens);
      groupToken.isAlreadyGrouped = true;
      result.push(groupToken);
    } else {
      result.push(currentToken);
    }

    i++;
  }

  return result;
}

function infixToPostfix(tokens) {
  const output = [];
  const stack = [];

  for (const token of tokens) {
    if (token.type === "NUMBER" || token.type === "VARIABLE") {
      output.push(token);
    } else if (token.value in precedence) {
      while (
        stack.length &&
        precedence[stack[stack.length - 1]?.value] >= precedence[token.value]
      ) {
        output.push(stack.pop());
      }
      stack.push(token);
    } else if (token.value === "(") {
      stack.push(token);
    } else if (token.value === ")") {
      while (stack.length && stack[stack.length - 1]?.value !== "(") {
        output.push(stack.pop());
      }
      stack.pop();
    }
  }

  while (stack.length) {
    output.push(stack.pop());
  }

  return output;
}

function buildExpressionTree(postfixTokens) {
  const stack = [];

  for (const token of postfixTokens) {
    if (token.type === "NUMBER" || token.type === "VARIABLE") {
      stack.push(new Node(token.value));
    } else if (token.value in precedence) {
      if (token.type !== "FUNCTION") {
        const rightNode = stack.pop();
        const leftNode = stack.pop();
        const operatorNode = new Node(token.value);
        operatorNode.left = leftNode;
        operatorNode.right = rightNode;
        stack.push(operatorNode);
      } else {
        const argNode = stack.pop();
        const functionNode = new Node(token.value);
        functionNode.left = argNode;
        stack.push(functionNode);
      }
    }
  }

  return stack.pop();
}

function analyze(expression) {
  expression.tokenize();
  expression.analyzeSyntax();
  if (expression.errors.length === 0) {
    optimize(expression.tokens);
    console.log(`\nПісля оптимізації: ${logExpression(expression.tokens, "")}`);

    let groupedTokens = groupBrackets(expression.tokens);
    groupedTokens = transform(groupedTokens);

    const flatTokens = flattenTokens(groupedTokens);
    // console.log(`Згрупований в дужки: ${logExpression(flatTokens, "")}`);

    const postfixExpression = infixToPostfix(flatTokens);
    console.log(
      `У постфіксній формі: ${logExpression(postfixExpression, " ")}`
    );

    let expressionTree = buildExpressionTree(postfixExpression);
    printTreeRoot(expressionTree);
  } else {
    expression.showErrors();
  }
}

try {
  //const expression = new Expression("a+b+c+d+e+f+g+h+i+j+k+l+m+n+o+p");
  //const expression = new Expression("(a+b)+(c+d)+(e+f)+(g+h)");
  const expression = new Expression("(a+b+5)*2+0*(0/5-(6+3+d))");

  console.log(`\nПочатковий вираз: ${expression.originalExpression}`);
  analyze(expression);
} catch (error) {
  console.error(error.message);
}
