type TokenType =
  | "identifier"
  | "number"
  | "string"
  | "boolean"
  | "operator"
  | "paren";

type Token = {
  type: TokenType;
  value: string;
};

type Node =
  | { type: "Logical"; operator: "AND" | "OR"; left: Node; right: Node }
  | {
      type: "Comparison";
      operator: "==" | "!=" | "<" | ">" | "<=" | ">=";
      left: Node;
      right: Node;
    }
  | { type: "Literal"; value: any }
  | { type: "Identifier"; path: string[] };

/**
 * Évaluateur d'expressions booléennes minimal (comparaisons + AND/OR).
 * Utilisé pour les conditions de tuples ReBAC.
 */
export class ExpressionEvaluator {
  /**
   * Évalue l'expression avec le scope fourni (object/context/condition).
   */
  evaluate(expression: string, scope: Record<string, any>): boolean {
    if (!expression.trim()) {
      return true;
    }

    const tokens = this.tokenize(expression);
    const parser = new Parser(tokens);
    const ast = parser.parseExpression();
    return this.evaluateNode(ast, scope);
  }

  /**
   * Convertit l'expression en une liste de jetons.
   */
  private tokenize(expression: string): Token[] {
    const tokens: Token[] = [];
    let i = 0;
    const length = expression.length;

    while (i < length) {
      const char = expression[i];

      if (/\s/.test(char)) {
        i++;
        continue;
      }

      if (char === "(" || char === ")") {
        tokens.push({ type: "paren", value: char });
        i++;
        continue;
      }

      if (char === "'" || char === '"') {
        const quote = char;
        i++;
        let value = "";
        while (i < length && expression[i] !== quote) {
          if (expression[i] === "\\" && i + 1 < length) {
            value += expression[i + 1];
            i += 2;
          } else {
            value += expression[i];
            i++;
          }
        }
        if (expression[i] !== quote) {
          throw new Error("Sous-chaîne non terminée dans l'expression");
        }
        i++; // skip closing quote
        tokens.push({ type: "string", value });
        continue;
      }

      const twoCharOp = expression.slice(i, i + 2);
      if (twoCharOp === "==" || twoCharOp === "!=" || twoCharOp === ">=" || twoCharOp === "<=") {
        tokens.push({ type: "operator", value: twoCharOp });
        i += 2;
        continue;
      }

      if (char === "<" || char === ">") {
        tokens.push({ type: "operator", value: char });
        i++;
        continue;
      }

      if (/[0-9]/.test(char)) {
        let value = char;
        i++;
        while (i < length && /[0-9.]/.test(expression[i])) {
          value += expression[i];
          i++;
        }
        tokens.push({ type: "number", value });
        continue;
      }

      if (/[A-Za-z_]/.test(char)) {
        let value = char;
        i++;
        while (i < length && /[A-Za-z0-9_\.]/.test(expression[i])) {
          value += expression[i];
          i++;
        }

        const upper = value.toUpperCase();
        if (upper === "AND" || upper === "OR") {
          tokens.push({ type: "operator", value: upper });
          continue;
        }

        if (upper === "TRUE" || upper === "FALSE") {
          tokens.push({ type: "boolean", value: upper.toLowerCase() });
          continue;
        }

        tokens.push({ type: "identifier", value });
        continue;
      }

      throw new Error(`Caractère inattendu: ${char}`);
    }

    return tokens;
  }

  /**
   * Explore l'AST et renvoie un booléen final.
   */
  private evaluateNode(node: Node, scope: Record<string, any>): boolean {
    switch (node.type) {
      case "Logical": {
        if (node.operator === "AND") {
          return (
            this.toBoolean(this.evaluateNode(node.left, scope)) &&
            this.toBoolean(this.evaluateNode(node.right, scope))
          );
        }
        return (
          this.toBoolean(this.evaluateNode(node.left, scope)) ||
          this.toBoolean(this.evaluateNode(node.right, scope))
        );
      }
      case "Comparison": {
        const left = this.resolveValue(node.left, scope);
        const right = this.resolveValue(node.right, scope);
        switch (node.operator) {
          case "==":
            return left === right;
          case "!=":
            return left !== right;
          case "<":
            return (left as any) < (right as any);
          case ">":
            return (left as any) > (right as any);
          case "<=":
            return (left as any) <= (right as any);
          case ">=":
            return (left as any) >= (right as any);
          default:
            return false;
        }
      }
      case "Identifier":
        return this.toBoolean(this.resolvePath(scope, node.path));
      case "Literal":
        return this.toBoolean(node.value);
      default:
        return false;
    }
  }

