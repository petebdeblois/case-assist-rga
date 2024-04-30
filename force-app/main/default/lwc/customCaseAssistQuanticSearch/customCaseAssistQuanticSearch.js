// @ts-ignore
import youtubeTemplate from './resultTemplates/youtubeResultTemplate.html';
// @ts-ignore
import caseTemplate from './resultTemplates/caseResultTemplate.html';
// @ts-ignore
import chatterTemplate from './resultTemplates/chatterResultTemplate.html';
import discussionTemplate from './resultTemplates/discussionResultTemplate.html';
import communityTemplate from './resultTemplates/communityResultTemplate.html';
import supportFileTemplate from './resultTemplates/supportFileTemplate.html';
import { registerComponentForInit, initializeWithHeadless } from 'c/quanticHeadlessLoader';
import { LightningElement, api } from 'lwc';

const SS_LOCALSTORAGE_KEY = "smart-snippet-enabled";

export default class CustomCaseAssistQuanticSearch extends LightningElement {
  /** @type {string} */
  @api engineId
  /** @type {string} */
  @api searchHub = 'CaseAssist_GenAI';
  /** @type {string} */
  @api pipeline = '';
  /** @type {boolean} */
  @api disableStateInUrl = false;
  /** @type {boolean} */
  @api skipFirstSearch = false;
  /** @type {UrlManager} */
  urlManager;
  /**
   * A JSON-serialized object representing the current case fields.
   * @type {string}
   */
  @api caseData;
  /** @type {Function} */
  unsubscribeUrlManager;
  /** @type {string} */
  queryValue = ''

  /** @type {object} */
  _caseData = {};

  connectedCallback() {
    registerComponentForInit(this, this.engineId);
    console.log("CaseData CustomCaseAssistQuanticSearch.registerComponentForInit()" + this.caseData)
  }
  renderedCallback() {
    initializeWithHeadless(this, this.engineId, this.initialize);
  }

  get fragment() {
    return window.location.hash.slice(1);
  }

  /**
   * @param {SearchEngine} engine
   */
  initialize = (engine) => {
    console.log('Initializing engineId ' + this.engineId);
  }


  handleResultTemplateRegistration(event) {
    event.stopPropagation();

    const resultTemplatesManager = event.detail;

    const isCase = CoveoHeadless.ResultTemplatesHelpers.fieldMustMatch(
      'objecttype',
      ['Case']
    );
    const isYouTube = CoveoHeadless.ResultTemplatesHelpers.fieldMustMatch(
      'filetype',
      ['YouTubeVideo']
    );
    const isComment = CoveoHeadless.ResultTemplatesHelpers.fieldMustMatch(
      'objecttype',
      ['Comment']
    );
    const isDiscussion = CoveoHeadless.ResultTemplatesHelpers.fieldMustMatch(
      'objecttype',
      ['Discussion']
    );
    const isSupportFile = CoveoHeadless.ResultTemplatesHelpers.fieldMustMatch(
      'objecttype',
      ['Support File']
    );
    resultTemplatesManager.registerTemplates(
      {
        content: youtubeTemplate,
        conditions: [isYouTube],
        fields: ['ytvideoid', 'ytvideoduration', 'ytviewcount']
      },
      {
        content: caseTemplate,
        conditions: [isCase],
        fields: ['sfstatus', 'sfcasestatus', 'sfcasenumber', 'foldingcollection', 'sfid']
      },
      {
        content: chatterTemplate,
        conditions: [isComment],
        fields: ['sfcreatedby', 'sfcreatedbymediumphotourl', 'filetype', 'objecttype', 'sfcommentbody']
      },
      {
        content: discussionTemplate,
        conditions: [isDiscussion],
        fields: ['sfcreatedby', 'sfcreatedbymediumphotourl', 'filetype', 'objecttype', 'sffeedcommentscommentbody', 'sfcommentcount']
      },
      {
        content: supportFileTemplate,
        conditions: [isSupportFile],
        fields: ['barca_brand', 'sftopicassignmentstopicid'],
      },
      {
        content: communityTemplate,
        conditions: [],
        fields: ['barca_brand', 'sftopicassignmentstopicid'],
      }
    );
  }

}