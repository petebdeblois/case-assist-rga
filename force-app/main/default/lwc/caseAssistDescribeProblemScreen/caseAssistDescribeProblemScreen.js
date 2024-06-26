import { LightningElement, api } from 'lwc';
import {
  FlowNavigationNextEvent,
  FlowAttributeChangeEvent
} from 'lightning/flowSupport';
import {
  registerComponentForInit,
  initializeWithHeadless
} from 'c/quanticHeadlessLoader';
import describeProblemTitle from '@salesforce/label/c.cookbook_DescribeProblemTitle';
import next from '@salesforce/label/c.cookbook_Next';
import previous from '@salesforce/label/c.cookbook_Previous';

/** @typedef {import("coveo").CaseAssistEngine} CaseAssistEngine */

export default class CaseAssistDescribeProblemScreen extends LightningElement {
  labels = {
    describeProblemTitle,
    next,
    previous
  };

  /**
   * availableActions is an array that contains the available flow actions when this component is used within a flow
   * @see https://developer.salesforce.com/docs/component-library/bundle/lightning-flow-support/documentation
   */
  @api availableActions = [];
  /**
   * The ID of the engine instance the component registers to.
   * @type {string}
   */
  @api engineId;
  /**
   * The first level of origin of the request, typically the identifier of the graphical case assist interface from which the request originates.
   * @type {string}
   */

  @api searchHub;
  /**
   * The Case Assist configuration ID.
   * @type {string}
   */
  @api caseAssistId;
  /**
   * A JSON-serialized object representing the current case fields.
   * @type {string}
   */
  @api caseData;

  /** @type {CaseAssistEngine} */
  engine;
  /** @type {object} */
  _caseData = {};

  connectedCallback() {
    registerComponentForInit(this, this.engineId);
    try {
      if (this.caseData) {
        this._caseData = JSON.parse(this.caseData);
      console.log("CaseData CaseAssistDescribeProblemScreen.registerComponentForInit" + this._caseData["Subject"])
      }
    } catch (err) {
      console.warn('Failed to parse the flow variable caseData', err);
      this._caseData = {};
    }
  }

  renderedCallback() {
    initializeWithHeadless(this, this.engineId, this.initialize);
  }

  /**
   * @param {CaseAssistEngine} engine
   */
  initialize = (engine) => {
    console.log("CaseAssistDescribeProblem");
    console.log("CaseData CaseAssistDescribeProblemScreen.init()" + this._caseData["Subject"])
    this.engine = engine;
    this.actions = {
      // eslint-disable-next-line no-undef
      ...CoveoHeadlessCaseAssist.loadCaseAssistAnalyticsActions(engine)
    };
  };

  canMoveNext() {
    return (
      this.availableActions.some((action) => action === 'NEXT') &&
      this.inputValidity()
    );
  }

  handleNext() {
    if (this.canMoveNext()) {
      this.updateFlowState();
      const navigateNextEvent = new FlowNavigationNextEvent();
      this.dispatchEvent(navigateNextEvent);
      this.engine.dispatch(
        this.actions.logCaseNextStage({ stageName: 'CaseAssist Describe Problem Screen' })
      );
    }
  }

  updateFlowState() {
    this.updateCaseValues();
    const attributeChangeEvent = new FlowAttributeChangeEvent(
      'caseData',
      JSON.stringify(this._caseData)
    );
    this.dispatchEvent(attributeChangeEvent);
  }

  updateCaseValues() {
    const { subjectInput, descriptionInput } = this.getInputs();
    if (
      this._caseData.Subject !== subjectInput.value ||
      this._caseData.Description !== descriptionInput.value
    ) {
      this._caseData = {
        Subject: subjectInput.value,
        Description: descriptionInput.value
      };
      console.log("CaseData CaseAssistDescribeProblemScreen.updateCaseValues()" + this._caseData["Subject"])
      sessionStorage.idsPreviouslyVoted = JSON.stringify([]);
      sessionStorage.idsPreviouslyVotedPositive = JSON.stringify([]);
    }
  }

  inputValidity() {
    const { subjectInput, descriptionInput } = this.getInputs();
    subjectInput.reportValidity();
    descriptionInput.validate();
    return !subjectInput.hasError && descriptionInput.validity;
  }

  getInputs() {
    const subjectInput = this.template.querySelector('c-subject-input');
    const descriptionInput = this.template.querySelector('c-description-input');
    return { subjectInput, descriptionInput };
  }

  get renderCaseAssistInterface() {
    return !this.caseData;
  }
}