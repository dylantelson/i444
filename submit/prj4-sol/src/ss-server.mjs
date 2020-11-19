import Path from 'path';

import express from 'express';
import bodyParser from 'body-parser';

import querystring from 'querystring';

import {AppError, Spreadsheet} from 'cs544-ss';

import Mustache from './mustache.mjs';

const STATIC_DIR = 'statics';
const TEMPLATES_DIR = 'templates';

//some common HTTP status codes; not all codes may be necessary
const OK = 200;
const CREATED = 201;
const NO_CONTENT = 204;
const BAD_REQUEST = 400;
const NOT_FOUND = 404;
const CONFLICT = 409;
const SERVER_ERROR = 500;

let currSS = "testSpreadsheet";
let pageErrors = {};

const __dirname = Path.dirname(new URL(import.meta.url).pathname);

export default function serve(port, store) {
  process.chdir(__dirname);
  const app = express();
  app.locals.port = port;
  app.locals.store = store;
  app.locals.mustache = new Mustache();
  app.use('/', express.static(STATIC_DIR));
  setupRoutes(app);
  app.listen(port, function() {
    console.log(`listening on port ${port}`);
  });
}


/*********************** Routes and Handlers ***************************/

function setupRoutes(app) {
  app.use(bodyParser.urlencoded({extended: true}));
  
  app.get("/", introPage(app));
  app.get(`/ss/:ssName`, ssGet(app));
  app.post("/", introSubmit(app));
  app.post("/ss/:ssName", ssUpdate(app));
  //must be last
  app.use(do404(app));
  app.use(doErrors(app));

}

//@TODO add handlers

function introPage(app) {
    return async function(req, res) {
        res.send(app.locals.mustache.render('intro', {intro: [{msg: "Hello World", }] }));
  };
}

function introSubmit(app) {
    return async function(req, res) {
    	const ssName = req.body["ssName"];
    	const errors = {};
    	if(validateField("ssName", {"ssName": ssName}, errors))
    	    res.redirect(`/ss/${ssName}`);
    	else {
    	  res.send(app.locals.mustache.render('intro', {intro: [{msg: "Hello World", Error: errors["ssName"]}]}));
    	}
    }
}

function ssGet(app) {
    return async function(req, res) {
    	const mySp = await Spreadsheet.make(req.url.substring(req.url.lastIndexOf('/') + 1), app.locals.store);
    
    	 const updater = [{spreadsheetName: req.url.substring(req.url.lastIndexOf('/') + 1)}];
         const tabler = [];
         const myDump = mySp.dump();
         const myCells = [];
         let currLargestAsciiRow = 108;
         let currLargestCol = 11;
         for(let i=0; i < myDump.length; i++) {
           myCells.push(myDump[i][0]);
           if(myDump[i][0].charCodeAt(0) > currLargestAsciiRow)
           	currLargestAsciiRow = myDump[i][0].charCodeAt(0);
           if(parseInt(myDump[i][0].substring(1)) > currLargestCol)
           	currLargestCol = parseInt(myDump[i][0].substring(1));
         }
         for(let i=1; i<currLargestCol+1; i++) {
           const tablec = [];
           for(let j=97; j < currLargestAsciiRow+1; j++) {
	     const cellID = String.fromCharCode(j) + i;
	     const query = mySp.query(cellID);
             if(query.formula == "" || query.formula == null) {
               //console.log("Empty: " + query.formula);
             	tablec.push({CellValue: ""});
             }
             else {
               console.log("Not empty: " + query.formula);
               tablec.push({CellValue: query.value});
             }
           }
           tabler.push({tablecol: tablec, RowNum: i});
           //console.log(tabler[i]);
         }
         const tablef = [{HeaderValue: req.url.substring(req.url.lastIndexOf('/') + 1)}];
         for(let i = 97; i < currLargestAsciiRow+1; i++) {
           tablef.push({HeaderValue: String.fromCharCode(i)});
         }
         let cellErr = "";
         let formulaErr = "";
         let actErr = "";
         for(const errorType in pageErrors) {
           console.log("Error: " + pageErrors[errorType]);
           if(errorType === "cellId") cellErr = pageErrors[errorType];
           else if(errorType === "formula") formulaErr = pageErrors[errorType];
           else if(errorType === "ssAct") actErr = pageErrors[errorType];
         }
         res.send(app.locals.mustache.render('update', {update: updater, tablerow: tabler, tablefirst: tablef, ActionError: actErr, CellError: cellErr, FormulaError: formulaErr}));
  };
}

async function updateFunc(app, cellToUpdate, formula, action, req) {
    const errors = {}
    if(validateUpdate({"ssAct": action, "formula": formula, "cellId": cellToUpdate}, errors)) {
    
    	const mySp = await Spreadsheet.make(req.url.substring(req.url.lastIndexOf('/') + 1), app.locals.store);
     	 if(action === "clear") return await mySp.clear();
     	 else if(action === "deleteCell") return await mySp.delete(cellToUpdate);
     	 else if(action === "updateCell") return await mySp.eval(cellToUpdate, formula);
     	 else return await mySp.copy(cellToUpdate, formula);
     } else {
         pageErrors = errors;
         ssGet(app);
     }
}

