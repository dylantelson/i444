//-*- mode: rjsx-mode;

import SingleInput from './single-input.jsx';
import {Spreadsheet} from 'cs544-ss';
import {DBSSStore} from 'cs544-ss';
import SS from './spreadsheet.jsx';

import React from 'react';
import ReactDom from 'react-dom';


/*************************** App Component ***************************/

const STORE = window.localStorage;

export default class App extends React.Component {

  constructor(props) {
    super(props);

    this.update = this.update.bind(this);
    
    this.state = {
      ssName: '',
      spreadsheet: null,
    };
  }


  componentDidCatch(error, info) {
    console.error(error, info);
  }


  async update(ssName, event) {
    console.log("updating " + ssName);
    
    if(RegExp("^[a-zA-Z0-9 _-]*$").test(ssName)) {
      console.log("left hea");
      const newSS = await Spreadsheet.make(ssName, DBSSStore);
      this.setState({ssName: ssName, spreadsheet: newSS});
    } else {
      throw "Invalid input, must be alphanumeric!";
    }
  }


  render() {
    const { ssName, spreadsheet } = this.state;
    const ss =
      (spreadsheet) ?  <SS spreadsheet={spreadsheet}/> : '';
    return (
      <div>
        <SingleInput id="ssName" label="Open Spreadsheet Name"
                     value={ssName} update={this.update}/>
        {ss}
     </div>
     );
  }

}
