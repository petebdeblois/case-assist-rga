import { LightningElement, api } from 'lwc';
import {
  getHeadlessBindings,
  loadDependencies,
  setEngineOptions,
  setInitializedCallback,
  getHeadlessEnginePromise
} from 'c/quanticHeadlessLoader';
// @ts-ignore
import getHeadlessConfiguration from '@salesforce/apex/HeadlessController_V2.getHeadlessConfiguration';
import LOCALE from '@salesforce/i18n/locale';
import TIMEZONE from '@salesforce/i18n/timeZone';
import { STANDALONE_SEARCH_BOX_STORAGE_KEY } from 'c/quanticUtils';
import isguest from '@salesforce/user/isGuest';

/** @typedef {import("coveo").SearchEngine} SearchEngine */
/** @typedef {import("coveo").SearchEngineOptions} SearchEngineOptions */
/** @typedef {import("coveo").UrlManager} UrlManager */

/**
 * The `QuanticSearchInterface` component handles the headless search engine and localization configurations.
 * A single instance should be used for each instance of the Coveo Headless search engine.
 *
 *
 * The `timezone` used in the search engine options is taken from the [Time Zone settings](https://help.salesforce.com/s/articleView?id=admin_supported_timezone.htm&type=5&language=en_US) of the Salesforce org.
 * It is used to correctly interpret dates in the query expression, facets, and result items.
 *
 *
 * The `locale` used in the search engine options is taken from the [Language Settings](https://help.salesforce.com/s/articleView?id=sf.setting_your_language.htm&type=5).
 * Coveo Machine Learning models use this information to provide contextually relevant output.
 * Moreover, this information can be referred to in query expressions and QPL statements by using the `$locale` object.
 * @category Search
 * @example
 * <c-quantic-search-interface engine-id={engineId} search-hub="myhub" pipeine="mypipeline" disable-state-in-url skip-first-search></c-quantic-search-interface>
 */
export default class CustomCaseAssistQuanticSearchInterface extends LightningElement {
  /**
   * The ID of the engine instance the component registers to.
   * @api
   * @type {string}
   */
  @api engineId;
  /**
   * The search interface [search hub](https://docs.coveo.com/en/1342/).
   * @api
   * @type {string}
   * @defaultValue 'default'
   */
  @api searchHub = 'CaseAssist_GenAI';
  /**
   * The search interface [query pipeline](https://docs.coveo.com/en/180/).
   * @api
   * @type {string}
   * @defaultValue `undefined`
   */
  @api pipeline;
  /**
   * Whether the state should not be reflected in the URL parameters.
   * @api
   * @type {boolean}
   * @defaultValue false
   */
  @api disableStateInUrl = false;
  /**
   * Whether not to perform a search once the interface and its components are initialized.
   * @api
   * @type {boolean}
   * @defaultValue false
   */
  @api skipFirstSearch = false;

  @api caseData;

  /** @type {SearchEngineOptions} */
  engineOptions;

  /** @type {UrlManager} */
  urlManager;

  /** @type {Function} */
  unsubscribeUrlManager;

  /** @type {boolean} */
  initialized = false;

  /** @type {boolean} */
  hasRendered = false;

  /** @type {boolean} */
  ariaLiveEventsBound = false;

  engine;
  searchActions;
  loadSearchAnalyticsActions;
  contextAction;
  authenticatedContext = {};
  caseContext = {};
  rgaData = {};
  
  connectedCallback() {

    this.template.addEventListener(
      'quantic__generatedanswertoggle',
      this.handleGeneratedAnswerToggle
    );

    loadDependencies(this).then(() => {
      if (!getHeadlessBindings(this.engineId)?.engine) {
        getHeadlessConfiguration().then((data) => {
          if (data) {
            this.engineOptions = {
              configuration: {
                ...JSON.parse(data),
                search: {
                  searchHub: this.searchHub,
                  pipeline: this.pipeline,
                  locale: LOCALE,
                  timezone: TIMEZONE,
                  preprocessSearchResponseMiddleware: (response) => {
                    response.body.results.forEach((result) => {
                      if (result?.raw?.sfcreatedbymediumphotourl) {
                        result.raw.sfcreatedbymediumphotourl = this.getModifiedPhotoUrl(result);
                      }
                      if (result?.childResults.length) {
                        result?.childResults.forEach((childResult) => {
                          if (childResult?.raw?.sfcreatedbymediumphotourl) {
                            childResult.raw.sfcreatedbymediumphotourl = this.getModifiedPhotoUrl(childResult);
                          }
                        })
                      }
                      return result;
                    });
                    return response;
                  },
                },
                preprocessRequest: (request, clientOrigin) => {
                  if (clientOrigin === 'searchApiFetch' && !request.url.includes('html')) {
                    const body = JSON.parse(request.body);
                    body.filterField = '@foldingcollection';
                    body.parentField = '@foldingparent';
                    body.childField = '@foldingchild';
                    body.numberOfResults = 5;
                    request.body = JSON.stringify(body);
                  }

                  return request;
                }
              },
            };
            setEngineOptions(
              this.engineOptions,
              CoveoHeadless.buildSearchEngine,
              this.engineId,
              this,
              CoveoHeadless
            );
            setInitializedCallback(this.initialize, this.engineId);
          }
        });
      } else {
        setInitializedCallback(this.initialize, this.engineId);
      }
    });
  }