function ssUpdate(app) {
  return async function(req, res) {
    const cellToUpdate = req.body["cellId"];
    const formula = req.body["formula"];
    const action = req.body['ssAct'];
    if(action == "") console.log("Error: Must select radio button!");
    else await updateFunc(app, cellToUpdate, formula, action, req)
    .then(setTimeout(function(){ res.redirect(`/ss/${req.url.substring(req.url.lastIndexOf('/') + 1)}`)}, 50));
  }
}

/** Default handler for when there is no route for a particular method
 *  and path.
 */
function do404(app) {
  return async function(req, res) {
    const message = `${req.method} not supported for ${req.originalUrl}`;
    res.status(NOT_FOUND).
      send(app.locals.mustache.render('errors',
				      { errors: [{ msg: message, }] }));
  };
}

/** Ensures a server error results in an error page sent back to
 *  client with details logged on console.
 */ 
function doErrors(app) {
  return async function(err, req, res, next) {
    res.status(SERVER_ERROR);
    res.send(app.locals.mustache.render('errors',
					{ errors: [ {msg: err.message, }] }));
    console.error(err);
  };
}

/************************* SS View Generation **************************/

//did the SS view generation in the handler for ssGet(app)

/**************************** Validation ********************************/


const ACTS = new Set(['clear', 'deleteCell', 'updateCell', 'copyCell']);
const ACTS_ERROR = `Action must be one of ${Array.from(ACTS).join(', ')}.`;

//mapping from widget names to info.
const FIELD_INFOS = {
  ssAct: {
    friendlyName: 'Action',
    err: val => !ACTS.has(val) && ACTS_ERROR,
  },
  ssName: {
    friendlyName: 'Spreadsheet Name',
    err: val => !/^[\w\- ]+$/.test(val) && `
      Bad spreadsheet name "${val}": must contain only alphanumeric
      characters, underscore, hyphen or space.
    `,
  },
  cellId: {
    friendlyName: 'Cell ID',
    err: val => !/^[a-z]\d\d?$/i.test(val) && `
      Bad cell id "${val}": must consist of a letter followed by one
      or two digits.
    `,
  },
  formula: {
    friendlyName: 'cell formula',
  },
};

/** return true iff params[name] is valid; if not, add suitable error
 *  message as errors[name].
 */
function validateField(name, params, errors) {
  const info = FIELD_INFOS[name];
  const value = params[name];
  if (isEmpty(value)) {
    errors[name] = `The ${info.friendlyName} field must be specified`;
    return false;
  }
  if (info.err) {
    const err = info.err(value);
    if (err) {
      errors[name] = err;
      return false;
    }
  }
  return true;
}

  
/** validate widgets in update object, returning true iff all valid.
 *  Add suitable error messages to errors object.
 */
function validateUpdate(update, errors) {
  const act = update.ssAct ?? '';
  switch (act) {
    case '':
      errors.ssAct = 'Action must be specified.';
      return false;
    case 'clear':
      return validateFields('Clear', [], ['cellId', 'formula'], update, errors);
    case 'deleteCell':
      return validateFields('Delete Cell', ['cellId'], ['formula'],
			    update, errors);
    case 'copyCell': {
      const isOk = validateFields('Copy Cell', ['cellId','formula'], [],
				  update, errors);
      if (!isOk) {
	return false;
      }
      else if (!FIELD_INFOS.cellId.err(update.formula)) {
	  return true;
      }
      else {
	errors.formula = `Copy requires formula to specify a cell ID`;
	return false;
      }
    }
    case 'updateCell':
      return validateFields('Update Cell', ['cellId','formula'], [],
			    update, errors);
    default:
      errors.ssAct = `Invalid action "${act}`;
      return false;
  }
}

function validateFields(act, required, forbidden, params, errors) {
  for (const name of forbidden) {
    if (params[name]) {
      errors[name] = `
	${FIELD_INFOS[name].friendlyName} must not be specified
        for ${act} action
      `;
    }
  }
  for (const name of required) validateField(name, params, errors);
  return Object.keys(errors).length === 0;
}


/************************ General Utilities ****************************/

/** return new object just like paramsObj except that all values are
 *  trim()'d.
 */
function trimValues(paramsObj) {
  const trimmedPairs = Object.entries(paramsObj).
    map(([k, v]) => [k, v.toString().trim()]);
  return Object.fromEntries(trimmedPairs);
}

function isEmpty(v) {
  return (v === undefined) || v === null ||
    (typeof v === 'string' && v.trim().length === 0);
}

/** Return original URL for req.  If index specified, then set it as
 *  _index query param 
 */
function requestUrl(req, index) {
  const port = req.app.locals.port;
  let url = `${req.protocol}://${req.hostname}:${port}${req.originalUrl}`;
  if (index !== undefined) {
    if (url.match(/_index=\d+/)) {
      url = url.replace(/_index=\d+/, `_index=${index}`);
    }
    else {
      url += url.indexOf('?') < 0 ? '?' : '&';
      url += `_index=${index}`;
    }
  }
  return url;
}

