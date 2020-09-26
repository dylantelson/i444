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
    this.cells = {};
    this.updatedCells = {};
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
    this.updatedCells = {};
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
    if(this.noCircularDeps(ast, baseCellId) == false) {
      const msg = `Circular dependency error with ${baseCellId}`;
      throw new AppError('CIRCULAR_REF', msg);
    }
    if(ast.type === "num") {
      if(baseCellId in this.cells) {
        this.clearAsDependent(this.cells[baseCellId].ast, baseCellId);
        updates[baseCellId] = new CellInfo(baseCellId, expr, ast.value, this.cells[baseCellId].dep, ast);
      } else {
        updates[baseCellId] = new CellInfo(baseCellId, expr, ast.value, {}, ast);
      }
      updatesReturn[baseCellId] = updates[baseCellId].val;
    } else if(ast.type === "app") {
      if(baseCellId in this.cells) {
        //console.log("Found id! Will clear.");
        this.clearAsDependent(this.cells[baseCellId].ast, baseCellId);
      }
      const result = this.performNumericalOperation(ast, baseCellId);
      if(baseCellId in this.cells) {
        updates[baseCellId] = new CellInfo(baseCellId, expr, result, this.cells[baseCellId].dep, ast);
      } else {
        updates[baseCellId] = new CellInfo(baseCellId, expr, result, {}, ast);
      }
      updatesReturn[baseCellId] = result;
      this.addAsDependent(ast, baseCellId);
    } else {
      //it is a ref
      if(baseCellId in this.cells) {
        //console.log("Clearing...");
        this.clearAsDependent(this.cells[baseCellId].ast, baseCellId);
      }
      const referencedID = cellRefToCellId(ast.toString(baseCellId));
      if(referencedID in this.cells) {
        if(baseCellId in this.cells) {
          updates[baseCellId] = new CellInfo(baseCellId, expr, this.cells[referencedID].val, this.cells[baseCellId].dep, ast);
        } else {
          updates[baseCellId] = new CellInfo(baseCellId, expr, this.cells[referencedID].val, {}, ast);
        }
        updatesReturn[baseCellId] = updates[baseCellId].val;
      } else {
        //console.log("Making empty cell");
        this.cells[referencedID] = new CellInfo(referencedID, "", 0, {baseCellId: true}, {});
        if(baseCellId in this.cells) {
          updates[baseCellId] = new CellInfo(baseCellId, expr, 0, this.cells[baseCellId].dep, ast);
        } else {
          updates[baseCellId] = new CellInfo(baseCellId, expr, 0, {}, ast);
        }
        //console.log("keys: " + Object.keys(this.cells[referencedID].dep));
        updatesReturn[baseCellId] = updates[baseCellId].val;
      }
      this.addAsDependent(ast, baseCellId);
    }
    for(const prop in updates) {
      this.cells[prop] = updates[prop];
    }
    //console.log("testing: " + this.cells[baseCellId].id);
    //console.log("testingdeps " + Object.keys(this.cells[baseCellId].dep));
    this.updateDependents(this.cells[baseCellId]);
    if("a1" in this.cells) {
      //console.log("a1 dep: ");
      for(const prop in this.cells.a1.dep) {
        //console.log(prop + ": " + this.cells.a1.dep[prop]);
      }
      //console.log("Finished printing a1 dep.");
    }
    for(const id in this.cells) {
      //console.log(id + ": " + this.cells[id].val);
    }
    for(const updatedCell in this.updatedCells) {
      updatesReturn[updatedCell] = this.cells[updatedCell].val;
    }
    return updatesReturn;
  }

  performNumericalOperation(ast, baseCellId) {
    if(ast.type === "num") {
      return ast.value;
    } else if (ast.type === "app") {
      if(ast.kids.length === 2) {
        //console.log("length 2");
        return FNS[ast.fn](this.performNumericalOperation(ast.kids[0], baseCellId), this.performNumericalOperation(ast.kids[1], baseCellId));
      } else if(ast.kids.length === 1) {
        return FNS[ast.fn](0, this.performNumericalOperation(ast.kids[0], baseCellId));
      } else {
        console.log("Apparently an app-ast can have something other than 1-2 kids");
      }
    } else {
      //it is a ref
      const referencedID = cellRefToCellId(ast.toString(baseCellId));
      //console.log("referenced id: " + referencedID);
      if(referencedID in this.cells) {
        return this.cells[referencedID].val;
      } else {
        //console.log("Making empty cell");
        this.cells[referencedID] = new CellInfo(referencedID, "", 0, {baseCellId: true}, {});
        return 0;
      }
    }
  }

  clearAsDependent(ast, baseCellId) {
    if(Object.keys(ast).length == 0) return;
    if(ast.type === "ref") {
      const referencedID = cellRefToCellId(ast.toString(baseCellId));
      //console.log("Clearing " + baseCellId + " from " + referencedID);
      //console.log("referenced id for clearing dep: " + referencedID);
      delete this.cells[referencedID].dep[baseCellId];
    } else {
      //console.log("CHECKING a9 AST:");
      //console.log(inspect(ast, false, Infinity));
      if(ast.kids.length > 0) {
        for (const kid of ast.kids) {
          this.clearAsDependent(kid, baseCellId);
        }
      }
    }
    //console.log("a1 dep: " + this.cells.a1.dep);
  }

    addAsDependent(ast, baseCellId) {
    if(ast.type === "ref") {
      const referencedID = cellRefToCellId(ast.toString(baseCellId));
      //console.log("referenced id to add dep to: " + referencedID);
      //console.log("this.cells keys: " + Object.keys(this.cells));
      //console.log("ID latest: " + referencedID);
      this.cells[referencedID].dep[baseCellId] = true;
    } else {
      //console.log("In app section of addAsDep");
      //console.log("ast: ");
      //console.log(inspect(ast, false, Infinity));
      if(ast.kids.length > 0) {
        for (const kid of ast.kids) {
          //console.log("kid: " + kid);
          this.addAsDependent(kid, baseCellId);
        }
      }
    }
  }

  updateDependents(updatedCell) {
    //console.log("kioscos: " + Object.keys(updatedCell.dep));
    if(Object.keys(updatedCell.dep).length == 0) return;

    //console.log("Updating!");
    for(const dep in updatedCell.dep) {
      if(dep === "baseCellId") continue;
      //console.log(updatedCell.id + " has changed. Changing " + dep);
      const prevVal = this.cells[dep].val;
      this.cells[dep].val = this.performNumericalOperation(this.cells[dep].ast, dep);
      if(prevVal != this.cells[dep].val) {
        this.updatedCells[dep] = true;
      }
      this.updateDependents(this.cells[dep]);
    }
  }

  noCircularDeps(ast, baseCellId) {
    //console.log("Checking " + baseCellId);
    //console.log(inspect(ast, false, Infinity));
    if(ast.type === "ref") {
      const referencedID = cellRefToCellId(ast.toString(baseCellId));
      if(!(referencedID in this.cells)) return true;
      if(!(baseCellId in this.cells)) return true;
      if(referencedID in this.cells[baseCellId].dep) return false;
      else return true;
    } else if(ast.type === "app") {
      let noCircDeps = true;
      for(const kid of ast.kids) {
        if(this.noCircularDeps(kid, baseCellId) === false) noCircDeps = false;
      }
      return noCircDeps;
    } else {
      return true;
    }
  }

  // noCircularDeps(ast, baseCellId) {
  //   console.log("Checking " + baseCellId);
  //   console.log(inspect(ast, false, Infinity));
  //   if(ast.type === "ref") {
  //     const referencedID = cellRefToCellId(ast.toString(baseCellId));
  //     if(!(referencedID in this.cells)) return true;
  //     if(baseCellId in this.cells[referencedID].dep) return false;
  //     else return true;
  //   } else if(ast.type === "app") {
  //     const noCircDeps = true;
  //     for(const kid of ast.kids) {
  //       if(this.noCircularDeps(kid, baseCellId) === false) noCircDeps = false;
  //     }
  //     return noCircDeps;
  //   } else {
  //     return true;
  //   }
  // }
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