  renderedCallback() {
    if (!this.hasRendered && this.querySelector('c-quantic-aria-live')) {
      this.bindAriaLiveEvents();
    }
    this.hasRendered = true;
  }

  disconnectedCallback() {
    this.unsubscribeUrlManager?.();
    window.removeEventListener('hashchange', this.onHashChange);
    this.template.removeEventListener(
      'quantic__generatedanswertoggle',
      this.handleGeneratedAnswerToggle
    );
    if (this.ariaLiveEventsBound) {
      this.removeEventListener('arialivemessage', this.handleAriaLiveMessage);
      this.removeEventListener(
        'registerregion',
        this.handleRegisterAriaLiveRegion
      );
    }
  }

  /**
   * @param {SearchEngine} engine
   */
  initialize = (engine) => {
    if (this.initialized) {
      return;
    }

    this.engine = engine;
    this.contextAction = CoveoHeadless.loadContextActions(engine);
    this.searchActions = CoveoHeadless.loadSearchActions(engine);
    this.loadSearchAnalyticsActions = CoveoHeadless.loadSearchAnalyticsActions(engine);

    this.authenticatedContext = isguest ? {} : {
      'interests': 'sailing',
      'products_owned': 'barca skipper pro'
    }

    // this.caseContext = {
    //   'subject': this.caseData['Subject'],
    //   'description': this.caseData['Description'],
    // }
    console.log("this.caseData " + this.caseData)
    // engine.dispatch(this.contextAction.setContext(this.context));
    // engine.dispatch(CoveoHeadless.loadQueryActions(engine).updateQuery({ q: this.caseData['Subject'] }));
    engine.dispatch(CoveoHeadless.loadQueryActions(engine).updateQuery({ q: "how to enhance working" }));
    engine.dispatch(this.searchActions.executeSearch(this.loadSearchAnalyticsActions.logInterfaceLoad()));

    this.initialized = true;
  };

  get fragment() {
    return window.location.hash.slice(1);
  }

  initUrlManager(engine) {
    this.urlManager = CoveoHeadless.buildUrlManager(engine, {
      initialState: { fragment: this.fragment },
    });
    this.unsubscribeUrlManager = this.urlManager.subscribe(() =>
      this.updateHash()
    );
    window.addEventListener('hashchange', this.onHashChange);
  }

  get isRGAVisible() {
    var rgaData = sessionStorage && JSON.parse(sessionStorage.getItem('coveo-generated-answer-data'));
    return rgaData ? rgaData.isVisible : true;
  }

  get context() {
    return {
      ...this.authenticatedContext,
      ...this.caseContext,
      'website': 'support',
      'enableSmartSnippet': !this.isRGAVisible,
    }
  }

  updateHash() {
    window.history.pushState(
      null,
      document.title,
      `#${this.urlManager.state.fragment}`
    );
  }

  bindAriaLiveEvents() {
    this.template.addEventListener(
      'arialivemessage',
      this.handleAriaLiveMessage.bind(this)
    );
    this.template.addEventListener(
      'registerregion',
      this.handleRegisterAriaLiveRegion.bind(this)
    );
    this.ariaLiveEventsBound = true;
  }

  handleAriaLiveMessage(event) {
    /** @type {import('quanticAriaLive/quanticAriaLive').IQuanticAriaLive} */
    const ariaLiveRegion = this.querySelector('c-quantic-aria-live');
    if (ariaLiveRegion) {
      ariaLiveRegion.updateMessage(
        event.detail.regionName,
        event.detail.message,
        event.detail.assertive
      );
    }
  }

  handleRegisterAriaLiveRegion(event) {
    /** @type {import('quanticAriaLive/quanticAriaLive').IQuanticAriaLive} */
    const ariaLiveRegion = this.querySelector('c-quantic-aria-live');
    if (ariaLiveRegion) {
      ariaLiveRegion.registerRegion(
        event.detail.regionName,
        event.detail.assertive
      );
    }
  }

  onHashChange = () => {
    this.urlManager.synchronize(this.fragment);
  };

  getModifiedPhotoUrl(result) {
    const newPhotoUrl = result.raw.sfcreatedbymediumphotourl.replace("https://barca.file.force.com", "https://s3.amazonaws.com/images.barca.group").replace('/M', "_M");
    return newPhotoUrl;
  }

  handleGeneratedAnswerToggle = () => {
    // console.log('Toggle event');
    this.engine.dispatch(this.contextAction.setContext(this.context));
    this.engine.dispatch(this.searchActions.executeSearch(this.loadSearchAnalyticsActions.logInterfaceLoad()));
  }

}
