export type Locale = "es" | "ca" | "en";

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
  confirmationBody: string;
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
    /** Headline with optional <em> markup, rendered via set:html. */
    headline: string;
    statement: string;
    ctaCatalog: string;
    ctaBio: string;
    legacyKicker: string;
    legacyParagraphs: string[];
    finitaKicker: string;
    /** Quote with optional <em> markup, rendered via set:html. */
    finitaQuote: string;
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
