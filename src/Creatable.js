// @flow

import React, {
  Component,
  type Node,
  type AbstractComponent,
  type ElementRef,
  type ElementConfig,
} from 'react';
import Select, { type Props as SelectProps } from './Select';
import type { OptionType, OptionsType, ValueType, ActionMeta } from './types';
import { cleanValue } from './utils';
import { getOptionLabel as defaultGetOptionLabel, getOptionValue as defaultGetOptionValue } from './builtins';
import manageState from './stateManager';

export type CreatableProps = {|
  /* Allow options to be created while the `isLoading` prop is true. Useful to
     prevent the "create new ..." option being displayed while async results are
     still being loaded. */
  allowCreateWhileLoading: boolean,
  /* Gets the label for the "create new ..." option in the menu. Is given the
     current input value. */
  formatCreateLabel: string => Node,
  /* Determines whether the "create new ..." option should be displayed based on
     the current input value, select value and options array. */
  isValidNewOption: (string, ValueType, OptionsType, typeof defaultGetOptionLabel, typeof defaultGetOptionValue) => boolean,
  /* Returns the data for the new option when it is created. Used to display the
     value, and is passed to `onChange`. */
  getNewOptionData: (string, Node) => OptionType,
  /* If provided, this will be called with the input value when a new option is
     created, and `onChange` will **not** be called. Use this when you need more
     control over what happens when new options are created. */
  onCreateOption?: string => void,
  /* Sets the position of the createOption element in your options list. Defaults to 'last' */
  createOptionPosition: 'first' | 'last',
  options?: OptionsType,
  inputValue: string,
  value: ValueType,
  isLoading?: boolean,
  isMulti?: boolean,
  onChange: (ValueType, ActionMeta) => void,
|};

export type Props = SelectProps & CreatableProps;

const compareOption = (inputValue = '', option, getOptionLabel, getOptionValue) => {
  const candidate = String(inputValue).toLowerCase();
  const optionValue = getOptionValue(option).toLowerCase();
  const optionLabel = getOptionLabel(option).toLowerCase();
  return optionValue === candidate || optionLabel === candidate;
};

const builtins = {
  formatCreateLabel: (inputValue: string) => `Create "${inputValue}"`,
  isValidNewOption: (
    inputValue: string,
    selectValue: OptionsType,
    selectOptions: OptionsType,
    getOptionLabel: typeof defaultGetOptionLabel,
    getOptionValue: typeof defaultGetOptionValue
  ) =>
    !(
      !inputValue ||
      selectValue.some(option => compareOption(inputValue, option, getOptionLabel, getOptionValue)) ||
      selectOptions.some(option => compareOption(inputValue, option, getOptionLabel, getOptionValue))
    ),
  getNewOptionData: (inputValue: string, optionLabel: Node) => ({
    label: optionLabel,
    value: inputValue,
    __isNew__: true,
  }),
};

export const defaultProps = {
  allowCreateWhileLoading: false,
  createOptionPosition: 'last',
  getOptionLabel: defaultGetOptionLabel,
  getOptionValue: defaultGetOptionValue,
  ...builtins,
};

type State = {
  newOption: OptionType | void,
  options: OptionsType,
};

export const makeCreatableSelect = <C: {}>(
  SelectComponent: AbstractComponent<C>
): AbstractComponent<CreatableProps & C> =>
  class Creatable extends Component<CreatableProps & C, State> {
    static defaultProps = defaultProps;
    select: ElementRef<*>;
    constructor(props: CreatableProps & C) {
      super(props);
      const options = props.options || [];
      this.state = {
        newOption: undefined,
        options: options,
      };
    }
    componentWillReceiveProps(nextProps: CreatableProps & C) {
      const {
        allowCreateWhileLoading,
        createOptionPosition,
        formatCreateLabel,
        getNewOptionData,
        getOptionLabel,
        getOptionValue,
        inputValue,
        isLoading,
        isValidNewOption,
        value,
      } = nextProps;
      const options = nextProps.options || [];
      let { newOption } = this.state;
      if (isValidNewOption(inputValue, cleanValue(value), options, getOptionLabel, getOptionValue)) {
        newOption = getNewOptionData(inputValue, formatCreateLabel(inputValue));
      } else {
        newOption = undefined;
      }
      this.setState({
        newOption: newOption,
        options:
          (allowCreateWhileLoading || !isLoading) && newOption
            ? createOptionPosition === 'first'
              ? [newOption, ...options]
              : [...options, newOption]
            : options,
      });
    }
    onChange = (newValue: ValueType, actionMeta: ActionMeta) => {
      const {
        getNewOptionData,
        inputValue,
        isMulti,
        onChange,
        onCreateOption,
        value,
      } = this.props;
      if (actionMeta.action !== 'select-option') {
        return onChange(newValue, actionMeta);
      }
      const { newOption } = this.state;
      const valueArray = Array.isArray(newValue) ? newValue : [newValue];

      if (valueArray[valueArray.length - 1] === newOption) {
        if (onCreateOption) onCreateOption(inputValue);
        else {
          const newOptionData = getNewOptionData(inputValue, inputValue);
          const newActionMeta = { action: 'create-option' };
          if (isMulti) {
            onChange([...cleanValue(value), newOptionData], newActionMeta);
          } else {
            onChange(newOptionData, newActionMeta);
          }
        }
        return;
      }
      onChange(newValue, actionMeta);
    };
    focus() {
      this.select.focus();
    }
    blur() {
      this.select.blur();
    }
    render() {
      const { ...props } = this.props;
      const { options } = this.state;
      return (
        <SelectComponent
          {...props}
          ref={ref => {
            this.select = ref;
          }}
          options={options}
          onChange={this.onChange}
        />
      );
    }
  };

// TODO: do this in package entrypoint
const SelectCreatable = makeCreatableSelect<ElementConfig<typeof Select>>(
  Select
);

export default manageState<ElementConfig<typeof SelectCreatable>>(
  SelectCreatable
);
