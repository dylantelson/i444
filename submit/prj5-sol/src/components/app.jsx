//-*- mode: rjsx-mode;

import SingleInput from './single-input.jsx';
import {Spreadsheet} from 'cs544-ss';
import SSClient from './../lib/ss-client.mjs';
import SS from './spreadsheet.jsx';

import React from 'react';
import ReactDom from 'react-dom';


/*************************** App Component ***************************/

const STORE = window.localStorage;

const ssClient = new SSClient("http://localhost:2345");

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
    if(RegExp("^[a-zA-Z0-9 _-]*$").test(ssName)) {
      const newSS = await Spreadsheet.make(ssName, ssClient);
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
