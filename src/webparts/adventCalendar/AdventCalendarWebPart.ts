import * as React from 'react';
import * as ReactDom from 'react-dom';
import { DisplayMode, Version } from '@microsoft/sp-core-library';
import {
  type IPropertyPaneConfiguration,
  type IPropertyPaneDropdownOption,
  type IPropertyPaneGroup,
  PropertyPaneDropdown,
  PropertyPaneLabel,
  PropertyPaneTextField,
  PropertyPaneToggle
} from '@microsoft/sp-property-pane';
import { BaseClientSideWebPart } from '@microsoft/sp-webpart-base';
import { spfi, SPFx } from '@pnp/sp';

import * as strings from 'AdventCalendarWebPartStrings';
import AdventCalendar from './components/AdventCalendar';
import { CalendarLayout, IAdventCalendarProps } from './components/IAdventCalendarProps';
import { createAdventServices, IAdventServices } from './services/AdventServices';
import { getDefaultAdminEdition, getDefaultEdition, parseIsoDay } from './services/dateUtils';
import { format, getErrorMessage } from './services/format';
import { getUiLanguage, initUiLocale } from './services/locale';
import { applyImmersivePage } from './utils/immersivePage';

export interface IAdventCalendarWebPartProps {
  /** Année de l'édition affichée ; vide = édition automatique (getDefaultEdition). */
  year: string;
  /** Identifiant du profil de thème forcé ; vide = profil actif. */
  themeProfileId: string;
  testMode: boolean;
  /** Date simulée au format AAAA-MM-JJ (mode test). */
  simulatedDate: string;
  /** Présentation : « tree » (sapin, par défaut) ou « grid ». */
  layout?: CalendarLayout;
}

const ACTIVE_PROFILE_KEY = '';

export default class AdventCalendarWebPart extends BaseClientSideWebPart<IAdventCalendarWebPartProps> {
  private _services!: IAdventServices;
  private _profileOptions: IPropertyPaneDropdownOption[] = [];
  private _profilesState: 'idle' | 'loading' | 'loaded' | 'error' = 'idle';
  private _profilesError: string = '';
  /** Fonction de remise en état de la page quand le plein écran est actif. */
  private _restorePage: (() => void) | undefined;

  protected async onInit(): Promise<void> {
    await super.onInit();
    const sp = spfi().using(SPFx(this.context));
    const pageContext = this.context.pageContext;
    // Langue : SPFx charge loc/fr-fr.js ou loc/en-us.js selon la langue d'affichage de l'utilisateur ;
    // les formats de date et le contenu de démonstration suivent la même langue.
    initUiLocale(pageContext.cultureInfo.currentUICultureName);
    this._services = createAdventServices(sp, {
      language: getUiLanguage(),
      webServerRelativeUrl: pageContext.web.serverRelativeUrl,
      webLanguageName: pageContext.web.languageName,
      webId: pageContext.web.id.toString(),
      userLoginName: pageContext.user.loginName
    });
    this._updateImmersivePage();
  }

  public render(): void {
    const simulatedDate = this._getSimulatedDate();
    const today = simulatedDate ?? new Date();
    const forcedProfileId = Number(this.properties.themeProfileId);
    // A year set in the property pane wins over the automatic edition, for readers and in the administration.
    const fixedYear = this._parseYear(this.properties.year);

    const element: React.ReactElement<IAdventCalendarProps> = React.createElement(AdventCalendar, {
      services: this._services,
      year: fixedYear ?? getDefaultEdition(today),
      adminYear: fixedYear ?? getDefaultAdminEdition(today),
      today,
      isDateSimulated: simulatedDate !== undefined,
      themeProfileId: this.properties.themeProfileId && Number.isInteger(forcedProfileId) ? forcedProfileId : undefined,
      // Web parts déjà posés sans la propriété : sapin par défaut.
      layout: this.properties.layout === 'grid' ? 'grid' : 'tree'
    });

    ReactDom.render(element, this.domElement);
  }

  protected onDisplayModeChanged(oldDisplayMode: DisplayMode): void {
    this._updateImmersivePage();
    super.onDisplayModeChanged(oldDisplayMode);
  }

  protected onDispose(): void {
    this._restorePage?.();
    this._restorePage = undefined;
    ReactDom.unmountComponentAtNode(this.domElement);
  }

  protected get dataVersion(): Version {
    return Version.parse('1.0');
  }

