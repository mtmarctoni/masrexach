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
}

interface LegalSection {
  heading: string;
  paragraphs: string[];
}

export interface TranslationContent {
  langName: string;
  nav: {
    painting: string;
    biography: string;
    exhibitions: string;
    contact: string;
  };
  home: {
    title: string;
    description: string;
    heading: string;
  };
  biography: {
    title: string;
    description: string;
    heading: string;
    paragraphs: string[];
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
    studioTitle: string;
    galleryTitle: string;
    nextExhibitionTitle: string;
    form: ContactFormStrings;
  };
  legal: {
    title: string;
    description: string;
    heading: string;
    sections: LegalSection[];
  };
  constants: {
    nextExhibition: string;
    permanent: string;
    studio: string;
    copyright: string;
    copyright2: string;
  };
  gallery: {
    openImage: string;
    close: string;
    previous: string;
    next: string;
    counter: string;
    loading: string;
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
