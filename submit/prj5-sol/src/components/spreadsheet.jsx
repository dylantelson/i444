//-*- mode: rjsx-mode;

import {indexToRowSpec, indexToColSpec} from 'cs544-ss';
import popupMenu from '../lib/menu.jsx';
import SingleInput from './single-input.jsx';

import React from 'react';
import ReactDom from 'react-dom';


/************************ Spreadsheet Component ************************/

const [ N_ROWS, N_COLS ] = [ 10, 10 ];
const ROW_HDRS = Array.from({length: N_ROWS}).map((_, i) => indexToRowSpec(i));
const COL_HDRS = Array.from({length: N_COLS}).
  map((_, i) => indexToColSpec(i).toUpperCase());

export default class Spreadsheet extends React.Component {

  //lots of binds to make sure (this) works correctly in functions
  constructor(props) {
    super(props);
    this.props = props;
    this.update = this.update.bind(this);
    this.focusHandler = this.focusHandler.bind(this);
    this.clearHandler = this.clearHandler.bind(this);
    this.contextHandler = this.contextHandler.bind(this);
    this.copyCell = this.copyCell.bind(this);
    this.pasteCell = this.pasteCell.bind(this);
    this.deleteCell = this.deleteCell.bind(this);
    this.formulaSingleInputRef = React.createRef();
    this.lastCopied = null;
    this.lastFocused = null;
    this.clear = this.clear.bind(this);
    this.state = {
      counter: 0,
      currFocused: "",
      currCopied: null,
      errorMessage: "",
      inputFormula: ""
    };
  }
  
  //handler that deals with changing the focus on the spreadsheet
  //updates the previously last-focused cell to make it not highlighted,
  //and ensures that if it is the copied cell, to stay outlined green
  focusHandler(event) {
    if(this.lastFocused != null) {
      if(this.lastFocused == this.lastCopied) this.lastFocused.className = "copied";
      else this.lastFocused.className = "";
    }
    event.target.className = "focused";
    this.lastFocused = event.target;
    this.setState({counter: this.state.counter, currFocused: event.target.dataset.cellid, currCopied: this.state.currCopied, errorMessage: this.state.errorMessage, inputFormula: this.props.spreadsheet.query(event.target.dataset.cellid).formula});
    if(this.formulaSingleInputRef) this.formulaSingleInputRef.current.switchCells(this.props.spreadsheet.query(event.target.dataset.cellid).formula);
  };
  
  //handler that deals with right clicks on cells.
  //if the current cell doesn't have a value, we don't
  //let it be copied or deleted and keep those options uninteractable.
  //If there is no currently copied cell, then paste is not interactable.
  contextHandler(event) {
    event.preventDefault();
    
    const currCell = event.target.dataset.cellid;
    const currCellFormula = this.props.spreadsheet.query(currCell).formula;
    
    const copyFunc = currCellFormula != "" ? this.copyCell : null;
    const pasteFunc = this.state.currCopied != null ? this.pasteCell : null;
    const deleteFunc = currCellFormula != "" ? this.deleteCell : null;

    //we open the popupMenu.
    //ternary operators to choose between the option of interactable or not,
    //as described in the above comments.
    //menuLabel is the option text that the user sees,
    //menuItemFn is the function that option executes when clicked,
    //and menuItemFnArgs are the arguments passed to that function.
    popupMenu(event,
      {menuItems: [
        {menuLabel: currCellFormula != "" ? "Copy " + currCell : "Copy", menuItemFn: copyFunc, menuItemFnArgs: [currCell, event]},
        {menuLabel: this.state.currCopied != null ? "Paste " + this.state.currCopied + " into " + currCell : "Paste", menuItemFn: pasteFunc, menuItemFnArgs: [currCell]},
        {menuLabel: currCellFormula != "" ? "Delete " + currCell : "Delete", menuItemFn: deleteFunc, menuItemFnArgs: [currCell]}
      ]}
    );
  };
  
  //this is the handler for if the top-left ssName cell is clicked.
  //it gives a menu option for clearing, which clears the spreadsheet when clicked.
  clearHandler(event) {
    event.preventDefault();
    
    let clearFunc = this.clear;
    popupMenu(
      event,
      {menuItems: [
        {menuLabel: "Clear", menuItemFn: clearFunc}
      ]}
    );
  };
  
