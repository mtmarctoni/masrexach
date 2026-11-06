export type Locale = "es" | "ca" | "en";

/** Plain text with explicit emphasis; never interpreted as HTML. */
type EmphasizedText = Array<string | { em: string }>;

interface ContactFormStrings {
  name: string;
  namePlaceholder: string;
  email: string;
  emailPlaceholder: string;
  message: string;
  messagePlaceholder: string;
  submit: string;
  sending: string;
  success: string;
  error: string;
  invalidEmail: string;
  required: string;
  confirmationSubject: string;
  confirmationHeading: string;
  /** Contains a {name} placeholder. */
  confirmationGreeting: string;
  confirmationBody: string;
  confirmationArtworkLabel: string;
  confirmationMessageLabel: string;
  confirmationSignature: string;
}

interface LegalSection {
  heading: string;
  paragraphs: string[];
}

export interface TranslationContent {
  langName: string;
  nav: {
    catalog: string;
    biography: string;
    exhibitions: string;
    contact: string;
  };
  home: {
    title: string;
    description: string;
    kicker: string;
    headline: EmphasizedText;
    statement: string;
    ctaCatalog: string;
    ctaBio: string;
    legacyKicker: string;
    legacyParagraphs: string[];
    finitaKicker: string;
    finitaQuote: EmphasizedText;
    featuredHeading: string;
    featuredCta: string;
    venuesLabel: string;
    venues: string[];
  };
  biography: {
    title: string;
    description: string;
    heading: string;
    dates: string;
    paragraphs: string[];
    portraitAlt: string;
    portraitCaption: string;
  };
  catalog: {
    title: string;
    description: string;
    heading: string;
    intro: string;
    availableHeading: string;
    soldHeading: string;
    statusAvailable: string;
    statusSold: string;
    statusNfs: string;
    viewWork: string;
  };
  artwork: {
    inquireCta: string;
    statusLabel: string;
    backToCatalog: string;
    previousWork: string;
    nextWork: string;
    workOfInterest: string;
    ogAlt: string;
  };
  exhibitions: {
    title: string;
    description: string;
    heading: string;
    collectiveHeading: string;
    individualHeading: string;
    collective: string[];
    individual: string[];
  };
  contact: {
    title: string;
    description: string;
    heading: string;
    intro: string;
    phoneTitle: string;
    form: ContactFormStrings;
  };
  legal: {
    title: string;
    description: string;
    heading: string;
    sections: LegalSection[];
  };
  constants: {
    copyright: string;
    copyright2: string;
  };
  a11y: {
    skipToContent: string;
    openMenu: string;
    closeMenu: string;
    langSwitcher: string;
    currentLocale: string;
    footerNav: string;
  };
}
