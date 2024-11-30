const tokenTypes = [
  { regex: /^(sin|cos|tan)/, type: "FUNCTION" },
  { regex: /^[a-zA-Z_][a-zA-Z0-9_]*/, type: "VARIABLE" },
  { regex: /^\d+(\.\d+)?/, type: "NUMBER" },
  { regex: /^(\+|-|\*|\/|\^)/, type: "OPERATOR" },
  { regex: /^[()]/, type: "BRACKET" },
];

class Token {
  constructor(type, value, position) {
    this.type = type;
    this.value = value;
    this.position = position;
  }
}

class Expression {
  constructor(expression) {
    this.originalExpression = expression;
    this.tokens = [];
    this.errors = [];
  }

  tokenize() {
    let expression = this.originalExpression.trim();

    if (expression.length === 0) {
      this.errors.push("Вираз порожній");
      return;
    }

    let position = 0;
    while (expression.length > 0) {
      expression = expression.trim();
      let matched = false;

      for (const { regex, type } of tokenTypes) {
        const match = expression.match(regex);
        if (match) {
          this.tokens.push(new Token(type, match[0], position));
          expression = expression.slice(match[0].length);
          position += match[0].length;
          matched = true;
          break;
        }
      }

      if (!matched) {
        this.errors.push(
          `Лексична помилка на позиції ${position}: недопустимий символ '${expression[0]}'`
        );
        position++;
        expression = expression.slice(1);
      }
    }
  }

  checkStart() {
    const firstToken = this.tokens[0];

    if (
      (firstToken.type === "OPERATOR" &&
        firstToken.value !== "+" &&
        firstToken.value !== "-") ||
      (firstToken.type === "BRACKET" && firstToken.value === ")")
    ) {
      this.errors.push(
        `Помилка на позиції ${firstToken.position}: вираз не може починатися з '${firstToken.value}'.`
      );
    }
  }

  checkEnd() {
    const lastToken = this.tokens[this.tokens.length - 1];

    if (lastToken.type === "OPERATOR") {
      this.errors.push(
        `Помилка на позиції ${lastToken.position}: вираз не може закінчуватися оператором '${lastToken.value}'.`
      );
    }

    if (lastToken.type === "BRACKET" && lastToken.value === "(") {
      this.errors.push(
        `Помилка на позиції ${lastToken.position}: вираз не може закінчуватися відкриваючою дужкою.`
      );
    }

    if (lastToken.type === "FUNCTION") {
      this.errors.push(
        `Помилка на позиції ${lastToken.position}: вираз не може закінчуватися функцією.`
      );
    }
  }

  checkOperators() {
    for (let i = 0; i < this.tokens.length - 1; i++) {
      const currentToken = this.tokens[i];
      const nextToken = this.tokens[i + 1];

      if (
        (currentToken.type === "VARIABLE" ||
          currentToken.type === "NUMBER" ||
          currentToken.type === "FUNCTION") &&
        (nextToken.type === "VARIABLE" ||
          nextToken.type === "NUMBER" ||
          nextToken.type === "FUNCTION")
      ) {
        this.errors.push(
          `Помилка на позиції ${nextToken.position}: між '${currentToken.value}' та '${nextToken.value}' немає оператора.`
        );
      }

      if (
        currentToken.type === "FUNCTION" &&
        !(nextToken.type === "BRACKET" && nextToken.value === "(")
      ) {
        this.errors.push(
          `Помилка на позиції ${nextToken.position}: відсутня відкриваюча дужка для виразу функції.`
        );
      }

      if (currentToken.type === "OPERATOR" && nextToken.type === "OPERATOR") {
        this.errors.push(
          `Помилка на позиції ${nextToken.position}: більше однієї операції підряд '${currentToken.value}${nextToken.value}'.`
        );
      }

      if (
        currentToken.type === "BRACKET" &&
        currentToken.value === "(" &&
        nextToken.type === "OPERATOR" &&
        nextToken.value !== "+" &&
        nextToken.value !== "-"
      ) {
        this.errors.push(
          `Помилка на позиції ${nextToken.position}: оператор '${nextToken.value}' не може бути після відкриваючої дужки.`
        );
      }

      if (
        (currentToken.type === "VARIABLE" || currentToken.type === "NUMBER") &&
        nextToken.type === "BRACKET" &&
        nextToken.value === "("
      ) {
        this.errors.push(
          `Помилка на позиції ${nextToken.position}: між '${currentToken.value}' та відкриваючою дужкою немає оператора.`
        );
      }

      if (
        currentToken.type === "OPERATOR" &&
        nextToken.type === "BRACKET" &&
        nextToken.value === ")"
      ) {
        this.errors.push(
          `Помилка на позиції ${currentToken.position}: перед закриваючою дужкою не може бути оператора '${currentToken.value}'.`
        );
      }

      if (
        currentToken.type === "BRACKET" &&
        currentToken.value === ")" &&
        (nextToken.type === "VARIABLE" ||
          nextToken.type === "NUMBER" ||
          nextToken.type === "FUNCTION")
      ) {
        this.errors.push(
          `Помилка на позиції ${nextToken.position}: між закриваючою дужкою і наступним виразом немає оператора.`
        );
      }

      if (
        currentToken.type === "BRACKET" &&
        currentToken.value === "(" &&
        nextToken.type === "BRACKET" &&
        nextToken.value === ")"
      ) {
        this.errors.push(
          `Помилка на позиції ${nextToken.position}: дужки не містять виразу.`
        );
      }

      if (
        currentToken.type === "BRACKET" &&
        currentToken.value === ")" &&
        nextToken.type === "BRACKET" &&
        nextToken.value === "("
      ) {
        this.errors.push(
          `Помилка на позиції ${nextToken.position}: між дужками повинен бути оператор.`
        );
      }
    }
  }

  checkBrackets() {
    let counter = 0;
    let openingPositions = []; // store the positions of opening brackets

    for (const token of this.tokens) {
      if (token.value === "(") {
        counter++;
        openingPositions.push(token.position);
      } else if (token.value === ")") {
        counter--;
        if (counter < 0) {
          this.errors.push(
            `Помилка на позиції ${token.position}: зайва закриваюча дужка.`
          );
        } else {
          openingPositions.pop(); // remove the last opening bracket, if there is a corresponding closing bracket
        }
      }
    }

    while (openingPositions.length > 0) {
      const position = openingPositions.pop();
      this.errors.push(
        `Помилка на позиції ${position}: для цієї дужки немає закриваючої.`
      );
    }
  }

  showTokens() {
    console.log("\nТокени:");
    this.tokens.forEach((token) => {
      const positionStr = String(token.position).padEnd(3, " ");
      const typeStr = token.type.padEnd(10, " ");
      const valueStr = token.value.padEnd(10, " ");
      console.log(`| ${positionStr} | ${typeStr} | ${valueStr} |`);
    });
  }

  showErrors() {
    if (this.errors.length > 0) {
      console.log("\nПомилки:");
      this.errors.forEach((error) => {
        console.log(`- ${error}`);
      });
    } else console.log("\nПомилок не знайдено");
  }

  analyzeSyntax() {
    this.checkStart();
    this.checkEnd();
    this.checkOperators();
    this.checkBrackets();
  }
}

// try {
//   const expression = new Expression("3+(5*(10-4))-sin(45)");
//   console.log(`\nВираз: ${expression.originalExpression}`);
//   expression.tokenize();
//   expression.analyzeSyntax();
//   expression.showTokens();
//   expression.showErrors();
// } catch (error) {
//   console.error(error.message);
// }

module.exports = { Expression, Token };