  protected onPropertyPaneConfigurationStart(): void {
    if (this._profilesState === 'loading' || this._profilesState === 'loaded') {
      return;
    }
    this._profilesState = 'loading';
    this.context.propertyPane.refresh();
    this._services.settings.getAll()
      .then((profiles) => {
        this._profileOptions = profiles
          .filter((profile) => profile.id !== undefined)
          .map((profile) => ({
            key: String(profile.id),
            text: profile.isActive ? format(strings.ProfileActiveSuffix, profile.title) : profile.title
          }));
        this._profilesState = 'loaded';
      })
      .catch((error: unknown) => {
        this._profilesError = getErrorMessage(error);
        this._profilesState = 'error';
      })
      .finally(() => this.context.propertyPane.refresh());
  }

  protected onPropertyPaneConfigurationComplete(): void {
    // Recharge la liste des profils à la prochaine ouverture (ils ont pu être modifiés dans l'administration).
    if (this._profilesState !== 'loading') {
      this._profilesState = 'idle';
    }
  }

  protected getPropertyPaneConfiguration(): IPropertyPaneConfiguration {
    const profileOptions: IPropertyPaneDropdownOption[] = [
      { key: ACTIVE_PROFILE_KEY, text: strings.PropertyActiveProfileOption },
      ...this._profileOptions
    ];
    const profileFields: IPropertyPaneGroup['groupFields'] = [
      PropertyPaneDropdown('themeProfileId', {
        label: strings.PropertyThemeProfile,
        options: profileOptions,
        selectedKey: this.properties.themeProfileId ?? ACTIVE_PROFILE_KEY,
        disabled: this._profilesState === 'loading'
      })
    ];
    if (this._profilesState === 'loading') {
      profileFields.push(PropertyPaneLabel('profilesLoading', { text: strings.Loading }));
    }
    if (this._profilesState === 'error') {
      profileFields.push(PropertyPaneLabel('profilesError', { text: format(strings.ErrorLoadingProfiles, this._profilesError) }));
    }

    return {
      pages: [
        {
          header: { description: strings.PropertyPaneDescription },
          groups: [
            {
              groupName: strings.PropertyGroupDisplay,
              groupFields: [
                PropertyPaneDropdown('layout', {
                  label: strings.PropertyLayout,
                  options: [
                    { key: 'tree', text: strings.PropertyLayoutTree },
                    { key: 'grid', text: strings.PropertyLayoutGrid }
                  ],
                  selectedKey: this.properties.layout === 'grid' ? 'grid' : 'tree'
                }),
                PropertyPaneTextField('year', {
                  label: strings.PropertyYear,
                  description: strings.PropertyYearDescription,
                  placeholder: String(getDefaultEdition(this._getSimulatedDate() ?? new Date())),
                  onGetErrorMessage: (value: string) => (!value || this._parseYear(value) !== undefined ? '' : strings.ErrorInvalidYear)
                }),
                ...profileFields
              ]
            },
            {
              groupName: strings.PropertyGroupTest,
              groupFields: [
                PropertyPaneToggle('testMode', {
                  label: strings.PropertyTestMode,
                  onText: strings.Yes,
                  offText: strings.No
                }),
                PropertyPaneTextField('simulatedDate', {
                  label: strings.PropertySimulatedDate,
                  description: strings.PropertySimulatedDateDescription,
                  placeholder: strings.PropertySimulatedDatePlaceholder,
                  disabled: !this.properties.testMode,
                  onGetErrorMessage: (value: string) => (!value || parseIsoDay(value) ? '' : strings.ErrorInvalidSimulatedDate)
                })
              ]
            }
          ]
        }
      ]
    };
  }

  /** Plein écran en lecture seulement (en édition on garde le chrome SharePoint), jamais en workbench local. */
  private _updateImmersivePage(): void {
    const wanted = this.displayMode === DisplayMode.Read && !this.context.isServedFromLocalhost;
    if (wanted && !this._restorePage) {
      this._restorePage = applyImmersivePage();
    } else if (!wanted && this._restorePage) {
      this._restorePage();
      this._restorePage = undefined;
    }
  }

  /** La date simulée ne s'applique qu'en mode édition : les lecteurs voient toujours la date réelle. */
  private _getSimulatedDate(): Date | undefined {
    if (this.displayMode !== DisplayMode.Edit || !this.properties.testMode) {
      return undefined;
    }
    return parseIsoDay(this.properties.simulatedDate);
  }

  private _parseYear(value: string | undefined): number | undefined {
    const year = Number(value);
    return value && Number.isInteger(year) && year >= 2000 && year <= 2100 ? year : undefined;
  }
}
