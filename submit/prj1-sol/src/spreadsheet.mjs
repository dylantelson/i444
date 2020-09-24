import parse from './expr-parser.mjs';
import AppError from './app-error.mjs';
import { cellRefToCellId } from './util.mjs';

//use for development only
import { inspect } from 'util';

class CellInfo {
  constructor(id, expr, val, dep, ast) {
    this.id = id;
    this.expr = expr;
    this.val = val;
    this.dep = dep;
    this.ast = ast;
  }
}

export default class Spreadsheet {

  //factory method
  static async make() { return new Spreadsheet(); }

  constructor() {
    this.cells = {}
  }

  /** Set cell with id baseCellId to result of evaluating formula
   *  specified by the string expr.  Update all cells which are
   *  directly or indirectly dependent on the base cell.  Return an
   *  object mapping the id's of all dependent cells to their updated
   *  values.  User errors must be reported by throwing a suitable
   *  AppError object having code property set to `SYNTAX` for a
   *  syntax error and `CIRCULAR_REF` for a circular reference
   *  and message property set to a suitable error message.
   */
  async eval(baseCellId, expr) {
    const updates = {};
    const updatesReturn = {};
    const ast = parse(expr, baseCellId);
    console.log(inspect(ast, false, Infinity));
    //if (baseCellId in this.cells) {
      //console.log("expr: " + expr);
      //console.log("baseCellId: " + baseCellId);
      //this.cells[baseCellId] = expr;a
      //for (const prop in this.cells) {
        //console.log(`${prop}: ${this.cells[prop]}`);
      //}
    //}
    if(ast.type === "num") {
      console.log("Number found!");
      console.log("Number: " + ast.value);
      updates[baseCellId] = new CellInfo(baseCellId, expr, ast.value, ast.kids, ast);
      updatesReturn[baseCellId] = updates[baseCellId].val;
    } else if(ast.type === "app") {
      const result = this.performNumericalOperation(ast);

      updatesReturn[baseCellId] = result;
    }
    return updatesReturn;
  }

  performNumericalOperation(ast) {
    if(ast.type === "num") {
      return ast.value;
    } else if (ast.type === "app") {
      if(ast.kids.length === 2) {
        console.log("length 2");
        return FNS[ast.fn](this.performNumericalOperation(ast.kids[0]), this.performNumericalOperation(ast.kids[1]));
      } else if(ast.kids.length === 1) {
        return FNS[ast.fn](0, this.performNumericalOperation(ast.kids[0]));
      } else {
        console.log("Apparently an app-ast can have something other than 1-2 kids");
      }
    }
  }
}

//Map fn property of Ast type === 'app' to corresponding function.
const FNS = {
  '+': (a, b) => a + b,
  '-': (a, b=null) => b === null ? -a : a - b,
  '*': (a, b) => a * b,
  '/': (a, b) => a / b,
  min: (...args) => Math.min(...args),
  max: (...args) => Math.max(...args),
}


//@TODO add other classes, functions, constants etc as needed