  private resolveValue(node: Node, scope: Record<string, any>): any {
    if (node.type === "Literal") {
      return node.value;
    }
    if (node.type === "Identifier") {
      return this.resolvePath(scope, node.path);
    }
    return this.evaluateNode(node, scope);
  }

  private resolvePath(scope: Record<string, any>, path: string[]): any {
    return path.reduce((acc: any, segment) => {
      if (acc === null || acc === undefined) {
        return undefined;
      }
      return acc[segment];
    }, scope);
  }

  private toBoolean(value: any): boolean {
    return Boolean(value);
  }
}

/**
 * Parser descendant récursif pour les expressions booléennes.
 */
class Parser {
  private current = 0;

  constructor(private readonly tokens: Token[]) {}

  parseExpression(): Node {
    const expr = this.parseOr();
    if (this.current < this.tokens.length) {
      throw new Error("Expression invalide");
    }
    return expr;
  }

  private parseOr(): Node {
    let node = this.parseAnd();

    while (this.match("operator", "OR")) {
      const right = this.parseAnd();
      node = { type: "Logical", operator: "OR", left: node, right };
    }

    return node;
  }

  private parseAnd(): Node {
    let node = this.parseComparison();

    while (this.match("operator", "AND")) {
      const right = this.parseComparison();
      node = { type: "Logical", operator: "AND", left: node, right };
    }

    return node;
  }

  private parseComparison(): Node {
    let node = this.parsePrimary();

    if (
      this.match("operator", "==") ||
      this.match("operator", "!=") ||
      this.match("operator", "<") ||
      this.match("operator", ">") ||
      this.match("operator", "<=") ||
      this.match("operator", ">=")
    ) {
      const operator = this.previous().value as
        | "=="
        | "!="
        | "<"
        | ">"
        | "<="
        | ">=";
      const right = this.parsePrimary();
      node = { type: "Comparison", operator, left: node, right };
    }

    return node;
  }

  private parsePrimary(): Node {
    const token = this.peek();

    if (!token) {
      throw new Error("Expression incomplète");
    }

    if (token.type === "paren" && token.value === "(") {
      this.advance();
      const expr = this.parseOr();
      this.consume("paren", ")");
      return expr;
    }

    if (token.type === "string") {
      this.advance();
      return { type: "Literal", value: token.value };
    }

    if (token.type === "number") {
      this.advance();
      return { type: "Literal", value: parseFloat(token.value) };
    }

    if (token.type === "boolean") {
      this.advance();
      return { type: "Literal", value: token.value === "true" };
    }

    if (token.type === "identifier") {
      this.advance();
      return { type: "Identifier", path: token.value.split(".") };
    }

    throw new Error(`Jeton inattendu: ${token.value}`);
  }

  private match(type: TokenType, value?: string): boolean {
    const token = this.peek();
    if (!token || token.type !== type) {
      return false;
    }
    if (value && token.value !== value) {
      return false;
    }
    this.advance();
    return true;
  }

  private consume(type: TokenType, value: string): void {
    const token = this.peek();
    if (!token || token.type !== type || token.value !== value) {
      throw new Error(`Jeton attendu: ${value}`);
    }
    this.advance();
  }

  private advance(): Token {
    if (this.current < this.tokens.length) {
      this.current++;
    }
    return this.tokens[this.current - 1];
  }

  private peek(): Token | undefined {
    return this.tokens[this.current];
  }

  private previous(): Token {
    return this.tokens[this.current - 1];
  }
}
