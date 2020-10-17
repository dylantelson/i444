import AppError from './app-error.mjs';
import MemSpreadsheet from './mem-spreadsheet.mjs';

//use for development only
import { inspect } from 'util';

import mongo from 'mongodb';

//use in mongo.connect() to avoid warning
const MONGO_CONNECT_OPTIONS = { useUnifiedTopology: true };

import { createRequire } from 'module';
const require = createRequire(import.meta.url);

/**
 * User errors must be reported by throwing a suitable
 * AppError object having a suitable message property
 * and code property set as follows:
 *
 *  `SYNTAX`: for a syntax error.
 *  `CIRCULAR_REF` for a circular reference.
 *  `DB`: database error.
 */

export default class PersistentSpreadsheet {

  //factory method
  //connects to database, gets all data for persistance (will be transferred to memSpreadsheet), and calls the constructor
  static async make(dbUrl, spreadsheetName) {
    try {
      const mongo = require('mongodb').MongoClient;
      const client = await mongo.connect(dbUrl, MONGO_CONNECT_OPTIONS);
      const db = await client.db(spreadsheetName);
      const data = await db.collection(spreadsheetName).find({}).toArray();
      return new PersistentSpreadsheet(spreadsheetName, dbUrl, db, client, data);
    }
    catch (err) {
      const msg = `cannot connect to URL "${dbUrl}": ${err}`;
      throw new AppError('DB', msg);
    }
  }
  //The constructor keeps data for the name, URL, database, client, memSpreadsheet, data, and a boolean to see whether the previous persistant data has transferred to the memSpreadsheet yet. Could not figure out how to transfer here- always got errors when trying to call memSpreadsheet.eval() within this or even when calling another function from here, so I put it into dump() with the bool to check whether it's still valid or not.
  constructor(spreadsheetName, dbUrl, db, client, data) {
    this.spreadsheetName = spreadsheetName;
    this.dbUrl = dbUrl;
    this.db = db;
    this.client = client;
    this.memSpreadsheet = new MemSpreadsheet();
    this.data = data;
    this.hasTransferred = false;
  }

  /** Release all resources held by persistent spreadsheet.
   *  Specifically, close any database connections.
   */
  async close() {
    await this.client.close();
  }
  
  

  /** Set cell with id baseCellId to result of evaluating string
   *  formula.  Update all cells which are directly or indirectly
   *  dependent on the base cell.  Return an object mapping the id's
   *  of all dependent cells to their updated values.
   */
  async eval(baseCellId, myformula) {
    //Get the results of eval from memSpreadsheet, then update the database collection. If there is an error, call undo() in memSpreadsheet.
    const results = this.memSpreadsheet.eval(baseCellId, myformula);
    const myQuery = {name: baseCellId};
    const mySS = this.spreadsheetName;
    var newValues = { $set: {formula: myformula } };
    try {
      //const client = await mongo.connect(this.dbUrl, MONGO_CONNECT_OPTIONS);
      await this.db.collection(this.spreadsheetName).updateOne(
        myQuery,
        newValues,
        {upsert: true});
      return results;
    }
    catch (err) {
      this.memSpreadsheet.undo();
      const msg = `cannot update "${baseCellId}: ${err}`;
      throw new AppError('DB', msg);
      return null;
    }
  }

  /** return object containing formula and value for cell cellId 
   *  return { value: 0, formula: '' } for an empty cell.
   */
   //Just a wrapper function
  async query(cellId) {
    return this.memSpreadsheet.query(cellId); 
  }

  /** Clear contents of this spreadsheet */
  async clear() {
    try {
      //If clear is called, we want to make sure we don't end up adding in persistent data that may still be waiting to be inserted to the memSpreadsheet, so we set hasTransferred to true (transferring occurs in dump() if this is set to false)
      this.hasTransferred = true;
      //delete all documents in this spreadsheet collection, get memSpreadsheet to clear its data
      await this.db.collection(this.spreadsheetName).deleteMany( { } );
      return this.memSpreadsheet.clear();
    }
    catch (err) {
      const msg = `cannot drop collection ${this.spreadsheetName}: ${err}`;
      throw new AppError('DB', msg);
    }
  }

  /** Delete all info for cellId from this spreadsheet. Return an
   *  object mapping the id's of all dependent cells to their updated
   *  values.  
   */
  async delete(cellId) {
    let results;
    //Get the memSpreadsheet to delete the cell, then delete it in the database.
    results = this.memSpreadsheet.delete(cellId);
    //If the deleting did not actually change anything (meaning the cell already didn't exist), just return. 
    if(results === null) return;
    try {
      await this.db.collection(this.spreadsheetName).deleteOne(
        {name: cellId}
        );
    }
    catch (err) {
      //@TODO undo mem-spreadsheet operation
      const msg = `cannot delete ${cellId}: ${err}`;
      throw new AppError('DB', msg);
    }
    return results;
  }
  
  /** copy formula from srcCellId to destCellId, adjusting any
   *  relative cell references suitably.  Return an object mapping the
   *  id's of all dependent cells to their updated values. Copying
   *  an empty cell is equivalent to deleting the destination cell.
   */
  async copy(destCellId, srcCellId) {
    const srcFormula = this.memSpreadsheet._cells[srcCellId]?.getFormula();
    //If the source formula does not exist, we can just delete the destination cell.
    if (!srcFormula) {
      return await this.delete(destCellId);
    }
    else {
      //Get the copy results from the memSpreadsheet. Then, update the database. If anything goes wrong, catch the error and tell memSpreadsheet to undo the changes.
      try {
	const results = this.memSpreadsheet.copy(destCellId, srcCellId);
	for(const updatedCell in results) {
	  const myQuery = {name: updatedCell};
          const mySS = this.spreadsheetName;
          var newValues = { $set: {formula: this.memSpreadsheet._cells[updatedCell].getFormula() } };
          await this.db.collection(this.spreadsheetName).updateOne(
            myQuery,
            newValues,
            //this upsert makes it create a document rather than update if the document does not already exist
            {upsert: true});
	}
	return results;
      }
      catch (err) {
	this.memSpreadsheet.undo();
	throw err;
      }
    }
  }

  //If the data that should have persisted from before has not been transferred into the memSpreadsheet yet, do it now.
    //The reason I do it here is it was impossible to get it work from the constructor, it would give really strange errors.
    //This ensures all data persists before dumping the data.
    //this.data is where the data was stored in the make() function.
    //After this, it just calls the function in memSpreadsheet, which takes care of the sorting and such.
    //Returns all of the cells, sorted topologically and lexicographically.
  async dump() {
    if(this.hasTransferred === false) {
      for(let i = 0; i < this.data.length; i++) {
        const doc = this.data[i];
        this.memSpreadsheet.eval(doc.name, String(doc.formula));
      }
      this.hasTransferred = true;
    }
    return this.memSpreadsheet.dump();
  }

}

//@TODO auxiliary functions