  //function called by the clear menu option in clearHandler.
  //clears spreadsheet, then updates state
  async clear() {
    await this.props.spreadsheet.clear();
    this.setState({counter: this.state.counter+1, currFocused: this.state.currFocused, currCopied: this.state.currCopied, errorMessage: this.state.errorMessage, inputFormula: this.state.inputFormula});
  }
  
  //function called by the copy menu option in contextHandler.
  //makes sure outline is removed from previous copied (if there was one),
  //then updates the copied cell to itself.
  async copyCell(cellId, event) {
    if(this.lastCopied != null) this.lastCopied.className = "";
    event.target.className = "copied";
    this.lastCopied = event.target;
    
    this.setState({counter: this.state.counter, currFocused: this.state.currFocused, currCopied: cellId, errorMessage: this.state.errorMessage, inputFormula: this.state.inputFormula});
  }
  
  //function called by the paste menu option in contextHandler.
  //pastes the currently copied cell's formula into the right-clicked cell.
  async pasteCell(cellId) {
    await this.props.spreadsheet.eval(cellId, this.props.spreadsheet.query(this.state.currCopied).formula);
    this.setState({counter: this.state.counter+1, currFocused: this.state.currFocused, currCopied: this.state.currCopied, errorMessage: this.state.errorMessage, inputFormula: this.props.spreadsheet.query(this.state.currFocused).formula});
    }
  
  //function called by the delete menu option in contextHandler.
  //deletes the interacted-with cell.
  async deleteCell(cellId) {
    await this.props.spreadsheet.delete(cellId);
      this.setState({counter: this.state.counter+1, currFocused: this.state.currFocused, currCopied: this.state.currCopied, errorMessage: this.state.errorMessage, inputFormula: this.props.spreadsheet.query(this.state.currFocused).formula});
  }
  
  //updates the currently focused cell's formula to the value currently
  //in the formula single-input. If an error occurs, it throws so that
  //the single-input can show the error to the user.
  async update(inputFormula, event) {
    try {
      await this.props.spreadsheet.eval(this.state.currFocused, inputFormula);
      this.setState({counter: this.state.counter+1, currFocused: this.state.currFocused, currCopied: this.state.currCopied, errorMessage: this.state.errorMessage, inputFormula: this.props.spreadsheet.query(this.state.currFocused).formula});
    } catch(error) {
      throw error.toString();
    }
  }
  
  render() {
    //numOfBodyRows excludes the top row (thead), hence the name
    //same with numOfBodyCols excluding the left-most column
    const theadValues = [this.props.spreadsheet.name, "A", "B", "C", "D", "E", "F", "G", "H", "I", "J"];
    
    const numOfBodyRows = 10;
    const numOfBodyCols = 10;
    
    //trowHTML is the HTML that will be rendered for each table-row
    //for each row, we go through the cells from left-to-right and push
    //it to tcolHTML, which is then added to the trowHTML.
    const trowHTML = [];
    for(let i=0; i<numOfBodyRows; i++) {
      const tcolHTML = [];
      for(let j=0; j<numOfBodyCols; j++) {
        const currCell = theadValues[j+1] + (i+1).toString();
        const currCellParams = this.props.spreadsheet.query(currCell);
        const params = {
          cellId: currCell,
          formula: currCellParams.formula,
          value: currCellParams.value,
          onContextMenu: this.contextHandler,
          onFocus: this.focusHandler,
          className: "",
          tabIndex: i+1
        };
        tcolHTML.push(SSCell(params));
      }
      trowHTML.push(
        <tr>
          <th>{i+1}</th>
          {tcolHTML}
        </tr>
      );
    }
    //we render the html, including the table, that was created above
    return (
      <div>
        <SingleInput ref={this.formulaSingleInputRef} id="formulaInput" label={this.state.currFocused} value={this.state.inputFormula} update={this.update}/>
        <table className="ss">
          <thead>
            <tr>
              <th onContextMenu={this.clearHandler}>{theadValues[0]}</th>
              {theadValues.filter((theader, i) => i>0).map(theader => (
                <th>{theader}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {trowHTML}
          </tbody>
        </table>
      </div>
    );
  }

}

function SSCell(props) {
  const { cellId, formula, value, onContextMenu, onFocus,
          className, tabIndex } = props;
  return (
    <td onContextMenu={onContextMenu}
        data-cellid={cellId}
        onFocus={onFocus}
        className={className}
        tabIndex={tabIndex}
        title={formula ?? ''}>
      {value ?? ''}
    </td>
  );
}
