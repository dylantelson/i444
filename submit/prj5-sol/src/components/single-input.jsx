//-*- mode: rjsx-mode;

import React from 'react';
import ReactDom from 'react-dom';

/** Component which displays a single input widget having the following
 *  props:
 *
 *    `id`:     The id associated with the <input> element.
 *    `value`:  An initial value for the widget (defaults to '').
 *    `label`:  The label displayed for the widget.
 *    `update`: A handler called with the `value` of the <input>
 *              widget whenever it is blurred or its containing
 *              form submitted.
 */
export default class SingleInput extends React.Component {

  constructor(props) {
    super(props);
    this.props=props;
    this.handleChange = this.handleChange.bind(this);
    this.handleSubmit = this.handleSubmit.bind(this);
    this.state = {
      value: props.value != null ? props.value : "",
      error: ""
    };
  }
  
  handleChange(event) {
    this.setState({value: event.target.value, error: this.props.error});
  };
  
  async handleSubmit(event) {
    event.preventDefault();
    try {
      const input = this.state.value.trim();
      if(input=="") return;
      await this.props.update(input, event);
    } catch(error) {
      this.setState({value: this.state.value, error: error});
    }
  };
  
  switchCells(chosenCellFormula) {
    this.setState({value: chosenCellFormula, error: ""});
  }

  render() {
    return (
      <div>
        <form onSubmit={this.handleSubmit}>
          <label htmlFor={this.props.id}>{this.props.label}</label>
          <span>
            <input id={this.id} value={this.state.value} onBlur={this.handleSubmit} onChange={this.handleChange}/>
            <br/>
            <span className="error">{this.state.error}</span>
          </span>
        </form>
      </div>
    );
  }

}
