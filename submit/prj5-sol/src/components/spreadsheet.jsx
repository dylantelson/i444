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

  constructor(props) {
    super(props);
    this.props = props;
    this.update = this.update.bind(this);
    this.focusHandler = this.focusHandler.bind(this);
    this.state = {
      counter: 0,
      currFocused: "",
      currCopied: "",
      errorMessage: "",
      inputFormula: ""
    };
  }
  
  contextHandler(event) {
    console.log("context");
  };
  
  focusHandler(event) {
    console.log("changing to " + this.props.spreadsheet.query(event.target.dataset.cellid).formula);
    this.setState({counter: this.state.counter, currFocused: event.target.dataset.cellid, currCopied: this.state.currCopied, errorMessage: this.state.errorMessage, inputFormula: this.props.spreadsheet.query(event.target.dataset.cellid).formula});
    event.target.className = "focused";
  };
  
  update(inputFormula, event) {
    console.log("updating with value " + inputFormula);
    console.log("from cell " + this.state.currFocused);
    try {
      this.props.spreadsheet.eval(this.state.currFocused, inputFormula);
      this.setState({counter: this.state.counter, currFocused: this.state.currFocused, currCopied: this.state.currCopied, errorMessage: this.state.errorMessage, inputFormula: this.props.spreadsheet.query(this.state.currFocused).formula});
    } catch(error) {
      console.log(error);
    }
  }

  //@TODO

  render() {
    //note: numOfBodyRows excludes the top row (thead), hence the name
    //same with numOfBodyCols excluding the left-most column
    
    const theadValues = [this.props.spreadsheet.name, "A", "B", "C", "D", "E", "F", "G", "H", "I", "J"];
    
    const numOfBodyRows = 10;
    const numOfBodyCols = 10;
    const trowHTML = [];
    for(let i=0; i<numOfBodyRows; i++) {
      const tcolHTML = [];
      for(let j=0; j<numOfBodyCols; j++) {
        const currCell = theadValues[j+1].toLowerCase() + (i+1).toString();
        const currCellParams = this.props.spreadsheet.query(currCell);
        //perhaps remove the toLowerCase(), as I don't think it's necessary
        //as the parser should see no difference between i.e. a1 and A1
        //we do +1 because theadValues has a first index of the ssName, which we won't use here
        //tcolHTML.push(<td data-cellid={theadValues[j+1].toLowerCase() + theadValues[j+1].toString()} class tabindex={theadValues[j+1]} title="NA">NA</td>);
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
    console.log(this.props.spreadsheet.query(this.state.currFocused).formula);
    
    return (
      <div>
        <SingleInput id={this.state.currFocused} label={this.state.currFocused} value={this.props.spreadsheet.query(this.state.currFocused).formula} update={this.update}/>
        <table className="ss">
          <thead>
            <tr>
              {theadValues.map(theader => (
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
